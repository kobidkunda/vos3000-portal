# P05 — ClickHouse CDR Store, Rollups, Query APIs & Analytics — UI Template Bundle

Pages: **7**

- **Client · CDR Explorer** — `/app/cdr` — `05_CLIENT_PAGES/012_cdr-explorer.md`
- **Client · CDR Detail** — `/app/cdr/{cdrId}` — `05_CLIENT_PAGES/013_cdr-detail.md`
- **Client · Recent Calls** — `/app/cdr/recent` — `05_CLIENT_PAGES/014_recent-calls.md`
- **Client · CDR Export Jobs** — `/app/cdr/exports` — `05_CLIENT_PAGES/015_cdr-export-jobs.md`
- **Client · Traffic Analytics** — `/app/analytics/traffic` — `05_CLIENT_PAGES/017_traffic-analytics.md`
- **Client · Failure Analytics** — `/app/analytics/failures` — `05_CLIENT_PAGES/018_failure-analytics.md`
- **Client · Destination Analytics** — `/app/analytics/destinations` — `05_CLIENT_PAGES/019_destination-analytics.md`

## Phase UI Gate

- All listed page API contracts available or explicitly mocked against frozen schemas.
- Required roles/permissions implemented.
- Source requirements have test IDs.
- Loading/empty/error/degraded states implemented.
- Design tokens and archetypes used consistently.
- Integration/VOS capabilities verified before enabling writes.