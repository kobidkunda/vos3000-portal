# Background Jobs

## Jobs that must not block HTTP

- large CDR export;
- scheduled reports;
- webhook retries;
- email/notification delivery;
- payment reconciliation;
- VOS sync;
- rate import/validation;
- historical CDR backfill;
- cleanup/retention tasks.

## Job lifecycle

```text
QUEUED -> RUNNING -> SUCCEEDED
                   -> RETRY_WAIT -> RUNNING
                   -> FAILED
                   -> CANCELLED
```

Each job stores:
- job ID;
- type;
- tenant;
- requester;
- input hash/reference;
- progress;
- attempts;
- created/started/finished;
- error code;
- output object reference.

## Idempotency

Every worker must be safe to restart.
Long jobs checkpoint progress.
A lease/heartbeat prevents two workers from processing the same job unintentionally.

## Scheduling

Use Redpanda for event-driven jobs and a PG-backed scheduler/worker for cron-like schedules.
If one scheduler process runs, still use a distributed lock so adding another worker does not duplicate reports/payments.

## Retry policy

Retry transient:
- network timeout;
- temporary provider failure;
- ClickHouse/MinIO unavailable.

Do not blindly retry:
- invalid customer input;
- permission failure;
- unsupported VOS operation;
- malformed destination URL.

## Visibility

Admin can see:
- queued/running/failed counts;
- oldest queued age;
- failure reason;
- retry;
- cancel when safe.
