# P07 — Customer Self-Service Core — Dashboard, CDR, Gateways & Rates — UI Template Bundle

Pages: **8**

- **Client · Client Dashboard** — `/app` — `05_CLIENT_PAGES/005_client-dashboard.md`
- **Client · My Gateways** — `/app/gateways` — `05_CLIENT_PAGES/020_my-gateways.md`
- **Client · Gateway Detail** — `/app/gateways/{gatewayId}` — `05_CLIENT_PAGES/021_gateway-detail.md`
- **Client · Gateway Network Quality** — `/app/gateways/{gatewayId}/network` — `05_CLIENT_PAGES/024_gateway-network-quality.md`
- **Client · Gateway Call Statistics** — `/app/gateways/{gatewayId}/statistics` — `05_CLIENT_PAGES/025_gateway-call-statistics.md`
- **Client · My Rate Sheet** — `/app/rates` — `05_CLIENT_PAGES/026_my-rate-sheet.md`
- **Client · Rate Lookup** — `/app/rates/lookup` — `05_CLIENT_PAGES/027_rate-lookup.md`
- **Client · Gateway Report** — `/app/reports/gateways` — `05_CLIENT_PAGES/031_gateway-report.md`

## Phase UI Gate

- All listed page API contracts available or explicitly mocked against frozen schemas.
- Required roles/permissions implemented.
- Source requirements have test IDs.
- Loading/empty/error/degraded states implemented.
- Design tokens and archetypes used consistently.
- Integration/VOS capabilities verified before enabling writes.