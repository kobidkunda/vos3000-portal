export const portalRoutes = [
  {
    "side": "admin",
    "name": "Admin Login",
    "route": "/admin/login",
    "group": "Access & Identity",
    "archetype": "AUTH"
  },
  {
    "side": "admin",
    "name": "MFA Challenge",
    "route": "/admin/mfa",
    "group": "Access & Identity",
    "archetype": "AUTH"
  },
  {
    "side": "admin",
    "name": "Forgot / Reset Password",
    "route": "/admin/forgot-password",
    "group": "Access & Identity",
    "archetype": "AUTH"
  },
  {
    "side": "admin",
    "name": "Admin Sessions & Devices",
    "route": "/admin/settings/sessions",
    "group": "Access & Identity",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Executive Dashboard",
    "route": "/admin",
    "group": "Command Center",
    "archetype": "DASHBOARD"
  },
  {
    "side": "admin",
    "name": "NOC Live Operations",
    "route": "/admin/noc",
    "group": "Command Center",
    "archetype": "LIVE_MONITOR"
  },
  {
    "side": "admin",
    "name": "System Health",
    "route": "/admin/system/health",
    "group": "Command Center",
    "archetype": "LIVE_MONITOR"
  },
  {
    "side": "admin",
    "name": "Alarm Center",
    "route": "/admin/alarms",
    "group": "Command Center",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Customer Directory",
    "route": "/admin/customers",
    "group": "Customers & Accounts",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Create Customer Wizard",
    "route": "/admin/customers/new",
    "group": "Customers & Accounts",
    "archetype": "WIZARD"
  },
  {
    "side": "admin",
    "name": "Customer Overview",
    "route": "/admin/customers/{customerId}",
    "group": "Customers & Accounts",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Customer Account Settings",
    "route": "/admin/customers/{customerId}/account",
    "group": "Customers & Accounts",
    "archetype": "SETTINGS"
  },
  {
    "side": "admin",
    "name": "Customer Balance & Adjustments",
    "route": "/admin/customers/{customerId}/balance",
    "group": "Customers & Accounts",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Customer Packages",
    "route": "/admin/customers/{customerId}/packages",
    "group": "Customers & Accounts",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Customer Authorizations",
    "route": "/admin/customers/{customerId}/authorizations",
    "group": "Customers & Accounts",
    "archetype": "SETTINGS"
  },
  {
    "side": "admin",
    "name": "Agent & Subaccount Tree",
    "route": "/admin/customers/{customerId}/subaccounts",
    "group": "Customers & Accounts",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Customer Number Section Limits",
    "route": "/admin/customers/{customerId}/number-limits",
    "group": "Customers & Accounts",
    "archetype": "SETTINGS"
  },
  {
    "side": "admin",
    "name": "Mapping Gateways",
    "route": "/admin/gateways/mapping",
    "group": "Gateways & Routing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Mapping Gateway Detail",
    "route": "/admin/gateways/mapping/{gatewayId}",
    "group": "Gateways & Routing",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Routing Gateways",
    "route": "/admin/gateways/routing",
    "group": "Gateways & Routing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Routing Gateway Detail",
    "route": "/admin/gateways/routing/{gatewayId}",
    "group": "Gateways & Routing",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Online Gateways",
    "route": "/admin/gateways/online",
    "group": "Gateways & Routing",
    "archetype": "LIVE_MONITOR"
  },
  {
    "side": "admin",
    "name": "Gateway Network Quality",
    "route": "/admin/gateways/network",
    "group": "Gateways & Routing",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Gateway Status Analytics",
    "route": "/admin/gateways/status",
    "group": "Gateways & Routing",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Gateway Groups",
    "route": "/admin/gateway-groups",
    "group": "Gateways & Routing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Registration Management",
    "route": "/admin/registrations",
    "group": "Gateways & Routing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Routing Analysis",
    "route": "/admin/tools/routing-analysis",
    "group": "Gateways & Routing",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "admin",
    "name": "Network Test",
    "route": "/admin/tools/network-test",
    "group": "Gateways & Routing",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "admin",
    "name": "Domain Management",
    "route": "/admin/routing/domains",
    "group": "Gateways & Routing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Prohibited Media IP",
    "route": "/admin/routing/prohibited-media-ips",
    "group": "Gateways & Routing",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Softswitches",
    "route": "/admin/softswitches",
    "group": "Gateways & Routing",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Phone Directory",
    "route": "/admin/phones",
    "group": "Phones & Terminals",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Phone Detail",
    "route": "/admin/phones/{phoneId}",
    "group": "Phones & Terminals",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Online Phones",
    "route": "/admin/phones/online",
    "group": "Phones & Terminals",
    "archetype": "LIVE_MONITOR"
  },
  {
    "side": "admin",
    "name": "Live Calls",
    "route": "/admin/calls/live",
    "group": "Live Calls & Diagnostics",
    "archetype": "LIVE_MONITOR"
  },
  {
    "side": "admin",
    "name": "Live Call Detail",
    "route": "/admin/calls/live/{callId}",
    "group": "Live Calls & Diagnostics",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Call Analysis",
    "route": "/admin/diagnostics/call-analysis",
    "group": "Live Calls & Diagnostics",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Registration Analysis",
    "route": "/admin/diagnostics/registration-analysis",
    "group": "Live Calls & Diagnostics",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Recent CDR",
    "route": "/admin/cdr/recent",
    "group": "CDR & Call Analytics",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "CDR Explorer",
    "route": "/admin/cdr",
    "group": "CDR & Call Analytics",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "CDR Detail",
    "route": "/admin/cdr/{cdrId}",
    "group": "CDR & Call Analytics",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Failure Analytics",
    "route": "/admin/analytics/failures",
    "group": "CDR & Call Analytics",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Connect Analysis",
    "route": "/admin/analytics/connect",
    "group": "CDR & Call Analytics",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Interrupt Analysis",
    "route": "/admin/analytics/interrupt",
    "group": "CDR & Call Analytics",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Call Distribution",
    "route": "/admin/analytics/distribution",
    "group": "CDR & Call Analytics",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Historical Performance",
    "route": "/admin/analytics/historical-performance",
    "group": "CDR & Call Analytics",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Gateway Performance",
    "route": "/admin/analytics/gateway-performance",
    "group": "CDR & Call Analytics",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Rate Groups",
    "route": "/admin/rates/groups",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Rate Editor",
    "route": "/admin/rates/groups/{groupId}",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Rate Import Jobs",
    "route": "/admin/rates/imports",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "admin",
    "name": "Rate Lookup",
    "route": "/admin/rates/lookup",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Package Groups",
    "route": "/admin/packages",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Package Period Rates",
    "route": "/admin/packages/{packageId}/period-rates",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "admin",
    "name": "Package Free Duration",
    "route": "/admin/packages/{packageId}/free-duration",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "admin",
    "name": "Margin Monitor",
    "route": "/admin/commercial/margins",
    "group": "Rates, Packages & Commercial Routing",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Payment Ledger",
    "route": "/admin/payments",
    "group": "Billing, Payments & Settlement",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Manual Payment / Credit",
    "route": "/admin/payments/new",
    "group": "Billing, Payments & Settlement",
    "archetype": "FINANCE_ACTION"
  },
  {
    "side": "admin",
    "name": "Revenue Details",
    "route": "/admin/billing/revenue",
    "group": "Billing, Payments & Settlement",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Gateway Bills",
    "route": "/admin/billing/gateway",
    "group": "Billing, Payments & Settlement",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Phone Bills",
    "route": "/admin/billing/phone",
    "group": "Billing, Payments & Settlement",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Account Balance Report",
    "route": "/admin/billing/account-balance",
    "group": "Billing, Payments & Settlement",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Clearing & Settlement",
    "route": "/admin/settlement",
    "group": "Billing, Payments & Settlement",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Report Center",
    "route": "/admin/reports",
    "group": "Reports",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Gateway Analysis Reports",
    "route": "/admin/reports/gateways",
    "group": "Reports",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Agent Income Report",
    "route": "/admin/reports/agent-income",
    "group": "Reports",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Scheduled Reports",
    "route": "/admin/reports/schedules",
    "group": "Reports",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Number Sections",
    "route": "/admin/numbers/sections",
    "group": "Number Management",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Area Information",
    "route": "/admin/numbers/areas",
    "group": "Number Management",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Number Transform",
    "route": "/admin/numbers/transforms",
    "group": "Number Management",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Black / White List Groups",
    "route": "/admin/numbers/lists",
    "group": "Number Management",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "System White List",
    "route": "/admin/numbers/system-whitelist",
    "group": "Number Management",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Dynamic Black List",
    "route": "/admin/numbers/dynamic-blacklist",
    "group": "Number Management",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Admin Users",
    "route": "/admin/security/users",
    "group": "Admin Users, Roles & Audit",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Roles & Permissions",
    "route": "/admin/security/roles",
    "group": "Admin Users, Roles & Audit",
    "archetype": "SETTINGS"
  },
  {
    "side": "admin",
    "name": "Online Admin Users",
    "route": "/admin/security/online-users",
    "group": "Admin Users, Roles & Audit",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Portal Audit Log",
    "route": "/admin/audit",
    "group": "Admin Users, Roles & Audit",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "VOS System Log",
    "route": "/admin/system/vos-log",
    "group": "Admin Users, Roles & Audit",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "System Parameters",
    "route": "/admin/system/parameters",
    "group": "System & Maintenance",
    "archetype": "SETTINGS"
  },
  {
    "side": "admin",
    "name": "System Information",
    "route": "/admin/system/info",
    "group": "System & Maintenance",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Data Maintenance",
    "route": "/admin/system/data-maintenance",
    "group": "System & Maintenance",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Performance Monitor",
    "route": "/admin/system/performance",
    "group": "System & Maintenance",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Process Monitor",
    "route": "/admin/system/processes",
    "group": "System & Maintenance",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Server Monitor",
    "route": "/admin/system/servers",
    "group": "System & Maintenance",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "admin",
    "name": "Disaster Recovery",
    "route": "/admin/system/disaster-recovery",
    "group": "System & Maintenance",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Work Calendar",
    "route": "/admin/system/work-calendar",
    "group": "System & Maintenance",
    "archetype": "SETTINGS"
  },
  {
    "side": "admin",
    "name": "Portal API Clients",
    "route": "/admin/integrations/api-clients",
    "group": "API, Integrations & Automation",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Webhook Endpoints",
    "route": "/admin/integrations/webhooks",
    "group": "API, Integrations & Automation",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Webhook Delivery Log",
    "route": "/admin/integrations/webhook-deliveries",
    "group": "API, Integrations & Automation",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "VOS Web Access Control",
    "route": "/admin/integrations/vos-access",
    "group": "API, Integrations & Automation",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "VOS Web Service Equipment",
    "route": "/admin/integrations/vos-equipment",
    "group": "API, Integrations & Automation",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Integration Health",
    "route": "/admin/integrations/health",
    "group": "API, Integrations & Automation",
    "archetype": "LIVE_MONITOR"
  },
  {
    "side": "admin",
    "name": "Support Tickets",
    "route": "/admin/support/tickets",
    "group": "Portal Operations",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Notification Policies",
    "route": "/admin/notifications/policies",
    "group": "Portal Operations",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Notification Log",
    "route": "/admin/notifications/log",
    "group": "Portal Operations",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "admin",
    "name": "Payment Providers",
    "route": "/admin/settings/payments",
    "group": "Portal Operations",
    "archetype": "DETAIL"
  },
  {
    "side": "admin",
    "name": "Portal Branding",
    "route": "/admin/settings/branding",
    "group": "Portal Operations",
    "archetype": "SETTINGS"
  },
  {
    "side": "admin",
    "name": "Feature Flags",
    "route": "/admin/settings/features",
    "group": "Portal Operations",
    "archetype": "SETTINGS"
  },
  {
    "side": "client",
    "name": "Client Login",
    "route": "/app/login",
    "group": "Access & Account Security",
    "archetype": "AUTH"
  },
  {
    "side": "client",
    "name": "MFA Setup & Verify",
    "route": "/app/settings/security/mfa",
    "group": "Access & Account Security",
    "archetype": "AUTH"
  },
  {
    "side": "client",
    "name": "Sessions & Devices",
    "route": "/app/settings/security/sessions",
    "group": "Access & Account Security",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Profile & Organization",
    "route": "/app/settings/profile",
    "group": "Access & Account Security",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Client Dashboard",
    "route": "/app",
    "group": "Home & Overview",
    "archetype": "DASHBOARD"
  },
  {
    "side": "client",
    "name": "Service Status",
    "route": "/app/status",
    "group": "Home & Overview",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Balance & Wallet",
    "route": "/app/billing/balance",
    "group": "Balance, Funds & Payments",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Add Funds",
    "route": "/app/billing/add-funds",
    "group": "Balance, Funds & Payments",
    "archetype": "FINANCE_ACTION"
  },
  {
    "side": "client",
    "name": "Payment History",
    "route": "/app/billing/payments",
    "group": "Balance, Funds & Payments",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Payment Detail / Receipt",
    "route": "/app/billing/payments/{paymentId}",
    "group": "Balance, Funds & Payments",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Statements & Billing Summary",
    "route": "/app/billing/statements",
    "group": "Balance, Funds & Payments",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "client",
    "name": "CDR Explorer",
    "route": "/app/cdr",
    "group": "CDR & Call History",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "CDR Detail",
    "route": "/app/cdr/{cdrId}",
    "group": "CDR & Call History",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Recent Calls",
    "route": "/app/cdr/recent",
    "group": "CDR & Call History",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "CDR Export Jobs",
    "route": "/app/cdr/exports",
    "group": "CDR & Call History",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Live Calls",
    "route": "/app/calls/live",
    "group": "Live Calls & Traffic",
    "archetype": "LIVE_MONITOR"
  },
  {
    "side": "client",
    "name": "Traffic Analytics",
    "route": "/app/analytics/traffic",
    "group": "Live Calls & Traffic",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "client",
    "name": "Failure Analytics",
    "route": "/app/analytics/failures",
    "group": "Live Calls & Traffic",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "client",
    "name": "Destination Analytics",
    "route": "/app/analytics/destinations",
    "group": "Live Calls & Traffic",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "client",
    "name": "My Gateways",
    "route": "/app/gateways",
    "group": "Gateways & SIP",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Gateway Detail",
    "route": "/app/gateways/{gatewayId}",
    "group": "Gateways & SIP",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Gateway IP Management",
    "route": "/app/gateways/{gatewayId}/ips",
    "group": "Gateways & SIP",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "client",
    "name": "SIP Credentials",
    "route": "/app/gateways/{gatewayId}/credentials",
    "group": "Gateways & SIP",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "client",
    "name": "Gateway Network Quality",
    "route": "/app/gateways/{gatewayId}/network",
    "group": "Gateways & SIP",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Gateway Call Statistics",
    "route": "/app/gateways/{gatewayId}/statistics",
    "group": "Gateways & SIP",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "My Rate Sheet",
    "route": "/app/rates",
    "group": "Rates & Pricing",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Rate Lookup",
    "route": "/app/rates/lookup",
    "group": "Rates & Pricing",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Rate Change History",
    "route": "/app/rates/history",
    "group": "Rates & Pricing",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Reports Home",
    "route": "/app/reports",
    "group": "Reports & Downloads",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Usage Report",
    "route": "/app/reports/usage",
    "group": "Reports & Downloads",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "client",
    "name": "Gateway Report",
    "route": "/app/reports/gateways",
    "group": "Reports & Downloads",
    "archetype": "ANALYTICS_REPORT"
  },
  {
    "side": "client",
    "name": "Scheduled Reports",
    "route": "/app/reports/schedules",
    "group": "Reports & Downloads",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Downloads",
    "route": "/app/downloads",
    "group": "Reports & Downloads",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Notification Center",
    "route": "/app/notifications",
    "group": "Notifications",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Alert Preferences",
    "route": "/app/settings/notifications",
    "group": "Notifications",
    "archetype": "SETTINGS"
  },
  {
    "side": "client",
    "name": "API Overview",
    "route": "/app/developers",
    "group": "Developer API & Webhooks",
    "archetype": "DASHBOARD"
  },
  {
    "side": "client",
    "name": "API Keys",
    "route": "/app/developers/api-keys",
    "group": "Developer API & Webhooks",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "API Request Logs",
    "route": "/app/developers/logs",
    "group": "Developer API & Webhooks",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Webhook Endpoints",
    "route": "/app/developers/webhooks",
    "group": "Developer API & Webhooks",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Webhook Delivery Log",
    "route": "/app/developers/webhook-deliveries",
    "group": "Developer API & Webhooks",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "Team Members",
    "route": "/app/team",
    "group": "Team & Permissions",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Client Roles",
    "route": "/app/team/roles",
    "group": "Team & Permissions",
    "archetype": "DETAIL"
  },
  {
    "side": "client",
    "name": "Support Tickets",
    "route": "/app/support",
    "group": "Support",
    "archetype": "LIST_TABLE"
  },
  {
    "side": "client",
    "name": "New Support Ticket",
    "route": "/app/support/new",
    "group": "Support",
    "archetype": "EDITOR_FORM"
  },
  {
    "side": "client",
    "name": "Ticket Detail",
    "route": "/app/support/{ticketId}",
    "group": "Support",
    "archetype": "DETAIL"
  }
] as const;
