# Capacity Planning Worksheet

## Inputs to record monthly

| Metric | Current | Peak | 3-month forecast | 12-month forecast |
|---|---:|---:|---:|---:|
| CDR/day | | | | |
| CDR/s peak | | | | |
| Concurrent live calls | | | | |
| Customers | | | | |
| Mapping gateways | | | | |
| Routing gateways | | | | |
| ClickHouse rows | | | | |
| ClickHouse compressed bytes | | | | |
| PG DB size | | | | |
| Redpanda bytes/day | | | | |
| Export GB/day | | | | |
| Concurrent web users | | | | |

## ClickHouse

Track:
- disk growth/day;
- parts/partition;
- merge backlog;
- query p95;
- insert p95;
- compression ratio;
- biggest tenants.

Scale trigger examples are environment-specific:
- projected disk exhaustion inside headroom window;
- sustained merge pressure;
- interactive p95 exceeds SLO;
- insert backlog under normal peak.

## Redpanda

Track:
- topic bytes/day;
- consumer lag;
- recovery-time retention coverage;
- disk headroom;
- skew by partition.

## PostgreSQL

Track:
- connection pool saturation;
- CPU/IO;
- slow queries;
- lock contention;
- audit/webhook log growth.

## Redis

Track:
- memory per live call/gateway;
- peak key count;
- evictions (target normally zero for critical cache behavior);
- stream client connections.

## Load-test update

Whenever expected traffic changes materially:
- refresh synthetic distribution;
- rerun 2x/5x burst tests;
- update hardware/runbook.
