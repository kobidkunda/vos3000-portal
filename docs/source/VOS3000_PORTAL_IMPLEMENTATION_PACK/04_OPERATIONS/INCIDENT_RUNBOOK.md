# Incident Runbook

## Severity model

### SEV-1
Examples:
- widespread inability to place/manage calls due to portal change;
- payment double-credit risk;
- cross-tenant data exposure;
- CDR loss with no replay path;
- primary business database unavailable.

### SEV-2
- major portal outage;
- significant CDR lag but buffered;
- payment credit delays with no financial loss;
- multiple gateway/status monitoring failures.

### SEV-3
- isolated customer feature failure;
- report/webhook degradation.

## Incident roles

- Incident commander
- Technical lead
- Communications owner
- Scribe/timeline

## First 10 minutes

1. Declare incident and severity.
2. Stop risky deployments/changes.
3. Identify affected plane: VOS, API, PG, ClickHouse, Redis, Redpanda, provider.
4. Preserve evidence/log/request IDs.
5. If financial mutation risk exists, disable relevant feature flag.
6. If cross-tenant/security risk exists, disable affected endpoint immediately.
7. Communicate impact/status.

## Common scenarios

### CDR ingest stopped
- check VOS source last send;
- check ingest health;
- check Redpanda producer;
- determine whether VOS retries/backlog exists;
- do not restart blindly if dedupe is not verified;
- recover source -> queue -> consumer;
- reconcile counts by period.

### ClickHouse unavailable
- keep ingest publishing to Redpanda if capacity allows;
- stop/slow consumers;
- protect disk retention;
- restore CH;
- resume consumer;
- monitor lag/merge pressure.

### Redpanda unavailable
- understand whether VOS can retry and for how long;
- prioritize restoring queue;
- if temporary fallback exists, ensure it preserves original event IDs and ordering semantics.

### Payment outcome unknown
- block blind retry;
- inspect provider event;
- inspect portal ledger;
- query VOS payment record/balance/reference;
- resolve via reconciliation workflow.

### Redis lost
- restart/recover;
- rebuild live calls/gateway state from VOS;
- invalidate misleading UI until collector freshness restored.

### Cross-tenant exposure
- disable affected endpoint;
- preserve logs;
- scope affected requests/users;
- security incident process;
- fix + negative regression test before re-enable.

## After incident

- root cause analysis;
- timeline;
- customer/business impact;
- data reconciliation;
- corrective actions with owners;
- runbook/test improvements.
