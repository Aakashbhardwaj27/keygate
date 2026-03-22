"""ORM models for KeyGate."""

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


def gen_id(prefix: str = ""):
    return f"{prefix}{uuid.uuid4().hex[:12]}"


# ─── Enums ────────────────────────────────────────────────────

class VendorType(str, enum.Enum):
    OPENAI        = "openai"
    ANTHROPIC     = "anthropic"
    AZURE_OPENAI  = "azure_openai"
    GOOGLE_VERTEX = "google_vertex"


class KeyStatus(str, enum.Enum):
    ACTIVE  = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"
    ROTATED = "rotated"


class MemberRole(str, enum.Enum):
    OWNER     = "owner"
    ADMIN     = "admin"
    DEVELOPER = "developer"
    VIEWER    = "viewer"


class AuditAction(str, enum.Enum):
    VENDOR_CONFIGURED    = "vendor_configured"
    DEVELOPER_REGISTERED = "developer_registered"
    DEVELOPER_DEACTIVATED= "developer_deactivated"
    KEY_PROVISIONED      = "key_provisioned"
    KEY_REVOKED          = "key_revoked"
    KEY_ROTATED          = "key_rotated"
    ADMIN_LOGIN          = "admin_login"
    WORKSPACE_CREATED    = "workspace_created"
    WORKSPACE_ARCHIVED   = "workspace_archived"
    WORKSPACE_UPDATED    = "workspace_updated"
    MEMBER_INVITED       = "member_invited"
    MEMBER_SUSPENDED     = "member_suspended"
    MEMBER_ROLE_CHANGED  = "member_role_changed"
    WORKSPACE_MEMBER_ADDED   = "workspace_member_added"
    WORKSPACE_MEMBER_REMOVED = "workspace_member_removed"


# ─── Models ───────────────────────────────────────────────────

class VendorConfig(Base):
    __tablename__ = "vendor_configs"

    id:                    Mapped[str]           = mapped_column(String(36),  primary_key=True, default=lambda: gen_id("vc-"))
    vendor:                Mapped[VendorType]    = mapped_column(SAEnum(VendorType), unique=True, nullable=False)
    admin_api_key_encrypted: Mapped[str]         = mapped_column(Text,        nullable=False)
    org_id:                Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extra_config:          Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    created_at:            Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:            Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Workspace(Base):
    __tablename__ = "workspaces"

    id:          Mapped[str]           = mapped_column(String(36),  primary_key=True, default=lambda: gen_id("ws-"))
    name:        Mapped[str]           = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    color:       Mapped[str]           = mapped_column(String(20),  default="#6366f1")
    spend_limit: Mapped[float]         = mapped_column(Float,       default=1000.0)
    rate_limit_rpm: Mapped[int]        = mapped_column(Integer,     default=200)
    is_archived: Mapped[bool]          = mapped_column(Boolean,     default=False)
    created_at:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at:  Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    members: Mapped[list["WorkspaceMember"]] = relationship(back_populates="workspace", lazy="selectin", cascade="all, delete-orphan")
    keys:    Mapped[list["IssuedKey"]]       = relationship(back_populates="workspace", lazy="selectin")


class Developer(Base):
    __tablename__ = "developers"

    id:         Mapped[str]           = mapped_column(String(36),  primary_key=True, default=lambda: gen_id("dev-"))
    name:       Mapped[str]           = mapped_column(String(255), nullable=False)
    email:      Mapped[str]           = mapped_column(String(255), unique=True, nullable=False)
    team:       Mapped[str]           = mapped_column(String(100), default="default")
    role:       Mapped[MemberRole]    = mapped_column(SAEnum(MemberRole), default=MemberRole.DEVELOPER)
    is_active:  Mapped[bool]          = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    keys:              Mapped[list["IssuedKey"]]       = relationship(back_populates="developer", lazy="selectin")
    workspace_members: Mapped[list["WorkspaceMember"]] = relationship(back_populates="developer", lazy="selectin")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id:           Mapped[str]        = mapped_column(String(36), primary_key=True, default=lambda: gen_id("wm-"))
    workspace_id: Mapped[str]        = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    developer_id: Mapped[str]        = mapped_column(String(36), ForeignKey("developers.id"), nullable=False)
    role:         Mapped[MemberRole] = mapped_column(SAEnum(MemberRole), default=MemberRole.DEVELOPER)
    added_at:     Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=utcnow)

    workspace: Mapped["Workspace"] = relationship(back_populates="members", lazy="selectin")
    developer: Mapped["Developer"] = relationship(back_populates="workspace_members", lazy="selectin")


class IssuedKey(Base):
    __tablename__ = "issued_keys"

    id:                    Mapped[str]           = mapped_column(String(36), primary_key=True, default=lambda: gen_id("key-"))
    developer_id:          Mapped[str]           = mapped_column(String(36), ForeignKey("developers.id"), nullable=False)
    workspace_id:          Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=True)
    vendor:                Mapped[VendorType]    = mapped_column(SAEnum(VendorType), nullable=False)
    vendor_project_id:     Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    vendor_key_id:         Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    project_name:          Mapped[str]           = mapped_column(String(255), nullable=False)
    key_hint:              Mapped[str]           = mapped_column(String(50),  nullable=False)
    budget_limit_usd:      Mapped[float]         = mapped_column(Float,   default=50.0)
    rate_limit_rpm:        Mapped[int]           = mapped_column(Integer, default=60)
    models_allowed:        Mapped[Optional[str]] = mapped_column(Text,    nullable=True)
    description:           Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status:                Mapped[KeyStatus]     = mapped_column(SAEnum(KeyStatus), default=KeyStatus.ACTIVE)
    created_at:            Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at:            Mapped[datetime]      = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at:            Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    developer: Mapped["Developer"]        = relationship(back_populates="keys",       lazy="selectin")
    workspace: Mapped[Optional["Workspace"]] = relationship(back_populates="keys",    lazy="selectin")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id:            Mapped[int]           = mapped_column(Integer, primary_key=True, autoincrement=True)
    action:        Mapped[AuditAction]   = mapped_column(SAEnum(AuditAction), nullable=False)
    actor:         Mapped[str]           = mapped_column(String(255), nullable=False)
    resource_type: Mapped[Optional[str]] = mapped_column(String(50),  nullable=True)
    resource_id:   Mapped[Optional[str]] = mapped_column(String(36),  nullable=True)
    details:       Mapped[Optional[str]] = mapped_column(Text,        nullable=True)
    ip_address:    Mapped[Optional[str]] = mapped_column(String(45),  nullable=True)
    created_at:    Mapped[datetime]      = mapped_column(DateTime(timezone=True), default=utcnow)
