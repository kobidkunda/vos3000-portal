# Product Page -> Implementation Phase Traceability

This matrix maps every page in the two Product Design reference files to its **primary implementation phase**. A page can depend on backend work from earlier phases even when its UI is assigned later.

| Side | Product group | Page | Route | Primary phase |
|---|---|---|---|---|
| Admin | Access & Identity | Admin Login | `/admin/login` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Admin | Access & Identity | MFA Challenge | `/admin/mfa` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Admin | Access & Identity | Forgot / Reset Password | `/admin/forgot-password` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Admin | Access & Identity | Admin Sessions & Devices | `/admin/settings/sessions` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | Command Center | Executive Dashboard | `/admin` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Command Center | NOC Live Operations | `/admin/noc` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Command Center | System Health | `/admin/system/health` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | Command Center | Alarm Center | `/admin/alarms` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | Customers & Accounts | Customer Directory | `/admin/customers` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Customers & Accounts | Create Customer Wizard | `/admin/customers/new` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Customers & Accounts | Customer Overview | `/admin/customers/{customerId}` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Customers & Accounts | Customer Account Settings | `/admin/customers/{customerId}/account` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Customers & Accounts | Customer Balance & Adjustments | `/admin/customers/{customerId}/balance` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Customers & Accounts | Customer Packages | `/admin/customers/{customerId}/packages` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Customers & Accounts | Customer Authorizations | `/admin/customers/{customerId}/authorizations` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Customers & Accounts | Agent & Subaccount Tree | `/admin/customers/{customerId}/subaccounts` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Customers & Accounts | Customer Number Section Limits | `/admin/customers/{customerId}/number-limits` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Gateways & Routing | Mapping Gateways | `/admin/gateways/mapping` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Mapping Gateway Detail | `/admin/gateways/mapping/{gatewayId}` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Routing Gateways | `/admin/gateways/routing` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Routing Gateway Detail | `/admin/gateways/routing/{gatewayId}` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Online Gateways | `/admin/gateways/online` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Gateway Network Quality | `/admin/gateways/network` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Gateway Status Analytics | `/admin/gateways/status` | P09 — Realtime Calls, Gateway Presence & NOC Streaming |
| Admin | Gateways & Routing | Gateway Groups | `/admin/gateway-groups` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Registration Management | `/admin/registrations` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Routing Analysis | `/admin/tools/routing-analysis` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Network Test | `/admin/tools/network-test` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Domain Management | `/admin/routing/domains` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Prohibited Media IP | `/admin/routing/prohibited-media-ips` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Gateways & Routing | Softswitches | `/admin/softswitches` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Phones & Terminals | Phone Directory | `/admin/phones` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Phones & Terminals | Phone Detail | `/admin/phones/{phoneId}` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Phones & Terminals | Online Phones | `/admin/phones/online` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Live Calls & Diagnostics | Live Calls | `/admin/calls/live` | P09 — Realtime Calls, Gateway Presence & NOC Streaming |
| Admin | Live Calls & Diagnostics | Live Call Detail | `/admin/calls/live/{callId}` | P09 — Realtime Calls, Gateway Presence & NOC Streaming |
| Admin | Live Calls & Diagnostics | Call Analysis | `/admin/diagnostics/call-analysis` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Live Calls & Diagnostics | Registration Analysis | `/admin/diagnostics/registration-analysis` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | Recent CDR | `/admin/cdr/recent` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | CDR Explorer | `/admin/cdr` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | CDR Detail | `/admin/cdr/{cdrId}` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | Failure Analytics | `/admin/analytics/failures` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | Connect Analysis | `/admin/analytics/connect` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | Interrupt Analysis | `/admin/analytics/interrupt` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | Call Distribution | `/admin/analytics/distribution` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | Historical Performance | `/admin/analytics/historical-performance` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | CDR & Call Analytics | Gateway Performance | `/admin/analytics/gateway-performance` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Rates, Packages & Commercial Routing | Rate Groups | `/admin/rates/groups` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Rates, Packages & Commercial Routing | Rate Editor | `/admin/rates/groups/{groupId}` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Rates, Packages & Commercial Routing | Rate Import Jobs | `/admin/rates/imports` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Rates, Packages & Commercial Routing | Rate Lookup | `/admin/rates/lookup` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Rates, Packages & Commercial Routing | Package Groups | `/admin/packages` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Rates, Packages & Commercial Routing | Package Period Rates | `/admin/packages/{packageId}/period-rates` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Rates, Packages & Commercial Routing | Package Free Duration | `/admin/packages/{packageId}/free-duration` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Rates, Packages & Commercial Routing | Margin Monitor | `/admin/commercial/margins` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Billing, Payments & Settlement | Payment Ledger | `/admin/payments` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Billing, Payments & Settlement | Manual Payment / Credit | `/admin/payments/new` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Billing, Payments & Settlement | Revenue Details | `/admin/billing/revenue` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Billing, Payments & Settlement | Gateway Bills | `/admin/billing/gateway` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Billing, Payments & Settlement | Phone Bills | `/admin/billing/phone` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Billing, Payments & Settlement | Account Balance Report | `/admin/billing/account-balance` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Billing, Payments & Settlement | Clearing & Settlement | `/admin/settlement` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Reports | Report Center | `/admin/reports` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Admin | Reports | Gateway Analysis Reports | `/admin/reports/gateways` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Reports | Agent Income Report | `/admin/reports/agent-income` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Admin | Reports | Scheduled Reports | `/admin/reports/schedules` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Admin | Number Management | Number Sections | `/admin/numbers/sections` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Number Management | Area Information | `/admin/numbers/areas` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Number Management | Number Transform | `/admin/numbers/transforms` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Number Management | Black / White List Groups | `/admin/numbers/lists` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Number Management | System White List | `/admin/numbers/system-whitelist` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Number Management | Dynamic Black List | `/admin/numbers/dynamic-blacklist` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Admin | Admin Users, Roles & Audit | Admin Users | `/admin/security/users` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Admin | Admin Users, Roles & Audit | Roles & Permissions | `/admin/security/roles` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Admin | Admin Users, Roles & Audit | Online Admin Users | `/admin/security/online-users` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Admin Users, Roles & Audit | Portal Audit Log | `/admin/audit` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Admin | Admin Users, Roles & Audit | VOS System Log | `/admin/system/vos-log` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | System Parameters | `/admin/system/parameters` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | System Information | `/admin/system/info` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | Data Maintenance | `/admin/system/data-maintenance` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | Performance Monitor | `/admin/system/performance` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | Process Monitor | `/admin/system/processes` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | Server Monitor | `/admin/system/servers` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | Disaster Recovery | `/admin/system/disaster-recovery` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | System & Maintenance | Work Calendar | `/admin/system/work-calendar` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | API, Integrations & Automation | Portal API Clients | `/admin/integrations/api-clients` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Admin | API, Integrations & Automation | Webhook Endpoints | `/admin/integrations/webhooks` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Admin | API, Integrations & Automation | Webhook Delivery Log | `/admin/integrations/webhook-deliveries` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Admin | API, Integrations & Automation | VOS Web Access Control | `/admin/integrations/vos-access` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | API, Integrations & Automation | VOS Web Service Equipment | `/admin/integrations/vos-equipment` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | API, Integrations & Automation | Integration Health | `/admin/integrations/health` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | Portal Operations | Support Tickets | `/admin/support/tickets` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Portal Operations | Notification Policies | `/admin/notifications/policies` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Portal Operations | Notification Log | `/admin/notifications/log` | P06 — Admin Portal Core — Customers, CDR, Gateways, Operations |
| Admin | Portal Operations | Payment Providers | `/admin/settings/payments` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Admin | Portal Operations | Portal Branding | `/admin/settings/branding` | P12 — Observability, Security Hardening, Backup & High Availability |
| Admin | Portal Operations | Feature Flags | `/admin/settings/features` | P12 — Observability, Security Hardening, Backup & High Availability |
| Client | Access & Account Security | Client Login | `/app/login` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Client | Access & Account Security | MFA Setup & Verify | `/app/settings/security/mfa` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Client | Access & Account Security | Sessions & Devices | `/app/settings/security/sessions` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Client | Access & Account Security | Profile & Organization | `/app/settings/profile` | P12 — Observability, Security Hardening, Backup & High Availability |
| Client | Home & Overview | Client Dashboard | `/app` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Home & Overview | Service Status | `/app/status` | P09 — Realtime Calls, Gateway Presence & NOC Streaming |
| Client | Balance, Funds & Payments | Balance & Wallet | `/app/billing/balance` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Client | Balance, Funds & Payments | Add Funds | `/app/billing/add-funds` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Client | Balance, Funds & Payments | Payment History | `/app/billing/payments` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Client | Balance, Funds & Payments | Payment Detail / Receipt | `/app/billing/payments/{paymentId}` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Client | Balance, Funds & Payments | Statements & Billing Summary | `/app/billing/statements` | P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation |
| Client | CDR & Call History | CDR Explorer | `/app/cdr` | P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics |
| Client | CDR & Call History | CDR Detail | `/app/cdr/{cdrId}` | P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics |
| Client | CDR & Call History | Recent Calls | `/app/cdr/recent` | P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics |
| Client | CDR & Call History | CDR Export Jobs | `/app/cdr/exports` | P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics |
| Client | Live Calls & Traffic | Live Calls | `/app/calls/live` | P09 — Realtime Calls, Gateway Presence & NOC Streaming |
| Client | Live Calls & Traffic | Traffic Analytics | `/app/analytics/traffic` | P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics |
| Client | Live Calls & Traffic | Failure Analytics | `/app/analytics/failures` | P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics |
| Client | Live Calls & Traffic | Destination Analytics | `/app/analytics/destinations` | P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics |
| Client | Gateways & SIP | My Gateways | `/app/gateways` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Gateways & SIP | Gateway Detail | `/app/gateways/{gatewayId}` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Gateways & SIP | Gateway IP Management | `/app/gateways/{gatewayId}/ips` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Client | Gateways & SIP | SIP Credentials | `/app/gateways/{gatewayId}/credentials` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Client | Gateways & SIP | Gateway Network Quality | `/app/gateways/{gatewayId}/network` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Gateways & SIP | Gateway Call Statistics | `/app/gateways/{gatewayId}/statistics` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Rates & Pricing | My Rate Sheet | `/app/rates` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Rates & Pricing | Rate Lookup | `/app/rates/lookup` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Rates & Pricing | Rate Change History | `/app/rates/history` | P10 — Gateway, Rate, Package & Routing Configuration Workflows |
| Client | Reports & Downloads | Reports Home | `/app/reports` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Reports & Downloads | Usage Report | `/app/reports/usage` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Reports & Downloads | Gateway Report | `/app/reports/gateways` | P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates |
| Client | Reports & Downloads | Scheduled Reports | `/app/reports/schedules` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Reports & Downloads | Downloads | `/app/downloads` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Notifications | Notification Center | `/app/notifications` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Notifications | Alert Preferences | `/app/settings/notifications` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Developer API & Webhooks | API Overview | `/app/developers` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Developer API & Webhooks | API Keys | `/app/developers/api-keys` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Developer API & Webhooks | API Request Logs | `/app/developers/logs` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Developer API & Webhooks | Webhook Endpoints | `/app/developers/webhooks` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Developer API & Webhooks | Webhook Delivery Log | `/app/developers/webhook-deliveries` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Team & Permissions | Team Members | `/app/team` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Client | Team & Permissions | Client Roles | `/app/team/roles` | P02 — Identity, RBAC, Tenant Isolation & Audit Foundation |
| Client | Support | Support Tickets | `/app/support` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Support | New Support Ticket | `/app/support/new` | P11 — Customer API, Webhooks, Reports & Large Exports |
| Client | Support | Ticket Detail | `/app/support/{ticketId}` | P11 — Customer API, Webhooks, Reports & Large Exports |
