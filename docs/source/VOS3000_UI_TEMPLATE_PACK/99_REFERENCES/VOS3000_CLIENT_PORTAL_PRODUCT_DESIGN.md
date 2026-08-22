# VOS3000 Customer Self-Service Portal — Product Design & Page Specification

## 1. Document Purpose

This file defines the **client/customer-side product design** for a modern self-service wholesale voice portal backed by VOS3000.

The customer experience must hide the complexity of VOS3000. Customers interact only with our branded Portal UI and Portal API. They must never receive unrestricted VOS credentials or direct database/network access.

> **Basis and integration note**
>
> This product specification is grounded in the uploaded **VOS3000 V2.1.8.00 English Manual (Issue 01, 2018-12-06)**.  
> The manual documents the underlying VOS capabilities, but it does **not** document a complete modern REST API for every operation.  
> Therefore every frontend action in this design must call **our Portal API**, never VOS directly. A separate **VOS Adapter Service** translates approved operations to supported VOS interfaces.
>
> **Capability labels used in this document**
>
> - **[VOS]** — capability is explicitly documented in the VOS3000 manual.
> - **[HYBRID]** — modern portal feature built using VOS data plus our own database/services.
> - **[PORTAL]** — new functionality owned by our platform, not claimed to be native VOS.
> - **[VERIFY-API]** — the VOS function exists, but the exact supported programmatic write/read interface must be verified before implementation.
>
> **Hard rule:** do not write directly to VOS database tables for transactional changes unless the vendor-supported interface is proven inadequate and the exact schema/business logic has been independently validated. Prefer supported VOS interfaces for all writes.

## 2. Client Portal Product Principles

1. **Customer isolation first** — all data is scoped on the server by authenticated customer/account mapping.
2. **Explain telecom data** — convert raw VOS fields into clear language while retaining exact Call-ID/serial references for support.
3. **Self service without unsafe control** — allow balance top-up, CDR, gateway/IP and API features only within explicit entitlements.
4. **Real-time transparency** — live calls, gateway registration, channels, CPS and network quality show freshness/connection state.
5. **Financial certainty** — payment status and VOS credit state are separately tracked and reconciled.
6. **Redaction by design** — no carrier cost, other-customer data, sensitive routing topology or reusable secrets.
7. **Mobile usable, desktop powerful** — tables collapse into key-value cards on narrow screens; exports and advanced filters remain available.

## 3. Recommended Client Navigation

```text
Overview
Live Calls
CDR
Analytics
Gateways
Rates
Billing
  Balance
  Add Funds
  Payments
  Statements
Reports
Notifications
Developers
  API Keys
  Webhooks
  Logs
Team
Support
Settings
```

## 4. Page Inventory

- **Access & Account Security** — 4 pages
- **Home & Overview** — 2 pages
- **Balance, Funds & Payments** — 5 pages
- **CDR & Call History** — 4 pages
- **Live Calls & Traffic** — 4 pages
- **Gateways & SIP** — 6 pages
- **Rates & Pricing** — 3 pages
- **Reports & Downloads** — 5 pages
- **Notifications** — 2 pages
- **Developer API & Webhooks** — 5 pages
- **Team & Permissions** — 2 pages
- **Support** — 3 pages

**Total specified client pages:** 45

## 5. Global Client UI Pattern

### Dashboard visual hierarchy
- Primary row: balance, active calls, channel usage, CPS.
- Quality row: ASR, ACD, PDD, gateway status.
- Trend row: calls/minutes/spend.
- Attention row: low balance, offline gateway, payment issue, rate change, account expiry.

### Customer-safe data projection
The Portal API must never rely on the browser to hide fields. For customer responses:
- mapping/customer gateway may be visible;
- carrier routing gateway is hidden unless a product requirement explicitly grants it;
- carrier cost and platform margin are hidden;
- internal VOS usernames, server internals and signaling traces are hidden by default;
- API secrets and SIP passwords are never returned after creation;
- support can reference a customer-safe CDR/call identifier.

## 6. Detailed Page Specifications

## Access & Account Security

### Client Login

**Route:** `/app/login`  
**Purpose:** Secure customer sign-in.

**Page anatomy / features**

- Email/username and password
- MFA challenge when enabled
- Remember device subject to policy
- Forgot password
- Clear account-suspended/expired states without exposing sensitive backend details

**Primary Portal API**

- `POST /api/v1/auth/login`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### MFA Setup & Verify

**Route:** `/app/settings/security/mfa`  
**Purpose:** Protect customer accounts with second factor.

**Page anatomy / features**

- Enable/disable MFA after re-authentication
- TOTP QR/setup key
- Recovery codes
- Verify before activation
- Regenerate recovery codes
- Recent security events

**Primary Portal API**

- `POST /api/v1/me/mfa`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Sessions & Devices

**Route:** `/app/settings/security/sessions`  
**Purpose:** Customer session management.

**Page anatomy / features**

- Current device
- other sessions with IP/browser/time
- revoke individual
- revoke all others
- security notification on new login

**Primary Portal API**

- `GET /api/v1/me/sessions`
- `DELETE /api/v1/me/sessions/{id}`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Profile & Organization

**Route:** `/app/settings/profile`  
**Purpose:** Manage customer-facing profile data.

**Page anatomy / features**

- Organization name
- billing/contact emails
- phone
- timezone
- default report timezone
- notification preferences
- VOS account ID read-only where appropriate

**Primary Portal API**

- `GET /api/v1/me/profile`
- `PATCH /api/v1/me/profile`

**VOS / product basis:** [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Home & Overview

### Client Dashboard

**Route:** `/app`  
**Purpose:** At-a-glance balance, traffic and service status.

**Page anatomy / features**

- Balance
- credit/overdraft if customer is allowed to see it
- today spend
- month-to-date spend
- active calls
- channel usage
- current CPS vs limit
- ASR
- ACD
- PDD
- gateway online/offline count
- recent payment
- 24h calls/minutes/spend charts
- low balance/expiry/gateway issue banners
- quick links: Add Funds, Live Calls, CDR, Gateways, Rate Lookup

**Primary Portal API**

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/timeseries`

**VOS / product basis:** VOS documents account balance/today consumption, current calls and online gateway metrics. Dashboard composition is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Service Status

**Route:** `/app/status`  
**Purpose:** Customer-specific service health.

**Page anatomy / features**

- My gateways
- online/offline/degraded
- registered IP
- last update
- network quality
- packet loss
- latency
- active incidents affecting this customer
- refresh timestamp

**Primary Portal API**

- `GET /api/v1/status`

**VOS / product basis:** Uses documented VOS gateway online/network data plus portal incident context. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Balance, Funds & Payments

### Balance & Wallet

**Route:** `/app/billing/balance`  
**Purpose:** Primary account-balance page.

**Page anatomy / features**

- Current VOS balance
- Available credit if applicable
- today consumption
- month spend
- low-balance threshold
- last payments
- Add Funds button
- balance trend from portal snapshots

**Primary Portal API**

- `GET /api/v1/balance`

**VOS / product basis:** VOS account balance/today consumption are documented. Trend is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Add Funds

**Route:** `/app/billing/add-funds`  
**Purpose:** Self-service payment flow.

**Page anatomy / features**

- Preset and custom amount
- Currency
- Payment method selection
- Minimum/maximum validation
- Fees/expected credit disclosure
- Redirect/embedded provider flow
- Pending/success/failed states
- Idempotent payment creation
- Never credit VOS until payment is independently verified by backend webhook

**Primary Portal API**

- `POST /api/v1/deposits`
- `GET /api/v1/deposits/{id}`

**VOS / product basis:** Online payment provider is [PORTAL]; confirmed funds can be translated into VOS Payment/Credit via adapter [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Payment History

**Route:** `/app/billing/payments`  
**Purpose:** Customer-visible ledger.

**Page anatomy / features**

- Date
- amount
- type
- method
- status
- balance after payment when available
- reference/serial
- receipt
- filters and export
- exclude internal-only operator notes

**Primary Portal API**

- `GET /api/v1/payments`

**VOS / product basis:** VOS Payment Record documents account, payment amount, balance after payment, type, time, mode and serial. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Payment Detail / Receipt

**Route:** `/app/billing/payments/{paymentId}`  
**Purpose:** Single payment record and receipt.

**Page anatomy / features**

- Processor reference
- VOS/portal transaction reference
- amount/currency
- fees
- credited amount
- created/completed time
- status timeline
- balance after credit
- download receipt
- support link

**Primary Portal API**

- `GET /api/v1/payments/{id}`

**VOS / product basis:** [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Statements & Billing Summary

**Route:** `/app/billing/statements`  
**Purpose:** Periodic usage and financial summary.

**Page anatomy / features**

- Opening balance
- payments/credits
- call charges
- package/rent items if applicable
- closing balance
- minutes/calls
- date range
- download CSV/PDF where implemented

**Primary Portal API**

- `GET /api/v1/billing/statements`

**VOS / product basis:** VOS provides account balance/revenue/bill queries. Formal statement presentation is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## CDR & Call History

### CDR Explorer

**Route:** `/app/cdr`  
**Purpose:** Customer-scoped call history.

**Page anatomy / features**

- Default recent date range
- Filters: begin/end date, caller, callee, gateway, call status/termination reason, duration, destination/area, Call-ID
- Columns: begin/end, caller/callee, duration, charged duration, customer charge, mapping gateway, destination, termination reason
- Customer cannot access other accounts even by manipulating query parameters
- Saved filters
- CSV/XLSX export
- Server-side pagination

**Primary Portal API**

- `GET /api/v1/cdr`
- `POST /api/v1/cdr/exports`

**VOS / product basis:** VOS CDR documents the underlying fields. Tenant scoping and export UX are [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### CDR Detail

**Route:** `/app/cdr/{cdrId}`  
**Purpose:** Explain one call without exposing sensitive carrier internals.

**Page anatomy / features**

- Begin/end time
- caller/callee
- actual and charged duration
- customer call charge
- call type/destination/area
- customer mapping gateway
- caller IP if customer is authorized to see it
- termination reason/hangup side
- PDD/connection delay
- customer-side Call-ID/serial as appropriate
- Report Problem button
- Do not reveal carrier cost, routing gateway, other-customer data, private softswitch internals unless explicitly allowed

**Primary Portal API**

- `GET /api/v1/cdr/{id}`

**VOS / product basis:** VOS CDR contains richer carrier-side information; client response must be projection/redaction. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Recent Calls

**Route:** `/app/cdr/recent`  
**Purpose:** Fast view of recent records.

**Page anatomy / features**

- Most recent calls
- answer/failure badge
- caller/callee
- duration
- charge
- gateway
- termination reason
- open detail

**Primary Portal API**

- `GET /api/v1/cdr/recent`

**VOS / product basis:** VOS Recent CDR is documented. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### CDR Export Jobs

**Route:** `/app/cdr/exports`  
**Purpose:** Handle large exports safely.

**Page anatomy / features**

- Requested range/filter
- status queued/running/ready/expired/failed
- row count
- created/expiry time
- download when ready
- cancel queued job
- rate limit export creation

**Primary Portal API**

- `GET /api/v1/cdr/exports`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Live Calls & Traffic

### Live Calls

**Route:** `/app/calls/live`  
**Purpose:** Customer-only real-time active sessions.

**Page anatomy / features**

- Caller/callee
- customer gateway
- connect time
- duration
- PDD
- codec where allowed
- active call count vs channels
- search/filter
- auto-refresh/WebSocket status
- no disconnect button by default
- carrier routing gateway and sensitive media details redacted

**Primary Portal API**

- `GET /api/v1/calls/live`
- `GET /api/v1/calls/live/stream`

**VOS / product basis:** VOS Current Call provides the underlying live-call fields. Customer projection is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Traffic Analytics

**Route:** `/app/analytics/traffic`  
**Purpose:** Understand call volume and minutes.

**Page anatomy / features**

- Calls
- answered
- failed
- minutes
- spend
- ASR
- ACD
- PDD
- hour/day granularity
- destination breakdown
- gateway breakdown
- compare previous period
- export

**Primary Portal API**

- `GET /api/v1/analytics/traffic`

**VOS / product basis:** VOS has CDR Analysis and gateway performance; customer analytics are [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Failure Analytics

**Route:** `/app/analytics/failures`  
**Purpose:** Customer-facing call failure intelligence.

**Page anatomy / features**

- Top termination reasons
- failure-rate trend
- failure by destination
- failure by customer gateway
- human-readable explanation
- drill to affected CDRs
- do not expose other carrier/customer details

**Primary Portal API**

- `GET /api/v1/analytics/failures`

**VOS / product basis:** VOS CDR termination reason and gateway outcome data support this. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Destination Analytics

**Route:** `/app/analytics/destinations`  
**Purpose:** Traffic/spend/quality by destination.

**Page anatomy / features**

- Country/area/prefix
- calls
- minutes
- spend
- ASR
- ACD
- PDD
- trend
- rate lookup shortcut

**Primary Portal API**

- `GET /api/v1/analytics/destinations`

**VOS / product basis:** Area prefix/name and CDR data are documented in VOS; aggregation is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Gateways & SIP

### My Gateways

**Route:** `/app/gateways`  
**Purpose:** Customer-owned gateway inventory.

**Page anatomy / features**

- Gateway name
- configured/registered IP
- online status
- active calls vs line limit
- CPS
- ASR
- ACD
- last registration/update
- network quality badge
- open details
- Add Gateway request/action if enabled

**Primary Portal API**

- `GET /api/v1/gateways`

**VOS / product basis:** VOS mapping/online mapping gateway metrics are documented. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Detail

**Route:** `/app/gateways/{gatewayId}`  
**Purpose:** Single gateway configuration and health.

**Page anatomy / features**

- Gateway identity
- account
- static/dynamic mode
- configured IP(s)
- registered IP
- signaling port if exposed
- line limit
- current calls
- CPS
- ASR/ACD
- registration/update time
- network latency/loss
- softswitch host details only if safe to expose
- CDR and live-call shortcuts
- configuration actions governed by customer permission

**Primary Portal API**

- `GET /api/v1/gateways/{id}`

**VOS / product basis:** Based on VOS Mapping Gateway and Online Mapping Gateway. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway IP Management

**Route:** `/app/gateways/{gatewayId}/ips`  
**Purpose:** Self-service customer IP changes with strong controls.

**Page anatomy / features**

- Current primary/backup IPs
- Add/replace/remove subject to plan
- IPv4/IPv6/CIDR validation based on VOS capability
- Require MFA/re-authentication
- Optional email approval/admin review
- Show impact warning before changing active gateway
- Audit old/new IP
- Connectivity status after change

**Primary Portal API**

- `GET /api/v1/gateways/{id}/ips`
- `PUT /api/v1/gateways/{id}/ips`

**VOS / product basis:** VOS mapping gateways are IP-address based and can expose registered IP; self-service workflow is [HYBRID]/[VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### SIP Credentials

**Route:** `/app/gateways/{gatewayId}/credentials`  
**Purpose:** Expose connection information without leaking reusable secrets.

**Page anatomy / features**

- SIP host/address
- port
- protocol
- gateway/auth username if applicable
- password never re-displayed after creation
- Reset/rotate password action
- copy non-secret fields
- rotation confirmation and audit

**Primary Portal API**

- `GET /api/v1/gateways/{id}/credentials`
- `POST /api/v1/gateways/{id}/credentials/rotate`

**VOS / product basis:** VOS documents configuration/authentication credentials for gateway/phone objects; secure portal handling is [HYBRID]/[VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Network Quality

**Route:** `/app/gateways/{gatewayId}/network`  
**Purpose:** Network health for the customer's gateway.

**Page anatomy / features**

- Remote IP
- current network quality
- packet loss
- network delay
- 24h/7d historical portal chart
- degraded thresholds
- support ticket shortcut

**Primary Portal API**

- `GET /api/v1/gateways/{id}/network`

**VOS / product basis:** VOS Mapping Gateway Network documents remote IP, network quality, packet loss and delay. History is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Call Statistics

**Route:** `/app/gateways/{gatewayId}/statistics`  
**Purpose:** Call outcome stats for one customer gateway.

**Page anatomy / features**

- Total calls
- success
- callee rejected
- trunk/network errors where appropriate
- caller abandon
- average talk duration
- total call time
- time range
- drill to CDR

**Primary Portal API**

- `GET /api/v1/gateways/{id}/statistics`

**VOS / product basis:** VOS Gateway Status documents these outcome fields. Customer-safe projection is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Rates & Pricing

### My Rate Sheet

**Route:** `/app/rates`  
**Purpose:** Customer's assigned sell rates.

**Page anatomy / features**

- Search by country/destination/prefix
- Prefix
- area/destination
- rate type
- rate/minute
- billing cycle where customer-facing
- effective date supplied by portal rate-versioning
- download CSV/XLSX
- never expose carrier cost/private admin margins

**Primary Portal API**

- `GET /api/v1/rates`

**VOS / product basis:** VOS Rate Management provides prefix, area, type, billing rate/cycle and rate/minute. Presentation/versioning is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Rate Lookup

**Route:** `/app/rates/lookup`  
**Purpose:** Instant price lookup for a called number.

**Page anatomy / features**

- Number input
- normalized number
- matched prefix
- destination
- rate type
- customer rate/minute
- billing increment/cycle
- clear no-rate result
- copy result

**Primary Portal API**

- `GET /api/v1/rates/lookup?number=...`

**VOS / product basis:** VOS uses longest-prefix matching; customer lookup is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Rate Change History

**Route:** `/app/rates/history`  
**Purpose:** Transparency for customer rate changes.

**Page anatomy / features**

- Destination/prefix
- old rate
- new rate
- effective date
- published date
- filter upcoming/past
- download change file

**Primary Portal API**

- `GET /api/v1/rates/history`

**VOS / product basis:** Rate history/effective publishing workflow is a [PORTAL] extension unless a supported VOS mechanism is verified.

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Reports & Downloads

### Reports Home

**Route:** `/app/reports`  
**Purpose:** Customer report catalog.

**Page anatomy / features**

- Traffic summary
- billing/usage
- destination
- gateway quality
- failure summary
- saved reports
- recent exports

**Primary Portal API**

- `GET /api/v1/reports`

**VOS / product basis:** [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Usage Report

**Route:** `/app/reports/usage`  
**Purpose:** Calls, minutes and spend report.

**Page anatomy / features**

- Date range
- group by day/hour/destination/gateway
- calls
- answered
- minutes
- charges
- ASR/ACD where applicable
- export

**Primary Portal API**

- `GET /api/v1/reports/usage`

**VOS / product basis:** [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Report

**Route:** `/app/reports/gateways`  
**Purpose:** Customer gateway performance report.

**Page anatomy / features**

- Gateway
- calls
- minutes
- ASR
- ACD
- PDD
- failure rate
- network delay/loss if available
- export

**Primary Portal API**

- `GET /api/v1/reports/gateways`

**VOS / product basis:** VOS has gateway reports/performance; customer projection is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Scheduled Reports

**Route:** `/app/reports/schedules`  
**Purpose:** Automatic report delivery.

**Page anatomy / features**

- Choose report
- saved filters
- daily/weekly/monthly
- timezone
- recipient emails restricted to organization policy
- CSV/XLSX/PDF where supported
- pause/resume
- last/next run

**Primary Portal API**

- `GET /api/v1/report-schedules`
- `POST /api/v1/report-schedules`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Downloads

**Route:** `/app/downloads`  
**Purpose:** Centralized generated files.

**Page anatomy / features**

- CDR exports
- rate sheets
- statements
- reports
- status ready/expired
- size/row count
- expiry and delete

**Primary Portal API**

- `GET /api/v1/downloads`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Notifications

### Notification Center

**Route:** `/app/notifications`  
**Purpose:** In-app service and commercial alerts.

**Page anatomy / features**

- Low balance
- payment result
- gateway online/offline
- ASR/failure degradation
- rate change
- account expiry
- security events
- read/unread
- filter by type
- deep links

**Primary Portal API**

- `GET /api/v1/notifications`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Alert Preferences

**Route:** `/app/settings/notifications`  
**Purpose:** Customer-controlled notification channels and thresholds.

**Page anatomy / features**

- Low-balance amount
- gateway state alerts
- rate changes
- payment alerts
- security alerts always-on where required
- email/webhook/other channel toggles
- quiet-hours policy only for noncritical alerts

**Primary Portal API**

- `GET /api/v1/me/notification-preferences`
- `PUT /api/v1/me/notification-preferences`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Developer API & Webhooks

### API Overview

**Route:** `/app/developers`  
**Purpose:** Customer entry point for programmatic access.

**Page anatomy / features**

- Base URL
- authentication model
- scopes summary
- rate limits
- quick-start snippets
- links to CDR/balance/gateway/rates endpoints
- sandbox/test notes if provided

**Primary Portal API**

- `GET /api/v1/developer/overview`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### API Keys

**Route:** `/app/developers/api-keys`  
**Purpose:** Create and manage customer API credentials.

**Page anatomy / features**

- Key name
- key ID
- secret shown once
- scopes
- IP allowlist
- expiry
- last used
- rotate/revoke
- max active keys per account

**Primary Portal API**

- `GET /api/v1/api-keys`
- `POST /api/v1/api-keys`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### API Request Logs

**Route:** `/app/developers/logs`  
**Purpose:** Customer-visible API diagnostics.

**Page anatomy / features**

- Timestamp
- method/path
- status
- latency
- request ID
- key name
- IP
- filter/export
- redact secrets and sensitive payload data

**Primary Portal API**

- `GET /api/v1/developer/request-logs`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Webhook Endpoints

**Route:** `/app/developers/webhooks`  
**Purpose:** Customer event subscriptions.

**Page anatomy / features**

- Endpoint URL
- events such as call.completed, gateway.online/offline, balance.low, payment.completed, rate.changed
- signing secret shown once/rotatable
- enable/disable
- test delivery

**Primary Portal API**

- `GET /api/v1/webhooks`
- `POST /api/v1/webhooks`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Webhook Delivery Log

**Route:** `/app/developers/webhook-deliveries`  
**Purpose:** Debug webhook failures.

**Page anatomy / features**

- Event
- endpoint
- attempt
- HTTP status
- latency
- next retry
- payload preview with redaction
- manual retry if allowed

**Primary Portal API**

- `GET /api/v1/webhook-deliveries`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Team & Permissions

### Team Members

**Route:** `/app/team`  
**Purpose:** Organization-level portal users.

**Page anatomy / features**

- Name/email
- role
- status
- last login
- MFA state
- invite member
- resend/revoke invite
- disable/remove member

**Primary Portal API**

- `GET /api/v1/team`
- `POST /api/v1/team/invitations`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Client Roles

**Route:** `/app/team/roles`  
**Purpose:** Customer-admin-managed RBAC.

**Page anatomy / features**

- Owner, Billing, Technical/NOC, Read Only, API Manager
- Permissions: view CDR, view rates, view balance, add funds, manage gateway IP, view live calls, manage API, download reports, manage team
- Custom roles optionally later

**Primary Portal API**

- `GET /api/v1/team/roles`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Support

### Support Tickets

**Route:** `/app/support`  
**Purpose:** Customer support history and new ticket entry.

**Page anatomy / features**

- Open/pending/resolved statuses
- category Billing/Routing/Quality/Technical/Rate/Payment/Other
- priority
- last update
- search/filter
- new ticket

**Primary Portal API**

- `GET /api/v1/support/tickets`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### New Support Ticket

**Route:** `/app/support/new`  
**Purpose:** Create context-rich support request.

**Page anatomy / features**

- Subject
- category
- description
- optional gateway
- optional CDR/call ID
- attachment
- auto-attach safe diagnostics after user consent
- confirmation/reference

**Primary Portal API**

- `POST /api/v1/support/tickets`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Ticket Detail

**Route:** `/app/support/{ticketId}`  
**Purpose:** Conversation and status for one ticket.

**Page anatomy / features**

- Message thread
- status/priority
- assigned team if exposed
- attachments
- linked CDR/gateway
- reply
- close/reopen where policy allows

**Primary Portal API**

- `GET /api/v1/support/tickets/{id}`
- `POST /api/v1/support/tickets/{id}/messages`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.


## 7. Client Roles & Recommended Permissions

| Role | CDR | Balance | Add funds | Gateways/IP | Live calls | Rates | API/Webhooks | Team |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Owner | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Billing | Yes | Yes | Yes | Read | Read | Yes | No | No |
| Technical / NOC | Yes | Read | No | Yes | Yes | Yes | Yes | No |
| API Manager | Read | Read | No | Read | Read | Yes | Yes | No |
| Read Only | Yes | Read | No | Read | Read | Yes | No | No |

All permissions are enforced server-side and can be narrowed per customer plan.

## 8. Customer API Surface

```text
/api/v1/me
/api/v1/balance
/api/v1/deposits
/api/v1/payments
/api/v1/billing/statements

/api/v1/cdr
/api/v1/cdr/{id}
/api/v1/cdr/recent
/api/v1/cdr/exports

/api/v1/calls/live
/api/v1/calls/live/stream

/api/v1/analytics/traffic
/api/v1/analytics/failures
/api/v1/analytics/destinations

/api/v1/gateways
/api/v1/gateways/{id}
/api/v1/gateways/{id}/ips
/api/v1/gateways/{id}/credentials
/api/v1/gateways/{id}/network
/api/v1/gateways/{id}/statistics

/api/v1/rates
/api/v1/rates/lookup
/api/v1/rates/history

/api/v1/reports/*
/api/v1/report-schedules
/api/v1/downloads

/api/v1/notifications
/api/v1/me/notification-preferences

/api/v1/api-keys
/api/v1/webhooks
/api/v1/webhook-deliveries
/api/v1/developer/request-logs

/api/v1/team/*
/api/v1/support/*
```

## 9. Customer Dashboard Metric Definitions

| Metric | Definition / source |
|---|---|
| Balance | Current customer VOS account balance after adapter synchronization |
| Today spend | VOS account today consumption or portal-derived CDR sum, with one canonical source chosen |
| Active calls | Current Call rows scoped to the customer's mapping gateways/account |
| Channels used | Active sessions / allowed line limit |
| CPS | Current call-per-second value where VOS exposes it |
| ASR | Answer-seizure ratio for the selected scope/window |
| ACD | Average call duration for connected calls |
| PDD | Post-dial delay derived from documented VOS connection timing |
| Gateway status | Online mapping gateway registration/update state |
| Packet loss / latency | Mapping Gateway Network data |
| Month spend | Aggregated customer charges for selected billing month |

## 10. Payment State Machine

```text
CREATED
  -> PENDING_PROVIDER
  -> PROVIDER_CONFIRMED
  -> CREDITING_VOS
  -> COMPLETED

Failure branches:
  -> PROVIDER_FAILED
  -> VOS_CREDIT_FAILED
  -> REQUIRES_RECONCILIATION
  -> REFUNDED / REVERSED (when applicable)
```

Rules:
- Never mark a payment completed only from a browser redirect.
- Verify payment provider webhook/signature server-side.
- Use idempotency keys for VOS credit operation.
- Store provider reference + portal ledger entry + VOS result/reference.
- If provider succeeds but VOS credit fails, show **Processing / Reconciliation Required**, not a false success.

## 11. Webhook Event Model

Recommended customer events:
- `call.completed`
- `gateway.online`
- `gateway.offline`
- `gateway.degraded`
- `balance.low`
- `balance.updated`
- `payment.completed`
- `payment.failed`
- `rate.changed`
- `account.expiring`

Every delivery:
- has a stable event ID;
- includes creation time and schema version;
- is signed with HMAC or equivalent;
- is retried with bounded exponential backoff;
- is visible in the webhook delivery log;
- never includes secrets or another tenant's data.

## 12. Client Release Priorities

### Phase 1 — immediate customer value
- Login/security
- Dashboard
- Balance
- Add Funds + Payment History
- CDR + CDR Detail
- Live Calls
- My Gateways + Gateway Detail
- Rate Sheet + Rate Lookup
- Support Tickets

### Phase 2 — operational self service
- Gateway IP management
- Network quality/history
- Failure/destination analytics
- Statements/reports
- Notifications/preferences
- Team/subusers

### Phase 3 — developer platform
- API keys
- API logs
- Webhooks + delivery logs
- Scheduled reports
- Rate change history
- richer automation and incident notifications

## 13. Definition of Done for Every Client Page

A client page is not complete until:
- customer scope is enforced in the backend with negative authorization tests;
- sensitive carrier/internal fields are redacted in API responses, not just hidden in UI;
- loading/empty/error/degraded states are implemented;
- all monetary values include deterministic currency handling;
- all time values include timezone handling;
- data freshness is visible on real-time pages;
- CSV/export endpoints are separately authorization-tested;
- mutations are idempotent when retryable;
- high-risk security/network changes require confirmation and, where configured, MFA/re-authentication;
- audit events are created for every customer mutation;
- behavior has been verified against the actual VOS3000 installation/interface.
