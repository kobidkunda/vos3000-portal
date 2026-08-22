# Technology Stack Decisions

## Final baseline

Next.js + TypeScript + Tailwind + shadcn/ui; NestJS on Fastify; PostgreSQL 18 + PgBouncer; ClickHouse; Redis; Redpanda; MinIO/S3-compatible object storage; Nginx; Prometheus + Grafana + Loki; Docker Compose initially on Ubuntu, with Kubernetes deferred until operational need is proven.

## Why PostgreSQL 18

Use for ACID business state and relational integrity:
- customers/accounts;
- user/RBAC relationships;
- payment ledger;
- gateway mappings;
- API keys/webhooks;
- audit and configuration.

Do **not** make PostgreSQL the main long-term CDR fact store.

Recommended additions:
- PgBouncer for connection pooling.
- native PostgreSQL migrations.
- Drizzle ORM or explicit SQL repository layer for application entities.
- `NUMERIC`/integer minor units for money; never binary float.

## Why ClickHouse

CDR is append-heavy, time-oriented and aggregation-heavy. ClickHouse is used for:
- millions/billions of call facts;
- high-cardinality filters;
- time-series aggregations;
- ASR/ACD/PDD/failure/destination analytics;
- report source.

Do not use an ORM abstraction that hides ClickHouse query semantics. Use the official/native client and explicit SQL.

## Why Redis

Use only for ephemeral/live concerns:
- sessions/cache;
- rate limits;
- current calls;
- gateway presence/status;
- CPS/concurrency counters;
- distributed short locks.

Financial truth never exists only in Redis.

## Why Redpanda

Used as a Kafka-compatible durable event buffer:
- absorb CDR bursts;
- decouple ingestion from ClickHouse;
- replay after downstream failure;
- fan out to analytics, webhooks and notifications.

Avoid synchronous CDR -> ClickHouse-only ingestion.

## Why MinIO/S3

Large exports and reports should not be stored in PostgreSQL or returned directly from long HTTP requests.

Use object storage for:
- CSV/CSV.gz;
- Parquet;
- limited-size XLSX;
- generated statements/reports;
- diagnostic bundles if approved.

## Why NestJS + Fastify

The portal contains many domains and permissions. NestJS provides module structure and DI; Fastify keeps the HTTP layer efficient.

Use one codebase with modules, not dozens of microservice repositories.

## Deferred technologies

Do not introduce without measured need:
- Kubernetes;
- Elasticsearch/OpenSearch;
- service mesh;
- GraphQL;
- separate identity platform;
- Cassandra;
- multiple event buses.

Each new stateful system must solve a measured bottleneck.
