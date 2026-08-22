# VOS Contract Test Plan

## Purpose

The VOS manual documents features, but not necessarily a complete public API. This suite proves behavior against the installed build.

## Test metadata

Every test records:
- VOS instance;
- build/version;
- timestamp;
- test resource IDs;
- capability name;
- request/transport type;
- sanitized request/response fixture.

## Read tests

### Account
- get account;
- balance;
- status;
- rate group;
- expiry;
- gateway count.

### CDR
- recent;
- date-filter historical;
- exact serial/Call-ID;
- pagination/record limit behavior;
- timezone/precision.

### Current Call
- list active calls;
- caller/callee;
- mapping/routing gateway;
- duration/PDD;
- IP/media fields if returned.

### Gateway
- mapping/routing list;
- online state;
- registered IP;
- line limit/current sessions;
- ASR/ACD/CPS;
- network loss/delay.

### Payment record
- read after known test payment.

### Rate
- groups/rates;
- number/routing analysis where available.

## Mutation tests

Only non-production.

For each mutation:
1. create known pre-state;
2. execute once;
3. verify response;
4. read back;
5. repeat same command/retry simulation;
6. record idempotency/duplicate behavior;
7. clean up.

Mutations:
- account create/update/lock;
- payment/credit;
- gateway create/update/IP/capacity;
- phone changes;
- rate update/import;
- disconnect call.

## Failure tests

- invalid auth;
- invalid field;
- nonexistent resource;
- timeout;
- VOS unavailable;
- duplicate command;
- partial/unknown result.

## Capability output

A generated matrix:

```text
capability | supported | read/write | idempotent | verified build | notes
```

Production adapter capability is enabled only from this matrix.
