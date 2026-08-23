import test from "node:test";
import assert from "node:assert/strict";
import { AppController } from "../app.controller.js";

function fakeRes() {
  const r: any = { code: 0 };
  r.status = (c: number) => { r.code = c; return r; };
  r.header = () => r;
  return r;
}
function fakeReq() {
  return { headers: {}, ip: "10.0.0.1", url: "/api/v1/x", query: {} } as any;
}

function makeController(ctx: any) {
  const auditCalls: any[][] = [];
  const auth = {
    resolveContext: async () => ctx,
    tokenFromHeaders: () => ({ source: "bearer" }),
  };
  const sources = { audit: async (...a: any[]) => { auditCalls.push(a); } };
  const support = {
    getSupportConfig: async () => ({
      enabled: false, label: "",
      telegram: { enabled: false, handle: "", url: "" },
      teams: { enabled: false, id: "", url: "" },
      updatedAt: "2026-08-23T00:00:00.000Z", updatedBy: "system",
    }),
    saveSupportConfig: async () => ({
      enabled: true, label: undefined,
      telegram: { enabled: true, handle: "my_bot", url: "https://t.me/my_bot" },
      teams: { enabled: true, id: "support@example.com", url: "https://teams.microsoft.com/l/chat/0/0?users=support%40example.com" },
      updatedAt: "2026-08-23T01:00:00.000Z", updatedBy: "11111111-1111-1111-1111-111111111111",
    }),
  };
  const ctl = new AppController(auth as any, {} as any, sources as any, {} as any, support as any);
  return { ctl, auditCalls };
}

const adminCtx = { side: "admin", userId: "11111111-1111-1111-1111-111111111111", role: "super_admin", authType: "session", permissions: [] };
const clientCtx = { side: "client", userId: "22222222-2222-2222-2222-222222222222", role: "owner", authType: "session", permissions: [] };

test("GET admin/settings/support requires authentication", async () => {
  const { ctl } = makeController(undefined);
  const res = fakeRes();
  const out: any = await ctl.getSupportSettings(fakeReq(), res);
  assert.equal(res.code, 401);
  assert.equal(out.error.code, "UNAUTHENTICATED");
});

test("GET admin/settings/support rejects client sessions with 403", async () => {
  const { ctl } = makeController(clientCtx);
  const res = fakeRes();
  const out: any = await ctl.getSupportSettings(fakeReq(), res);
  assert.equal(res.code, 403);
  assert.equal(out.error.code, "FORBIDDEN");
});

test("admin GET returns config payload", async () => {
  const { ctl } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.getSupportSettings(fakeReq(), res);
  assert.equal(res.code, 0);
  assert.equal(out.ok, true);
  assert.equal(out.data.enabled, false);
});

test("admin PUT valid body saves and writes audit row", async () => {
  const { ctl, auditCalls } = makeController(adminCtx);
  const res = fakeRes();
  const body = { enabled: true, telegram: { enabled: true, handle: "@my_bot" }, teams: { enabled: true, id: "support@example.com" } };
  const out: any = await ctl.putSupportSettings(body, fakeReq(), res);
  assert.equal(res.code, 0);
  assert.equal(out.ok, true);
  assert.equal(out.data.telegram.url, "https://t.me/my_bot");
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0][2], "PUT /api/v1/admin/settings/support");
  assert.equal(auditCalls[0][3], "support_config");
  assert.equal(auditCalls[0][4], "global");
});

test("admin PUT invalid handle returns 400 VALIDATION_ERROR without audit", async () => {
  const { ctl, auditCalls } = makeController(adminCtx);
  const res = fakeRes();
  const body = { enabled: true, telegram: { enabled: true, handle: "javascript:evil" }, teams: { enabled: false, id: "" } };
  const out: any = await ctl.putSupportSettings(body, fakeReq(), res);
  assert.equal(res.code, 400);
  assert.equal(out.error.code, "VALIDATION_ERROR");
  assert.equal(out.error.details.fields[0].field, "telegram.handle");
  assert.equal(auditCalls.length, 0);
});

test("client GET support/config returns URL-only projection", async () => {
  const { ctl } = makeController(clientCtx);
  const res = fakeRes();
  const out: any = await ctl.getSupportClientConfig(fakeReq(), res);
  assert.equal(out.ok, true);
  assert.ok(!("handle" in out.data.telegram));
  assert.ok(!("id" in out.data.teams));
  assert.ok(!("updatedBy" in out.data));
  assert.equal(out.data.telegram.url, "");
});

test("client GET support/config rejects admin sessions with 403", async () => {
  const { ctl } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.getSupportClientConfig(fakeReq(), res);
  assert.equal(res.code, 403);
  assert.equal(out.error.code, "FORBIDDEN");
});
