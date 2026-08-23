from pathlib import Path
import json,re,sys
root=Path(__file__).resolve().parents[1]
routes=json.loads((root/'docs/ui-template-pack/ROUTE_MANIFEST.json').read_text())
errs=[]
admin=[r for r in routes if r['side']=='Admin']; client=[r for r in routes if r['side']=='Client']
if len(routes)!=146: errs.append(f'routes={len(routes)} expected 146')
if len(admin)!=100: errs.append(f'admin={len(admin)} expected 100')
if len(client)!=46: errs.append(f'client={len(client)} expected 46')
if len(set(r['route'] for r in routes))!=146: errs.append('duplicate route patterns')
for r in routes:
 p=root/'docs/ui-template-pack'/r['template_file']
 if not p.exists(): errs.append('missing template '+str(p))
required=['apps/web/app/admin/[[...slug]]/page.tsx','apps/web/app/app/[[...slug]]/page.tsx','apps/api/src/main.ts','infra/postgres/init.sql','infra/clickhouse/init.sql','config/vos-capabilities.json','DESIGN.md','AGENTS.md']
for x in required:
 if not (root/x).exists(): errs.append('missing '+x)
# verify every product API is represented in generated registry
source=[]
for r in routes:
 source.extend(r.get('apis',[]))
text=(root/'apps/api/src/dynamic-api.generated.ts').read_text()
for a in source:
 m=re.match(r'^(GET|POST|PUT|PATCH|DELETE)\s+([^?]+)',a)
 if m and m.group(2) not in text: errs.append('api missing '+a)

# verify every non-GET product API has an explicit action schema
def _extract_array(path, marker):
 text=path.read_text(); start=text.index(marker)+len(marker); end=text.index(' as const satisfies',start); return json.loads(text[start:end])
try:
 apis=_extract_array(root/'packages/shared/src/api-registry.generated.ts','export const productApis = ')
 actions=_extract_array(root/'packages/shared/src/actions.generated.ts','export const actionSchemas = ')
 action_keys={(x['method'],x['path']) for x in actions}
 for a in apis:
  if a['method']!='GET' and (a['method'],a['path']) not in action_keys: errs.append('missing action schema '+a['method']+' '+a['path'])
except Exception as e: errs.append('could not validate generated API/action registries: '+str(e))

# production Compose reference must be present; use `docker compose config` in runtime validation.
if not (root/'docker-compose.production.yml').exists(): errs.append('missing docker-compose.production.yml')
for name in ['package.json','apps/api/package.json','apps/web/package.json','apps/worker/package.json','packages/shared/package.json','packages/vos-adapter/package.json','config/vos-capabilities.json']:
 try: json.loads((root/name).read_text())
 except Exception as e: errs.append(f'invalid JSON {name}: {e}')
if (root/'infra/postgres/migrations/001_initial.sql').read_text().count('payments_customer_idempotency_uq')!=1: errs.append('duplicate payment idempotency index in initial migration')
if 'Drizzle ORM' in (root/'README.md').read_text(): errs.append('README claims ORM dependency that is not installed')
if 'createMfaTicket({...base,user})' in (root/'apps/api/src/auth.service.ts').read_text(): errs.append('MFA ticket stores full user record')
if "next_retry_at,created_at) VALUES" not in (root/'apps/worker/src/index.ts').read_text(): errs.append('webhook delivery claim has no crash-recovery lease')

# reviewed hardening invariants
ds=(root/'apps/api/src/data-sources.service.ts').read_text()
if "redis.call('INCR',KEYS[1])" not in ds or "redis.call('EXPIRE',KEYS[1],ARGV[1])" not in ds: errs.append('Redis rate limiter is not atomic')
auth=(root/'apps/api/src/auth.service.ts').read_text()
if 'expectedSide?:"admin"|"client"' not in auth or 'if(expectedSide&&t.side!==expectedSide)return undefined' not in auth: errs.append('MFA challenge is not bound to portal side')
worker=(root/'apps/worker/src/index.ts').read_text()
if 'reconcileStalePaymentCredits' not in worker or "status='CREDITING_VOS'" not in worker: errs.append('stale VOS payment credit claims are not reconciled')
if 'if(v.startsWith("::ffff:"))return isBlockedIp(v.slice(7))' not in worker: errs.append('webhook SSRF guard does not normalize IPv4-mapped IPv6')
shell=(root/'apps/web/components/Shell.tsx').read_text()
if 'r.route.includes("{")' not in shell: errs.append('sidebar may generate fake links for dynamic entity routes')
if 'health.data_mode&&health.data_mode!=="external"' not in shell: errs.append('production health can be mislabeled as demo')
if not (root/'infra/postgres/migrations/004_payment_state_recovery.sql').exists(): errs.append('missing payment state recovery migration')

if errs:
 print('FAIL'); print('\n'.join(errs)); sys.exit(1)
print('PASS: 146/146 routes, 100 admin, 46 client, all templates/APIs/actions and configuration checks passed.')
