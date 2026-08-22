# Data Reconciliation Test Plan

## CDR reconciliation

For selected day/account/gateway:
- source VOS count;
- Redpanda published count;
- ClickHouse logical count;
- aggregate call count;
- duration sum;
- charge sum where authoritative.

Investigate:
- duplicate serial;
- missing event;
- timezone boundary;
- late event;
- malformed row/DLQ.

## Payment reconciliation

For every test payment:
- provider event;
- deposit;
- ledger postings;
- VOS credit command;
- VOS payment record/reference;
- observed balance behavior.

Scenarios:
- normal;
- duplicate webhook;
- delayed webhook;
- provider success + VOS timeout;
- VOS success + client/API timeout;
- manual admin adjustment;
- refund/reversal if supported.

## Rate reconciliation

After rate deployment:
- portal version;
- intended prefixes/rates;
- VOS read-back;
- sample rate lookup;
- routing analysis for test numbers.

## Gateway reconciliation

After gateway config:
- desired change;
- VOS response;
- VOS read-back;
- online/registration state;
- network test/status.

## Acceptance

No discrepancy is dismissed without a classified reason.
Allowed tolerances for money/counts must be explicitly approved; default expectation for discrete CDR counts and payment events is exact reconciliation.
