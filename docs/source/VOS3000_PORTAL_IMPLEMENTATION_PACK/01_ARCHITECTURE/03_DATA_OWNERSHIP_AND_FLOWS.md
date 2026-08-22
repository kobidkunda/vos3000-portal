# Data Ownership and Critical Flows

## Ownership matrix

| Data | System of record | Cache/derived |
|---|---|---|
| Portal users/RBAC | PostgreSQL | Redis session cache |
| Customer/VOS mapping | PostgreSQL | Redis optional |
| VOS account balance | VOS authoritative for telephony billing; portal keeps synchronized/reconciliation records | Redis short cache |
| Payment transaction | PostgreSQL immutable ledger + provider reference | Redis never authoritative |
| CDR raw/normalized | ClickHouse analytical truth after durable ingestion | Redpanda during transit |
| Live calls | VOS current-call source | Redis realtime projection |
| Gateway online state | VOS online gateway source | Redis realtime projection |
| Rate publication metadata | PostgreSQL | Redis optional |
| Actual VOS rate config | VOS | portal snapshot/version metadata |
| Exports | Object storage | PostgreSQL job metadata |
| Audit | PostgreSQL append-only | — |

## CDR flow

```text
VOS -> CDR Ingest -> validation -> dedupe identity -> Redpanda
    -> consumer batch -> ClickHouse
    -> materialized/worker rollups
    -> APIs/reports
```

The ingest endpoint acknowledges only after the event is durably accepted according to the chosen Redpanda producer guarantees.

## Payment flow

```text
Client -> create deposit in Portal
       -> provider
provider webhook -> verify signature
                 -> mark provider-confirmed
                 -> create idempotent VOS-credit command
                 -> VOS Adapter
                 -> record VOS result
                 -> reconcile expected vs actual balance
                 -> COMPLETED or REQUIRES_RECONCILIATION
```

A browser redirect alone can never mark payment `COMPLETED`.

## Live-call flow

```text
VOS Current Call -> realtime worker -> normalize -> Redis
                                         |
                                   state-diff event
                                         |
                                  WebSocket/SSE
                                         |
                                  admin/client UI
```

Finished calls are historical only after CDR ingestion.

## Gateway status flow

```text
VOS Online Mapping/Routing Gateway + Gateway Network
    -> collector
    -> Redis current state
    -> change event
    -> notification/webhook
    -> optional ClickHouse time-series snapshot
```

## Report flow

```text
POST export request -> PostgreSQL job
                    -> Redpanda/worker
                    -> ClickHouse query
                    -> stream file to object storage
                    -> signed/authorized download
```

Never build a ten-million-row export in API process memory.
