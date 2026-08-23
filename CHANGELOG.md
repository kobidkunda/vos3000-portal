# Changelog

All notable changes to the VOS3000 Admin + Client Portal are documented here.

## [Unreleased] — Device Setup Guides

### Added
- **Device Setup Hub** (`/app/devices/setup`, `/admin/devices/setup`): beautiful chooser grid covering 12 devices — MicroSIP, Linphone, Zoiper 5, Groundwire, Bria, Yealink T5, Grandstream GXP/GRP, Cisco 78xx, Poly VVX, Fanvil X/U, WebRTC Dialer, Mobile Dialer — with gateway picker, category pills, and search.
- **4-step Configuration Wizard** (`/app/devices/setup/{deviceKey}` + admin mirror): Choose Device → SIP Account → Network & Codecs → Test & Verify, with vertical stepper, URL-synced step state, and localStorage resume.
- **SIP credential panel**: server-side masked DTOs (`•••x`), explicit reveal action (audit-logged), per-field copy buttons with copy-event audit trail, SIP URI display.
- **QR provisioning modal** for QR-capable softphones; **.cfg download** for Yealink/Grandstream-style provisioning files.
- **Live registration check** backed by Redis gateway online keys with degraded-state handling (never fabricates Online).
- **Troubleshooting matrix** per device with deep links into Registration Analysis, Call Analysis, Gateway Status, and NOC.
- **WebRTC quick-connect dialer** panel (Step 4) for browser-based testing.

### Security
- Tenant isolation enforced server-side: client contexts can only resolve gateways owned by their tenant (`TENANT_MISMATCH` on foreign probes); admin mirrors require admin sessions.
- RBAC: `/devices/*` paths added to allowlists for client `billing_client`/`technical` reads and admin `noc`/`support`; owner/super_admin unaffected.
- Audit records for every reveal, verify, and copy event — masked values only, raw secrets never logged or returned in list payloads.

### Infrastructure
- 7 new product APIs registered (`GET/POST /api/v1[/admin]/devices/setup/*`) with Zod-validated inputs, request_id correlation, and structured errors.
- Route manifest extended to 145 routes (99 admin / 46 client); validator updated accordingly.
