# Device Setup Guides

Self-serve configuration for dialers, softphones, and IP phones.

## Where
- **Client portal**: `/app/devices/setup` (hub) → `/app/devices/setup/{deviceKey}` (wizard)
- **Admin portal**: `/admin/devices/setup` → `/admin/devices/setup/{deviceKey}` (mirror with tenant gateway picker)

## Supported devices (12)
| Key | Device | Category | QR | .cfg | WebRTC |
|---|---|---|---|---|---|
| microsip | MicroSIP | softphone | ✓ | — | — |
| linphone | Linphone | softphone | ✓ | — | — |
| zoiper | Zoiper 5 | softphone | ✓ | — | — |
| groundwire | Groundwire | softphone | ✓ | — | — |
| bria | Bria Solo / Teams | softphone | ✓ | — | — |
| yealink-t5x | Yealink T5 Series | deskphone | ✓ | ✓ | — |
| grandstream | Grandstream GXP / GRP | deskphone | ✓ | ✓ | — |
| cisco-78xx | Cisco 78xx | deskphone | — | ✓ | — |
| poly-vvx | Poly VVX / Edge | deskphone | ✓ | ✓ | — |
| fanvil | Fanvil X / U Series | deskphone | ✓ | ✓ | — |
| webrtc | WebRTC Dialer (Browser) | webrtc | — | — | ✓ |
| mobile-dialer | Mobile Dialer | mobile | ✓ | — | — |

## Wizard steps
1. **Choose Device** — device overview + prerequisites.
2. **SIP Account** — copy-ready fields (server, port, transport, username, password masked `•••x`, display name), reveal button (audit-logged), per-field copy (audit-logged), QR modal, `.cfg` download where supported.
3. **Network & Codecs** — UDP/TCP/TLS guidance, STUN toggle advice, keep-alive validation (15–120s), codec priority hints, DTMF mode. Informational only; nothing is written to VOS from this step.
4. **Test & Verify** — live registration probe (Redis-backed, degraded-safe), troubleshooting matrix with deep links to Registration Analysis / Call Analysis / Gateway Status / NOC, WebRTC quick-connect dialer for the browser device.

## API surface
```
GET  /api/v1/devices/setup/devices?category=&search=
GET  /api/v1/devices/setup/instructions?deviceKey=&gatewayId=&reveal=0|1
POST /api/v1/devices/setup/verify            { gatewayId, deviceKey }
POST /api/v1/devices/setup/copy-event        { gatewayId, deviceKey, field }
GET  /api/v1/admin/devices/setup/devices
GET  /api/v1/admin/devices/setup/instructions?...
POST /api/v1/admin/devices/setup/verify
```

## Security model
- SIP credentials are assembled **server-side** from the tenant-owned gateway record and returned as a **masked DTO** (`passwordMasked = •••<last-char>`). Raw secrets are only included when `reveal=1`, which requires an authenticated session and writes an audit record (`device-setup:reveal`).
- Tenant isolation: client contexts resolve gateways through `DataSourcesService.listGateways(ctx, id)` which scopes by `customer_id = ctx.tenantId`. A foreign gateway id yields `403 TENANT_MISMATCH`.
- Every reveal, verify, and copy event is audited with request_id correlation; audit payloads contain masked values only.
- RBAC: client roles `owner` (all), `read_only` (reads), `billing_client`/`technical` (reads via `/devices` allowlist); admin roles `super_admin` (all), `noc`/`support` (reads + verify).

## Extending the registry
Add a new device by appending one entry to `apps/web/lib/devicesRegistry.ts` (label, category, capabilities, field mapping, instruction steps, troubleshooting) and one entry to the service list in `apps/api/src/devices-setup/service.ts`. No new routes or code paths are required.
