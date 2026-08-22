# Coverage Report

## Source Counts

- Admin: **97/97**
- Client: **45/45**
- Total: **142/142**
- Unique routes: **142/142**
- Missing routes: **0**
- Duplicate routes: **0**

## Archetype Distribution

- ANALYTICS_REPORT: 20
- AUTH: 5
- DASHBOARD: 3
- DETAIL: 46
- EDITOR_FORM: 8
- FINANCE_ACTION: 2
- LIST_TABLE: 41
- LIVE_MONITOR: 7
- SETTINGS: 9
- WIZARD: 1

## Phase Distribution

- P02 — Identity, RBAC, Tenant Isolation & Audit Foundation: 11
- P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics: 7
- P06 — Admin Portal Core — Customers, CDR, Gateways, Operations: 26
- P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates: 8
- P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation: 13
- P09 — Realtime Calls, Gateway Presence & NOC Streaming: 5
- P10 — Gateway, Rate, Package & Routing Configuration Workflows: 34
- P11 — Customer API, Webhooks, Reports & Large Exports: 20
- P12 — Observability, Security Hardening, Backup & High Availability: 18

## Validation

Run: `python scripts/validate_coverage.py`