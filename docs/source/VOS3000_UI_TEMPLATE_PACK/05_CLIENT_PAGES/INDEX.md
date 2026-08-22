# Client Page Template Index

Total: **45**

## Access & Account Security

- [Client Login](001_client-login.md) — `/app/login` — **AUTH** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [MFA Setup & Verify](002_mfa-setup-verify.md) — `/app/settings/security/mfa` — **AUTH** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [Sessions & Devices](003_sessions-devices.md) — `/app/settings/security/sessions` — **DETAIL** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [Profile & Organization](004_profile-organization.md) — `/app/settings/profile` — **DETAIL** — P12 — Observability, Security Hardening, Backup & High Availability

## Home & Overview

- [Client Dashboard](005_client-dashboard.md) — `/app` — **DASHBOARD** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates
- [Service Status](006_service-status.md) — `/app/status` — **DETAIL** — P09 — Realtime Calls, Gateway Presence & NOC Streaming

## Balance, Funds & Payments

- [Balance & Wallet](007_balance-wallet.md) — `/app/billing/balance` — **DETAIL** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Add Funds](008_add-funds.md) — `/app/billing/add-funds` — **FINANCE_ACTION** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Payment History](009_payment-history.md) — `/app/billing/payments` — **LIST_TABLE** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Payment Detail / Receipt](010_payment-detail-receipt.md) — `/app/billing/payments/{paymentId}` — **DETAIL** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Statements & Billing Summary](011_statements-billing-summary.md) — `/app/billing/statements` — **ANALYTICS_REPORT** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation

## CDR & Call History

- [CDR Explorer](012_cdr-explorer.md) — `/app/cdr` — **LIST_TABLE** — P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics
- [CDR Detail](013_cdr-detail.md) — `/app/cdr/{cdrId}` — **DETAIL** — P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics
- [Recent Calls](014_recent-calls.md) — `/app/cdr/recent` — **DETAIL** — P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics
- [CDR Export Jobs](015_cdr-export-jobs.md) — `/app/cdr/exports` — **LIST_TABLE** — P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics

## Live Calls & Traffic

- [Live Calls](016_live-calls.md) — `/app/calls/live` — **LIVE_MONITOR** — P09 — Realtime Calls, Gateway Presence & NOC Streaming
- [Traffic Analytics](017_traffic-analytics.md) — `/app/analytics/traffic` — **ANALYTICS_REPORT** — P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics
- [Failure Analytics](018_failure-analytics.md) — `/app/analytics/failures` — **ANALYTICS_REPORT** — P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics
- [Destination Analytics](019_destination-analytics.md) — `/app/analytics/destinations` — **ANALYTICS_REPORT** — P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics

## Gateways & SIP

- [My Gateways](020_my-gateways.md) — `/app/gateways` — **LIST_TABLE** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates
- [Gateway Detail](021_gateway-detail.md) — `/app/gateways/{gatewayId}` — **DETAIL** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates
- [Gateway IP Management](022_gateway-ip-management.md) — `/app/gateways/{gatewayId}/ips` — **EDITOR_FORM** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [SIP Credentials](023_sip-credentials.md) — `/app/gateways/{gatewayId}/credentials` — **EDITOR_FORM** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Gateway Network Quality](024_gateway-network-quality.md) — `/app/gateways/{gatewayId}/network` — **DETAIL** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates
- [Gateway Call Statistics](025_gateway-call-statistics.md) — `/app/gateways/{gatewayId}/statistics` — **DETAIL** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates

## Rates & Pricing

- [My Rate Sheet](026_my-rate-sheet.md) — `/app/rates` — **DETAIL** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates
- [Rate Lookup](027_rate-lookup.md) — `/app/rates/lookup` — **DETAIL** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates
- [Rate Change History](028_rate-change-history.md) — `/app/rates/history` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows

## Reports & Downloads

- [Reports Home](029_reports-home.md) — `/app/reports` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Usage Report](030_usage-report.md) — `/app/reports/usage` — **ANALYTICS_REPORT** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Gateway Report](031_gateway-report.md) — `/app/reports/gateways` — **ANALYTICS_REPORT** — P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates
- [Scheduled Reports](032_scheduled-reports.md) — `/app/reports/schedules` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Downloads](033_downloads.md) — `/app/downloads` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports

## Notifications

- [Notification Center](034_notification-center.md) — `/app/notifications` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Alert Preferences](035_alert-preferences.md) — `/app/settings/notifications` — **SETTINGS** — P11 — Customer API, Webhooks, Reports & Large Exports

## Developer API & Webhooks

- [API Overview](036_api-overview.md) — `/app/developers` — **DASHBOARD** — P11 — Customer API, Webhooks, Reports & Large Exports
- [API Keys](037_api-keys.md) — `/app/developers/api-keys` — **DETAIL** — P11 — Customer API, Webhooks, Reports & Large Exports
- [API Request Logs](038_api-request-logs.md) — `/app/developers/logs` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Webhook Endpoints](039_webhook-endpoints.md) — `/app/developers/webhooks` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Webhook Delivery Log](040_webhook-delivery-log.md) — `/app/developers/webhook-deliveries` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports

## Team & Permissions

- [Team Members](041_team-members.md) — `/app/team` — **DETAIL** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [Client Roles](042_client-roles.md) — `/app/team/roles` — **DETAIL** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation

## Support

- [Support Tickets](043_support-tickets.md) — `/app/support` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [New Support Ticket](044_new-support-ticket.md) — `/app/support/new` — **EDITOR_FORM** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Ticket Detail](045_ticket-detail.md) — `/app/support/{ticketId}` — **DETAIL** — P11 — Customer API, Webhooks, Reports & Large Exports
