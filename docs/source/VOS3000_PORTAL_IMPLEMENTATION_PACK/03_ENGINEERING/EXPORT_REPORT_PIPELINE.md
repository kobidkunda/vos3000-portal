# Export and Report Pipeline

## Request

Client:
```text
POST /api/v1/cdr/exports
```

API:
1. authorizes tenant/filter;
2. validates date range;
3. estimates/limits result size;
4. creates PG job;
5. publishes report job;
6. returns `202 Accepted`.

## Worker

1. claims job;
2. queries ClickHouse in streaming chunks;
3. writes format incrementally;
4. uploads multipart/stream to object storage;
5. computes size/hash;
6. stores object key and expiry;
7. marks job ready.

Never load millions of rows into Node.js memory at once.

## Formats

### CSV / CSV.gz
Default for large flat datasets.

### Parquet
Best for very large analytical export and downstream processing.

### XLSX
Use only under defined row/size policy. Split sheets only if product explicitly supports it.

### PDF
For summarized statements/reports, not raw millions-row CDR.

## Download authorization

The download endpoint:
- authenticates user;
- verifies tenant/resource ownership;
- returns short-lived signed URL or streams authorized object;
- logs access.

Do not expose permanent public object URLs.

## Resource control

Per tenant:
- max concurrent exports;
- max lookback without approval;
- daily export quota if needed.

Global:
- worker concurrency;
- ClickHouse query quota;
- object storage bandwidth.

## Cancellation

Queued jobs can cancel immediately.
Running jobs support best-effort cancellation and ClickHouse query cancellation when available.
