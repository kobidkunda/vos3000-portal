# VOS3000 Portal — Implementation Planning Pack

## Purpose

This pack turns the Admin Portal and Customer Self-Service Portal product specifications into an executable engineering plan for a production system capable of handling **millions of CDR records** while keeping VOS3000 as the telephony/softswitch/billing engine.

## Chosen production stack

Next.js + TypeScript + Tailwind + shadcn/ui; NestJS on Fastify; PostgreSQL 18 + PgBouncer; ClickHouse; Redis; Redpanda; MinIO/S3-compatible object storage; Nginx; Prometheus + Grafana + Loki; Docker Compose initially on Ubuntu, with Kubernetes deferred until operational need is proven.

## Source-vs-design labels

This pack deliberately separates what is documented by the uploaded VOS3000 manual from what is our portal architecture:

- **[VOS-SOURCE]** — capability/field/function is documented in the supplied VOS3000 V2.1.8 manual.
- **[PORTAL-DESIGN]** — our recommended architecture or product behavior.
- **[VERIFY-VOS-API]** — VOS feature exists in the manual, but the exact supported programmatic read/write interface is not proven by the manual and must be verified against the installed VOS build/API documentation before implementation.
- **[GO-LIVE-GATE]** — cannot be skipped before production.

## Non-negotiable architectural rules

1. Browser clients never connect directly to VOS3000.
2. All VOS-specific behavior is isolated behind a `VOS Adapter`.
3. PostgreSQL is the system of record for portal business state, identities, RBAC, payment ledger, configuration mappings and audit data.
4. ClickHouse is the primary analytical store for high-volume CDR/history.
5. Redis stores ephemeral/live state and caches; it is not the source of truth for financial or configuration data.
6. Redpanda buffers CDR/events and decouples VOS ingestion from analytics, webhooks and downstream processing.
7. Financial writes are idempotent and reconciled between payment provider, portal ledger and VOS.
8. No direct VOS DB writes are allowed until explicitly approved after schema/business-logic validation; supported interfaces are preferred.
9. Every customer-facing query is tenant-scoped server-side.
10. High-risk operations are permission-separated, re-authenticated where needed, and audited.
11. Every live/real-time page shows data freshness and degraded-source state.
12. All CDR ingestion is replay-safe and deduplicated.

## Directory map

```text
00_README.md
01_ARCHITECTURE/
  01_SYSTEM_ARCHITECTURE.md
  02_TECH_STACK_DECISIONS.md
  03_DATA_OWNERSHIP_AND_FLOWS.md
  04_SCALE_AND_CAPACITY_PLAN.md
  05_SECURITY_ARCHITECTURE.md
02_PHASES/
  PHASE_00 ... PHASE_13
03_ENGINEERING/
  data models, adapter, events, realtime, payments, reports
04_OPERATIONS/
  deployment, backup/DR, observability, security, incident, capacity
05_TESTING/
  test strategy, load tests, contract tests, reconciliation, UAT
06_PROJECT_MANAGEMENT/
  master TODO, gates, risks, decisions, acceptance criteria
07_REFERENCES/
  original VOS manual + Admin/Client product design files
08_EXAMPLES/
  env, event envelope, API conventions
```

## Recommended execution order

Phase 00 must finish before any code assumes VOS write capabilities.

After Phase 00:

```text
P01 Foundation
    |
P02 Identity/RBAC/Tenancy
    |
P03 VOS Adapter Core
    |
    +--------------------+
    |                    |
P04 CDR Ingestion     P06 Admin Core
    |                    |
P05 CDR Analytics     P07 Client Core
    |                    |
    +---------+----------+
              |
P08 Billing/Payments
P09 Realtime/NOC
P10 Gateways/Rates/Routing
P11 API/Webhooks/Reports
P12 Observability/Security/HA
P13 Migration/Load Test/Go-Live
```

Some phases can overlap after their dependencies are met, but every phase has an explicit exit gate.

## Primary reference files

- `07_REFERENCES/VOS3000_ADMIN_PORTAL_PRODUCT_DESIGN.md`
- `07_REFERENCES/VOS3000_CLIENT_PORTAL_PRODUCT_DESIGN.md`
- `07_REFERENCES/VOS3000_2-1-8-0_2-1-8-05_English_Manual(VOS3000.Com)(1).pdf`
- `07_REFERENCES/SOURCE_REFERENCE_MAP.md`

## Definition of project success

The platform is production-ready only when:

- customers can securely view their own balance, CDR, live calls, gateways, rates, reports and payments;
- admins can manage customers and approved VOS functions through the Portal API;
- CDR ingestion survives downstream outages without data loss;
- duplicate CDR delivery does not create duplicate analytical/financial records;
- tens/hundreds of millions of historical CDRs remain queryable within defined SLOs;
- payment reconciliation has no ambiguous success state;
- every critical write has an audit trail;
- backup and restore have been tested, not merely configured;
- failover/degraded behavior is documented and rehearsed;
- actual VOS API behavior has been contract-tested against the installed version.
