# Scale and Capacity Plan

## Planning principle

The user requirement is "millions of CDR". Exact traffic must be measured before hardware sizing. This document defines the **test envelope**, not a claim about current VOS traffic.

## Required sizing inputs

Collect before production:
- peak CDR/second;
- average CDR/day;
- burst duration and retry behavior;
- average normalized CDR row size;
- retention period;
- number of tenants;
- maximum CDR query date range;
- expected concurrent portal users;
- live-call concurrency;
- export frequency/size;
- number of VOS instances.

## Baseline validation envelopes

Run load tests at three levels:
1. **Current expected load** from measured production CDR.
2. **2x current peak** for safe launch.
3. **5x current peak burst** for queue/backpressure testing.

A synthetic example such as 5M CDR/day is only a test scenario; actual sizing must use measured values.

## Capacity formulas

```text
avg_cdr_per_sec = daily_cdr / 86400
storage_per_day = avg_row_bytes * daily_cdr / compression_ratio
retention_storage = storage_per_day * retention_days * replication_factor
```

Add headroom for merges, replicas, temporary query space and exports.

## ClickHouse design target

- batched inserts, not one HTTP insert per CDR;
- monthly partitions unless measured behavior justifies another granularity;
- sorting key aligned to most common tenant/time/gateway queries;
- materialized views/aggregate tables for dashboards;
- TTL only after business/legal retention is defined.

## Redpanda target

Must retain enough event history to survive:
- ClickHouse maintenance;
- consumer deployment failure;
- temporary network loss.

Retention is decided from measured ingest volume and maximum accepted recovery window.

## PostgreSQL target

Keep high-volume CDR out of normal PG tables. Partition only genuinely large transactional tables such as:
- audit logs;
- webhook delivery history;
- API request logs;
- payment events if very high volume.

## Export limits

- UI CDR table: cursor pagination.
- XLSX: enforce workbook/worksheet practical row limit and product policy.
- Very large exports: CSV.gz or Parquet.
- Async jobs only above a small synchronous threshold.

## Query guardrails

Customer/admin CDR APIs must enforce:
- tenant scope;
- maximum unfiltered date range;
- indexed/sort-key-friendly filters;
- cursor pagination;
- query timeout;
- concurrency budget;
- export job path for huge result sets.
