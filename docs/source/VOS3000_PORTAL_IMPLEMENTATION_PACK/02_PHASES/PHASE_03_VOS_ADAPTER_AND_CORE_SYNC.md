# Phase 03 — VOS Adapter, Instance Registry & Core Read Synchronization

## Objective

Create one typed, observable integration boundary for VOS and expose only verified capabilities.

## Dependencies

Phase 00 VERIFIED read capabilities; Phase 01/02.

## Deliverables

- [ ] Multi-instance VOS registry.
- [ ] Typed VOS Adapter interface.
- [ ] Account/gateway/phone/rate/payment read mappings.
- [ ] Capability flags.
- [ ] Retry/timeout/error normalization.
- [ ] Core sync jobs.

## Detailed workstreams

### Adapter contract

- [ ] Implement methods from `VOS_ADAPTER_CONTRACT.md` only after Phase 00 verification.
- [ ] Separate read and mutation interfaces.
- [ ] Return normalized domain DTOs; never leak vendor transport objects to UI.
- [ ] Normalize vendor errors into retryable/non-retryable categories.
- [ ] Attach `vos_instance_id`, upstream request/reference IDs and timing metrics.
### Instance registry

- [ ] Store VOS instance metadata and encrypted secret references.
- [ ] Health-check each instance.
- [ ] Support disabled/maintenance state.
- [ ] Associate customer/account/gateway mappings with instance.
### Read synchronization

- [ ] Sync VOS accounts to mapping table without overwriting portal identity fields.
- [ ] Sync gateway identities/status metadata.
- [ ] Sync rate-group metadata needed for portal.
- [ ] Sync payment records only as reconciliation source, not as replacement for portal payment ledger.
- [ ] Use checkpoints and incremental reads where supported.
### Resilience

- [ ] Configure per-operation timeout.
- [ ] Retry only safe idempotent reads automatically.
- [ ] Circuit-break/degrade repeated failures.
- [ ] Surface stale-data timestamp to UI.
- [ ] Never silently substitute stale financial data without labeling it.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] vos_instances, vos_accounts, vos_gateways, vos_phones, vos_rate_groups, sync_checkpoints, integration_errors.

## API work

- [ ] Internal adapter health/capability endpoints; admin read endpoints for mapped accounts/gateways.

## UI/product work

- [ ] Admin integration health, customer/account mapping views, VOS capability display.

## Testing and verification

- [ ] Contract tests against VOS test environment.
- [ ] Normalization fixtures.
- [ ] Timeout/error classification tests.
- [ ] Multiple VOS instance collision tests.
- [ ] Checkpoint/retry tests.

## Acceptance criteria / exit gate

- [ ] All adapter methods used by later phases are typed and capability-gated.
- [ ] No frontend imports VOS adapter transport types.
- [ ] A second VOS instance can be registered without schema redesign.
- [ ] Read failures show degraded/stale status.

## Primary risks

- Upstream pagination/filter semantics may be inefficient.
- Vendor interface may not provide stable IDs for all resources.

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

- `03_ENGINEERING/VOS_ADAPTER_CONTRACT.md`
- `03_ENGINEERING/MULTI_VOS_INSTANCE_DESIGN.md`
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
