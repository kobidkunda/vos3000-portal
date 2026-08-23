import test from "node:test";
import assert from "node:assert/strict";
import { SupportService } from "../support/support.service.js";

function fakePg(initialRows: any[] = [], throwOnQuery = false) {
  let rows = initialRows;
  const calls: Array<{ sql: string; params: any[] }> = [];
  return {
    calls,
    __setRows(r: any[]) { rows = r; },
    async query(sql: string, params: any[] = []) {
      if (throwOnQuery) throw new Error("connection refused");
      calls.push({ sql, params });
      return { rowCount: rows.length, rows };
    },
  };
}

function fakeRedis(opts: { failGet?: boolean } = {}) {
  const store = new Map<string, string>();
  const log: string[] = [];
  return {
    store,
    log,
    isOpen: true,
    async get(k: string) {
      if (opts.failGet) throw new Error("redis down");
      log.push(`get:${k}`);
      return store.get(k) ?? null;
    },
    async set(k: string, v: string, _o?: any) {
      log.push(`set:${k}`);
      store.set(k, v);
    },
    async del(k: string) {
      log.push(`del:${k}`);
      store.delete(k);
    },
  };
}

test("demo mode (no pg/redis) returns default support config", async () => {
  const svc = new SupportService({} as any);
  const cfg = await svc.getSupportConfig();
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.telegram.url, "");
  assert.equal(cfg.teams.url, "");
});

test("row missing in PG returns default and populates Redis cache", async () => {
  const pg = fakePg([]);
  const redis = fakeRedis();
  const svc = new SupportService({ pg, redis } as any);
  const cfg = await svc.getSupportConfig();
  assert.equal(cfg.enabled, false);
  assert.equal(pg.calls.length, 1);
  assert.ok(pg.calls[0].sql.includes("resource_type = 'support_config'"));
  assert.ok(redis.log.includes("set:support:config"));
});

test("save then get round-trips through portal_resources and invalidates Redis", async () => {
  const pg = fakePg();
  const redis = fakeRedis();
  const svc = new SupportService({ pg, redis } as any);
  const saved = await svc.saveSupportConfig(
    { enabled: true, label: "Help desk", telegram: { enabled: true, handle: "@my_bot" }, teams: { enabled: true, id: "support@example.com" } },
    "11111111-1111-1111-1111-111111111111"
  );
  assert.equal(saved.telegram.handle, "my_bot");
  assert.equal(saved.telegram.url, "https://t.me/my_bot");

  const insert = pg.calls.find((c) => c.sql.includes("INSERT INTO portal_resources"));
  assert.ok(insert, "INSERT must target portal_resources");
  assert.ok(insert.sql.includes("ON CONFLICT (organization_id, resource_type, resource_key)"));
  const payload = JSON.parse(insert.params[0]);
  assert.equal(payload.telegram.handle, "my_bot");
  assert.equal(insert.params[1], "11111111-1111-1111-1111-111111111111");
  assert.ok(redis.log.includes("del:support:config"), "cache must be invalidated on save");

  pg.__setRows([{ data: saved }]);
  const got = await svc.getSupportConfig();
  assert.equal(got.enabled, true);
  assert.equal(got.teams.url, "https://teams.microsoft.com/l/chat/0/0?users=support%40example.com");
});

test("non-uuid actor is stored as NULL updated_by", async () => {
  const pg = fakePg();
  const svc = new SupportService({ pg, redis: fakeRedis() } as any);
  await svc.saveSupportConfig(
    { enabled: false, telegram: { enabled: false, handle: "" }, teams: { enabled: false, id: "" } },
    "system"
  );
  const insert = pg.calls.find((c) => c.sql.includes("INSERT INTO portal_resources"));
  assert.ok(insert);
  assert.equal(insert.params[1], null);
});

test("Redis cache hit serves without touching PostgreSQL", async () => {
  const cached = { enabled: true, telegram: { enabled: false, handle: "", url: "" }, teams: { enabled: false, id: "", url: "" }, updatedAt: new Date().toISOString(), updatedBy: "system" };
  const redis = fakeRedis();
  redis.store.set("support:config", JSON.stringify(cached));
  const pg = fakePg();
  const svc = new SupportService({ pg, redis } as any);
  const got = await svc.getSupportConfig();
  assert.equal(got.enabled, true);
  assert.equal(pg.calls.length, 0);
});

test("Redis failure falls back to DB without throwing", async () => {
  const row = { data: { enabled: true, telegram: { enabled: true, handle: "my_bot", url: "https://t.me/my_bot" }, teams: { enabled: false, id: "", url: "" }, updatedAt: new Date().toISOString(), updatedBy: "u" } };
  const pg = fakePg([row]);
  const redis = fakeRedis({ failGet: true });
  const svc = new SupportService({ pg, redis } as any);
  const got = await svc.getSupportConfig();
  assert.equal(got.enabled, true);
  assert.equal(got.telegram.url, "https://t.me/my_bot");
});

test("PG failure on read fails closed with DEGRADED 503", async () => {
  const pg = fakePg([], true);
  const svc = new SupportService({ pg, redis: fakeRedis() } as any);
  await assert.rejects(
    () => svc.getSupportConfig(),
    (e: any) => e.code === "DEGRADED" && e.statusCode === 503
  );
});

test("invalid body throws VALIDATION_ERROR with field details", async () => {
  const svc = new SupportService({ pg: fakePg(), redis: fakeRedis() } as any);
  await assert.rejects(
    () => svc.saveSupportConfig({ enabled: true, telegram: { enabled: true, handle: "javascript:x" }, teams: { enabled: false, id: "" } }, "u"),
    (e: any) => e.code === "VALIDATION_ERROR" && e.details?.[0]?.field === "telegram.handle"
  );
});
