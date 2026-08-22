# Phase 13 — Migration, Reconciliation, Load Test, UAT & Production Go-Live

## Objective

Prove the complete platform under realistic load and cut over without losing CDR, balance or operational visibility.

## Dependencies

Phases 00-12 required for production scope.

## Deliverables

- [ ] Production data mapping.
- [ ] Historical CDR migration/import plan.
- [ ] Full load results.
- [ ] UAT signoff.
- [ ] Reconciliation signoff.
- [ ] Cutover/rollback runbook.
- [ ] Hypercare dashboard.

## Detailed workstreams

### Data migration

- [ ] Import/map customers and VOS account/gateway IDs.
- [ ] Do not create duplicate VOS objects when portal only needs mappings.
- [ ] Backfill historical CDR to ClickHouse if required, preserving source IDs/timestamps.
- [ ] Validate row counts by day/account/gateway.
- [ ] Backfill rate publication metadata only if trustworthy.
### Load test

- [ ] Replay representative CDR distribution.
- [ ] Test measured peak, 2x and 5x burst.
- [ ] Test concurrent CDR queries and exports.
- [ ] Test live-call streaming connections.
- [ ] Test payment webhook concurrency safely in sandbox.
- [ ] Measure Redpanda lag and ClickHouse merge/query behavior.
### Reconciliation

- [ ] Compare daily CDR counts.
- [ ] Compare calls/minutes/charges by sample accounts/day.
- [ ] Compare balances and payment records.
- [ ] Compare gateway online state.
- [ ] Investigate discrepancies before launch.
### UAT

- [ ] Admin role-based scenarios.
- [ ] Customer portal scenarios.
- [ ] Payment/add-funds.
- [ ] CDR export.
- [ ] Gateway/rate views and allowed writes.
- [ ] Support/API/webhooks if in launch scope.
- [ ] Mobile/browser matrix.
### Cutover

- [ ] Freeze risky configuration window.
- [ ] Snapshot/backup.
- [ ] Enable CDR feed to new pipeline with dual validation if possible.
- [ ] Enable read-only portal first.
- [ ] Enable money/config writes only after reconciliation.
- [ ] Monitor hypercare metrics continuously.
- [ ] Keep rollback path documented.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] Final production migrations, indexes, retention settings.
- [ ] Historical import checkpoints and reconciliation tables.

## API work

- [ ] Production rate limits, timeouts and feature flags.
- [ ] Disable unverified endpoints.

## UI/product work

- [ ] Feature flags for staged release by tenant.
- [ ] Maintenance/degraded banners.

## Testing and verification

- [ ] End-to-end production-like test.
- [ ] Backup restore immediately before go-live window.
- [ ] Rollback rehearsal.
- [ ] UAT checklist completion.
- [ ] Security final smoke.

## Acceptance criteria / exit gate

- [ ] CDR counts and financial samples reconcile within explicitly approved tolerance.
- [ ] Load test passes with agreed headroom.
- [ ] Rollback is rehearsed/documented.
- [ ] Business/NOC/billing/security owners sign off.
- [ ] No unverified VOS write is enabled.

## Primary risks

- Historical data inconsistencies.
- Dual-running can double ingest if dedupe identity is wrong.
- Enabling writes too early can make rollback difficult.

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

- `05_TESTING/UAT_CHECKLISTS.md`
- `05_TESTING/LOAD_PERFORMANCE_TEST_PLAN.md`
- `04_OPERATIONS/DEPLOYMENT_RUNBOOK.md`
- `06_PROJECT_MANAGEMENT/PHASE_GATES.md`

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
