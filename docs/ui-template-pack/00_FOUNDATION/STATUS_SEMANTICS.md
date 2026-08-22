# Status Semantics

| Meaning | Token | Required label |
|---|---|---|
| Online/healthy/success | green `#16A34A` | Online / Healthy / Completed |
| Degraded/warning | amber `#D97706` | Degraded / Warning |
| Offline/error/critical | red `#DC2626` | Offline / Failed / Critical |
| Realtime/connecting | cyan `#06B6D4` | Live / Connecting / Registering |
| Pending | violet `#7C3AED` | Pending / Processing |
| Disabled | slate `#64748B` | Disabled |

Rules:
- Color never stands alone.
- CDR rows stay neutral; use a compact dot/badge in the status column.
- Red is reserved for actual critical/destructive meaning.
- Cyan is not a generic accent; it means network/realtime.
