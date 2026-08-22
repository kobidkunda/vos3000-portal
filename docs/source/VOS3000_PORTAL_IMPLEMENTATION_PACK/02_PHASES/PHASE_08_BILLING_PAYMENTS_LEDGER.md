# Phase 08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation

## Objective

Implement safe customer deposits and admin adjustments with no ambiguous success state.

## Dependencies

Phase 02/03; VOS payment/credit mutation VERIFIED in Phase 00.

## Deliverables

- [ ] Payment provider integration.
- [ ] Immutable ledger.
- [ ] VOS credit command/reconciliation.
- [ ] Admin payment tools.
- [ ] Customer payment history/receipts.
- [ ] Failure recovery runbook.

## Detailed workstreams

### Ledger

- [ ] Use append-only ledger entries rather than editing history.
- [ ] Represent money in integer minor units or exact Decimal/NUMERIC.
- [ ] Store currency explicitly.
- [ ] Separate provider transaction, portal deposit, ledger entries and VOS credit result.
- [ ] Use idempotency keys for every external mutation.
### Provider

- [ ] Create deposit server-side.
- [ ] Verify signed webhook.
- [ ] Handle duplicate webhooks.
- [ ] Never trust browser redirect as payment confirmation.
- [ ] Record raw provider event reference with sensitive data redacted.
### VOS credit

- [ ] Create deterministic credit command after provider confirmation.
- [ ] Call verified adapter mutation.
- [ ] Persist upstream result/reference.
- [ ] Read-after-write balance when possible.
- [ ] If VOS fails, transition to `REQUIRES_RECONCILIATION`, not completed.
### Admin adjustments

- [ ] Payment/Credit/Make Zero actions only if verified and permissioned.
- [ ] Mandatory memo.
- [ ] Threshold-based secondary approval option.
- [ ] Before/after balance display.
- [ ] Audit with operator and request ID.
### Reconciliation

- [ ] Scheduled provider-vs-ledger-vs-VOS checks.
- [ ] Queue unresolved mismatches.
- [ ] Manual resolve workflow with audit.
- [ ] Daily reconciliation report.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] payment_providers, deposits, payment_events, ledger_accounts, ledger_entries, vos_credit_commands, reconciliations, receipts.

## API work

- [ ] `/deposits`, `/payments`, admin adjustments, reconciliation admin endpoints.

## UI/product work

- [ ] Client Add Funds/Payment History/Detail; Admin Payment Ledger/New Adjustment/Reconciliation.

## Testing and verification

- [ ] Duplicate provider webhook.
- [ ] Provider success + VOS timeout.
- [ ] VOS success + response lost.
- [ ] Retry idempotency.
- [ ] Currency/rounding.
- [ ] Concurrent deposits.
- [ ] Reconciliation mismatch.

## Acceptance criteria / exit gate

- [ ] No duplicate provider event can double-credit.
- [ ] No payment is completed before VOS/ledger criteria are met.
- [ ] Every mismatch is visible and recoverable.
- [ ] Money arithmetic passes exactness tests.

## Primary risks

- VOS mutation may not provide native idempotency; portal must compensate with command state and read-back.
- Balance can change from calls between pre/post reads; reconciliation needs semantics.

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

- `03_ENGINEERING/PAYMENT_LEDGER_AND_RECONCILIATION.md`
- `05_TESTING/DATA_RECONCILIATION_TESTS.md`
- `04_OPERATIONS/INCIDENT_RUNBOOK.md`

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
