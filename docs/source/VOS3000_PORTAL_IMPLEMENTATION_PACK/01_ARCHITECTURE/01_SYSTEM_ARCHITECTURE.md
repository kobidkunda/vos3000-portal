# System Architecture

## 1. Logical architecture

```text
                           Internet
                              |
                           Nginx/TLS
                              |
             +----------------+----------------+
             |                                 |
         Next.js Web                       Portal API
      /admin + /app                  NestJS + Fastify
                                               |
      +-------------------+--------------------+-------------------+
      |                   |                    |                   |
 PostgreSQL           ClickHouse             Redis             Redpanda
 business state       CDR/history          live/cache        event backbone
      |                   |                    |                   |
      +-------------------+----------+---------+-------------------+
                                     |
                                Worker Processes
                     +---------------+----------------+
                     |               |                |
                  Reports         Webhooks        Notifications
                                     |
                                VOS Adapter
                                     |
                                   VOS3000
```

## 2. Process topology

Recommended independent runtime processes from one repository:

- `web`: Next.js server.
- `api`: customer/admin REST API and normal synchronous operations.
- `cdr-ingest`: very small high-throughput endpoint/service for VOS CDR intake.
- `cdr-consumer`: batches validated CDR events into ClickHouse.
- `realtime-worker`: polls/subscribes to current-call/gateway state and updates Redis.
- `worker`: payments, reports, notifications, webhooks, reconciliation, scheduled jobs.
- `scheduler`: can initially be part of `worker`, but must use distributed locks.

The project is **not** split into many repositories. It is a modular monorepo with separate deployable processes.

## 3. Data planes

### Transactional plane
PostgreSQL stores:
- users, sessions, roles, permissions;
- customers and tenant mappings;
- VOS instance/account/gateway mappings;
- rate publication metadata;
- payment ledger and reconciliation;
- API keys and webhook configs;
- support, notifications, audit;
- job metadata and export metadata.

### Analytical plane
ClickHouse stores:
- normalized CDR facts;
- optional raw CDR payload metadata;
- hourly/daily rollups;
- quality/failure/destination aggregates.

### Realtime plane
Redis stores:
- live calls keyed by tenant/gateway/call;
- online/offline gateway state;
- current CPS/concurrency;
- short-lived dashboard cache;
- rate-limit counters;
- session/cache data if configured.

### Event plane
Redpanda topics carry:
- CDR received/normalized;
- gateway state changes;
- payment events;
- webhook events;
- notification events;
- report/export jobs.

## 4. VOS boundary

[VOS-SOURCE] The manual documents Account Management, Payment, Mapping/Routing Gateways, Online Gateways, Gateway Network, Current Call, CDR, Payment Record, Reports, User Management and Interface Management.

[VERIFY-VOS-API] The manual does not prove that every GUI operation is available as a complete REST API. Therefore:

```text
Portal API -> VOS Adapter -> one of:
  - documented/supported VOS service interface
  - verified external event interface
  - verified query/read connector
  - explicitly approved fallback connector
```

No frontend module may contain VOS protocol/database-specific logic.

## 5. Multi-VOS support from day one

Every external entity that originates from VOS carries `vos_instance_id`.

Examples:
- `vos_accounts`
- `vos_gateways`
- `vos_phones`
- CDR `vos_instance_id`
- reconciliation records

This prevents an expensive redesign when a second softswitch is added.

## 6. Availability philosophy

Initial deployment can be a small cluster or several VMs, but logical boundaries must already support horizontal scaling.

Stateless services:
- web
- api
- cdr-ingest
- consumers/workers

Stateful services:
- PostgreSQL
- ClickHouse
- Redis
- Redpanda
- object storage

Stateful systems must have independently tested backup/restore procedures before production.
