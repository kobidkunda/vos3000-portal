# VOS3000 Admin Portal — Product Design & Page Specification

## 1. Document Purpose

This file defines the **complete admin-side product design** for a modern web management platform that uses VOS3000 as the telephony/softswitch/billing engine while presenting a separate, API-first administration experience.

The admin portal is not a reskin of the legacy VOS client. It is an operational system for NOC, billing, support, sales/commercial, security and platform administrators.

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

## 2. Product Architecture

```text
Admin Browser
    |
    | HTTPS / REST / WebSocket
    v
Portal Core API
    |
    +-- Auth + RBAC
    +-- Customer / Tenant Service
    +-- Billing & Payment Service
    +-- Reporting / Export Service
    +-- Notification Service
    +-- API Key / Webhook Service
    +-- Audit Service
    |
    v
VOS Adapter Service
    |
    +-- supported VOS web/service interfaces
    +-- documented external CDR / online-state feeds where applicable
    +-- read/query connectors
    +-- verified write operations only
    |
    v
VOS3000
```

### Architectural rules

1. Admin frontend never connects directly to VOS3000.
2. Every API request is authorized by Portal RBAC and tenant/resource scope before the VOS adapter is called.
3. Customer money mutations are idempotent and double-recorded: immutable Portal ledger + resulting VOS reference/state.
4. CDR and live-call endpoints use server-side filtering; the browser is never trusted to filter sensitive rows.
5. Secrets are write-only wherever possible.
6. Dangerous operations (disconnect call, rate apply, gateway deletion, system parameter changes, large credits) are permission-separated and audited.
7. Live pages must show the data timestamp and connection state.
8. The VOS Adapter is replaceable so a future softswitch migration does not force a frontend rewrite.

## 3. Recommended Admin Navigation

```text
Dashboard
NOC
Customers
Gateways
  Mapping
  Routing
  Online
  Network
  Status
Phones
Live Calls
CDR
Analytics
Rates
Packages
Billing
Payments
Settlement
Reports
Numbers
Alarms
Support
Integrations
Security
System
Settings
```

## 4. Page Inventory

- **Access & Identity** — 4 pages
- **Command Center** — 4 pages
- **Customers & Accounts** — 9 pages
- **Gateways & Routing** — 14 pages
- **Phones & Terminals** — 3 pages
- **Live Calls & Diagnostics** — 4 pages
- **CDR & Call Analytics** — 9 pages
- **Rates, Packages & Commercial Routing** — 8 pages
- **Billing, Payments & Settlement** — 7 pages
- **Reports** — 4 pages
- **Number Management** — 6 pages
- **Admin Users, Roles & Audit** — 5 pages
- **System & Maintenance** — 8 pages
- **API, Integrations & Automation** — 6 pages
- **Portal Operations** — 6 pages

**Total specified admin pages:** 97

## 5. Global Admin UI Pattern

### Desktop shell
- Left navigation: 240–280 px collapsible.
- Top bar: environment name, global search, alarm indicator, integration health, admin profile.
- Main content: 12-column responsive grid.
- Sticky page header for long tables/configuration pages.
- Command palette for customer/gateway/CDR navigation.

### Table standard
Every data-heavy page should support, when relevant:
- server-side search/filter/sort/pagination;
- column chooser and saved views;
- date/time display in operator-selected timezone with source timezone available;
- export subject to permissions and row limits;
- bulk actions only when the backend can validate every selected object;
- row deep-linking;
- explicit last-refresh timestamp.

### Safety standard
- Never expose full passwords/API secrets after initial creation.
- Require typed confirmation for irreversible actions.
- Require reason/memo for payments, credits, disconnects, suspensions, rate deployment and system changes.
- Attach a `request_id` to every mutation and show it to the operator.
- Audit before/after values for all editable business configuration.
- Deny by default if VOS capability cannot be confirmed.

## 6. Detailed Page Specifications

## Access & Identity

### Admin Login

**Route:** `/admin/login`  
**Purpose:** Secure entry point for internal operators.

**Page anatomy / features**

- Email/login name and password
- Optional TOTP/MFA challenge
- Remember-device policy
- Rate-limit and temporary lockout
- Display environment/server label so operators know which VOS instance they are accessing
- Security event logging for successful/failed login

**Primary Portal API**

- `POST /api/v1/admin/auth/login`
- `POST /api/v1/admin/auth/mfa/verify`

**VOS / product basis:** VOS documents Administrator/Operator/Agent user types, lock state, invalid time, dynamic password and operation authorization. Portal authentication remains independent. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### MFA Challenge

**Route:** `/admin/mfa`  
**Purpose:** Second-factor verification for privileged users.

**Page anatomy / features**

- TOTP code entry
- Recovery code
- Trusted-device option subject to policy
- Re-authentication for dangerous actions
- Clear failure/expiry states

**Primary Portal API**

- `POST /api/v1/admin/auth/mfa/verify`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Forgot / Reset Password

**Route:** `/admin/forgot-password`  
**Purpose:** Secure password recovery without exposing VOS credentials.

**Page anatomy / features**

- Email-based reset
- Single-use expiring token
- Password policy
- Invalidate active sessions after reset
- Audit event

**Primary Portal API**

- `POST /api/v1/admin/auth/password/request`
- `POST /api/v1/admin/auth/password/reset`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Admin Sessions & Devices

**Route:** `/admin/settings/sessions`  
**Purpose:** Review and terminate active admin sessions.

**Page anatomy / features**

- Current session highlight
- IP, browser, approximate location, created/last-active time
- Revoke one session
- Revoke all other sessions
- Suspicious-session marker

**Primary Portal API**

- `GET /api/v1/admin/me/sessions`
- `DELETE /api/v1/admin/me/sessions/{id}`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Command Center

### Executive Dashboard

**Route:** `/admin`  
**Purpose:** Top-level commercial and network snapshot.

**Page anatomy / features**

- KPI cards: active customers, active calls, available/used channels, current CPS, today minutes, revenue, cost, gross margin, ASR, ACD, PDD
- Trend charts for calls/minutes/revenue/ASR/ACD
- Top customers by traffic and spend
- Top routes by traffic and margin
- Low-balance customers
- Offline/degraded gateways
- Current alarms
- Recent payments
- Time-range selector: today/24h/7d/30d/custom
- Drill-down from every KPI

**Primary Portal API**

- `GET /api/v1/admin/dashboard/summary`
- `GET /api/v1/admin/dashboard/timeseries`

**VOS / product basis:** VOS documents account balances, current calls, gateway metrics, billing, reports and alarms. Aggregation and visualization are [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### NOC Live Operations

**Route:** `/admin/noc`  
**Purpose:** Real-time wallboard for network operations.

**Page anatomy / features**

- Live concurrency
- Current CPS
- Answered/failed call ratio
- ASR/ACD/PDD
- Gateway online/offline/degraded tiles
- Packet loss and network delay
- Top SIP/termination failures
- Alarm stream
- Auto-refresh/WebSocket connection status
- Fullscreen NOC mode

**Primary Portal API**

- `GET /api/v1/admin/noc/summary`
- `GET /api/v1/admin/noc/stream`

**VOS / product basis:** Online gateway, gateway-network and Current Call data are documented by VOS. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### System Health

**Route:** `/admin/system/health`  
**Purpose:** Operational health of portal services and connected VOS components.

**Page anatomy / features**

- Portal API health
- VOS adapter connectivity
- CDR ingestion lag
- Webhook queue depth
- Payment webhook health
- Background job health
- Database/storage health
- Last successful sync per resource
- Incident banner

**Primary Portal API**

- `GET /api/v1/admin/system/health`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Alarm Center

**Route:** `/admin/alarms`  
**Purpose:** Unified current and historical alarm workspace.

**Page anatomy / features**

- Filters: severity, type, source, gateway, account, time
- Current vs historical tabs
- Acknowledge/assign/resolve workflow in portal
- Link alarm to gateway/customer/system page
- Notification policy preview
- Bulk acknowledge
- Export

**Primary Portal API**

- `GET /api/v1/admin/alarms`
- `POST /api/v1/admin/alarms/{id}/ack`

**VOS / product basis:** VOS documents system, network, disk, process, mapping, routing, balance and external-device alarms plus current/history alarms. Portal workflow is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Customers & Accounts

### Customer Directory

**Route:** `/admin/customers`  
**Purpose:** Primary customer list and lifecycle management.

**Page anatomy / features**

- Search by customer name, portal ID, VOS account ID, email, phone, gateway, IP
- Filters: active/suspended, low balance, agent/general, rate group, created date
- Columns: customer, VOS account, balance, overdraft/credit, today usage, gateways, channels, status, last activity
- Bulk export
- Bulk notification
- Create customer
- Suspend/enable selected where authorized

**Primary Portal API**

- `GET /api/v1/admin/customers`
- `POST /api/v1/admin/customers`

**VOS / product basis:** VOS General Account contains account ID/name, balance, overdraft, billing rate, today consumption, gateway/phone counts and status. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Create Customer Wizard

**Route:** `/admin/customers/new`  
**Purpose:** Controlled onboarding that creates portal identity and maps it to VOS.

**Page anatomy / features**

- Step 1 company/profile
- Step 2 portal owner credentials
- Step 3 VOS account mapping or create-new request
- Step 4 billing currency, credit/overdraft, expiry
- Step 5 rate group/private-rate policy
- Step 6 gateway/channel/CPS defaults
- Step 7 permissions/API access
- Review-and-create screen
- Rollback/compensation if one downstream step fails

**Primary Portal API**

- `POST /api/v1/admin/customers`

**VOS / product basis:** Account creation, billing rate assignment, account status and agent hierarchy are VOS functions; exact create API is [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Customer Overview

**Route:** `/admin/customers/{customerId}`  
**Purpose:** 360-degree customer workspace.

**Page anatomy / features**

- Header: status, VOS account ID, balance, credit, today/month spend, active calls
- Tabs: Overview, Billing, Gateways, Phones, Rates, CDR, Live Calls, Reports, API, Users, Tickets, Audit
- Quick actions: add funds, adjust credit, suspend, change rate, add gateway, impersonate portal user
- Risk banners: negative balance, expiring account, offline gateway, payment issue

**Primary Portal API**

- `GET /api/v1/admin/customers/{id}`

**VOS / product basis:** [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Customer Account Settings

**Route:** `/admin/customers/{customerId}/account`  
**Purpose:** Edit VOS-account-facing commercial and lifecycle settings.

**Page anatomy / features**

- Account name
- VOS account mapping
- Current balance read-only
- Overdraft/credit limit
- Billing rate group
- Private rate indicator
- Expiry date
- Account status normal/locked
- Memo/internal notes
- Agent parent
- Account type/category where applicable
- Danger-zone actions: disable/enable/delete mapping

**Primary Portal API**

- `GET /api/v1/admin/customers/{id}/account`
- `PATCH /api/v1/admin/customers/{id}/account`

**VOS / product basis:** These fields are documented in VOS Account Management. Writes are [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Customer Balance & Adjustments

**Route:** `/admin/customers/{customerId}/balance`  
**Purpose:** Financial balance controls with strict auditability.

**Page anatomy / features**

- Current VOS balance
- Portal wallet balance if separate
- Overdraft/credit
- Add payment
- Add credit
- Make-zero only for authorized roles
- Adjustment memo mandatory
- Before/after balance preview
- Dual-control/approval option above configured threshold
- Complete adjustment history

**Primary Portal API**

- `GET /api/v1/admin/customers/{id}/balance`
- `POST /api/v1/admin/customers/{id}/adjustments`

**VOS / product basis:** VOS Payment supports Payment/Credit/Make Zero and historical records. [HYBRID]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Customer Packages

**Route:** `/admin/customers/{customerId}/packages`  
**Purpose:** Assign and inspect package subscriptions.

**Page anatomy / features**

- Package name
- Effective date
- Invalid time
- Priority
- Failed-processing mode
- Percentage rent
- Package period/rent/minimum consumption/free duration/free amount summary
- Add/remove package
- Future package schedule

**Primary Portal API**

- `GET /api/v1/admin/customers/{id}/packages`
- `POST /api/v1/admin/customers/{id}/packages`

**VOS / product basis:** VOS Customer Package Management documents effective/invalid dates, priority and failed processing. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Customer Authorizations

**Route:** `/admin/customers/{customerId}/authorizations`  
**Purpose:** Manage delegated account/gateway/phone/payment privileges.

**Page anatomy / features**

- Add/delete/modify account permission
- Add/delete/modify phone permission
- Phone-card permission
- Add/delete gateway permission
- Modify gateway information
- Modify gateway capacity
- Payment for this account
- Payment for subaccounts
- Number-section limitation
- Inherited/explicit permission visualization

**Primary Portal API**

- `GET /api/v1/admin/customers/{id}/authorizations`
- `PUT /api/v1/admin/customers/{id}/authorizations`

**VOS / product basis:** VOS explicitly documents these authorization categories and subaccount restrictions. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Agent & Subaccount Tree

**Route:** `/admin/customers/{customerId}/subaccounts`  
**Purpose:** Visualize and manage agent hierarchies.

**Page anatomy / features**

- Tree and table view
- Direct vs all descendants
- Parent agent
- Balances and status per node
- Create child account
- Move/reparent only if safe and supported
- Permission inheritance preview
- Aggregate spend/traffic

**Primary Portal API**

- `GET /api/v1/admin/customers/{id}/subaccounts`

**VOS / product basis:** VOS documents Agent Account and direct/all subaccount views. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Customer Number Section Limits

**Route:** `/admin/customers/{customerId}/number-limits`  
**Purpose:** Limit number ranges that a customer/agent may allocate.

**Page anatomy / features**

- Begin number
- End number
- Validation for overlap
- Agent inheritance display
- Add/remove range
- Audit changes

**Primary Portal API**

- `GET /api/v1/admin/customers/{id}/number-limits`
- `PUT /api/v1/admin/customers/{id}/number-limits`

**VOS / product basis:** VOS Number Section Limitation is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Gateways & Routing

### Mapping Gateways

**Route:** `/admin/gateways/mapping`  
**Purpose:** Manage customer-side ingress/mapping gateways.

**Page anatomy / features**

- Search/filter by gateway, customer, IP, status, softswitch
- Columns: name, account, IP, registration mode, line limit, active calls, CPS, ASR, ACD, status
- Create/edit/disable
- Open live calls
- Open network quality
- Bulk export

**Primary Portal API**

- `GET /api/v1/admin/gateways/mapping`
- `POST /api/v1/admin/gateways/mapping`

**VOS / product basis:** Mapping Gateway management and online metrics are documented by VOS. Writes [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Mapping Gateway Detail

**Route:** `/admin/gateways/mapping/{gatewayId}`  
**Purpose:** Complete ingress gateway configuration and telemetry.

**Page anatomy / features**

- Overview
- Customer/account mapping
- Gateway type static/dynamic
- IP(s) and signaling port
- Line limit
- Routing gateway group/allow-forbid controls
- Process timeout
- Protect-route enable time
- Conversation limit
- Media proxy and RTP-interrupt settings
- Registered IP/status
- Current calls
- Network quality
- Audit history

**Primary Portal API**

- `GET /api/v1/admin/gateways/mapping/{id}`
- `PATCH /api/v1/admin/gateways/mapping/{id}`

**VOS / product basis:** VOS documents these mapping-gateway fields. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Routing Gateways

**Route:** `/admin/gateways/routing`  
**Purpose:** Manage carrier-side egress gateways.

**Page anatomy / features**

- Carrier/customer association
- Gateway prefix
- IP/registration
- Line limit
- Current calls
- ASR/ACD
- CPS
- rate/cost indicator
- route/protect-route status
- softswitch
- online status
- bulk actions

**Primary Portal API**

- `GET /api/v1/admin/gateways/routing`
- `POST /api/v1/admin/gateways/routing`

**VOS / product basis:** Routing Gateway and Online Routing Gateway are documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Routing Gateway Detail

**Route:** `/admin/gateways/routing/{gatewayId}`  
**Purpose:** Carrier gateway configuration, quality and route behavior.

**Page anatomy / features**

- General configuration
- Registration/security
- Capacity/line limit
- Rate limit/CPS
- Protection/failover
- Caller number pool where supported
- Signaling/register tracing controls
- ASR/ACD and current call count
- Registered/local IP
- Network quality
- Cost/rate references
- Audit

**Primary Portal API**

- `GET /api/v1/admin/gateways/routing/{id}`
- `PATCH /api/v1/admin/gateways/routing/{id}`

**VOS / product basis:** VOS documents rate limiting, tracing, protect routes and online routing metrics. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Online Gateways

**Route:** `/admin/gateways/online`  
**Purpose:** Single live view of all online routing and mapping gateways.

**Page anatomy / features**

- Tabs mapping/routing
- Current sessions vs capacity
- ASR
- ACD
- CPS
- registered IP
- registration time
- last update
- online duration
- encryption
- softswitch
- open current calls

**Primary Portal API**

- `GET /api/v1/admin/gateways/online`

**VOS / product basis:** Directly maps documented Online Routing/Mapping Gateway fields. [VOS]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Network Quality

**Route:** `/admin/gateways/network`  
**Purpose:** Observe network path quality per gateway.

**Page anatomy / features**

- Gateway
- Remote IP
- Network quality
- Packet loss
- Network delay
- Device ID
- Mapping/routing type
- History chart maintained by portal
- Threshold filters
- Degraded-only toggle

**Primary Portal API**

- `GET /api/v1/admin/gateways/network`

**VOS / product basis:** VOS documents Mapping Gateway Network and Routing Gateway Network. Historical chart is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Status Analytics

**Route:** `/admin/gateways/status`  
**Purpose:** Aggregated gateway call outcomes.

**Page anatomy / features**

- Gateway
- Total calls
- Success
- Callee rejected
- Trunk error
- Network error
- Caller abandon
- Average talk duration
- Total call time
- IP
- Starting time
- Success/failure percentages

**Primary Portal API**

- `GET /api/v1/admin/gateways/status`

**VOS / product basis:** VOS Gateway Status fields are documented. [VOS]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Groups

**Route:** `/admin/gateway-groups`  
**Purpose:** Organize gateways for shared capacity and routing policy.

**Page anatomy / features**

- Group name
- Type
- Member gateways
- Capacity summary
- Active calls
- Policy/notes
- Add/remove members
- Impact preview

**Primary Portal API**

- `GET /api/v1/admin/gateway-groups`
- `POST /api/v1/admin/gateway-groups`

**VOS / product basis:** VOS documents Gateway Group. Exact API [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Registration Management

**Route:** `/admin/registrations`  
**Purpose:** Manage registrations to other SIP/H323 platforms.

**Page anatomy / features**

- Mark/identifier
- Username
- Masked authentication password
- Server IP
- Line limit
- Signaling port
- Encryption
- Host name
- SIP proxy
- User-Agent
- Local IP/port
- Test/trace link

**Primary Portal API**

- `GET /api/v1/admin/registrations`
- `POST /api/v1/admin/registrations`

**VOS / product basis:** Fields are documented in VOS Registration Management. Writes [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Routing Analysis

**Route:** `/admin/tools/routing-analysis`  
**Purpose:** Simulate route selection before changing production.

**Page anatomy / features**

- Authentication method: existing device or static IP
- Device type and ID
- Caller
- Callee
- Softswitch
- Output actual caller device/account
- Routing caller/callee after rewrite
- Customer rate/minute
- Available time
- Candidate routes with egress rate
- Rate deviation/margin
- Route detail and sequence

**Primary Portal API**

- `POST /api/v1/admin/tools/routing-analysis`

**VOS / product basis:** VOS Routing Analysis documents these inputs/outputs. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Network Test

**Route:** `/admin/tools/network-test`  
**Purpose:** Test reachability/network condition to a remote IP.

**Page anatomy / features**

- Remote IP
- Configuration port
- Authorized local IP
- Packet type
- Run test
- Result history
- Copy diagnostics

**Primary Portal API**

- `POST /api/v1/admin/tools/network-test`

**VOS / product basis:** VOS Network Test supports special-format and ICMP testing. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Domain Management

**Route:** `/admin/routing/domains`  
**Purpose:** Manage domains used by the VOS environment.

**Page anatomy / features**

- Domain list
- Resolution/status
- Associated gateway/service
- Last update
- Add/edit/delete subject to supported interface

**Primary Portal API**

- `GET /api/v1/admin/domains`

**VOS / product basis:** VOS has Domain Management. Field-level API requires verification. [VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Prohibited Media IP

**Route:** `/admin/routing/prohibited-media-ips`  
**Purpose:** Manage disallowed media/RTP addresses.

**Page anatomy / features**

- IP/CIDR
- Reason
- Created by/time
- Enabled state
- Search/filter
- Add/remove

**Primary Portal API**

- `GET /api/v1/admin/prohibited-media-ips`

**VOS / product basis:** VOS includes Prohibited Media IP management. [VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Softswitches

**Route:** `/admin/softswitches`  
**Purpose:** View/manage softswitch instances and their operational settings.

**Page anatomy / features**

- Softswitch list/status
- Assigned gateways
- Current load
- IP
- Configuration entry point
- Link to system parameters and monitors

**Primary Portal API**

- `GET /api/v1/admin/softswitches`

**VOS / product basis:** VOS documents Softswitch Management. [VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Phones & Terminals

### Phone Directory

**Route:** `/admin/phones`  
**Purpose:** Manage VOS phone/terminal objects.

**Page anatomy / features**

- Phone number
- Account
- Lock state
- authorization type
- monthly consumption
- billing rate/private rate
- routing group
- DID/DDI
- softswitch
- registration type
- IP/port
- line/in/out limits
- online status

**Primary Portal API**

- `GET /api/v1/admin/phones`
- `POST /api/v1/admin/phones`

**VOS / product basis:** VOS Phone Management documents these fields. Writes [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Phone Detail

**Route:** `/admin/phones/{phoneId}`  
**Purpose:** Configure a single phone/terminal and supplementary services.

**Page anatomy / features**

- Registration credentials with secret masking/reset
- Caller-ID display
- Lock outgoing/incoming/all
- Authorization type
- Monthly min/max/service fee
- Private rate
- Account assignment
- DID/DDI
- Reverse charging
- Self-service password reset
- Call-in/out and line limits
- Caller/callee list groups
- Forwarding/DND/transfer controls
- Protocol/IP/media/DTMF/codec settings
- Routing strategies

**Primary Portal API**

- `GET /api/v1/admin/phones/{id}`
- `PATCH /api/v1/admin/phones/{id}`

**VOS / product basis:** VOS documents phone management, supplementary services and advanced configuration. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Online Phones

**Route:** `/admin/phones/online`  
**Purpose:** Live registration and capacity view.

**Page anatomy / features**

- Phone number
- Current calls
- Line limit
- In/out capacity and limits
- Device model
- Protocol
- Registered IP
- Registration/update time
- Duration
- Encryption
- Tracing state
- Softswitch

**Primary Portal API**

- `GET /api/v1/admin/phones/online`

**VOS / product basis:** VOS Online Phone fields are documented. [VOS]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Live Calls & Diagnostics

### Live Calls

**Route:** `/admin/calls/live`  
**Purpose:** Real-time view of all active sessions.

**Page anatomy / features**

- Caller/callee
- Mapping/routing gateway
- Connect time
- Duration
- Connecting duration
- PDD
- Codec
- Packet/traffic indicators
- Caller/callee IP and RTP IP
- DTMF mode
- Media routing
- Device names
- Encryption
- Softswitch
- Filters by customer/gateway/caller/callee/duration
- WebSocket/SSE updates

**Primary Portal API**

- `GET /api/v1/admin/calls/live`
- `GET /api/v1/admin/calls/live/stream`

**VOS / product basis:** Current Call fields are explicitly documented by VOS. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Live Call Detail

**Route:** `/admin/calls/live/{callId}`  
**Purpose:** Deep single-call inspection and safe operator actions.

**Page anatomy / features**

- All live-call fields
- Leg-by-leg topology
- Customer and carrier account links
- Media/codec panel
- Call analysis link
- Audio-traffic/voice-sample actions only for highly privileged roles
- Disconnect-call button with confirmation and mandatory reason
- Audit dangerous actions

**Primary Portal API**

- `GET /api/v1/admin/calls/live/{id}`
- `POST /api/v1/admin/calls/live/{id}/disconnect`

**VOS / product basis:** VOS Current Call includes disconnect, audio traffic, voice samples and call analysis actions. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Call Analysis

**Route:** `/admin/diagnostics/call-analysis`  
**Purpose:** Signaling-level troubleshooting.

**Page anatomy / features**

- Serial number search
- Caller signaling
- Callee signaling
- Softswitch memo
- Timestamp sequence
- Export signaling
- Import signaling file only if needed
- Link from CDR/live call

**Primary Portal API**

- `GET /api/v1/admin/diagnostics/call-analysis/{serial}`

**VOS / product basis:** VOS Call Analysis is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Registration Analysis

**Route:** `/admin/diagnostics/registration-analysis`  
**Purpose:** Analyze registration signaling problems.

**Page anatomy / features**

- Serial number
- Registration signaling
- Softswitch memo
- Time
- Filter/export
- Link to phone/gateway

**Primary Portal API**

- `GET /api/v1/admin/diagnostics/registration-analysis`

**VOS / product basis:** VOS Registration Analysis is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## CDR & Call Analytics

### Recent CDR

**Route:** `/admin/cdr/recent`  
**Purpose:** Fast access to most recent records.

**Page anatomy / features**

- Last 1,000 by default according to VOS behavior
- Caller/callee
- begin/end
- duration/charged duration
- charges/expense
- termination reason
- gateway/account/IP
- quick customer and call detail links

**Primary Portal API**

- `GET /api/v1/admin/cdr/recent`

**VOS / product basis:** VOS Recent CDR explicitly returns recent records and references CDR fields. [VOS]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### CDR Explorer

**Route:** `/admin/cdr`  
**Purpose:** Global historical CDR query and export.

**Page anatomy / features**

- Filters: start/end time mode, caller, callee, account, agent, mapping/routing gateway, caller/callee IP, call type, area/prefix, duration, charge, expense, termination reason, hangup side, Call-ID, serial number
- Columns selectable/persisted
- Server-side pagination
- Saved views
- CSV/XLSX export job for large ranges
- Aggregate footer totals
- No unrestricted wildcard export for non-privileged roles

**Primary Portal API**

- `GET /api/v1/admin/cdr`
- `POST /api/v1/admin/cdr/exports`

**VOS / product basis:** VOS CDR documents caller/callee, times, actual/charged duration, charge/expense, gateways, IPs, account/agent, call type, rewrite numbers, Call-IDs, reason and serial. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### CDR Detail

**Route:** `/admin/cdr/{cdrId}`  
**Purpose:** Human-readable single-call record.

**Page anatomy / features**

- Timeline: begin → routing → connect → end
- Caller/callee original and outbound rewritten values
- Actual vs charged duration
- Customer charge/tax
- Carrier expense/tax
- Gross margin
- Account/agent
- Mapping/routing gateway
- Caller/callee IP
- Call type/area
- Termination reason/hangup side
- Billing method/mode
- PDD/continue/connect delay
- Calling/called Call-ID
- Serial
- Open call analysis

**Primary Portal API**

- `GET /api/v1/admin/cdr/{id}`

**VOS / product basis:** Fields map directly to VOS CDR. Margin display is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Failure Analytics

**Route:** `/admin/analytics/failures`  
**Purpose:** Turn termination reasons into actionable operations intelligence.

**Page anatomy / features**

- Failure distribution
- Trend by hour/day
- Breakdown by customer/carrier/gateway/destination
- Top termination reasons
- Network vs trunk vs callee-reject vs caller-abandon groupings
- Drill-through to CDR
- Threshold alerts

**Primary Portal API**

- `GET /api/v1/admin/analytics/failures`

**VOS / product basis:** VOS records termination reason and gateway status outcome categories; analytics are [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Connect Analysis

**Route:** `/admin/analytics/connect`  
**Purpose:** Expose VOS CDR analysis for connection behavior.

**Page anatomy / features**

- Time filter
- Customer/gateway/destination filter
- ASR/connection KPIs
- Trend/chart
- Drill to source CDR

**Primary Portal API**

- `GET /api/v1/admin/analytics/connect`

**VOS / product basis:** VOS has CDR Analysis > Connect Analysis. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Interrupt Analysis

**Route:** `/admin/analytics/interrupt`  
**Purpose:** Analyze interrupted calls.

**Page anatomy / features**

- Time/destination/customer/gateway filters
- Interrupt distribution
- Reason and duration buckets
- Drill to CDR

**Primary Portal API**

- `GET /api/v1/admin/analytics/interrupt`

**VOS / product basis:** VOS has Interrupt Analysis. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Call Distribution

**Route:** `/admin/analytics/distribution`  
**Purpose:** Understand traffic distribution.

**Page anatomy / features**

- By hour
- destination
- account
- gateway
- duration band
- call type
- heatmaps and tables

**Primary Portal API**

- `GET /api/v1/admin/analytics/distribution`

**VOS / product basis:** VOS has Call Distribution analysis. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Historical Performance

**Route:** `/admin/analytics/historical-performance`  
**Purpose:** Longitudinal quality and traffic trend.

**Page anatomy / features**

- ASR/ACD/minutes/calls over time
- Compare periods
- Customer/gateway filter
- Export

**Primary Portal API**

- `GET /api/v1/admin/analytics/historical-performance`

**VOS / product basis:** VOS has Historical Performance. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Performance

**Route:** `/admin/analytics/gateway-performance`  
**Purpose:** Compare gateway quality and utilization.

**Page anatomy / features**

- ASR
- ACD
- calls
- minutes
- failure rate
- cost/margin overlay
- capacity utilization
- ranking

**Primary Portal API**

- `GET /api/v1/admin/analytics/gateway-performance`

**VOS / product basis:** VOS has Gateway Performance; business overlays are [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Rates, Packages & Commercial Routing

### Rate Groups

**Route:** `/admin/rates/groups`  
**Purpose:** Manage reusable customer/carrier rate groups.

**Page anatomy / features**

- Group name
- Number of rates
- Number of using accounts
- memo
- creator
- authorization visibility
- create/duplicate/archive
- open rates

**Primary Portal API**

- `GET /api/v1/admin/rates/groups`
- `POST /api/v1/admin/rates/groups`

**VOS / product basis:** VOS Rate Group Management documents these concepts. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Rate Editor

**Route:** `/admin/rates/groups/{groupId}`  
**Purpose:** Search, import, edit and validate rate prefixes.

**Page anatomy / features**

- Rate prefix
- area prefix/name
- rate type
- billing rate
- billing cycle
- rate/minute
- lock
- section rates
- tax
- bulk import/export
- prefix collision validation
- effective/future-change wrapper in portal
- impact count of attached accounts

**Primary Portal API**

- `GET /api/v1/admin/rates/groups/{id}/rates`
- `PUT /api/v1/admin/rates/groups/{id}/rates`

**VOS / product basis:** VOS documents longest-prefix matching, rate type, billing rate/cycle and import/export. Future workflow is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Rate Import Jobs

**Route:** `/admin/rates/imports`  
**Purpose:** Safe large-rate-sheet ingestion.

**Page anatomy / features**

- Upload CSV/XLSX
- Map columns
- Normalize prefixes
- Preview add/change/delete counts
- Validation errors
- Duplicate/overlap warnings
- Dry run
- Approval workflow
- Apply job
- Rollback snapshot maintained by portal

**Primary Portal API**

- `POST /api/v1/admin/rates/imports`

**VOS / product basis:** Built around VOS import/export capability. [HYBRID]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Rate Lookup

**Route:** `/admin/rates/lookup`  
**Purpose:** Resolve a number to matched rate and route context.

**Page anatomy / features**

- Input number and optional customer
- Matched prefix
- area
- rate type
- customer rate
- candidate carrier cost
- margin
- routing analysis shortcut

**Primary Portal API**

- `GET /api/v1/admin/rates/lookup`

**VOS / product basis:** [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Package Groups

**Route:** `/admin/packages`  
**Purpose:** Manage VOS billing packages.

**Page anatomy / features**

- Package name
- rent period/unit
- rent fee
- minimum consumption
- effective-spending limit
- period rates
- free duration
- free money
- using accounts
- authorization

**Primary Portal API**

- `GET /api/v1/admin/packages`
- `POST /api/v1/admin/packages`

**VOS / product basis:** VOS Package Management documents these fields. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Package Period Rates

**Route:** `/admin/packages/{packageId}/period-rates`  
**Purpose:** Define time-window-specific package rates.

**Page anatomy / features**

- Period type
- begin/end date
- begin/end time
- period rate
- overlap validation
- calendar preview

**Primary Portal API**

- `GET /api/v1/admin/packages/{id}/period-rates`

**VOS / product basis:** VOS Package Period Rate Management is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Package Free Duration

**Route:** `/admin/packages/{packageId}/free-duration`  
**Purpose:** Manage included call time.

**Page anatomy / features**

- Begin/end time
- area prefix
- free duration
- billing cycle
- memo
- usage preview

**Primary Portal API**

- `GET /api/v1/admin/packages/{id}/free-duration`

**VOS / product basis:** VOS Package Free Duration Management is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Margin Monitor

**Route:** `/admin/commercial/margins`  
**Purpose:** Detect unprofitable customer/carrier combinations.

**Page anatomy / features**

- Customer rate vs carrier cost
- Margin/minute
- Estimated daily margin
- Negative-margin destinations
- Gateway/customer drilldowns
- Threshold alarm

**Primary Portal API**

- `GET /api/v1/admin/commercial/margins`

**VOS / product basis:** VOS Routing Analysis exposes customer rate, egress rate and rate deviation; consolidated monitoring is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Billing, Payments & Settlement

### Payment Ledger

**Route:** `/admin/payments`  
**Purpose:** All customer payments and portal payment-processor events.

**Page anatomy / features**

- Filters account/customer/type/mode/status/date/amount
- VOS payment amount and resulting balance
- Portal processor transaction ID
- Payment/Credit/Create Account categorization where available
- Manual adjustment distinction
- Reconciliation state
- Receipt link
- Export

**Primary Portal API**

- `GET /api/v1/admin/payments`

**VOS / product basis:** VOS Payment Record documents account, amount, balance after payment, type, time, mode, payment user, memo, agent and serial. Portal reconciliation is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Manual Payment / Credit

**Route:** `/admin/payments/new`  
**Purpose:** Controlled operator-initiated financial adjustment.

**Page anatomy / features**

- Customer/account lookup
- Action: payment/credit/make-zero subject to role
- Amount
- Currency
- memo required
- Before/after balance
- Approval if threshold exceeded
- Idempotency key
- Result and serial/reference

**Primary Portal API**

- `POST /api/v1/admin/payments`

**VOS / product basis:** VOS supports Payment/Credit/Make Zero. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Revenue Details

**Route:** `/admin/billing/revenue`  
**Purpose:** Revenue consumption analysis.

**Page anatomy / features**

- Time period
- account/customer
- call types
- call charges
- package amounts
- minutes
- CDR counts
- export

**Primary Portal API**

- `GET /api/v1/admin/billing/revenue`

**VOS / product basis:** VOS Bill Query includes Revenue Details. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Bills

**Route:** `/admin/billing/gateway`  
**Purpose:** Consumption/billing by mapping gateway.

**Page anatomy / features**

- Gateway
- IP
- account
- period
- calls/minutes/charges
- export
- drill to CDR

**Primary Portal API**

- `GET /api/v1/admin/billing/gateway`

**VOS / product basis:** VOS Gateway Bill is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Phone Bills

**Route:** `/admin/billing/phone`  
**Purpose:** Consumption/billing by phone.

**Page anatomy / features**

- Phone
- account
- period
- usage/charges
- export
- drill to CDR

**Primary Portal API**

- `GET /api/v1/admin/billing/phone`

**VOS / product basis:** VOS Phone Bill exists. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Account Balance Report

**Route:** `/admin/billing/account-balance`  
**Purpose:** Portfolio-level balance reporting.

**Page anatomy / features**

- Customer/account
- current balance
- credit/overdraft
- status
- low-balance threshold
- agent hierarchy
- export

**Primary Portal API**

- `GET /api/v1/admin/billing/account-balance`

**VOS / product basis:** VOS Account Balance query/report exists. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Clearing & Settlement

**Route:** `/admin/settlement`  
**Purpose:** Carrier/customer settlement workspace.

**Page anatomy / features**

- Clearing account detail
- gateway details
- clearing balance
- settlement period
- reconciliation flags
- export
- summary

**Primary Portal API**

- `GET /api/v1/admin/settlement`

**VOS / product basis:** VOS documents clearing queries/reports and summary of financial settlement. [VOS]/[HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Reports

### Report Center

**Route:** `/admin/reports`  
**Purpose:** Single catalog for all operational, billing and analysis reports.

**Page anatomy / features**

- Categories: billing, cards, clearing, analysis, finance, quality, customer
- Saved report presets
- Run now
- Async export
- Schedule report
- Share to approved recipient
- Report history

**Primary Portal API**

- `GET /api/v1/admin/reports`

**VOS / product basis:** VOS includes Data Report and Report Management; scheduling UX is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Gateway Analysis Reports

**Route:** `/admin/reports/gateways`  
**Purpose:** Mapping/routing gateway and area analysis reports.

**Page anatomy / features**

- Mapping gateway analysis
- Routing gateway analysis
- Mapping/routing area analysis
- Cross-area analysis
- time and gateway filters
- export

**Primary Portal API**

- `GET /api/v1/admin/reports/gateways`

**VOS / product basis:** VOS documents these Analysis Reports. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Agent Income Report

**Route:** `/admin/reports/agent-income`  
**Purpose:** Agent hierarchy income view.

**Page anatomy / features**

- Agent
- period
- subaccounts
- income/usage
- export

**Primary Portal API**

- `GET /api/v1/admin/reports/agent-income`

**VOS / product basis:** VOS Agent Income Report exists. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Scheduled Reports

**Route:** `/admin/reports/schedules`  
**Purpose:** Portal-managed report delivery.

**Page anatomy / features**

- Report template
- filters
- frequency
- timezone
- recipients
- format
- last/next run
- failure status
- pause/resume

**Primary Portal API**

- `GET /api/v1/admin/report-schedules`
- `POST /api/v1/admin/report-schedules`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Number Management

### Number Sections

**Route:** `/admin/numbers/sections`  
**Purpose:** Query and organize allowed number ranges/prefixes.

**Page anatomy / features**

- Search prefix/range
- customer/agent ownership context
- export
- link to account limits

**Primary Portal API**

- `GET /api/v1/admin/numbers/sections`

**VOS / product basis:** VOS Number Section Query exists. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Area Information

**Route:** `/admin/numbers/areas`  
**Purpose:** Map prefixes to human-readable destinations.

**Page anatomy / features**

- Area prefix
- area name
- memo
- longest-match behavior note
- import/export wrapper

**Primary Portal API**

- `GET /api/v1/admin/numbers/areas`

**VOS / product basis:** VOS Area Information is used for rate display/matching. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Number Transform

**Route:** `/admin/numbers/transforms`  
**Purpose:** Manage number rewrite/transform rules.

**Page anatomy / features**

- Rule list
- source pattern
- target
- scope
- priority/order where supported
- test input/output
- impact preview
- audit

**Primary Portal API**

- `GET /api/v1/admin/numbers/transforms`

**VOS / product basis:** VOS Number Transform and rewrite rules are documented. Exact fields/API [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Black / White List Groups

**Route:** `/admin/numbers/lists`  
**Purpose:** Manage caller/callee full-match list groups.

**Page anatomy / features**

- Group name
- memo
- member numbers
- search/import/export
- usage references to gateways/phones
- bulk add/remove

**Primary Portal API**

- `GET /api/v1/admin/numbers/lists`

**VOS / product basis:** VOS Black/White List Group is documented as full-match and usable by gateways/phones. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### System White List

**Route:** `/admin/numbers/system-whitelist`  
**Purpose:** Manage system-level allowed phone numbers.

**Page anatomy / features**

- Phone number
- memo
- add/remove
- search/export

**Primary Portal API**

- `GET /api/v1/admin/numbers/system-whitelist`

**VOS / product basis:** VOS System White List is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Dynamic Black List

**Route:** `/admin/numbers/dynamic-blacklist`  
**Purpose:** Review and manage dynamically blocked numbers.

**Page anatomy / features**

- Phone number
- type malicious/no-answer
- effective date
- expiration
- last call time
- softswitch
- manual add/remove/expire subject to VOS support

**Primary Portal API**

- `GET /api/v1/admin/numbers/dynamic-blacklist`

**VOS / product basis:** VOS Dynamic Black List fields are documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Admin Users, Roles & Audit

### Admin Users

**Route:** `/admin/security/users`  
**Purpose:** Manage internal operator identities.

**Page anatomy / features**

- Login name
- display name
- portal role
- mapped VOS user where required
- status
- expiry
- last login
- last password change
- MFA state
- create/lock/disable/reset

**Primary Portal API**

- `GET /api/v1/admin/security/users`
- `POST /api/v1/admin/security/users`

**VOS / product basis:** VOS user management documents login/name/type/lock/invalid time/dynamic password. Portal identity is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Roles & Permissions

**Route:** `/admin/security/roles`  
**Purpose:** Fine-grained RBAC independent of the VOS client.

**Page anatomy / features**

- Role templates: Super Admin, NOC, Billing, Support, Sales, Read Only
- Resource/action matrix
- View/edit distinction
- Dangerous actions separated: disconnect call, payment adjustment, rate apply, gateway delete, system parameter write
- Customer-scope constraints
- Permission diff/preview
- Clone role

**Primary Portal API**

- `GET /api/v1/admin/security/roles`
- `PUT /api/v1/admin/security/roles/{id}`

**VOS / product basis:** VOS documents navigation preview, detailed view/edit privilege and operation authorization. Portal RBAC mirrors the principle. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Online Admin Users

**Route:** `/admin/security/online-users`  
**Purpose:** Show current VOS/portal user sessions where available.

**Page anatomy / features**

- User
- session source
- login time
- last activity
- IP
- portal vs VOS indicator

**Primary Portal API**

- `GET /api/v1/admin/security/online-users`

**VOS / product basis:** VOS includes Online User query. Portal session data is [HYBRID].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Portal Audit Log

**Route:** `/admin/audit`  
**Purpose:** Immutable audit trail of all portal mutations.

**Page anatomy / features**

- Actor
- role
- customer scope
- IP/session
- action
- resource
- before/after values
- request ID
- result
- timestamp
- filter/export
- retention policy

**Primary Portal API**

- `GET /api/v1/admin/audit`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### VOS System Log

**Route:** `/admin/system/vos-log`  
**Purpose:** Expose VOS operational log read-only.

**Page anatomy / features**

- Type Information/General/Error
- record time
- operating user
- event
- detail
- serial number
- link to related resource when identifiable

**Primary Portal API**

- `GET /api/v1/admin/system/vos-log`

**VOS / product basis:** VOS System Log fields are documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## System & Maintenance

### System Parameters

**Route:** `/admin/system/parameters`  
**Purpose:** Search and edit allowed VOS system parameters.

**Page anatomy / features**

- Parameter name/value/description
- Search by key
- Read-only by default
- Allowlisted editable parameters
- Validation by datatype/range
- Before/after diff
- Change ticket/reason
- Two-person approval for high-risk settings
- Rollback note

**Primary Portal API**

- `GET /api/v1/admin/system/parameters`
- `PATCH /api/v1/admin/system/parameters/{name}`

**VOS / product basis:** VOS System Parameter exposes name/value/description. Writes are sensitive and [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### System Information

**Route:** `/admin/system/info`  
**Purpose:** Display connected VOS server information.

**Page anatomy / features**

- Server/version/environment
- connected adapter
- time/timezone
- softswitch summary
- license/expiry only if available
- copy diagnostic bundle

**Primary Portal API**

- `GET /api/v1/admin/system/info`

**VOS / product basis:** VOS System Information exists. Exact fields [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Data Maintenance

**Route:** `/admin/system/data-maintenance`  
**Purpose:** View VOS historical table volumes and retention.

**Page anatomy / features**

- Tabs: system logs, history alarms, payment records, CDR, reports
- Table name/date suffix
- data volume
- memo
- retention policy
- cleanup status
- no destructive action without explicit confirmation

**Primary Portal API**

- `GET /api/v1/admin/system/data-maintenance`

**VOS / product basis:** VOS documents system-log/history-alarm/payment/CDR/report tables and automatic cleanup. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Performance Monitor

**Route:** `/admin/system/performance`  
**Purpose:** System-level operating performance.

**Page anatomy / features**

- CPU/memory/process/load metrics only where available
- VOS operation performance data
- portal adapter latency
- CDR ingest lag
- historical charts

**Primary Portal API**

- `GET /api/v1/admin/system/performance`

**VOS / product basis:** VOS includes Operation Performance, Process Monitor and Server Monitor. Exact metrics [VERIFY-API].

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Process Monitor

**Route:** `/admin/system/processes`  
**Purpose:** Read-only process status with controlled operational actions if supported.

**Page anatomy / features**

- Process name/status
- uptime
- resource usage if available
- last restart
- alert state
- no restart button until vendor-safe API verified

**Primary Portal API**

- `GET /api/v1/admin/system/processes`

**VOS / product basis:** VOS Process Monitor exists. [VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Server Monitor

**Route:** `/admin/system/servers`  
**Purpose:** Read-only VOS server state.

**Page anatomy / features**

- Server list
- role
- status
- health indicators
- last update
- drill to alarms/performance

**Primary Portal API**

- `GET /api/v1/admin/system/servers`

**VOS / product basis:** VOS Server Monitor exists. [VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Disaster Recovery

**Route:** `/admin/system/disaster-recovery`  
**Purpose:** Observe DR/tolerance state and equipment.

**Page anatomy / features**

- Status
- data state
- equipment
- replication/sync indicators if exposed
- last successful state
- alert integration
- read-only initial release

**Primary Portal API**

- `GET /api/v1/admin/system/disaster-recovery`

**VOS / product basis:** VOS documents Disaster Tolerance Status/Data/Equipment. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Work Calendar

**Route:** `/admin/system/work-calendar`  
**Purpose:** Manage VOS working/non-working calendars where needed.

**Page anatomy / features**

- Calendar name
- memo
- working/non-working periods
- usage references
- safe edit workflow

**Primary Portal API**

- `GET /api/v1/admin/system/work-calendar`

**VOS / product basis:** VOS Work Calendar is documented. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## API, Integrations & Automation

### Portal API Clients

**Route:** `/admin/integrations/api-clients`  
**Purpose:** Issue and control API access for customers/integrations.

**Page anatomy / features**

- Client/customer
- key ID
- secret shown once
- scopes
- IP allowlist
- rate limit
- created/last-used
- expiry
- rotate/revoke
- request statistics

**Primary Portal API**

- `GET /api/v1/admin/integrations/api-clients`
- `POST /api/v1/admin/integrations/api-clients`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Webhook Endpoints

**Route:** `/admin/integrations/webhooks`  
**Purpose:** Manage outbound event delivery.

**Page anatomy / features**

- Customer/integration
- URL
- events
- signing secret
- enabled state
- created/last success
- failure count
- test event
- rotate secret

**Primary Portal API**

- `GET /api/v1/admin/integrations/webhooks`
- `POST /api/v1/admin/integrations/webhooks`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Webhook Delivery Log

**Route:** `/admin/integrations/webhook-deliveries`  
**Purpose:** Troubleshoot event delivery.

**Page anatomy / features**

- Event ID/type
- customer
- endpoint
- attempt
- HTTP status
- latency
- response excerpt
- next retry
- manual retry
- payload viewer with secrets redacted

**Primary Portal API**

- `GET /api/v1/admin/integrations/webhook-deliveries`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### VOS Web Access Control

**Route:** `/admin/integrations/vos-access`  
**Purpose:** View/configure VOS external access controls.

**Page anatomy / features**

- Web service equipment
- directory name
- allowed IP
- memo
- change audit
- very restricted permission

**Primary Portal API**

- `GET /api/v1/admin/integrations/vos-access`

**VOS / product basis:** VOS Interface Management > Web Access Control documents these fields. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### VOS Web Service Equipment

**Route:** `/admin/integrations/vos-equipment`  
**Purpose:** Inspect VOS web-service access equipment.

**Page anatomy / features**

- Access name
- mark
- additional setting
- creation time
- access time
- access IP
- memo

**Primary Portal API**

- `GET /api/v1/admin/integrations/vos-equipment`

**VOS / product basis:** VOS Interface Management > Web Service Equipment documents these fields. [VOS]/[VERIFY-API]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Integration Health

**Route:** `/admin/integrations/health`  
**Purpose:** Monitor all external dependencies.

**Page anatomy / features**

- VOS connectivity
- CDR event feed
- phone online/offline feed if configured
- payment providers
- email/SMS notification providers
- webhook queue
- last event and error

**Primary Portal API**

- `GET /api/v1/admin/integrations/health`

**VOS / product basis:** VOS parameters include external CDR send and phone online/offline transfer; complete setup requires verification. [HYBRID]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

## Portal Operations

### Support Tickets

**Route:** `/admin/support/tickets`  
**Purpose:** Internal support queue connected to customer/call context.

**Page anatomy / features**

- Statuses, priority, category, assignee, SLA
- Link customer/gateway/CDR/call
- Internal notes vs customer replies
- attachments
- merge/close/reopen
- saved queues

**Primary Portal API**

- `GET /api/v1/admin/support/tickets`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Notification Policies

**Route:** `/admin/notifications/policies`  
**Purpose:** Configure automated alerts.

**Page anatomy / features**

- Low balance
- gateway offline/online
- ASR drop
- high failure
- packet loss/latency
- payment result
- rate change
- account expiry
- threshold, duration and cool-down
- channels email/webhook/others
- customer opt-in rules

**Primary Portal API**

- `GET /api/v1/admin/notification-policies`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Notification Log

**Route:** `/admin/notifications/log`  
**Purpose:** Delivery audit for all notifications.

**Page anatomy / features**

- Recipient
- event
- channel
- status
- attempts
- provider ID
- timestamp
- retry

**Primary Portal API**

- `GET /api/v1/admin/notifications/log`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Payment Providers

**Route:** `/admin/settings/payments`  
**Purpose:** Configure customer top-up providers.

**Page anatomy / features**

- Provider enabled state
- currency support
- minimum/maximum deposit
- fee handling
- webhook secret health
- test mode indicator
- never display raw secrets after save

**Primary Portal API**

- `GET /api/v1/admin/settings/payments`
- `PUT /api/v1/admin/settings/payments/{provider}`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Portal Branding

**Route:** `/admin/settings/branding`  
**Purpose:** Control customer-facing brand.

**Page anatomy / features**

- Logo
- favicon
- product name
- support contact
- legal links
- timezone/currency defaults
- email sender identity
- preview

**Primary Portal API**

- `GET /api/v1/admin/settings/branding`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.

### Feature Flags

**Route:** `/admin/settings/features`  
**Purpose:** Gradually enable portal modules by tenant.

**Page anatomy / features**

- Feature name
- global state
- customer overrides
- dependency checks
- audit every change

**Primary Portal API**

- `GET /api/v1/admin/settings/features`

**VOS / product basis:** [PORTAL]

**Required UX states**

- Loading/skeleton state; do not display stale data as live without timestamp.
- Empty state with a useful explanation and next action.
- Permission-denied state distinct from not-found.
- Partial-data/integration-degraded state if VOS or a downstream provider is unavailable.
- Destructive or financial actions require explicit confirmation; high-risk actions require re-authentication where configured.
- Success/failure feedback includes a request/reference ID for support.


## 7. Admin Role Model

| Role | Typical scope | Key restrictions |
|---|---|---|
| Super Admin | All portal and verified VOS functions | Highest-risk actions still audited/re-authenticated |
| NOC | Gateways, live calls, alarms, diagnostics | No financial credits/rate deployment unless separately granted |
| Billing | Balances, payments, bills, reports | No live-call disconnect/system configuration |
| Support | Customer overview, CDR, tickets, limited diagnostics | No rate/payment/system mutation |
| Commercial/Sales | Customer profile, rates read, usage/revenue read | No network/system operations |
| Security Admin | Users, roles, API keys, audit | No billing/routing by default |
| Read Only | Query/export approved datasets | No mutations |

## 8. Admin API Domain Map

```text
/api/v1/admin/auth/*
/api/v1/admin/dashboard/*
/api/v1/admin/customers/*
/api/v1/admin/gateways/*
/api/v1/admin/phones/*
/api/v1/admin/calls/*
/api/v1/admin/cdr/*
/api/v1/admin/analytics/*
/api/v1/admin/rates/*
/api/v1/admin/packages/*
/api/v1/admin/billing/*
/api/v1/admin/payments/*
/api/v1/admin/settlement/*
/api/v1/admin/reports/*
/api/v1/admin/numbers/*
/api/v1/admin/alarms/*
/api/v1/admin/support/*
/api/v1/admin/integrations/*
/api/v1/admin/security/*
/api/v1/admin/system/*
/api/v1/admin/settings/*
```

## 9. VOS Traceability Matrix

| VOS3000 manual area | Portal modules that consume it |
|---|---|
| §2.2 Rate Management | Rate Groups, Rate Editor, Rate Lookup, Margin Monitor |
| §2.3 Package Management | Package Groups, Period Rates, Free Duration, Customer Packages |
| §2.4 Account Management | Customers, Balances, Payments, Agent Tree, Authorizations, Number Limits |
| §2.5.1 Gateway Operation | Mapping/Routing Gateways, Online Gateways, Network Quality, Gateway Status |
| §2.5.2 Phone Operation | Phones, Phone Detail, Online Phones |
| §2.5.3 Business Analysis | Routing Analysis, Network Test, Call/Registration Analysis |
| §2.5.4 Current Call | Live Calls, Live Call Detail, Disconnect/Diagnostics |
| §2.5.5+ Operations | Registrations, Domains, Softswitch-related admin |
| §2.7 Data Query | Recent CDR, CDR Explorer, Payment Ledger, Bills |
| §2.8 Data Report | Report Center and billing/analysis reports |
| §2.9 CDR Analysis | Failure/Connect/Interrupt/Distribution/Historical/Gateway analytics |
| §2.11 Alarm Management | Alarm Center/NOC alerts |
| §2.12 System Management | Admin users, VOS logs, parameters, maintenance, monitors |
| §2.13 Number Management | Number sections, area info, transforms, lists |
| §2.14 Interface Management | VOS access controls/service equipment/integration layer |
| §2.15 Disaster Recovery | DR page |
| §2.17 Tools | Rate automation/comparison tools as later enhancements |

## 10. Release Priorities

### Phase 1 — essential operating portal
- Admin authentication/RBAC/audit
- Dashboard + NOC
- Customer directory/detail
- CDR + CDR detail
- Live calls
- Mapping/routing gateway read views
- Balance/payment read + carefully verified credit operation
- Rate read/lookup
- Alarm center
- Integration health

### Phase 2 — controlled configuration
- Customer create/edit
- Gateway create/edit/IP/capacity
- Rate import/edit/deploy
- Packages
- Phones
- Number lists/transforms
- Payment providers
- API keys/webhooks
- Scheduled reports

### Phase 3 — advanced operations
- Routing simulation tools
- Deep signaling diagnostics
- Margin monitor
- Settlement/reconciliation
- System parameters/maintenance
- Disaster recovery visibility
- Automated anomaly detection

## 11. Definition of Done for Every Admin Page

A page is not complete until:
- permission matrix is implemented and tested;
- API input/output schema is documented;
- tenant/customer scoping is tested;
- loading/empty/error/partial/degraded states are designed;
- audit behavior is defined for all mutations;
- destructive/financial confirmation is implemented;
- export limits and redaction are tested;
- timezone and currency behavior are deterministic;
- VOS adapter behavior is proven against the actual installed VOS version;
- no frontend code depends directly on VOS database schema or legacy client behavior.
