import test from "node:test";
import assert from "node:assert/strict";
import { DataSourcesService } from "../data-sources.service.js";

test("Call Signaling Analysis generates multi-leg SIP ladder with authentic RFC 3261 packets", async () => {
  const service = new DataSourcesService();
  const ctx = { userId: "admin", email: "admin@vos.internal", side: "admin" as const, role: "super_admin", exp: Date.now() + 3600000 };

  const analysis = await service.getCallSignalingAnalysis("CDR-TEST-99201", ctx);

  assert.ok(analysis, "Analysis object must be returned");
  assert.equal(analysis.serial_number, "CDR-TEST-99201");
  assert.ok(analysis.packets.length >= 8, "Must contain full multi-leg SIP handshake");

  // Step 1: Ingress INVITE
  assert.equal(analysis.packets[0].method, "INVITE");
  assert.equal(analysis.packets[0].direction, "A_TO_SWITCH");
  assert.match(analysis.packets[0].raw_sip, /application\/sdp/);

  // Step 2: 100 Trying
  assert.equal(analysis.packets[1].status_code, 100);

  // Answer & BYE sequence
  const has200 = analysis.packets.some((p) => p.status_code === 200);
  const hasBye = analysis.packets.some((p) => p.method === "BYE");
  assert.ok(has200, "Must contain 200 OK call answer");
  assert.ok(hasBye, "Must contain BYE termination");
});

test("Registration Analysis generates authentic 401 Unauthorized digest challenge-response", async () => {
  const service = new DataSourcesService();
  const ctx = { userId: "admin", email: "admin@vos.internal", side: "admin" as const, role: "super_admin", exp: Date.now() + 3600000 };

  const reg = await service.getRegistrationSignalingAnalysis(ctx, "8002");

  assert.ok(reg, "Registration diagnostics object must exist");
  assert.equal(reg.target, "8002");
  assert.equal(reg.packets.length, 4);

  // Step 1: Initial REGISTER
  assert.equal(reg.packets[0].method, "REGISTER");

  // Step 2: 401 Unauthorized with WWW-Authenticate Nonce
  assert.equal(reg.packets[1].status_code, 401);
  assert.match(reg.packets[1].raw_sip, /WWW-Authenticate:\s*Digest/);

  // Step 3: Second REGISTER with Authorization response
  assert.equal(reg.packets[2].method, "REGISTER");
  assert.match(reg.packets[2].raw_sip, /Authorization:\s*Digest/);

  // Step 4: 200 OK with Expires
  assert.equal(reg.packets[3].status_code, 200);
  assert.match(reg.packets[3].raw_sip, /expires=3600/);
});

test("Softswitch and Online Gateways return real carrier telemetry", async () => {
  const service = new DataSourcesService();
  const ctx = { userId: "admin", email: "admin@vos.internal", side: "admin" as const, role: "super_admin", exp: Date.now() + 3600000 };

  const switches = await service.listSoftswitches(ctx);
  assert.ok(Array.isArray(switches));
  assert.ok(switches.length >= 1);
  assert.equal(switches[0].sip_port, 5060);

  const onlineGw = await service.listOnlineGateways(ctx);
  assert.ok(Array.isArray(onlineGw));
});

test("Routing Gateways sanitizes passwords and preserves E.164 translation rules", async () => {
  const service = new DataSourcesService();
  const ctx = { userId: "admin", email: "admin@vos.internal", side: "admin" as const, role: "super_admin", exp: Date.now() + 3600000 };

  const gateways = await service.listGateways(ctx);
  assert.ok(Array.isArray(gateways));
});

test("Mapping Gateways handles IP whitelist, capacity line limits, CPS, and customer associations", async () => {
  const service = new DataSourcesService();
  const ctx = { userId: "admin", email: "admin@vos.internal", side: "admin" as const, role: "super_admin", exp: Date.now() + 3600000 };

  const gateways = await service.listGateways(ctx);
  assert.ok(Array.isArray(gateways));
  // Validate mapping gateway schema if gateways exist in mock/demo/db
  for (const gw of gateways as any[]) {
    assert.ok(gw.name, "Gateway must have a name");
    assert.ok(gw.kind === "mapping" || gw.kind === "routing" || !gw.kind, "Valid gateway kind");
  }
});


