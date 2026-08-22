# Phase 01 — Repository, Infrastructure & Development Foundation

## Objective

Create a repeatable monorepo and local/staging platform containing all chosen infrastructure with strong environment boundaries.

## Dependencies

Phase 00 capability map can continue in parallel, but no VOS writes are enabled.

## Deliverables

- [ ] Monorepo with web, API, CDR ingest, workers and shared packages.
- [ ] Local Docker Compose for PostgreSQL, ClickHouse, Redis, Redpanda, MinIO and observability.
- [ ] Migration strategy and environment configuration system.
- [ ] CI pipeline for lint/typecheck/unit tests/migrations/container build.
- [ ] Staging deployment on Ubuntu behind Nginx/TLS.

## Detailed workstreams

### Repository

- [ ] Create `apps/web`, `apps/api`, `apps/cdr-ingest`, `apps/worker`, `apps/realtime`.
- [ ] Create packages for PostgreSQL access, ClickHouse, Redis, events, VOS adapter, auth, shared types and config.
- [ ] Enable TypeScript strict mode and consistent lint/format rules.
- [ ] Define module ownership and no-cross-layer-import rules.
### Infrastructure

- [ ] Provision PostgreSQL 18 with PgBouncer.
- [ ] Provision ClickHouse with persistent storage.
- [ ] Provision Redis with persistence policy appropriate only to cache/live state.
- [ ] Provision Redpanda with durable volumes and topic creation scripts.
- [ ] Provision MinIO/S3-compatible object storage.
- [ ] Provision Prometheus/Grafana/Loki or staged equivalents.
### Configuration

- [ ] Create typed config loader that fails fast for missing required settings.
- [ ] Separate `development`, `test`, `staging`, `production` secrets.
- [ ] Never commit production credentials.
- [ ] Add environment identifiers visible in admin header.
### CI/CD

- [ ] Run install, lint, typecheck, unit tests and migration checks on every PR.
- [ ] Build immutable container images tagged with commit SHA.
- [ ] Block production deploy when migration/test gates fail.
- [ ] Create staging auto-deploy or controlled manual promotion.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] Create baseline PostgreSQL migrations for platform metadata and migration table.
- [ ] Create ClickHouse migration/versioning convention.

## API work

- [ ] Add `/health/live`, `/health/ready`, `/version`.
- [ ] Add global request ID, structured error envelope, validation and OpenAPI setup.

## UI/product work

- [ ] Create shared app shell, error boundary, loading components, environment badge and permission-aware navigation skeleton.

## Testing and verification

- [ ] CI smoke tests for every service.
- [ ] Container startup health checks.
- [ ] Migration up/down validation where safe.
- [ ] Config failure tests.

## Acceptance criteria / exit gate

- [ ] Fresh developer clone starts full stack with documented commands.
- [ ] Staging can deploy from CI artifact.
- [ ] Every service exposes health and version.
- [ ] No secret exists in repository history for new setup.

## Primary risks

- Too many stateful services on a single small host can cause resource contention.
- Local Docker settings can differ from production; document differences.

## Required evidence before marking complete

- [ ] Pull request(s) merged with CI green.
- [ ] Environment deployment evidence captured.
- [ ] API/OpenAPI or event schemas updated.
- [ ] Database/event migrations committed and reviewed.
- [ ] Security/RBAC implications reviewed.
- [ ] Observability added for new critical paths.
- [ ] Rollback/degradation behavior documented.
- [ ] Relevant reference/product pages traced to implementation tickets.
- [ ] No `[VERIFY-VOS-API]` assumption silently converted into production code.

## References

- `01_ARCHITECTURE/02_TECH_STACK_DECISIONS.md`
- `04_OPERATIONS/DEPLOYMENT_RUNBOOK.md`
- `08_EXAMPLES/env.example`

## Phase completion record

| Field | Value |
|---|---|
| Owner | TBD |
| Start | TBD |
| Target finish | TBD |
| Actual finish | TBD |
| Status | Not started |
| Blocking issues | |
| Approved by | |
