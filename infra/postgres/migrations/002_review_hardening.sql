INSERT INTO roles(code,name,scope) VALUES ('commercial','Commercial / Sales','admin') ON CONFLICT(code) DO NOTHING;
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS schedule_id uuid;
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS delivery_recipients text[] NOT NULL DEFAULT '{}';
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS delivery_status text;
ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS delivery_error text;
CREATE INDEX IF NOT EXISTS report_jobs_queue_idx ON report_jobs(status,created_at) WHERE status='queued';
CREATE INDEX IF NOT EXISTS webhook_deliveries_retry_idx ON webhook_deliveries(next_retry_at) WHERE delivered_at IS NULL AND next_retry_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_deliveries_event_attempt_idx ON webhook_deliveries(endpoint_id,event_id,attempt DESC);
