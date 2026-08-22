# Phase 05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics

## Objective

Make historical CDR and dashboard analytics fast at high row counts without scanning raw data unnecessarily.

## Dependencies

Phase 04.

## Deliverables

- [ ] Production CDR table.
- [ ] Materialized/hourly/daily aggregates.
- [ ] Tenant-scoped query service.
- [ ] Cursor pagination.
- [ ] Analytics APIs.
- [ ] Retention policy.

## Detailed workstreams

### Schema

- [ ] Create canonical `cdr_events` with stable types.
- [ ] Choose partition granularity from measured data, default monthly.
- [ ] Choose ORDER BY from query workload: tenant/time plus gateway/number dimensions.
- [ ] Use low-cardinality/enums only where beneficial after testing.
- [ ] Add data skipping indexes only after query evidence.
### Rollups

- [ ] Create hourly customer traffic aggregate.
- [ ] Create daily customer traffic aggregate.
- [ ] Create gateway quality aggregate.
- [ ] Create destination aggregate.
- [ ] Create failure/termination-reason aggregate.
- [ ] Create finance aggregate if charge/expense semantics are verified.
### Query service

- [ ] Enforce tenant and time range in service.
- [ ] Use keyset/cursor pagination rather than huge OFFSET.
- [ ] Implement query timeout and cancellation.
- [ ] Separate interactive query limits from export jobs.
- [ ] Return `data_as_of` timestamps.
### Analytics

- [ ] Implement calls, answered/failed, minutes, charge, ASR, ACD, PDD.
- [ ] Implement destination and gateway breakdowns.
- [ ] Implement failure reason distribution.
- [ ] Validate every aggregate against raw sample set and VOS source.
### Retention

- [ ] Define legal/business retention before TTL.
- [ ] Support cold export/archive only if required.
- [ ] Never delete source CDR solely because dashboard rollups exist.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] ClickHouse `cdr_events`, aggregate tables/materialized views.
- [ ] PG stores saved filters/export metadata, not raw CDR.

## API work

- [ ] `/cdr`, `/cdr/{id}`, `/cdr/recent`, `/analytics/traffic`, `/analytics/failures`, `/analytics/destinations`.

## UI/product work

- [ ] Admin/client CDR Explorer + detail; traffic/failure/destination analytics.

## Testing and verification

- [ ] Query correctness fixtures.
- [ ] Cross-tenant tests.
- [ ] 100M+ synthetic row performance benchmark if hardware allows.
- [ ] Aggregate-vs-raw reconciliation.
- [ ] Pagination stability with concurrent inserts.

## Acceptance criteria / exit gate

- [ ] Interactive common queries meet defined p95 SLO at target dataset size.
- [ ] Aggregates reconcile to raw facts within defined semantics.
- [ ] No customer can query without tenant scope.
- [ ] Large exports never run synchronously in browser request.

## Primary risks

- Wrong sort key causes expensive scans.
- Late CDR can make rollups stale if update semantics are ignored.
- Financial analytics must match authoritative billing semantics.

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

- `03_ENGINEERING/CLICKHOUSE_CDR_MODEL.md`
- `04_OPERATIONS/CAPACITY_PLANNING.md`
- `05_TESTING/DATA_RECONCILIATION_TESTS.md`

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
