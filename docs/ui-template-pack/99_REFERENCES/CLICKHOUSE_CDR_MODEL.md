# ClickHouse CDR Model

## Goals

- append high-volume CDR safely;
- fast tenant + time queries;
- fast gateway/destination/failure analytics;
- predictable large exports;
- replay-safe ingestion.

## Canonical fact table

Suggested logical fields; exact types must be validated against VOS samples.

```text
event_id UUID/String
vos_instance_id UUID
tenant_id UUID
source_serial_number String
calling_call_id String
called_call_id String

account_id String
agent_id String

caller String
callee String
incoming_caller String
incoming_callee String
outbound_caller String
outbound_callee String

mapping_gateway_id String
routing_gateway_id String
caller_ip String/IPv6
callee_ip String/IPv6

begin_time DateTime64
connect_time Nullable(DateTime64)
end_time DateTime64
received_at DateTime64

duration_ms / seconds
charged_duration_ms / seconds
continue_duration_ms
connect_delay_ms
pdd_ms

customer_charge Decimal
talk_tax Decimal
carrier_expense Decimal
cost_tax Decimal
currency FixedString/String

call_type String/Enum candidate
area_prefix String
area_name String

termination_reason String
hangup_side String
billing_method String
billing_mode String

caller_device_name String
callee_device_name String
reason String

source_hash String
schema_version UInt16
```

Do not select a final unit for durations or precision for money until VOS sample data is verified.

## Table engine

Baseline:

```sql
ENGINE = MergeTree
PARTITION BY toYYYYMM(begin_time)
ORDER BY (tenant_id, begin_time, mapping_gateway_id, callee, event_id)
```

This is a starting point, not a universal truth. Benchmark alternate ordering against real query distribution.

## Dedupe

Best case:
```text
dedupe_key = (vos_instance_id, source_serial_number)
```

[VOS-SOURCE] the manual calls serial number a unique identification in CDR.

[VERIFY] Confirm uniqueness scope across servers, softswitches and retained history.

Fallback:
- deterministic fingerprint from immutable call fields;
- ingest registry/check if upstream can resend;
- avoid costly per-row synchronous SELECT-before-insert under high load.

If exact replacement/update semantics are needed, evaluate ReplacingMergeTree carefully and understand eventual merge behavior. Prefer preventing duplicate logical events before analytics when possible.

## Aggregate tables

### `cdr_hourly_customer`
Key:
- tenant
- hour

Measures:
- total calls
- connected calls
- failed calls
- talk seconds
- charged seconds
- customer charge
- carrier expense
- ASR numerator/denominator
- ACD numerator/denominator
- PDD sum/count

### `cdr_daily_customer`
same daily grain.

### `cdr_hourly_gateway`
- tenant
- gateway
- hour
- calls/minutes/ASR/ACD/PDD/failures

### `cdr_hourly_destination`
- tenant
- area/country/prefix
- hour
- calls/minutes/spend/quality

### `cdr_hourly_failure`
- tenant
- termination reason/category
- hour
- count

Do not store only precomputed ratios. Store sums/counts required to recompute accurate ratios across larger windows.

## Query patterns

Interactive:
```text
WHERE tenant_id = ?
  AND begin_time >= ?
  AND begin_time < ?
ORDER BY begin_time DESC, event_id DESC
LIMIT ?
```

Cursor should encode the final sort key values, not an unbounded numeric offset.

## Retention

Do not enable TTL until:
- business retention approved;
- legal/compliance needs reviewed;
- archive strategy decided;
- restore/replay path tested.

## Insert behavior

- batch by rows and/or short time interval;
- compress over transport;
- limit simultaneous consumers to measured ClickHouse capacity;
- track batch size, insert latency, failures;
- do not insert one event per request.

## Schema evolution

Every event contains `schema_version`.
Consumer supports current + at least required replay history versions.
Breaking rename/type changes use staged migration/backfill, not in-place surprises.
