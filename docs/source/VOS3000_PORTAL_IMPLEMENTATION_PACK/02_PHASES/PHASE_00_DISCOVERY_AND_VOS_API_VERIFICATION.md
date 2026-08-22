# Phase 00 — Discovery, VOS Interface Verification & Baseline Capture

## Objective

Prove exactly how the installed VOS3000 build can be read and safely mutated before portal code depends on undocumented behavior.

## Dependencies

None. This is the mandatory starting phase.

## Deliverables

- [ ] Installed VOS version/build inventory and environment diagram.
- [ ] Capability matrix mapping every required portal action to a verified VOS read/write mechanism.
- [ ] Captured sample payloads/field mappings for Account, Payment, CDR, Current Call, Mapping/Routing Gateway, Online Gateway, Gateway Network, Rates, Users and Interface Management.
- [ ] VOS Adapter contract v1 with unsupported operations explicitly marked.
- [ ] Baseline traffic measurements: CDR/day, peak CDR/s, current calls, gateways, customers, retention.
- [ ] Non-production VOS test tenant/accounts/gateways for contract testing.

## Detailed workstreams

### Environment discovery

- [ ] Record VOS server IPs, versions, roles, softswitch names, timezones, currencies and network path from proposed adapter.
- [ ] Identify whether current deployment is standalone or includes DR/secondary components.
- [ ] Inventory customer account count, mapping gateways, routing gateways, phones and rate groups.
- [ ] Record existing CDR retention and data-maintenance settings without changing them.
- [ ] Record existing external interface/web-service equipment and allowlisted IP settings.
### Interface verification

- [ ] Obtain vendor/API/interface documentation specific to installed build if available.
- [ ] Test read operations for account/balance, recent CDR, historical CDR, current call, online gateways, gateway network, payment records and rates.
- [ ] Test write operations only in non-production for account create/update/lock, payment/credit, gateway create/update/IP/capacity, phone operations, rate changes and call disconnect.
- [ ] For each operation record authentication method, request schema, response schema, error codes, timeout behavior, idempotency behavior and side effects.
- [ ] Verify whether VOS can push CDR externally and exact delivery/retry semantics; do not assume from the presence of a configuration parameter alone.
- [ ] Verify phone online/offline or other external event interfaces if required.
### Data semantics

- [ ] Confirm CDR serial-number uniqueness scope: per VOS instance, per softswitch or global.
- [ ] Confirm timestamp precision/timezone for begin/end/connect times.
- [ ] Confirm money units/precision and currency semantics.
- [ ] Confirm account balance sign/overdraft behavior.
- [ ] Confirm mapping vs routing gateway identifiers and uniqueness.
- [ ] Confirm CDR fields used to calculate customer charge, carrier expense and margin.
### Safety

- [ ] Create a no-production-write policy until each mutation passes contract tests.
- [ ] Define read-only VOS credentials for discovery where possible.
- [ ] Document every direct DB access currently used by existing operations; classify as read/write and risk.
- [ ] Identify unsupported portal requirements rather than inventing an interface.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] Create no production schema dependency yet except a discovery repository for captured schemas if useful.

## API work

- [ ] Draft `VOSAdapter` interface; no public endpoints should bypass capability checks.

## UI/product work

- [ ] No production UI required. Optional internal `/admin/integrations/vos-capabilities` prototype for displaying verified capabilities.

## Testing and verification

- [ ] Contract tests against non-production VOS for every verified read operation.
- [ ] Mutation tests with before/after state and cleanup.
- [ ] Timeout/network interruption tests.
- [ ] Duplicate/retry test for external CDR delivery if supported.

## Acceptance criteria / exit gate

- [ ] 100% of Phase-1 planned VOS operations are either VERIFIED or explicitly UNSUPPORTED/DEFERRED.
- [ ] No required write is implemented using an assumed undocumented database update.
- [ ] Sample payloads and field mappings are stored in project docs/test fixtures with secrets redacted.
- [ ] Measured traffic baseline is available for capacity planning.

## Primary risks

- Vendor/version-specific interfaces may differ from manual.
- Some GUI functions may not have external write APIs.
- CDR push/retry semantics may be incomplete and need a safe polling/import fallback.

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

- `07_REFERENCES/SOURCE_REFERENCE_MAP.md`
- `03_ENGINEERING/VOS_ADAPTER_CONTRACT.md`
- `06_PROJECT_MANAGEMENT/DECISIONS_AND_OPEN_QUESTIONS.md`

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
