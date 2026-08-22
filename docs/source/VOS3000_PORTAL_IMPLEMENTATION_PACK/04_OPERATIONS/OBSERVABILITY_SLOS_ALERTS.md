# Observability, SLOs and Alerts

## Golden signals by service

### Portal API
- requests/s
- p50/p95/p99 latency
- 4xx/5xx
- saturation
- active requests
- dependency latency

### VOS Adapter
- operation count
- latency by method/instance
- timeout rate
- rejected/unknown error
- last successful read per resource type
- capability mismatches

### CDR ingest
- received/s
- validation failures
- publish latency
- publish failures
- last received timestamp

### Redpanda
- producer errors
- consumer lag
- oldest unprocessed age
- disk usage
- under-replicated partitions where applicable

### ClickHouse
- insert rows/s
- insert failures
- query p95
- memory
- merges/parts pressure
- disk free
- long queries
- rejected queries

### PostgreSQL
- connections/PgBouncer pool
- transaction latency
- locks/deadlocks
- long transactions
- replica lag if applicable
- disk/WAL

### Redis
- memory
- evictions
- command latency
- connected clients
- key count for live calls
- replication/failover if used

### Worker
- queued/running/failed jobs
- oldest job
- webhook failure rate
- report duration
- reconciliation backlog

## Suggested initial SLO categories

Values must be finalized from business expectations.

- Portal availability.
- Customer CDR freshness.
- Live call/gateway freshness.
- CDR ingest lag.
- Common CDR query p95.
- Payment provider-confirmed -> reconciled/credited time.
- Webhook delivery initial-attempt latency.

## Critical alerts

Page/urgent:
- CDR ingest stopped beyond threshold;
- Redpanda lag increasing continuously;
- ClickHouse disk/insert failure;
- PostgreSQL unavailable;
- payment credits stuck/unknown above threshold;
- VOS adapter unavailable for all instances;
- backup failure repeated;
- security/auth anomaly.

Ticket/non-page:
- customer webhook failures;
- one gateway degraded;
- report job failures;
- elevated query latency.

## Alert quality

Every alert must contain:
- impact;
- source dashboard;
- runbook link;
- tenant/VOS instance if relevant;
- first seen/current value.

Delete or tune noisy alerts.
