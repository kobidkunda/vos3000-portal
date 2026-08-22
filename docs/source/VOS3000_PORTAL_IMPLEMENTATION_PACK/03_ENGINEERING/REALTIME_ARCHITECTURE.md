# Realtime Architecture

## Sources

[VOS-SOURCE]
- Current Call
- Online Mapping Gateway
- Online Routing Gateway
- Mapping/Routing Gateway Network

## Collector

Each VOS instance has a collector loop:
1. query verified source;
2. timestamp response;
3. normalize objects;
4. compare current snapshot to Redis;
5. write latest state;
6. publish added/changed/removed events;
7. update collector health.

## Poll frequency

Must be benchmarked against VOS capacity.
Do not assume 1-second polling is safe.
Possible strategy:
- current calls: few seconds if VOS supports load;
- gateway online: 5–15 seconds;
- network quality: slower.

Expose actual freshness to UI.

## Client stream

Use WebSocket or SSE.

Initial connection:
- authenticate;
- authorize tenant;
- send current snapshot;
- then incremental changes.

Reconnect:
- client discards uncertain state;
- receives fresh snapshot;
- continues.

## Backpressure

For state streams, newest state matters more than delivering every intermediate metric update.
Coalesce repeated updates where safe.

Do not coalesce:
- payment events;
- immutable completed-call events that feed webhooks.

## Stale behavior

If collector has not succeeded within threshold:
- mark source `DEGRADED/STALE`;
- do not show a misleading green online status based solely on old cache;
- retain last known state with timestamp if useful.

## Disconnect call

Admin-only baseline.
Must go synchronously through VOS Adapter with:
- permission;
- confirmation;
- reason;
- request ID;
- audit;
- explicit success/unknown/failure result.
