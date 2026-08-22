# Phase 10 — Gateway, Rate, Package & Routing Configuration Workflows

## Objective

Enable controlled self-service/admin configuration only for verified VOS mutations with preview and rollback discipline.

## Dependencies

Phase 00 VERIFIED writes; Phase 03; Phase 02 permissions.

## Deliverables

- [ ] Gateway CRUD/IP/capacity workflows.
- [ ] Rate groups/editor/import/versioning.
- [ ] Package management.
- [ ] Routing analysis tooling.
- [ ] Number/list management as supported.
- [ ] Change approval/audit.

## Detailed workstreams

### Gateway change management

- [ ] Create desired change object before applying to VOS.
- [ ] Validate IP/ports/capacity/routing references.
- [ ] Show before/after diff.
- [ ] Apply through adapter.
- [ ] Read-back actual state.
- [ ] Mark failed/partial changes for operator review.
### Client IP self-service

- [ ] Entitlement per customer.
- [ ] Re-auth/MFA.
- [ ] Validate IP format and duplicate conflicts.
- [ ] Optional admin approval.
- [ ] Post-change registration/network check.
- [ ] Rollback path if connectivity fails and VOS supports.
### Rates

- [ ] Import CSV/XLSX to staging tables.
- [ ] Normalize prefix/rate types.
- [ ] Validate duplicates/overlap.
- [ ] Dry-run changes.
- [ ] Version rate publication in PostgreSQL.
- [ ] Apply verified batch/change mechanism to VOS.
- [ ] Read back sample/full verification.
- [ ] Customer rate change history from portal versions.
### Packages

- [ ] Manage package metadata, period rates, free duration and assignments only where supported.
- [ ] Validate effective/invalid dates and priority.
### Routing analysis

- [ ] Expose VOS simulation inputs/outputs to admins.
- [ ] Use as pre-change check for representative numbers.
- [ ] Store test cases for critical routes.
### Number management

- [ ] Area info, number transform, black/white lists, system whitelist and dynamic blacklist only after interface verification.
- [ ] High-impact list edits require import preview and audit.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] configuration_changes, approvals, rate_versions, rate_import_jobs, rate_change_items, customer_rate_publications.

## API work

- [ ] Admin gateway/rate/package/routing endpoints; client gateway IP endpoints if enabled.

## UI/product work

- [ ] Admin gateway/rate/package/routing pages; client Gateway IP and Rate History.

## Testing and verification

- [ ] Golden route tests before/after rate deployment.
- [ ] Gateway change read-back.
- [ ] Failed partial apply.
- [ ] Rate import 1M-row stress if expected.
- [ ] Permission/approval tests.
- [ ] Rollback drills.

## Acceptance criteria / exit gate

- [ ] Every write is capability-gated and read-back verified where possible.
- [ ] Rate deployment has version, diff, actor and audit.
- [ ] Client cannot alter gateway outside entitlement.
- [ ] Representative routing tests pass after change.

## Primary risks

- Bulk rate changes can have large financial impact.
- VOS may not support atomic rollback.
- Routing behavior depends on multiple VOS settings; simulation must be validated.

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

- `07_REFERENCES/VOS3000_ADMIN_PORTAL_PRODUCT_DESIGN.md`
- `03_ENGINEERING/VOS_ADAPTER_CONTRACT.md`
- `06_PROJECT_MANAGEMENT/RISK_REGISTER.md`

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
