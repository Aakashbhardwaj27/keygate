<p align="center">
  <img src="docs/logo-light.svg" alt="KeyGate" width="80" />
</p>

<h1 align="center">KeyGate</h1>

<p align="center">
  <strong>Open-source LLM API key management for teams.</strong><br/>
  Provision scoped, trackable, revocable vendor API keys — without a proxy.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#features">Features</a> •
  <a href="docs/API.md">API Docs</a> •
  <a href="#contributing">Contributing</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/python-3.11+-green" alt="Python" />
  <img src="https://img.shields.io/badge/node-18+-green" alt="Node" />
</p>

---

## The Problem

Your org has one OpenAI key shared across 100+ developers. No audit trail, no per-developer budgets, no way to revoke one person without rotating for everyone. One leak = full org exposure.

## The Solution

KeyGate uses vendor Admin APIs to create **scoped projects/workspaces per developer** and issue real API keys within them. Developers talk directly to the vendor — no proxy, no added latency, no SDK changes.

```
Developer ──► KeyGate Admin ──► Vendor Admin API ──► Scoped Key Created
                                                          │
Developer uses key directly ◄─────────────────────────────┘
     │
     ▼
OpenAI / Anthropic / Azure / Google  (direct, no proxy)
```

## Features

- **🔑 Real vendor keys** — Not proxy tokens. Developers use keys directly with vendor SDKs.
- **👥 Per-developer scoping** — Each key lives in its own vendor project/workspace.
- **💰 Budget controls** — Set per-developer spending limits at the vendor level.
- **⏱️ Rate limiting** — Per-key RPM limits enforced by the vendor.
- **🔄 Key rotation** — One-click rotate: revoke old, provision new, same developer.
- **📋 Audit log** — Every provision, revoke, and config change is logged.
- **🏢 Multi-vendor** — OpenAI, Anthropic, Azure OpenAI, Google Vertex AI from one dashboard.
- **👥 Team management** — Organize developers by team, bulk operations.
- **🐳 Docker-ready** — One command to run the full stack.
- **🔒 No proxy** — Zero added latency. KeyGate is only involved at key lifecycle time.

## Supported Vendors

| Vendor | Mechanism | Admin API |
|--------|-----------|-----------|
| **OpenAI** | Creates Project + Service Account per dev | [Organization API](https://platform.openai.com/docs/api-reference/organization) |
| **Anthropic** | Creates Workspace + API Key per dev | [Admin API](https://docs.anthropic.com/en/api/admin-api) |
| **Azure OpenAI** | Creates Cognitive Services resource per dev | [Azure Resource Manager](https://learn.microsoft.com/en-us/rest/api/cognitiveservices/) |
| **Google Vertex AI** | Creates Service Account + IAM binding per dev | [GCP IAM](https://cloud.google.com/iam/docs/reference/rest) |

## Quick Start

### Option 1: Docker (recommended)

```bash
git clone https://github.com/Aakashbhardwaj27/keygate.git
cd keygate
cp .env.example .env        # Edit with your vendor admin keys
docker compose up -d
```

Dashboard at `http://localhost:3000` · API at `http://localhost:8000/docs`

### Option 2: Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### First steps after setup

1. **Log in** to the dashboard at `http://localhost:3000`
2. **Configure a vendor** — enter your org-level admin API key
3. **Add developers** — register team members
4. **Provision keys** — select developer + vendor + budget → get a real vendor key
5. **Share the key** — developer uses it directly with the vendor SDK

## How It Works

### Key Provisioning Flow

```
1. Admin clicks "Provision Key" for developer Priya on OpenAI
                    │
2. KeyGate Backend  │
   ├── Validates developer exists and is active
   ├── Loads OpenAI admin credentials from encrypted store
   ├── POST /v1/organization/projects
   │   └── Creates "keygate-ml-priya-a3f2c1"
   ├── POST /v1/organization/projects/{id}/service_accounts
   │   └── Creates service account + API key
   ├── Stores key metadata (hint, budget, expiry) — NOT the full key
   └── Returns the real key to admin (shown once)
                    │
3. Admin securely shares key with Priya
                    │
4. Priya uses: openai.api_key = "sk-proj-..." (standard SDK, direct to OpenAI)
```

### Key Revocation Flow

```
1. Admin clicks "Revoke" on Priya's key
                    │
2. KeyGate Backend
   ├── DELETE /v1/organization/projects/{proj}/api_keys/{key}
   ├── Marks key as "revoked" in local DB
   └── Logs audit event
                    │
3. Priya's key stops working immediately at the vendor
```

## Project Structure

```
keygate/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, test, build on every PR
│       └── release.yml            # Build + push Docker images on tag
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app entry point
│   │   ├── config.py              # Settings via pydantic-settings
│   │   ├── database.py            # SQLAlchemy async engine + session
│   │   ├── api/
│   │   │   ├── router.py          # API router aggregation
│   │   │   ├── vendors.py         # /api/v1/vendors endpoints
│   │   │   ├── developers.py      # /api/v1/developers endpoints
│   │   │   ├── keys.py            # /api/v1/keys endpoints
│   │   │   └── audit.py           # /api/v1/audit endpoints
│   │   ├── core/
│   │   │   ├── auth.py            # Authentication middleware
│   │   │   └── exceptions.py      # Custom exception handlers
│   │   ├── models/
│   │   │   ├── vendor.py          # VendorConfig ORM model
│   │   │   ├── developer.py       # Developer ORM model
│   │   │   ├── key.py             # IssuedKey ORM model
│   │   │   └── audit.py           # AuditEvent ORM model
│   │   ├── services/
│   │   │   ├── key_service.py     # Key provisioning orchestration
│   │   │   └── audit_service.py   # Audit logging service
│   │   └── vendors/
│   │       ├── base.py            # Abstract vendor provisioner
│   │       ├── openai.py          # OpenAI provisioner
│   │       ├── anthropic.py       # Anthropic provisioner
│   │       ├── azure.py           # Azure OpenAI provisioner
│   │       └── google.py          # Google Vertex AI provisioner
│   ├── tests/
│   │   ├── conftest.py            # Pytest fixtures
│   │   ├── test_api_vendors.py
│   │   ├── test_api_keys.py
│   │   ├── test_api_developers.py
│   │   └── test_vendors_openai.py
│   ├── migrations/                # Alembic migrations
│   │   └── env.py
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── Dockerfile
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Page components
│   │   ├── hooks/                 # Custom React hooks
│   │   └── lib/                   # API client, utils
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── docker/
│   └── nginx.conf                 # Production reverse proxy config
├── docs/
│   ├── API.md                     # Full API reference
│   ├── DEPLOYMENT.md              # Production deployment guide
│   ├── VENDORS.md                 # Vendor-specific setup guides
│   └── logo.svg
├── scripts/
│   ├── seed.py                    # Seed dev data for local testing
│   └── migrate.sh                 # Run database migrations
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
├── .editorconfig
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
├── SECURITY.md
└── README.md
```

## Configuration

All configuration is via environment variables. See [`.env.example`](.env.example) for the full list.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SECRET_KEY` | Yes | JWT signing key (generate with `openssl rand -hex 32`) |
| `ADMIN_EMAIL` | Yes | Initial admin account email |
| `ADMIN_PASSWORD` | Yes | Initial admin account password |
| `OPENAI_ADMIN_KEY` | No | OpenAI org admin API key |
| `ANTHROPIC_ADMIN_KEY` | No | Anthropic org admin API key |
| `AZURE_SUBSCRIPTION_ID` | No | Azure subscription for resource creation |
| `AZURE_RESOURCE_GROUP` | No | Azure resource group |
| `GCP_PROJECT_ID` | No | Google Cloud project ID |
| `GCP_REGION` | No | Google Cloud region (default: us-central1) |

## API Overview

Full reference: [`docs/API.md`](docs/API.md)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/login` | Get JWT access token |
| `POST` | `/api/v1/vendors/configure` | Store vendor admin credentials |
| `GET` | `/api/v1/vendors` | List configured vendors |
| `POST` | `/api/v1/developers` | Register a developer |
| `GET` | `/api/v1/developers` | List developers |
| `DELETE` | `/api/v1/developers/{id}` | Deactivate + revoke all keys |
| `POST` | `/api/v1/keys/provision` | Provision a vendor key |
| `GET` | `/api/v1/keys` | List issued keys (metadata only) |
| `POST` | `/api/v1/keys/{id}/revoke` | Revoke a key at the vendor |
| `POST` | `/api/v1/keys/{id}/rotate` | Rotate (revoke old + provision new) |
| `GET` | `/api/v1/audit` | Query audit log |
| `GET` | `/api/v1/dashboard/stats` | Dashboard summary |

## Contributing

We welcome contributions! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for guidelines.

```bash
# Run the full test suite
cd backend && pytest -v

# Run linting
ruff check .
ruff format --check .

# Run frontend checks
cd frontend && npm run lint && npm run type-check
```

## Security

See [`SECURITY.md`](SECURITY.md) for our security policy and how to report vulnerabilities.

**Key security properties:**
- Vendor admin keys are encrypted at rest in the database
- Provisioned keys are shown exactly once and never stored in full
- All actions are audit-logged with actor, timestamp, and details
- JWT authentication with configurable expiry
- CORS, rate limiting, and input validation on all endpoints

## Roadmap

- [ ] SSO/SAML integration (Okta, Auth0, Google Workspace)
- [ ] Self-service developer portal (devs request keys, admins approve)
- [ ] Spend tracking via vendor usage APIs
- [ ] Slack/Teams notifications on key events
- [ ] Terraform provider for infrastructure-as-code key management
- [ ] CLI tool (`keygate provision --vendor openai --dev priya`)
- [ ] Key groups and policies (e.g., "all ML team members get GPT-4 access")
- [ ] Webhook support for key lifecycle events
- [ ] Multi-org / SaaS mode

## License

[Apache License 2.0](LICENSE) — use it, fork it, ship it, contribute back.

---

<p align="center">
  Built with ❤️ for teams tired of sharing one API key.
</p>
