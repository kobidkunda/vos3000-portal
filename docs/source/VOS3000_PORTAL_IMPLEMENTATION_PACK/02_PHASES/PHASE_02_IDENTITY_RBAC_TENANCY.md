# Phase 02 — Identity, RBAC, Tenant Isolation & Audit Foundation

## Objective

Implement the security model before customer/admin business pages are built.

## Dependencies

Phase 01.

## Deliverables

- [ ] Admin/client authentication.
- [ ] MFA foundation.
- [ ] Server-side RBAC.
- [ ] Tenant/customer scoping primitives.
- [ ] Append-only portal audit log.
- [ ] Session/device management.

## Detailed workstreams

### Identity

- [ ] Create user, credential, session and MFA models.
- [ ] Hash passwords with Argon2id using reviewed parameters.
- [ ] Use secure HTTP-only SameSite cookies.
- [ ] Implement login throttling and failed-attempt telemetry.
- [ ] Implement password reset with expiring one-time token.
- [ ] Create session revocation and logout-all.
### RBAC

- [ ] Implement roles and permissions as data, not hardcoded page checks only.
- [ ] Create Super Admin, NOC, Billing, Support, Commercial, Security Admin, Read Only.
- [ ] Create client Owner, Billing, Technical/NOC, API Manager, Read Only.
- [ ] Add service-layer `authorize(action, resource, scope)` helper.
### Tenant isolation

- [ ] Create `tenants/customers` mapping and `tenant_id` on customer-owned portal records.
- [ ] Require tenant scope at repository/service boundaries.
- [ ] Create anti-IDOR negative test suite.
- [ ] Never accept tenant_id from a customer body as authority.
### Audit

- [ ] Capture actor, role, tenant, request ID, source IP, action, resource, before/after, result, time.
- [ ] Redact secrets from before/after.
- [ ] Make audit records immutable to normal app users.
- [ ] Add correlation to VOS operation result/reference.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] users, password_credentials, mfa_methods, sessions, roles, permissions, role_permissions, user_roles, tenants/customers, customer_users, audit_logs.

## API work

- [ ] `/auth/*`, `/me`, `/me/sessions`, admin security users/roles endpoints.
- [ ] Middleware/guards for authentication + authorization + tenant scope.

## UI/product work

- [ ] Admin/client login, MFA, forgot/reset password, sessions, admin users/roles, client team skeleton.

## Testing and verification

- [ ] Auth unit/integration tests.
- [ ] Session fixation/revocation tests.
- [ ] RBAC matrix tests.
- [ ] Cross-tenant ID tampering tests.
- [ ] Audit redaction tests.

## Acceptance criteria / exit gate

- [ ] No customer endpoint returns data outside authenticated tenant in negative tests.
- [ ] Every mutation creates an audit record.
- [ ] Admin high-risk permission names exist even before those features are implemented.
- [ ] MFA works for admin test users.

## Primary risks

- Over-broad admin permissions can undermine later safety.
- Tenant scope omissions in ad-hoc queries; enforce repository patterns and tests.

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

- `01_ARCHITECTURE/05_SECURITY_ARCHITECTURE.md`
- `03_ENGINEERING/API_CONTRACT_GUIDELINES.md`
- `05_TESTING/TEST_STRATEGY.md`

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
