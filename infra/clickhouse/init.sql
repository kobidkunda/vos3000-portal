CREATE DATABASE IF NOT EXISTS vos;

CREATE TABLE IF NOT EXISTS vos.cdr_events (
  serial_number String,
  vos_instance_id LowCardinality(String),
  customer_id String,
  account_id String,
  agent_id String,
  caller String,
  callee String,
  incoming_caller String,
  incoming_callee String,
  outbound_caller String,
  outbound_callee String,
  mapping_gateway_id LowCardinality(String),
  routing_gateway_id LowCardinality(String),
  caller_ip String,
  callee_ip String,
  begin_time DateTime64(3,'UTC'),
  end_time Nullable(DateTime64(3,'UTC')),
  answered Nullable(UInt8),
  duration UInt32,
  charged_duration UInt32,
  customer_charge Decimal(20,6),
  customer_tax Decimal(20,6) DEFAULT 0,
  carrier_cost Decimal(20,6),
  carrier_tax Decimal(20,6) DEFAULT 0,
  call_type LowCardinality(String),
  area_prefix String,
  area_name LowCardinality(String),
  billing_method LowCardinality(String),
  billing_mode LowCardinality(String),
  pdd_ms UInt32,
  connect_delay_ms UInt32,
  calling_call_id String,
  called_call_id String,
  termination_reason LowCardinality(String),
  hangup_side LowCardinality(String),
  raw_json String DEFAULT '',
  ingested_at DateTime64(3,'UTC') DEFAULT now64(3)
) ENGINE=ReplacingMergeTree(ingested_at)
PARTITION BY toYYYYMM(begin_time)
ORDER BY (customer_id, begin_time, vos_instance_id, serial_number)
TTL begin_time + INTERVAL 5 YEAR DELETE;

-- These are logical views, not insert-time materialized aggregates. Redpanda delivery is
-- at-least-once and a process can fail after ClickHouse insert but before offset commit.
-- ReplacingMergeTree + FINAL makes retries converge to one CDR without permanently
-- double-counting a materialized rollup. If a future deployment requires physical
-- rollups, build them only from a deduplicated source and contract-test the strategy.
CREATE VIEW IF NOT EXISTS vos.cdr_hourly_customer AS
SELECT
  toStartOfHour(begin_time) AS hour,
  customer_id,
  count() AS calls,
  countIf(ifNull(answered,0)=1) AS answered_calls,
  sum(duration) AS duration_seconds,
  sum(customer_charge) AS revenue,
  sum(carrier_cost) AS cost
FROM vos.cdr_events FINAL
GROUP BY hour,customer_id;

CREATE VIEW IF NOT EXISTS vos.cdr_daily_customer AS
SELECT
  toDate(begin_time) AS day,
  customer_id,
  count() AS calls,
  countIf(ifNull(answered,0)=1) AS answered_calls,
  sum(duration) AS duration_seconds,
  sum(customer_charge) AS revenue,
  sum(carrier_cost) AS cost
FROM vos.cdr_events FINAL
GROUP BY day,customer_id;
