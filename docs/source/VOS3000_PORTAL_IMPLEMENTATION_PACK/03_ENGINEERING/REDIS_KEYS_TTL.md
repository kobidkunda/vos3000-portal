# Redis Key Model and TTL Policy

## Rule

Redis is disposable/rebuildable. If losing Redis causes permanent financial/CDR loss, the design is wrong.

## Suggested key namespaces

### Sessions
```text
session:{session_id_hash}
```
TTL = session expiry.

### Rate limiting
```text
ratelimit:api:{key_id}:{window}
ratelimit:login:{ip}:{window}
```
TTL = window + small margin.

### Live call snapshot
```text
livecall:{vos_instance}:{call_identity}
tenant:{tenant}:livecalls
gateway:{vos_instance}:{gateway}:livecalls
```

Use a data structure that supports efficient replacement/removal and tenant projection.

TTL:
- several multiples of collector interval;
- stale flag set before hard disappearance if useful.

### Gateway state
```text
gateway:{vos_instance}:{gateway}:state
tenant:{tenant}:gateways
```

Fields:
- online
- registered_ip
- current_calls
- line_limit
- cps
- asr/acd if source provides current metric
- registration_time
- update_time
- last_collected_at
- network_loss
- network_delay_ms

### Dashboard cache
```text
dashboard:{tenant}:{range}:{version}
```
Short TTL only; cache can be invalidated on key events.

### Distributed locks
```text
lock:job:{name}
lock:payment-command:{id}
```
Use safe lock implementation with ownership token and finite TTL. Do not build financial correctness solely on a lock.

## Redis memory protections

- set maxmemory policy consciously;
- monitor evictions;
- never allow unbounded per-call keys without TTL;
- load-test live call key count at expected concurrency;
- avoid giant JSON blobs if partial fields are updated frequently.

## Recovery

On Redis restart:
- sessions may be restored depending on chosen session storage strategy; otherwise users can re-login;
- live gateway/call state is rebuilt from VOS collector;
- dashboards rebuild from ClickHouse/PostgreSQL.
