# Phase 12 — Observability, Security Hardening, Backup & High Availability

## Objective

Make failures visible, recoverable and operationally safe before production cutover.

## Dependencies

All major services deployed in staging.

## Deliverables

- [ ] SLO dashboards.
- [ ] Alert rules.
- [ ] Central logs.
- [ ] Backup/restore evidence.
- [ ] Security review.
- [ ] HA plan.
- [ ] Incident runbooks.

## Detailed workstreams

### Metrics

- [ ] API request rate/error/latency.
- [ ] CDR received/processed rate.
- [ ] Redpanda consumer lag.
- [ ] ClickHouse insert/query latency and merge pressure.
- [ ] PostgreSQL connections/locks/replication if used.
- [ ] Redis memory/evictions.
- [ ] VOS adapter latency/error.
- [ ] payment reconciliation backlog.
- [ ] webhook failures.
- [ ] live collector age.
### Logs

- [ ] Structured Pino JSON.
- [ ] Correlation request/event IDs.
- [ ] Loki retention.
- [ ] Redaction tests.
- [ ] Separate audit from operational logs.
### SLOs

- [ ] Define availability for client/admin API.
- [ ] Define freshness target for live calls/gateway state.
- [ ] Define maximum CDR ingest lag.
- [ ] Define common CDR query p95.
- [ ] Define payment reconciliation timing.
### Backups

- [ ] PG base/logical backup strategy.
- [ ] ClickHouse snapshot/backup strategy.
- [ ] Redpanda retention vs backup expectations.
- [ ] MinIO replication/backup.
- [ ] Secret/config backup.
- [ ] Quarterly/regular restore test.
### Security

- [ ] Dependency/container scanning.
- [ ] TLS configuration.
- [ ] Admin MFA enforcement.
- [ ] least privilege service accounts.
- [ ] DB network isolation.
- [ ] SSRF/CSRF/XSS/API authorization review.
- [ ] secret rotation drill.
### HA

- [ ] Document single points of failure in initial topology.
- [ ] Add PG replica/failover when required.
- [ ] Add ClickHouse replication when required.
- [ ] Redpanda multi-node production topology when availability target requires.
- [ ] Redis HA only if live/session availability target requires.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] No major product schema; add operational metadata where needed.

## API work

- [ ] Readiness semantics distinguish dependency failures.
- [ ] Admin operations health endpoints.

## UI/product work

- [ ] Admin system health, integration health, incident banners.

## Testing and verification

- [ ] Restore drills.
- [ ] Node/service kill tests.
- [ ] Dependency outage tests.
- [ ] Security penetration/authorization tests.
- [ ] Alert firing verification.

## Acceptance criteria / exit gate

- [ ] Every critical failure mode has an alert and runbook.
- [ ] Backups have been restored successfully in a clean environment.
- [ ] Security review has no unresolved critical findings.
- [ ] Defined SLO dashboards are live before go-live.

## Primary risks

- Configured backups may be unusable if restore never tested.
- Adding HA too late can reveal stateful assumptions; architecture already separates stateful services.

## Required evidence before marking complete

- [ ] Pull request(s) merged with CI green.
- [ ] Environment deployment evidence captured.
- [ ] API/OpenAPI or event schemas updated.
- [ ] Database/event migrations committed and reviewed.
- [ ] Security/RBAC implications reviewed.
- [ ] Observability added for new critical paths.
- [ ] Rollback/degradation behavior documented.
- [ ] Relevant reference/product pages traced to implementation tickets.
- [ ] No `[VERIFY-VOS-API]` assumption silently converted into production code.

## References

- `04_OPERATIONS/OBSERVABILITY_SLOS_ALERTS.md`
- `04_OPERATIONS/BACKUP_RESTORE_DR.md`
- `04_OPERATIONS/SECURITY_HARDENING.md`
- `04_OPERATIONS/INCIDENT_RUNBOOK.md`

## Phase completion record

| Field | Value |
|---|---|
| Owner | TBD |
| Start | TBD |
| Target finish | TBD |
| Actual finish | TBD |
| Status | Not started |
| Blocking issues | |
| Approved by | |
