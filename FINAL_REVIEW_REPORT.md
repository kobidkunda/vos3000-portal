# Final Review Report — VOS3000 Portal

Reviewed: 2026-08-21T22:11:45Z

## Result

The second-pass review found and corrected concrete implementation defects and hardening gaps. The repository now passes the available static/structural validation suite with **97/97 Admin pages + 45/45 Client pages = 142/142 product routes** and all declared non-GET product APIs mapped to explicit action schemas.

This report intentionally does **not** claim zero defects or production certification. Dependency-resolved builds, container runtime tests, external payment adapters, and the real deployed VOS3000 interface still require validation in the target environment.

## Corrections made during the review

### Authentication and sessions
- Replaced the broken security test that called nonexistent AuthService methods.
- Fixed login result typing/control-flow around MFA vs completed sessions.
- Removed the full database user object from MFA challenge storage; only the minimum challenge context and encrypted MFA secret reference are stored.
- Bound MFA login tickets to the expected Admin/Client portal side **before** creating a session, preventing wrong-side tickets from creating orphan sessions.
- Database `last_login_at` is now updated after successful MFA login as well as non-MFA login.
- MFA configuration requires an interactive session and is available to both valid Admin and Client sessions.
- Session revocation remains user-bound and server-validated.

### Authorization and tenant isolation
- Client API keys cannot access Admin APIs or interactive browser/session/MFA/invitation/deposit workflows.
- Product APIs pass through a hard role boundary plus optional database permission constraints.
- Customer/gateway/phone VOS writes resolve portal IDs to verified tenant-scoped VOS mappings before invocation.
- Organization-scoped admins are denied VOS operations whose target tenant cannot be proven.
- Client reads remain tenant-scoped server-side.

### Payments and financial safety
- Removed the duplicate payment idempotency-index declaration.
- Payment idempotency is scoped by customer.
- Provider confirmation remains an authenticated internal operation.
- VOS credit is capability-gated; an unverified `creditAccount` operation produces `REQUIRES_RECONCILIATION` rather than a fake success.
- Ledger credit uses a unique payment idempotency key.
- Added `state_updated_at` to payment state tracking.
- Added a worker safety sweep that marks abandoned `CREDITING_VOS` claims as `REQUIRES_RECONCILIATION` after the configured threshold. It **never blind-recredits**, because the prior VOS side effect may be unknown after a crash.

### CDR and high-volume data
- Raw CDR remains ClickHouse-backed; PostgreSQL is not used as the primary CDR store.
- CDR ingestion requires a stable `serial_number`, account mapping and valid timestamp.
- Sender-supplied portal customer IDs are not trusted; PostgreSQL account-to-tenant mapping is authoritative.
- Mapping conflicts/unmapped records are quarantined instead of silently attributed.
- Redpanda consumer offsets are resolved after ClickHouse/invalid-message side effects.
- ClickHouse uses a stable replacement key and `FINAL` in correctness-sensitive views/queries to tolerate replay under at-least-once ingestion.
- Large exports remain bounded asynchronous jobs.

### Webhooks and background work
- Webhook delivery attempts are claimed before network I/O.
- The initial claim now carries a recovery lease, so a worker crash does not permanently strand a delivery attempt.
- Retry delivery uses a stable event ID so receivers can deduplicate at-least-once delivery.
- User-configured webhook targets reject unsupported protocols, embedded credentials, localhost, private/link-local ranges and IPv4-mapped IPv6 private targets.
- Production webhooks require HTTPS.
- Infrastructure egress controls are still recommended because application DNS checks alone cannot fully eliminate DNS-rebinding risk.

### Rate limiting
- Replaced `INCR` + separate `EXPIRE` with an atomic Redis Lua operation so a process crash cannot leave a permanent no-TTL rate-limit key.
- Login/reset/API/IP rate-limit paths share the hardened primitive.

### Frontend and routing
- Fixed browser idempotency-key generation so secure Web Crypto does not hit an invalid TypeScript narrowing path.
- Removed fake `demo` entity IDs from sidebar navigation. Dynamic entity/detail routes are reached through real resource drill-downs rather than fabricated links.
- Sidebar active-route matching reuses the shared route matcher.
- Fixed production health display: the intentionally redacted production health response is no longer mislabeled as `Demo`.
- Same-origin Next.js rewrites remain the default when `NEXT_PUBLIC_API_URL` is empty.

### Deployment and operations
- Added a standalone `docker-compose.production.yml` that does not publish PostgreSQL, ClickHouse, Redis, Redpanda, API or Web directly; only the gateway port is published.
- PostgreSQL 18 uses `/var/lib/postgresql`, matching the current official image layout.
- Production Redis requires authentication.
- Production startup rejects demo auth/data modes and weak/default internal tokens.
- Added production environment reference values and missing worker/provider timeout settings.
- Added Nginx response-security headers without pretending TLS/HSTS can be safely enabled before the real TLS terminator is known.
- Updated production checklist to require real build, container, restore, VOS contract, payment, load and security validation.
- README no longer claims an ORM dependency that is not installed.

## Static checks completed

- `python scripts/validate_application.py` — **PASS**
- 142 total routes — **PASS**
- 97 Admin routes — **PASS**
- 45 Client routes — **PASS**
- 142 detailed page templates present — **PASS**
- all declared non-GET product APIs have action schemas — **PASS**
- JSON parsing for package/config files — **PASS**
- `docker-compose.yml` YAML parse — **PASS**
- `docker-compose.production.yml` YAML parse — **PASS**
- Redpanda topic script shell syntax — **PASS**
- PostgreSQL migration-runner JavaScript syntax — **PASS**
- TypeScript no-resolve syntax/control-flow sanity scan — **PASS** for actionable non-dependency diagnostics
- reviewed security invariants in the validator — **PASS**

## What cannot be certified in this sandbox

### Dependency-resolved build
The environment could not reach the npm registry. There is therefore no honest claim that `npm install`, `npm run build`, `npm test`, or a Next.js/NestJS build against the exact downloaded dependency typings completed here. A lockfile is also not generated in this offline environment.

Required before deployment:

```bash
npm install
npm run build
npm test
npm run validate
```

Then commit the generated `package-lock.json` and switch reproducible CI/deployment installs to `npm ci`.

### Docker/runtime integration
YAML and scripts were statically parsed, but the complete container stack was not started against real services in this sandbox. Run the production compose stack in staging and verify health, migrations, persistence, restart recovery, backups and restores.

### Real VOS3000 integration
The supplied VOS3000 manual supports the product-domain behavior, but it does not establish a complete universal REST CRUD contract for every legacy operation. `VOS_MODE=http` therefore stays fail-closed behind `config/vos-capabilities.json`. Every enabled VOS operation must be contract-tested against the exact deployed VOS3000 build before production enablement.

### Payment providers / email / report delivery
Provider adapters and callbacks require target-provider signature/semantic tests. The internal generic confirmation token is an adapter boundary, not proof that any specific payment provider has been integrated correctly.

### Security/load testing
Run SAST/dependency audit, authenticated tenant-isolation tests, API-key abuse tests, SSRF/egress tests, high-volume CDR ingest tests, ClickHouse query/load tests, report limits and payment/reconciliation failure injection in staging.

## Deployment decision

**Suitable as a reviewed implementation baseline and staging candidate. Not yet certified for live-money/live-VOS production until the environment-specific gates above pass.**
