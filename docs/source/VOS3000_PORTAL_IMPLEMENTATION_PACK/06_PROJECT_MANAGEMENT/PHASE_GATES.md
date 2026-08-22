# Phase Gates

## Gate 0 — VOS proof
Required before enabling any write:
- installed build identified;
- exact interface tested;
- before/after read-back works;
- errors/timeouts understood;
- contract test fixture exists;
- capability flag enabled explicitly.

## Gate 1 — foundation
- reproducible local/staging;
- migrations;
- CI;
- health checks;
- secrets separated.

## Gate 2 — security
- authentication;
- RBAC;
- tenant isolation;
- audit;
- negative cross-tenant tests.

## Gate 3 — adapter
- typed normalized contract;
- multi-instance identity;
- capability matrix;
- degraded behavior.

## Gate 4 — CDR ingest
- durable queue;
- replay;
- dedupe;
- DLQ;
- no-loss outage test.

## Gate 5 — analytics
- target-volume query benchmark;
- rollup reconciliation;
- cursor pagination;
- export separation.

## Gate 6/7 — admin/client
- UAT;
- redaction;
- permission tests;
- degraded state.

## Gate 8 — money
- provider signature;
- duplicate protection;
- exact money math;
- VOS unknown-outcome reconciliation;
- daily reconciliation.

## Gate 9 — realtime
- tenant-safe streaming;
- source freshness;
- Redis rebuild;
- VOS polling safe.

## Gate 10 — configuration writes
- preview/diff;
- permission;
- read-back;
- audit;
- rollback/compensation documented.

## Gate 11 — external platform
- API scope/rate limits;
- webhook signing/SSRF controls;
- report resource limits.

## Gate 12 — operations
- SLO dashboards;
- alert runbooks;
- successful restores;
- security review.

## Gate 13 — production
- load headroom;
- data reconciliation;
- UAT signoff;
- cutover/rollback rehearsal;
- no unresolved critical risk.
