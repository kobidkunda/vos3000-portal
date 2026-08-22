import test from "node:test";
import assert from "node:assert/strict";
import { DataSourcesService } from "../data-sources.service.js";

test("CDR Explorer: Client queries ClickHouse with multi-parameter filters and tenant isolation", async (t) => {
  const service = new DataSourcesService();
  await (service as any).init();

  if (!service.ch) {
    t.skip("ClickHouse not available in test environment");
    return;
  }

  const clientCtx = {
    userId: "test-user-1",
    email: "client@example.com",
    role: "owner",
    side: "client" as const,
    tenantId: "b2c1eb03-ecc2-4a90-ad16-888b31d11548",
    organizationId: "be52237d-8f56-4c41-affd-640cf46cb77f",
    permissions: [],
  };

  // 1. Client query returns customer CDRs without carrier fields
  const results = await service.queryCdr({
    tenantId: clientCtx.tenantId,
    limit: 10,
    requireTenant: true,
    includeCarrierFields: false,
  });

  assert.ok(Array.isArray(results), "Results must be an array");
  const typedResults = results as any[];
  if (typedResults.length > 0) {
    const first = typedResults[0];
    assert.equal(first.customer_id, clientCtx.tenantId, "Record must belong to client tenantId");
    assert.equal("carrier_cost" in first, false, "carrier_cost must be stripped for clients");
    assert.equal("routing_gateway_id" in first, false, "routing_gateway_id must be stripped for clients");
    assert.ok(first.serial_number, "serial_number must be present");
    assert.ok(first.caller, "caller ANI must be present");
    assert.ok(first.callee, "callee DNIS must be present");
  }

  // 2. Status filtering (ANSWERED)
  const answered = (await service.queryCdr({
    tenantId: clientCtx.tenantId,
    status: "ANSWERED",
    limit: 5,
    requireTenant: true,
  })) as any[];
  for (const r of answered) {
    assert.equal(r.answered, 1, "All records must have answered = 1");
  }

  // 3. Search filter by caller ANI or callee
  const searched = (await service.queryCdr({
    tenantId: clientCtx.tenantId,
    search: "+1415",
    limit: 5,
    requireTenant: true,
  })) as any[];
  for (const r of searched) {
    const matches = r.caller.includes("+1415") || r.callee.includes("+1415") || r.serial_number.includes("+1415");
    assert.ok(matches, "Record must match search term");
  }

  // 4. Admin context allows querying all CDRs with carrier fields
  const adminCtx = {
    userId: "admin-user-1",
    email: "admin@example.com",
    role: "super_admin",
    side: "admin" as const,
    organizationId: undefined,
    tenantId: undefined,
    permissions: ["*"],
  };

  const adminResults = await service.queryCdr({
    limit: 5,
    requireTenant: false,
    includeCarrierFields: true,
  });
  const typedAdminResults = adminResults as any[];
  assert.ok(Array.isArray(typedAdminResults), "Admin results must be an array");
  if (typedAdminResults.length > 0) {
    assert.ok("carrier_cost" in typedAdminResults[0], "carrier_cost must be present for admin");
    assert.ok("routing_gateway_id" in typedAdminResults[0], "routing_gateway_id must be present for admin");
  }

  // 5. Tenant Scope Required when accessing client CDR
  await assert.rejects(
    async () => {
      await service.queryCdr({
        requireTenant: true,
        tenantId: undefined,
      });
    },
    (err: any) => err.statusCode === 403 && err.code === "TENANT_SCOPE_REQUIRED",
    "Missing tenant scope on client query must throw 403 TENANT_SCOPE_REQUIRED"
  );

  if (service.pg) await service.pg.end();
  if (service.redis) await (service.redis as any).quit?.();
  if (service.producer) await service.producer.disconnect?.();
});
