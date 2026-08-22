# Program Acceptance Criteria

## Functional
- Admin and client page scope from the two product-design references is traceable to release phases.
- Core customer CDR, balance, gateways, live calls and rates work.
- Admin can perform only VERIFIED VOS mutations.
- Add-funds reconciles provider, portal ledger and VOS.
- API/webhooks/reports are available according to launch scope.

## Scale
- CDR pipeline passes measured peak + headroom tests.
- Downstream ClickHouse outage does not lose accepted CDR within queue capacity.
- Historical common queries meet approved p95 on production-like volume.
- Large exports are asynchronous and bounded.

## Data correctness
- Duplicate CDR replay does not double-count.
- Daily CDR counts reconcile.
- Payment duplicate/retry cannot double-credit.
- Money and time precision rules are documented/tested.
- Rate deployments read back correctly.

## Security
- Cross-tenant negative tests pass.
- Admin/client DTO redaction passes.
- MFA for privileged admins.
- High-risk actions audited and permission-separated.
- Secrets absent from browser/logs.
- Webhook SSRF controls present.

## Operations
- Health/readiness.
- SLO dashboards.
- Actionable alerts.
- Successful backup restore.
- Incident and rollback runbooks.
- VOS integration degradation visible to users/operators.

## Documentation
- OpenAPI current.
- Event schemas current.
- Environment/deployment runbook current.
- Capability matrix current per VOS build.
- Product page traceability current.
