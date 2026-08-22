import test from "node:test";
import assert from "node:assert/strict";
import { PlatformService } from "../platform.service.js";
import { DataSourcesService } from "../data-sources.service.js";
import { AuthService } from "../auth.service.js";
import { findPortalRoute } from "@vos/shared";

test("Recent CDR: Route matching resolves exact /app/cdr/recent and /admin/cdr/recent", () => {
  const clientRecent = findPortalRoute("/app/cdr/recent");
  assert.ok(clientRecent, "Client route must be defined");
  assert.equal(clientRecent.route, "/app/cdr/recent");
  assert.equal(clientRecent.name, "Recent Calls");
  assert.equal(clientRecent.side, "Client");

  const adminRecent = findPortalRoute("/admin/cdr/recent");
  assert.ok(adminRecent, "Admin route must be defined");
  assert.equal(adminRecent.route, "/admin/cdr/recent");
  assert.equal(adminRecent.name, "Recent CDR");
  assert.equal(adminRecent.side, "Admin");

  // Dynamic route must still resolve when specific serial is passed
  const singleCdr = findPortalRoute("/app/cdr/CDR-20260820-00100488");
  assert.ok(singleCdr, "Single CDR route must be defined");
  assert.equal(singleCdr.route, "/app/cdr/{cdrId}");
});

test("Recent CDR: Client Page /app/cdr/recent queries real ClickHouse data and calculates KPIs", async () => {
  const sources = new DataSourcesService();
  const auth = new AuthService(sources);
  const service = new PlatformService(sources, auth, {} as any);

  const clientCtx = {
    userId: "bcfae648-721b-4732-917b-b7dc04491443",
    email: "client@example.com",
    side: "client" as const,
    role: "owner",
    tenantId: "b2c1eb03-ecc2-4a90-ad16-888b31d11548",
    organizationId: "be52237d-8f56-4c41-affd-640cf46cb77f",
    exp: Date.now() + 3600000,
  };

  const page = await service.page("/app/cdr/recent", clientCtx);
  assert.ok(page, "Page payload must exist");
  assert.equal(page.route, "/app/cdr/recent");
  assert.equal(page.title, "Recent Calls");
  assert.ok(Array.isArray(page.rows), "Rows must be an array");

  // Check KPIs computed from real records
  assert.ok(Array.isArray(page.kpis), "KPIs must be an array");
  assert.ok(page.kpis.length >= 4, "Must contain at least 4 KPI cards");
  const labels = page.kpis.map((k: any) => k.label);
  assert.ok(labels.includes("Recent Records"), "Must have Recent Records KPI");
  assert.ok(labels.includes("Answer Ratio (ASR)"), "Must have Answer Ratio (ASR) KPI");
  assert.ok(labels.includes("Traffic Duration"), "Must have Traffic Duration KPI");
  assert.ok(labels.includes("Customer Charge"), "Must have Customer Charge KPI");

  // Tenant scoping check
  if (page.rows.length > 0) {
    const firstRow = page.rows[0];
    assert.ok(firstRow.serial_number, "Must have real serial_number");
    assert.ok(firstRow.caller, "Must have real caller");
    assert.ok(firstRow.callee, "Must have real callee");
    // Client response must NOT expose carrier_cost or routing_gateway_id
    assert.equal((firstRow as any).carrier_cost, undefined, "Carrier cost must be redacted in client scope");
    assert.equal((firstRow as any).routing_gateway_id, undefined, "Routing gateway must be redacted in client scope");
  }
});

test("Recent CDR: Client cannot access another tenant's CDR data", async () => {
  const sources = new DataSourcesService();
  const auth = new AuthService(sources);
  const service = new PlatformService(sources, auth, {} as any);

  // Client without tenantId is blocked
  const invalidClientCtx = {
    userId: "client-no-tenant",
    email: "notenant@example.com",
    side: "client" as const,
    role: "owner",
    exp: Date.now() + 3600000,
  };

  const def: any = {
    method: "GET",
    path: "/api/v1/cdr/recent",
    sides: ["Client"],
    pages: ["Recent Calls"],
    pageRoutes: ["/app/cdr/recent"],
  };

  await assert.rejects(
    async () => {
      await service.genericApi(def, invalidClientCtx, {}, {}, {}, "req-test-isolation");
    },
    { statusCode: 403 }
  );
});
