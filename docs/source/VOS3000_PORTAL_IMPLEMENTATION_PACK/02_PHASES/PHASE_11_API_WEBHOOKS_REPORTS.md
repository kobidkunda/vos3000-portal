# Phase 11 — Customer API, Webhooks, Reports & Large Exports

## Objective

Turn the portal into a stable external platform API while keeping expensive work asynchronous.

## Dependencies

Core domain APIs working; Phase 05 analytics; Phase 02 security.

## Deliverables

- [ ] Versioned public API.
- [ ] API key/scopes.
- [ ] Rate limiting.
- [ ] Signed outbound webhooks.
- [ ] Delivery retry log.
- [ ] Async report/export system.
- [ ] Developer UI/docs.

## Detailed workstreams

### Public API

- [ ] Publish `/api/v1` stable contract.
- [ ] Use key IDs/secrets with scopes.
- [ ] Tenant scope derived from credential.
- [ ] Cursor pagination.
- [ ] Request IDs.
- [ ] Per-key/per-tenant rate limits.
- [ ] Deprecation/version policy.
### Webhooks

- [ ] Version event envelope.
- [ ] HMAC sign body + timestamp.
- [ ] Use idempotent stable event ID.
- [ ] Retry with bounded exponential backoff.
- [ ] DLQ/disable after policy threshold.
- [ ] Test delivery action.
- [ ] SSRF-safe endpoint validation and outbound egress controls.
### Reports

- [ ] Create job metadata in PG.
- [ ] Query ClickHouse with resource limits.
- [ ] Stream output to object storage.
- [ ] CSV.gz/Parquet for huge exports; XLSX only within policy limits.
- [ ] Authorized expiring download.
- [ ] Scheduled reports with timezone.
### Developer experience

- [ ] OpenAPI docs.
- [ ] API key management.
- [ ] Request logs with redaction.
- [ ] Webhook delivery logs.
- [ ] Examples for balance/CDR/gateway/rate lookup.

## PostgreSQL / ClickHouse / Redis / Redpanda work

- [ ] api_keys, api_scopes, api_request_summary/log metadata, webhook_endpoints, webhook_deliveries, report_jobs, report_schedules, downloads.

## API work

- [ ] Public `/api/v1/*`, admin control endpoints, signed webhook event model.

## UI/product work

- [ ] Client Developer pages, Downloads, Scheduled Reports; admin API/Webhook management.

## Testing and verification

- [ ] API auth/scope matrix.
- [ ] Rate-limit tests.
- [ ] Webhook signature/retry/duplicate.
- [ ] SSRF tests.
- [ ] 10M-row export memory test.
- [ ] Expired download authorization.

## Acceptance criteria / exit gate

- [ ] No export loads entire result set into API memory.
- [ ] Webhook delivery is replay-safe and observable.
- [ ] API key cannot exceed tenant/scope.
- [ ] Public API OpenAPI matches implementation.

## Primary risks

- Outbound webhook SSRF.
- Large exports can monopolize ClickHouse.
- Unbounded API date ranges can become denial-of-service.

## Required evidence before marking complete

- [ ] Pull request(s) merged with CI green.
- [ ] Environment deployment evidence captured.
- [ ] API/OpenAPI or event schemas updated.
- [ ] Database/event migrations committed and reviewed.
- [ ] Security/RBAC implications reviewed.
- [ ] Observability added for new critical paths.
- [ ] Rollback/degradation behavior documented.
- [ ] Relevant reference/product pages traced to implementation tickets.
- [ ] No `[VERIFY-VOS-API]` assumption silently converted into production code.

## References

- `03_ENGINEERING/API_CONTRACT_GUIDELINES.md`
- `03_ENGINEERING/EXPORT_REPORT_PIPELINE.md`
- `03_ENGINEERING/REDPANDA_TOPICS_EVENTS.md`

## Phase completion record

| Field | Value |
|---|---|
| Owner | TBD |
| Start | TBD |
| Target finish | TBD |
| Actual finish | TBD |
| Status | Not started |
| Blocking issues | |
| Approved by | |
