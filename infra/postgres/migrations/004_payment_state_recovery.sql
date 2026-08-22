ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS state_updated_at timestamptz NOT NULL DEFAULT now();

UPDATE payments SET state_updated_at=COALESCE(completed_at,created_at,now())
WHERE state_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS payments_status_state_updated_idx
  ON payments(status,state_updated_at);
