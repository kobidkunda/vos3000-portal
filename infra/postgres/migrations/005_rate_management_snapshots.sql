-- Migration: 005_rate_management_snapshots.sql
-- Carrier-grade enhancements for Rate Management Suite M1

-- 1. Enhance rate_groups with memo and currency
ALTER TABLE rate_groups ADD COLUMN IF NOT EXISTS currency char(3) NOT NULL DEFAULT 'USD';
ALTER TABLE rate_groups ADD COLUMN IF NOT EXISTS memo text;

-- 2. Optimize customers rate_group_id index for fast attached-account aggregations
CREATE INDEX IF NOT EXISTS customers_rate_group_idx ON customers(rate_group_id) WHERE rate_group_id IS NOT NULL;

-- 3. Enhance rates table with country metadata, intervals, and composite indexes
ALTER TABLE rates ADD COLUMN IF NOT EXISTS country_code char(2);
ALTER TABLE rates ADD COLUMN IF NOT EXISTS country_name text;
ALTER TABLE rates ADD COLUMN IF NOT EXISTS initial_interval integer NOT NULL DEFAULT 60 CHECK(initial_interval > 0);
ALTER TABLE rates ADD COLUMN IF NOT EXISTS increment_interval integer NOT NULL DEFAULT 1 CHECK(increment_interval > 0);
ALTER TABLE rates ADD COLUMN IF NOT EXISTS effective_date timestamptz NOT NULL DEFAULT now();
ALTER TABLE rates ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','blocked'));
ALTER TABLE rates ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS rates_group_prefix_idx ON rates(rate_group_id, prefix);
CREATE INDEX IF NOT EXISTS rates_group_country_idx ON rates(rate_group_id, country_code);
CREATE INDEX IF NOT EXISTS rates_group_area_idx ON rates(rate_group_id, area_name);

-- 4. Rate Snapshots table for transactional rollback & disaster recovery
CREATE TABLE IF NOT EXISTS rate_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_group_id uuid NOT NULL REFERENCES rate_groups(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  operation text NOT NULL CHECK(operation IN ('import_merge','import_replace','bulk_adjust','manual_batch','duplicate','rollback')),
  reason text,
  rates_count integer NOT NULL DEFAULT 0,
  snapshot_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_snapshots_group_idx ON rate_snapshots(rate_group_id, created_at DESC);

-- 5. Rate Import Jobs & History table for progress tracking, dry-run diffs, and audit trail
CREATE TABLE IF NOT EXISTS rate_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_group_id uuid NOT NULL REFERENCES rate_groups(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  filename text,
  strategy text NOT NULL CHECK(strategy IN ('merge','replace')),
  status text NOT NULL DEFAULT 'completed' CHECK(status IN ('pending','validating','validated','processing','completed','failed','rolled_back')),
  total_rows integer NOT NULL DEFAULT 0,
  added_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  deleted_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]',
  snapshot_id uuid REFERENCES rate_snapshots(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS rate_import_jobs_group_idx ON rate_import_jobs(rate_group_id, created_at DESC);

-- 6. Rate Imports table alias / compatibility view
CREATE TABLE IF NOT EXISTS rate_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_group_id uuid NOT NULL REFERENCES rate_groups(id) ON DELETE CASCADE,
  file_name text,
  mode text NOT NULL CHECK(mode IN ('merge','replace')),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  stats jsonb NOT NULL,
  snapshot_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_imports_group_idx ON rate_imports(rate_group_id, created_at DESC);
