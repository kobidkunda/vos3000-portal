# Installation Guide — VOS3000 Admin + Client Portal

This document covers every supported installation method: **local development**, **Docker Compose (dev/prod)**, and **production server** deployment.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Repository Structure](#repository-structure)
3. [Quick Start — Local Development](#quick-start--local-development)
4. [Docker Compose — Development](#docker-compose--development)
5. [Docker Compose — Production](#docker-compose--production)
6. [Manual / Bare-Metal Production](#manual--bare-metal-production)
7. [VOS3000 Server Integration](#vos3000-server-integration)
8. [Environment Variables Reference](#environment-variables-reference)
9. [Database Setup & Migrations](#database-setup--migrations)
10. [Running Tests](#running-tests)
11. [Validating the Installation](#validating-the-installation)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **Node.js** | ≥ 22.0.0 | [nodejs.org](https://nodejs.org) — LTS recommended |
| **npm** | ≥ 10.9.2 | Bundled with Node 22 |
| **Docker** | ≥ 27.0 | [docker.com](https://docs.docker.com/get-docker/) |
| **Docker Compose** | ≥ 2.28 | Included with Docker Desktop |
| **Python 3** | ≥ 3.9 | For validation scripts only |
| **Git** | ≥ 2.40 | — |

> **VOS3000 Integration only**: A live VOS3000 server reachable on its JSP API port (`7391`). See [VOS3000 Server Integration](#vos3000-server-integration).

---

## Repository Structure

```
vos3000-portal/
├── apps/
│   ├── api/           # NestJS + Fastify backend API
│   ├── web/           # Next.js 16 frontend (Admin & Client portal)
│   └── worker/        # Background job worker (CDR, reports, webhooks)
├── packages/
│   ├── shared/        # @vos/shared — shared TypeScript utilities & types
│   └── vos-adapter/   # @vos/adapter — VOS3000 JSP API transport layer
├── config/
│   └── vos-capabilities.json    # Feature gates for VOS write operations
├── docs/              # Production checklist, VOS setup, OpenAPI spec
├── infra/             # Infrastructure config (nginx, ClickHouse init)
├── scripts/           # Migration runner, validation, seed scripts
├── docker-compose.yml             # Development topology
├── docker-compose.production.yml  # Production reference topology
├── .env.example                   # Development environment template
└── .env.production.example        # Production environment template
```

---

## Quick Start — Local Development

> **Fastest path**: ~3 minutes. Uses in-memory mock data — no external services needed.

### 1. Clone the repository

```bash
git clone https://github.com/kobidkunda/vos3000-portal.git
cd vos3000-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` use `AUTH_MODE=demo` and `DATA_MODE=demo`, so no database or VOS server is required for the first run.

### 4. Start the development server

```bash
./dev.sh
```

Or equivalently:

```bash
npm run dev
```

The dev runner automatically:
- Cleans up any previously running dev processes on the target ports
- Builds shared workspace packages (`@vos/shared`, `@vos/adapter`)
- Runs the test suite and validation scripts
- Starts the API (port 4000) and Web frontend (port 3001) concurrently with color-coded logs
- Performs health checks and prints access URLs

### 5. Access the portal

| Service | URL |
|---------|-----|
| Web (Admin/Client) | http://localhost:5027 |
| API | http://localhost:5026 |
| API Swagger Docs | http://localhost:5026/docs |
| API Health Check | http://localhost:5026/api/v1/health |

### Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `Admin123!` |
| Client | `client@example.com` | `Client123!` |

### Dev runner flags

```bash
./dev.sh                  # Full start with cleanup, tests, and live logs
./dev.sh --skip-tests     # Fast start — skips test suite
./dev.sh --test-only      # Run tests and validator only, then exit
./dev.sh --stop           # Stop all running dev processes
./dev.sh --with-worker    # Also launch the background CDR/report worker
./dev.sh --clean          # Clean all build caches and logs
```

---

## Docker Compose — Development

Runs all services (PostgreSQL, ClickHouse, Redis, Redpanda, API, worker, web, nginx gateway) in containers.

### 1. Clone and configure

```bash
git clone https://github.com/kobidkunda/vos3000-portal.git
cd vos3000-portal
cp .env.example .env
```

### 2. Start all services

```bash
docker compose up --build
```

This will:
1. Pull required images (PostgreSQL 18, ClickHouse 26.3, Redis 8.10, Redpanda 26.1)
2. Build the `api`, `worker`, and `web` images from source
3. Run PostgreSQL migrations automatically
4. Create required Redpanda topics
5. Start all services with healthcheck-gated dependency ordering

### 3. Access the portal

| Service | URL |
|---------|-----|
| Web (via nginx gateway) | http://localhost:5028 |
| Web (direct) | http://localhost:5027 |
| API (direct) | http://localhost:5026 |

### Useful Docker Compose commands

```bash
# Run in background (detached)
docker compose up --build -d

# View logs for a specific service
docker compose logs -f api
docker compose logs -f web
docker compose logs -f worker

# Restart a single service
docker compose restart api

# Stop everything and remove containers
docker compose down

# Stop and remove volumes (DESTROYS ALL DATA)
docker compose down -v
```

---

## Docker Compose — Production

> **Important:** Before going to production, complete `docs/PRODUCTION_CHECKLIST.md` in full. Do not skip secret rotation.

### 1. Clone and configure

```bash
git clone https://github.com/kobidkunda/vos3000-portal.git
cd vos3000-portal
cp .env.production.example .env
```

### 2. Set all required secrets

Open `.env` and replace every `REPLACE_*` placeholder:

| Variable | Purpose |
|----------|---------|
| `SESSION_SECRET` | 32+ character random string (`openssl rand -hex 32`) |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte key (`openssl rand -base64 32`) |
| `CDR_INGEST_TOKEN` | Strong random token for CDR ingest endpoint |
| `PAYMENT_CONFIRMATION_TOKEN` | Strong random token for payment webhook |
| `POSTGRES_PASSWORD` | Strong PostgreSQL password |
| `CLICKHOUSE_PASSWORD` | Strong ClickHouse password |
| `REDIS_PASSWORD` | Strong Redis password |
| `VOS_HTTP_BASE_URL` | VOS3000 Tomcat URL (e.g. `http://192.168.1.10:7391`) |
| `VOS_HTTP_USERNAME` | VOS3000 API admin username |
| `VOS_HTTP_PASSWORD` | VOS3000 API admin password |

### 3. Configure VOS mode

```bash
# In .env:
VOS_MODE=http        # Use real VOS3000 HTTP/JSP API
AUTH_MODE=database   # Real database auth (not demo)
DATA_MODE=external   # Real external database (not demo)
```

### 4. Deploy

```bash
docker compose -f docker-compose.production.yml up --build -d
```

The production topology exposes only the nginx gateway. No database, cache, or broker ports are published.

---

## Manual / Bare-Metal Production

### 1. Provision external services

You need:
- **PostgreSQL 18+** — database `vos_portal`, user `vos`
- **ClickHouse 26.3+** — database `vos`
- **Redis 8+** — with password auth enabled
- **Redpanda 26+** (or any Kafka-compatible broker)

### 2. Install Node.js 22

```bash
# Via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 22
nvm use 22
```

### 3. Clone and install

```bash
git clone https://github.com/kobidkunda/vos3000-portal.git
cd vos3000-portal
npm install
```

### 4. Configure environment

```bash
cp .env.production.example .env
# Edit .env with your real service URLs and secrets
```

### 5. Build all packages

```bash
npm run build
```

### 6. Run database migrations

```bash
npm run migrate:postgres
```

### 7. Start services with PM2

```bash
npm install -g pm2

pm2 start apps/api/dist/main.js --name vos-api
pm2 start apps/worker/dist/main.js --name vos-worker
pm2 start npm --name vos-web -- --prefix apps/web start

pm2 save
pm2 startup
```

---

## VOS3000 Server Integration

> Full runbook: [`docs/VOS3000_SERVER_SETUP.md`](docs/VOS3000_SERVER_SETUP.md)

Changes required **on the VOS3000 host**:

| # | Location | Change Required |
|---|----------|----------------|
| 1 | `/home/kunshi/vos3000/etc/server.conf` | `EXTERNAL_SERVER_PORT=1205`, `EXTERNAL_SERVER_IP=0.0.0.0` |
| 2 | VOS GUI → System Management → Web Access Control | Add `allowip=0.0.0.0` for `/external/server` and `/external/test` |
| 3 | VOS Host | `restart vos3000 && restart tomcat` |
| 4 | VOS GUI → Users | Create API user `admin` at level 0 |
| 5 | Portal `.env` | Set `VOS_HTTP_BASE_URL`, `VOS_HTTP_USERNAME`, `VOS_HTTP_PASSWORD`, `VOS_MODE=http` |

**Smoke test:**

```bash
curl -s -X POST "http://<VOS_IP>:7391/external/server" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<VOS_PASS>","action":"getAccountList","pageSize":1,"page":1}' \
  | python3 -m json.tool
```

---

## Environment Variables Reference

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development` or `production` |
| `AUTH_MODE` | `demo` | `demo` or `database` |
| `DATA_MODE` | `demo` | `demo` or `external` |
| `VOS_MODE` | `mock` | `mock` or `http` |
| `SESSION_SECRET` | — | **Required in prod.** 32+ random chars |
| `PORT` | `4000` | API server port |

### Databases

| Variable | Example |
|----------|---------|
| `DATABASE_URL` | `postgres://vos:pass@localhost:5020/vos_portal` |
| `CLICKHOUSE_URL` | `http://localhost:5021` |
| `REDIS_URL` | `redis://localhost:5023` |
| `REDPANDA_BROKERS` | `localhost:5024` |

### VOS3000

| Variable | Example |
|----------|---------|
| `VOS_HTTP_BASE_URL` | `http://192.168.1.10:7391` |
| `VOS_HTTP_USERNAME` | `admin` |
| `VOS_HTTP_PASSWORD` | `yourpassword` |

### Payments (NOWPayments)

| Variable | Description |
|----------|-------------|
| `NOWPAYMENTS_API_KEY` | NOWPayments API key |
| `NOWPAYMENTS_IPN_SECRET` | IPN webhook secret |
| `NOWPAYMENTS_SANDBOX` | `true` for sandbox, `false` for live |

---

## Database Setup & Migrations

### PostgreSQL (run migrations)

```bash
npm run migrate:postgres
```

### ClickHouse (auto-created on API start)

ClickHouse tables and materialized views are initialized automatically by the API on first startup.

### Redpanda Topics (bare-metal only)

```bash
rpk topic create cdr.raw --partitions 12
rpk topic create cdr.unmapped --partitions 3
rpk topic create cdr.invalid --partitions 3
rpk topic create portal.events --partitions 6
rpk topic create webhook.delivery --partitions 6
rpk topic create report.jobs --partitions 3
rpk topic create audit.events --partitions 3
```

---

## Running Tests

```bash
# Full test suite (all workspaces)
npm test

# Web frontend only
npm test -w @vos/web

# API only
npm test -w @vos/api
```

---

## Validating the Installation

```bash
python3 scripts/validate_application.py
```

Expected output:

```
✓ Route count: 142/142
✓ Unique routes: 187 API method/path pairs
✓ Required infrastructure files present
Validation: PASSED
```

---

## Troubleshooting

### Port already in use

```bash
./dev.sh --stop
# or
lsof -ti:5026,5027 | xargs kill -9
```

### Docker Compose health check failures

```bash
docker compose logs postgres
docker compose logs clickhouse
docker compose logs redpanda
docker compose up --build --force-recreate
```

### VOS connection refused

1. Confirm `server.conf` has `EXTERNAL_SERVER_PORT=1205` and `EXTERNAL_SERVER_IP=0.0.0.0`
2. Confirm Tomcat is running: `curl http://<VOS_IP>:7391/`
3. Check firewall — port `7391` must be reachable from the portal server

### Build failures

```bash
./dev.sh --clean
npm install
npm run build
```

---

## Additional Documentation

| Document | Purpose |
|----------|---------|
| [`docs/VOS3000_SERVER_SETUP.md`](docs/VOS3000_SERVER_SETUP.md) | VOS3000 host-side configuration runbook |
| [`docs/PRODUCTION_CHECKLIST.md`](docs/PRODUCTION_CHECKLIST.md) | Pre-launch production checklist |
| [`docs/WHAT_IS_ENVIRONMENT_SPECIFIC.md`](docs/WHAT_IS_ENVIRONMENT_SPECIFIC.md) | Environment-specific configuration guide |
| [`docs/openapi.product-surface.json`](docs/openapi.product-surface.json) | OpenAPI 3.1 spec for all API endpoints |
| [`DESIGN.md`](DESIGN.md) | UI/UX design system and component guidelines |
| [`AGENTS.md`](AGENTS.md) | Architecture, security, and coding standards |
