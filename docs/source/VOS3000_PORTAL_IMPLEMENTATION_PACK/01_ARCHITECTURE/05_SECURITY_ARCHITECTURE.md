# Security Architecture

## Trust boundaries

1. Internet/browser boundary.
2. Portal API boundary.
3. Internal data-service boundary.
4. VOS network boundary.
5. Payment provider/webhook boundary.
6. Customer webhook outbound boundary.

## Authentication

- HTTP-only secure cookies for interactive portal sessions.
- TOTP MFA for admins; optional/plan-based for clients.
- re-authentication for high-risk actions.
- API keys use key ID + secret, secret stored hashed where possible.
- secrets displayed once and never returned by list APIs.

## Authorization

Server-side RBAC plus tenant scope.

Permission examples:
- `customer.read`
- `customer.balance.adjust`
- `cdr.read`
- `cdr.export`
- `call.live.read`
- `call.disconnect`
- `gateway.read`
- `gateway.write`
- `gateway.capacity.write`
- `rate.write`
- `payment.adjust`
- `system.parameter.write`

No UI-only permission enforcement.

## Tenant isolation

Every customer-owned resource has an internal `tenant_id/customer_id`.
All repository/service methods require scope explicitly.
Negative tests must prove that changing IDs/query strings cannot access another tenant.

## VOS credentials

- never exposed to browser;
- stored in encrypted secret storage or protected environment/secret manager;
- separate least-privilege VOS identity per environment where possible;
- rotated and audited.

## High-risk operations

Require:
- explicit permission;
- current MFA/re-auth session where policy demands;
- confirmation;
- mandatory reason/memo;
- immutable audit record;
- before/after diff.

Includes:
- disconnect live call;
- add credit/make-zero;
- change gateway IP/capacity;
- delete/disable account/gateway;
- deploy rate changes;
- edit VOS system parameters.

## Network

- VOS reachable only from adapter/internal network.
- PostgreSQL/ClickHouse/Redis/Redpanda not public.
- TLS for external APIs.
- mTLS/internal TLS considered where network crosses trust zones.
- outbound webhook allow/deny policy to reduce SSRF risk.

## Sensitive logging

Never log:
- plaintext passwords;
- API secrets;
- SIP authentication passwords;
- payment secrets;
- session tokens.

Use request IDs and redacted structured logs.

## Webhook security

Outbound customer webhooks:
- HMAC signature;
- timestamp;
- stable event ID;
- replay protection guidance;
- bounded retry;
- payload redaction.

Inbound payment webhooks:
- provider signature verification;
- idempotency;
- raw-body verification if provider requires it;
- replay/duplicate handling.
