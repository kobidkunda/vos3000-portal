# VOS3000 UI Template Pack

This pack is the complete UI implementation-template set for the VOS3000 Admin + Customer Portal.

## Coverage

- **Admin pages:** 97 / 97
- **Client pages:** 45 / 45
- **Total unique routes/templates:** 142 / 142
- **Missing source routes:** 0
- **Duplicate routes:** 0

Every product page has its own detailed Markdown implementation template. The pack also contains shared design foundations, page archetypes, interaction flows, data/engineering handoff guides, route/API manifests, phase bundles and a validation script.

## How to use

1. Read `DESIGN.md` and `AGENTS.md`.
2. Open `ROUTE_MANIFEST.json` or `PAGE_COVERAGE.csv`.
3. Choose a page template in `04_ADMIN_PAGES` or `05_CLIENT_PAGES`.
4. Use its assigned archetype from `03_ARCHETYPES`.
5. Implement only against confirmed Portal API contracts.
6. Run `python scripts/validate_coverage.py` after page/template edits.
7. Do not invent VOS behavior. Follow the source product specs and implementation references in `99_REFERENCES`.

## Core stack assumed by the templates

- Next.js + TypeScript
- NestJS with Fastify
- PostgreSQL for transactional/business data
- ClickHouse for CDR/history/analytics
- Redis for realtime/cache/rate limits
- Redpanda for CDR/event pipelines

## Design direction

- Inter for UI/data
- IBM Plex Mono for technical identifiers
- Signal Blue `#2563EB` for primary action
- Network Cyan `#06B6D4` for realtime/network meaning
- Neutral slate/navy surfaces
- Dense 13px data tables
- Light default + first-class dark NOC mode
