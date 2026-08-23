import test from "node:test";
import assert from "node:assert/strict";
import { AppController } from "../app.controller.js";
import { buildSupportConfigData, defaultSupportConfig } from "@vos/shared";

function fakeRes() {
  const r: any = { code: 0 };
  r.status = (c: number) => { r.code = c; return r; };
  r.header = () => r;
  return r;
}
function fakeReq() {
  return { headers: {}, ip: "10.0.0.9", url: "/api/v1/x", query: {} } as any;
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
    getSupportConfig: async () => defaultSupportConfig(),
    saveSupportConfig: async (input: any, actor: string) => {
      savedBodies.push(input);
      return buildSupportConfigData(input, null, actor);
    },
  };
  const ctl = new AppController(auth as any, {} as any, sources as any, {} as any, support as any);
  return { ctl, auditCalls, savedBodies };
}

const adminCtx = { side: "admin", userId: "11111111-1111-1111-1111-111111111111", role: "super_admin", authType: "session", permissions: [] };
const readOnlyAdminCtx = { side: "admin", userId: "33333333-3333-3333-3333-333333333333", role: "read_only_admin", authType: "session", permissions: [] };
const billingCtx = { side: "admin", userId: "44444444-4444-4444-4444-444444444444", role: "billing", authType: "session", permissions: [] };
const clientCtx = { side: "client", userId: "22222222-2222-2222-2222-222222222222", role: "owner", authType: "session", permissions: [] };

test("matrix: both disabled with empty handles succeeds", async () => {
  const { ctl } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.putSupportSettings({ enabled: false, telegram: { enabled: false, handle: "" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 0);
  assert.equal(out.ok, true);
});

test("matrix: handle 'a' too short -> 400 telegram.handle", async () => {
  const { ctl, auditCalls } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "a" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 400);
  assert.equal(out.error.details.fields[0].field, "telegram.handle");
  assert.equal(auditCalls.length, 0);
});

test("matrix: 33-char handle -> 400", async () => {
  const { ctl } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "a".repeat(33) }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 400);
  assert.equal(out.error.code, "VALIDATION_ERROR");
});

test("matrix: javascript:alert -> 400", async () => {
  const { ctl } = makeController(adminCtx);
  const res = fakeRes();
  await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "javascript:alert" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 400);
});

test("matrix: ' @My_Bot_123 ' trims to My_Bot_123 and builds https://t.me/My_Bot_123", async () => {
  const { ctl, savedBodies } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.putSupportSettings(
    { enabled: true, telegram: { enabled: true, handle: " @My_Bot_123 " }, teams: { enabled: false, id: "" } },
    fakeReq(), res
  );
  assert.equal(res.code, 0);
  assert.equal(savedBodies[0].telegram.handle, " @My_Bot_123 ");
  assert.equal(out.data.telegram.handle, "My_Bot_123");
  assert.equal(out.data.telegram.url, "https://t.me/My_Bot_123");
});

test("matrix: Teams 'Support@Example.COM' percent-encodes @ preserving case", async () => {
  const { ctl } = makeController(adminCtx);
  const res = fakeRes();
  const out: any = await ctl.putSupportSettings(
    { enabled: true, telegram: { enabled: false, handle: "" }, teams: { enabled: true, id: "Support@Example.COM" } },
    fakeReq(), res
  );
  assert.equal(res.code, 0);
  assert.equal(out.data.teams.url, "https://teams.microsoft.com/l/chat/0/0?users=Support%40Example.COM");
});

test("rbac: read_only_admin PUT -> 403 and no audit row", async () => {
  const { ctl, auditCalls } = makeController(readOnlyAdminCtx);
  const res = fakeRes();
  const out: any = await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "my_bot" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 403);
  assert.equal(out.error.code, "FORBIDDEN");
  assert.equal(auditCalls.length, 0);
});

test("rbac: billing admin PUT -> 403 and no audit row", async () => {
  const { ctl, auditCalls } = makeController(billingCtx);
  const res = fakeRes();
  await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "my_bot" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 403);
  assert.equal(auditCalls.length, 0);
});

test("rbac: client session PUT -> 403 (side gate)", async () => {
  const { ctl, auditCalls } = makeController(clientCtx);
  const res = fakeRes();
  await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "my_bot" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(res.code, 403);
  assert.equal(auditCalls.length, 0);
});

test("audit increments only on success across mixed attempts", async () => {
  const { ctl, auditCalls } = makeController(adminCtx);
  const res = fakeRes();
  await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "bad handle!" }, teams: { enabled: false, id: "" } }, fakeReq(), res);
  assert.equal(auditCalls.length, 0);
  await ctl.putSupportSettings({ enabled: true, telegram: { enabled: true, handle: "my_bot" }, teams: { enabled: true, id: "support@example.com" } }, fakeReq(), res);
  assert.equal(auditCalls.length, 1);
  assert.equal(auditCalls[0][3], "support_config");
});
