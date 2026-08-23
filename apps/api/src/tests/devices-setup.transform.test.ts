import { test } from "node:test";
import assert from "node:assert/strict";
import { toMaskedDTO, rawFromGateway } from "../devices-setup/transform.js";

const gw = {
  id: "a1b2c3d4-1111-4111-8111-111111111111",
  customer_id: "tenant-1",
  vos_gateway_id: "gw-777",
  name: "Primary Ingress",
  configured_ip: "203.0.113.10",
  line_limit: 60,
};

test("toMaskedDTO masks password when reveal=false", () => {
  const raw = rawFromGateway(gw, "1001");
  const dto = toMaskedDTO(raw, false);
  assert.ok(!dto.passwordMasked.includes(raw.password));
  assert.ok(dto.passwordMasked.startsWith("•••"));
  assert.equal(dto.sipServer, "203.0.113.10");
  assert.equal(dto.port, 5060);
});

test("toMaskedDTO reveals password only when requested", () => {
  const raw = rawFromGateway(gw, "1001");
  const revealed = toMaskedDTO(raw, true);
  assert.equal(revealed.passwordMasked, raw.password);
});

test("sipUri and qrPayload are well-formed", () => {
  const raw = rawFromGateway(gw, "1001");
  const dto = toMaskedDTO(raw, false);
  assert.match(dto.sipUri!, /^sip:1001@203\.0\.113\.10:5060;transport=udp$/);
  assert.ok(dto.qrPayload!.includes("1001@203.0.113.10"));
});

test("cfgSnippet contains server and port but never the raw password when masked", () => {
  const raw = rawFromGateway(gw, "1001");
  const masked = toMaskedDTO(raw, false);
  assert.ok(masked.cfgSnippet!.includes("203.0.113.10"));
  assert.ok(!masked.cfgSnippet!.includes(raw.password));
});
