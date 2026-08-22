# Redpanda Topics and Event Contracts

## Core principles

- event IDs are stable;
- schemas are versioned;
- producers do not assume consumer availability;
- consumers are idempotent;
- poison messages go to DLQ with reason;
- no secrets in event payloads.

## Recommended topics

### `cdr.normalized.v1`
Producer: CDR ingest  
Consumers:
- ClickHouse CDR writer
- optional analytics anomaly worker
- optional customer `call.completed` event builder

Partition key candidate:
- hash of `vos_instance_id + tenant_id` or another benchmarked key.
Avoid a single hot tenant monopolizing one partition if traffic distribution is skewed.

### `gateway.state.v1`
Producer: realtime collector  
Consumers:
- notification worker
- webhook worker
- optional historical gateway-state writer

### `payment.provider.v1`
Producer: payment webhook handler  
Consumer: payment orchestration worker.

### `payment.vos-credit.v1`
Producer: ledger/payment orchestrator  
Consumer: VOS credit worker.

### `webhook.delivery.v1`
Producer: domain event router  
Consumer: outbound delivery worker.

### `notification.delivery.v1`
Producer: alert/event router  
Consumer: notification worker.

### `report.job.v1`
Producer: API/scheduler  
Consumer: report worker.

## Event envelope

All events:

```json
{
  "event_id": "uuid",
  "event_type": "cdr.normalized",
  "schema_version": 1,
  "occurred_at": "ISO-8601 UTC",
  "published_at": "ISO-8601 UTC",
  "tenant_id": "uuid-or-null",
  "vos_instance_id": "uuid-or-null",
  "correlation_id": "request/event correlation",
  "data": {}
}
```

## Consumer semantics

Each consumer:
1. validates supported version;
2. records/recognizes idempotency identity if side effect is non-idempotent;
3. performs side effect;
4. commits offset only after success;
5. on transient error, retries with backoff;
6. on poison/permanent error, emits DLQ metadata and continues according to policy.

## DLQ

Topic examples:
- `cdr.normalized.dlq.v1`
- `webhook.delivery.dlq.v1`

DLQ payload contains:
- original event ID;
- topic/partition/offset;
- failure class/message;
- first/last failure time;
- sanitized original payload or object-storage reference;
- retry count.

## Retention

CDR topic retention must cover the maximum recovery window for ClickHouse plus operational margin.
Do not pick retention by guess; calculate from traffic and disk budget.

## Exactly once vs effectively once

Do not promise distributed exactly-once semantics across VOS, Redpanda and ClickHouse unless formally proven.
Design for **effectively-once logical outcomes** using stable event IDs, dedupe and idempotent consumers.
