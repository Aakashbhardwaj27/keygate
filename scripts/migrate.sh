#!/bin/bash
set -e

# Run database migrations
# Usage: ./scripts/migrate.sh [upgrade|downgrade|revision] [args]

ACTION=${1:-upgrade}
shift || true

cd "$(dirname "$0")/../backend"

case $ACTION in
  upgrade)
    echo "⬆️  Running migrations..."
    alembic upgrade ${1:-head}
    echo "✅ Migrations complete"
    ;;
  downgrade)
    echo "⬇️  Rolling back..."
    alembic downgrade ${1:--1}
    echo "✅ Rollback complete"
    ;;
  revision)
    echo "📝 Creating new migration..."
    alembic revision --autogenerate -m "${1:-auto migration}"
    echo "✅ Migration file created"
    ;;
  *)
    echo "Usage: $0 [upgrade|downgrade|revision] [args]"
    echo ""
    echo "  upgrade [target]    Apply migrations (default: head)"
    echo "  downgrade [target]  Rollback migrations (default: -1)"
    echo "  revision [message]  Create a new migration"
    exit 1
    ;;
esac
