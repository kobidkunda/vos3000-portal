export const declaredApis = [
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/login"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/mfa/verify"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/password/request"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/password/reset"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/me/sessions"
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/me/sessions/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/dashboard/summary"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/dashboard/timeseries"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/noc/summary"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/noc/stream"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/health"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/alarms"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/alarms/{id}/ack"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/account"
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/customers/{id}/account"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/balance"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers/{id}/adjustments"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/packages"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers/{id}/packages"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/authorizations"
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/customers/{id}/authorizations"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/subaccounts"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/customers/{id}/number-limits"
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/customers/{id}/number-limits"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/mapping"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateways/mapping"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/mapping/{id}"
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/gateways/mapping/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/routing"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateways/routing"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/routing/{id}"
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/gateways/routing/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/online"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/network"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateways/status"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/gateway-groups"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateway-groups"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/registrations"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/registrations"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/tools/routing-analysis"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/tools/network-test"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/domains"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/prohibited-media-ips"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/softswitches"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/phones"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/phones"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/phones/{id}"
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/phones/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/phones/online"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/calls/live"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/calls/live/stream"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/calls/live/{id}"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/calls/live/{id}/disconnect"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/diagnostics/call-analysis/{serial}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/diagnostics/registration-analysis"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/cdr/recent"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/cdr"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/cdr/exports"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/cdr/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/failures"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/connect"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/interrupt"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/distribution"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/historical-performance"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/analytics/gateway-performance"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rates/groups"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rates/groups"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rates/groups/{id}/rates"
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/rates/groups/{id}/rates"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rates/imports"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/rates/lookup"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/packages"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/packages"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/packages/{id}/period-rates"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/packages/{id}/free-duration"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/commercial/margins"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/payments"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/payments"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/revenue"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/gateway"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/phone"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/billing/account-balance"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settlement"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/reports"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/reports/gateways"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/reports/agent-income"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/report-schedules"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/report-schedules"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/sections"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/areas"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/transforms"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/lists"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/system-whitelist"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/numbers/dynamic-blacklist"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/security/users"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/security/users"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/security/roles"
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/security/roles/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/security/online-users"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/audit"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/vos-log"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/parameters"
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/system/parameters/{name}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/info"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/data-maintenance"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/performance"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/processes"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/servers"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/disaster-recovery"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/system/work-calendar"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/api-clients"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/integrations/api-clients"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/webhooks"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/integrations/webhooks"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/webhook-deliveries"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/vos-access"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/vos-equipment"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/integrations/health"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/support/tickets"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/notification-policies"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/notifications/log"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/payments"
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/settings/payments/{provider}"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/branding"
  },
  {
    "method": "GET",
    "path": "/api/v1/admin/settings/features"
  },
  {
    "method": "POST",
    "path": "/api/v1/auth/login"
  },
  {
    "method": "POST",
    "path": "/api/v1/me/mfa"
  },
  {
    "method": "GET",
    "path": "/api/v1/me/sessions"
  },
  {
    "method": "DELETE",
    "path": "/api/v1/me/sessions/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/me/profile"
  },
  {
    "method": "PATCH",
    "path": "/api/v1/me/profile"
  },
  {
    "method": "GET",
    "path": "/api/v1/dashboard/summary"
  },
  {
    "method": "GET",
    "path": "/api/v1/dashboard/timeseries"
  },
  {
    "method": "GET",
    "path": "/api/v1/status"
  },
  {
    "method": "GET",
    "path": "/api/v1/balance"
  },
  {
    "method": "POST",
    "path": "/api/v1/deposits"
  },
  {
    "method": "GET",
    "path": "/api/v1/deposits/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/payments"
  },
  {
    "method": "GET",
    "path": "/api/v1/payments/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/billing/statements"
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr"
  },
  {
    "method": "POST",
    "path": "/api/v1/cdr/exports"
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr/recent"
  },
  {
    "method": "GET",
    "path": "/api/v1/cdr/exports"
  },
  {
    "method": "GET",
    "path": "/api/v1/calls/live"
  },
  {
    "method": "GET",
    "path": "/api/v1/calls/live/stream"
  },
  {
    "method": "GET",
    "path": "/api/v1/analytics/traffic"
  },
  {
    "method": "GET",
    "path": "/api/v1/analytics/failures"
  },
  {
    "method": "GET",
    "path": "/api/v1/analytics/destinations"
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways"
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}"
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/ips"
  },
  {
    "method": "PUT",
    "path": "/api/v1/gateways/{id}/ips"
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/credentials"
  },
  {
    "method": "POST",
    "path": "/api/v1/gateways/{id}/credentials/rotate"
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/network"
  },
  {
    "method": "GET",
    "path": "/api/v1/gateways/{id}/statistics"
  },
  {
    "method": "GET",
    "path": "/api/v1/rates"
  },
  {
    "method": "GET",
    "path": "/api/v1/rates/lookup"
  },
  {
    "method": "GET",
    "path": "/api/v1/rates/history"
  },
  {
    "method": "GET",
    "path": "/api/v1/reports"
  },
  {
    "method": "GET",
    "path": "/api/v1/reports/usage"
  },
  {
    "method": "GET",
    "path": "/api/v1/reports/gateways"
  },
  {
    "method": "GET",
    "path": "/api/v1/report-schedules"
  },
  {
    "method": "POST",
    "path": "/api/v1/report-schedules"
  },
  {
    "method": "GET",
    "path": "/api/v1/downloads"
  },
  {
    "method": "GET",
    "path": "/api/v1/notifications"
  },
  {
    "method": "GET",
    "path": "/api/v1/me/notification-preferences"
  },
  {
    "method": "PUT",
    "path": "/api/v1/me/notification-preferences"
  },
  {
    "method": "GET",
    "path": "/api/v1/developer/overview"
  },
  {
    "method": "GET",
    "path": "/api/v1/api-keys"
  },
  {
    "method": "POST",
    "path": "/api/v1/api-keys"
  },
  {
    "method": "GET",
    "path": "/api/v1/developer/request-logs"
  },
  {
    "method": "GET",
    "path": "/api/v1/webhooks"
  },
  {
    "method": "POST",
    "path": "/api/v1/webhooks"
  },
  {
    "method": "GET",
    "path": "/api/v1/webhook-deliveries"
  },
  {
    "method": "GET",
    "path": "/api/v1/team"
  },
  {
    "method": "POST",
    "path": "/api/v1/team/invitations"
  },
  {
    "method": "GET",
    "path": "/api/v1/team/roles"
  },
  {
    "method": "GET",
    "path": "/api/v1/support/tickets"
  },
  {
    "method": "POST",
    "path": "/api/v1/support/tickets"
  },
  {
    "method": "GET",
    "path": "/api/v1/support/tickets/{id}"
  },
  {
    "method": "POST",
    "path": "/api/v1/support/tickets/{id}/messages"
  }
] as const;
