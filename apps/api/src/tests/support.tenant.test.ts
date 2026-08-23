import test from "node:test";
import assert from "node:assert/strict";
import { AppController } from "../app.controller.js";
import { defaultSupportConfig } from "@vos/shared";

function fakeRes() {
  const r: any = { code: 0 };
  r.status = (c: number) => { r.code = c; return r; };
  r.header = () => r;
  return r;
}
function fakeReq(query = "") {
  return { headers: {}, ip: "10.0.0.7", url: `/api/v1/x${query}`, query } as any;
}

function makeController(ctx: any) {
  const auditCalls: any[][] = [];
  const savedBodies: any[] = [];
  const auth = {
    resolveContext: async () => ctx,
    tokenFromHeaders: () => ({ source: "bearer" }),
  };
  const sources = { audit: async (...a: any[]) => { auditCalls.push(a); } };
  const support = {
    getSupportConfig: async () => ({
      ...defaultSupportConfig(),
      enabled: true,
      telegram: { enabled: true, handle: "vos_support_bot", url: "https://t.me/vos_support_bot" },
      teams: { enabled: true, id: "support@vos-portal.local", url: "https://teams.microsoft.com/l/chat/0/0?users=support%40vos-portal.local" },
    }),
    saveSupportConfig: async (input: any) => {
      savedBodies.push(input);
      throw new Error("SHOULD_NOT_BE_CALLED");
    },
  };
  const ctl = new AppController(auth as any, {} as any, sources as any, {} as any, support as any);
  return { ctl, auditCalls, savedBodies };
}

const clientA = { side: "client", userId: "aaaa1111-0000-0000-0000-000000000001", role: "owner", authType: "session", organizationId: "org-a", tenantId: "tenant-a", permissions: [] };
const clientB = { side: "client", userId: "bbbb2222-0000-0000-0000-000000000002", role: "owner", authType: "session", organizationId: "org-b", tenantId: "tenant-b", permissions: [] };
const adminCtx = { side: "admin", userId: "11111111-1111-1111-1111-111111111111", role: "super_admin", authType: "session", permissions: [] };

test("isolation: Client A and Client B see the SAME intentional global config", async () => {
  const a = makeController(clientA);
  const b = makeController(clientB);
  const ra = fakeRes(), rb = fakeRes();
  const outA: any = await a.ctl.getSupportClientConfig(fakeReq(), ra);
  const outB: any = await b.ctl.getSupportClientConfig(fakeReq(), rb);
  const { updatedAt: _ua, ...stableA } = outA.data;
  const { updatedAt: _ub, ...stableB } = outB.data;
  assert.deepEqual(stableA, stableB, "global config (excluding volatile updatedAt) must be identical for all clients");
  assert.equal(outA.data.telegram.url, "https://t.me/vos_support_bot");
});

test("isolation: client cannot PUT support config (403)", async () => {
  const { ctl, auditCalls } = makeController(clientA);
  const res = fakeRes();
  await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "hacker_bot" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 403);
  assert.equal(auditCalls.length, 0);
});

test("isolation: unauthenticated GET /support/config -> 401", async () => {
  const { ctl } = makeController(undefined);
  const res = fakeRes();
  const out: any = await ctl.getSupportClientConfig(fakeReq(), res);
  assert.equal(res.code, 401);
  assert.equal(out.error.code, "UNAUTHENTICATED");
});

test("security: XSS payload in telegram.handle rejected 400 and never stored", async () => {
  const { ctl, savedBodies, auditCalls } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.putSupportSettings(
    { enabled: true, telegram: { enabled: true, handle: "<script>alert(1)</script>" }, teams: { enabled: false, id: "" } },
    fakeReq(), res
  );
  assert.equal(res.code, 400);
  assert.equal(out.error.code, "VALIDATION_ERROR");
  assert.equal(savedBodies.length, 0, "save must not be reached for XSS payloads");
  assert.equal(auditCalls.length, 0);
});

test("isolation: organization_id query injection is ignored (global config returned)", async () => {
  const { ctl } = makeController(clientA);
  const res = fakeRes();
  const out: any = await ctl.getSupportClientConfig(fakeReq("?organization_id=org-b"), res);
  assert.equal(out.ok, true);
  assert.equal(out.data.telegram.url, "https://t.me/vos_support_bot");
});
