# Page Data Contract

Every page query/mutation should define:
- endpoint + method
- auth scope
- tenant/resource scope
- request DTO
- response DTO
- redaction/projection rules
- cache/freshness policy
- pagination/sort/filter contract
- error codes
- request_id
- idempotency behavior for retryable writes
- audit behavior
- realtime event schema when applicable

The page template is not the API contract; freeze the API schema before final UI integration.
