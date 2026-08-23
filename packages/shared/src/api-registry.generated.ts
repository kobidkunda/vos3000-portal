// Generated from the 142-page product route manifest. Do not edit by hand.
export type ProductApiMethod = "GET"|"POST"|"PUT"|"PATCH"|"DELETE";
export interface ProductApiDefinition { method:ProductApiMethod; path:string; sides:readonly ("Admin"|"Client")[]; pages:readonly string[]; pageRoutes:readonly string[]; }
export const productApis = [
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/registration",
    "sides": ["Admin"],
    "pages": ["Registration Settings"],
    "pageRoutes": ["/admin/settings/registration"]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/settings/registration",
    "sides": ["Admin"],
    "pages": ["Registration Settings"],
    "pageRoutes": ["/admin/settings/registration"]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/alarms",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Alarm Center"
    ],
    "pageRoutes": [
      "/admin/alarms"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/alarms/{id}/ack",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Alarm Center"
    ],
    "pageRoutes": [
      "/admin/alarms"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/connect",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Connect Analysis"
    ],
    "pageRoutes": [
      "/admin/analytics/connect"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/distribution",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Call Distribution"
    ],
    "pageRoutes": [
      "/admin/analytics/distribution"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/failures",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Failure Analytics"
    ],
    "pageRoutes": [
      "/admin/analytics/failures"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/gateway-performance",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Gateway Performance"
    ],
    "pageRoutes": [
      "/admin/analytics/gateway-performance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/historical-performance",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Historical Performance"
    ],
    "pageRoutes": [
      "/admin/analytics/historical-performance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/interrupt",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Interrupt Analysis"
    ],
    "pageRoutes": [
      "/admin/analytics/interrupt"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/audit",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Portal Audit Log"
    ],
    "pageRoutes": [
      "/admin/audit"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/login",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Admin Login"
    ],
    "pageRoutes": [
      "/admin/login"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/mfa/verify",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Admin Login",
      "MFA Challenge"
    ],
    "pageRoutes": [
      "/admin/login",
      "/admin/mfa"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/password/request",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Forgot / Reset Password"
    ],
    "pageRoutes": [
      "/admin/forgot-password"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/password/reset",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Forgot / Reset Password"
    ],
    "pageRoutes": [
      "/admin/forgot-password"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/account-balance",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Account Balance Report"
    ],
    "pageRoutes": [
      "/admin/billing/account-balance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/gateway",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Gateway Bills"
    ],
    "pageRoutes": [
      "/admin/billing/gateway"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/phone",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Phone Bills"
    ],
    "pageRoutes": [
      "/admin/billing/phone"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/revenue",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Revenue Details"
    ],
    "pageRoutes": [
      "/admin/billing/revenue"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/calls/live",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Live Calls"
    ],
    "pageRoutes": [
      "/admin/calls/live"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/calls/live/stream",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Live Calls"
    ],
    "pageRoutes": [
      "/admin/calls/live"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/calls/live/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Live Call Detail"
    ],
    "pageRoutes": [
      "/admin/calls/live/{callId}"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/calls/live/{id}/disconnect",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Live Call Detail"
    ],
    "pageRoutes": [
      "/admin/calls/live/{callId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/cdr",
    "sides": [
      "Admin"
    ],
    "pages": [
      "CDR Explorer"
    ],
    "pageRoutes": [
      "/admin/cdr"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/cdr/exports",
    "sides": [
      "Admin"
    ],
    "pages": [
      "CDR Explorer"
    ],
    "pageRoutes": [
      "/admin/cdr"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/cdr/recent",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Recent CDR"
    ],
    "pageRoutes": [
      "/admin/cdr/recent"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/cdr/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "CDR Detail"
    ],
    "pageRoutes": [
      "/admin/cdr/{cdrId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/commercial/margins",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Margin Monitor"
    ],
    "pageRoutes": [
      "/admin/commercial/margins"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Directory"
    ],
    "pageRoutes": [
      "/admin/customers"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Create Customer Wizard",
      "Customer Directory"
    ],
    "pageRoutes": [
      "/admin/customers",
      "/admin/customers/new"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Overview"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/account",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Account Settings"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/account"
    ]
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/customers/{id}/account",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Account Settings"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/account"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers/{id}/adjustments",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Balance & Adjustments"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/balance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/authorizations",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Authorizations"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/authorizations"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/customers/{id}/authorizations",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Authorizations"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/authorizations"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/balance",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Balance & Adjustments"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/balance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/number-limits",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Number Section Limits"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/number-limits"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/customers/{id}/number-limits",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Number Section Limits"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/number-limits"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/packages",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Packages"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/packages"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers/{id}/packages",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Customer Packages"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/packages"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/subaccounts",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Agent & Subaccount Tree"
    ],
    "pageRoutes": [
      "/admin/customers/{customerId}/subaccounts"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/dashboard/summary",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Executive Dashboard"
    ],
    "pageRoutes": [
      "/admin"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/dashboard/timeseries",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Executive Dashboard"
    ],
    "pageRoutes": [
      "/admin"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/diagnostics/call-analysis/{serial}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Call Analysis"
    ],
    "pageRoutes": [
      "/admin/diagnostics/call-analysis"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/diagnostics/registration-analysis",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Registration Analysis"
    ],
    "pageRoutes": [
      "/admin/diagnostics/registration-analysis"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/domains",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Domain Management"
    ],
    "pageRoutes": [
      "/admin/routing/domains"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateway-groups",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Gateway Groups"
    ],
    "pageRoutes": [
      "/admin/gateway-groups"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateway-groups",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Gateway Groups"
    ],
    "pageRoutes": [
      "/admin/gateway-groups"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/mapping",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Mapping Gateways"
    ],
    "pageRoutes": [
      "/admin/gateways/mapping"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateways/mapping",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Mapping Gateways"
    ],
    "pageRoutes": [
      "/admin/gateways/mapping"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/mapping/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Mapping Gateway Detail"
    ],
    "pageRoutes": [
      "/admin/gateways/mapping/{gatewayId}"
    ]
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/gateways/mapping/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Mapping Gateway Detail"
    ],
    "pageRoutes": [
      "/admin/gateways/mapping/{gatewayId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/network",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Gateway Network Quality"
    ],
    "pageRoutes": [
      "/admin/gateways/network"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/online",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Online Gateways"
    ],
    "pageRoutes": [
      "/admin/gateways/online"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/routing",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Routing Gateways"
    ],
    "pageRoutes": [
      "/admin/gateways/routing"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateways/routing",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Routing Gateways"
    ],
    "pageRoutes": [
      "/admin/gateways/routing"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/routing/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Routing Gateway Detail"
    ],
    "pageRoutes": [
      "/admin/gateways/routing/{gatewayId}"
    ]
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/gateways/routing/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Routing Gateway Detail"
    ],
    "pageRoutes": [
      "/admin/gateways/routing/{gatewayId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/status",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Gateway Status Analytics"
    ],
    "pageRoutes": [
      "/admin/gateways/status"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/api-clients",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Portal API Clients"
    ],
    "pageRoutes": [
      "/admin/integrations/api-clients"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/integrations/api-clients",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Portal API Clients"
    ],
    "pageRoutes": [
      "/admin/integrations/api-clients"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/health",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Integration Health"
    ],
    "pageRoutes": [
      "/admin/integrations/health"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/vos-access",
    "sides": [
      "Admin"
    ],
    "pages": [
      "VOS Web Access Control"
    ],
    "pageRoutes": [
      "/admin/integrations/vos-access"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/vos-equipment",
    "sides": [
      "Admin"
    ],
    "pages": [
      "VOS Web Service Equipment"
    ],
    "pageRoutes": [
      "/admin/integrations/vos-equipment"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/webhook-deliveries",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Webhook Delivery Log"
    ],
    "pageRoutes": [
      "/admin/integrations/webhook-deliveries"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/webhooks",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Webhook Endpoints"
    ],
    "pageRoutes": [
      "/admin/integrations/webhooks"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/integrations/webhooks",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Webhook Endpoints"
    ],
    "pageRoutes": [
      "/admin/integrations/webhooks"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/me/sessions",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Admin Sessions & Devices"
    ],
    "pageRoutes": [
      "/admin/settings/sessions"
    ]
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/me/sessions/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Admin Sessions & Devices"
    ],
    "pageRoutes": [
      "/admin/settings/sessions"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/noc/stream",
    "sides": [
      "Admin"
    ],
    "pages": [
      "NOC Live Operations"
    ],
    "pageRoutes": [
      "/admin/noc"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/noc/summary",
    "sides": [
      "Admin"
    ],
    "pages": [
      "NOC Live Operations"
    ],
    "pageRoutes": [
      "/admin/noc"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/notification-policies",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Notification Policies"
    ],
    "pageRoutes": [
      "/admin/notifications/policies"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/notifications/log",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Notification Log"
    ],
    "pageRoutes": [
      "/admin/notifications/log"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/areas",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Area Information"
    ],
    "pageRoutes": [
      "/admin/numbers/areas"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/dynamic-blacklist",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Dynamic Black List"
    ],
    "pageRoutes": [
      "/admin/numbers/dynamic-blacklist"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/lists",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Black / White List Groups"
    ],
    "pageRoutes": [
      "/admin/numbers/lists"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/sections",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Number Sections"
    ],
    "pageRoutes": [
      "/admin/numbers/sections"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/system-whitelist",
    "sides": [
      "Admin"
    ],
    "pages": [
      "System White List"
    ],
    "pageRoutes": [
      "/admin/numbers/system-whitelist"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/transforms",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Number Transform"
    ],
    "pageRoutes": [
      "/admin/numbers/transforms"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/packages",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Package Groups"
    ],
    "pageRoutes": [
      "/admin/packages"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/packages",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Package Groups"
    ],
    "pageRoutes": [
      "/admin/packages"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/packages/{id}/free-duration",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Package Free Duration"
    ],
    "pageRoutes": [
      "/admin/packages/{packageId}/free-duration"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/packages/{id}/period-rates",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Package Period Rates"
    ],
    "pageRoutes": [
      "/admin/packages/{packageId}/period-rates"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/payments",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Payment Ledger"
    ],
    "pageRoutes": [
      "/admin/payments"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/payments",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Manual Payment / Credit"
    ],
    "pageRoutes": [
      "/admin/payments/new"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/phones",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Phone Directory"
    ],
    "pageRoutes": [
      "/admin/phones"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/phones",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Phone Directory"
    ],
    "pageRoutes": [
      "/admin/phones"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/phones/online",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Online Phones"
    ],
    "pageRoutes": [
      "/admin/phones/online"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/phones/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Phone Detail"
    ],
    "pageRoutes": [
      "/admin/phones/{phoneId}"
    ]
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/phones/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Phone Detail"
    ],
    "pageRoutes": [
      "/admin/phones/{phoneId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/prohibited-media-ips",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Prohibited Media IP"
    ],
    "pageRoutes": [
      "/admin/routing/prohibited-media-ips"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rates/groups",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Rate Groups"
    ],
    "pageRoutes": [
      "/admin/rates/groups"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rates/groups",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Rate Groups"
    ],
    "pageRoutes": [
      "/admin/rates/groups"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rates/groups/{id}/rates",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Rate Editor"
    ],
    "pageRoutes": [
      "/admin/rates/groups/{groupId}"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/rates/groups/{id}/rates",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Rate Editor"
    ],
    "pageRoutes": [
      "/admin/rates/groups/{groupId}"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rates/imports",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Rate Import Jobs"
    ],
    "pageRoutes": [
      "/admin/rates/imports"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rates/lookup",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Rate Lookup"
    ],
    "pageRoutes": [
      "/admin/rates/lookup"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/registrations",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Registration Management"
    ],
    "pageRoutes": [
      "/admin/registrations"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/registrations",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Registration Management"
    ],
    "pageRoutes": [
      "/admin/registrations"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/report-schedules",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Scheduled Reports"
    ],
    "pageRoutes": [
      "/admin/reports/schedules"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/report-schedules",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Scheduled Reports"
    ],
    "pageRoutes": [
      "/admin/reports/schedules"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/reports",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Report Center"
    ],
    "pageRoutes": [
      "/admin/reports"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/reports/agent-income",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Agent Income Report"
    ],
    "pageRoutes": [
      "/admin/reports/agent-income"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/reports/gateways",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Gateway Analysis Reports"
    ],
    "pageRoutes": [
      "/admin/reports/gateways"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/security/online-users",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Online Admin Users"
    ],
    "pageRoutes": [
      "/admin/security/online-users"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/security/roles",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Roles & Permissions"
    ],
    "pageRoutes": [
      "/admin/security/roles"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/security/roles/{id}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Roles & Permissions"
    ],
    "pageRoutes": [
      "/admin/security/roles"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/security/users",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Admin Users"
    ],
    "pageRoutes": [
      "/admin/security/users"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/security/users",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Admin Users"
    ],
    "pageRoutes": [
      "/admin/security/users"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/branding",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Portal Branding"
    ],
    "pageRoutes": [
      "/admin/settings/branding"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/features",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Feature Flags"
    ],
    "pageRoutes": [
      "/admin/settings/features"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/payments",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Payment Providers"
    ],
    "pageRoutes": [
      "/admin/settings/payments"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/settings/payments/{provider}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Payment Providers"
    ],
    "pageRoutes": [
      "/admin/settings/payments"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settlement",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Clearing & Settlement"
    ],
    "pageRoutes": [
      "/admin/settlement"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/softswitches",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Softswitches"
    ],
    "pageRoutes": [
      "/admin/softswitches"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/support/tickets",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Support Tickets"
    ],
    "pageRoutes": [
      "/admin/support/tickets"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/data-maintenance",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Data Maintenance"
    ],
    "pageRoutes": [
      "/admin/system/data-maintenance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/disaster-recovery",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Disaster Recovery"
    ],
    "pageRoutes": [
      "/admin/system/disaster-recovery"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/health",
    "sides": [
      "Admin"
    ],
    "pages": [
      "System Health"
    ],
    "pageRoutes": [
      "/admin/system/health"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/info",
    "sides": [
      "Admin"
    ],
    "pages": [
      "System Information"
    ],
    "pageRoutes": [
      "/admin/system/info"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/parameters",
    "sides": [
      "Admin"
    ],
    "pages": [
      "System Parameters"
    ],
    "pageRoutes": [
      "/admin/system/parameters"
    ]
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/system/parameters/{name}",
    "sides": [
      "Admin"
    ],
    "pages": [
      "System Parameters"
    ],
    "pageRoutes": [
      "/admin/system/parameters"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/performance",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Performance Monitor"
    ],
    "pageRoutes": [
      "/admin/system/performance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/processes",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Process Monitor"
    ],
    "pageRoutes": [
      "/admin/system/processes"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/servers",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Server Monitor"
    ],
    "pageRoutes": [
      "/admin/system/servers"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/vos-log",
    "sides": [
      "Admin"
    ],
    "pages": [
      "VOS System Log"
    ],
    "pageRoutes": [
      "/admin/system/vos-log"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/work-calendar",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Work Calendar"
    ],
    "pageRoutes": [
      "/admin/system/work-calendar"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/tools/network-test",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Network Test"
    ],
    "pageRoutes": [
      "/admin/tools/network-test"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/tools/routing-analysis",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Routing Analysis"
    ],
    "pageRoutes": [
      "/admin/tools/routing-analysis"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/analytics/destinations",
    "sides": [
      "Client"
    ],
    "pages": [
      "Destination Analytics"
    ],
    "pageRoutes": [
      "/app/analytics/destinations"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/analytics/failures",
    "sides": [
      "Client"
    ],
    "pages": [
      "Failure Analytics"
    ],
    "pageRoutes": [
      "/app/analytics/failures"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/analytics/traffic",
    "sides": [
      "Client"
    ],
    "pages": [
      "Traffic Analytics"
    ],
    "pageRoutes": [
      "/app/analytics/traffic"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/api-keys",
    "sides": [
      "Client"
    ],
    "pages": [
      "API Keys"
    ],
    "pageRoutes": [
      "/app/developers/api-keys"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/api-keys",
    "sides": [
      "Client"
    ],
    "pages": [
      "API Keys"
    ],
    "pageRoutes": [
      "/app/developers/api-keys"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/auth/login",
    "sides": [
      "Client"
    ],
    "pages": [
      "Client Login"
    ],
    "pageRoutes": [
      "/app/login"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/balance",
    "sides": [
      "Client"
    ],
    "pages": [
      "Balance & Wallet"
    ],
    "pageRoutes": [
      "/app/billing/balance"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/billing/statements",
    "sides": [
      "Client"
    ],
    "pages": [
      "Statements & Billing Summary"
    ],
    "pageRoutes": [
      "/app/billing/statements"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/calls/live",
    "sides": [
      "Client"
    ],
    "pages": [
      "Live Calls"
    ],
    "pageRoutes": [
      "/app/calls/live"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/calls/live/stream",
    "sides": [
      "Client"
    ],
    "pages": [
      "Live Calls"
    ],
    "pageRoutes": [
      "/app/calls/live"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr",
    "sides": [
      "Client"
    ],
    "pages": [
      "CDR Explorer"
    ],
    "pageRoutes": [
      "/app/cdr"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr/exports",
    "sides": [
      "Client"
    ],
    "pages": [
      "CDR Export Jobs"
    ],
    "pageRoutes": [
      "/app/cdr/exports"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/cdr/exports",
    "sides": [
      "Client"
    ],
    "pages": [
      "CDR Explorer"
    ],
    "pageRoutes": [
      "/app/cdr"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr/recent",
    "sides": [
      "Client"
    ],
    "pages": [
      "Recent Calls"
    ],
    "pageRoutes": [
      "/app/cdr/recent"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr/{id}",
    "sides": [
      "Client"
    ],
    "pages": [
      "CDR Detail"
    ],
    "pageRoutes": [
      "/app/cdr/{cdrId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/dashboard/summary",
    "sides": [
      "Client"
    ],
    "pages": [
      "Client Dashboard"
    ],
    "pageRoutes": [
      "/app"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/dashboard/timeseries",
    "sides": [
      "Client"
    ],
    "pages": [
      "Client Dashboard"
    ],
    "pageRoutes": [
      "/app"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/deposits",
    "sides": [
      "Client"
    ],
    "pages": [
      "Add Funds"
    ],
    "pageRoutes": [
      "/app/billing/add-funds"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/deposits/{id}",
    "sides": [
      "Client"
    ],
    "pages": [
      "Add Funds"
    ],
    "pageRoutes": [
      "/app/billing/add-funds"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/developer/overview",
    "sides": [
      "Client"
    ],
    "pages": [
      "API Overview"
    ],
    "pageRoutes": [
      "/app/developers"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/developer/request-logs",
    "sides": [
      "Client"
    ],
    "pages": [
      "API Request Logs"
    ],
    "pageRoutes": [
      "/app/developers/logs"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/downloads",
    "sides": [
      "Client"
    ],
    "pages": [
      "Downloads"
    ],
    "pageRoutes": [
      "/app/downloads"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways",
    "sides": [
      "Client"
    ],
    "pages": [
      "My Gateways"
    ],
    "pageRoutes": [
      "/app/gateways"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}",
    "sides": [
      "Client"
    ],
    "pages": [
      "Gateway Detail"
    ],
    "pageRoutes": [
      "/app/gateways/{gatewayId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/credentials",
    "sides": [
      "Client"
    ],
    "pages": [
      "SIP Credentials"
    ],
    "pageRoutes": [
      "/app/gateways/{gatewayId}/credentials"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/gateways/{id}/credentials/rotate",
    "sides": [
      "Client"
    ],
    "pages": [
      "SIP Credentials"
    ],
    "pageRoutes": [
      "/app/gateways/{gatewayId}/credentials"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/ips",
    "sides": [
      "Client"
    ],
    "pages": [
      "Gateway IP Management"
    ],
    "pageRoutes": [
      "/app/gateways/{gatewayId}/ips"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/gateways/{id}/ips",
    "sides": [
      "Client"
    ],
    "pages": [
      "Gateway IP Management"
    ],
    "pageRoutes": [
      "/app/gateways/{gatewayId}/ips"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/network",
    "sides": [
      "Client"
    ],
    "pages": [
      "Gateway Network Quality"
    ],
    "pageRoutes": [
      "/app/gateways/{gatewayId}/network"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/statistics",
    "sides": [
      "Client"
    ],
    "pages": [
      "Gateway Call Statistics"
    ],
    "pageRoutes": [
      "/app/gateways/{gatewayId}/statistics"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/me/mfa",
    "sides": [
      "Client"
    ],
    "pages": [
      "MFA Setup & Verify"
    ],
    "pageRoutes": [
      "/app/settings/security/mfa"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/me/notification-preferences",
    "sides": [
      "Client"
    ],
    "pages": [
      "Alert Preferences"
    ],
    "pageRoutes": [
      "/app/settings/notifications"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/me/notification-preferences",
    "sides": [
      "Client"
    ],
    "pages": [
      "Alert Preferences"
    ],
    "pageRoutes": [
      "/app/settings/notifications"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/me/profile",
    "sides": [
      "Client"
    ],
    "pages": [
      "Profile & Organization"
    ],
    "pageRoutes": [
      "/app/settings/profile"
    ]
  },
  {
    "method": "PATCH",
    "path": "/api/v1/me/profile",
    "sides": [
      "Client"
    ],
    "pages": [
      "Profile & Organization"
    ],
    "pageRoutes": [
      "/app/settings/profile"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/notifications",
    "sides": [
      "Client"
    ],
    "pages": [
      "Notification Center"
    ],
    "pageRoutes": [
      "/app/notifications"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/payments",
    "sides": [
      "Client"
    ],
    "pages": [
      "Payment History"
    ],
    "pageRoutes": [
      "/app/billing/payments"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/payments/{id}",
    "sides": [
      "Client"
    ],
    "pages": [
      "Payment Detail / Receipt"
    ],
    "pageRoutes": [
      "/app/billing/payments/{paymentId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/rates",
    "sides": [
      "Client"
    ],
    "pages": [
      "My Rate Sheet"
    ],
    "pageRoutes": [
      "/app/rates"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/rates/history",
    "sides": [
      "Client"
    ],
    "pages": [
      "Rate Change History"
    ],
    "pageRoutes": [
      "/app/rates/history"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/rates/lookup",
    "sides": [
      "Client"
    ],
    "pages": [
      "Rate Lookup"
    ],
    "pageRoutes": [
      "/app/rates/lookup"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/report-schedules",
    "sides": [
      "Client"
    ],
    "pages": [
      "Scheduled Reports"
    ],
    "pageRoutes": [
      "/app/reports/schedules"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/report-schedules",
    "sides": [
      "Client"
    ],
    "pages": [
      "Scheduled Reports"
    ],
    "pageRoutes": [
      "/app/reports/schedules"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/reports",
    "sides": [
      "Client"
    ],
    "pages": [
      "Reports Home"
    ],
    "pageRoutes": [
      "/app/reports"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/reports/gateways",
    "sides": [
      "Client"
    ],
    "pages": [
      "Gateway Report"
    ],
    "pageRoutes": [
      "/app/reports/gateways"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/reports/usage",
    "sides": [
      "Client"
    ],
    "pages": [
      "Usage Report"
    ],
    "pageRoutes": [
      "/app/reports/usage"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/support/tickets",
    "sides": [
      "Client"
    ],
    "pages": [
      "Support Tickets"
    ],
    "pageRoutes": [
      "/app/support"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/support/tickets",
    "sides": [
      "Client"
    ],
    "pages": [
      "New Support Ticket"
    ],
    "pageRoutes": [
      "/app/support/new"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/support/tickets/{id}",
    "sides": [
      "Client"
    ],
    "pages": [
      "Ticket Detail"
    ],
    "pageRoutes": [
      "/app/support/{ticketId}"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/support/tickets/{id}/messages",
    "sides": [
      "Client"
    ],
    "pages": [
      "Ticket Detail"
    ],
    "pageRoutes": [
      "/app/support/{ticketId}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/team",
    "sides": [
      "Client"
    ],
    "pages": [
      "Team Members"
    ],
    "pageRoutes": [
      "/app/team"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/team/invitations",
    "sides": [
      "Client"
    ],
    "pages": [
      "Team Members"
    ],
    "pageRoutes": [
      "/app/team"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/team/roles",
    "sides": [
      "Client"
    ],
    "pages": [
      "Client Roles"
    ],
    "pageRoutes": [
      "/app/team/roles"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/webhook-deliveries",
    "sides": [
      "Client"
    ],
    "pages": [
      "Webhook Delivery Log"
    ],
    "pageRoutes": [
      "/app/developers/webhook-deliveries"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/webhooks",
    "sides": [
      "Client"
    ],
    "pages": [
      "Webhook Endpoints"
    ],
    "pageRoutes": [
      "/app/developers/webhooks"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/webhooks",
    "sides": [
      "Client"
    ],
    "pages": [
      "Webhook Endpoints"
    ],
    "pageRoutes": [
      "/app/developers/webhooks"
    ]
  }
  ,
  {
    "method": "GET",
    "path": "/api/v1/devices/setup/devices",
    "sides": [
      "Client"
    ],
    "pages": [
      "Device Setup Hub"
    ],
    "pageRoutes": [
      "/app/devices/setup"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/devices/setup/instructions",
    "sides": [
      "Client"
    ],
    "pages": [
      "Device Configuration Guide"
    ],
    "pageRoutes": [
      "/app/devices/setup/{deviceKey}"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/devices/setup/verify",
    "sides": [
      "Client"
    ],
    "pages": [
      "Device Configuration Guide"
    ],
    "pageRoutes": [
      "/app/devices/setup/{deviceKey}"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/devices/setup/copy-event",
    "sides": [
      "Client"
    ],
    "pages": [
      "Device Configuration Guide"
    ],
    "pageRoutes": [
      "/app/devices/setup/{deviceKey}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/devices/setup/devices",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Device Setup Hub"
    ],
    "pageRoutes": [
      "/admin/devices/setup"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/devices/setup/instructions",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Device Configuration Guide"
    ],
    "pageRoutes": [
      "/admin/devices/setup/{deviceKey}"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/devices/setup/verify",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Device Configuration Guide"
    ],
    "pageRoutes": [
      "/admin/devices/setup/{deviceKey}"
    ]
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/support",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Support Settings"
    ],
    "pageRoutes": [
      "/admin/settings/support"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/settings/support",
    "sides": [
      "Admin"
    ],
    "pages": [
      "Support Settings"
    ],
    "pageRoutes": [
      "/admin/settings/support"
    ]
  }
] as const satisfies readonly ProductApiDefinition[];

const clean=(v:string)=>v.split("?")[0].replace(/\/$/,"")||"/";
export function apiPathMatches(pattern:string,actual:string){
 const p=clean(pattern).split("/").filter(Boolean), a=clean(actual).split("/").filter(Boolean);
 return p.length===a.length && p.every((s,i)=>/^\{[^}]+\}$/.test(s)||s===a[i]);
}
export function findProductApi(method:string,path:string){ return productApis.find(x=>x.method===method.toUpperCase()&&apiPathMatches(x.path,path)); }
