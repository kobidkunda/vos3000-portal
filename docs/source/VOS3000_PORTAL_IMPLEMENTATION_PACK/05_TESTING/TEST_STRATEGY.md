# Test Strategy

## Test pyramid by risk

### Unit
- normalization/parsing;
- money arithmetic;
- authorization predicates;
- cursor encoding/decoding;
- webhook signatures;
- adapter error mapping;
- event schema validation.

### Integration
- PostgreSQL repositories/migrations;
- ClickHouse inserts/queries/rollups;
- Redis live state;
- Redpanda producer/consumer;
- MinIO exports;
- payment provider sandbox;
- VOS non-production adapter.

### Contract
Critical because VOS interfaces may be version-specific.
See `VOS_CONTRACT_TESTS.md`.

### E2E
Admin:
- login -> customer -> gateway -> CDR -> live call;
- payment adjustment with permissions;
- rate/gateway write only where supported.

Client:
- login -> balance -> CDR -> gateway -> rate lookup;
- add funds sandbox;
- API key/webhook if in scope.

### Performance
See load plan.

### Security
- cross-tenant/IDOR;
- privilege escalation;
- CSRF;
- auth brute rate-limit;
- secret redaction;
- SSRF webhook targets;
- injection;
- export authorization.

## Required test data

Create fixtures for:
- answered call;
- failed call;
- zero-duration call;
- long call;
- caller/callee rewrite;
- multiple gateways;
- international/domestic/local call type;
- high-precision rate/charge;
- duplicate serial;
- late CDR;
- malformed optional fields;
- two VOS instances with same upstream IDs.

## Environments

Unit: no external dependency where possible.  
Integration: containers.  
Contract: dedicated non-production VOS.  
Staging: production-like stack and sanitized/synthetic traffic.  
Production: only safe smoke/observability checks.

## Release blocking tests

- auth/RBAC;
- tenant isolation;
- payment idempotency/reconciliation;
- CDR dedupe/replay;
- migration;
- VOS mutation contract;
- backup/restore for major stateful changes;
- load test for ingest/schema changes.
