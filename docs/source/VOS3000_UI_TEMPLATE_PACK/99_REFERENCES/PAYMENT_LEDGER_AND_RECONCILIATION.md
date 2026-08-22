# Payment Ledger and Reconciliation

## Principle

A provider success, portal ledger entry and VOS balance credit are separate facts that must converge.

## Entities

`deposit`
- customer
- requested amount/currency
- provider
- state

`payment_event`
- provider event ID
- verified timestamp
- raw reference/hash

`ledger_entry`
- immutable debit/credit posting

`vos_credit_command`
- command ID
- expected amount
- VOS account/instance
- status
- upstream reference
- before/after observed balance if meaningful

`reconciliation`
- expected vs observed
- status
- reason
- assigned operator

## State machine

```text
CREATED
 -> PENDING_PROVIDER
 -> PROVIDER_CONFIRMED
 -> CREDIT_COMMAND_CREATED
 -> CREDITING_VOS
 -> COMPLETED

Branches:
 -> PROVIDER_FAILED
 -> CREDIT_OUTCOME_UNKNOWN
 -> VOS_CREDIT_FAILED
 -> REQUIRES_RECONCILIATION
 -> REFUNDED/REVERSED (policy/provider dependent)
```

## Duplicate provider webhook

Unique constraint on `(provider, provider_event_id)`.
Duplicate returns successful acknowledgement without creating new ledger/credit command.

## Unknown VOS outcome

If request timed out after being sent:
- do not resend blindly;
- inspect VOS payment record/balance using command correlation if available;
- reconcile;
- only retry when safe/idempotent evidence exists.

## Admin adjustment

Admin command contains:
- actor;
- tenant/account;
- adjustment type;
- amount/currency;
- memo;
- approval if required;
- idempotency key.

## Daily reconciliation

Compare:
- provider successful deposits;
- portal ledger;
- VOS payment records/credits;
- sampled/derived balance expectations where possible.

Balance cannot always be inferred from payment alone because ongoing calls change it; use payment transaction references/records where possible.
