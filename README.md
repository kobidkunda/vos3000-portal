# VOS3000 Admin + Customer Portal — Full Application Source

A runnable, API-first telecom portal implementing the complete **97-page Admin** and **45-page Customer** route set from the supplied product specification (**142 routes total**).

## Important integration boundary

The supplied VOS3000 manual documents VOS functions but does **not** define a complete official REST/CRUD contract for every function. This repository therefore does **not invent undocumented VOS write APIs**. The application includes demo-safe UI/workflow behavior in `VOS_MODE=mock` without touching VOS. External PostgreSQL/ClickHouse/Redis/Redpanda mode and real VOS writes require the environment-specific services and verified VOS transport mapping described below. Production VOS writes are capability-gated by `config/vos-capabilities.json` and fail closed until a real interface has been verified against the deployed VOS build.

That boundary is intentional. The repository does not claim an undocumented VOS API contract; production activation requires verifying the transport mapping against your licensed/installed VOS3000 instance and completing the runtime checks in `docs/PRODUCTION_CHECKLIST.md`.

## Coverage

- Admin pages: **97/97**
- Client pages: **45/45**
- Total route definitions: **142/142**
- Product API declarations represented: **187 unique method/path pairs**
- PostgreSQL transactional schema
- ClickHouse CDR + hourly/daily rollups
- Redis realtime/cache integration
- Redpanda CDR/event integration
- Mock + capability-gated VOS adapter
- Authentication/session token, RBAC context and tenant-safe route behavior
- CDR ingest endpoint
- Payment/deposit state flow
- Realtime SSE feed
- API/webhook/report/support workflows
- Docker Compose deployment
- Validation scripts and tests

## Stack

Pinned around current stable releases researched for August 2026:
- Next.js 16.3.2 / React 19.2.8
- NestJS 11.2.1 + Fastify
- TypeScript 7.0.2
- PostgreSQL 18
- node-postgres 8.23.0 (explicit SQL/migrations; no ORM dependency)
- ClickHouse 26.3 LTS + `@clickhouse/client` 1.23.1
- Redis 8.10 + node-redis 6.2.1
- Redpanda 26.1 + KafkaJS 2.2.4

## Quick start — dev runner

```bash
cp .env.example .env
npm install
./dev.sh
```

Or run via `npm run dev`.

The runner automatically:
1. Detects and terminates any previously running dev processes on target ports
2. Builds shared workspaces (`@vos/shared`, `@vos/adapter`)
3. Runs dev tests and verification suite (`@vos/shared`, `@vos/api`, `@vos/web`, validator)
4. Starts API + Web frontend concurrently with color-coded live logs
5. Performs automated health checks and displays access URLs

### Dev runner options:
- `./dev.sh` — Full start with cleanup, dev tests, and live logs
- `./dev.sh --skip-tests` (`-s`) — Fast start skipping test suite
- `./dev.sh --test-only` (`-t`) — Run test suites and validator only
- `./dev.sh --stop` (`-k`) — Stop all running dev processes
- `./dev.sh --with-worker` (`-w`) — Also launch background worker
- `./dev.sh --clean` (`-c`) — Clean build caches and logs

Open:
- Web: `http://localhost:3001`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`
- Health: `http://localhost:4000/api/v1/health`

Demo credentials:
- Admin: `admin@example.com` / `Admin123!`
- Client: `client@example.com` / `Client123!`

## Docker Compose

```bash
cp .env.example .env
docker compose up --build
```

Services: web, API, worker, PostgreSQL, ClickHouse, Redis, Redpanda.


## Production Compose reference

Use the separate production topology, which does not publish PostgreSQL, ClickHouse, Redis, Redpanda, API or web service ports directly:

```bash
cp .env.production.example .env
# replace every REPLACE_* secret and configure the real VOS/payment/delivery adapters
docker compose -f docker-compose.production.yml up --build
```

The included production Compose remains a single-node reference topology for stateful services. Redpanda/ClickHouse/PostgreSQL HA must be deployed according to your production SLO.

## VOS3000 Server-Side Setup (JSP API) — Start Here

> **New: one-page host runbook at [`docs/VOS3000_SERVER_SETUP.md`](docs/VOS3000_SERVER_SETUP.md).**
> Do these 7 changes **on the VOS3000 host itself** before the portal can connect:

| # | File / GUI | Change |
|---|------------|--------|
| 1 | `/home/kunshi/vos3000/etc/server.conf` | `GUI_SERVER_PORT=7663` (not 7391), `EXTERNAL_SERVER_PORT=1205`, `EXTERNAL_SERVER_IP=0.0.0.0` |
| 2 | `e_web_access_control` (GUI → System Management) | `allowip=0.0.0.0` for `/external/server` + `/external/test` |
| 3 | Host | `restart vos3000` then `restart tomcat` (`:7391` serves all JSP APIs) |
| 4 | GUI → System Management → Users | API user `admin` (level 0) — portal uses `VOS_HTTP_USERNAME`/`VOS_HTTP_PASSWORD` |
| 5 | Portal `.env` | `VOS_HTTP_BASE_URL=http://62.84.182.223:7391` (Tomcat, JSON POST) |

Full port map, `server.conf` snippet, curl smoke tests (with verified `admin` / `uuid=bd797894-3f0e-4515-a870-18379afa25b5`), and 90+ endpoint inventory → **see [`docs/VOS3000_SERVER_SETUP.md`](docs/VOS3000_SERVER_SETUP.md)**.

## Production VOS activation

1. Complete **server-side setup** in [`docs/VOS3000_SERVER_SETUP.md`](docs/VOS3000_SERVER_SETUP.md) on the VOS host.
2. Verify exact supported VOS read/write interface against your deployed VOS version (90+ JSP endpoints on `:7391`).
3. Update `config/vos-capabilities.json` only for verified operations.
4. Set `VOS_MODE=http` and transport credentials (`VOS_HTTP_BASE_URL`, `VOS_HTTP_USERNAME`, `VOS_HTTP_PASSWORD`).
5. Run contract tests before enabling customer/admin write controls.
6. Leave unsupported operations disabled; the API returns a clear `VOS_CAPABILITY_UNVERIFIED` error rather than guessing.

## Validation

```bash
python3 scripts/validate_application.py
```

This checks route count, unique routes, source page template coverage, API declarations and required files.
