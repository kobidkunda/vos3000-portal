# Master Implementation TODO

This is the cross-phase checklist. Detailed tasks live in each phase file.

## Phase 00 — Discovery, VOS Interface Verification & Baseline Capture

- [ ] **Exit gate:** 100% of Phase-1 planned VOS operations are either VERIFIED or explicitly UNSUPPORTED/DEFERRED.
- [ ] **Exit gate:** No required write is implemented using an assumed undocumented database update.
- [ ] **Exit gate:** Sample payloads and field mappings are stored in project docs/test fixtures with secrets redacted.
- [ ] **Exit gate:** Measured traffic baseline is available for capacity planning.
- [ ] Deliverable: Installed VOS version/build inventory and environment diagram.
- [ ] Deliverable: Capability matrix mapping every required portal action to a verified VOS read/write mechanism.
- [ ] Deliverable: Captured sample payloads/field mappings for Account, Payment, CDR, Current Call, Mapping/Routing Gateway, Online Gateway, Gateway Network, Rates, Users and Interface Management.
- [ ] Deliverable: VOS Adapter contract v1 with unsupported operations explicitly marked.
- [ ] Deliverable: Baseline traffic measurements: CDR/day, peak CDR/s, current calls, gateways, customers, retention.
- [ ] Deliverable: Non-production VOS test tenant/accounts/gateways for contract testing.
- Detailed file: `02_PHASES/PHASE_00_DISCOVERY_AND_VOS_API_VERIFICATION.md`

## Phase 01 — Repository, Infrastructure & Development Foundation

- [ ] **Exit gate:** Fresh developer clone starts full stack with documented commands.
- [ ] **Exit gate:** Staging can deploy from CI artifact.
- [ ] **Exit gate:** Every service exposes health and version.
- [ ] **Exit gate:** No secret exists in repository history for new setup.
- [ ] Deliverable: Monorepo with web, API, CDR ingest, workers and shared packages.
- [ ] Deliverable: Local Docker Compose for PostgreSQL, ClickHouse, Redis, Redpanda, MinIO and observability.
- [ ] Deliverable: Migration strategy and environment configuration system.
- [ ] Deliverable: CI pipeline for lint/typecheck/unit tests/migrations/container build.
- [ ] Deliverable: Staging deployment on Ubuntu behind Nginx/TLS.
- Detailed file: `02_PHASES/PHASE_01_REPO_INFRA_FOUNDATION.md`

## Phase 02 — Identity, RBAC, Tenant Isolation & Audit Foundation

- [ ] **Exit gate:** No customer endpoint returns data outside authenticated tenant in negative tests.
- [ ] **Exit gate:** Every mutation creates an audit record.
- [ ] **Exit gate:** Admin high-risk permission names exist even before those features are implemented.
- [ ] **Exit gate:** MFA works for admin test users.
- [ ] Deliverable: Admin/client authentication.
- [ ] Deliverable: MFA foundation.
- [ ] Deliverable: Server-side RBAC.
- [ ] Deliverable: Tenant/customer scoping primitives.
- [ ] Deliverable: Append-only portal audit log.
- [ ] Deliverable: Session/device management.
- Detailed file: `02_PHASES/PHASE_02_IDENTITY_RBAC_TENANCY.md`

## Phase 03 — VOS Adapter, Instance Registry & Core Read Synchronization

- [ ] **Exit gate:** All adapter methods used by later phases are typed and capability-gated.
- [ ] **Exit gate:** No frontend imports VOS adapter transport types.
- [ ] **Exit gate:** A second VOS instance can be registered without schema redesign.
- [ ] **Exit gate:** Read failures show degraded/stale status.
- [ ] Deliverable: Multi-instance VOS registry.
- [ ] Deliverable: Typed VOS Adapter interface.
- [ ] Deliverable: Account/gateway/phone/rate/payment read mappings.
- [ ] Deliverable: Capability flags.
- [ ] Deliverable: Retry/timeout/error normalization.
- [ ] Deliverable: Core sync jobs.
- Detailed file: `02_PHASES/PHASE_03_VOS_ADAPTER_AND_CORE_SYNC.md`

## Phase 04 — Durable CDR Ingestion, Validation, Dedupe & Replay

- [ ] **Exit gate:** No CDR loss in defined outage/restart test.
- [ ] **Exit gate:** Duplicate replay produces one logical CDR.
- [ ] **Exit gate:** DLQ captures invalid records with reason.
- [ ] **Exit gate:** Lag and last-ingest time are observable.
- [ ] **Exit gate:** Pipeline meets measured throughput target with headroom.
- [ ] Deliverable: CDR ingest service.
- [ ] Deliverable: Canonical CDR schema.
- [ ] Deliverable: Redpanda topics.
- [ ] Deliverable: Dedupe identity.
- [ ] Deliverable: Dead-letter path.
- [ ] Deliverable: Replay tooling.
- [ ] Deliverable: Backpressure/load tests.
- Detailed file: `02_PHASES/PHASE_04_CDR_INGESTION_PIPELINE.md`

## Phase 05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics

- [ ] **Exit gate:** Interactive common queries meet defined p95 SLO at target dataset size.
- [ ] **Exit gate:** Aggregates reconcile to raw facts within defined semantics.
- [ ] **Exit gate:** No customer can query without tenant scope.
- [ ] **Exit gate:** Large exports never run synchronously in browser request.
- [ ] Deliverable: Production CDR table.
- [ ] Deliverable: Materialized/hourly/daily aggregates.
- [ ] Deliverable: Tenant-scoped query service.
- [ ] Deliverable: Cursor pagination.
- [ ] Deliverable: Analytics APIs.
- [ ] Deliverable: Retention policy.
- Detailed file: `02_PHASES/PHASE_05_CDR_STORAGE_ANALYTICS.md`

## Phase 06 — Admin Portal Core — Customers, CDR, Gateways, Operations

- [ ] **Exit gate:** NOC/admin can locate customer -> gateway -> current/historical calls quickly.
- [ ] **Exit gate:** Unsupported VOS writes cannot be triggered.
- [ ] **Exit gate:** Every admin mutation is audited.
- [ ] **Exit gate:** Dashboard does not directly depend on raw billion-row scans.
- [ ] Deliverable: Admin dashboard/NOC base.
- [ ] Deliverable: Customer directory/detail.
- [ ] Deliverable: CDR explorer/detail.
- [ ] Deliverable: Gateway read pages.
- [ ] Deliverable: Live integration health.
- [ ] Deliverable: Admin audit and support links.
- Detailed file: `02_PHASES/PHASE_06_ADMIN_PORTAL_CORE.md`

## Phase 07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates

- [ ] **Exit gate:** Customer can self-serve core call/balance/gateway/rate information.
- [ ] **Exit gate:** API responses contain no carrier cost/internal fields by default.
- [ ] **Exit gate:** ID tampering cannot cross tenants.
- [ ] **Exit gate:** Customer support ticket can reference a safe CDR identifier.
- [ ] Deliverable: Client dashboard.
- [ ] Deliverable: Balance view.
- [ ] Deliverable: CDR/recent CDR/detail.
- [ ] Deliverable: Live calls read.
- [ ] Deliverable: My Gateways/details/network.
- [ ] Deliverable: Rate sheet/lookup.
- [ ] Deliverable: Support.
- Detailed file: `02_PHASES/PHASE_07_CLIENT_PORTAL_CORE.md`

## Phase 08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation

- [ ] **Exit gate:** No duplicate provider event can double-credit.
- [ ] **Exit gate:** No payment is completed before VOS/ledger criteria are met.
- [ ] **Exit gate:** Every mismatch is visible and recoverable.
- [ ] **Exit gate:** Money arithmetic passes exactness tests.
- [ ] Deliverable: Payment provider integration.
- [ ] Deliverable: Immutable ledger.
- [ ] Deliverable: VOS credit command/reconciliation.
- [ ] Deliverable: Admin payment tools.
- [ ] Deliverable: Customer payment history/receipts.
- [ ] Deliverable: Failure recovery runbook.
- Detailed file: `02_PHASES/PHASE_08_BILLING_PAYMENTS_LEDGER.md`

## Phase 09 — Realtime Calls, Gateway Presence & NOC Streaming

- [ ] **Exit gate:** Stream never leaks another tenant.
- [ ] **Exit gate:** UI clearly shows stale/degraded state.
- [ ] **Exit gate:** Redis loss can rebuild from VOS source.
- [ ] **Exit gate:** Collector load does not overload VOS.
- [ ] Deliverable: Realtime collector.
- [ ] Deliverable: Redis key model.
- [ ] Deliverable: WebSocket/SSE stream.
- [ ] Deliverable: Admin NOC/live call pages.
- [ ] Deliverable: Customer live call page.
- [ ] Deliverable: Gateway online/offline change events.
- Detailed file: `02_PHASES/PHASE_09_REALTIME_CALLS_NOC.md`

## Phase 10 — Gateway, Rate, Package & Routing Configuration Workflows

- [ ] **Exit gate:** Every write is capability-gated and read-back verified where possible.
- [ ] **Exit gate:** Rate deployment has version, diff, actor and audit.
- [ ] **Exit gate:** Client cannot alter gateway outside entitlement.
- [ ] **Exit gate:** Representative routing tests pass after change.
- [ ] Deliverable: Gateway CRUD/IP/capacity workflows.
- [ ] Deliverable: Rate groups/editor/import/versioning.
- [ ] Deliverable: Package management.
- [ ] Deliverable: Routing analysis tooling.
- [ ] Deliverable: Number/list management as supported.
- [ ] Deliverable: Change approval/audit.
- Detailed file: `02_PHASES/PHASE_10_GATEWAYS_RATES_ROUTING.md`

## Phase 11 — Customer API, Webhooks, Reports & Large Exports

- [ ] **Exit gate:** No export loads entire result set into API memory.
- [ ] **Exit gate:** Webhook delivery is replay-safe and observable.
- [ ] **Exit gate:** API key cannot exceed tenant/scope.
- [ ] **Exit gate:** Public API OpenAPI matches implementation.
- [ ] Deliverable: Versioned public API.
- [ ] Deliverable: API key/scopes.
- [ ] Deliverable: Rate limiting.
- [ ] Deliverable: Signed outbound webhooks.
- [ ] Deliverable: Delivery retry log.
- [ ] Deliverable: Async report/export system.
- [ ] Deliverable: Developer UI/docs.
- Detailed file: `02_PHASES/PHASE_11_API_WEBHOOKS_REPORTS.md`

## Phase 12 — Observability, Security Hardening, Backup & High Availability

- [ ] **Exit gate:** Every critical failure mode has an alert and runbook.
- [ ] **Exit gate:** Backups have been restored successfully in a clean environment.
- [ ] **Exit gate:** Security review has no unresolved critical findings.
- [ ] **Exit gate:** Defined SLO dashboards are live before go-live.
- [ ] Deliverable: SLO dashboards.
- [ ] Deliverable: Alert rules.
- [ ] Deliverable: Central logs.
- [ ] Deliverable: Backup/restore evidence.
- [ ] Deliverable: Security review.
- [ ] Deliverable: HA plan.
- [ ] Deliverable: Incident runbooks.
- Detailed file: `02_PHASES/PHASE_12_OBSERVABILITY_SECURITY_HA.md`

## Phase 13 — Migration, Reconciliation, Load Test, UAT & Production Go-Live

- [ ] **Exit gate:** CDR counts and financial samples reconcile within explicitly approved tolerance.
- [ ] **Exit gate:** Load test passes with agreed headroom.
- [ ] **Exit gate:** Rollback is rehearsed/documented.
- [ ] **Exit gate:** Business/NOC/billing/security owners sign off.
- [ ] **Exit gate:** No unverified VOS write is enabled.
- [ ] Deliverable: Production data mapping.
- [ ] Deliverable: Historical CDR migration/import plan.
- [ ] Deliverable: Full load results.
- [ ] Deliverable: UAT signoff.
- [ ] Deliverable: Reconciliation signoff.
- [ ] Deliverable: Cutover/rollback runbook.
- [ ] Deliverable: Hypercare dashboard.
- Detailed file: `02_PHASES/PHASE_13_MIGRATION_LOAD_TEST_GO_LIVE.md`
