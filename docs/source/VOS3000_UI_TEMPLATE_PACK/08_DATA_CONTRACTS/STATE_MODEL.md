# Shared UI State Model

All pages can occupy:
`initial -> loading -> success | empty | error | forbidden | not_found | degraded | stale`

Mutation pages additionally:
`idle -> validating -> confirming -> submitting -> success | failure | reconciliation_required`

Live pages additionally:
`connecting -> live -> reconnecting -> stale -> disconnected`
