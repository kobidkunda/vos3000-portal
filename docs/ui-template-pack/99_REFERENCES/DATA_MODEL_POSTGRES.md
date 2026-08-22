# PostgreSQL 18 — Portal Data Model

## Design rule

PostgreSQL owns relational business state. It does not become the long-term raw CDR warehouse.

## Core schemas / tables

### Identity and RBAC
- `users`
  - `id uuid pk`
  - `email/login_name`
  - `display_name`
  - `status`
  - `created_at`, `updated_at`
- `password_credentials`
  - password hash, algorithm version, rotated time
- `mfa_methods`
  - type, secret reference/encrypted data, verified time, status
- `sessions`
  - hashed session ID/token reference, user, expiry, last activity, IP/user-agent metadata
- `roles`
- `permissions`
- `role_permissions`
- `user_roles`

### Tenant/customer
- `tenants`
  - portal business tenant/customer identity
- `customer_users`
  - user-to-tenant membership and role
- `customer_preferences`
  - timezone, notification, display preferences

### VOS registry
- `vos_instances`
  - id, name, build/version, host metadata, timezone, currency, secret reference, status
- `vos_accounts`
  - internal id, vos_instance_id, upstream account_id, tenant_id, last_sync_at, status snapshot
- `vos_gateways`
  - upstream gateway identity, type mapping/routing, tenant/account link when applicable
- `vos_phones`
- `vos_rate_groups`
- `sync_checkpoints`
- `integration_errors`

Use unique constraints such as:
```text
(vos_instance_id, upstream_account_id)
(vos_instance_id, upstream_gateway_id, gateway_type)
```

### Configuration change management
- `configuration_changes`
  - resource type/id, desired diff, status, requester, approver, apply result, read-back result
- `configuration_approvals`
- `rate_versions`
- `rate_import_jobs`
- `rate_change_items`
- `customer_rate_publications`

### Payments and ledger
- `payment_providers`
- `deposits`
- `payment_events`
- `ledger_accounts`
- `ledger_entries`
- `vos_credit_commands`
- `reconciliations`
- `receipts`

Money:
- use integer minor units where a currency has fixed minor units, or `NUMERIC(p,s)` for telecom-rate precision;
- store currency code;
- never use floating point for money.

Ledger principle:
- append entries;
- corrections use reversing/compensating entries;
- never mutate historical amount rows to "fix" an old transaction.

### API and webhooks
- `api_keys`
  - key ID, hashed secret, tenant, scopes, expiry, status, last-used
- `api_key_ip_rules`
- `webhook_endpoints`
- `webhook_subscriptions`
- `webhook_deliveries`

### Reports/exports
- `report_jobs`
- `report_schedules`
- `downloads`
  - object key, size, hash, expiry, authorization scope

### Notifications/support
- `notifications`
- `notification_preferences`
- `support_tickets`
- `support_messages`

### Audit and operational metadata
- `audit_logs`
- `job_runs`
- `dead_letter_metadata` if DLQ metadata is mirrored from Redpanda
- `incident_records` optional

## Indexing principles

- every FK used for tenant scoping gets an index;
- composite indexes follow actual filters, not guessed future use;
- `audit_logs` can be time-partitioned when volume warrants it;
- payment lookup indexes on provider reference, deposit ID, tenant, created_at;
- do not index every column.

## Deletion policy

Hard deletion should be rare:
- user/customer deletion may require legal retention and anonymization.
- financial ledger/audit records are retained according to policy.
- VOS mapping rows can become inactive rather than physically deleted if needed for historical CDR joins.

## Migration discipline

- schema changes are versioned;
- destructive migration has explicit backup/rollback plan;
- production migrations are tested against production-like row counts;
- no manual "hot fixes" without a tracked migration.

## CDR foreign-reference strategy

ClickHouse CDR rows should carry stable denormalized identifiers such as:
- `tenant_id`
- `vos_instance_id`
- `vos_account_id/upstream_account_id`
- `mapping_gateway_id`
- `routing_gateway_id`

Do not require a PostgreSQL join for every CDR row rendered in a large report.
