# Master Implementation Plan

## Goal

Build the VOS3000-backed Admin and Customer portals on a production stack that separates transactional state, high-volume CDR analytics, live state and durable events.

## Stack

Next.js + TypeScript + Tailwind + shadcn/ui; NestJS on Fastify; PostgreSQL 18 + PgBouncer; ClickHouse; Redis; Redpanda; MinIO/S3-compatible object storage; Nginx; Prometheus + Grafana + Loki; Docker Compose initially on Ubuntu, with Kubernetes deferred until operational need is proven.

## Critical path

```text
P00 Verify VOS -> P01 Foundation -> P02 Security/Tenancy -> P03 VOS Adapter
                                                |
                    +---------------------------+---------------------------+
                    |                                                       |
             P04 CDR Ingest                                           P06 Admin Core
                    |                                                       |
             P05 Analytics                                            P07 Client Core
                    +---------------------------+---------------------------+
                                                |
                                  P08 Payments / P09 Realtime
                                                |
                                   P10 Config / Rates / Routing
                                                |
                                    P11 API / Webhooks / Reports
                                                |
                                      P12 Ops / Security / HA
                                                |
                                         P13 Go-Live
```

## Phase summary

| Phase | Objective | Key exit gate |
|---|---|---|
| P00 | Discovery, VOS Interface Verification & Baseline Capture | 100% of Phase-1 planned VOS operations are either VERIFIED or explicitly UNSUPPORTED/DEFERRED. |
| P01 | Repository, Infrastructure & Development Foundation | Fresh developer clone starts full stack with documented commands. |
| P02 | Identity, RBAC, Tenant Isolation & Audit Foundation | No customer endpoint returns data outside authenticated tenant in negative tests. |
| P03 | VOS Adapter, Instance Registry & Core Read Synchronization | All adapter methods used by later phases are typed and capability-gated. |
| P04 | Durable CDR Ingestion, Validation, Dedupe & Replay | No CDR loss in defined outage/restart test. |
| P05 | ClickHouse CDR Store, Rollups, Query APIs & Analytics | Interactive common queries meet defined p95 SLO at target dataset size. |
| P06 | Admin Portal Core — Customers, CDR, Gateways, Operations | NOC/admin can locate customer -> gateway -> current/historical calls quickly. |
| P07 | Customer Self-Service Core — Dashboard, CDR, Gateways & Rates | Customer can self-serve core call/balance/gateway/rate information. |
| P08 | Billing, Add-Funds, Immutable Ledger & VOS Reconciliation | No duplicate provider event can double-credit. |
| P09 | Realtime Calls, Gateway Presence & NOC Streaming | Stream never leaks another tenant. |
| P10 | Gateway, Rate, Package & Routing Configuration Workflows | Every write is capability-gated and read-back verified where possible. |
| P11 | Customer API, Webhooks, Reports & Large Exports | No export loads entire result set into API memory. |
| P12 | Observability, Security Hardening, Backup & High Availability | Every critical failure mode has an alert and runbook. |
| P13 | Migration, Reconciliation, Load Test, UAT & Production Go-Live | CDR counts and financial samples reconcile within explicitly approved tolerance. |

## Team lanes

A small serious team can work in lanes while preserving phase gates:

- **Platform/Backend:** NestJS, PG, VOS Adapter, payments, APIs.
- **Data/Telecom:** CDR ingest, ClickHouse, Redpanda, analytics, VOS contract testing.
- **Frontend/Product:** Next.js admin/client pages using stable DTO contracts.
- **DevOps/SRE:** environments, observability, backup/restore, deployment.
- **QA/Security:** tenant isolation, contract/E2E/load/security tests.

Do not create separate teams/repositories solely to mirror these lanes; the architecture remains one modular platform.

## Implementation principles

1. Finish P00 evidence before enabling VOS writes.
2. Build security/tenant primitives before customer data pages.
3. Treat CDR ingestion as a durable data pipeline, not a normal CRUD endpoint.
4. Build rollups before dashboard traffic becomes large.
5. Use explicit admin/client DTO projections.
6. Financial workflows are state machines plus reconciliation.
7. Realtime state is rebuildable.
8. All high-volume exports are jobs.
9. Every phase ships observability and tests with the feature.
10. A phase is complete only when its exit gate evidence exists.

## Detailed phase files

- `02_PHASES/PHASE_00_DISCOVERY_AND_VOS_API_VERIFICATION.md`
- `02_PHASES/PHASE_01_REPO_INFRA_FOUNDATION.md`
- `02_PHASES/PHASE_02_IDENTITY_RBAC_TENANCY.md`
- `02_PHASES/PHASE_03_VOS_ADAPTER_AND_CORE_SYNC.md`
- `02_PHASES/PHASE_04_CDR_INGESTION_PIPELINE.md`
- `02_PHASES/PHASE_05_CDR_STORAGE_ANALYTICS.md`
- `02_PHASES/PHASE_06_ADMIN_PORTAL_CORE.md`
- `02_PHASES/PHASE_07_CLIENT_PORTAL_CORE.md`
- `02_PHASES/PHASE_08_BILLING_PAYMENTS_LEDGER.md`
- `02_PHASES/PHASE_09_REALTIME_CALLS_NOC.md`
- `02_PHASES/PHASE_10_GATEWAYS_RATES_ROUTING.md`
- `02_PHASES/PHASE_11_API_WEBHOOKS_REPORTS.md`
- `02_PHASES/PHASE_12_OBSERVABILITY_SECURITY_HA.md`
- `02_PHASES/PHASE_13_MIGRATION_LOAD_TEST_GO_LIVE.md`
