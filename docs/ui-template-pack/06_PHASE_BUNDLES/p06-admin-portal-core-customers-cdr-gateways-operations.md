# P06 — Admin Portal Core — Customers, CDR, Gateways, Operations — UI Template Bundle

Pages: **26**

- **Admin · Executive Dashboard** — `/admin` — `04_ADMIN_PAGES/005_executive-dashboard.md`
- **Admin · NOC Live Operations** — `/admin/noc` — `04_ADMIN_PAGES/006_noc-live-operations.md`
- **Admin · Customer Directory** — `/admin/customers` — `04_ADMIN_PAGES/009_customer-directory.md`
- **Admin · Create Customer Wizard** — `/admin/customers/new` — `04_ADMIN_PAGES/010_create-customer-wizard.md`
- **Admin · Customer Overview** — `/admin/customers/{customerId}` — `04_ADMIN_PAGES/011_customer-overview.md`
- **Admin · Customer Account Settings** — `/admin/customers/{customerId}/account` — `04_ADMIN_PAGES/012_customer-account-settings.md`
- **Admin · Customer Balance & Adjustments** — `/admin/customers/{customerId}/balance` — `04_ADMIN_PAGES/013_customer-balance-adjustments.md`
- **Admin · Customer Authorizations** — `/admin/customers/{customerId}/authorizations` — `04_ADMIN_PAGES/015_customer-authorizations.md`
- **Admin · Agent & Subaccount Tree** — `/admin/customers/{customerId}/subaccounts` — `04_ADMIN_PAGES/016_agent-subaccount-tree.md`
- **Admin · Customer Number Section Limits** — `/admin/customers/{customerId}/number-limits` — `04_ADMIN_PAGES/017_customer-number-section-limits.md`
- **Admin · Call Analysis** — `/admin/diagnostics/call-analysis` — `04_ADMIN_PAGES/037_call-analysis.md`
- **Admin · Registration Analysis** — `/admin/diagnostics/registration-analysis` — `04_ADMIN_PAGES/038_registration-analysis.md`
- **Admin · Recent CDR** — `/admin/cdr/recent` — `04_ADMIN_PAGES/039_recent-cdr.md`
- **Admin · CDR Explorer** — `/admin/cdr` — `04_ADMIN_PAGES/040_cdr-explorer.md`
- **Admin · CDR Detail** — `/admin/cdr/{cdrId}` — `04_ADMIN_PAGES/041_cdr-detail.md`
- **Admin · Failure Analytics** — `/admin/analytics/failures` — `04_ADMIN_PAGES/042_failure-analytics.md`
- **Admin · Connect Analysis** — `/admin/analytics/connect` — `04_ADMIN_PAGES/043_connect-analysis.md`
- **Admin · Interrupt Analysis** — `/admin/analytics/interrupt` — `04_ADMIN_PAGES/044_interrupt-analysis.md`
- **Admin · Call Distribution** — `/admin/analytics/distribution` — `04_ADMIN_PAGES/045_call-distribution.md`
- **Admin · Historical Performance** — `/admin/analytics/historical-performance` — `04_ADMIN_PAGES/046_historical-performance.md`
- **Admin · Gateway Performance** — `/admin/analytics/gateway-performance` — `04_ADMIN_PAGES/047_gateway-performance.md`
- **Admin · Margin Monitor** — `/admin/commercial/margins` — `04_ADMIN_PAGES/055_margin-monitor.md`
- **Admin · Online Admin Users** — `/admin/security/online-users` — `04_ADMIN_PAGES/075_online-admin-users.md`
- **Admin · Support Tickets** — `/admin/support/tickets` — `04_ADMIN_PAGES/092_support-tickets.md`
- **Admin · Notification Policies** — `/admin/notifications/policies` — `04_ADMIN_PAGES/093_notification-policies.md`
- **Admin · Notification Log** — `/admin/notifications/log` — `04_ADMIN_PAGES/094_notification-log.md`

## Phase UI Gate

- All listed page API contracts available or explicitly mocked against frozen schemas.
- Required roles/permissions implemented.
- Source requirements have test IDs.
- Loading/empty/error/degraded states implemented.
- Design tokens and archetypes used consistently.
- Integration/VOS capabilities verified before enabling writes.