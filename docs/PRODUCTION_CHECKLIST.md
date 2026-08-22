# Production Checklist

## Required configuration
- Set `NODE_ENV=production`, `AUTH_MODE=database`, `DATA_MODE=external`. Production startup rejects demo auth/data modes.
- Provision the first Super Admin in PostgreSQL with a scrypt password hash through an approved bootstrap process; remove/ignore demo credentials.
- Set strong `SESSION_SECRET`, `ENCRYPTION_KEY`, `CDR_INGEST_TOKEN`, and `PAYMENT_CONFIRMATION_TOKEN` using a secret manager.
- Configure `WEB_URL` with only trusted HTTPS portal origins and set `TRUST_PROXY=true` only behind a trusted reverse proxy.
- Keep PostgreSQL, ClickHouse, Redis and Redpanda ports private; expose only the reverse proxy/load balancer.

## Authentication & authorization
- Enroll MFA for privileged admin users; `/api/v1/me/mfa` requires an interactive session.
- Verify role assignments and dynamic permission constraints.
- Complete tenant-isolation UAT for customer, gateway, CDR, payment, report, API key, webhook and support-ticket identifiers.
- Configure session TTL and rate limits appropriate to the deployment.

## VOS3000 integration

> **Server-side prerequisite:** complete the host runbook in [`VOS3000_SERVER_SETUP.md`](VOS3000_SERVER_SETUP.md)
> — `server.conf` (`7663`/`1205`/`0.0.0.0`), `e_web_access_control` (`0.0.0.0` for `/external/server`), `vos3000`+`tomcat` restart, Tomcat `:7391` JSP API, GUI user `admin` (level 0).

- Verify exact VOS read/write interfaces against the deployed VOS build (90+ JSP endpoints on `http://<vos-host>:7391/external/server/*.jsp` — see `VOS3000_SERVER_SETUP.md` §6).
- Update `config/vos-capabilities.json` only for contract-tested operations.
- Set `VOS_MODE=http` only after contract tests pass (`VOS_HTTP_BASE_URL=http://62.84.182.223:7391`, `VOS_HTTP_USERNAME=admin`).
- Confirm tenant-safe semantics before enabling customer-facing VOS reads/writes.
- Leave unsupported operations disabled; do not write directly to VOS database tables as a shortcut.

## Payments
- Implement/configure a verified payment-provider adapter behind `PAYMENT_CREATE_WEBHOOK`.
- Verify provider webhook signature/authorization before calling the internal payment-confirmation endpoint.
- Test duplicate confirmation, provider failure, VOS credit failure and reconciliation flows.
- Confirm currency/amount handling and provider external-reference uniqueness.

## CDR / analytics
- Restrict `/api/v1/internal/cdr` by private network plus strong token; use mTLS/API gateway controls where available.
- Load-test CDR ingest at expected peak CDR/s and verify Redpanda consumer lag.
- Verify ClickHouse retention, backup and restore.
- Confirm customer/VOS-account mapping before accepting production CDR traffic.

## Webhooks / outbound delivery
- Require HTTPS endpoints in production.
- Maintain outbound egress controls/firewalling in addition to application SSRF checks.
- Receivers must deduplicate using `x-vos-event-id`; webhook delivery is intentionally at-least-once.
- Configure and test retry, timeout and maximum-attempt policy.
- Configure report/password-reset delivery adapters on trusted operator-controlled URLs.

## Infrastructure
- Terminate TLS at Nginx/load balancer and enable HSTS there after HTTPS is confirmed.
- Configure PostgreSQL backups/PITR and test restore.
- Use multi-node Redpanda replication for production; the included single-broker Compose topology is development/reference only.
- Configure ClickHouse replication/backup according to SLO and retention requirements.
- Configure Redis persistence/HA if realtime state availability requires it.
- Store report exports on durable object storage or a managed shared filesystem for multi-instance deployments.

## Runtime validation before go-live
- Run `npm ci` (after generating/committing a lockfile), `npm run build`, `npm test`, and `npm run validate`.
- Run Docker/production smoke tests against PostgreSQL, ClickHouse, Redis and Redpanda.
- Run VOS contract tests against the actual deployed VOS instance.
- Run security testing for RBAC/tenant isolation, CSRF/origin checks, webhook SSRF, secret leakage and download authorization.
- Run load tests for CDR ingest, dashboard queries, large exports, report scheduling and realtime SSE fan-out.
