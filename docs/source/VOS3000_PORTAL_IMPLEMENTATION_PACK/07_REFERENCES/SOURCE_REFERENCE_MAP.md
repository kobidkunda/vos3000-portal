# VOS3000 Source Reference Map

## Source

`VOS3000_2-1-8-0_2-1-8-05_English_Manual(VOS3000.Com)(1).pdf`

This pack uses the manual as proof that a **VOS function/data concept exists**, not as proof that every function has a complete REST API.

Page references below distinguish:
- **Printed page** — page number shown inside the VOS manual.
- **PDF page** — physical page index in the supplied PDF.

## Account and billing

### §2.4 Account Management — Printed 15+, PDF 25+
Documents:
- account ID/name;
- current balance;
- overdraft limit;
- billing rate/private rate;
- today consumption;
- gateway/phone counts;
- agent/category/type/status;
- expiry date.

Portal use:
- Admin Customer Directory/Account Settings.
- Client Balance/Dashboard.
- Customer-to-VOS mapping.

### §2.4.2 Payment — Printed 20, PDF 30
Documents:
- payment operation;
- Payment/Credit/Make Zero;
- amount;
- memo/history behavior.

Portal use:
- Admin adjustment workflow.
- Add-funds VOS credit step.

Important:
- [VERIFY-VOS-API] exact external mutation mechanism must be proven.

### §2.4.5 Authorization Management — Printed 23–24, PDF 33–34
Documents permissions for:
- account;
- phone;
- phone card;
- gateway;
- gateway information/capacity;
- payment for account/subaccounts.

Portal use:
- Admin RBAC/product mapping.
- Agent/subaccount workflows.

### §2.4.6 Number Section Limitation — Printed 25, PDF 35
Documents begin/end allowed number range.

## Gateway operations

### §2.5.1.4 Online Routing Gateway — Printed 64–65, PDF 74–75
Documents:
- gateway/prefix;
- current sessions/capacity;
- line limit;
- ASR;
- ACD;
- CPS;
- registered IP;
- registration/update time;
- encryption/tracing/local IP/softswitch.

Portal use:
- NOC;
- routing gateway status;
- admin live operations.

### §2.5.1.5 Online Mapping Gateway — Printed 66–67, PDF 76–77
Documents:
- current sessions/capacity;
- line limit;
- ASR/ACD/CPS;
- registered IP;
- registration/update time.

Portal use:
- customer My Gateways;
- channel/CPS/quality dashboard.

### §2.5.1.6 Mapping Gateway Network — Printed 68, PDF 78
Documents:
- remote IP;
- network quality;
- packet loss;
- network delay;
- device ID.

### §2.5.1.7 Routing Gateway Network — Printed 69, PDF 79
Same network-quality concepts for routing gateway.

### §2.5.1.8 Gateway Status — Printed 70, PDF 80
Documents:
- total calls;
- success;
- callee rejected;
- trunk error;
- network error;
- caller abandon;
- average talk duration;
- total call time;
- IP;
- starting time.

## Phone operations

### §2.5.2.1 Phone Management — Printed 71+, PDF 81+
Documents:
- phone number;
- registration/configuration password;
- lock states;
- authorization type;
- monthly consumption/min/max/service fee;
- billing rate;
- routing group;
- account;
- DID/DDI;
- softswitch;
- reverse charging;
- self-service password;
- in/out/line limits.

Printed 74+, PDF 84+ documents supplementary services including forwarding/DND/transfer.

### §2.5.2.2 Online Phone — Printed 85–86, PDF 95–96
Documents:
- current calls/capacity;
- protocol/device;
- registered IP;
- registration/update time;
- encryption/tracing/softswitch.

## Business analysis and live calls

### §2.5.3.1 Routing Analysis — Printed 87–88, PDF 97–98
Documents simulation inputs:
- authentication method;
- device ID/type;
- caller/callee;
- softswitch.

Outputs include:
- rewritten caller/callee;
- customer rate/minute;
- account;
- available time;
- candidate route;
- egress rate;
- rate deviation;
- detail.

Portal use:
- pre-change route/rate validation.
- margin analysis inputs.

### §2.5.3.2 Network Test — Printed 89, PDF 99
Documents remote IP/port/local IP/packet type.

### §2.5.3.3 Call Analysis — Printed 90, PDF 100
Documents signaling records, timestamps, export/import.

### §2.5.3.4 Registration Analysis — Printed 91, PDF 101
Documents registration signaling troubleshooting.

### §2.5.4 Current Call — Printed 93–94, PDF 103–104
Documents:
- caller/callee;
- mapping/routing gateway;
- connect time/duration;
- connecting duration;
- PDD;
- codec/traffic;
- caller/callee IP and RTP info;
- DTMF;
- media routing;
- encryption;
- softswitch IP.

Also lists operations:
- disconnect call;
- audio traffic;
- voice samples;
- call analysis;
- IVR analysis.

Portal use:
- live calls;
- NOC;
- privileged disconnect action.

[VERIFY-VOS-API] exact external call-disconnect/analysis interface.

### §2.5.5 Registration Management — Printed 95, PDF 105
Documents mark, username/password, server IP, line limit, signaling port, encryption, host, SIP proxy, User-Agent, local IP/port.

## CDR and payments

### §2.7.1 Recent CDR — Printed 122, PDF 132
Documents recent CDR query and states it is intended to quickly query the last 1000 CDR.

### §2.7.2 CDR — Printed 123–125, PDF 133–135
Documents:
- caller/callee;
- begin/end;
- actual and charged duration;
- call charge/taxes;
- call expense/cost tax;
- termination reason/hangup side;
- mapping/routing gateway;
- caller/callee IP;
- account/agent;
- call type;
- area prefix/name;
- incoming/outbound rewritten numbers;
- billing method/mode;
- connection timings/PDD definition;
- calling/called Call-ID;
- reason;
- serial number described as unique identification.

Portal use:
- ClickHouse canonical CDR.
- CDR explorer/detail.
- ASR/ACD/PDD/failure/finance analytics.

[VERIFY] uniqueness scope of serial number across VOS instances/softswitches/history.

### §2.7.3 Payment Record — Printed 126, PDF 136
Documents:
- account;
- payment amount;
- resulting balance;
- type;
- time;
- mode;
- payment user;
- memo;
- agent;
- serial.

Portal use:
- payment reconciliation.

## System and security

### §2.12.1 User Management — Printed 191–193, PDF 201–203
Documents:
- Administrator/Operator/Agent;
- lock state;
- invalid time;
- MAC verification;
- dynamic password;
- navigation view/edit privilege;
- detailed/operation authorization;
- last login/password change.

Portal use:
- design inspiration for role granularity.
- Does not replace portal identity/RBAC.

### §2.12.2 System Log — Printed 194, PDF 204
Documents:
- type;
- record time;
- operating user;
- event;
- detail;
- serial.

### §2.12.3 System Parameter — Printed 196, PDF 206
Documents parameter name/value/description.

[VERIFY-VOS-API] parameter write access is high risk.

### §2.12.6 Data Maintenance — Printed 200+, PDF 210+
Documents historical table metadata for logs/alarms/payments/CDR/reports and cleanup concepts.

## Number management and interfaces

### §2.13.3 Number Transform — Printed 215, PDF 225
Documents Number Transform function.

### §2.13.4 Black/White List Group — Printed 216, PDF 226
Documents full-match groups used by caller/callee controls on routing gateway, mapping gateway and phone.

### §2.13.5 System White List — Printed 217, PDF 227
Documents phone number + memo.

### §2.13.6 Dynamic Black List — Printed 218, PDF 228
Documents:
- phone number;
- malicious/no-answer type;
- effective/expiration;
- last call time;
- softswitch.

### §2.14.1 Web Access Control — Printed 220, PDF 230
Documents:
- web service equipment;
- directory name;
- IP allowed access;
- memo.

### §2.14.2 Web Service Equipment — Printed 221, PDF 231
Documents:
- access name;
- mark;
- additional settings;
- creation/access time;
- access IP;
- memo.

Portal implication:
VOS clearly includes interface-management concepts, but this is **not** sufficient evidence of a complete modern API for all portal operations.

## Supplement parameter references

The manual's parameter-description supplement includes:
- `EXTERNAL_WEB_SEND_PHONE_ONLINE` — interface phone online/offline transfer.
- `EXTERNAL_SEND_CDR` — interface send CDR.
- `SERVER_CDR_REAL_TIME_REPORT_SERVER` — additional call-record send target.

These indicate integration mechanisms may exist, but [VERIFY-VOS-API] the transport payload, authentication, acknowledgement and retry semantics must be proven in Phase 00 before production reliance.

## Product-design references in this pack

- `VOS3000_ADMIN_PORTAL_PRODUCT_DESIGN.md` — 97 admin pages and product behaviors.
- `VOS3000_CLIENT_PORTAL_PRODUCT_DESIGN.md` — 45 client pages and product behaviors.

Those files intentionally label portal-only, hybrid and VOS-backed features.
