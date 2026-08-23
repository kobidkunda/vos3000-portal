// Explicit Portal API action schemas derived from the product specification.
export type ActionFieldType="text"|"email"|"password"|"number"|"date"|"select"|"textarea"|"json"|"boolean";
export interface ActionField {name:string;label:string;type:ActionFieldType;required?:boolean;options?:readonly string[];secret?:boolean;}
export interface ActionSchema {method:"POST"|"PUT"|"PATCH"|"DELETE";path:string;title:string;fields:readonly ActionField[];handler:string;resource?:string;vosOperation?:string;danger?:boolean;idempotent?:boolean;pathParams?:readonly string[];}
export const actionSchemas = [
  {
    "method": "POST",
    "path": "/api/v1/admin/alarms/{id}/ack",
    "title": "Acknowledge alarm",
    "fields": [
      {
        "name": "note",
        "label": "Acknowledgement note",
        "type": "textarea",
        "required": false
      }
    ],
    "handler": "portal",
    "resource": "alarm_ack",
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/login",
    "title": "Admin sign in",
    "fields": [
      {
        "name": "email",
        "label": "Email",
        "type": "email",
        "required": true
      },
      {
        "name": "password",
        "label": "Password",
        "type": "password",
        "required": true,
        "secret": true
      }
    ],
    "handler": "auth"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/mfa/verify",
    "title": "Verify MFA",
    "fields": [
      {
        "name": "ticket",
        "label": "MFA ticket",
        "type": "text",
        "required": true,
        "secret": true
      },
      {
        "name": "code",
        "label": "Authenticator / recovery code",
        "type": "text",
        "required": true
      }
    ],
    "handler": "auth"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/password/request",
    "title": "Request password reset",
    "fields": [
      {
        "name": "email",
        "label": "Email",
        "type": "email",
        "required": true
      }
    ],
    "handler": "auth"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/auth/password/reset",
    "title": "Reset password",
    "fields": [
      {
        "name": "token",
        "label": "Reset token",
        "type": "text",
        "required": true,
        "secret": true
      },
      {
        "name": "password",
        "label": "New password",
        "type": "password",
        "required": true,
        "secret": true
      }
    ],
    "handler": "auth",
    "danger": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/calls/live/{id}/disconnect",
    "title": "Disconnect live call",
    "fields": [
      {
        "name": "reason",
        "label": "Operator reason",
        "type": "textarea",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "disconnectCall",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/cdr/exports",
    "title": "Create admin CDR export",
    "fields": [
      {
        "name": "from",
        "label": "From",
        "type": "date",
        "required": true
      },
      {
        "name": "to",
        "label": "To",
        "type": "date",
        "required": true
      },
      {
        "name": "format",
        "label": "Format",
        "type": "select",
        "required": true,
        "options": [
          "csv",
          "csv.gz",
          "parquet"
        ]
      },
      {
        "name": "filters",
        "label": "Additional filters",
        "type": "json",
        "required": false
      }
    ],
    "handler": "report",
    "resource": "cdr_export"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers",
    "title": "Create customer",
    "fields": [
      {
        "name": "organizationName",
        "label": "Organization / customer name",
        "type": "text",
        "required": true
      },
      {
        "name": "ownerEmail",
        "label": "Portal owner email",
        "type": "email",
        "required": true
      },
      {
        "name": "vosAccountId",
        "label": "Existing VOS account ID",
        "type": "text",
        "required": false
      },
      {
        "name": "currency",
        "label": "Currency",
        "type": "text",
        "required": true
      },
      {
        "name": "overdraftLimit",
        "label": "Credit / overdraft limit",
        "type": "number",
        "required": false
      },
      {
        "name": "expiresAt",
        "label": "Expiry date",
        "type": "date",
        "required": false
      },
      {
        "name": "rateGroupId",
        "label": "Rate group ID",
        "type": "text",
        "required": false
      },
      {
        "name": "lineLimit",
        "label": "Default channels",
        "type": "number",
        "required": false
      },
      {
        "name": "cpsLimit",
        "label": "Default CPS",
        "type": "number",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createAccount",
    "danger": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/customers/{id}/account",
    "title": "Update customer account",
    "fields": [
      {
        "name": "accountName",
        "label": "Account name",
        "type": "text",
        "required": false
      },
      {
        "name": "overdraftLimit",
        "label": "Credit / overdraft limit",
        "type": "number",
        "required": false
      },
      {
        "name": "rateGroupId",
        "label": "Billing rate group",
        "type": "text",
        "required": false
      },
      {
        "name": "expiresAt",
        "label": "Expiry date",
        "type": "date",
        "required": false
      },
      {
        "name": "status",
        "label": "Status",
        "type": "select",
        "required": false,
        "options": [
          "normal",
          "locked"
        ]
      },
      {
        "name": "memo",
        "label": "Memo",
        "type": "textarea",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "updateAccount",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers/{id}/adjustments",
    "title": "Customer balance adjustment",
    "fields": [
      {
        "name": "type",
        "label": "Adjustment type",
        "type": "select",
        "required": true,
        "options": [
          "payment",
          "credit",
          "make_zero"
        ]
      },
      {
        "name": "amount",
        "label": "Amount",
        "type": "number",
        "required": false
      },
      {
        "name": "memo",
        "label": "Reason / memo",
        "type": "textarea",
        "required": true
      },
      {
        "name": "idempotencyKey",
        "label": "Idempotency key",
        "type": "text",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "creditAccount",
    "danger": true,
    "idempotent": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/customers/{id}/authorizations",
    "title": "Update customer authorizations",
    "fields": [
      {
        "name": "permissions",
        "label": "Authorization object",
        "type": "json",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "setAccountAuthorizations",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/customers/{id}/number-limits",
    "title": "Update number limits",
    "fields": [
      {
        "name": "ranges",
        "label": "Number ranges",
        "type": "json",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "setNumberLimits",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/customers/{id}/packages",
    "title": "Assign customer package",
    "fields": [
      {
        "name": "packageId",
        "label": "Package ID",
        "type": "text",
        "required": true
      },
      {
        "name": "effectiveDate",
        "label": "Effective date",
        "type": "date",
        "required": true
      },
      {
        "name": "invalidTime",
        "label": "Invalid date/time",
        "type": "text",
        "required": false
      },
      {
        "name": "priority",
        "label": "Priority",
        "type": "number",
        "required": false
      },
      {
        "name": "failedProcessingMode",
        "label": "Failure mode",
        "type": "select",
        "required": false,
        "options": [
          "try_after_recharge",
          "try_next_cycle",
          "delete_order"
        ]
      }
    ],
    "handler": "vos",
    "vosOperation": "assignPackage",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateway-groups",
    "title": "Create gateway group",
    "fields": [
      {
        "name": "name",
        "label": "Group name",
        "type": "text",
        "required": true
      },
      {
        "name": "kind",
        "label": "Gateway type",
        "type": "select",
        "required": true,
        "options": [
          "mapping",
          "routing"
        ]
      },
      {
        "name": "gatewayIds",
        "label": "Member gateway IDs",
        "type": "json",
        "required": true
      },
      {
        "name": "memo",
        "label": "Memo",
        "type": "textarea",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createGatewayGroup",
    "danger": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateways/mapping",
    "title": "Create mapping gateway",
    "fields": [
      {
        "name": "name",
        "label": "Gateway name",
        "type": "text",
        "required": true
      },
      {
        "name": "vosGatewayId",
        "label": "VOS gateway ID",
        "type": "text",
        "required": true
      },
      {
        "name": "customerId",
        "label": "Customer ID",
        "type": "text",
        "required": false
      },
      {
        "name": "registerType",
        "label": "Register type",
        "type": "select",
        "required": false,
        "options": [
          "static",
          "dynamic",
          "registration"
        ]
      },
      {
        "name": "ip",
        "label": "IP address",
        "type": "text",
        "required": false
      },
      {
        "name": "signalingPort",
        "label": "Signaling port",
        "type": "number",
        "required": false
      },
      {
        "name": "lineLimit",
        "label": "Line limit",
        "type": "number",
        "required": false
      },
      {
        "name": "cpsLimit",
        "label": "CPS limit",
        "type": "number",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createMappingGateway",
    "danger": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/gateways/mapping/{id}",
    "title": "Update mapping gateway",
    "fields": [
      {
        "name": "name",
        "label": "Gateway name",
        "type": "text",
        "required": true
      },
      {
        "name": "vosGatewayId",
        "label": "VOS gateway ID",
        "type": "text",
        "required": true
      },
      {
        "name": "customerId",
        "label": "Customer ID",
        "type": "text",
        "required": false
      },
      {
        "name": "registerType",
        "label": "Register type",
        "type": "select",
        "required": false,
        "options": [
          "static",
          "dynamic",
          "registration"
        ]
      },
      {
        "name": "ip",
        "label": "IP address",
        "type": "text",
        "required": false
      },
      {
        "name": "signalingPort",
        "label": "Signaling port",
        "type": "number",
        "required": false
      },
      {
        "name": "lineLimit",
        "label": "Line limit",
        "type": "number",
        "required": false
      },
      {
        "name": "cpsLimit",
        "label": "CPS limit",
        "type": "number",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "updateMappingGateway",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/gateways/routing",
    "title": "Create routing gateway",
    "fields": [
      {
        "name": "name",
        "label": "Gateway name",
        "type": "text",
        "required": true
      },
      {
        "name": "vosGatewayId",
        "label": "VOS gateway ID",
        "type": "text",
        "required": true
      },
      {
        "name": "customerId",
        "label": "Customer ID",
        "type": "text",
        "required": false
      },
      {
        "name": "registerType",
        "label": "Register type",
        "type": "select",
        "required": false,
        "options": [
          "static",
          "dynamic",
          "registration"
        ]
      },
      {
        "name": "ip",
        "label": "IP address",
        "type": "text",
        "required": false
      },
      {
        "name": "signalingPort",
        "label": "Signaling port",
        "type": "number",
        "required": false
      },
      {
        "name": "lineLimit",
        "label": "Line limit",
        "type": "number",
        "required": false
      },
      {
        "name": "cpsLimit",
        "label": "CPS limit",
        "type": "number",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createRoutingGateway",
    "danger": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/gateways/routing/{id}",
    "title": "Update routing gateway",
    "fields": [
      {
        "name": "name",
        "label": "Gateway name",
        "type": "text",
        "required": false
      },
      {
        "name": "vosGatewayId",
        "label": "VOS gateway ID",
        "type": "text",
        "required": false
      },
      {
        "name": "prefix",
        "label": "Routing prefix",
        "type": "text",
        "required": false
      },
      {
        "name": "prefixStyle",
        "label": "Prefix style",
        "type": "number",
        "required": false
      },
      {
        "name": "customerId",
        "label": "Customer ID",
        "type": "text",
        "required": false
      },
      {
        "name": "registerType",
        "label": "Register type",
        "type": "select",
        "required": false,
        "options": [
          "static",
          "dynamic",
          "registration"
        ]
      },
      {
        "name": "ip",
        "label": "IP address",
        "type": "text",
        "required": false
      },
      {
        "name": "remoteIp",
        "label": "Remote IP address",
        "type": "text",
        "required": false
      },
      {
        "name": "signalingPort",
        "label": "Signaling port",
        "type": "number",
        "required": false
      },
      {
        "name": "signalPort",
        "label": "Signal port",
        "type": "number",
        "required": false
      },
      {
        "name": "capacity",
        "label": "Line capacity",
        "type": "number",
        "required": false
      },
      {
        "name": "lineLimit",
        "label": "Line limit",
        "type": "number",
        "required": false
      },
      {
        "name": "cpsLimit",
        "label": "CPS limit",
        "type": "number",
        "required": false
      },
      {
        "name": "priority",
        "label": "Priority tier",
        "type": "number",
        "required": false
      },
      {
        "name": "lockType",
        "label": "Lock type",
        "type": "number",
        "required": false
      },
      {
        "name": "rewriteRulesInCallee",
        "label": "Callee rewrite rules",
        "type": "text",
        "required": false
      },
      {
        "name": "rewriteRulesInCaller",
        "label": "Caller rewrite rules",
        "type": "text",
        "required": false
      },
      {
        "name": "memo",
        "label": "Administrative memo",
        "type": "text",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "updateRoutingGateway",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/integrations/api-clients",
    "title": "Create API client",
    "fields": [
      {
        "name": "customerId",
        "label": "Customer ID",
        "type": "text",
        "required": true
      },
      {
        "name": "name",
        "label": "Client name",
        "type": "text",
        "required": true
      },
      {
        "name": "scopes",
        "label": "Scopes",
        "type": "json",
        "required": true
      },
      {
        "name": "ipAllowlist",
        "label": "IP allowlist",
        "type": "json",
        "required": false
      },
      {
        "name": "expiresAt",
        "label": "Expiry date",
        "type": "date",
        "required": false
      }
    ],
    "handler": "api_key",
    "resource": "api_client"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/integrations/webhooks",
    "title": "Create integration webhook",
    "fields": [
      {
        "name": "customerId",
        "label": "Customer ID",
        "type": "text",
        "required": true
      },
      {
        "name": "url",
        "label": "Endpoint URL",
        "type": "text",
        "required": true
      },
      {
        "name": "eventTypes",
        "label": "Events",
        "type": "json",
        "required": true
      },
      {
        "name": "enabled",
        "label": "Enabled",
        "type": "boolean",
        "required": false
      }
    ],
    "handler": "webhook"
  },
  {
    "method": "DELETE",
    "path": "/api/v1/admin/me/sessions/{id}",
    "title": "Revoke admin session",
    "fields": [],
    "handler": "session",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/packages",
    "title": "Create package",
    "fields": [
      {
        "name": "name",
        "label": "Package name",
        "type": "text",
        "required": true
      },
      {
        "name": "rentPeriod",
        "label": "Rent period",
        "type": "number",
        "required": false
      },
      {
        "name": "rentUnit",
        "label": "Rent unit",
        "type": "select",
        "required": false,
        "options": [
          "day",
          "month"
        ]
      },
      {
        "name": "rentFee",
        "label": "Rent fee",
        "type": "number",
        "required": false
      },
      {
        "name": "minimumConsumption",
        "label": "Minimum consumption",
        "type": "number",
        "required": false
      },
      {
        "name": "freeDuration",
        "label": "Free duration",
        "type": "number",
        "required": false
      },
      {
        "name": "freeMoney",
        "label": "Free money amount",
        "type": "number",
        "required": false
      },
      {
        "name": "memo",
        "label": "Memo",
        "type": "textarea",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createPackage",
    "danger": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/payments",
    "title": "Manual payment / credit",
    "fields": [
      {
        "name": "customerId",
        "label": "Customer ID",
        "type": "text",
        "required": true
      },
      {
        "name": "type",
        "label": "Type",
        "type": "select",
        "required": true,
        "options": [
          "payment",
          "credit",
          "make_zero"
        ]
      },
      {
        "name": "amount",
        "label": "Amount",
        "type": "number",
        "required": false
      },
      {
        "name": "currency",
        "label": "Currency",
        "type": "text",
        "required": true
      },
      {
        "name": "memo",
        "label": "Memo",
        "type": "textarea",
        "required": true
      },
      {
        "name": "idempotencyKey",
        "label": "Idempotency key",
        "type": "text",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "creditAccount",
    "danger": true,
    "idempotent": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/phones",
    "title": "Create phone",
    "fields": [
      {
        "name": "phoneNumber",
        "label": "Phone number",
        "type": "text",
        "required": true
      },
      {
        "name": "accountId",
        "label": "Account ID",
        "type": "text",
        "required": true
      },
      {
        "name": "configurationPassword",
        "label": "Configuration password",
        "type": "password",
        "required": false,
        "secret": true
      },
      {
        "name": "lockType",
        "label": "Lock type",
        "type": "select",
        "required": false,
        "options": [
          "none",
          "bar_outgoing",
          "bar_incoming",
          "bar_all"
        ]
      },
      {
        "name": "authorizationType",
        "label": "Authorization type",
        "type": "select",
        "required": false,
        "options": [
          "network",
          "local",
          "domestic",
          "international"
        ]
      },
      {
        "name": "billingRate",
        "label": "Billing rate",
        "type": "text",
        "required": false
      },
      {
        "name": "routingGatewayGroup",
        "label": "Routing gateway group",
        "type": "text",
        "required": false
      },
      {
        "name": "didDdi",
        "label": "DID/DDI",
        "type": "text",
        "required": false
      },
      {
        "name": "softswitch",
        "label": "Softswitch",
        "type": "text",
        "required": false
      },
      {
        "name": "lineLimit",
        "label": "Line limit",
        "type": "number",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createPhone",
    "danger": true
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/phones/{id}",
    "title": "Update phone",
    "fields": [
      {
        "name": "phoneNumber",
        "label": "Phone number",
        "type": "text",
        "required": true
      },
      {
        "name": "accountId",
        "label": "Account ID",
        "type": "text",
        "required": true
      },
      {
        "name": "configurationPassword",
        "label": "Configuration password",
        "type": "password",
        "required": false,
        "secret": true
      },
      {
        "name": "lockType",
        "label": "Lock type",
        "type": "select",
        "required": false,
        "options": [
          "none",
          "bar_outgoing",
          "bar_incoming",
          "bar_all"
        ]
      },
      {
        "name": "authorizationType",
        "label": "Authorization type",
        "type": "select",
        "required": false,
        "options": [
          "network",
          "local",
          "domestic",
          "international"
        ]
      },
      {
        "name": "billingRate",
        "label": "Billing rate",
        "type": "text",
        "required": false
      },
      {
        "name": "routingGatewayGroup",
        "label": "Routing gateway group",
        "type": "text",
        "required": false
      },
      {
        "name": "didDdi",
        "label": "DID/DDI",
        "type": "text",
        "required": false
      },
      {
        "name": "softswitch",
        "label": "Softswitch",
        "type": "text",
        "required": false
      },
      {
        "name": "lineLimit",
        "label": "Line limit",
        "type": "number",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "updatePhone",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rates/groups",
    "title": "Create rate group",
    "fields": [
      {
        "name": "name",
        "label": "Rate group name",
        "type": "text",
        "required": true
      },
      {
        "name": "memo",
        "label": "Memo",
        "type": "textarea",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createRateGroup",
    "danger": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/rates/groups/{id}/rates",
    "title": "Replace rate group rates",
    "fields": [
      {
        "name": "rates",
        "label": "Rates array",
        "type": "json",
        "required": true
      },
      {
        "name": "reason",
        "label": "Change reason",
        "type": "textarea",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "replaceRates",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/rates/imports",
    "title": "Import rates",
    "fields": [
      {
        "name": "filename",
        "label": "Source filename",
        "type": "text",
        "required": true
      },
      {
        "name": "content",
        "label": "CSV content",
        "type": "textarea",
        "required": true
      },
      {
        "name": "mode",
        "label": "Mode",
        "type": "select",
        "required": true,
        "options": [
          "dry_run",
          "apply"
        ]
      },
      {
        "name": "reason",
        "label": "Change reason",
        "type": "textarea",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "importRates",
    "danger": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/registrations",
    "title": "Create registration",
    "fields": [
      {
        "name": "mark",
        "label": "Mark / identifier",
        "type": "text",
        "required": true
      },
      {
        "name": "username",
        "label": "Username",
        "type": "text",
        "required": true
      },
      {
        "name": "password",
        "label": "Authentication password",
        "type": "password",
        "required": true,
        "secret": true
      },
      {
        "name": "serverIp",
        "label": "Server IP",
        "type": "text",
        "required": true
      },
      {
        "name": "lineLimit",
        "label": "Line limit",
        "type": "number",
        "required": false
      },
      {
        "name": "signalingPort",
        "label": "Signaling port",
        "type": "number",
        "required": false
      },
      {
        "name": "encryption",
        "label": "Encryption",
        "type": "boolean",
        "required": false
      },
      {
        "name": "hostName",
        "label": "Host name",
        "type": "text",
        "required": false
      },
      {
        "name": "sipProxy",
        "label": "SIP proxy",
        "type": "text",
        "required": false
      },
      {
        "name": "localIp",
        "label": "Local IP",
        "type": "text",
        "required": false
      },
      {
        "name": "localPort",
        "label": "Local port",
        "type": "number",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "createRegistration",
    "danger": true
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/report-schedules",
    "title": "Create admin report schedule",
    "fields": [
      {
        "name": "reportType",
        "label": "Report type",
        "type": "select",
        "required": true,
        "options": [
          "cdr_export"
        ]
      },
      {
        "name": "frequency",
        "label": "Frequency",
        "type": "select",
        "required": true,
        "options": [
          "daily",
          "weekly",
          "monthly"
        ]
      },
      {
        "name": "timezone",
        "label": "Timezone",
        "type": "text",
        "required": true
      },
      {
        "name": "recipients",
        "label": "Recipient emails",
        "type": "json",
        "required": true
      },
      {
        "name": "format",
        "label": "Format",
        "type": "select",
        "required": true,
        "options": [
          "csv",
          "csv.gz",
          "parquet"
        ]
      },
      {
        "name": "filters",
        "label": "Filters",
        "type": "json",
        "required": false
      }
    ],
    "handler": "portal",
    "resource": "report_schedule"
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/security/roles/{id}",
    "title": "Update role permissions",
    "fields": [
      {
        "name": "permissions",
        "label": "Permission codes",
        "type": "json",
        "required": true
      },
      {
        "name": "reason",
        "label": "Change reason",
        "type": "textarea",
        "required": true
      }
    ],
    "handler": "portal",
    "resource": "role",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/security/users",
    "title": "Create admin user",
    "fields": [
      {
        "name": "email",
        "label": "Email",
        "type": "email",
        "required": true
      },
      {
        "name": "displayName",
        "label": "Display name",
        "type": "text",
        "required": true
      },
      {
        "name": "role",
        "label": "Role",
        "type": "text",
        "required": true
      },
      {
        "name": "expiresAt",
        "label": "Expiry date",
        "type": "date",
        "required": false
      },
      {
        "name": "temporaryPassword",
        "label": "Temporary password",
        "type": "password",
        "required": true,
        "secret": true
      }
    ],
    "handler": "user",
    "danger": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/admin/settings/payments/{provider}",
    "title": "Update payment provider settings",
    "fields": [
      {
        "name": "enabled",
        "label": "Enabled",
        "type": "boolean",
        "required": false
      },
      {
        "name": "currencies",
        "label": "Currencies",
        "type": "json",
        "required": false
      },
      {
        "name": "minimumDeposit",
        "label": "Minimum deposit",
        "type": "number",
        "required": false
      },
      {
        "name": "maximumDeposit",
        "label": "Maximum deposit",
        "type": "number",
        "required": false
      },
      {
        "name": "feeMode",
        "label": "Fee handling",
        "type": "text",
        "required": false
      },
      {
        "name": "config",
        "label": "Provider non-secret config",
        "type": "json",
        "required": false
      }
    ],
    "handler": "portal",
    "resource": "payment_provider",
    "danger": true,
    "pathParams": [
      "provider"
    ]
  },
  {
    "method": "PATCH",
    "path": "/api/v1/admin/system/parameters/{name}",
    "title": "Update system parameter",
    "fields": [
      {
        "name": "value",
        "label": "Parameter value",
        "type": "text",
        "required": true
      },
      {
        "name": "reason",
        "label": "Change reason",
        "type": "textarea",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "updateSystemParameter",
    "danger": true,
    "pathParams": [
      "name"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/tools/network-test",
    "title": "Run network test",
    "fields": [
      {
        "name": "remoteIp",
        "label": "Remote IP",
        "type": "text",
        "required": true
      },
      {
        "name": "port",
        "label": "Configuration port",
        "type": "number",
        "required": false
      },
      {
        "name": "localIp",
        "label": "Local authorized IP",
        "type": "text",
        "required": false
      },
      {
        "name": "packetType",
        "label": "Packet type",
        "type": "select",
        "required": true,
        "options": [
          "special",
          "icmp"
        ]
      }
    ],
    "handler": "vos",
    "vosOperation": "networkTest"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/tools/routing-analysis",
    "title": "Run routing analysis",
    "fields": [
      {
        "name": "authenticationMethod",
        "label": "Authentication method",
        "type": "select",
        "required": true,
        "options": [
          "existing_device",
          "static_ip"
        ]
      },
      {
        "name": "deviceType",
        "label": "Device type",
        "type": "select",
        "required": true,
        "options": [
          "phone",
          "mapping_gateway"
        ]
      },
      {
        "name": "deviceId",
        "label": "Device ID",
        "type": "text",
        "required": false
      },
      {
        "name": "caller",
        "label": "Caller",
        "type": "text",
        "required": true
      },
      {
        "name": "callee",
        "label": "Callee",
        "type": "text",
        "required": true
      },
      {
        "name": "softswitch",
        "label": "Softswitch",
        "type": "text",
        "required": false
      }
    ],
    "handler": "vos",
    "vosOperation": "routingAnalysis"
  },
  {
    "method": "POST",
    "path": "/api/v1/api-keys",
    "title": "Create API key",
    "fields": [
      {
        "name": "name",
        "label": "Key name",
        "type": "text",
        "required": true
      },
      {
        "name": "scopes",
        "label": "Scopes",
        "type": "json",
        "required": true
      },
      {
        "name": "ipAllowlist",
        "label": "IP allowlist",
        "type": "json",
        "required": false
      },
      {
        "name": "expiresAt",
        "label": "Expiry date",
        "type": "date",
        "required": false
      }
    ],
    "handler": "api_key"
  },
  {
    "method": "POST",
    "path": "/api/v1/auth/login",
    "title": "Client sign in",
    "fields": [
      {
        "name": "email",
        "label": "Email",
        "type": "email",
        "required": true
      },
      {
        "name": "password",
        "label": "Password",
        "type": "password",
        "required": true,
        "secret": true
      }
    ],
    "handler": "auth"
  },
  {
    "method": "POST",
    "path": "/api/v1/cdr/exports",
    "title": "Create CDR export",
    "fields": [
      {
        "name": "from",
        "label": "From",
        "type": "date",
        "required": true
      },
      {
        "name": "to",
        "label": "To",
        "type": "date",
        "required": true
      },
      {
        "name": "format",
        "label": "Format",
        "type": "select",
        "required": true,
        "options": [
          "csv",
          "csv.gz",
          "parquet"
        ]
      },
      {
        "name": "filters",
        "label": "Additional filters",
        "type": "json",
        "required": false
      }
    ],
    "handler": "report",
    "resource": "cdr_export"
  },
  {
    "method": "POST",
    "path": "/api/v1/deposits",
    "title": "Add funds",
    "fields": [
      {
        "name": "amount",
        "label": "Amount",
        "type": "number",
        "required": true
      },
      {
        "name": "currency",
        "label": "Currency",
        "type": "text",
        "required": true
      },
      {
        "name": "paymentMethod",
        "label": "Payment method",
        "type": "text",
        "required": true
      }
    ],
    "handler": "deposit",
    "idempotent": true
  },
  {
    "method": "POST",
    "path": "/api/v1/gateways/{id}/credentials/rotate",
    "title": "Rotate SIP credentials",
    "fields": [
      {
        "name": "reason",
        "label": "Rotation reason",
        "type": "textarea",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "rotateGatewayCredentials",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "PUT",
    "path": "/api/v1/gateways/{id}/ips",
    "title": "Update gateway IPs",
    "fields": [
      {
        "name": "primaryIp",
        "label": "Primary IP",
        "type": "text",
        "required": true
      },
      {
        "name": "backupIps",
        "label": "Backup IPs",
        "type": "json",
        "required": false
      },
      {
        "name": "reason",
        "label": "Change reason",
        "type": "textarea",
        "required": true
      }
    ],
    "handler": "vos",
    "vosOperation": "updateGatewayIps",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/me/mfa",
    "title": "Configure MFA",
    "fields": [
      {
        "name": "action",
        "label": "Action",
        "type": "select",
        "required": true,
        "options": [
          "enroll",
          "verify",
          "disable"
        ]
      },
      {
        "name": "code",
        "label": "Verification code",
        "type": "text",
        "required": false
      },
      {
        "name": "enrollmentId",
        "label": "Enrollment ID",
        "type": "text",
        "required": false
      }
    ],
    "handler": "mfa",
    "danger": true
  },
  {
    "method": "PUT",
    "path": "/api/v1/me/notification-preferences",
    "title": "Update notification preferences",
    "fields": [
      {
        "name": "preferences",
        "label": "Preferences",
        "type": "json",
        "required": true
      }
    ],
    "handler": "portal",
    "resource": "notification_preferences"
  },
  {
    "method": "PATCH",
    "path": "/api/v1/me/profile",
    "title": "Update profile",
    "fields": [
      {
        "name": "organizationName",
        "label": "Organization name",
        "type": "text",
        "required": false
      },
      {
        "name": "billingEmail",
        "label": "Billing email",
        "type": "email",
        "required": false
      },
      {
        "name": "contactEmail",
        "label": "Contact email",
        "type": "email",
        "required": false
      },
      {
        "name": "phone",
        "label": "Phone",
        "type": "text",
        "required": false
      },
      {
        "name": "timezone",
        "label": "Timezone",
        "type": "text",
        "required": false
      }
    ],
    "handler": "portal",
    "resource": "profile"
  },
  {
    "method": "DELETE",
    "path": "/api/v1/me/sessions/{id}",
    "title": "Revoke session",
    "fields": [],
    "handler": "session",
    "danger": true,
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/report-schedules",
    "title": "Create report schedule",
    "fields": [
      {
        "name": "reportType",
        "label": "Report type",
        "type": "select",
        "required": true,
        "options": [
          "cdr_export"
        ]
      },
      {
        "name": "frequency",
        "label": "Frequency",
        "type": "select",
        "required": true,
        "options": [
          "daily",
          "weekly",
          "monthly"
        ]
      },
      {
        "name": "timezone",
        "label": "Timezone",
        "type": "text",
        "required": true
      },
      {
        "name": "recipients",
        "label": "Recipient emails",
        "type": "json",
        "required": true
      },
      {
        "name": "format",
        "label": "Format",
        "type": "select",
        "required": true,
        "options": [
          "csv",
          "csv.gz",
          "parquet"
        ]
      },
      {
        "name": "filters",
        "label": "Filters",
        "type": "json",
        "required": false
      }
    ],
    "handler": "portal",
    "resource": "report_schedule"
  },
  {
    "method": "POST",
    "path": "/api/v1/support/tickets",
    "title": "Create support ticket",
    "fields": [
      {
        "name": "subject",
        "label": "Subject",
        "type": "text",
        "required": true
      },
      {
        "name": "category",
        "label": "Category",
        "type": "text",
        "required": true
      },
      {
        "name": "priority",
        "label": "Priority",
        "type": "select",
        "required": true,
        "options": [
          "low",
          "normal",
          "high",
          "urgent"
        ]
      },
      {
        "name": "description",
        "label": "Description",
        "type": "textarea",
        "required": true
      },
      {
        "name": "gatewayId",
        "label": "Gateway ID",
        "type": "text",
        "required": false
      },
      {
        "name": "cdrId",
        "label": "CDR / call ID",
        "type": "text",
        "required": false
      }
    ],
    "handler": "support"
  },
  {
    "method": "POST",
    "path": "/api/v1/support/tickets/{id}/messages",
    "title": "Reply to support ticket",
    "fields": [
      {
        "name": "message",
        "label": "Message",
        "type": "textarea",
        "required": true
      }
    ],
    "handler": "support",
    "pathParams": [
      "id"
    ]
  },
  {
    "method": "POST",
    "path": "/api/v1/team/invitations",
    "title": "Invite team member",
    "fields": [
      {
        "name": "email",
        "label": "Email",
        "type": "email",
        "required": true
      },
      {
        "name": "role",
        "label": "Role",
        "type": "text",
        "required": true
      }
    ],
    "handler": "portal",
    "resource": "team_invitation"
  },
  {
    "method": "POST",
    "path": "/api/v1/webhooks",
    "title": "Create webhook",
    "fields": [
      {
        "name": "url",
        "label": "Endpoint URL",
        "type": "text",
        "required": true
      },
      {
        "name": "eventTypes",
        "label": "Events",
        "type": "json",
        "required": true
      },
      {
        "name": "enabled",
        "label": "Enabled",
        "type": "boolean",
        "required": false
      }
    ],
    "handler": "webhook"
  },
  {
    "method": "POST",
    "path": "/api/v1/devices/setup/verify",
    "title": "Verify device registration",
    "fields": [
      {
        "name": "gatewayId",
        "label": "Gateway ID",
        "type": "text",
        "required": true
      },
      {
        "name": "phoneId",
        "label": "Phone ID",
        "type": "text",
        "required": false
      },
      {
        "name": "deviceKey",
        "label": "Device",
        "type": "select",
        "required": true,
        "options": [
          "microsip",
          "linphone",
          "zoiper",
          "groundwire",
          "bria",
          "yealink-t5x",
          "grandstream",
          "cisco-78xx",
          "poly-vvx",
          "fanvil",
          "webrtc",
          "mobile-dialer"
        ]
      }
    ],
    "handler": "portal",
    "resource": "device_setup_verify"
  },
  {
    "method": "POST",
    "path": "/api/v1/devices/setup/copy-event",
    "title": "Record device setup copy event",
    "fields": [
      {
        "name": "gatewayId",
        "label": "Gateway ID",
        "type": "text",
        "required": true
      },
      {
        "name": "deviceKey",
        "label": "Device",
        "type": "select",
        "required": true,
        "options": [
          "microsip",
          "linphone",
          "zoiper",
          "groundwire",
          "bria",
          "yealink-t5x",
          "grandstream",
          "cisco-78xx",
          "poly-vvx",
          "fanvil",
          "webrtc",
          "mobile-dialer"
        ]
      },
      {
        "name": "field",
        "label": "Copied field",
        "type": "select",
        "required": true,
        "options": [
          "sipServer",
          "port",
          "transport",
          "username",
          "displayName",
          "sipUri",
          "qrPayload"
        ]
      }
    ],
    "handler": "portal",
    "resource": "device_setup_copy"
  },
  {
    "method": "POST",
    "path": "/api/v1/admin/devices/setup/verify",
    "title": "Verify device registration (admin)",
    "fields": [
      {
        "name": "gatewayId",
        "label": "Gateway ID",
        "type": "text",
        "required": true
      },
      {
        "name": "phoneId",
        "label": "Phone ID",
        "type": "text",
        "required": false
      },
      {
        "name": "deviceKey",
        "label": "Device",
        "type": "select",
        "required": true,
        "options": [
          "microsip",
          "linphone",
          "zoiper",
          "groundwire",
          "bria",
          "yealink-t5x",
          "grandstream",
          "cisco-78xx",
          "poly-vvx",
          "fanvil",
          "webrtc",
          "mobile-dialer"
        ]
      }
    ],
    "handler": "portal",
    "resource": "device_setup_verify"
  }
,
  {
    "method": "PUT",
    "path": "/api/v1/admin/settings/support",
    "title": "Save global support contacts (Telegram + Teams)",
    "fields": [
      {"name": "enabled", "label": "Support button enabled", "type": "boolean", "required": true},
      {"name": "label", "label": "Button label", "type": "text", "required": false},
      {"name": "telegram.enabled", "label": "Telegram enabled", "type": "boolean", "required": true},
      {"name": "telegram.handle", "label": "Telegram handle", "type": "text", "required": false},
      {"name": "teams.enabled", "label": "Teams enabled", "type": "boolean", "required": true},
      {"name": "teams.id", "label": "Teams ID (email or handle)", "type": "text", "required": false}
    ],
    "handler": "portal",
    "resource": "support_config"
  }
] as const satisfies readonly ActionSchema[];
export function findActionSchema(method:string,pathPattern:string){return actionSchemas.find(x=>x.method===method.toUpperCase()&&x.path===pathPattern);}
