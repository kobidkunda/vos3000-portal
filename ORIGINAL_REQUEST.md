# Original User Request

## 2026-08-23T03:10:00+05:30

Implement robust, 100% comprehensive error handling across all frontend forms in the application. Ensure every form renders a standardized, accessible error header alert banner displaying API and validation errors with structured breakdown, auto-scrolling into view upon failure, and synchronizing with inline field validation states.

Working directory: `/Volumes/AppProjectStorage/application/project/VOS3000_FULL_APPLICATION_REVIEWED`
Integrity mode: development

## Requirements

### R1. Standardized Form Header Error Component & Contract
Every interactive form across the frontend (Admin & Client portals, Auth/Login/MFA/Reset/Registration flows, CRUD modals, rate editors, finance actions, settings, and support ticket forms) must incorporate a top-level error header alert banner. The header must display the primary failure message alongside an itemized list of any field-specific validation issues returned by the server or client-side checks.

### R2. 100% Form Audit & Error Interception
Audit every single form element across `apps/web/` ensuring no submission path silently swallows exceptions, ignores error status codes (4xx/5xx), or relies exclusively on console logs or toasts. Every submission failure must surface directly in the form's header error banner.

### R3. Dual-Level Validation & User Experience Flow
When form submission fails, the interface must auto-scroll the error banner into view and highlight invalid fields. As users edit the corresponding fields or initiate a new submission, invalid field markers and obsolete error messages must clear predictably.

### R4. Verification & Non-Regression
Automated test suite and validation scripts must verify that every audited form successfully captures errors, renders the header banner on invalid inputs or failed API responses, and continues to execute valid submissions cleanly.

## Acceptance Criteria

### Error Header Standard & Coverage
- [ ] 100% of interactive `<form>` components in `apps/web/` contain the standardized header error alert banner.
- [ ] All forms in Auth (Login, Register, MFA Challenge, MFA Setup, Forgot/Reset Password), Portal Archetypes (Detail, EditorForm, FinanceAction, RateEditor, RateGroups, MappingGateways, RoutingGateways, SupportTickets, Settings, etc.), and Modals handle failures via the header banner.
- [ ] Server error payloads (`message`, `errors`, `detail`, or HTTP status fallback) and network disconnects are parsed and presented legibly in the banner.

### Interaction & Accessibility
- [ ] Form submission failure triggers auto-scroll / focus to the top header error banner.
- [ ] Field-level invalid state highlights are displayed concurrently with the header summary.
- [ ] Error banner state resets or updates appropriately upon retry or input modification.

### Code Quality & Build
- [ ] `npm run build` in `apps/web` succeeds without TypeScript or React compiler errors.
- [ ] Automated test suite passes with zero regressions.
