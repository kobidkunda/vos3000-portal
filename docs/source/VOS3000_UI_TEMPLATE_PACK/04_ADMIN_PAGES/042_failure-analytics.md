# 042 — Failure Analytics

## Template Metadata

| Field | Value |
|---|---|
| Side | **Admin** |
| Product group | **CDR & Call Analytics** |
| Route | `/admin/analytics/failures` |
| Page archetype | **ANALYTICS_REPORT** |
| Data mode | **analytical** |
| Primary implementation phase | **P06 — Admin Portal Core — Customers, CDR, Gateways, Operations** |
| Source status | Product-spec derived; VOS-specific behavior must follow the basis below |

## Goal

Turn termination reasons into actionable operations intelligence.

## Product Requirements — Source of Truth

- Failure distribution
- Trend by hour/day
- Breakdown by customer/carrier/gateway/destination
- Top termination reasons
- Network vs trunk vs callee-reject vs caller-abandon groupings
- Drill-through to CDR
- Threshold alerts

### Requirement Traceability

| ID | Requirement | Status |
|---|---|---|
| F01 | Failure distribution | Required |
| F02 | Trend by hour/day | Required |
| F03 | Breakdown by customer/carrier/gateway/destination | Required |
| F04 | Top termination reasons | Required |
| F05 | Network vs trunk vs callee-reject vs caller-abandon groupings | Required |
| F06 | Drill-through to CDR | Required |
| F07 | Threshold alerts | Required |

## VOS / Product Basis

VOS records termination reason and gateway status outcome categories; analytics are [HYBRID].

## Primary Portal API

- `GET /api/v1/admin/analytics/failures`

### API Rules

- Frontend calls the Portal API only; never VOS directly.
- Validate DTOs on both client boundary and server boundary.
- Every error response must contain a stable `request_id`.
- Authentication, tenant scope and RBAC are checked before resource lookup where safe to avoid information leakage.
- A page must not be marked complete until its API contract is implemented, documented and tested.

## Access & Permission Template

- Authenticated admin/operator.
- Route and action authorization enforced server-side through RBAC.
- Customer-scoped admin roles must be constrained to explicitly assigned tenants/resources.

## Canonical Layout

```text
[Page header + date range]
├─ filters / compare controls
├─ KPI strip
├─ charts / distributions
├─ detail table
└─ async export / schedule actions
```

## Required Component Composition

- `PageHeader`
- `TimeRangeControl`
- `FilterBar`
- `KpiGrid`
- `ChartCard`
- `DataTable`
- `ExportAction`

### Shared Component Rules

- Use design tokens from `00_FOUNDATION/DESIGN_TOKENS.md`; do not hard-code ad-hoc colors.
- Tables use 13px Inter, technical IDs use IBM Plex Mono, numeric values use tabular figures.
- Primary action uses Signal Blue; Cyan is reserved for realtime/network meaning.
- Status is always color + text/icon, never color alone.
- Dangerous actions are not placed directly beside ordinary primary actions without separation.
- Display source/refresh timestamp on realtime or synchronized data.

## Page Header Template

**Left**
- Page title: **Failure Analytics**
- One-line purpose/context.
- Breadcrumb when the route is nested under an entity.

**Right**
- Primary action only when this page has a meaningful create/apply operation.
- Secondary actions such as refresh/export/help use secondary/ghost treatment.
- Live pages show connection state + last update.

## Data / UI Sections

Use the source requirements above to produce the visible sections. Implementation order:

1. **Context/summary** — identify the resource, customer, period or system scope.
2. **Primary working area** — table, form, editor, chart or realtime monitor according to the archetype.
3. **Secondary detail** — diagnostics, related records, history, status or audit context only when supported.
4. **Action area** — explicit, permission-guarded actions.
5. **Supportability** — request/reference IDs, last update and relevant links for troubleshooting.

Do not add VOS-specific fields that are absent from the source specification without first updating the product spec.

## Filters / Search Behavior

- Search is debounced only for safe read queries; form submits remain explicit.
- Filter state should be URL-addressable for list/report pages when practical.
- Date/time filters use the user's selected timezone while APIs use an unambiguous timestamp format.
- Clear-all must return to a known default scope.
- Do not issue an unbounded query when filters are empty on large datasets.
- Persist saved views only when the product/API explicitly supports them.

## Actions & Mutation Pattern

For every mutation supported on this page:

1. Check permission before rendering the enabled control.
2. Revalidate permission on the server.
3. Validate input.
4. Show impact/before-after preview for financial, routing, rate, gateway, security or system changes.
5. Require confirmation for destructive/high-risk actions.
6. Send idempotency key where retry could duplicate effects.
7. Execute through the appropriate service/VOS Adapter.
8. Record audit event.
9. Reconcile/refetch canonical state.
10. Show success/failure with `request_id`.

If the source lists only read APIs, do not invent a mutation.

## Required UX States

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

Additional state rules:
- **Stale:** show last successful refresh time; never label stale data as live.
- **Partial:** render available sections and identify the unavailable dependency.
- **Forbidden:** do not render privileged values before permission resolution.
- **Not found:** distinguish from forbidden without leaking cross-tenant existence.
- **Retry:** safe read operations may retry; money/config writes must not blind-retry without idempotency.

## Responsive Rules

- Desktop is the canonical operating layout.
- At <1024px, secondary panels stack below the primary content.
- At <768px, tables use horizontal scroll or priority-column/card transformation; never hide critical identifiers/status without an alternate view.
- Primary actions remain reachable without horizontal scrolling.
- Touch targets are at least 40px; prefer 44px on mobile.

## Accessibility

- WCAG AA contrast minimum.
- Full keyboard path through filters, tables, forms, tabs, modals and actions.
- Visible focus ring.
- Every icon-only control has accessible name/tooltips.
- Form errors are bound to fields and summarized when the form is long.
- Live updates use non-disruptive announcements; do not continuously steal screen-reader focus.
- Charts have textual/table equivalents for critical values.

## Performance & Scale

- Do not block first render on noncritical secondary widgets.
- Show an explicit source timestamp for data that may be cached or synchronized.
- Use server-side pagination/filter/sort for large datasets.
- Never fetch unbounded CDR/report rows to the browser.
- Large exports are background jobs with downloadable artifacts.
- Historical CDR/analytics reads are served from ClickHouse/rollups, not PostgreSQL.

## Security / Data Redaction

- Authenticated admin/operator.
- Route and action authorization enforced server-side through RBAC.
- Customer-scoped admin roles must be constrained to explicitly assigned tenants/resources.
- Secrets are masked/write-only after creation wherever possible.
- All mutations include actor, target, request_id, result and before/after values where safe in the audit log.

## Observability & Telemetry

- `page_viewed` with page=`failure-analytics` and side=`admin`.
- `filter_applied` / `search_submitted` where filtering exists.
- `export_requested` when this page exposes exports.
- Mutation events record success/failure but never include secrets or sensitive payloads.

## Test Template

### Rendering
- [ ] Page renders with representative data.
- [ ] Loading, empty, error, partial/degraded and permission states render correctly.
- [ ] Long values, large numbers and missing optional fields do not break layout.
- [ ] Desktop/tablet/mobile layouts verified.

### Authorization
- [ ] Authorized role can view the page.
- [ ] Unauthorized role receives correct denial.
- [ ] Cross-tenant resource IDs cannot be used to retrieve data.
- [ ] Every mutation is re-authorized server-side.

### API / Data
- [ ] Primary queries match documented API contracts.
- [ ] Validation errors are human-readable.
- [ ] `request_id` is surfaced for failures.
- [ ] Timezone/currency/numeric formatting is deterministic.
- [ ] Realtime/stale behavior tested where applicable.

### Mutation / Safety
- [ ] Confirmation exists for high-risk operations.
- [ ] Audit event is created where required.
- [ ] Retry/idempotency behavior is tested for repeatable requests.
- [ ] UI refetches canonical backend state after mutation.

## Definition of Done

- [ ] All source requirements F01..F07 implemented or explicitly deferred with approval.
- [ ] Correct shell, tokens, typography and component rules used.
- [ ] API contract documented.
- [ ] Permissions and tenant isolation tested.
- [ ] Required UX states implemented.
- [ ] Responsive + accessibility checks pass.
- [ ] Performance behavior is safe at expected data volume.
- [ ] Audit/telemetry implemented where applicable.
- [ ] VOS behavior is verified rather than guessed.
- [ ] Page is linked in the route manifest and navigation where applicable.
