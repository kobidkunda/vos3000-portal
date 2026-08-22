# Multi-VOS Instance Design

## Why now

Even if launch uses one VOS server, IDs like account `1001` or gateway `GW1` can collide when a second server is added.

## Canonical identity

Every VOS resource identity is:

```text
(vos_instance_id, upstream_type, upstream_id)
```

Never treat upstream account/gateway IDs as globally unique.

## Registry

`vos_instances`:
- internal UUID
- name
- environment/region
- version/build
- timezone
- billing currency/default precision
- connection profile/secret reference
- enabled
- read capability set
- write capability set
- health

## Tenant mapping

A tenant may map to:
- one account on one VOS;
- multiple accounts on one VOS;
- accounts across multiple VOS instances later.

Portal APIs must not assume exactly one external account unless product policy enforces it.

## CDR

Every CDR stores `vos_instance_id`.
Dedup key includes it.

## Realtime

Redis keys include instance.
Streams project by tenant after mapping.

## Adapter

Factory:
```text
adapterRegistry.forInstance(vos_instance_id)
```

Capability is evaluated per instance/build, not globally.

## Migration

If customer moves between VOS instances:
- historical CDR keeps old instance ID;
- portal tenant remains stable;
- new external mapping gets effective date;
- reports can span both.
