# Load and Performance Test Plan

## Objective

Prove the platform at measured production peak plus headroom.

## Traffic profile

Do not use only uniform random records.
Synthetic CDR should model:
- uneven tenant sizes;
- gateway concentration;
- destination distribution;
- success/failure ratios;
- short/long calls;
- repeated callers/callees;
- timestamp bursts;
- duplicate retries.

## Scenarios

### A. CDR steady ingest
Duration: 1–4 hours.
Rates:
- measured peak;
- 2x measured peak.

Measure:
- ingest response latency;
- producer errors;
- Redpanda lag;
- ClickHouse insert rate;
- consumer CPU/memory;
- part/merge pressure.

### B. Burst
5x peak for a shorter period.
Expected:
- queue absorbs burst;
- no loss;
- lag recovers after burst.

### C. ClickHouse outage
- stop ClickHouse;
- continue ingest;
- verify Redpanda buffering;
- restore CH;
- verify consumer catches up;
- reconcile event count.

### D. Duplicate replay
Replay same CDR batch 2–5 times.
Expected one logical record/aggregate contribution.

### E. Historical query
Datasets:
- 10M;
- 100M;
- larger if expected.

Queries:
- tenant + 1 day;
- tenant + 30 days;
- caller/callee exact;
- gateway;
- failure reason;
- destination aggregate.

### F. Concurrent UI
Simulate:
- admin dashboard;
- customer dashboards;
- CDR pagination;
- live stream connections.

### G. Large export
- 1M rows CSV.gz;
- 10M rows CSV.gz/Parquet if product permits.
Measure worker memory and ClickHouse impact.

### H. Redpanda/consumer restart
Verify replay and no double count.

## Pass/fail metrics

Set numeric thresholds before execution:
- zero lost logical CDR;
- duplicate contribution = 0;
- maximum recoverable lag time;
- p95 interactive CDR query;
- API p95;
- max worker memory;
- acceptable ClickHouse CPU/IO/merge pressure.

## Evidence

Store:
- test generator version/seed;
- dataset shape;
- hardware;
- dashboards/screenshots;
- exact thresholds;
- raw results;
- bottleneck notes;
- tuning changes.
