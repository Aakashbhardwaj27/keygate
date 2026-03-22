#!/usr/bin/env python3
"""
Seed the database with sample data for local development.

Usage:
    python scripts/seed.py
    # or
    docker compose exec backend python scripts/seed.py
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import async_session, init_db
from app.models import (
    AuditAction,
    AuditEvent,
    Developer,
    IssuedKey,
    KeyStatus,
    VendorConfig,
    VendorType,
)
from datetime import datetime, timedelta, timezone


SAMPLE_DEVELOPERS = [
    {"name": "Priya Sharma", "email": "priya@company.com", "team": "ml"},
    {"name": "Alex Chen", "email": "alex@company.com", "team": "platform"},
    {"name": "Sam Wilson", "email": "sam@company.com", "team": "backend"},
    {"name": "Maria Garcia", "email": "maria@company.com", "team": "frontend"},
    {"name": "James Liu", "email": "james@company.com", "team": "ml"},
    {"name": "Aisha Patel", "email": "aisha@company.com", "team": "data"},
    {"name": "Tom Mueller", "email": "tom@company.com", "team": "platform"},
    {"name": "Elena Volkov", "email": "elena@company.com", "team": "backend"},
]


async def seed():
    print("🌱 Initializing database...")
    await init_db()

    async with async_session() as db:
        # Check if already seeded
        from sqlalchemy import select, func

        count = await db.scalar(select(func.count()).select_from(Developer))
        if count and count > 0:
            print("⚠️  Database already has data. Skipping seed.")
            return

        print("👥 Creating developers...")
        devs = []
        for d in SAMPLE_DEVELOPERS:
            dev = Developer(**d)
            db.add(dev)
            devs.append(dev)

        await db.flush()

        print("🔑 Creating sample keys...")
        now = datetime.now(timezone.utc)
        sample_keys = [
            {
                "developer": devs[0],
                "vendor": VendorType.OPENAI,
                "project_name": "keygate-ml-priya-a3f2c1",
                "key_hint": "sk-proj-...7xKm",
                "budget_limit_usd": 100.0,
                "status": KeyStatus.ACTIVE,
            },
            {
                "developer": devs[1],
                "vendor": VendorType.ANTHROPIC,
                "project_name": "keygate-platform-alex-b4d1e2",
                "key_hint": "sk-ant-...9pQr",
                "budget_limit_usd": 75.0,
                "status": KeyStatus.ACTIVE,
            },
            {
                "developer": devs[2],
                "vendor": VendorType.AZURE_OPENAI,
                "project_name": "keygate-backend-sam-c5e2f3",
                "key_hint": "azure-...4tUv",
                "budget_limit_usd": 50.0,
                "status": KeyStatus.ACTIVE,
            },
            {
                "developer": devs[0],
                "vendor": VendorType.ANTHROPIC,
                "project_name": "keygate-ml-priya-d6f3g4",
                "key_hint": "sk-ant-...2wXy",
                "budget_limit_usd": 50.0,
                "status": KeyStatus.REVOKED,
            },
            {
                "developer": devs[3],
                "vendor": VendorType.OPENAI,
                "project_name": "keygate-frontend-maria-e7g4h5",
                "key_hint": "sk-proj-...5zAb",
                "budget_limit_usd": 25.0,
                "status": KeyStatus.ACTIVE,
            },
            {
                "developer": devs[5],
                "vendor": VendorType.GOOGLE_VERTEX,
                "project_name": "keygate-data-aisha-f8h5i6",
                "key_hint": '{"type":"..."}',
                "budget_limit_usd": 60.0,
                "status": KeyStatus.ACTIVE,
            },
        ]

        for sk in sample_keys:
            key = IssuedKey(
                developer_id=sk["developer"].id,
                vendor=sk["vendor"],
                project_name=sk["project_name"],
                key_hint=sk["key_hint"],
                budget_limit_usd=sk["budget_limit_usd"],
                rate_limit_rpm=60,
                status=sk["status"],
                expires_at=now + timedelta(days=90),
                revoked_at=now if sk["status"] == KeyStatus.REVOKED else None,
            )
            db.add(key)

        print("📋 Creating audit events...")
        events = [
            AuditEvent(action=AuditAction.VENDOR_CONFIGURED, actor="admin@keygate.dev", resource_type="vendor", details='{"vendor": "openai"}'),
            AuditEvent(action=AuditAction.VENDOR_CONFIGURED, actor="admin@keygate.dev", resource_type="vendor", details='{"vendor": "anthropic"}'),
            AuditEvent(action=AuditAction.VENDOR_CONFIGURED, actor="admin@keygate.dev", resource_type="vendor", details='{"vendor": "azure_openai"}'),
            AuditEvent(action=AuditAction.DEVELOPER_REGISTERED, actor="admin@keygate.dev", resource_type="developer", details='{"name": "Priya Sharma", "email": "priya@company.com"}'),
            AuditEvent(action=AuditAction.KEY_PROVISIONED, actor="admin@keygate.dev", resource_type="key", details='{"vendor": "openai", "developer_id": "dev-001"}'),
            AuditEvent(action=AuditAction.KEY_REVOKED, actor="admin@keygate.dev", resource_type="key", details='{"vendor": "anthropic", "key_id": "key-004"}'),
        ]
        for e in events:
            db.add(e)

        await db.commit()
        print(f"✅ Seeded: {len(devs)} developers, {len(sample_keys)} keys, {len(events)} audit events")


if __name__ == "__main__":
    asyncio.run(seed())
