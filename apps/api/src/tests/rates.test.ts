import test from "node:test";
import assert from "node:assert/strict";
import { DataSourcesService } from "../data-sources.service.js";
import { AuthService } from "../auth.service.js";
import { RatesController } from "../rates.controller.js";
import { RateManagementService, DecimalUtil, RatePrefixTrie, detectGroupOverlaps } from "../rate-management.service.js";
import { authorizeProductApi } from "../access-policy.js";
import { parseTelecomPhone, getCountryName, normalizeTelecomString, type AuthContext } from "@vos/shared";

const mockAdminCtx = (role: string = "super_admin", userId: string = "00000000-0000-0000-0000-000000000001"): AuthContext => ({
  userId,
  email: "admin@example.com",
  exp: Date.now() + 3600000,
  side: "admin",
  role,
  organizationId: "org-1",
  authType: "session",
});

// ============================================================================
// Tier 1: Unit & Algorithmic Core Logic Tests
// ============================================================================

test("T1-R2-01: Longest-Prefix Matching Algorithm (Radix Trie)", () => {
  const trie = new RatePrefixTrie<{ rate: string; name: string }>();
  trie.insert("1", { rate: "0.00800000", name: "USA" });
  trie.insert("1415", { rate: "0.01500000", name: "US San Francisco" });
  trie.insert("1415555", { rate: "0.02000000", name: "US SF Local" });
  trie.insert("44", { rate: "0.01250000", name: "UK" });
  trie.insert("4420", { rate: "0.01800000", name: "UK London" });

  const match1 = trie.longestPrefixMatch("+14155552671");
  assert.equal(match1?.prefix, "1415555");
  assert.equal(match1?.data.name, "US SF Local");

  const match2 = trie.longestPrefixMatch("14152001234");
  assert.equal(match2?.prefix, "1415");
  assert.equal(match2?.data.name, "US San Francisco");

  const match3 = trie.longestPrefixMatch("19171234567");
  assert.equal(match3?.prefix, "1");
  assert.equal(match3?.data.name, "USA");

  const match4 = trie.longestPrefixMatch("+442071234567");
  assert.equal(match4?.prefix, "4420");
  assert.equal(match4?.data.name, "UK London");

  const match5 = trie.longestPrefixMatch("+441611234567");
  assert.equal(match5?.prefix, "44");
  assert.equal(match5?.data.name, "UK");

  const match6 = trie.longestPrefixMatch("+861012345678");
  assert.equal(match6, null);
});

test("T1-R2-02: Prefix Hierarchy & Collision / Overlap Detection", () => {
  const groupRates = [
    { prefix: "1", data: { rate_per_minute: "0.01000000", area_name: "USA Proper" } },
    { prefix: "1415", data: { rate_per_minute: "0.01500000", area_name: "USA San Francisco" } },
    { prefix: "1415555", data: { rate_per_minute: "0.08000000", area_name: "SF Premium" } }, // Inversion (8x)
    { prefix: "44", data: { rate_per_minute: "0.02000000", area_name: "UK Proper" } },
  ];

  const overlaps = detectGroupOverlaps(groupRates);
  assert.ok(overlaps.length >= 2, "Expected at least 2 overlapping prefix items");

  const sfNode = overlaps.find((o) => o.prefix === "1415");
  assert.ok(sfNode);
  assert.equal(sfNode.parent_prefixes.length, 1);
  assert.equal(sfNode.parent_prefixes[0].prefix, "1");
  assert.equal(sfNode.child_prefixes.length, 1);
  assert.equal(sfNode.child_prefixes[0].prefix, "1415555");

  const sfPremiumNode = overlaps.find((o) => o.prefix === "1415555");
  assert.ok(sfPremiumNode);
  assert.equal(sfPremiumNode.is_rate_inversion, true);
});

test("T1-R2-03: Dial Prefix Sanitization & E.164 Normalization", () => {
  const n1 = normalizeTelecomString("+1 (415) 555-2671");
  assert.equal(n1.normalized, "+14155552671");

  const n2 = normalizeTelecomString("0044 20 7123 4567");
  assert.equal(n2.normalized, "+442071234567");
  assert.equal(n2.isExitCode, true);

  const n3 = normalizeTelecomString("01191 98765 43210");
  assert.equal(n3.normalized, "+919876543210");
  assert.equal(n3.isExitCode, true);

  const n4 = normalizeTelecomString("14155552671@10.0.0.1:5060");
  assert.equal(n4.normalized, "+14155552671");
});

test("T1-R2-04: ITU / ISO Country Code & Localized Name Resolution", () => {
  const pUS = parseTelecomPhone("+14155552671");
  assert.equal(pUS.country, "US");
  assert.equal(pUS.countryName, "United States");

  const pGB = parseTelecomPhone("+442071234567");
  assert.equal(pGB.country, "GB");
  assert.equal(pGB.countryName, "United Kingdom");

  const pIN = parseTelecomPhone("+919876543210");
  assert.equal(pIN.country, "IN");
  assert.equal(pIN.countryName, "India");

  const pCN = parseTelecomPhone("+861012345678");
  assert.equal(pCN.country, "CN");
  assert.equal(pCN.countryName, "China");

  assert.equal(getCountryName("US"), "United States");
  assert.equal(getCountryName("GB"), "United Kingdom");
  assert.equal(getCountryName("AE"), "United Arab Emirates");
});

test("T1-R2-05: Decimal-Safe Money Arithmetic (8 decimal places precision)", () => {
  // Verify exact addition, multiplication, division without floating point drift
  const a = "0.00041250";
  const b = "0.00008750";
  const sum = DecimalUtil.add(a, b, 8);
  assert.equal(sum, "0.00050000");

  const diff = DecimalUtil.sub("0.01500000", "0.00900000", 8);
  assert.equal(diff, "0.00600000");

  // Exact rating calculation: 90s (1.5 min) @ $0.00375000 / min = $0.00562500
  const minuteFraction = DecimalUtil.div("90", "60", 8);
  const cost = DecimalUtil.mul(minuteFraction, "0.00375000", 8);
  assert.equal(cost, "0.00562500");

  // Multiplier +10.5%
  const adjusted = DecimalUtil.applyMultiplier("0.01000000", "10.5", 8);
  assert.equal(adjusted, "0.01105000");

  // Fixed Delta +$0.0025
  const fixedAdj = DecimalUtil.applyFixedDelta("0.01000000", "0.00250000", 8);
  assert.equal(fixedAdj, "0.01250000");
});

test("T1-R2-06: Telephony Billing Cycles (60/1, 60/60, 1/1, 30/6) Duration Rounding", () => {
  const engine = new RateManagementService({} as any);

  // Call duration = 45s
  assert.equal(engine.calculateBillableSeconds(45, 60, 1), 60); // 60/1 -> 60s minimum
  assert.equal(engine.calculateBillableSeconds(45, 60, 60), 60); // 60/60 -> 60s
  assert.equal(engine.calculateBillableSeconds(45, 1, 1), 45); // 1/1 -> 45s
  assert.equal(engine.calculateBillableSeconds(45, 30, 6), 48); // 30/6 -> 30 + ceil(15/6)*6 = 48s

  // Call duration = 75s
  assert.equal(engine.calculateBillableSeconds(75, 60, 1), 75); // 60/1 -> 75s
  assert.equal(engine.calculateBillableSeconds(75, 60, 60), 120); // 60/60 -> 120s
  assert.equal(engine.calculateBillableSeconds(75, 1, 1), 75); // 1/1 -> 75s
  assert.equal(engine.calculateBillableSeconds(75, 30, 6), 78); // 30/6 -> 30 + ceil(45/6)*6 = 78s

  // Call duration = 0s
  assert.equal(engine.calculateBillableSeconds(0, 60, 1), 0);
});

test("T1-R3-01: CSV Delimiter Auto-Detection (comma, semicolon, tab, pipe)", () => {
  const engine = new RateManagementService({} as any);

  const csvComma = "Prefix,Destination,Rate,Interval\n1,USA,0.01,60/1\n44,UK,0.02,60/1";
  assert.equal(engine.detectDelimiter(csvComma), ",");

  const csvSemi = "Prefix;Destination;Rate;Interval\n1;USA;0.01;60/1\n44;UK;0.02;60/1";
  assert.equal(engine.detectDelimiter(csvSemi), ";");

  const csvTab = "Prefix\tDestination\tRate\tInterval\n1\tUSA\t0.01\t60/1\n44\tUK\t0.02\t60/1";
  assert.equal(engine.detectDelimiter(csvTab), "\t");

  const csvPipe = "Prefix|Destination|Rate|Interval\n1|USA|0.01|60/1\n44|UK|0.02|60/1";
  assert.equal(engine.detectDelimiter(csvPipe), "|");
});

test("T1-R3-02: Dynamic Column Mapping with Aliases and Synonyms", () => {
  const engine = new RateManagementService({} as any);

  const csvContent = "DialCode,Country,PricePerMin,BillingIncrement,RateType\n1415,USA SF,0.0150,60/1,standard";
  const parsed = engine.parseCsvRows(csvContent);

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].prefix, "1415");
  assert.equal(parsed.rows[0].area_name, "USA SF");
  assert.equal(parsed.rows[0].rate_per_minute, "0.01500000");
  assert.equal(parsed.rows[0].initial_interval, 60);
  assert.equal(parsed.rows[0].increment_interval, 1);
  assert.equal(parsed.rows[0].country_code, "US");
});

test("T1-R3-03: 4-Stage Ingestion Dry-Run Diff Calculator (Added, Updated, Deleted, Unchanged)", () => {
  const engine = new RateManagementService({} as any);

  const existingRates = [
    { prefix: "1", rate_per_minute: "0.00800000", area_name: "USA", initial_interval: 60, increment_interval: 1 },
    { prefix: "44", rate_per_minute: "0.01250000", area_name: "UK", initial_interval: 60, increment_interval: 1 },
    { prefix: "91", rate_per_minute: "0.03000000", area_name: "India", initial_interval: 60, increment_interval: 1 },
  ];

  // Upload contains:
  // - "1": unchanged (0.0080)
  // - "44": updated (0.0150)
  // - "86": added (0.0200)
  // - "91": missing in sheet (deleted in replace mode, kept in merge mode)
  const newSheet = "Prefix,Destination,Rate\n1,USA,0.008\n44,UK,0.015\n86,China,0.020";
  const parsed = engine.parseCsvRows(newSheet);

  const diffMerge = engine.calculateDryRunDiff(existingRates, parsed.rows, "merge");
  assert.equal(diffMerge.summary.added, 1);
  assert.equal(diffMerge.summary.updated, 1);
  assert.equal(diffMerge.summary.unchanged, 1);
  assert.equal(diffMerge.summary.deleted, 0);

  const diffReplace = engine.calculateDryRunDiff(existingRates, parsed.rows, "replace");
  assert.equal(diffReplace.summary.added, 1);
  assert.equal(diffReplace.summary.updated, 1);
  assert.equal(diffReplace.summary.unchanged, 1);
  assert.equal(diffReplace.summary.deleted, 1); // "91" is deleted
});

test("T1-R3-04: CSV Ingestion Validation Errors & Sanitization", () => {
  const engine = new RateManagementService({} as any);

  const dirtyCsv = [
    "Prefix,Rate,Destination",
    "14A5,0.01,Invalid Prefix",
    "44,-0.02,Negative Rate",
    ",0.05,Empty Prefix",
    "91,FREE,Non Numeric Rate",
  ].join("\n");

  const parsed = engine.parseCsvRows(dirtyCsv);
  assert.equal(parsed.rows.length, 4);

  const diff = engine.calculateDryRunDiff([], parsed.rows, "merge");
  assert.equal(diff.summary.errors, 4);
  assert.equal(diff.validation_errors.length, 4);
});

test("T1-R4-01: Margin Analyzer & Profit Simulator", () => {
  const engine = new RateManagementService({} as any);

  // Case A: Profitable route (Customer: $0.0150/min, Carrier: $0.0090/min)
  const marginA = engine.calculateMargin("0.01500000", "0.00900000", "0.04500000", "0.02700000");
  assert.equal(marginA.rate_spread, "0.00600000");
  assert.equal(marginA.cost_spread, "0.01800000");
  assert.equal(marginA.margin_percentage, 40.0);
  assert.equal(marginA.is_profitable, true);

  // Case B: Loss-making route (Customer: $0.0080/min, Carrier: $0.0100/min)
  const marginB = engine.calculateMargin("0.00800000", "0.01000000", "0.02400000", "0.03000000");
  assert.equal(marginB.rate_spread, "-0.00200000");
  assert.equal(marginB.margin_percentage, -25.0);
  assert.equal(marginB.is_profitable, false);
});

// ============================================================================
// Tier 2: Business Logic & DataStore Service Operations Tests
// ============================================================================

test("T2-R1-01 & T2-R1-02: Rate Group CRUD and Aggregate Counts", async () => {
  const ds = new DataSourcesService();
  const adminCtx = mockAdminCtx("super_admin");

  // Create
  const group = await ds.createRateGroup(adminCtx, {
    name: "North America Premium Tier",
    side: "customer",
    memo: "High Quality Direct CLI",
    currency: "USD",
  });
  assert.ok(group.id);
  assert.equal(group.name, "North America Premium Tier");
  assert.equal(group.status, "active");
  assert.equal(group.rate_count, 0);

  // List
  const list = await ds.listRateGroups(adminCtx, "North America");
  assert.ok(list.some((g) => g.id === group.id));

  // Get Detail
  const detail = await ds.getRateGroupById(adminCtx, group.id);
  assert.equal(detail.id, group.id);
  assert.equal(detail.name, "North America Premium Tier");

  // Update
  const updated = await ds.updateRateGroup(adminCtx, group.id, {
    memo: "Updated Memo",
    status: "disabled",
  });
  assert.equal(updated.memo, "Updated Memo");
  assert.equal(updated.status, "disabled");
});

test("T2-R1-03: Rate Group Duplication (Clones Group and All Prefix Rates)", async () => {
  const ds = new DataSourcesService();
  const adminCtx = mockAdminCtx("super_admin");

  // Create Source Group
  const src = await ds.createRateGroup(adminCtx, { name: "Source Rate Group", side: "customer" });
  await ds.createRate(adminCtx, { rate_group_id: src.id, prefix: "1", rate_per_minute: 0.01 });
  await ds.createRate(adminCtx, { rate_group_id: src.id, prefix: "1415", rate_per_minute: 0.015 });
  await ds.createRate(adminCtx, { rate_group_id: src.id, prefix: "44", rate_per_minute: 0.02 });

  // Duplicate
  const cloned = await ds.duplicateRateGroup(adminCtx, src.id, "Source Rate Group - Copy");
  assert.ok(cloned.id !== src.id);
  assert.equal(cloned.name, "Source Rate Group - Copy");
  assert.equal(cloned.rate_count, 3);

  const ratesCloned = await ds.listRatesPaginated(adminCtx, cloned.id);
  assert.equal(ratesCloned.total, 3);
  assert.ok(ratesCloned.rates.some((r) => r.prefix === "1415" && r.rate_per_minute === "0.01500000"));
});

test("T2-R2-01 & T2-R2-02: Rate Prefix Insertion, Unique Conflict Upsert, and Deletion", async () => {
  const ds = new DataSourcesService();
  const adminCtx = mockAdminCtx("super_admin");

  const group = await ds.createRateGroup(adminCtx, { name: "Testing Rates Group", side: "customer" });

  // 1. Initial Insert
  const rate1 = await ds.createRate(adminCtx, {
    rate_group_id: group.id,
    prefix: "+1 (415) 555-0000",
    rate_per_minute: "0.01250000",
    area_name: "SF Proper",
  });
  assert.equal(rate1.prefix, "14155550000");
  assert.equal(rate1.country_code, "US");
  assert.equal(rate1.rate_per_minute, "0.01250000");

  // 2. Conflict Upsert
  const rate2 = await ds.createRate(adminCtx, {
    rate_group_id: group.id,
    prefix: "14155550000",
    rate_per_minute: "0.01800000",
    area_name: "SF Proper Updated",
  });
  assert.equal(rate2.prefix, "14155550000");
  assert.equal(rate2.rate_per_minute, "0.01800000");
  assert.equal(rate2.area_name, "SF Proper Updated");

  // 3. Delete
  const del = await ds.deleteRate(adminCtx, String(rate2.id), group.id);
  assert.equal(del.deleted, true);

  const afterList = await ds.listRatesPaginated(adminCtx, group.id);
  assert.equal(afterList.total, 0);
});

test("T2-R2-03: Bulk Rate Adjustment (+15% Percentage Modifier with Snapshot)", async () => {
  const ds = new DataSourcesService();
  const adminCtx = mockAdminCtx("super_admin");

  const group = await ds.createRateGroup(adminCtx, { name: "Bulk Adj Group", side: "customer" });
  await ds.createRate(adminCtx, { rate_group_id: group.id, prefix: "1", rate_per_minute: "0.01000000" });
  await ds.createRate(adminCtx, { rate_group_id: group.id, prefix: "44", rate_per_minute: "0.02000000" });

  const result = await ds.bulkAdjustRates(adminCtx, group.id, {
    adjustment_type: "percentage",
    value: 15,
    rounding_decimals: 6,
  });

  assert.equal(result.adjusted_count, 2);
  assert.ok(result.snapshot_id);

  const rates = await ds.listRatesPaginated(adminCtx, group.id);
  const r1 = rates.rates.find((r) => r.prefix === "1");
  assert.equal(r1?.rate_per_minute, "0.011500");

  const r44 = rates.rates.find((r) => r.prefix === "44");
  assert.equal(r44?.rate_per_minute, "0.023000");
});

test("T2-R3-02: Batch Ingestion & Rollback Snapshot Restoration", async () => {
  const ds = new DataSourcesService();
  const adminCtx = mockAdminCtx("super_admin");

  const group = await ds.createRateGroup(adminCtx, { name: "Ingestion Test Group", side: "customer" });
  await ds.createRate(adminCtx, { rate_group_id: group.id, prefix: "1", rate_per_minute: "0.01000000" });

  // Ingest batch in replace mode
  const newBatch = [
    { prefix: "44", area_name: "UK", rate_per_minute: "0.02000000" },
    { prefix: "86", area_name: "China", rate_per_minute: "0.03000000" },
  ];
  const importRes = await ds.batchUpsertRates(adminCtx, group.id, newBatch, "replace", "new_rates.csv");
  assert.equal(importRes.success, true);
  assert.ok(importRes.snapshot_id);

  const midRates = await ds.listRatesPaginated(adminCtx, group.id);
  assert.equal(midRates.total, 2);
  assert.ok(!midRates.rates.some((r) => r.prefix === "1"));

  // Rollback to prior snapshot
  const rollbackRes = await ds.rollbackRateSnapshot(adminCtx, importRes.snapshot_id);
  assert.equal(rollbackRes.restored, true);

  const restoredRates = await ds.listRatesPaginated(adminCtx, group.id);
  assert.equal(restoredRates.total, 1);
  assert.equal(restoredRates.rates[0].prefix, "1");
});

// ============================================================================
// Tier 3: REST API Contracts & Status Codes (RatesController)
// ============================================================================

test("T3-R1-01 to T3-R1-03: RatesController Group Endpoints & Contract Assertions", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const reqMock = (headers: any, url: string = "/api/v1/admin/rates/groups") =>
    ({
      headers,
      ip: "127.0.0.1",
      url,
    } as any);

  const resMock = () => {
    let statusCode = 200;
    return {
      status(s: number) {
        statusCode = s;
        return this;
      },
      statusCode: () => statusCode,
    } as any;
  };

  // 1. Unauthenticated -> 401
  const res1 = resMock();
  const r1 = await controller.listRateGroups(reqMock({}), res1);
  assert.equal(r1.ok, false);
  assert.equal(res1.statusCode(), 401);

  // Authenticated Admin (Super Admin)
  const loginRes = await auth.login("admin@example.com", "Admin123!", "admin", { ip: "127.0.0.1" });
  assert.ok(loginRes && "token" in loginRes);
  const adminToken = loginRes.token;

  const adminHeaders = {
    authorization: `Bearer ${adminToken}`,
    origin: "http://localhost:3000",
  };

  // 2. List Groups -> 200
  const res2 = resMock();
  const r2 = await controller.listRateGroups(reqMock(adminHeaders), res2);
  assert.equal(r2.ok, true);
  assert.ok(Array.isArray(r2.data));

  // 3. Create Group Missing Name -> 400
  const res3 = resMock();
  const r3 = await controller.createRateGroup({ name: "   " }, reqMock(adminHeaders), res3);
  assert.equal(r3.ok, false);
  assert.equal(res3.statusCode(), 400);

  // 4. Create Group Valid -> 200/201
  const res4 = resMock();
  const r4 = await controller.createRateGroup({ name: "API Test Group", side: "customer" }, reqMock(adminHeaders), res4);
  assert.equal(r4.ok, true);
  assert.equal(r4.data.name, "API Test Group");
  const createdGroupId = r4.data.id;

  // 5. Get Group Detail -> 200
  const res5 = resMock();
  const r5 = await controller.getRateGroupDetail(createdGroupId, reqMock(adminHeaders), res5);
  assert.equal(r5.ok, true);
  assert.equal(r5.data.id, createdGroupId);

  // 6. Preview Ingestion -> 200
  const res6 = resMock();
  const r6 = await controller.previewRateImport(
    {
      rate_group_id: createdGroupId,
      file_content: "Prefix,Destination,Rate\n1,USA,0.015\n44,UK,0.020",
    },
    reqMock(adminHeaders),
    res6
  );
  assert.equal(r6.ok, true);
  assert.ok(r6.data);
  assert.equal(r6.data.summary.total_rows, 2);
  assert.equal(r6.data.summary.added, 2);

  // 7. Longest-Prefix Destination Lookup -> 200
  const res7 = resMock();
  const r7 = await controller.adminRateLookup(
    {
      destination: "+14155552671",
      customer_rate_group_id: createdGroupId,
      duration_seconds: 120,
    },
    reqMock(adminHeaders),
    res7
  );
  assert.equal(r7.ok, true);
  assert.ok(r7.data);
  assert.equal(r7.data.destination, "+14155552671");
  assert.equal(r7.data.country_code, "US");
});

// ============================================================================
// Tier 4: Security, RBAC, Tenant Isolation & Boundary Cases
// ============================================================================

test("T4-SEC-01: Client Session Blocked from Admin Rate Endpoints (HTTP 403)", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const clientLogin = await auth.login("client@example.com", "Client123!", "client", { ip: "127.0.0.1" });
  assert.ok(clientLogin && "token" in clientLogin);
  const clientToken = clientLogin.token;

  const clientHeaders = {
    authorization: `Bearer ${clientToken}`,
    origin: "http://localhost:3000",
  };

  const req = { headers: clientHeaders, ip: "127.0.0.1", url: "/api/v1/admin/rates/groups" } as any;
  let status = 200;
  const res = {
    status(s: number) {
      status = s;
      return this;
    },
  } as any;

  const result = await controller.listRateGroups(req, res);
  assert.equal(result.ok, false);
  assert.equal(status, 403);
  assert.ok(result.error);
  assert.equal(result.error.code, "FORBIDDEN");
});

test("T4-SEC-02: RBAC Matrix (Commercial Allowed Write, Billing Blocked from Mutation)", () => {
  const commercialCtx = mockAdminCtx("commercial", "comm-1");
  const billingCtx = mockAdminCtx("billing", "bill-1");
  const supportCtx = mockAdminCtx("support", "supp-1");

  const defRead = { method: "GET", path: "/api/v1/admin/rates/groups", sides: ["Admin"] } as any;
  const defWrite = { method: "POST", path: "/api/v1/admin/rates/groups", sides: ["Admin"] } as any;

  // Commercial can read and write
  assert.equal(authorizeProductApi(commercialCtx, defRead).ok, true);
  assert.equal(authorizeProductApi(commercialCtx, defWrite).ok, true);

  // Billing can read rates, but is denied write on rates
  assert.equal(authorizeProductApi(billingCtx, defRead).ok, true);
  assert.equal(authorizeProductApi(billingCtx, defWrite).ok, false);

  // Support is denied access to admin rates
  assert.equal(authorizeProductApi(supportCtx, defRead).ok, false);
  assert.equal(authorizeProductApi(supportCtx, defWrite).ok, false);
});

test("T4-SEC-03: Client Rate Lookup Redacts Internal Cost & Margin", async () => {
  const ds = new DataSourcesService();
  const auth = new AuthService(ds);
  const engine = new RateManagementService(ds);
  const controller = new RatesController(auth, ds, engine);

  const clientLogin = await auth.login("client@example.com", "Client123!", "client", { ip: "127.0.0.1" });
  assert.ok(clientLogin && "token" in clientLogin);
  const clientToken = clientLogin.token;

  const clientHeaders = {
    authorization: `Bearer ${clientToken}`,
    origin: "http://localhost:3000",
  };

  const req = {
    headers: clientHeaders,
    ip: "127.0.0.1",
    url: "/api/v1/rates/lookup?number=+14155552671",
  } as any;

  const res = { status: () => res } as any;
  const result = await controller.clientRateLookupGet(req, res);
  assert.equal(result.ok, true);
  assert.ok(result.data);
  assert.ok(result.data.items.length > 0);

  const item = result.data.items[0];
  assert.equal((item as any).carrier_cost, undefined);
  assert.equal((item as any).margin, undefined);
  assert.equal((item as any).supplier, undefined);
});

test("T4-EDGE-01 to T4-EDGE-05: Edge Cases (Zero rates, 32-digit prefix, UTF-8 BOM, Empty file)", () => {
  const engine = new RateManagementService({} as any);

  // 1. Toll-Free $0.00000000 rate
  const costZero = engine.calculateCallCost(120, "0.00000000", 60, 1);
  assert.equal(costZero.total_cost, "0.00000000");

  // 2. 32-digit prefix length
  const p32 = "9".repeat(32);
  const trie = new RatePrefixTrie<string>();
  trie.insert(p32, "Max Prefix");
  assert.equal(trie.longestPrefixMatch(p32)?.data, "Max Prefix");

  // 3. UTF-8 BOM and Windows CRLF in CSV
  const bomCsv = "\uFEFFPrefix,Rate,Destination\r\n1415,$0.015,SF Proper\r\n44,€0.020,UK Proper\r\n";
  const parsedBom = engine.parseCsvRows(bomCsv);
  assert.equal(parsedBom.rows.length, 2);
  assert.equal(parsedBom.rows[0].rate_per_minute, "0.01500000");
  assert.equal(parsedBom.rows[1].rate_per_minute, "0.02000000");

  // 4. Empty CSV
  const emptyParsed = engine.parseCsvRows("   \n\n  ");
  assert.equal(emptyParsed.rows.length, 0);
});
