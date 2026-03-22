# Contributing to KeyGate

Thanks for your interest in contributing! Here's how to get started.

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (optional, for full-stack dev)

### Local Development

```bash
# Clone the repo
git clone https://github.com/Aakashbhardwaj27/keygate.git
cd keygate

# ── Backend ──
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000

# ── Frontend (separate terminal) ──
cd frontend
npm install
npm run dev
```

### Running Tests

```bash
cd backend
pytest -v                    # Run all tests
pytest -v --cov=app          # With coverage
pytest tests/test_api.py -k "test_create_developer"  # Run specific test
```

### Linting & Formatting

```bash
# Backend
cd backend
ruff check .                 # Lint
ruff format .                # Format
mypy app/                    # Type check

# Frontend
cd frontend
npm run lint
```

## Project Structure

- `backend/app/api/` — API route handlers
- `backend/app/models/` — SQLAlchemy ORM models
- `backend/app/services/` — Business logic layer
- `backend/app/vendors/` — Vendor-specific provisioners
- `backend/tests/` — Test suite
- `frontend/src/pages/` — Page components
- `frontend/src/components/` — Reusable UI components
- `frontend/src/lib/` — API client, constants, utilities

## How to Contribute

### Bug Reports

Open an issue with:
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Python version, Node version)

### Feature Requests

Open an issue describing:
- The problem you're trying to solve
- Your proposed solution
- Alternatives you've considered

### Pull Requests

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Add/update tests as needed
4. Ensure all tests pass and linting is clean
5. Write a clear PR description

### Adding a New Vendor

To add support for a new LLM vendor:

1. Create `backend/app/vendors/your_vendor.py`
2. Implement the `BaseVendorProvisioner` interface:
   - `provision()` — create a scoped project/key at the vendor
   - `revoke()` — delete a key at the vendor
   - `health_check()` — verify admin credentials
3. Register it in `backend/app/vendors/__init__.py`
4. Add the vendor type to the `VendorType` enum in `backend/app/models/__init__.py`
5. Add vendor config to the frontend `VENDORS` constant
6. Add tests in `backend/tests/`
7. Document the vendor-specific setup in `docs/VENDORS.md`

## Code Style

- **Python**: Follow ruff defaults. Type hints encouraged.
- **JavaScript/React**: Functional components, hooks, no class components.
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

## Code of Conduct

Be kind, be respectful, be constructive. We're all here to build something useful.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
