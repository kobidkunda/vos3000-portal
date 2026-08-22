# VOS3000 Server-Side Setup — JSP External API

> **One-page runbook for the VOS3000 host itself** (not the portal). Do these
> steps once per VOS3000 install before the portal can talk to it over HTTP.
> Portal env: `VOS_HTTP_BASE_URL`, `VOS_HTTP_USERNAME`, `VOS_HTTP_PASSWORD`.
> Verified host: `62.84.182.223` — `/home/kunshi/vos3000` install.
> Last verified: 2026-08-22

---

## 0. TL;DR — what to change on the VOS host

| # | Where | What | Value |
|---|-------|------|-------|
| 1 | `/home/kunshi/vos3000/etc/server.conf` | `GUI_SERVER_PORT` | `7663` (GUI, **not** 7391) |
| 2 | `/home/kunshi/vos3000/etc/server.conf` | `EXTERNAL_SERVER_PORT` | `1205` (native VOS binary protocol — **not used** for JSP API) |
| 3 | `/home/kunshi/vos3000/etc/server.conf` | `EXTERNAL_SERVER_IP` | `0.0.0.0` (listen on all interfaces) |
| 4 | VOS GUI → `System Management → e_web_access_control` | `allowip` for `/external/server` + `/external/test` | `0.0.0.0` (or your portal IP allowlist in production) |
| 5 | Tomcat (port `7391`) | Serves all JSP APIs | `http://<vos-host>:7391/external/server/*.jsp` |
| 6 | VOS GUI → `System Management → Users` | API user (level `0`) | `admin` / `uBECkL320uq2qQj` — used as `VOS_HTTP_USERNAME` / `VOS_HTTP_PASSWORD` |
| 7 | Portal `.env` | `VOS_HTTP_BASE_URL` | `http://62.84.182.223:7391` (no trailing slash) |

Restart order: `vos3000` → `tomcat`.

> **Verified credentials for this host (lab):**
> `userid=admin` / `password=uBECkL320uq2qQj` / test `uuid=bd797894-3f0e-4515-a870-18379afa25b5`
> ⚠️ Do not commit real passwords to public repos — use env / secret manager in production (see §8).

---

## 1. Port map — stop confusing 7663 / 7391 / 1205

```
GUI (operator web console) ........... 7663  → https://<host>:7663  (VOS GUI)
Tomcat JSP External API (HTTP JSON) .. 7391  → http://<host>:7391/external/server/*.jsp  ← portal uses this
Native VOS external protocol ......... 1205  → EXTERNAL_SERVER_PORT (binary, not JSP — not used by portal)
```

- `GUI_SERVER_PORT=7663` — log into this to manage users, `e_web_access_control`, etc.
- `EXTERNAL_SERVER_PORT=1205` — leave at default; the portal does **not** call it.
- **All 90+ portal operations go through Tomcat `7391` as `POST .../external/server/<Op>.jsp` with `Content-Type: application/json`.**

---

## 2. Fix `server.conf`

File: `/home/kunshi/vos3000/etc/server.conf` (adjust base path to your install)

```ini
GUI_SERVER_PORT=7663
EXTERNAL_SERVER_PORT=1205
EXTERNAL_SERVER_IP=0.0.0.0
```

`EXTERNAL_SERVER_IP=0.0.0.0` is required — the default `127.0.0.1` binds the
external listener to localhost only and the portal cannot connect from outside.

Apply:

```bash
# edit server.conf, then restart VOS
sudo systemctl restart vos3000
# or: /home/kunshi/vos3000/bin/vos restart
sudo systemctl status vos3000 --no-pager
# verify listening
ss -tlnp | grep -E '7663|7391|1205'
```

---

## 3. Open external HTTP access (`e_web_access_control`)

The JSP API is gated by VOS's own IP allowlist, separate from `server.conf`.

1. Open GUI: `https://<vos-host>:7663` → login as `admin` / `uBECkL320uq2qQj`.
2. Go to **System Management → Web Access Control** (`e_web_access_control`).
3. Find rows for:
   - `/external/server`
   - `/external/test`
4. Set `allowip` = `0.0.0.0` (wide open, fine for lab).

> **Production:** replace `0.0.0.0` with your portal/NAT egress IPs
> (e.g. `203.0.113.10,203.0.113.11`). Never leave `0.0.0.0` on the public internet
> without a firewall in front.

---

## 4. Restart Tomcat (port 7391)

The JSP APIs are deployed under Tomcat, not under the VOS binary.

```bash
sudo systemctl restart tomcat
# or: sudo systemctl restart tomcat9  (depends on distro)
ss -tlnp | grep 7391
curl -i http://127.0.0.1:7391/external/test/test.jsp  # should return 200
```

If Tomcat fails to start, check:

```bash
journalctl -u tomcat --no-pager -n 100
cat /var/log/tomcat*/catalina.out | tail -n 100
```

---

## 5. Verify the API user (GUI)

The JSP API authenticates with a **normal VOS GUI user** — there is no separate
"API key". Every POST must include `userid` + `password`.

For this host the verified user is:

- **userid:** `admin`
- **password:** `uBECkL320uq2qQj`
- **level:** `0` (admin — required for customer/gateway/rate writes)
- **test uuid:** `bd797894-3f0e-4515-a870-18379afa25b5`

Steps to verify / recreate:

1. GUI → **System Management → Users** → confirm `admin` exists, level `0`, enabled.
2. If creating a dedicated portal user, copy permissions from `admin` level 0.
3. Save → log out → log back into GUI at `https://<host>:7663` as that user to confirm.

Portal env (see `.env.example` / `.env.production.example`):

```ini
VOS_MODE=http
VOS_HTTP_BASE_URL=http://62.84.182.223:7391
VOS_HTTP_USERNAME=admin
VOS_HTTP_PASSWORD=uBECkL320uq2qQj
```

`VOS_HTTP_BASE_URL` must be the Tomcat base (`:7391`), **no** `/external/server` suffix — the adapter appends it per operation.

> **Security note:** The password above is the live lab credential the user asked to include for easy testing. For any shared/production checkout, replace it with `REPLACE_WITH_STRONG_PASSWORD` and inject via secret manager (see `docs/PRODUCTION_CHECKLIST.md`).

---

## 6. JSP API reference (90+ endpoints, all on `:7391`)

All endpoints: `POST http://<host>:7391/external/server/<Name>.jsp`
Headers: `Content-Type: application/json`
Body: JSON with `userid`, `password` + operation fields.
Response: JSON.

### Customer / Accounts

| Endpoint | Purpose |
|----------|---------|
| `CreateCustomer.jsp` | Create VOS account |
| `GetCustomer.jsp` | Get single account (filter by `E164` etc.) |
| `GetAllCustomers.jsp` | List accounts |
| `ModifyCustomer.jsp` | Update account |
| `DeleteCustomer.jsp` | Delete account |
| `GetPayHistory.jsp` / `Pay.jsp` / `GetConsumption.jsp` | Billing/payment |

### Phones / Numbers

| Endpoint | Purpose |
|----------|---------|
| `CreatePhone.jsp` / `GetPhone.jsp` / `ModifyPhone.jsp` / `DeletePhone.jsp` | Phone lifecycle |
| `GetPhoneOnline.jsp` | Online status |
| `PlayAudio.jsp` | Play prompt |

### Gateways & Routing

| Endpoint | Purpose |
|----------|---------|
| `GetGatewayMapping.jsp` / `CreateGatewayMapping.jsp` | Mapping gateways |
| `GetGatewayRouting.jsp` / `CreateGatewayRouting.jsp` | Routing gateways |
| *(see full Tomcat listing for `GetGatewayMappingGroup` etc.)* | |

### CDR

| Endpoint | Purpose |
|----------|---------|
| `GetCdr.jsp` | Query CDR |
| `CreateCdr.jsp` | Create/test CDR (where supported) |

### Rates & Packages

| Endpoint | Purpose |
|----------|---------|
| `GetFeeRate.jsp` | Single rate |
| `GetFeeRateGroup.jsp` / `CreateFeeRateGroup.jsp` | Rate groups |
| `GetSuite.jsp` / `CreateSuite.jsp` / `GetCurrentSuite.jsp` | Suites/packages |

### E.164 / Number Translation

| Endpoint | Purpose |
|----------|---------|
| `CreateE164Convert.jsp` / `GetE164Convert.jsp` | E.164 rules |
| `CreateBindedE164.jsp` / `GetBindedE164.jsp` | Bound translations |

> Dump the full live list at any time: enumerate `webapps/external/server/*.jsp`
> on the VOS host, or hit `GET http://<host>:7391/external/server/` if directory
> listing is enabled.

---

## 7. Smoke test from outside the VOS host

Run from your laptop or from the portal host — not from `127.0.0.1` on the VOS box — to prove the `0.0.0.0` / `allowip` changes worked.

Using the verified lab credentials:

```bash
# Single customer by E164
curl -X POST http://62.84.182.223:7391/external/server/GetCustomer.jsp \
  -H "Content-Type: application/json" \
  -d '{"userid":"admin","password":"uBECkL320uq2qQj","E164":"1000"}' | jq .

# By UUID (example from this host)
curl -X POST http://62.84.182.223:7391/external/server/GetCustomer.jsp \
  -H "Content-Type: application/json" \
  -d '{"userid":"admin","password":"uBECkL320uq2qQj","uuid":"bd797894-3f0e-4515-a870-18379afa25b5"}' | jq .

# List all customers
curl -X POST http://62.84.182.223:7391/external/server/GetAllCustomers.jsp \
  -H "Content-Type: application/json" \
  -d '{"userid":"admin","password":"uBECkL320uq2qQj"}' | jq .

# Quick Tomcat liveness (no auth)
curl -i http://62.84.182.223:7391/external/test/test.jsp
```

Expected: JSON with customer record or empty list — not `403` / `connection refused`.

Common failures:

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Connection refused` on `:7391` from remote | `EXTERNAL_SERVER_IP` still `127.0.0.1` or Tomcat down | Set `0.0.0.0` → restart `vos3000` + `tomcat`; check `ss -tlnp` |
| `403` / `Forbidden` JSON from JSP | `e_web_access_control.allowip` blocks portal IP | Set `0.0.0.0` (lab) or add portal IP; GUI → System Management |
| `Auth failed` / empty | Wrong `userid`/`password` or user not level 0 | Verify user logs into GUI `:7663`; reset password |
| `404` on `GetCustomer.jsp` | Wrong base URL (missing `:7391` or wrong path) | `VOS_HTTP_BASE_URL=http://<host>:7391` exactly |

---

## 8. Portal wiring

```ini
# .env / .env.production.example
VOS_MODE=http                 # mock = no VOS calls; http = live
VOS_HTTP_BASE_URL=http://62.84.182.223:7391
VOS_HTTP_USERNAME=admin
VOS_HTTP_PASSWORD=uBECkL320uq2qQj   # lab — use secret manager in prod
VOS_CAPABILITIES_FILE=/app/config/vos-capabilities.json
```

- Enable operations in `config/vos-capabilities.json` only **after** the curl above succeeds for that operation (`verified=true`).
- Tenant-safe reads (`tenantSafe=true`) only after you prove Customer A cannot read Customer B via upstream scoping.
- See `docs/PRODUCTION_CHECKLIST.md` and `docs/WHAT_IS_ENVIRONMENT_SPECIFIC.md` for the capability-gate model.

---

## 9. Reverting / hardening for production

```bash
# Tighten allowip to portal egress IPs only
# GUI → e_web_access_control → allowip = 203.0.113.10,203.0.113.11

# Firewall the VOS host (example: UFW)
sudo ufw allow 7663/tcp  # GUI — restrict to VPN/bastion in prod
sudo ufw allow 7391/tcp  # JSP API — restrict to portal IPs
sudo ufw deny  1205/tcp  # native protocol — not needed externally
```

Rotate the lab password after testing and update `VOS_HTTP_PASSWORD` via secret manager — never leave `uBECkL320uq2qQj` in a public repo history.

---

## 10. Change log for this host (62.84.182.223)

- `server.conf`: `GUI_SERVER_PORT` confirmed `7663`, `EXTERNAL_SERVER_PORT` `1205`, `EXTERNAL_SERVER_IP` `0.0.0.0`.
- `e_web_access_control`: `allowip=0.0.0.0` for `/external/server` and `/external/test`.
- Restarted `vos3000` and `tomcat`.
- `VOS_HTTP_BASE_URL=http://62.84.182.223:7391` verified via `GetCustomer.jsp` / `GetAllCustomers.jsp` with `admin` / `uBECkL320uq2qQj` and `uuid=bd797894-3f0e-4515-a870-18379afa25b5`.

---

*If VOS behavior differs on your build, mark the operation `VERIFY-API` and fail closed — do not guess field names. See `AGENTS.md` §1.*
