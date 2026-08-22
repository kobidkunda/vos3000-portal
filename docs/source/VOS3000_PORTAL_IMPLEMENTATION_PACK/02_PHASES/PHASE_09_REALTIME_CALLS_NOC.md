# Phase 09 — Realtime Calls, Gateway Presence & NOC Streaming

## Objective

Provide low-latency current-call and gateway state without treating Redis as historical truth.

## Dependencies

Phase 03; Redis; Phase 06/07 shells.

## Deliverables

- [ ] Realtime collector.
- [ ] Redis key model.
- [ ] WebSocket/SSE stream.
- [ ] Admin NOC/live call pages.
- [ ] Customer live call page.
- [ ] Gateway online/offline change events.

## Detailed workstreams

### Collector

- [ ] Poll/subcribe using verified Current Call and Online Gateway interfaces.
- [ ] Use adaptive interval based on scale and upstream limits.
- [ ] Normalize state and compute diffs.
- [ ] Expire disappeared live objects safely.
- [ ] Track collector last-success timestamp.
### Redis

- [ ] Store live calls with TTL/heartbeat.
- [ ] Store gateway status and metrics.
- [ ] Store tenant/gateway indexes needed for fast projection.
- [ ] Do not store financial truth.
- [ ] Use atomic operations/scripts where counters require consistency.
### Streaming

- [ ] Authorize initial subscription and every channel scope.
- [ ] Backpressure or drop intermediate state updates safely while preserving latest snapshot.
- [ ] Reconnect with snapshot + incremental changes.
- [ ] Heartbeat and degraded source messages.
### NOC

- [ ] Current calls, concurrency, CPS, ASR/ACD/PDD where current calculation is meaningful.
- [ ] Gateway online/offline/degraded.
- [ ] Packet loss/latency.
- [ ] Collector/source health.
### Disconnect

- [ ] Implement only if Phase 00 verifies safe mutation.
- [ ] Admin only by default.
- [ ] Re-auth + confirmation + mandatory reason.
- [ ] Audit result.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] Optional PG incident/change history; optional ClickHouse gateway-state snapshots.
- [ ] Redis schema in engineering doc.

## API work

- [ ] `/calls/live`, stream endpoint, gateway status stream, admin disconnect if verified.

## UI/product work

- [ ] Admin Live Calls, Live Call Detail, NOC; client Live Calls, Service Status.

## Testing and verification

- [ ] 10k+ simulated live objects as appropriate.
- [ ] Reconnect/resubscribe.
- [ ] Redis restart.
- [ ] VOS collector stale.
- [ ] Cross-tenant stream leakage tests.
- [ ] Disconnect permission tests.

## Acceptance criteria / exit gate

- [ ] Stream never leaks another tenant.
- [ ] UI clearly shows stale/degraded state.
- [ ] Redis loss can rebuild from VOS source.
- [ ] Collector load does not overload VOS.

## Primary risks

- Aggressive polling can harm VOS.
- Live state can disappear without a clean event; TTL/reconciliation required.

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

- `03_ENGINEERING/REALTIME_ARCHITECTURE.md`
- `03_ENGINEERING/REDIS_KEYS_TTL.md`
- `07_REFERENCES/SOURCE_REFERENCE_MAP.md`

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
