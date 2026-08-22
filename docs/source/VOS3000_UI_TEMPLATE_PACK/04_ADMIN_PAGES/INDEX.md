# Admin Page Template Index

Total: **97**

## Access & Identity

- [Admin Login](001_admin-login.md) — `/admin/login` — **AUTH** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [MFA Challenge](002_mfa-challenge.md) — `/admin/mfa` — **AUTH** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [Forgot / Reset Password](003_forgot-reset-password.md) — `/admin/forgot-password` — **AUTH** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [Admin Sessions & Devices](004_admin-sessions-devices.md) — `/admin/settings/sessions` — **DETAIL** — P12 — Observability, Security Hardening, Backup & High Availability

## Command Center

- [Executive Dashboard](005_executive-dashboard.md) — `/admin` — **DASHBOARD** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [NOC Live Operations](006_noc-live-operations.md) — `/admin/noc` — **LIVE_MONITOR** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [System Health](007_system-health.md) — `/admin/system/health` — **LIVE_MONITOR** — P12 — Observability, Security Hardening, Backup & High Availability
- [Alarm Center](008_alarm-center.md) — `/admin/alarms` — **LIST_TABLE** — P12 — Observability, Security Hardening, Backup & High Availability

## Customers & Accounts

- [Customer Directory](009_customer-directory.md) — `/admin/customers` — **LIST_TABLE** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Create Customer Wizard](010_create-customer-wizard.md) — `/admin/customers/new` — **WIZARD** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Customer Overview](011_customer-overview.md) — `/admin/customers/{customerId}` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Customer Account Settings](012_customer-account-settings.md) — `/admin/customers/{customerId}/account` — **SETTINGS** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Customer Balance & Adjustments](013_customer-balance-adjustments.md) — `/admin/customers/{customerId}/balance` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Customer Packages](014_customer-packages.md) — `/admin/customers/{customerId}/packages` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Customer Authorizations](015_customer-authorizations.md) — `/admin/customers/{customerId}/authorizations` — **SETTINGS** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Agent & Subaccount Tree](016_agent-subaccount-tree.md) — `/admin/customers/{customerId}/subaccounts` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Customer Number Section Limits](017_customer-number-section-limits.md) — `/admin/customers/{customerId}/number-limits` — **SETTINGS** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations

## Gateways & Routing

- [Mapping Gateways](018_mapping-gateways.md) — `/admin/gateways/mapping` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Mapping Gateway Detail](019_mapping-gateway-detail.md) — `/admin/gateways/mapping/{gatewayId}` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Routing Gateways](020_routing-gateways.md) — `/admin/gateways/routing` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Routing Gateway Detail](021_routing-gateway-detail.md) — `/admin/gateways/routing/{gatewayId}` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Online Gateways](022_online-gateways.md) — `/admin/gateways/online` — **LIVE_MONITOR** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Gateway Network Quality](023_gateway-network-quality.md) — `/admin/gateways/network` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Gateway Status Analytics](024_gateway-status-analytics.md) — `/admin/gateways/status` — **ANALYTICS_REPORT** — P09 — Realtime Calls, Gateway Presence & NOC Streaming
- [Gateway Groups](025_gateway-groups.md) — `/admin/gateway-groups` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Registration Management](026_registration-management.md) — `/admin/registrations` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Routing Analysis](027_routing-analysis.md) — `/admin/tools/routing-analysis` — **EDITOR_FORM** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Network Test](028_network-test.md) — `/admin/tools/network-test` — **EDITOR_FORM** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Domain Management](029_domain-management.md) — `/admin/routing/domains` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Prohibited Media IP](030_prohibited-media-ip.md) — `/admin/routing/prohibited-media-ips` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Softswitches](031_softswitches.md) — `/admin/softswitches` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows

## Phones & Terminals

- [Phone Directory](032_phone-directory.md) — `/admin/phones` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Phone Detail](033_phone-detail.md) — `/admin/phones/{phoneId}` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Online Phones](034_online-phones.md) — `/admin/phones/online` — **LIVE_MONITOR** — P10 — Gateway, Rate, Package & Routing Configuration Workflows

## Live Calls & Diagnostics

- [Live Calls](035_live-calls.md) — `/admin/calls/live` — **LIVE_MONITOR** — P09 — Realtime Calls, Gateway Presence & NOC Streaming
- [Live Call Detail](036_live-call-detail.md) — `/admin/calls/live/{callId}` — **DETAIL** — P09 — Realtime Calls, Gateway Presence & NOC Streaming
- [Call Analysis](037_call-analysis.md) — `/admin/diagnostics/call-analysis` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Registration Analysis](038_registration-analysis.md) — `/admin/diagnostics/registration-analysis` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations

## CDR & Call Analytics

- [Recent CDR](039_recent-cdr.md) — `/admin/cdr/recent` — **LIST_TABLE** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [CDR Explorer](040_cdr-explorer.md) — `/admin/cdr` — **LIST_TABLE** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [CDR Detail](041_cdr-detail.md) — `/admin/cdr/{cdrId}` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Failure Analytics](042_failure-analytics.md) — `/admin/analytics/failures` — **ANALYTICS_REPORT** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Connect Analysis](043_connect-analysis.md) — `/admin/analytics/connect` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Interrupt Analysis](044_interrupt-analysis.md) — `/admin/analytics/interrupt` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Call Distribution](045_call-distribution.md) — `/admin/analytics/distribution` — **ANALYTICS_REPORT** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Historical Performance](046_historical-performance.md) — `/admin/analytics/historical-performance` — **ANALYTICS_REPORT** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Gateway Performance](047_gateway-performance.md) — `/admin/analytics/gateway-performance` — **ANALYTICS_REPORT** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations

## Rates, Packages & Commercial Routing

- [Rate Groups](048_rate-groups.md) — `/admin/rates/groups` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Rate Editor](049_rate-editor.md) — `/admin/rates/groups/{groupId}` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Rate Import Jobs](050_rate-import-jobs.md) — `/admin/rates/imports` — **EDITOR_FORM** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Rate Lookup](051_rate-lookup.md) — `/admin/rates/lookup` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Package Groups](052_package-groups.md) — `/admin/packages` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Package Period Rates](053_package-period-rates.md) — `/admin/packages/{packageId}/period-rates` — **EDITOR_FORM** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Package Free Duration](054_package-free-duration.md) — `/admin/packages/{packageId}/free-duration` — **EDITOR_FORM** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Margin Monitor](055_margin-monitor.md) — `/admin/commercial/margins` — **ANALYTICS_REPORT** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations

## Billing, Payments & Settlement

- [Payment Ledger](056_payment-ledger.md) — `/admin/payments` — **LIST_TABLE** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Manual Payment / Credit](057_manual-payment-credit.md) — `/admin/payments/new` — **FINANCE_ACTION** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Revenue Details](058_revenue-details.md) — `/admin/billing/revenue` — **DETAIL** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Gateway Bills](059_gateway-bills.md) — `/admin/billing/gateway` — **ANALYTICS_REPORT** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Phone Bills](060_phone-bills.md) — `/admin/billing/phone` — **ANALYTICS_REPORT** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Account Balance Report](061_account-balance-report.md) — `/admin/billing/account-balance` — **ANALYTICS_REPORT** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Clearing & Settlement](062_clearing-settlement.md) — `/admin/settlement` — **ANALYTICS_REPORT** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation

## Reports

- [Report Center](063_report-center.md) — `/admin/reports` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Gateway Analysis Reports](064_gateway-analysis-reports.md) — `/admin/reports/gateways` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Agent Income Report](065_agent-income-report.md) — `/admin/reports/agent-income` — **ANALYTICS_REPORT** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Scheduled Reports](066_scheduled-reports.md) — `/admin/reports/schedules` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports

## Number Management

- [Number Sections](067_number-sections.md) — `/admin/numbers/sections` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Area Information](068_area-information.md) — `/admin/numbers/areas` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Number Transform](069_number-transform.md) — `/admin/numbers/transforms` — **DETAIL** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Black / White List Groups](070_black-white-list-groups.md) — `/admin/numbers/lists` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [System White List](071_system-white-list.md) — `/admin/numbers/system-whitelist` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows
- [Dynamic Black List](072_dynamic-black-list.md) — `/admin/numbers/dynamic-blacklist` — **LIST_TABLE** — P10 — Gateway, Rate, Package & Routing Configuration Workflows

## Admin Users, Roles & Audit

- [Admin Users](073_admin-users.md) — `/admin/security/users` — **LIST_TABLE** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [Roles & Permissions](074_roles-permissions.md) — `/admin/security/roles` — **SETTINGS** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [Online Admin Users](075_online-admin-users.md) — `/admin/security/online-users` — **LIST_TABLE** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Portal Audit Log](076_portal-audit-log.md) — `/admin/audit` — **LIST_TABLE** — P02 — Identity, RBAC, Tenant Isolation & Audit Foundation
- [VOS System Log](077_vos-system-log.md) — `/admin/system/vos-log` — **LIST_TABLE** — P12 — Observability, Security Hardening, Backup & High Availability

## System & Maintenance

- [System Parameters](078_system-parameters.md) — `/admin/system/parameters` — **SETTINGS** — P12 — Observability, Security Hardening, Backup & High Availability
- [System Information](079_system-information.md) — `/admin/system/info` — **DETAIL** — P12 — Observability, Security Hardening, Backup & High Availability
- [Data Maintenance](080_data-maintenance.md) — `/admin/system/data-maintenance` — **DETAIL** — P12 — Observability, Security Hardening, Backup & High Availability
- [Performance Monitor](081_performance-monitor.md) — `/admin/system/performance` — **ANALYTICS_REPORT** — P12 — Observability, Security Hardening, Backup & High Availability
- [Process Monitor](082_process-monitor.md) — `/admin/system/processes` — **ANALYTICS_REPORT** — P12 — Observability, Security Hardening, Backup & High Availability
- [Server Monitor](083_server-monitor.md) — `/admin/system/servers` — **ANALYTICS_REPORT** — P12 — Observability, Security Hardening, Backup & High Availability
- [Disaster Recovery](084_disaster-recovery.md) — `/admin/system/disaster-recovery` — **DETAIL** — P12 — Observability, Security Hardening, Backup & High Availability
- [Work Calendar](085_work-calendar.md) — `/admin/system/work-calendar` — **SETTINGS** — P12 — Observability, Security Hardening, Backup & High Availability

## API, Integrations & Automation

- [Portal API Clients](086_portal-api-clients.md) — `/admin/integrations/api-clients` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Webhook Endpoints](087_webhook-endpoints.md) — `/admin/integrations/webhooks` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [Webhook Delivery Log](088_webhook-delivery-log.md) — `/admin/integrations/webhook-deliveries` — **LIST_TABLE** — P11 — Customer API, Webhooks, Reports & Large Exports
- [VOS Web Access Control](089_vos-web-access-control.md) — `/admin/integrations/vos-access` — **DETAIL** — P12 — Observability, Security Hardening, Backup & High Availability
- [VOS Web Service Equipment](090_vos-web-service-equipment.md) — `/admin/integrations/vos-equipment` — **DETAIL** — P12 — Observability, Security Hardening, Backup & High Availability
- [Integration Health](091_integration-health.md) — `/admin/integrations/health` — **LIVE_MONITOR** — P12 — Observability, Security Hardening, Backup & High Availability

## Portal Operations

- [Support Tickets](092_support-tickets.md) — `/admin/support/tickets` — **LIST_TABLE** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Notification Policies](093_notification-policies.md) — `/admin/notifications/policies` — **DETAIL** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Notification Log](094_notification-log.md) — `/admin/notifications/log` — **LIST_TABLE** — P06 — Admin Portal Core — Customers, CDR, Gateways, Operations
- [Payment Providers](095_payment-providers.md) — `/admin/settings/payments` — **DETAIL** — P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation
- [Portal Branding](096_portal-branding.md) — `/admin/settings/branding` — **SETTINGS** — P12 — Observability, Security Hardening, Backup & High Availability
- [Feature Flags](097_feature-flags.md) — `/admin/settings/features` — **SETTINGS** — P12 — Observability, Security Hardening, Backup & High Availability
