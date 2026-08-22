# Architecture Decisions and Open Questions

## Locked baseline decisions

- PostgreSQL 18 for portal transactional data.
- ClickHouse for CDR/history and high-volume analytics.
- Redis for live state/cache.
- Redpanda for event buffering/replay.
- MinIO/S3-compatible storage for large exports.
- Next.js + TypeScript for admin/client web.
- NestJS + Fastify for structured API.
- VOS Adapter is the only VOS integration boundary.
- Docker Compose initially; Kubernetes deferred.

## Open questions — must be answered

### VOS
- Exact installed build?
- Official API/interface documentation available?
- Authentication method for interface?
- Can CDR be pushed externally in the deployed edition?
- Retry/ack semantics?
- Is CDR serial unique per server/softswitch/global?
- Is Current Call query safe at desired frequency?
- Which account/payment/gateway/rate write functions are externally supported?
- Can write requests carry a client-generated idempotency/reference value?
- Does VOS provide pagination/filters for very large CDR queries?

### Data
- Actual CDR/day and peak CDR/s?
- Historical retention requirement?
- Historical backfill size?
- Currency/precision?
- Timezone(s)?
- Are carrier costs required in analytics?
- Can old CDR be archived after N months?

### Product
- Can customers change gateway IP directly or request approval?
- Can customers create gateways?
- Can customers see CPS/ASR/ACD/PDD all the time?
- Which live-call fields are safe to expose?
- Which payment providers/currencies?
- Is admin call disconnect required at launch?
- Are subagent/customer hierarchies required at launch?
- Are API/webhooks launch scope?

### Operations
- Production SLOs?
- RPO/RTO?
- Single data center or multiple?
- Backup target?
- Expected support hours/on-call?
