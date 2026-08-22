# AGENTS.md

## Mission
Build and maintain the VOS3000 Admin + Client Portal as a **production telecom platform**, not a demo.

Primary goals:
- correctness
- tenant isolation
- safe billing
- reliable CDR handling
- realtime observability
- predictable UI

---

## 1. Read Before Coding

Always check:
- `DESIGN.md`
- Admin portal product spec
- Client portal product spec
- implementation plan / phase file for the task
- VOS3000 manual/reference notes for VOS-specific behavior

Do not invent VOS fields, APIs or write operations.

If VOS behavior is not verified, mark it `VERIFY-API` and fail safely.

---

## 2. Architecture Rules

Use:
```text
Next.js + TypeScript
NestJS/Fastify
PostgreSQL
ClickHouse
Redis
Redpanda
```

Responsibilities:
```text
PostgreSQL = users, customers, config, billing, payments, RBAC
ClickHouse = CDR/history/analytics
Redis      = live state/cache/rate limits
Redpanda   = CDR/events/async pipeline
```

Frontend must never call VOS directly.

All VOS access goes through the VOS Adapter.

---

## 3. Security

Mandatory:
- server-side tenant scoping on every customer request
- RBAC on every admin mutation
- no secrets in logs
- no raw VOS credentials in frontend
- no carrier/internal fields in client responses unless explicitly allowed
- financial and destructive actions require audit records
- high-risk actions require confirmation/re-auth where configured

Never trust:
- customer IDs from browser
- VOS account IDs from browser
- gateway IDs without ownership validation
- payment success from redirect/callback UI alone

---

## 4. Money

Payments must be idempotent.

Flow:
```text
provider webhook
-> verify signature
-> record event
-> credit once
-> record VOS result
-> reconcile
```

Never:
- double-credit
- mark complete before provider verification
- hide reconciliation failures

Use decimal-safe money handling. No floating-point arithmetic for billing.

---

## 5. CDR

CDR volume is large.

Rules:
- raw CDR goes to ClickHouse
- do not use PostgreSQL as primary CDR store
- ingest asynchronously through Redpanda
- deduplicate using verified VOS identity fields
- use server-side filters
- use cursor pagination
- large exports are background jobs
- dashboards use rollups/materialized aggregates where appropriate

Never make a browser query millions of rows directly.

---

## 6. Realtime

Use Redis + WebSocket/SSE for:
- live calls
- gateway status
- CPS
- channel usage
- NOC state

Realtime UI must always show:
- connection state
- last update time
- degraded/stale state

---

## 7. API

Rules:
- version under `/api/v1`
- typed request/response DTOs
- validate all input
- structured errors
- include `request_id`
- OpenAPI for public/admin APIs
- no breaking changes without versioning

Prefer:
```text
GET    read
POST   create/action
PATCH  partial update
DELETE delete/revoke
```

---

## 8. Database

PostgreSQL:
- migrations only
- foreign keys where appropriate
- transactions for money/config changes
- indexes based on real query patterns
- no schema changes from application startup

ClickHouse:
- design partition/order keys around actual CDR queries
- batch inserts
- avoid row-by-row writes
- use retention/TTL intentionally
- create rollups for repeated dashboard queries

---

## 9. UI

Follow `DESIGN.md`.

Required:
- loading
- empty
- error
- permission denied
- degraded integration
- success state

Tables:
- server-side pagination/filter/sort
- 13px dense text
- right-align numeric values
- mono for technical IDs
- status badge + text

Never build a page that only works with happy-path data.

---

## 10. Logging & Audit

Application logs:
- structured JSON
- request_id
- user/customer context where safe
- no passwords/tokens/SIP secrets/payment secrets

Audit log every mutation involving:
- users/roles
- balance/payment
- rate changes
- gateway changes
- IP changes
- account enable/disable
- call disconnect
- API keys
- system settings

Store before/after values where safe.

---

## 11. Testing

Every feature needs:
- unit tests for business logic
- API validation tests
- authorization tests
- tenant-isolation tests
- failure-path tests

Critical flows additionally need integration tests:
- payment
- VOS write
- CDR ingestion
- gateway update
- live-call scope
- rate apply
- API key/webhook

For tenant tests, always prove Customer A cannot read Customer B data.

---

## 12. Error Handling

Fail closed.

If VOS/Redis/ClickHouse/Redpanda is unavailable:
- do not fabricate data
- return clear degraded/error state
- preserve queued work when possible
- expose actionable logs/metrics
- never silently drop CDR/payment events

---

## 13. Performance

Before adding complexity:
1. measure
2. inspect query
3. add correct index/rollup/cache
4. load test

Do not introduce new infrastructure without a measured need.

---

## 14. Code Quality

- TypeScript strict mode
- no `any` unless justified
- small modules
- explicit domain boundaries
- no duplicated VOS logic outside adapter
- no hard-coded environment values
- no secrets in repository
- clear naming over clever abstractions

---

## 15. Definition of Done

A task is complete only when:
- feature works
- permissions are correct
- tenant isolation tested
- error/degraded states exist
- audit/logging added where required
- tests pass
- docs/API schema updated
- UI follows `DESIGN.md`
- VOS-specific behavior is verified, not guessed
