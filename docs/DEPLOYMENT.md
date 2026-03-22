# Deployment Guide

## Quick Deploy with Docker Compose

The fastest way to get KeyGate running in production.

### 1. Prepare the server

Any Linux server with Docker and Docker Compose installed will work. Minimum specs: 1 vCPU, 1GB RAM.

```bash
# Clone
git clone https://github.com/your-org/keygate.git
cd keygate

# Configure
cp .env.example .env
```

### 2. Edit `.env`

At minimum, set these values:

```bash
# REQUIRED: Generate a secure key
SECRET_KEY=$(openssl rand -hex 32)

# REQUIRED: Set a strong admin password
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=<strong-password>

# REQUIRED: Database password
DB_PASSWORD=<strong-password>

# Add vendor keys as needed
OPENAI_ADMIN_KEY=sk-admin-...
```

### 3. Start the stack

```bash
docker compose up -d
```

KeyGate is now running:
- Dashboard: `http://your-server:3000`
- API: `http://your-server:8000/docs`

### 4. Set up HTTPS (recommended)

Use a reverse proxy like Caddy, Traefik, or nginx with Let's Encrypt:

```bash
# Example with Caddy (add to Caddyfile)
keygate.yourcompany.com {
    reverse_proxy localhost:3000
}

api.keygate.yourcompany.com {
    reverse_proxy localhost:8000
}
```

## Cloud-Specific Guides

### AWS (ECS + RDS)

1. Create an RDS PostgreSQL instance (db.t3.micro is fine to start)
2. Create an ECS cluster with two services:
   - `keygate-backend`: Use the backend Docker image, set `DATABASE_URL` to your RDS endpoint
   - `keygate-frontend`: Use the frontend Docker image
3. Put an ALB in front with HTTPS
4. Store secrets in AWS Secrets Manager, reference from ECS task definition

### GCP (Cloud Run + Cloud SQL)

1. Create a Cloud SQL PostgreSQL instance
2. Deploy backend to Cloud Run:
   ```bash
   gcloud run deploy keygate-backend \
     --image ghcr.io/your-org/keygate/backend:latest \
     --set-env-vars DATABASE_URL=... \
     --add-cloudsql-instances your-instance
   ```
3. Deploy frontend to Cloud Run similarly
4. Use Cloud Load Balancing for HTTPS

### Azure (Container Apps + Azure Database)

1. Create an Azure Database for PostgreSQL
2. Deploy to Azure Container Apps:
   ```bash
   az containerapp create \
     --name keygate-backend \
     --image ghcr.io/your-org/keygate/backend:latest \
     --env-vars DATABASE_URL=...
   ```

### Kubernetes (Helm)

A Helm chart is on the roadmap. For now, create deployments manually:

```yaml
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: keygate-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: keygate-backend
  template:
    metadata:
      labels:
        app: keygate-backend
    spec:
      containers:
        - name: backend
          image: ghcr.io/your-org/keygate/backend:latest
          ports:
            - containerPort: 8000
          envFrom:
            - secretRef:
                name: keygate-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 10
            periodSeconds: 30
```

## Database Migrations

KeyGate uses Alembic for database migrations.

```bash
# Generate a new migration after model changes
cd backend
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

In Docker, run migrations before starting:

```bash
docker compose exec backend alembic upgrade head
```

## Monitoring

### Health Check

```bash
curl http://localhost:8000/health
# {"status": "healthy", "service": "keygate", "version": "0.1.0"}
```

### Prometheus Metrics (roadmap)

A `/metrics` endpoint is planned for v0.2.0.

### Logs

Backend logs are written to stdout. In Docker:

```bash
docker compose logs -f backend
```

## Backup & Recovery

### Database Backup

```bash
# Dump
docker compose exec db pg_dump -U keygate keygate > backup.sql

# Restore
docker compose exec -T db psql -U keygate keygate < backup.sql
```

### Automated Backups

Set up a cron job:

```bash
0 2 * * * cd /opt/keygate && docker compose exec -T db pg_dump -U keygate keygate | gzip > /backups/keygate-$(date +\%Y\%m\%d).sql.gz
```

## Upgrading

```bash
cd keygate
git pull
docker compose build
docker compose exec backend alembic upgrade head
docker compose up -d
```
