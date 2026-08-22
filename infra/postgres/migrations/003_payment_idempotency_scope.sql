-- Scope payment idempotency to the customer/tenant.
-- A globally unique client-supplied key can leak/collide across tenants.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_idempotency_key_key;
CREATE UNIQUE INDEX IF NOT EXISTS payments_customer_idempotency_uq
  ON payments(customer_id,idempotency_key)
  WHERE idempotency_key IS NOT NULL;
