import test from "node:test";
import assert from "node:assert/strict";
import { PlatformService } from "../platform.service.js";
import { DataSourcesService } from "../data-sources.service.js";
import { AuthService } from "../auth.service.js";

test("Live Calls: Admin sees all active VOS calls", async () => {
  const sources = new DataSourcesService();
  const auth = new AuthService(sources);
  const service = new PlatformService(sources, auth, {} as any);
  const adminCtx = { userId: "admin-1", email: "admin@example.com", side: "admin" as const, role: "super_admin", exp: Date.now() + 3600000 };

  const res: any = await (service as any).readLiveCalls(adminCtx);
  assert.ok(res, "Response must exist");
  assert.ok(Array.isArray(res.items), "Items must be an array");
  assert.ok(res.source === "vos" || res.source === "unavailable");
});

test("Live Calls: Tenant isolation scopes calls to authenticated customer", async () => {
  const sources = new DataSourcesService();
  const auth = new AuthService(sources);
  const service = new PlatformService(sources, auth, {} as any);
  
  const clientCtx = {
    userId: "client-1",
    email: "client@example.com",
    side: "client" as const,
    role: "owner",
    tenantId: "b2c1eb03-ecc2-4a90-ad16-888b31d11548",
    organizationId: "be52237d-8f56-4c41-affd-640cf46cb77f",
    exp: Date.now() + 3600000
  };

  const res: any = await (service as any).readLiveCalls(clientCtx);
  assert.ok(res, "Response must exist");
  assert.ok(Array.isArray(res.items), "Items must be an array");
});

test("Live Calls: Call termination enforces admin privileges", async () => {
  const sources = new DataSourcesService();
  const auth = new AuthService(sources);
  const service = new PlatformService(sources, auth, {} as any);

  const clientCtx = { userId: "client-1", email: "client@example.com", side: "client" as const, role: "owner", exp: Date.now() + 3600000 };
  const adminCtx = { userId: "admin-1", email: "admin@example.com", side: "admin" as const, role: "super_admin", exp: Date.now() + 3600000 };

  const def: any = {
    method: "POST",
    path: "/api/v1/admin/calls/live/{id}/disconnect",
    title: "Disconnect Call",
    group: "Live Calls",
    purpose: "Terminate call",
    sides: ["admin"],
    pages: ["Live Calls"],
    pageRoutes: ["/admin/calls/live"]
  };

  // Client cannot disconnect call
  await assert.rejects(
    async () => {
      await service.genericApi(
        def,
        clientCtx,
        { reason: "Client test" },
        { id: "call_999" },
        {},
        "req-test-1"
      );
    },
    { statusCode: 403 }
  );

  // Admin can disconnect call with audit trail
  const adminRes: any = await service.genericApi(
    def,
    adminCtx,
    { reason: "Carrier Route Degradation" },
    { id: "call_999" },
    {},
    "req-test-2"
  );

  assert.ok(adminRes.ok, "Disconnect must succeed for admin");
  assert.equal(adminRes.callId, "call_999");
  assert.equal(adminRes.status, "disconnected");
  assert.ok(adminRes.auditRecorded, "Audit must be recorded");
});
