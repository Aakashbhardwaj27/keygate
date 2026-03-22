# API Reference

Base URL: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs` (Swagger UI) or `http://localhost:8000/redoc` (ReDoc)

## Authentication

All endpoints (except `/health` and `/api/v1/auth/login`) require a JWT bearer token.

```bash
# Get a token
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@keygate.dev", "password": "changeme"}'

# Use the token
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/v1/developers
```

## Endpoints

### POST /api/v1/auth/login

Get a JWT access token.

**Request:**
```json
{ "email": "admin@keygate.dev", "password": "changeme" }
```

**Response:**
```json
{ "access_token": "eyJ...", "token_type": "bearer" }
```

---

### POST /api/v1/vendors/configure

Store or update vendor admin credentials.

**Request:**
```json
{
  "vendor": "openai",
  "admin_api_key": "sk-admin-...",
  "org_id": "org-...",
  "extra_config": {}
}
```

Supported vendors: `openai`, `anthropic`, `azure_openai`, `google_vertex`

---

### GET /api/v1/vendors

List configured vendors. Admin keys are masked.

---

### POST /api/v1/developers

Register a new developer.

**Request:**
```json
{ "name": "Priya Sharma", "email": "priya@company.com", "team": "ml" }
```

---

### GET /api/v1/developers

List developers. Query params: `team`, `active_only` (default: true).

---

### DELETE /api/v1/developers/{id}

Deactivate a developer and revoke all their active keys.

---

### POST /api/v1/keys/provision

Provision a real vendor API key. **This is the core endpoint.**

**Request:**
```json
{
  "developer_id": "dev-abc123",
  "vendor": "openai",
  "budget_limit_usd": 100,
  "rate_limit_rpm": 120,
  "expires_in_days": 90,
  "models_allowed": ["gpt-4", "gpt-4o"],
  "description": "GPT-4 for ML experiments"
}
```

**Response:**
```json
{
  "key_id": "key-xyz789",
  "vendor": "openai",
  "api_key": "sk-proj-...",
  "key_hint": "sk-proj-...7xKm",
  "project_name": "keygate-ml-priya-a3f2c1",
  "budget_limit_usd": 100,
  "expires_at": "2026-06-22T08:00:00+00:00",
  "instructions": {
    "base_url": "https://api.openai.com/v1",
    "auth_header": "Authorization: Bearer <your-key>",
    "usage": "...",
    "sdk_example": "..."
  }
}
```

**Important:** The `api_key` field is returned exactly once. It is never stored by KeyGate.

---

### GET /api/v1/keys

List issued keys (metadata only). Query params: `vendor`, `developer_id`, `status`.

---

### POST /api/v1/keys/{id}/revoke

Revoke a key. Calls the vendor API to delete/disable it, then marks it as revoked locally.

---

### POST /api/v1/keys/{id}/rotate

Rotate a key: revokes the old key and provisions a new one for the same developer and vendor.

**Response:** Same as `/keys/provision` with the new key.

---

### GET /api/v1/audit

Query the audit log. Query params: `limit` (default: 50, max: 500), `action`.

---

### GET /api/v1/dashboard/stats

Summary statistics for the dashboard UI.

---

### GET /health

Health check. No authentication required.

```json
{ "status": "healthy", "service": "keygate", "version": "0.1.0" }
```
