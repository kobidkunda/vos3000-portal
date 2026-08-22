# P08 — Billing, Add-Funds, Immutable Ledger & VOS Reconciliation — UI Template Bundle

Pages: **13**

- **Admin · Payment Ledger** — `/admin/payments` — `04_ADMIN_PAGES/056_payment-ledger.md`
- **Admin · Manual Payment / Credit** — `/admin/payments/new` — `04_ADMIN_PAGES/057_manual-payment-credit.md`
- **Admin · Revenue Details** — `/admin/billing/revenue` — `04_ADMIN_PAGES/058_revenue-details.md`
- **Admin · Gateway Bills** — `/admin/billing/gateway` — `04_ADMIN_PAGES/059_gateway-bills.md`
- **Admin · Phone Bills** — `/admin/billing/phone` — `04_ADMIN_PAGES/060_phone-bills.md`
- **Admin · Account Balance Report** — `/admin/billing/account-balance` — `04_ADMIN_PAGES/061_account-balance-report.md`
- **Admin · Clearing & Settlement** — `/admin/settlement` — `04_ADMIN_PAGES/062_clearing-settlement.md`
- **Admin · Payment Providers** — `/admin/settings/payments` — `04_ADMIN_PAGES/095_payment-providers.md`
- **Client · Balance & Wallet** — `/app/billing/balance` — `05_CLIENT_PAGES/007_balance-wallet.md`
- **Client · Add Funds** — `/app/billing/add-funds` — `05_CLIENT_PAGES/008_add-funds.md`
- **Client · Payment History** — `/app/billing/payments` — `05_CLIENT_PAGES/009_payment-history.md`
- **Client · Payment Detail / Receipt** — `/app/billing/payments/{paymentId}` — `05_CLIENT_PAGES/010_payment-detail-receipt.md`
- **Client · Statements & Billing Summary** — `/app/billing/statements` — `05_CLIENT_PAGES/011_statements-billing-summary.md`

## Phase UI Gate

- All listed page API contracts available or explicitly mocked against frozen schemas.
- Required roles/permissions implemented.
- Source requirements have test IDs.
- Loading/empty/error/degraded states implemented.
- Design tokens and archetypes used consistently.
- Integration/VOS capabilities verified before enabling writes.