.PHONY: help dev up down test lint seed migrate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

# ── Docker ────────────────────────────────────────────────────

up: ## Start all services
	docker compose up -d

down: ## Stop all services
	docker compose down

dev: ## Start in development mode with hot reload
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

logs: ## Tail logs
	docker compose logs -f

# ── Backend ───────────────────────────────────────────────────

test: ## Run backend tests
	cd backend && pytest -v --cov=app

lint: ## Run linting on backend
	cd backend && ruff check . && ruff format --check .

format: ## Format backend code
	cd backend && ruff format .

seed: ## Seed development data
	cd backend && python ../scripts/seed.py

migrate: ## Run database migrations
	./scripts/migrate.sh upgrade

migration: ## Create a new migration (usage: make migration MSG="description")
	./scripts/migrate.sh revision "$(MSG)"

# ── Frontend ──────────────────────────────────────────────────

frontend-dev: ## Start frontend dev server
	cd frontend && npm run dev

frontend-build: ## Build frontend for production
	cd frontend && npm run build

frontend-lint: ## Lint frontend
	cd frontend && npm run lint

# ── Full Stack Local ──────────────────────────────────────────

local: ## Run full stack locally (no Docker)
	@echo "Starting backend..."
	cd backend && uvicorn app.main:app --reload --port 8000 &
	@echo "Starting frontend..."
	cd frontend && npm run dev &
	@echo ""
	@echo "Dashboard: http://localhost:3000"
	@echo "API Docs:  http://localhost:8000/docs"
