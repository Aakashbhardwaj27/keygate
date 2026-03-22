"""API route handlers — full KeyGate API."""

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import create_access_token, require_admin
from app.config import Settings, get_settings
from app.database import get_db
from app.models import (
    AuditAction,
    AuditEvent,
    Developer,
    IssuedKey,
    KeyStatus,
    MemberRole,
    VendorConfig,
    VendorType,
    Workspace,
    WorkspaceMember,
)
from app.services.key_service import KeyService, mask_key

router = APIRouter(prefix="/api/v1")


# ─── Schemas ──────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class VendorConfigRequest(BaseModel):
    vendor: str
    admin_api_key: str
    org_id: Optional[str] = None
    extra_config: Optional[dict] = None


class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = "#6366f1"
    spend_limit: float = 1000.0
    rate_limit_rpm: int = 200


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    spend_limit: Optional[float] = None
    rate_limit_rpm: Optional[int] = None


class DeveloperCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str
    team: str = "default"
    role: str = "developer"


class DeveloperUpdateRole(BaseModel):
    role: str


class WorkspaceMemberAdd(BaseModel):
    developer_id: str
    role: str = "developer"


class WorkspaceMemberUpdateRole(BaseModel):
    role: str


class KeyProvisionRequest(BaseModel):
    developer_id: str
    vendor: str
    workspace_id: Optional[str] = None
    budget_limit_usd: float = 50.0
    rate_limit_rpm: int = 60
    expires_in_days: int = 90
    models_allowed: Optional[list[str]] = None
    description: str = ""


# ─── Helpers ──────────────────────────────────────────────────


def _audit(action, actor, resource_type=None, resource_id=None, details=None):
    return AuditEvent(
        action=action,
        actor=actor,
        resource_type=resource_type,
        resource_id=resource_id,
        details=json.dumps(details) if details else None,
    )


def _dev_out(
    dev: Developer, active_key_count=0, vendors=None, workspace_ids=None
) -> dict:
    return {
        "id": dev.id,
        "name": dev.name,
        "email": dev.email,
        "team": dev.team,
        "role": dev.role.value if dev.role else "developer",
        "is_active": dev.is_active,
        "active_key_count": active_key_count,
        "vendors": vendors or [],
        "workspace_ids": workspace_ids or [],
        "created_at": dev.created_at.isoformat(),
    }


async def _enrich_devs(db, devs: list) -> list:
    """Fetch key counts + workspace memberships without touching lazy relationships."""
    from sqlalchemy import func as sqlfunc

    if not devs:
        return []
    ids = [d.id for d in devs]
    kq = await db.execute(
        select(IssuedKey.developer_id, IssuedKey.vendor, sqlfunc.count(IssuedKey.id))
        .where(IssuedKey.developer_id.in_(ids), IssuedKey.status == KeyStatus.ACTIVE)
        .group_by(IssuedKey.developer_id, IssuedKey.vendor)
    )
    key_counts: dict = {}
    vendor_map: dict = {}
    for dev_id, vendor, cnt in kq.all():
        key_counts[dev_id] = key_counts.get(dev_id, 0) + cnt
        vendor_map.setdefault(dev_id, set()).add(vendor.value)
    wq = await db.execute(
        select(WorkspaceMember.developer_id, WorkspaceMember.workspace_id).where(
            WorkspaceMember.developer_id.in_(ids)
        )
    )
    ws_map: dict = {}
    for dev_id, ws_id in wq.all():
        ws_map.setdefault(dev_id, []).append(ws_id)
    return [
        _dev_out(
            d,
            active_key_count=key_counts.get(d.id, 0),
            vendors=list(vendor_map.get(d.id, [])),
            workspace_ids=ws_map.get(d.id, []),
        )
        for d in devs
    ]


def _ws_out(ws: Workspace, key_count=0, member_count=0, budget_allocated=0.0) -> dict:
    return {
        "id": ws.id,
        "name": ws.name,
        "description": ws.description or "",
        "color": ws.color,
        "spend_limit": ws.spend_limit,
        "rate_limit_rpm": ws.rate_limit_rpm,
        "is_archived": ws.is_archived,
        "member_count": member_count,
        "key_count": key_count,
        "total_budget_allocated": budget_allocated,
        "created_at": ws.created_at.isoformat(),
        "updated_at": ws.updated_at.isoformat(),
    }


def _key_out(k: IssuedKey) -> dict:
    return {
        "key_id": k.id,
        "developer_id": k.developer_id,
        "developer_name": k.developer.name if k.developer else None,
        "developer_email": k.developer.email if k.developer else None,
        "team": k.developer.team if k.developer else None,
        "workspace_id": k.workspace_id,
        "workspace_name": k.workspace.name if k.workspace else None,
        "vendor": k.vendor.value,
        "project_name": k.project_name,
        "key_hint": k.key_hint,
        "budget_limit_usd": k.budget_limit_usd,
        "rate_limit_rpm": k.rate_limit_rpm,
        "models_allowed": json.loads(k.models_allowed) if k.models_allowed else [],
        "description": k.description or "",
        "status": k.status.value,
        "created_at": k.created_at.isoformat(),
        "expires_at": k.expires_at.isoformat(),
        "revoked_at": k.revoked_at.isoformat() if k.revoked_at else None,
    }


def _key_out_joined(k: IssuedKey, dev: Developer, ws) -> dict:
    return {
        "key_id": k.id,
        "developer_id": k.developer_id,
        "developer_name": dev.name if dev else None,
        "developer_email": dev.email if dev else None,
        "team": dev.team if dev else None,
        "workspace_id": k.workspace_id,
        "workspace_name": ws.name if ws else None,
        "vendor": k.vendor.value,
        "project_name": k.project_name,
        "key_hint": k.key_hint,
        "budget_limit_usd": k.budget_limit_usd,
        "rate_limit_rpm": k.rate_limit_rpm,
        "models_allowed": json.loads(k.models_allowed) if k.models_allowed else [],
        "description": k.description or "",
        "status": k.status.value,
        "created_at": k.created_at.isoformat(),
        "expires_at": k.expires_at.isoformat(),
        "revoked_at": k.revoked_at.isoformat() if k.revoked_at else None,
    }


# ─── Auth ─────────────────────────────────────────────────────


@router.post("/auth/login", response_model=LoginResponse, tags=["Auth"])
async def login(body: LoginRequest, settings: Settings = Depends(get_settings)):
    if body.email != settings.admin_email or body.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": body.email, "role": "admin"}, settings)
    return LoginResponse(access_token=token)


# ─── Vendors ──────────────────────────────────────────────────


@router.post("/vendors/configure", tags=["Vendors"])
async def configure_vendor(
    body: VendorConfigRequest,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    vendor_type = VendorType(body.vendor)
    result = await db.execute(
        select(VendorConfig).where(VendorConfig.vendor == vendor_type)
    )
    existing = result.scalar_one_or_none()
    if existing:
        existing.admin_api_key_encrypted = body.admin_api_key
        existing.org_id = body.org_id
        existing.extra_config = (
            json.dumps(body.extra_config) if body.extra_config else None
        )
        existing.updated_at = datetime.now(timezone.utc)
    else:
        db.add(
            VendorConfig(
                vendor=vendor_type,
                admin_api_key_encrypted=body.admin_api_key,
                org_id=body.org_id,
                extra_config=(
                    json.dumps(body.extra_config) if body.extra_config else None
                ),
            )
        )
    db.add(
        _audit(
            AuditAction.VENDOR_CONFIGURED,
            admin["sub"],
            "vendor",
            None,
            {"vendor": body.vendor},
        )
    )
    return {"status": "ok", "vendor": body.vendor}


@router.get("/vendors", tags=["Vendors"])
async def list_vendors(
    db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)
):
    result = await db.execute(select(VendorConfig))
    return [
        {
            "vendor": c.vendor.value,
            "admin_key_hint": mask_key(c.admin_api_key_encrypted),
            "org_id": c.org_id,
            "configured_at": c.created_at.isoformat(),
        }
        for c in result.scalars().all()
    ]


# ─── Workspaces ───────────────────────────────────────────────


@router.get("/workspaces", tags=["Workspaces"])
async def list_workspaces(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    from sqlalchemy import func as sqlfunc

    q = select(Workspace)
    if not include_archived:
        q = q.where(Workspace.is_archived == False)
    ws_result = await db.execute(q.order_by(Workspace.created_at.desc()))
    workspaces = ws_result.scalars().all()
    if not workspaces:
        return []
    ws_ids = [ws.id for ws in workspaces]
    # key counts
    key_q = await db.execute(
        select(
            IssuedKey.workspace_id,
            sqlfunc.count(IssuedKey.id),
            sqlfunc.sum(IssuedKey.budget_limit_usd),
        )
        .where(IssuedKey.workspace_id.in_(ws_ids), IssuedKey.status == KeyStatus.ACTIVE)
        .group_by(IssuedKey.workspace_id)
    )
    key_data = {row[0]: (row[1], row[2] or 0.0) for row in key_q.all()}
    # member counts
    mem_q = await db.execute(
        select(WorkspaceMember.workspace_id, sqlfunc.count(WorkspaceMember.id))
        .where(WorkspaceMember.workspace_id.in_(ws_ids))
        .group_by(WorkspaceMember.workspace_id)
    )
    mem_data = {row[0]: row[1] for row in mem_q.all()}
    return [
        _ws_out(
            ws,
            key_count=key_data.get(ws.id, (0, 0))[0],
            member_count=mem_data.get(ws.id, 0),
            budget_allocated=key_data.get(ws.id, (0, 0.0))[1],
        )
        for ws in workspaces
    ]


@router.post("/workspaces", tags=["Workspaces"])
async def create_workspace(
    body: WorkspaceCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    existing = await db.execute(select(Workspace).where(Workspace.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Workspace name already exists")
    ws = Workspace(
        name=body.name,
        description=body.description,
        color=body.color,
        spend_limit=body.spend_limit,
        rate_limit_rpm=body.rate_limit_rpm,
    )
    db.add(ws)
    db.add(
        _audit(
            AuditAction.WORKSPACE_CREATED,
            admin["sub"],
            "workspace",
            None,
            {"name": body.name},
        )
    )
    await db.flush()
    return _ws_out(ws, 0, 0, 0.0)


@router.get("/workspaces/{ws_id}", tags=["Workspaces"])
async def get_workspace(
    ws_id: str, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)
):
    from sqlalchemy import func as sqlfunc

    ws = await db.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    kq = await db.execute(
        select(
            sqlfunc.count(IssuedKey.id), sqlfunc.sum(IssuedKey.budget_limit_usd)
        ).where(IssuedKey.workspace_id == ws_id, IssuedKey.status == KeyStatus.ACTIVE)
    )
    kr = kq.one()
    mq = await db.execute(
        select(sqlfunc.count(WorkspaceMember.id)).where(
            WorkspaceMember.workspace_id == ws_id
        )
    )
    mc = mq.scalar() or 0
    return _ws_out(ws, kr[0] or 0, mc, kr[1] or 0.0)


@router.put("/workspaces/{ws_id}", tags=["Workspaces"])
async def update_workspace(
    ws_id: str,
    body: WorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    ws = await db.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    if body.name is not None:
        ws.name = body.name
    if body.description is not None:
        ws.description = body.description
    if body.color is not None:
        ws.color = body.color
    if body.spend_limit is not None:
        ws.spend_limit = body.spend_limit
    if body.rate_limit_rpm is not None:
        ws.rate_limit_rpm = body.rate_limit_rpm
    ws.updated_at = datetime.now(timezone.utc)
    db.add(
        _audit(
            AuditAction.WORKSPACE_UPDATED,
            admin["sub"],
            "workspace",
            ws_id,
            {"name": ws.name},
        )
    )
    from sqlalchemy import func as sqlfunc

    kq = await db.execute(
        select(
            sqlfunc.count(IssuedKey.id), sqlfunc.sum(IssuedKey.budget_limit_usd)
        ).where(IssuedKey.workspace_id == ws_id, IssuedKey.status == KeyStatus.ACTIVE)
    )
    kr = kq.one()
    mq = await db.execute(
        select(sqlfunc.count(WorkspaceMember.id)).where(
            WorkspaceMember.workspace_id == ws_id
        )
    )
    mc = mq.scalar() or 0
    return _ws_out(ws, kr[0] or 0, mc, kr[1] or 0.0)


@router.post("/workspaces/{ws_id}/archive", tags=["Workspaces"])
async def archive_workspace(
    ws_id: str, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)
):
    ws = await db.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    ws.is_archived = True
    ws.updated_at = datetime.now(timezone.utc)
    db.add(
        _audit(
            AuditAction.WORKSPACE_ARCHIVED,
            admin["sub"],
            "workspace",
            ws_id,
            {"name": ws.name},
        )
    )
    return {"status": "archived"}


# ─── Workspace Members ────────────────────────────────────────


@router.get("/workspaces/{ws_id}/members", tags=["Workspaces"])
async def list_workspace_members(
    ws_id: str, db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)
):
    from sqlalchemy import func as sqlfunc
    from sqlalchemy.orm import joinedload

    ws = await db.get(Workspace, ws_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    # Explicit join to avoid lazy load issues
    wm_result = await db.execute(
        select(WorkspaceMember, Developer)
        .join(Developer, WorkspaceMember.developer_id == Developer.id)
        .where(WorkspaceMember.workspace_id == ws_id)
    )
    rows = wm_result.all()
    # Key counts per developer in this workspace
    if rows:
        dev_ids = [dev.id for _, dev in rows]
        kc_result = await db.execute(
            select(IssuedKey.developer_id, sqlfunc.count(IssuedKey.id))
            .where(
                IssuedKey.developer_id.in_(dev_ids),
                IssuedKey.workspace_id == ws_id,
                IssuedKey.status == KeyStatus.ACTIVE,
            )
            .group_by(IssuedKey.developer_id)
        )
        key_counts = {r[0]: r[1] for r in kc_result.all()}
    else:
        key_counts = {}
    return [
        {
            "id": dev.id,
            "name": dev.name,
            "email": dev.email,
            "team": dev.team,
            "org_role": dev.role.value if dev.role else "developer",
            "workspace_role": wm.role.value,
            "is_active": dev.is_active,
            "added_at": wm.added_at.isoformat(),
            "keys_in_workspace": key_counts.get(dev.id, 0),
        }
        for wm, dev in rows
    ]


@router.post("/workspaces/{ws_id}/members", tags=["Workspaces"])
async def add_workspace_member(
    ws_id: str,
    body: WorkspaceMemberAdd,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    ws = await db.get(Workspace, ws_id)
    dev = await db.get(Developer, body.developer_id)
    if not ws:
        raise HTTPException(404, "Workspace not found")
    if not dev:
        raise HTTPException(404, "Developer not found")
    existing = await db.execute(
        select(WorkspaceMember).where(
            and_(
                WorkspaceMember.workspace_id == ws_id,
                WorkspaceMember.developer_id == body.developer_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Developer already a member")
    db.add(
        WorkspaceMember(
            workspace_id=ws_id,
            developer_id=body.developer_id,
            role=MemberRole(body.role),
        )
    )
    db.add(
        _audit(
            AuditAction.WORKSPACE_MEMBER_ADDED,
            admin["sub"],
            "workspace",
            ws_id,
            {"developer": dev.name, "workspace": ws.name},
        )
    )
    return {"status": "added"}


@router.delete("/workspaces/{ws_id}/members/{dev_id}", tags=["Workspaces"])
async def remove_workspace_member(
    ws_id: str,
    dev_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    result = await db.execute(
        select(WorkspaceMember).where(
            and_(
                WorkspaceMember.workspace_id == ws_id,
                WorkspaceMember.developer_id == dev_id,
            )
        )
    )
    wm = result.scalar_one_or_none()
    if not wm:
        raise HTTPException(404, "Member not found in workspace")
    await db.delete(wm)
    db.add(
        _audit(
            AuditAction.WORKSPACE_MEMBER_REMOVED,
            admin["sub"],
            "workspace",
            ws_id,
            {"developer_id": dev_id},
        )
    )
    return {"status": "removed"}


@router.put("/workspaces/{ws_id}/members/{dev_id}/role", tags=["Workspaces"])
async def update_workspace_member_role(
    ws_id: str,
    dev_id: str,
    body: WorkspaceMemberUpdateRole,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    result = await db.execute(
        select(WorkspaceMember).where(
            and_(
                WorkspaceMember.workspace_id == ws_id,
                WorkspaceMember.developer_id == dev_id,
            )
        )
    )
    wm = result.scalar_one_or_none()
    if not wm:
        raise HTTPException(404, "Member not found in workspace")
    wm.role = MemberRole(body.role)
    return {"status": "updated", "role": body.role}


# ─── Developers ───────────────────────────────────────────────


@router.get("/developers", tags=["Developers"])
async def list_developers(
    team: Optional[str] = None,
    active_only: bool = True,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    q = select(Developer)
    if team:
        q = q.where(Developer.team == team)
    if active_only:
        q = q.where(Developer.is_active == True)
    result = await db.execute(q.order_by(Developer.created_at.desc()))
    devs = result.scalars().all()
    return await _enrich_devs(db, devs)


@router.post("/developers", tags=["Developers"])
async def create_developer(
    body: DeveloperCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    result = await db.execute(select(Developer).where(Developer.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Developer with this email already exists")
    dev = Developer(
        name=body.name,
        email=body.email,
        team=body.team,
        role=(
            MemberRole(body.role)
            if body.role in [r.value for r in MemberRole]
            else MemberRole.DEVELOPER
        ),
    )
    db.add(dev)
    db.add(
        _audit(
            AuditAction.DEVELOPER_REGISTERED,
            admin["sub"],
            "developer",
            None,
            {"name": body.name, "email": body.email},
        )
    )
    await db.flush()
    _enriched = await _enrich_devs(db, [dev])
    return _enriched[0]


@router.put("/developers/{dev_id}/role", tags=["Developers"])
async def update_developer_role(
    dev_id: str,
    body: DeveloperUpdateRole,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    dev = await db.get(Developer, dev_id)
    if not dev:
        raise HTTPException(404, "Developer not found")
    dev.role = MemberRole(body.role)
    db.add(
        _audit(
            AuditAction.MEMBER_ROLE_CHANGED,
            admin["sub"],
            "developer",
            dev_id,
            {"name": dev.name, "new_role": body.role},
        )
    )
    _enriched = await _enrich_devs(db, [dev])
    return _enriched[0]


@router.delete("/developers/{dev_id}", tags=["Developers"])
async def deactivate_developer(
    dev_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    dev = await db.get(Developer, dev_id)
    if not dev:
        raise HTTPException(404, "Developer not found")
    dev.is_active = False
    revoked = 0
    for key in dev.keys:
        if key.status == KeyStatus.ACTIVE:
            key.status = KeyStatus.REVOKED
            key.revoked_at = datetime.now(timezone.utc)
            revoked += 1
    db.add(
        _audit(
            AuditAction.DEVELOPER_DEACTIVATED,
            admin["sub"],
            "developer",
            dev_id,
            {"keys_revoked": revoked},
        )
    )
    return {"status": "deactivated", "keys_revoked": revoked}


# ─── Members (org-level alias) ────────────────────────────────


@router.get("/members", tags=["Members"])
async def list_members(
    db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)
):
    result = await db.execute(select(Developer).order_by(Developer.created_at.desc()))
    devs = result.scalars().all()
    return await _enrich_devs(db, devs)


@router.post("/members/invite", tags=["Members"])
async def invite_member(
    body: DeveloperCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    result = await db.execute(select(Developer).where(Developer.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Member with this email already exists")
    dev = Developer(
        name=body.name,
        email=body.email,
        team=body.team,
        role=(
            MemberRole(body.role)
            if body.role in [r.value for r in MemberRole]
            else MemberRole.DEVELOPER
        ),
    )
    db.add(dev)
    db.add(
        _audit(
            AuditAction.MEMBER_INVITED,
            admin["sub"],
            "developer",
            None,
            {"name": body.name, "email": body.email},
        )
    )
    await db.flush()
    _enriched = await _enrich_devs(db, [dev])
    return _enriched[0]


@router.put("/members/{dev_id}/role", tags=["Members"])
async def update_member_role(
    dev_id: str,
    body: DeveloperUpdateRole,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    dev = await db.get(Developer, dev_id)
    if not dev:
        raise HTTPException(404, "Member not found")
    dev.role = MemberRole(body.role)
    db.add(
        _audit(
            AuditAction.MEMBER_ROLE_CHANGED,
            admin["sub"],
            "developer",
            dev_id,
            {"name": dev.name, "new_role": body.role},
        )
    )
    _enriched = await _enrich_devs(db, [dev])
    return _enriched[0]


@router.post("/members/{dev_id}/suspend", tags=["Members"])
async def suspend_member(
    dev_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    dev = await db.get(Developer, dev_id)
    if not dev:
        raise HTTPException(404, "Member not found")
    dev.is_active = False
    revoked = 0
    for key in dev.keys:
        if key.status == KeyStatus.ACTIVE:
            key.status = KeyStatus.REVOKED
            key.revoked_at = datetime.now(timezone.utc)
            revoked += 1
    db.add(
        _audit(
            AuditAction.MEMBER_SUSPENDED,
            admin["sub"],
            "developer",
            dev_id,
            {"name": dev.name, "keys_revoked": revoked},
        )
    )
    return {"status": "suspended", "keys_revoked": revoked}


# ─── Keys ─────────────────────────────────────────────────────


@router.get("/keys", tags=["Keys"])
async def list_keys(
    vendor: Optional[str] = None,
    developer_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    status: Optional[str] = "active",
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    from sqlalchemy.orm import outerjoin

    q = (
        select(IssuedKey, Developer, Workspace)
        .join(Developer, IssuedKey.developer_id == Developer.id)
        .outerjoin(Workspace, IssuedKey.workspace_id == Workspace.id)
    )
    if vendor:
        q = q.where(IssuedKey.vendor == VendorType(vendor))
    if developer_id:
        q = q.where(IssuedKey.developer_id == developer_id)
    if workspace_id:
        q = q.where(IssuedKey.workspace_id == workspace_id)
    if status:
        q = q.where(IssuedKey.status == KeyStatus(status))
    result = await db.execute(q.order_by(IssuedKey.created_at.desc()))
    return [_key_out_joined(k, dev, ws) for k, dev, ws in result.all()]


@router.post("/keys/provision", tags=["Keys"])
async def provision_key(
    body: KeyProvisionRequest,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    if body.workspace_id:
        ws = await db.get(Workspace, body.workspace_id)
        if not ws:
            raise HTTPException(404, "Workspace not found")
    service = KeyService(db)
    key_record, result = await service.provision(
        developer_id=body.developer_id,
        vendor=body.vendor,
        workspace_id=body.workspace_id,
        budget_limit_usd=body.budget_limit_usd,
        rate_limit_rpm=body.rate_limit_rpm,
        expires_in_days=body.expires_in_days,
        models_allowed=body.models_allowed,
        description=body.description,
        actor=admin["sub"],
    )
    return {
        "key_id": key_record.id,
        "vendor": body.vendor,
        "api_key": result.api_key,
        "key_hint": key_record.key_hint,
        "project_name": result.project_name,
        "budget_limit_usd": body.budget_limit_usd,
        "expires_at": key_record.expires_at.isoformat(),
        "instructions": result.instructions,
    }


@router.post("/keys/{key_id}/revoke", tags=["Keys"])
async def revoke_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    service = KeyService(db)
    key = await service.revoke(key_id, actor=admin["sub"])
    return {"status": "revoked", "key_id": key.id}


@router.post("/keys/{key_id}/rotate", tags=["Keys"])
async def rotate_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    old_key = await db.get(IssuedKey, key_id)
    if not old_key:
        raise HTTPException(404, "Key not found")
    service = KeyService(db)
    await service.revoke(key_id, actor=admin["sub"])
    old_key.status = KeyStatus.ROTATED
    new_key, result = await service.provision(
        developer_id=old_key.developer_id,
        vendor=old_key.vendor.value,
        workspace_id=old_key.workspace_id,
        budget_limit_usd=old_key.budget_limit_usd,
        rate_limit_rpm=old_key.rate_limit_rpm,
        description=f"Rotated from {key_id}",
        actor=admin["sub"],
    )
    return {
        "old_key_id": key_id,
        "new_key_id": new_key.id,
        "api_key": result.api_key,
        "key_hint": new_key.key_hint,
        "project_name": result.project_name,
        "instructions": result.instructions,
    }


# ─── Audit ────────────────────────────────────────────────────


@router.get("/audit", tags=["Audit"])
async def get_audit_log(
    limit: int = Query(50, le=500),
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    q = select(AuditEvent)
    if action:
        q = q.where(AuditEvent.action == AuditAction(action))
    result = await db.execute(q.order_by(AuditEvent.created_at.desc()).limit(limit))
    return [
        {
            "id": e.id,
            "action": e.action.value,
            "actor": e.actor,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "details": json.loads(e.details) if e.details else {},
            "created_at": e.created_at.isoformat(),
        }
        for e in result.scalars().all()
    ]


# ─── Dashboard ────────────────────────────────────────────────


@router.get("/dashboard/stats", tags=["Dashboard"])
async def dashboard_stats(
    db: AsyncSession = Depends(get_db), admin: dict = Depends(require_admin)
):
    from sqlalchemy import func as sqlfunc

    devs = (await db.execute(select(Developer))).scalars().all()
    # Explicitly join Developer to avoid lazy-load
    keys_rows = (
        await db.execute(
            select(IssuedKey, Developer).join(
                Developer, IssuedKey.developer_id == Developer.id
            )
        )
    ).all()
    vendors = (await db.execute(select(VendorConfig))).scalars().all()
    ws_list = (
        (await db.execute(select(Workspace).where(Workspace.is_archived == False)))
        .scalars()
        .all()
    )
    recent = (
        (
            await db.execute(
                select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(10)
            )
        )
        .scalars()
        .all()
    )

    keys = [k for k, _ in keys_rows]
    active_pairs = [(k, dev) for k, dev in keys_rows if k.status == KeyStatus.ACTIVE]
    keys_by_vendor, keys_by_team = {}, {}
    for k, dev in active_pairs:
        v = k.vendor.value
        team = dev.team if dev else "unknown"
        keys_by_vendor[v] = keys_by_vendor.get(v, 0) + 1
        keys_by_team[team] = keys_by_team.get(team, 0) + 1

    return {
        "total_developers": len(devs),
        "active_developers": len([d for d in devs if d.is_active]),
        "total_workspaces": len(ws_list),
        "total_keys_issued": len(keys),
        "active_keys": len(active_pairs),
        "revoked_keys": len([k for k in keys if k.status == KeyStatus.REVOKED]),
        "vendors_configured": [v.vendor.value for v in vendors],
        "keys_by_vendor": keys_by_vendor,
        "keys_by_team": keys_by_team,
        "total_budget_allocated": sum(k.budget_limit_usd for k, _ in active_pairs),
        "recent_activity": [
            {
                "action": e.action.value,
                "actor": e.actor,
                "details": json.loads(e.details) if e.details else {},
                "created_at": e.created_at.isoformat(),
            }
            for e in recent
        ],
    }
