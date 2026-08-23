-- Migration: 006_self_registration_default_rate_group.sql
-- Singleton portal setting for the rate group assigned during self-registration.
-- Deleting a selected group intentionally clears the default rather than blocking deletion.
CREATE TABLE IF NOT EXISTS registration_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  default_rate_group_id uuid REFERENCES rate_groups(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registration_settings_singleton CHECK(singleton)
);

INSERT INTO registration_settings(singleton,default_rate_group_id)
VALUES (true,NULL)
ON CONFLICT (singleton) DO NOTHING;
