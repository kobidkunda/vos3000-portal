import test from "node:test";
import assert from "node:assert/strict";
import { deriveAlarms, type AlarmAckState } from "../alarms.js";

const NOW = new Date("2026-08-22T12:00:00.000Z");

// Real production shapes observed 2026-08-22:
// VOS GetGatewayMapping.jsp -> infoGatewayMappings[{name, lockType, registerType, capacity, remoteIps}]
// PostgreSQL customers(id, account_name, vos_account_id, currency, balance, overdraft_limit, expires_at, status)
// PostgreSQL gateways(id, vos_gateway_id, name, kind, status, configured_ip)

const customers = [
  { id: "c1", account_name: "veejay singh", vos_account_id: "veejay singh", currency: "USD", balance: "22.61", overdraft_limit: "0", expires_at: null, status: "active" },
  { id: "c2", account_name: "Amit uk", vos_account_id: "Amit uk", currency: "USD", balance: "1240.5", overdraft_limit: "0", expires_at: null, status: "active" },
  { id: "c3", account_name: "test", vos_account_id: "test", currency: "USD", balance: "3340.1", overdraft_limit: "0", expires_at: null, status: "active" },
  { id: "c4", account_name: "AtRisk Co", vos_account_id: "atrisk", currency: "USD", balance: "5.00", overdraft_limit: "20", expires_at: null, status: "active" },
  { id: "c5", account_name: "Expiring Co", vos_account_id: "expiring", currency: "EUR", balance: "100", overdraft_limit: "0", expires_at: "2026-08-25T00:00:00.000Z", status: "active" },
  { id: "c6", account_name: "Gone Co", vos_account_id: "goneco", currency: "USD", balance: "50", overdraft_limit: "0", expires_at: "2026-07-01T00:00:00.000Z", status: "active" },
];

const gateways = [
  { id: "g1", vos_gateway_id: "veejay singh", name: "veejay singh", kind: "mapping", status: "unknown", configured_ip: null },
  { id: "g2", vos_gateway_id: "Amit uk", name: "Amit uk", kind: "mapping", status: "unknown", configured_ip: null },
  { id: "g3", vos_gateway_id: "test", name: "test", kind: "mapping", status: "unknown", configured_ip: null },
  { id: "g4", vos_gateway_id: "veejay_cand", name: "veejay_cand", kind: "mapping", status: "unknown", configured_ip: null },
  { id: "g5", vos_gateway_id: "orphan-portal", name: "Orphan Portal", kind: "mapping", status: "unknown", configured_ip: null },
];

const vosGateways = [
  { name: "veejay singh", lockType: 0, registerType: 0, capacity: 300, remoteIps: "62.84.182.224" },
  { name: "Amit uk", lockType: 0, registerType: 0, capacity: 300, remoteIps: "192.119.110.136" },
  { name: "test", lockType: 0, registerType: 1, capacity: 300, remoteIps: "" },
  { name: "Prince", lockType: 0, registerType: 0, capacity: 300, remoteIps: "49.12.132.35" },
  { name: "veejay_cand", lockType: 3, registerType: 0, capacity: 300, remoteIps: "62.84.182.224" },
  { name: "Rakesh", lockType: 0, registerType: 0, capacity: 300, remoteIps: "130.94.13.103" },
  { name: "canada_23448", lockType: 0, registerType: 1, capacity: 300, remoteIps: "" },
];

test("derives the real production alarm set (locked gateway, balance, expiry, drift)", () => {
  const rows = deriveAlarms({ customers, gateways, vosGateways, now: NOW });
  const byId = new Map(rows.map((r) => [r.id, r]));

  // veejay_cand is locked in VOS (lockType 3) -> critical, real engine state
  const locked = byId.get("locked:veejay_cand");
  assert.ok(locked, "locked gateway alarm expected");
  assert.equal(locked.severity, "critical");
  assert.equal(locked.type, "gateway.locked");
  assert.equal(locked.source, "gateway");

  // balance alarm: AtRisk Co (5.00 <= 20 overdraft)
  const bal = byId.get("balance:c4");
  assert.ok(bal, "balance alarm expected");
  assert.equal(bal.severity, "critical");
  assert.match(bal.message, /5\.00/);
  assert.equal(bal.state, "open");

  // expiry: Expiring Co within 14 days -> warning; Gone Co overdue -> critical
  assert.equal(byId.get("expiry:c5")?.severity, "warning");
  assert.equal(byId.get("expiry:c6")?.severity, "critical");

  // drift: orphan-portal not in VOS mapping -> critical; Prince unmanaged -> warning
  assert.equal(byId.get("missing:g5")?.severity, "critical");
  assert.equal(byId.get("unmanaged:Prince")?.severity, "warning");

  // no fabricated rows for healthy gateways (veejay singh, Amit uk, test...)
  assert.ok(!byId.has("locked:veejay singh"));
  assert.ok(!byId.has("locked:Amit uk"));

  // ordering: criticals first
  const sev = rows.map((r) => r.severity);
  assert.deepEqual([...new Set(sev)], ["critical", "warning"]);
  assert.equal(rows[0].severity, "critical");
});

test("critical always outranks warning regardless of derivation order", () => {
  const rows = deriveAlarms({ customers: [{ id: "x", balance: "1", overdraft_limit: "10", status: "active" }], gateways: [], vosGateways: [{ name: "L", lockType: 1 }], now: NOW });
  assert.equal(rows[0].severity, "critical");
});

test("capacity pressure derives from real measured calls", () => {
  const rows = deriveAlarms({ customers: [], gateways: [], vosGateways: [{ name: "busy", lockType: 0, capacity: 10 }], currentCallsByGateway: { busy: 9 }, now: NOW });
  const cap = rows.find((r) => r.id === "capacity:busy");
  assert.ok(cap);
  assert.equal(cap.severity, "warning");
  assert.equal(cap.active_calls, 9);
  assert.match(cap.message, /9\/10/);
  const rows2 = deriveAlarms({ gateways: [], vosGateways: [{ name: "full", lockType: 0, capacity: 10 }], currentCallsByGateway: { full: 10 }, now: NOW });
  assert.equal(rows2.find((r) => r.id === "capacity:full")?.severity, "critical");
});

test("acknowledged state is merged and preserved", () => {
  const acks = new Map<string, AlarmAckState>([["locked:veejay_cand", { acked_by: "ops@carrier.tel", acked_at: "2026-08-22T08:00:00.000Z", note: "Known maintenance window" }]]);
  const rows = deriveAlarms({ customers, gateways, vosGateways, acks, now: NOW });
  const locked = rows.find((r) => r.id === "locked:veejay_cand");
  assert.ok(locked);
  assert.equal(locked.state, "acknowledged");
  assert.equal(locked.acked_by, "ops@carrier.tel");
  assert.equal(locked.note, "Known maintenance window");
  assert.equal(locked.first_seen, "2026-08-22T08:00:00.000Z");
  assert.ok(locked.last_seen > locked.first_seen);
});

test("closed customers never raise financial alarms", () => {
  const rows = deriveAlarms({ customers: [{ id: "z", balance: "0", overdraft_limit: "50", status: "closed" }], gateways: [], vosGateways: [], now: NOW });
  assert.equal(rows.filter((r) => r.type === "balance.limit").length, 0);
});

test("never emits secret VOS fields", () => {
  const blob = JSON.stringify(deriveAlarms({ customers, gateways, vosGateways, vosAvailable: true, now: NOW }));
  assert.ok(!/password/i.test(blob), "no password material may leak");
  assert.ok(!/XhlIAIWk/.test(blob));
});

test("vosAvailable=false suppresses VOS-dependent alarms (no fabricated drift)", () => {
  // VOS unreachable: portal gateways without VOS proof must NOT become alarms,
  // and locked/unmanaged/capacity rules are suppressed.
  const rows = deriveAlarms({ customers, gateways, vosGateways, vosAvailable: false, currentCallsByGateway: { busy: 9 }, now: NOW });
  assert.equal(rows.find((r) => r.id === "missing:g5"), undefined, "no missing-mapping alarm when VOS is unreachable");
  assert.equal(rows.find((r) => r.id === "locked:veejay_cand"), undefined, "no locked alarm when VOS is unreachable");
  assert.equal(rows.find((r) => r.id === "unmanaged:Prince"), undefined);
  assert.equal(rows.find((r) => r.id === "capacity:busy"), undefined);
  // Portal-only rules (balance, expiry) still derive — they are proven by PostgreSQL.
  assert.ok(rows.find((r) => r.id === "balance:c4"));
  assert.ok(rows.find((r) => r.id === "expiry:c5"));
});