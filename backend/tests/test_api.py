"""Tests for core API endpoints."""

import pytest
from httpx import AsyncClient


# ─── Auth ─────────────────────────────────────────────────────


class TestAuth:
    async def test_login_success(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "testpass",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client: AsyncClient):
        resp = await client.post("/api/v1/auth/login", json={
            "email": "admin@test.com",
            "password": "wrong",
        })
        assert resp.status_code == 401

    async def test_protected_route_no_token(self, client: AsyncClient):
        resp = await client.get("/api/v1/vendors")
        assert resp.status_code == 403  # No auth header


# ─── Developers ───────────────────────────────────────────────


class TestDevelopers:
    async def test_create_developer(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post("/api/v1/developers", json={
            "name": "Test Dev",
            "email": "test@company.com",
            "team": "platform",
        }, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Test Dev"
        assert data["email"] == "test@company.com"
        assert data["team"] == "platform"
        assert data["id"].startswith("dev-")

    async def test_create_duplicate_email(self, client: AsyncClient, auth_headers: dict):
        payload = {"name": "Dev 1", "email": "dupe@company.com", "team": "ml"}
        await client.post("/api/v1/developers", json=payload, headers=auth_headers)
        resp = await client.post("/api/v1/developers", json={
            "name": "Dev 2", "email": "dupe@company.com", "team": "ml"
        }, headers=auth_headers)
        assert resp.status_code == 400

    async def test_list_developers(self, client: AsyncClient, auth_headers: dict):
        await client.post("/api/v1/developers", json={
            "name": "A", "email": "a@co.com", "team": "ml"
        }, headers=auth_headers)
        await client.post("/api/v1/developers", json={
            "name": "B", "email": "b@co.com", "team": "platform"
        }, headers=auth_headers)

        resp = await client.get("/api/v1/developers", headers=auth_headers)
        assert resp.status_code == 200
        devs = resp.json()
        assert len(devs) == 2

    async def test_deactivate_developer(self, client: AsyncClient, auth_headers: dict):
        create_resp = await client.post("/api/v1/developers", json={
            "name": "To Deactivate", "email": "deact@co.com", "team": "ml"
        }, headers=auth_headers)
        dev_id = create_resp.json()["id"]

        resp = await client.delete(f"/api/v1/developers/{dev_id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "deactivated"


# ─── Vendors ──────────────────────────────────────────────────


class TestVendors:
    async def test_configure_vendor(self, client: AsyncClient, auth_headers: dict):
        resp = await client.post("/api/v1/vendors/configure", json={
            "vendor": "openai",
            "admin_api_key": "sk-admin-test-key-12345",
            "org_id": "org-test123",
        }, headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["vendor"] == "openai"

    async def test_list_vendors(self, client: AsyncClient, auth_headers: dict):
        await client.post("/api/v1/vendors/configure", json={
            "vendor": "openai",
            "admin_api_key": "sk-admin-test-key-12345",
        }, headers=auth_headers)

        resp = await client.get("/api/v1/vendors", headers=auth_headers)
        assert resp.status_code == 200
        vendors = resp.json()
        assert len(vendors) == 1
        assert vendors[0]["vendor"] == "openai"
        # Key should be masked
        assert "..." in vendors[0]["admin_key_hint"]

    async def test_update_vendor_config(self, client: AsyncClient, auth_headers: dict):
        # Configure once
        await client.post("/api/v1/vendors/configure", json={
            "vendor": "anthropic",
            "admin_api_key": "sk-ant-admin-old",
        }, headers=auth_headers)

        # Update
        resp = await client.post("/api/v1/vendors/configure", json={
            "vendor": "anthropic",
            "admin_api_key": "sk-ant-admin-new",
            "org_id": "org-new",
        }, headers=auth_headers)
        assert resp.status_code == 200

        # Verify updated
        vendors = (await client.get("/api/v1/vendors", headers=auth_headers)).json()
        anthropic = [v for v in vendors if v["vendor"] == "anthropic"][0]
        assert anthropic["org_id"] == "org-new"


# ─── Audit ────────────────────────────────────────────────────


class TestAudit:
    async def test_audit_log_records_actions(self, client: AsyncClient, auth_headers: dict):
        # Perform some actions
        await client.post("/api/v1/developers", json={
            "name": "Audit Test", "email": "audit@co.com", "team": "ml"
        }, headers=auth_headers)

        resp = await client.get("/api/v1/audit", headers=auth_headers)
        assert resp.status_code == 200
        events = resp.json()
        assert len(events) >= 1
        assert any(e["action"] == "developer_registered" for e in events)


# ─── Dashboard ────────────────────────────────────────────────


class TestDashboard:
    async def test_dashboard_stats(self, client: AsyncClient, auth_headers: dict):
        resp = await client.get("/api/v1/dashboard/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_developers" in data
        assert "active_keys" in data
        assert "vendors_configured" in data


# ─── Health ───────────────────────────────────────────────────


class TestHealth:
    async def test_health_check(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"
