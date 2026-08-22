# API Contract Guidelines

## Base

```text
/api/v1
```

Separate auth namespaces can still live under v1.

## Response model

Success:
```json
{
  "data": {},
  "meta": {
    "request_id": "req_...",
    "data_as_of": "2026-..."
  }
}
```

Error:
```json
{
  "error": {
    "code": "GATEWAY_NOT_FOUND",
    "message": "Gateway not found",
    "request_id": "req_...",
    "details": {}
  }
}
```

Do not expose stack traces or upstream VOS secrets.

## Pagination

Use cursor pagination for CDR/high-growth resources.

Example:
```json
{
  "data": [],
  "meta": {
    "next_cursor": "...",
    "has_more": true
  }
}
```

## Time

- APIs accept/return ISO-8601.
- Internal storage uses UTC.
- UI converts to selected timezone.
- Source timezone is retained where needed for reconciliation.

## Money

Return:
```json
{
  "amount": "12.345678",
  "currency": "USD"
}
```
or explicit minor units. Do not return imprecise JS floating values for authoritative money.

## Idempotency

Required for:
- deposit creation;
- admin manual payment/credit;
- gateway/config mutations where retry can duplicate side effects;
- report job creation optionally.

Header:
```text
Idempotency-Key
```

Store scope + request hash + result.

## Capability gating

For VOS-dependent mutation:
1. authenticate;
2. authorize;
3. validate tenant/resource;
4. check adapter capability for that instance/version;
5. create audit/change command;
6. perform adapter call;
7. read-back/reconcile when possible;
8. return normalized result.

## Customer vs admin DTOs

Do not reuse the same response blindly.

Customer CDR must exclude:
- carrier cost/expense if not customer-visible;
- routing gateway/internal topology if restricted;
- other tenant information;
- internal debug/signaling.

## Rate limits

Apply by:
- IP for unauthenticated auth routes;
- user/session for UI burst protection;
- API key + tenant for public API;
- export job quotas.

## OpenAPI

OpenAPI is generated/validated in CI.
Breaking changes require version/deprecation plan.
