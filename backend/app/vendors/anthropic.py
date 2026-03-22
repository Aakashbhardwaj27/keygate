"""Anthropic vendor provisioner.

Uses the Anthropic Admin API to:
1. Create a Workspace per developer (fully automated)
2. Guide the admin to create an API key in the Console for that workspace
   (Anthropic does NOT support programmatic key creation as of March 2026)
3. Revoke keys programmatically by setting status to "inactive"

Anthropic Admin API supports:
  - Workspaces: create, list, update, archive
  - API Keys: list, get, update (disable/rename) — but NOT create
  - Members: list, update role, remove
  - Invites: create, list, delete

Docs: https://docs.anthropic.com/en/api/admin-api

IMPORTANT: Unlike OpenAI, Anthropic cannot create API keys via API.
The provisioning flow is semi-automated:
  Step 1 (automated): KeyGate creates a workspace
  Step 2 (manual):    Admin creates a key in that workspace via Console
  Step 3 (automated): Admin registers the key hint in KeyGate for tracking
"""

import secrets
import httpx

from app.core.exceptions import VendorProvisioningError
from app.vendors.base import BaseVendorProvisioner, ProvisionRequest, ProvisionResult


class AnthropicProvisioner(BaseVendorProvisioner):
    vendor_name = "anthropic"

    # Flag indicating this vendor requires a manual step for key creation
    requires_manual_key_creation = True

    def __init__(self, admin_api_key: str, org_id: str | None = None):
        self.admin_api_key = admin_api_key
        self.org_id = org_id
        self.base_url = "https://api.anthropic.com/v1"

    def _headers(self) -> dict:
        return {
            "x-api-key": self.admin_api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

    async def provision(self, request: ProvisionRequest) -> ProvisionResult:
        """
        Semi-automated provisioning for Anthropic:

        1. Creates a dedicated Workspace for the developer (automated)
        2. Returns instructions for the admin to create a key in the Console
           targeting that workspace, then register it back in KeyGate

        Anthropic's Admin API does NOT support creating API keys.
        Keys can only be created in the Console UI at:
        https://console.anthropic.com → Settings → API Keys
        """
        workspace_name = (
            f"keygate-{request.team}-{request.developer_name.lower().replace(' ', '-')}"
            f"-{secrets.token_hex(3)}"
        )

        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            # Step 1: Create a dedicated Workspace
            ws_resp = await client.post(
                "/organizations/workspaces",
                headers=self._headers(),
                json={"name": workspace_name},
            )
            if ws_resp.status_code not in (200, 201):
                raise VendorProvisioningError(
                    "anthropic",
                    f"Failed to create workspace: {ws_resp.status_code} {ws_resp.text}",
                )
            workspace = ws_resp.json()
            workspace_id = workspace.get("id", "unknown")

            dev_slug = request.developer_name.lower().replace(" ", "-")

            return ProvisionResult(
                api_key="PENDING_MANUAL_CREATION",
                vendor_key_id="pending",
                vendor_project_id=workspace_id,
                project_name=workspace_name,
                instructions={
                    "base_url": "https://api.anthropic.com/v1",
                    "auth_header": "x-api-key: <your-key>",
                    "status": "workspace_created",
                    "workspace_id": workspace_id,
                    "workspace_name": workspace_name,
                    "manual_step_required": True,
                    "manual_steps": [
                        "Anthropic does not support creating API keys via API.",
                        "Complete these steps to finish provisioning:",
                        "1. Go to https://console.anthropic.com",
                        "2. Navigate to Settings → API Keys",
                        "3. Click 'Create Key'",
                        f"4. Select workspace: '{workspace_name}'",
                        f"5. Name it: 'keygate-{dev_slug}'",
                        "6. Copy the key and give it to the developer",
                        "7. (Optional) Register the key ID in KeyGate for revocation tracking",
                    ],
                    "sdk_example": (
                        'import anthropic\n'
                        'client = anthropic.Anthropic(api_key="<your-key>")\n'
                        'message = client.messages.create(\n'
                        '    model="claude-sonnet-4-20250514",\n'
                        '    max_tokens=1024,\n'
                        '    messages=[{"role": "user", "content": "Hello"}]\n'
                        ')'
                    ),
                },
            )

    async def revoke(self, vendor_project_id: str, vendor_key_id: str) -> bool:
        """
        Revoke by setting the key status to 'inactive' via Admin API.
        This IS supported by Anthropic's Admin API.
        """
        if vendor_key_id == "pending":
            # Key was never created at the vendor — just archive the workspace
            return await self._archive_workspace(vendor_project_id)

        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.post(
                f"/organizations/api_keys/{vendor_key_id}",
                headers=self._headers(),
                json={"status": "inactive"},
            )
            if resp.status_code == 200:
                return True
            elif resp.status_code == 404:
                return False
            else:
                raise VendorProvisioningError(
                    "anthropic",
                    f"Failed to revoke key: {resp.status_code} {resp.text}",
                )

    async def _archive_workspace(self, workspace_id: str) -> bool:
        """Archive a workspace (soft-delete)."""
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.post(
                f"/organizations/workspaces/{workspace_id}",
                headers=self._headers(),
                json={"is_archived": True},
            )
            return resp.status_code == 200

    async def list_workspace_keys(self, workspace_id: str) -> list[dict]:
        """
        List all API keys in a workspace.
        Useful for the admin to find which key ID to register
        after manual creation in the Console.
        """
        async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
            resp = await client.get(
                f"/organizations/api_keys?workspace_id={workspace_id}&status=active&limit=20",
                headers=self._headers(),
            )
            if resp.status_code == 200:
                return resp.json().get("data", [])
            return []

    async def health_check(self) -> bool:
        async with httpx.AsyncClient(base_url=self.base_url, timeout=10) as client:
            resp = await client.get(
                "/organizations/me",
                headers=self._headers(),
            )
            return resp.status_code == 200
