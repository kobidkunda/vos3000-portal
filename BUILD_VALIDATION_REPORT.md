# Build & Validation Report

Generated: 2026-08-21T22:11:45Z

## Coverage
- Admin routes: **97/97**
- Client routes: **45/45**
- Total product routes: **142/142**
- Unique declared product API method/path entries: **187**
- Page templates present: **142/142**
- Non-GET product APIs without explicit action schema: **0**

## Review validation completed
- `scripts/validate_application.py`: **PASS**
- JSON parsing: **PASS**
- Development Compose YAML parse: **PASS**
- Production Compose YAML parse: **PASS**
- Redpanda topic script `bash -n`: **PASS**
- PostgreSQL migration runner `node --check`: **PASS**
- TypeScript no-resolve syntax/control-flow sanity scan: **PASS for actionable diagnostics**
- Route uniqueness/template presence: **PASS**
- API/action registry coverage: **PASS**
- MFA minimum-data/side-binding invariants: **PASS**
- Atomic Redis rate-limiter invariant: **PASS**
- Webhook crash-recovery lease invariant: **PASS**
- Payment stale-credit reconciliation invariant: **PASS**
- Dynamic sidebar fake-ID prevention invariant: **PASS**

## Dependency build status
A dependency-resolved build is **not claimed**. The sandbox could not reach the npm registry, so exact npm dependencies could not be installed and `npm run build` / `npm test` could not be executed against those packages.

Before deployment on an internet-connected CI/staging host:

```bash
npm install
npm run build
npm test
npm run validate
```

Generate and commit `package-lock.json`, then use `npm ci` for reproducible CI/deployment builds.

## VOS integration status
Real VOS writes remain capability-gated. Only operations explicitly verified in `config/vos-capabilities.json` may execute in `VOS_MODE=http`. Unverified operations fail closed; the code does not guess undocumented VOS endpoints or write directly to VOS database tables.

## Production status
This package is a **reviewed staging baseline**, not a zero-defect or production-certification claim. Real VOS, payment-provider, Docker-runtime, load, restore and security tests remain deployment gates.

See `FINAL_REVIEW_REPORT.md` and `docs/PRODUCTION_CHECKLIST.md`.
