# Risk Register

| ID | Risk | Impact | Mitigation / gate |
|---|---|---|---|
| R01 | VOS GUI feature has no supported API | High | Phase 00 capability matrix; hide unsupported write |
| R02 | Direct DB write bypasses VOS business logic | Critical | Prohibited by default; vendor-supported interface first |
| R03 | CDR duplicate delivery double-counts | Critical | Stable dedupe identity + replay tests |
| R04 | CDR source does not retry long enough | High | Verify source; Redpanda durable ack; fallback capture plan |
| R05 | Wrong ClickHouse sort key | High | Benchmark real queries before scale |
| R06 | Raw CDR scans overload dashboard | High | Hourly/daily rollups |
| R07 | Payment provider success but VOS outcome unknown | Critical | Command state + reconciliation; no blind retry |
| R08 | Cross-tenant data leak | Critical | Server-side scope + negative tests + DTO separation |
| R09 | Admin DTO leaks carrier cost to client | High | Separate client projections + contract tests |
| R10 | Polling live calls overloads VOS | High | Benchmark/adaptive interval + freshness UI |
| R11 | Redis loss interpreted as call loss | Medium | Redis only projection; rebuild from VOS |
| R12 | Huge export consumes API memory | High | Async streaming worker + object storage |
| R13 | Webhook endpoint SSRF | High | URL validation, DNS/IP checks, egress controls |
| R14 | Rate bulk change causes negative margin/outage | Critical | staged import, diff, approval, route tests |
| R15 | Backup cannot restore | Critical | scheduled restore drills |
| R16 | Multiple VOS instances collide IDs | High | composite identity from day one |
| R17 | Money precision mismatch | Critical | exact decimal/minor units + source precision verification |
| R18 | Timezone mismatch shifts billing/report days | High | UTC canonical + source timezone metadata |
| R19 | Redpanda disk fills during downstream outage | High | capacity/retention alerts and runbook |
| R20 | ClickHouse merges/disk saturation | High | parts/merge monitoring, batched inserts, capacity plan |
| R21 | Old CDR schema cannot replay after evolution | High | versioned events + backward-compatible consumer |
| R22 | Feature rollout enables unverified writes | Critical | server-side capability + feature flags |
| R23 | Customer balance shown stale as live | High | freshness timestamp/degraded status |
| R24 | Historical VOS data inconsistent | Medium/High | migration reconciliation and explicit discrepancies |
