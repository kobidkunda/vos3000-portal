# 098 — Support Settings (Admin)

Route: `/admin/settings/support` · Archetype: SETTINGS · Group: Portal Operations · Phase: P12

## Purpose
Configure the global support contacts (Telegram handle, Microsoft Teams ID) surfaced to every
authenticated client as a floating Support button. Stored once per installation in
`portal_resources` (`organization_id IS NULL`, `resource_type='support_config'`, `resource_key='global'`).

## Fields
- Global enable toggle (FAB visible/hidden for all clients)
- Button label (optional, max 120 chars)
- Telegram: enabled toggle + handle (`@name`, `https://t.me/name`, or bare name; 5–32 `[A-Za-z0-9_]`)
- Microsoft Teams: enabled toggle + ID (work email or handle, max 320 chars)
- Live preview of resolved URLs (`https://t.me/<h>`, `https://teams.microsoft.com/l/chat/0/0?users=<enc>`)

## Behavior & Guarantees
- Server-side URL construction; client-supplied URLs are ignored (open-redirect safe).
- `PUT /api/v1/admin/settings/support` validates strictly → `400 VALIDATION_ERROR {details.fields[]}`;
  writes audit_logs before/after with actor + request_id + ip on success only.
- Redis cache `support:config` (60s TTL) invalidated on save; Redis outage falls back to PostgreSQL;
  PostgreSQL outage fails closed with `503 DEGRADED`.
- Client surface `GET /api/v1/support/config` returns a URL-only projection (never raw handles/ids).

## States
Loading spinner · fetch error + Retry · permission-denied card (403) · degraded banner via page warnings ·
empty-state helper when no contacts configured · success toast "Support contacts saved and audited".
