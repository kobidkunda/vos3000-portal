# Phase 06 — Admin Portal Core — Customers, CDR, Gateways, Operations

## Objective

Deliver the first operational admin experience using verified read data and tightly controlled writes.

## Dependencies

Phase 02/03 and Phase 05 for historical CDR.

## Deliverables

- [ ] Admin dashboard/NOC base.
- [ ] Customer directory/detail.
- [ ] CDR explorer/detail.
- [ ] Gateway read pages.
- [ ] Live integration health.
- [ ] Admin audit and support links.

## Detailed workstreams

### Dashboard

- [ ] Implement KPI cards from aggregate/live sources.
- [ ] Show data source freshness.
- [ ] Link every KPI to filtered detail.
- [ ] Avoid expensive raw CDR scans for home dashboard.
### Customers

- [ ] Directory with search/filter/pagination.
- [ ] Customer 360 detail with account mapping/balance/gateways/CDR.
- [ ] Create/edit/suspend only for operations VERIFIED in Phase 00.
- [ ] Display unsupported actions as unavailable, not silently simulated.
### CDR

- [ ] Full admin filters and column chooser.
- [ ] Detail page with customer charge, carrier expense/margin only if semantics verified.
- [ ] Call analysis deep-link only if VOS interface verified.
- [ ] Async export initiation.
### Gateways

- [ ] Mapping/routing/online/network/status views.
- [ ] Current sessions/line limit, ASR/ACD/CPS, registered IP and timestamps.
- [ ] Configuration writes hidden behind capability and permission flags.
### Operations

- [ ] Integration health.
- [ ] Alarm read view.
- [ ] VOS system log read view if available.
- [ ] Support-ticket context links.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] Saved admin views/filters, optional dashboard preferences.
- [ ] No duplicate authoritative gateway config unless used as a managed desired-state layer later.

## API work

- [ ] Admin scoped endpoints mirroring product design.
- [ ] Apply permission checks at service layer.

## UI/product work

- [ ] Implement pages prioritized from `VOS3000_ADMIN_PORTAL_PRODUCT_DESIGN.md` Phase-1 set.

## Testing and verification

- [ ] E2E admin flows.
- [ ] Permission role matrix.
- [ ] Large CDR table behavior.
- [ ] Degraded VOS/ClickHouse states.
- [ ] Mutation audit tests.

## Acceptance criteria / exit gate

- [ ] NOC/admin can locate customer -> gateway -> current/historical calls quickly.
- [ ] Unsupported VOS writes cannot be triggered.
- [ ] Every admin mutation is audited.
- [ ] Dashboard does not directly depend on raw billion-row scans.

## Primary risks

- Feature pressure may bypass capability gating.
- Admin pages can expose secrets/sensitive routing data if projections are not reviewed.

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
- `06_PROJECT_MANAGEMENT/ACCEPTANCE_CRITERIA.md`

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
