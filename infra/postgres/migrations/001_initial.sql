CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email citext UNIQUE NOT NULL,
  password_hash text,
  display_name text NOT NULL,
  user_type text NOT NULL CHECK(user_type IN ('admin','client')),
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','locked','disabled')),
  mfa_enabled boolean NOT NULL DEFAULT false,
  mfa_secret_ciphertext text,
  invalid_after timestamptz,
  last_login_at timestamptz,
  last_password_change_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_org_idx ON users(organization_id);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  scope text NOT NULL CHECK(scope IN ('admin','client')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  description text NOT NULL
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id,permission_id)
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id,role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  ip inet,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_active_idx ON sessions(user_id,expires_at) WHERE revoked_at IS NULL;


CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email citext NOT NULL,
  role_code text NOT NULL,
  token_hash text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked','expired')),
  expires_at timestamptz NOT NULL,
  invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,email,status)
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id,code_hash)
);

CREATE TABLE IF NOT EXISTS vos_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_url text,
  timezone text NOT NULL DEFAULT 'UTC',
  currency char(3) NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'disabled' CHECK(status IN ('enabled','disabled','degraded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE RESTRICT,
  vos_instance_id uuid REFERENCES vos_instances(id) ON DELETE RESTRICT,
  vos_account_id text,
  account_name text NOT NULL,
  currency char(3) NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
  balance numeric(20,6) NOT NULL DEFAULT 0,
  overdraft_limit numeric(20,6) NOT NULL DEFAULT 0,
  rate_group_id uuid,
  low_balance_threshold numeric(20,6) NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customers_vos_account_uq ON customers(vos_instance_id,vos_account_id) WHERE vos_account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  vos_instance_id uuid REFERENCES vos_instances(id) ON DELETE RESTRICT,
  vos_gateway_id text NOT NULL,
  kind text NOT NULL CHECK(kind IN ('mapping','routing')),
  name text NOT NULL,
  register_type text,
  configured_ip inet,
  line_limit integer NOT NULL DEFAULT 0 CHECK(line_limit >= 0),
  cps_limit integer CHECK(cps_limit IS NULL OR cps_limit >= 0),
  status text NOT NULL DEFAULT 'unknown',
  last_registered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gateways_vos_uq ON gateways(vos_instance_id,vos_gateway_id);
CREATE INDEX IF NOT EXISTS gateways_customer_idx ON gateways(customer_id);

CREATE TABLE IF NOT EXISTS rate_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  side text NOT NULL CHECK(side IN ('customer','carrier','shared')),
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rates (
  id bigserial PRIMARY KEY,
  rate_group_id uuid NOT NULL REFERENCES rate_groups(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  area_name text,
  rate_type text,
  rate_per_minute numeric(20,8) NOT NULL CHECK(rate_per_minute >= 0),
  billing_cycle_seconds integer NOT NULL DEFAULT 60 CHECK(billing_cycle_seconds > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(rate_group_id,prefix)
);
CREATE INDEX IF NOT EXISTS rates_prefix_idx ON rates(prefix);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  external_reference text,
  idempotency_key text,
  amount numeric(20,6) NOT NULL CHECK(amount >= 0),
  currency char(3) NOT NULL,
  type text NOT NULL,
  status text NOT NULL,
  provider text,
  vos_serial text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  state_updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS payments_customer_idempotency_uq ON payments(customer_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payments_ext_ref_uq ON payments(provider,external_reference) WHERE external_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_customer_created_idx ON payments(customer_id,created_at DESC);
CREATE INDEX IF NOT EXISTS payments_status_state_updated_idx ON payments(status,state_updated_at);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
  direction text NOT NULL CHECK(direction IN ('debit','credit')),
  amount numeric(20,6) NOT NULL CHECK(amount >= 0),
  currency char(3) NOT NULL,
  reason text NOT NULL,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  key_prefix text NOT NULL,
  secret_hash text UNIQUE NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  ip_allowlist cidr[] NOT NULL DEFAULT '{}',
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_keys_org_idx ON api_keys(organization_id);

CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url text NOT NULL,
  event_types text[] NOT NULL,
  secret_ciphertext text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  attempt integer NOT NULL DEFAULT 1 CHECK(attempt > 0),
  http_status integer,
  response_excerpt text,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(endpoint_id,event_id,attempt)
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_org_created_idx ON notifications(organization_id,created_at DESC);

CREATE TABLE IF NOT EXISTS notification_preferences (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  linked_cdr_serial text,
  linked_gateway_id uuid REFERENCES gateways(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_tickets_org_updated_idx ON support_tickets(organization_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  visibility text NOT NULL CHECK(visibility IN ('customer','internal')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  format text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  object_path text,
  row_count bigint,
  expires_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS report_jobs_org_created_idx ON report_jobs(organization_id,created_at DESC);
CREATE INDEX IF NOT EXISTS report_jobs_queue_idx ON report_jobs(status,created_at) WHERE status='queued';

CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  frequency text NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),
  timezone text NOT NULL,
  recipients text[] NOT NULL,
  format text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Portal-owned generic records for feature flags, policies, settings and other resources
-- that are not VOS transactional state. VOS state is never written here as a substitute for VOS.
CREATE TABLE IF NOT EXISTS portal_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_key text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_resources_unique UNIQUE NULLS NOT DISTINCT (organization_id,resource_type,resource_key)
);
CREATE INDEX IF NOT EXISTS portal_resources_type_idx ON portal_resources(resource_type,organization_id);

CREATE TABLE IF NOT EXISTS api_request_logs (
  id bigserial PRIMARY KEY,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES api_keys(id) ON DELETE SET NULL,
  request_id uuid NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  latency_ms integer NOT NULL,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS api_request_logs_org_created_idx ON api_request_logs(organization_id,created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  request_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  before_data jsonb,
  after_data jsonb,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_org_created_idx ON audit_logs(organization_id,created_at DESC);

INSERT INTO roles(code,name,scope) VALUES
 ('super_admin','Super Admin','admin'),
 ('noc','NOC','admin'),
 ('billing','Billing','admin'),
 ('commercial','Commercial / Sales','admin'),
 ('support','Support','admin'),
 ('security_admin','Security Admin','admin'),
 ('read_only_admin','Read Only Admin','admin'),
 ('owner','Owner','client'),
 ('billing_client','Billing','client'),
 ('technical','Technical / NOC','client'),
 ('api_manager','API Manager','client'),
 ('read_only','Read Only','client')
ON CONFLICT(code) DO NOTHING;
