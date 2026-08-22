import test from "node:test";
import assert from "node:assert/strict";
import { DataSourcesService } from "../data-sources.service.js";
import { AuthService } from "../auth.service.js";
import { RatesController } from "../rates.controller.js";
import { RateManagementService } from "../rate-management.service.js";
import { authorizeProductApi } from "../access-policy.js";
import type { AuthContext } from "@vos/shared";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createReq(headers: Record<string, string> = {}, url: string = "/api/v1/admin/rates/groups") {
  return {
    headers,
    ip: "127.0.0.1",
    url,
  } as any;
}

function createRes() {
  let code = 200;
  return {
    status(s: number) {
      code = s;
      return this;
    },
    statusCode() {
      return code;
    },
  } as any;
}

function assertErrorEnvelope(resBody: any, expectedStatus: number, resMock: any, codePrefix?: string) {
  assert.equal(resBody.ok, false, "Envelope ok must be false");
  assert.equal(resMock.statusCode(), expectedStatus, `Expected HTTP status ${expectedStatus} but got ${resMock.statusCode()}`);
  assert.ok(typeof resBody.request_id === "string", "request_id must be a string");
  assert.match(resBody.request_id, UUID_REGEX, "request_id must be a valid UUID");
  assert.ok(resBody.error, "Envelope must contain error object");
  assert.ok(typeof resBody.error.code === "string", "error.code must be a string");
  assert.ok(typeof resBody.error.message === "string", "error.message must be a string");
  if (codePrefix) {
    assert.ok(
      resBody.error.code.includes(codePrefix),
      `Expected error code to include ${codePrefix}, got ${resBody.error.code}`
    );
  }
}

// ============================================================================
// Adversarial Challenge Suite 1: Unauthorized Client Access & RBAC Boundaries
// ============================================================================

test("CHALLENGE-SEC-01: All Admin Rate Endpoints Reject Unauthenticated Requests (401)", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const fakeId = "c1a2b3c4-0000-0000-0000-000000000001";
  const emptyHeaders = {};

  // 1. GET /api/v1/admin/rates/groups
  const r1 = createRes();
  const res1 = await controller.listRateGroups(createReq(emptyHeaders), r1);
  assertErrorEnvelope(res1, 401, r1, "UNAUTHENTICATED");

  // 2. POST /api/v1/admin/rates/groups
  const r2 = createRes();
  const res2 = await controller.createRateGroup({ name: "Hacker Group" }, createReq(emptyHeaders), r2);
  assertErrorEnvelope(res2, 401, r2, "UNAUTHENTICATED");

  // 3. GET /api/v1/admin/rates/groups/:id
  const r3 = createRes();
  const res3 = await controller.getRateGroupDetail(fakeId, createReq(emptyHeaders), r3);
  assertErrorEnvelope(res3, 401, r3, "UNAUTHENTICATED");

  // 4. PATCH /api/v1/admin/rates/groups/:id
  const r4 = createRes();
  const res4 = await controller.updateRateGroup(fakeId, { name: "Hijacked" }, createReq(emptyHeaders), r4);
  assertErrorEnvelope(res4, 401, r4, "UNAUTHENTICATED");

  // 5. DELETE /api/v1/admin/rates/groups/:id
  const r5 = createRes();
  const res5 = await controller.deleteRateGroup(fakeId, createReq(emptyHeaders), r5);
  assertErrorEnvelope(res5, 401, r5, "UNAUTHENTICATED");

  // 6. POST /api/v1/admin/rates/groups/:id/duplicate
  const r6 = createRes();
  const res6 = await controller.duplicateRateGroup(fakeId, { new_name: "Dup" }, createReq(emptyHeaders), r6);
  assertErrorEnvelope(res6, 401, r6, "UNAUTHENTICATED");

  // 7. GET /api/v1/admin/rates/groups/:id/rates
  const r7 = createRes();
  const res7 = await controller.listGroupRates(fakeId, createReq(emptyHeaders), r7);
  assertErrorEnvelope(res7, 401, r7, "UNAUTHENTICATED");

  // 8. POST /api/v1/admin/rates/groups/:id/rates
  const r8 = createRes();
  const res8 = await controller.createGroupRate(fakeId, { prefix: "1", rate_per_minute: 0.01 }, createReq(emptyHeaders), r8);
  assertErrorEnvelope(res8, 401, r8, "UNAUTHENTICATED");

  // 9. PATCH /api/v1/admin/rates/groups/:id/rates/:rateId
  const r9 = createRes();
  const res9 = await controller.updateGroupRate(fakeId, "101", { rate_per_minute: 0.02 }, createReq(emptyHeaders), r9);
  assertErrorEnvelope(res9, 401, r9, "UNAUTHENTICATED");

  // 10. DELETE /api/v1/admin/rates/groups/:id/rates/:rateId
  const r10 = createRes();
  const res10 = await controller.deleteGroupRate(fakeId, "101", createReq(emptyHeaders), r10);
  assertErrorEnvelope(res10, 401, r10, "UNAUTHENTICATED");

  // 11. POST /api/v1/admin/rates/groups/:id/bulk-adjust
  const r11 = createRes();
  const res11 = await controller.bulkAdjustRates(fakeId, { adjustment_type: "percentage", value: 10 }, createReq(emptyHeaders), r11);
  assertErrorEnvelope(res11, 401, r11, "UNAUTHENTICATED");

  // 12. POST /api/v1/admin/rates/imports/preview
  const r12 = createRes();
  const res12 = await controller.previewRateImport({ rate_group_id: fakeId, file_content: "1,US,0.01" }, createReq(emptyHeaders), r12);
  assertErrorEnvelope(res12, 401, r12, "UNAUTHENTICATED");

  // 13. POST /api/v1/admin/rates/imports/process
  const r13 = createRes();
  const res13 = await controller.processRateImport({ rate_group_id: fakeId, file_content: "1,US,0.01" }, createReq(emptyHeaders), r13);
  assertErrorEnvelope(res13, 401, r13, "UNAUTHENTICATED");

  // 14. GET /api/v1/admin/rates/imports/history
  const r14 = createRes();
  const res14 = await controller.getRateImportHistory(createReq(emptyHeaders), r14);
  assertErrorEnvelope(res14, 401, r14, "UNAUTHENTICATED");

  // 15. POST /api/v1/admin/rates/lookup
  const r15 = createRes();
  const res15 = await controller.adminRateLookup({ destination: "+14155552671" }, createReq(emptyHeaders), r15);
  assertErrorEnvelope(res15, 401, r15, "UNAUTHENTICATED");

  // 16. POST /api/v1/admin/rates/snapshots/:id/rollback
  const r16 = createRes();
  const res16 = await controller.rollbackRateSnapshot(fakeId, createReq(emptyHeaders), r16);
  assertErrorEnvelope(res16, 401, r16, "UNAUTHENTICATED");
});

test("CHALLENGE-SEC-02: All Admin Rate Endpoints Reject Authenticated Client Sessions (403 Forbidden)", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const clientLogin = await auth.login("client@example.com", "Client123!", "client", { ip: "127.0.0.1" });
  assert.ok(clientLogin && "token" in clientLogin);
  const clientHeaders = {
    authorization: `Bearer ${clientLogin.token}`,
    origin: "http://localhost:3000",
  };

  const fakeId = "c1a2b3c4-0000-0000-0000-000000000001";

  // Test across all 16 admin endpoints with client session:
  const endpoints = [
    () => controller.listRateGroups(createReq(clientHeaders), createRes()),
    () => controller.createRateGroup({ name: "Hacker Group" }, createReq(clientHeaders), createRes()),
    () => controller.getRateGroupDetail(fakeId, createReq(clientHeaders), createRes()),
    () => controller.updateRateGroup(fakeId, { name: "Hijacked" }, createReq(clientHeaders), createRes()),
    () => controller.deleteRateGroup(fakeId, createReq(clientHeaders), createRes()),
    () => controller.duplicateRateGroup(fakeId, { new_name: "Dup" }, createReq(clientHeaders), createRes()),
    () => controller.listGroupRates(fakeId, createReq(clientHeaders), createRes()),
    () => controller.createGroupRate(fakeId, { prefix: "1", rate_per_minute: 0.01 }, createReq(clientHeaders), createRes()),
    () => controller.updateGroupRate(fakeId, "101", { rate_per_minute: 0.02 }, createReq(clientHeaders), createRes()),
    () => controller.deleteGroupRate(fakeId, "101", createReq(clientHeaders), createRes()),
    () => controller.bulkAdjustRates(fakeId, { adjustment_type: "percentage", value: 10 }, createReq(clientHeaders), createRes()),
    () => controller.previewRateImport({ rate_group_id: fakeId, file_content: "1,US,0.01" }, createReq(clientHeaders), createRes()),
    () => controller.processRateImport({ rate_group_id: fakeId, file_content: "1,US,0.01" }, createReq(clientHeaders), createRes()),
    () => controller.getRateImportHistory(createReq(clientHeaders), createRes()),
    () => controller.adminRateLookup({ destination: "+14155552671" }, createReq(clientHeaders), createRes()),
    () => controller.rollbackRateSnapshot(fakeId, createReq(clientHeaders), createRes()),
  ];

  for (let i = 0; i < endpoints.length; i++) {
    const res = await endpoints[i]();
    assert.equal(res.ok, false, `Endpoint index ${i} must return ok: false for client`);
    assert.equal((res as any).error?.code, "FORBIDDEN", `Endpoint index ${i} must reject client with FORBIDDEN code`);
    assert.match(res.request_id, UUID_REGEX, `Endpoint index ${i} must have stable UUID request_id`);
  }
});

test("CHALLENGE-SEC-03: RBAC Privilege Matrix Verification Across Admin Roles", () => {
  const roles = [
    { role: "super_admin", canRead: true, canWrite: true },
    { role: "commercial", canRead: true, canWrite: true },
    { role: "billing", canRead: true, canWrite: false },
    { role: "read_only_admin", canRead: true, canWrite: false },
    { role: "noc", canRead: false, canWrite: false },
    { role: "support", canRead: false, canWrite: false },
    { role: "security_admin", canRead: false, canWrite: false },
  ];

  const adminReadDef = { method: "GET", path: "/api/v1/admin/rates/groups", sides: ["Admin"] } as any;
  const adminWriteDef = { method: "POST", path: "/api/v1/admin/rates/groups", sides: ["Admin"] } as any;

  for (const { role, canRead, canWrite } of roles) {
    const ctx: AuthContext = {
      userId: `user-${role}`,
      email: `${role}@example.com`,
      side: "admin",
      role,
      organizationId: "org-1",
      exp: Date.now() + 3600000,
    };

    const readDecision = authorizeProductApi(ctx, adminReadDef);
    assert.equal(
      readDecision.ok,
      canRead,
      `Role ${role} read permission mismatch: expected ${canRead}, got ${readDecision.ok}`
    );

    const writeDecision = authorizeProductApi(ctx, adminWriteDef);
    assert.equal(
      writeDecision.ok,
      canWrite,
      `Role ${role} write permission mismatch: expected ${canWrite}, got ${writeDecision.ok}`
    );
  }
});

// ============================================================================
// Adversarial Challenge Suite 2: Client Portal Cost & Margin Leak Prevention
// ============================================================================

test("CHALLENGE-LEAK-01: Client Rate Sheet NEVER Leaks Carrier Costs, Margins, or Internal Fields", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const clientLogin = await auth.login("client@example.com", "Client123!", "client", { ip: "127.0.0.1" });
  assert.ok(clientLogin && "token" in clientLogin);
  const clientHeaders = {
    authorization: `Bearer ${clientLogin.token}`,
    origin: "http://localhost:3000",
  };

  const resMock = createRes();
  const response = await controller.clientRateSheet(createReq(clientHeaders, "/api/v1/rates"), resMock);

  assert.equal(response.ok, true);
  assert.ok(response.data);
  assert.ok(Array.isArray(response.data.items));
  assert.ok(response.data.items.length > 0);

  const forbiddenFields = [
    "carrier_rate",
    "carrier_cost",
    "carrier_group_id",
    "cost_per_minute",
    "margin",
    "margin_percentage",
    "margin_amount",
    "rate_spread",
    "cost_spread",
    "supplier",
    "vendor",
    "upstream",
    "internal_memo",
    "secret",
  ];

  for (const item of response.data.items) {
    // Assert allowed customer fields exist
    assert.ok(item.prefix !== undefined, "Item must have prefix");
    assert.ok(item.rate_per_minute !== undefined, "Item must have rate_per_minute");
    assert.ok(item.billing_cycle_seconds !== undefined, "Item must have billing_cycle_seconds");

    // Assert strictly no forbidden fields
    for (const field of forbiddenFields) {
      assert.equal(
        (item as any)[field],
        undefined,
        `SECURITY VIOLATION: Field '${field}' was leaked in client rate response: ${JSON.stringify(item)}`
      );
    }
  }
});

test("CHALLENGE-LEAK-02: Client Destination Rate Lookup Sanitizes Carrier Information", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const clientLogin = await auth.login("client@example.com", "Client123!", "client", { ip: "127.0.0.1" });
  assert.ok(clientLogin && "token" in clientLogin);
  const clientHeaders = {
    authorization: `Bearer ${clientLogin.token}`,
    origin: "http://localhost:3000",
  };

  const resMock = createRes();
  const response = await controller.clientRateLookupGet(
    createReq(clientHeaders, "/api/v1/rates/lookup?number=%2B14155552671"),
    resMock
  );

  assert.equal(response.ok, true);
  assert.ok(response.data);
  assert.ok(Array.isArray(response.data.items));
  assert.equal(response.data.items.length, 1);

  const item = response.data.items[0];
  assert.equal(item.prefix, "1415");
  assert.equal(item.area_name, "USA San Francisco");
  assert.equal(item.rate_per_minute, "0.01500000");

  const forbiddenFields = [
    "carrier_rate",
    "carrier_cost",
    "carrier_rate_group_id",
    "margin",
    "margin_amount",
    "margin_percentage",
    "supplier",
  ];

  for (const field of forbiddenFields) {
    assert.equal(
      (item as any)[field],
      undefined,
      `SECURITY VIOLATION: Field '${field}' was leaked in client rate lookup: ${JSON.stringify(item)}`
    );
  }
});

// ============================================================================
// Adversarial Challenge Suite 3: Malformed UUIDs, Invalid Payloads & Error Envelopes
// ============================================================================

test("CHALLENGE-INPUT-01: Malformed UUID Route Parameters Reject with Stable Error Envelopes", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const adminLogin = await auth.login("admin@example.com", "Admin123!", "admin", { ip: "127.0.0.1" });
  assert.ok(adminLogin && "token" in adminLogin);
  const adminHeaders = {
    authorization: `Bearer ${adminLogin.token}`,
    origin: "http://localhost:3000",
  };

  const malformedIds = [
    "not-a-uuid",
    "12345",
    "../../../admin/secrets",
    "'; DROP TABLE rates; --",
    "00000000-0000-0000-0000-00000000000G", // Invalid hex char 'G'
    "undefined",
    "null",
  ];

  for (const badId of malformedIds) {
    // 1. GET /api/v1/admin/rates/groups/:id
    const r1 = createRes();
    const res1 = await controller.getRateGroupDetail(badId, createReq(adminHeaders), r1);
    assertErrorEnvelope(res1, 400, r1, "VALIDATION_ERROR");

    // 2. PATCH /api/v1/admin/rates/groups/:id
    const r2 = createRes();
    const res2 = await controller.updateRateGroup(badId, { name: "Valid Name" }, createReq(adminHeaders), r2);
    assertErrorEnvelope(res2, 400, r2, "VALIDATION_ERROR");

    // 3. DELETE /api/v1/admin/rates/groups/:id
    const r3 = createRes();
    const res3 = await controller.deleteRateGroup(badId, createReq(adminHeaders), r3);
    assertErrorEnvelope(res3, 400, r3, "VALIDATION_ERROR");

    // 4. POST /api/v1/admin/rates/groups/:id/duplicate
    const r4 = createRes();
    const res4 = await controller.duplicateRateGroup(badId, { new_name: "Dup Group" }, createReq(adminHeaders), r4);
    assertErrorEnvelope(res4, 400, r4, "VALIDATION_ERROR");

    // 5. GET /api/v1/admin/rates/groups/:id/rates
    const r5 = createRes();
    const res5 = await controller.listGroupRates(badId, createReq(adminHeaders), r5);
    assertErrorEnvelope(res5, 400, r5, "VALIDATION_ERROR");

    // 6. POST /api/v1/admin/rates/groups/:id/rates
    const r6 = createRes();
    const res6 = await controller.createGroupRate(badId, { prefix: "1", rate_per_minute: 0.01 }, createReq(adminHeaders), r6);
    assertErrorEnvelope(res6, 400, r6, "VALIDATION_ERROR");

    // 7. POST /api/v1/admin/rates/groups/:id/bulk-adjust
    const r7 = createRes();
    const res7 = await controller.bulkAdjustRates(badId, { adjustment_type: "percentage", value: 5 }, createReq(adminHeaders), r7);
    assertErrorEnvelope(res7, 400, r7, "VALIDATION_ERROR");

    // 8. POST /api/v1/admin/rates/snapshots/:id/rollback
    const r8 = createRes();
    const res8 = await controller.rollbackRateSnapshot(badId, createReq(adminHeaders), r8);
    assertErrorEnvelope(res8, 400, r8, "VALIDATION_ERROR");
  }
});

test("CHALLENGE-INPUT-02: Invalid Body Payloads (Negative rates, empty names, invalid prefixes) Return 400", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const adminLogin = await auth.login("admin@example.com", "Admin123!", "admin", { ip: "127.0.0.1" });
  assert.ok(adminLogin && "token" in adminLogin);
  const adminHeaders = {
    authorization: `Bearer ${adminLogin.token}`,
    origin: "http://localhost:3000",
  };

  const validGroupId = "c1a2b3c4-0000-0000-0000-000000000001";

  // 1. Group creation with empty / blank name
  const r1 = createRes();
  const res1 = await controller.createRateGroup({ name: "   " }, createReq(adminHeaders), r1);
  assertErrorEnvelope(res1, 400, r1, "VALIDATION_ERROR");

  // 2. Duplicate group with missing new_name
  const r2 = createRes();
  const res2 = await controller.duplicateRateGroup(validGroupId, { new_name: "" }, createReq(adminHeaders), r2);
  assertErrorEnvelope(res2, 400, r2, "VALIDATION_ERROR");

  // 3. Create rate with negative rate_per_minute (-0.05)
  const r3 = createRes();
  const res3 = await controller.createGroupRate(
    validGroupId,
    { prefix: "1415", rate_per_minute: -0.05 },
    createReq(adminHeaders),
    r3
  );
  assertErrorEnvelope(res3, 400, r3, "VALIDATION_ERROR");

  // 4. Create rate with non-numeric rate_per_minute ("free")
  const r4 = createRes();
  const res4 = await controller.createGroupRate(
    validGroupId,
    { prefix: "1415", rate_per_minute: "free" },
    createReq(adminHeaders),
    r4
  );
  assertErrorEnvelope(res4, 400, r4, "VALIDATION_ERROR");

  // 5. Create rate with empty prefix / letters only
  const r5 = createRes();
  const res5 = await controller.createGroupRate(
    validGroupId,
    { prefix: "ABC!@#", rate_per_minute: 0.02 },
    createReq(adminHeaders),
    r5
  );
  assertErrorEnvelope(res5, 400, r5, "VALIDATION_ERROR");

  // 6. Update rate with negative rate
  const r6 = createRes();
  const res6 = await controller.updateGroupRate(
    validGroupId,
    "101",
    { rate_per_minute: -1.0 },
    createReq(adminHeaders),
    r6
  );
  assertErrorEnvelope(res6, 400, r6, "VALIDATION_ERROR");

  // 7. Bulk adjust with invalid / NaN value
  const r7 = createRes();
  const res7 = await controller.bulkAdjustRates(
    validGroupId,
    { adjustment_type: "percentage", value: "INVALID_NUM" },
    createReq(adminHeaders),
    r7
  );
  assertErrorEnvelope(res7, 400, r7, "VALIDATION_ERROR");

  // 8. Import preview with empty file_content
  const r8 = createRes();
  const res8 = await controller.previewRateImport(
    { rate_group_id: validGroupId, file_content: "   \n\n  " },
    createReq(adminHeaders),
    r8
  );
  assertErrorEnvelope(res8, 400, r8, "EMPTY_RATE_SHEET");

  // 9. Import process with dirty CSV (all invalid rows)
  const r9 = createRes();
  const res9 = await controller.processRateImport(
    {
      rate_group_id: validGroupId,
      file_content: "Prefix,Rate\nINVALID_PREFIX,-0.05\n,0.01",
    },
    createReq(adminHeaders),
    r9
  );
  assertErrorEnvelope(res9, 400, r9, "VALIDATION_ERROR");

  // 10. Admin rate lookup with empty destination
  const r10 = createRes();
  const res10 = await controller.adminRateLookup(
    { destination: "   " },
    createReq(adminHeaders),
    r10
  );
  assertErrorEnvelope(res10, 400, r10, "VALIDATION_ERROR");
});

// ============================================================================
// Adversarial Challenge Suite 4: Safety Guards & Data Integrity
// ============================================================================

test("CHALLENGE-GUARD-01: Duplicate Rate Group Name Collisions Retain Unique Isolation", async () => {
  const ds = new DataSourcesService();
  const adminCtx: AuthContext = {
    userId: "admin-1",
    email: "admin@example.com",
    side: "admin",
    role: "super_admin",
    organizationId: "org-1",
    exp: Date.now() + 3600000,
  };

  // Create two groups with IDENTICAL names
  const group1 = await ds.createRateGroup(adminCtx, { name: "Standard Retail Tier", side: "customer" });
  const group2 = await ds.createRateGroup(adminCtx, { name: "Standard Retail Tier", side: "customer" });

  assert.ok(group1.id !== group2.id, "Groups with same name must receive distinct UUIDs");

  // Add different rates to each group with same prefix "1"
  await ds.createRate(adminCtx, { rate_group_id: group1.id, prefix: "1", rate_per_minute: "0.01000000" });
  await ds.createRate(adminCtx, { rate_group_id: group2.id, prefix: "1", rate_per_minute: "0.02500000" });

  // Verify group 1 rate
  const rates1 = await ds.listRatesPaginated(adminCtx, group1.id);
  assert.equal(rates1.total, 1);
  assert.equal(rates1.rates[0].rate_per_minute, "0.01000000");

  // Verify group 2 rate
  const rates2 = await ds.listRatesPaginated(adminCtx, group2.id);
  assert.equal(rates2.total, 1);
  assert.equal(rates2.rates[0].rate_per_minute, "0.02500000");

  // Update group 1 prefix "1" to $0.05000000
  await ds.updateRate(adminCtx, group1.id, String(rates1.rates[0].id), { rate_per_minute: "0.05000000" });

  // Ensure group 2 rate remains unchanged at $0.02500000 (strict group isolation)
  const rates2After = await ds.listRatesPaginated(adminCtx, group2.id);
  assert.equal(rates2After.rates[0].rate_per_minute, "0.02500000");
});

test("CHALLENGE-GUARD-02: Snapshot Rollback Rejects Non-Existent and Malformed Snapshot IDs", async () => {
  const ds = new DataSourcesService();
  const adminCtx: AuthContext = {
    userId: "admin-1",
    email: "admin@example.com",
    side: "admin",
    role: "super_admin",
    organizationId: "org-1",
    exp: Date.now() + 3600000,
  };

  // Malformed ID
  await assert.rejects(
    async () => {
      await ds.rollbackRateSnapshot(adminCtx, "invalid-snapshot-id");
    },
    { statusCode: 400, code: "VALIDATION_ERROR" }
  );

  // Valid UUID format but non-existent snapshot
  await assert.rejects(
    async () => {
      await ds.rollbackRateSnapshot(adminCtx, "00000000-0000-0000-0000-999999999999");
    },
    { statusCode: 404, code: "NOT_FOUND" }
  );
});

test("CHALLENGE-GUARD-03: End-to-End Rate Ingestion, Modification, and Snapshot Rollback Cycle", async () => {
  const ds = new DataSourcesService();
  const adminCtx: AuthContext = {
    userId: "admin-1",
    email: "admin@example.com",
    side: "admin",
    role: "super_admin",
    organizationId: "org-1",
    exp: Date.now() + 3600000,
  };

  // 1. Create rate group with initial rate
  const group = await ds.createRateGroup(adminCtx, { name: "Rollback Test Group", side: "customer" });
  await ds.createRate(adminCtx, { rate_group_id: group.id, prefix: "1", rate_per_minute: "0.01000000", area_name: "Original US" });

  // 2. Perform bulk adjust -> creates snapshot A
  const bulkRes = await ds.bulkAdjustRates(adminCtx, group.id, {
    adjustment_type: "percentage",
    value: 50, // +50% -> $0.01500000
  });
  assert.ok(bulkRes.snapshot_id);

  const modifiedRates = await ds.listRatesPaginated(adminCtx, group.id);
  assert.equal(modifiedRates.rates[0].rate_per_minute, "0.015000");

  // 3. Rollback snapshot A
  const rollRes = await ds.rollbackRateSnapshot(adminCtx, bulkRes.snapshot_id);
  assert.equal(rollRes.restored, true);

  // 4. Verify original rate restored
  const restoredRates = await ds.listRatesPaginated(adminCtx, group.id);
  assert.equal(restoredRates.total, 1);
  assert.equal(restoredRates.rates[0].prefix, "1");
  assert.equal(restoredRates.rates[0].rate_per_minute, "0.01000000");
});

// ============================================================================
// Adversarial Challenge Suite 5: CSRF, API Keys & Attached Account Safety
// ============================================================================

test("CHALLENGE-GUARD-04: Attached Customer Accounts Guard Prevents Deletion (409 Conflict)", async () => {
  const ds = new DataSourcesService();
  const adminCtx: AuthContext = {
    userId: "admin-1",
    email: "admin@example.com",
    side: "admin",
    role: "super_admin",
    organizationId: "org-1",
    exp: Date.now() + 3600000,
  };

  const groupId = "c1a2b3c4-0000-0000-0000-000000000001";

  // Simulate PostgreSQL pool where customer account is attached to the rate group
  (ds as any).pg = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes("FROM customers WHERE rate_group_id = $1")) {
        return { rowCount: 1, rows: [{ count: 3 }] }; // 3 attached accounts
      }
      if (sql.includes("DELETE FROM rate_groups")) {
        return { rowCount: 1, rows: [{ id: groupId, name: "Guarded Group", side: "customer" }] };
      }
      return { rowCount: 0, rows: [] };
    },
    connect: async () => ({
      query: async () => ({ rowCount: 0, rows: [] }),
      release: () => {},
    }),
  };

  // Attempt delete -> must be rejected with 409 ATTACHED_ACCOUNTS_CONFLICT
  await assert.rejects(
    async () => {
      await ds.deleteRateGroup(adminCtx, groupId);
    },
    (err: any) => {
      assert.equal(err.statusCode, 409, "Must return HTTP 409 Conflict");
      assert.equal(err.code, "ATTACHED_ACCOUNTS_CONFLICT", "Must return ATTACHED_ACCOUNTS_CONFLICT code");
      assert.ok(err.message.includes("3 attached active customer accounts"), "Must detail attached count");
      return true;
    }
  );

  // When attached customer count is 0, delete must succeed
  (ds as any).pg = {
    query: async (sql: string, params?: any[]) => {
      if (sql.includes("FROM customers WHERE rate_group_id = $1")) {
        return { rowCount: 1, rows: [{ count: 0 }] }; // 0 attached accounts
      }
      if (sql.includes("DELETE FROM rate_groups")) {
        return { rowCount: 1, rows: [{ id: groupId, name: "Guarded Group", side: "customer" }] };
      }
      return { rowCount: 0, rows: [] };
    },
  };

  const deleteRes = await ds.deleteRateGroup(adminCtx, groupId);
  assert.equal(deleteRes.deleted, true);
  assert.equal(deleteRes.name, "Guarded Group");
});

test("CHALLENGE-SEC-04: Client API Keys with Broad Scopes Rejected from Admin Rate Endpoints", () => {
  const apiKeyCtx: AuthContext = {
    userId: "api:key_123",
    email: "apikey@client.com",
    side: "client",
    role: "owner",
    organizationId: "org-client-1",
    authType: "api_key",
    scopes: ["*", "rates:read", "rates:write"],
    exp: Date.now() + 3600000,
  };

  const adminEndpoints = [
    { method: "GET", path: "/api/v1/admin/rates/groups", sides: ["Admin"] },
    { method: "POST", path: "/api/v1/admin/rates/groups", sides: ["Admin"] },
    { method: "PATCH", path: "/api/v1/admin/rates/groups/123", sides: ["Admin"] },
    { method: "DELETE", path: "/api/v1/admin/rates/groups/123", sides: ["Admin"] },
    { method: "POST", path: "/api/v1/admin/rates/imports/process", sides: ["Admin"] },
  ];

  for (const ep of adminEndpoints) {
    const decision = authorizeProductApi(apiKeyCtx, ep as any);
    assert.equal(decision.ok, false, `API key must be rejected from ${ep.method} ${ep.path}`);
    assert.equal(decision.statusCode, 403);
    assert.equal(decision.code, "FORBIDDEN");
  }
});

test("CHALLENGE-SEC-05: Cookie Session CSRF Origin Validation on Rate Mutations", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const adminLogin = await auth.login("admin@example.com", "Admin123!", "admin", { ip: "127.0.0.1" });
  assert.ok(adminLogin && "token" in adminLogin);

  // Cookie-based session token with hostile origin header
  const hostileHeaders = {
    cookie: `vos_session=${adminLogin.token}`,
    origin: "http://evil-attacker.com",
  };

  const r1 = createRes();
  const res1 = await controller.createRateGroup({ name: "CSRF Exploit" }, createReq(hostileHeaders), r1);
  assertErrorEnvelope(res1, 403, r1, "INVALID_ORIGIN");

  const r2 = createRes();
  const res2 = await controller.updateRateGroup("c1a2b3c4-0000-0000-0000-000000000001", { name: "CSRF" }, createReq(hostileHeaders), r2);
  assertErrorEnvelope(res2, 403, r2, "INVALID_ORIGIN");

  const r3 = createRes();
  const res3 = await controller.deleteRateGroup("c1a2b3c4-0000-0000-0000-000000000001", createReq(hostileHeaders), r3);
  assertErrorEnvelope(res3, 403, r3, "INVALID_ORIGIN");
});
