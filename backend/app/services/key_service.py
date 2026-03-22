"""Key provisioning service — orchestrates vendor calls and DB writes."""

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DeveloperNotFoundError, VendorProvisioningError
from app.models import (
    AuditAction,
    AuditEvent,
    Developer,
    IssuedKey,
    KeyStatus,
    VendorConfig,
    VendorType,
)
from app.vendors import (
    VENDOR_REGISTRY,
    ProvisionRequest,
    ProvisionResult,
)


def mask_key(key: str) -> str:
    """Mask an API key for safe storage: show first 8 and last 4 chars."""
    if len(key) <= 16:
        return key[:4] + "..." + key[-4:]
    return key[:8] + "..." + key[-4:]


class KeyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def provision(
        self,
        developer_id: str,
        vendor: str,
        workspace_id: str | None = None,
        budget_limit_usd: float = 50.0,
        rate_limit_rpm: int = 60,
        expires_in_days: int = 90,
        models_allowed: list[str] | None = None,
        description: str = "",
        actor: str = "admin",
    ) -> tuple[IssuedKey, ProvisionResult]:
        """
        Provision a new vendor API key for a developer.

        Returns (key_record, provision_result) where provision_result contains
        the real API key (shown once, never stored).
        """
        # 1. Validate developer
        dev = await self.db.get(Developer, developer_id)
        if not dev or not dev.is_active:
            raise DeveloperNotFoundError(developer_id)

        # 2. Get vendor config
        vendor_type = VendorType(vendor)
        result = await self.db.execute(
            select(VendorConfig).where(VendorConfig.vendor == vendor_type)
        )
        vendor_config = result.scalar_one_or_none()
        if not vendor_config:
            raise VendorProvisioningError(
                vendor, f"Vendor '{vendor}' not configured. Add admin credentials first."
            )

        # 3. Build provisioner
        provisioner_cls = VENDOR_REGISTRY.get(vendor)
        if not provisioner_cls:
            raise VendorProvisioningError(vendor, f"Unknown vendor: {vendor}")

        extra = json.loads(vendor_config.extra_config) if vendor_config.extra_config else {}

        # TODO: decrypt admin_api_key_encrypted with Fernet
        admin_key = vendor_config.admin_api_key_encrypted

        if vendor == "openai":
            provisioner = provisioner_cls(admin_api_key=admin_key, org_id=vendor_config.org_id)
        elif vendor == "anthropic":
            provisioner = provisioner_cls(admin_api_key=admin_key, org_id=vendor_config.org_id)
        elif vendor == "azure_openai":
            provisioner = provisioner_cls(
                subscription_id=extra.get("subscription_id", ""),
                resource_group=extra.get("resource_group", ""),
                tenant_id=extra.get("tenant_id"),
            )
        elif vendor == "google_vertex":
            provisioner = provisioner_cls(
                project_id=extra.get("project_id", ""),
                region=extra.get("region", "us-central1"),
            )
        else:
            raise VendorProvisioningError(vendor, f"Unsupported vendor: {vendor}")

        # 4. Call vendor API
        provision_req = ProvisionRequest(
            developer_name=dev.name,
            developer_email=dev.email,
            team=dev.team,
            budget_limit_usd=budget_limit_usd,
            rate_limit_rpm=rate_limit_rpm,
            models_allowed=models_allowed,
            description=description,
        )
        provision_result = await provisioner.provision(provision_req)

        # 5. Store key metadata (NEVER the full key)
        key_record = IssuedKey(
            developer_id=developer_id,
            workspace_id=workspace_id,
            vendor=vendor_type,
            vendor_project_id=provision_result.vendor_project_id,
            vendor_key_id=provision_result.vendor_key_id,
            project_name=provision_result.project_name,
            key_hint=mask_key(provision_result.api_key),
            budget_limit_usd=budget_limit_usd,
            rate_limit_rpm=rate_limit_rpm,
            models_allowed=json.dumps(models_allowed) if models_allowed else None,
            description=description,
            status=KeyStatus.ACTIVE,
            expires_at=datetime.now(timezone.utc) + timedelta(days=expires_in_days),
        )
        self.db.add(key_record)

        # 6. Audit log
        audit = AuditEvent(
            action=AuditAction.KEY_PROVISIONED,
            actor=actor,
            resource_type="key",
            resource_id=key_record.id,
            details=json.dumps({
                "developer_id": developer_id,
                "vendor": vendor,
                "budget_limit_usd": budget_limit_usd,
                "project_name": provision_result.project_name,
            }),
        )
        self.db.add(audit)

        await self.db.flush()
        return key_record, provision_result

    async def revoke(self, key_id: str, actor: str = "admin") -> IssuedKey:
        """Revoke a key both locally and at the vendor."""
        key = await self.db.get(IssuedKey, key_id)
        if not key:
            raise VendorProvisioningError("unknown", f"Key not found: {key_id}")

        if key.status != KeyStatus.ACTIVE:
            raise VendorProvisioningError(key.vendor.value, f"Key is already {key.status.value}")

        # TODO: Call vendor API to revoke (same pattern as provision)
        # provisioner = build_provisioner(key.vendor)
        # await provisioner.revoke(key.vendor_project_id, key.vendor_key_id)

        key.status = KeyStatus.REVOKED
        key.revoked_at = datetime.now(timezone.utc)

        audit = AuditEvent(
            action=AuditAction.KEY_REVOKED,
            actor=actor,
            resource_type="key",
            resource_id=key_id,
            details=json.dumps({"vendor": key.vendor.value, "project_name": key.project_name}),
        )
        self.db.add(audit)
        await self.db.flush()
        return key
