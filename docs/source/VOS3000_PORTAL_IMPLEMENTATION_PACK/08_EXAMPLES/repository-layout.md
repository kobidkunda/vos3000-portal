# Suggested Repository Layout

```text
vos-portal/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   └── app/
│   │   └── components/
│   ├── api/
│   │   └── src/
│   │       ├── auth/
│   │       ├── customers/
│   │       ├── gateways/
│   │       ├── calls/
│   │       ├── cdr/
│   │       ├── analytics/
│   │       ├── rates/
│   │       ├── billing/
│   │       ├── payments/
│   │       ├── reports/
│   │       ├── webhooks/
│   │       ├── support/
│   │       ├── audit/
│   │       └── integrations/vos/
│   ├── cdr-ingest/
│   ├── worker/
│   └── realtime/
├── packages/
│   ├── config/
│   ├── db-postgres/
│   ├── db-clickhouse/
│   ├── redis/
│   ├── events/
│   ├── vos-adapter/
│   ├── auth/
│   ├── observability/
│   └── shared/
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── postgres/
│   ├── clickhouse/
│   ├── redpanda/
│   ├── redis/
│   ├── minio/
│   └── monitoring/
├── docs/
└── tests/
    ├── contract-vos/
    ├── integration/
    ├── e2e/
    └── load/
```
