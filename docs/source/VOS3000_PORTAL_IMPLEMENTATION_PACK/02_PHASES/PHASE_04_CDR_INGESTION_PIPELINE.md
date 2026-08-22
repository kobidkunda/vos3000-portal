# Phase 04 — Durable CDR Ingestion, Validation, Dedupe & Replay

## Objective

Build a loss-resistant high-throughput path from VOS CDR output/import into Redpanda and ClickHouse.

## Dependencies

Phase 00 CDR delivery semantics verified; Phase 01.

## Deliverables

- [ ] CDR ingest service.
- [ ] Canonical CDR schema.
- [ ] Redpanda topics.
- [ ] Dedupe identity.
- [ ] Dead-letter path.
- [ ] Replay tooling.
- [ ] Backpressure/load tests.

## Detailed workstreams

### Ingest endpoint/source

- [ ] Implement exact VOS-compatible receiver or verified pull/import connector.
- [ ] Authenticate/allowlist source.
- [ ] Capture receive time and VOS instance.
- [ ] Validate mandatory fields without rejecting safely storable unknown optional fields.
- [ ] Acknowledge only according to documented VOS retry semantics.
### Canonicalization

- [ ] Normalize phone fields as strings; do not lose leading +/0.
- [ ] Normalize timestamps to UTC while preserving source timezone/offset metadata.
- [ ] Normalize money to fixed precision/minor-unit/Decimal strategy.
- [ ] Map gateway/account IDs with vos_instance_id.
- [ ] Preserve upstream serial/Call-ID and selected raw metadata.
### Dedupe

- [ ] Prefer `(vos_instance_id, serial_number)` only after uniqueness verification.
- [ ] Add deterministic fallback fingerprint if needed.
- [ ] Maintain ingest id/event id.
- [ ] Ensure replay does not double-count analytics.
- [ ] Document late/updated CDR behavior if VOS can revise records.
### Event bus

- [ ] Create versioned `cdr.normalized.v1` topic.
- [ ] Set partition key to preserve useful locality without hot partitioning.
- [ ] Configure producer acknowledgements and retries.
- [ ] Create DLQ for malformed/unprocessable records.
- [ ] Add consumer lag dashboards.
### Consumer

- [ ] Batch events by count/time.
- [ ] Insert batch into ClickHouse.
- [ ] Commit offsets only after durable insert policy.
- [ ] Handle ClickHouse unavailable by stopping/pausing consumption rather than dropping.
- [ ] Implement controlled replay by offsets/time/event IDs.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] Minimal PG ingest metadata/DLQ references if needed; main CDR goes to ClickHouse.
- [ ] Create raw normalized CDR table and dedupe strategy.

## API work

- [ ] Internal ingest endpoint; no customer exposure.
- [ ] Admin ingest health/replay controls restricted to platform operators.

## UI/product work

- [ ] NOC widget: received/sec, consumer lag, DLQ count, last CDR time.

## Testing and verification

- [ ] Synthetic CDR contract tests.
- [ ] Duplicate delivery/replay tests.
- [ ] Out-of-order event tests.
- [ ] ClickHouse outage test.
- [ ] Redpanda restart test.
- [ ] Burst load test at measured peak, 2x and 5x.

## Acceptance criteria / exit gate

- [ ] No CDR loss in defined outage/restart test.
- [ ] Duplicate replay produces one logical CDR.
- [ ] DLQ captures invalid records with reason.
- [ ] Lag and last-ingest time are observable.
- [ ] Pipeline meets measured throughput target with headroom.

## Primary risks

- Upstream may not retry safely.
- Serial uniqueness assumptions can corrupt dedupe.
- One-record ClickHouse inserts will destroy throughput; enforce batching.

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
- `03_ENGINEERING/REDPANDA_TOPICS_EVENTS.md`
- `05_TESTING/LOAD_PERFORMANCE_TEST_PLAN.md`

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
