# Deployment Runbook

## Environments

- development
- test
- staging
- production

Production credentials/data never flow back into lower environments except sanitized fixtures.

## Initial production topology

A practical starting layout:

```text
App nodes:
  Nginx
  Next.js
  Portal API
  CDR ingest
  workers/realtime

Data node(s):
  PostgreSQL + PgBouncer
  ClickHouse
  Redpanda
  Redis
  MinIO
```

For serious traffic, separate PostgreSQL and ClickHouse onto dedicated hosts early. Stateful separation is preferred over packing everything onto one machine.

## Deployment sequence

1. Confirm CI artifact SHA.
2. Confirm database backups/current health.
3. Apply PostgreSQL migration.
4. Apply ClickHouse migration.
5. Deploy backward-compatible workers/consumers.
6. Deploy API.
7. Deploy web.
8. Run readiness smoke tests.
9. Check Redpanda consumer lag.
10. Check CDR latest timestamp.
11. Check VOS adapter health.
12. Check error/latency dashboards.
13. Enable feature flag if this release is gated.

## Migration rules

- API must tolerate old/new schema during rolling deploy if more than one app instance exists.
- Destructive columns are removed only in a later release.
- Large PG index builds use safe online/concurrent strategy.
- ClickHouse backfills run as controlled jobs, not blocking deployment.

## Rollback

Application rollback:
- deploy previous immutable image.

Database:
- prefer forward-fix for additive migrations;
- destructive migration requires explicit reverse plan and backup restore point.

Feature:
- high-risk functions behind server-side feature flag/capability flag.

## Smoke tests

- `/health/live`, `/health/ready`
- login
- admin dashboard
- client dashboard test tenant
- recent CDR returns current data
- live calls status timestamp
- gateway status
- payment provider webhook endpoint reachable (sandbox/test event)
- object-storage upload/download
- one test webhook delivery
- no consumer lag growth after deploy

## Production change log

Every deployment records:
- commit SHA;
- images;
- migrations;
- operator;
- time;
- features enabled;
- rollback decision point;
- incident link if any.
