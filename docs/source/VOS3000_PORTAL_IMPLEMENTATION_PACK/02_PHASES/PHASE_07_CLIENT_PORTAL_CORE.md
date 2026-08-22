# Phase 07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates

## Objective

Launch secure customer visibility while strictly redacting carrier/internal data.

## Dependencies

Phase 02/03/05 and read-only gateway/rate adapters.

## Deliverables

- [ ] Client dashboard.
- [ ] Balance view.
- [ ] CDR/recent CDR/detail.
- [ ] Live calls read.
- [ ] My Gateways/details/network.
- [ ] Rate sheet/lookup.
- [ ] Support.

## Detailed workstreams

### Customer projection

- [ ] Define explicit DTO per client endpoint; do not reuse admin DTO blindly.
- [ ] Hide routing gateway/carrier cost/internal VOS identities unless product policy grants.
- [ ] Hide reusable secrets.
- [ ] Enforce customer ownership by server-side mapping.
### Dashboard

- [ ] Balance, today/month spend, active calls, channel use, CPS, ASR, ACD, PDD, gateway status.
- [ ] Show freshness and degraded labels.
- [ ] Use ClickHouse rollups + Redis live state + VOS/PG balance mapping.
### CDR

- [ ] Customer filters and saved views.
- [ ] Detail with customer-safe fields.
- [ ] Report-problem action pre-attaches safe CDR ID/context.
- [ ] Async export jobs.
### Gateways

- [ ] List/detail with configured/registered IP, line limit, current calls, CPS, ASR/ACD and network latency/loss.
- [ ] No write action until Phase 10 verified/self-service policy approved.
### Rates

- [ ] Read assigned customer rate sheet.
- [ ] Rate lookup using normalized number and longest-match behavior.
- [ ] Never expose carrier cost/margin.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] Customer preferences, saved CDR filters, support tickets.
- [ ] Rate publication metadata if implemented.

## API work

- [ ] Customer endpoints from client product design, all tenant-scoped.

## UI/product work

- [ ] Implement Phase-1 client pages from reference product design.

## Testing and verification

- [ ] Cross-tenant E2E.
- [ ] Admin-only field redaction tests.
- [ ] Mobile table/card behavior.
- [ ] Freshness/degraded state tests.
- [ ] Export authorization tests.

## Acceptance criteria / exit gate

- [ ] Customer can self-serve core call/balance/gateway/rate information.
- [ ] API responses contain no carrier cost/internal fields by default.
- [ ] ID tampering cannot cross tenants.
- [ ] Customer support ticket can reference a safe CDR identifier.

## Primary risks

- Reusing admin serializers may leak sensitive fields.
- Balance freshness semantics must be explicit.

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

- `07_REFERENCES/VOS3000_CLIENT_PORTAL_PRODUCT_DESIGN.md`
- `01_ARCHITECTURE/05_SECURITY_ARCHITECTURE.md`

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
