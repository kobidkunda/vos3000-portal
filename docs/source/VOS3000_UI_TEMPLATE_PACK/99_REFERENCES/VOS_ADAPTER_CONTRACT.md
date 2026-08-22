# VOS Adapter Contract

## Purpose

The adapter is the only layer allowed to know how VOS3000 is queried or mutated.

## Capability model

Each VOS instance advertises capabilities:

```text
account.read
account.create
account.update
account.lock
balance.read
payment.read
payment.credit

cdr.read
cdr.recent
current_calls.read
current_calls.disconnect

mapping_gateway.read
mapping_gateway.create
mapping_gateway.update
gateway.online.read
gateway.network.read

routing_gateway.read
routing_gateway.update

phone.read
phone.update

rates.read
rates.write
routing.analysis

system.log.read
system.parameters.read
system.parameters.write
```

Capabilities start false/unknown until Phase 00 verification.

## Normalized read methods

Illustrative interface:

```ts
getInstanceHealth()
getAccount(ref)
listAccounts(filter)
getBalance(accountRef)

listRecentCdr(filter)
queryCdr(filter)

listCurrentCalls(filter)

listMappingGateways(filter)
getMappingGateway(ref)
listRoutingGateways(filter)
listOnlineGateways(filter)
getGatewayNetwork(ref)

listPaymentRecords(filter)
listRateGroups(filter)
lookupRate(input)

routingAnalysis(input)
```

## Mutation methods

Only implemented when verified:

```ts
createAccount(command)
updateAccount(command)
setAccountStatus(command)

creditAccount(command)

createMappingGateway(command)
updateMappingGateway(command)
setGatewayCapacity(command)

updatePhone(command)

applyRateChanges(command)

disconnectCall(command)
```

## Adapter return envelope

```text
data
upstream_reference
upstream_timestamp
source_instance
duration_ms
raw_status_code/category
```

Raw vendor payload can be logged only in sanitized debug storage when explicitly enabled.

## Error categories

- `AUTHENTICATION_FAILED`
- `AUTHORIZATION_FAILED`
- `NOT_SUPPORTED`
- `NOT_FOUND`
- `VALIDATION_FAILED`
- `CONFLICT`
- `RATE_LIMITED`
- `UPSTREAM_TIMEOUT`
- `UPSTREAM_UNAVAILABLE`
- `UPSTREAM_REJECTED`
- `UNKNOWN_UPSTREAM_ERROR`

Each category declares retryability.

## Write discipline

For every mutation:
- portal generates command ID;
- request is audited before send;
- adapter does not auto-retry unknown/non-idempotent mutations blindly;
- result is persisted;
- read-back verifies state when possible;
- timeout with unknown outcome becomes reconciliation state.

## Testing

Every capability requires a contract-test fixture from real non-production VOS.
A capability can be enabled in production only after its test passes for that instance/build.
