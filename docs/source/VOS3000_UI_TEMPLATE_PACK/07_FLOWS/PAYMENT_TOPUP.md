# Add Funds / Payment Flow
Create deposit → provider → verified webhook → immutable ledger → idempotent VOS credit → reconciliation → completed.
Provider success + VOS failure = reconciliation state, never false success.
