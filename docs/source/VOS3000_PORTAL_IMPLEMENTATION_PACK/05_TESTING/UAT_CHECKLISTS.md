# UAT Checklists

## Admin — NOC
- [ ] Dashboard shows current data/freshness.
- [ ] Locate customer.
- [ ] Open gateway and live calls.
- [ ] Filter historical CDR.
- [ ] View failure analytics.
- [ ] View gateway network quality.
- [ ] Observe degraded-source banner when test dependency is disabled.

## Admin — Billing
- [ ] View balance.
- [ ] View payment history.
- [ ] Create authorized sandbox/manual adjustment.
- [ ] Confirm memo/audit.
- [ ] Resolve simulated reconciliation item.
- [ ] Export billing/CDR report.

## Admin — Security
- [ ] Create operator.
- [ ] Assign limited role.
- [ ] Confirm forbidden pages/actions.
- [ ] MFA.
- [ ] Session revoke.
- [ ] Audit search.

## Customer — Owner
- [ ] Login/MFA.
- [ ] Dashboard.
- [ ] Balance/add-funds sandbox.
- [ ] Payment history/receipt.
- [ ] CDR/recent/detail.
- [ ] Live calls.
- [ ] My gateways/network.
- [ ] Rates/rate lookup.
- [ ] Export.
- [ ] Create support ticket.
- [ ] Team/API/Webhook if enabled.

## Negative tenant UAT
- [ ] Modify customer/gateway/CDR IDs in URL.
- [ ] Modify API cursor/filter.
- [ ] Use another tenant's API key with copied resource ID.
- [ ] Attempt another tenant's export download.
Expected: no data disclosure.

## Mobile
- [ ] dashboard;
- [ ] CDR list/detail;
- [ ] payments;
- [ ] gateway status;
- [ ] support.

## Signoff

| Area | Owner | Result | Notes |
|---|---|---|---|
| NOC | | | |
| Billing | | | |
| Admin/Security | | | |
| Customer portal | | | |
| API | | | |
| Performance | | | |
