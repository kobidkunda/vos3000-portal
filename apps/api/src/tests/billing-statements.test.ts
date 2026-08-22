import test from "node:test";
import assert from "node:assert/strict";
import { DataSourcesService } from "../data-sources.service.js";
import type { AuthContext } from "@vos/shared";

test("Statements & Billing Summary: Tenant scope is strictly required", async () => {
  const sources = new DataSourcesService();
  const unauthenticatedCtx: any = {
    userId: "unauth",
    email: "none@example.com",
    role: "read_only",
    permissions: [],
    side: "client",
    authType: "session",
    // Missing tenantId
  };

  await assert.rejects(
    async () => {
      await sources.getBillingStatements(unauthenticatedCtx);
    },
    (err: any) => {
      assert.equal(err.statusCode, 403);
      assert.equal(err.code, "TENANT_SCOPE_REQUIRED");
      return true;
    }
  );
});

test("Statements & Billing Summary: Reconciled 100% Real Statements Calculation", async () => {
  const sources = new DataSourcesService();
  await sources.init();

  // Test with customer Veejay Singh
  const custRes = await sources["pg"]?.query("SELECT id, organization_id, balance FROM customers WHERE account_name='veejay singh' LIMIT 1");
  if (!custRes || custRes.rows.length === 0) {
    // If DB not connected, skip live assertions
    return;
  }

  const cust = custRes.rows[0];
  const clientCtx: AuthContext = {
    userId: "test-client-user",
    email: "client@example.com",
    role: "owner",
    organizationId: cust.organization_id,
    tenantId: cust.id,
    permissions: [],
    side: "client",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const result = await sources.getBillingStatements(clientCtx);

  // 1. Verify Structure & Metadata (F01..F08)
  assert.ok(result.customer, "Customer profile must be present");
  assert.equal(result.customer.id, cust.id);
  assert.ok(result.summary, "Summary KPIs must be present");
  assert.ok(Array.isArray(result.statements), "Statements list must be an array");
  assert.ok(result.statements.length >= 1, "At least one billing period statement must exist");

  // 2. Mathematical Reconciliation Check across all statement periods
  for (const st of result.statements) {
    const opening = parseFloat(st.opening_balance);
    const credits = parseFloat(st.payments_credits);
    const charges = parseFloat(st.call_charges);
    const rent = parseFloat(st.package_rent);
    const closing = parseFloat(st.closing_balance);
    const net = parseFloat(st.net_change);

    // Assert: net_change = credits - charges - rent
    const expectedNet = Math.round((credits - charges - rent) * 100) / 100;
    assert.equal(
      Math.round(net * 100) / 100,
      expectedNet,
      `Net change for period ${st.period} must equal credits - charges - rent`
    );

    // If settled period, assert closing = opening + credits - charges - rent
    if (st.status === "SETTLED") {
      const expectedClosing = Math.round((opening + credits - charges - rent) * 100) / 100;
      assert.equal(
        Math.round(closing * 100) / 100,
        expectedClosing,
        `Closing balance for settled period ${st.period} must equal opening + credits - charges - rent`
      );
    }
  }

  // 3. Current Live Balance Reconciliation
  const latestStatement = result.statements[0];
  const currentLiveBalance = parseFloat(cust.balance);
  assert.equal(
    parseFloat(latestStatement.closing_balance),
    Math.round(currentLiveBalance * 100) / 100,
    "Latest statement closing balance must equal customer live balance in database"
  );

  // 4. CDR & Traffic Metrics Integrity (F06)
  for (const st of result.statements) {
    assert.ok(st.total_calls >= 0, "Total calls must be >= 0");
    assert.ok(st.answered_calls >= 0, "Answered calls must be >= 0");
    assert.ok(st.answered_calls <= st.total_calls, "Answered calls cannot exceed total calls");
    assert.ok(parseFloat(st.total_minutes) >= 0, "Total minutes must be >= 0");
    assert.match(st.asr, /^\d+(\.\d+)?%$/, "ASR must be formatted as a percentage");
  }

  // 5. Daily Breakdown & Destinations
  assert.ok(Array.isArray(result.daily_breakdown), "Daily breakdown must be present");
  assert.ok(Array.isArray(result.top_destinations), "Top destinations must be present");
  assert.ok(Array.isArray(result.transactions), "Transactions must be present");

  // 6. Test Single Statement Query by ID
  const singleQuery = await sources.getBillingStatements(clientCtx, { id: latestStatement.id });
  assert.equal(singleQuery.statements.length, 1);
  assert.equal(singleQuery.statements[0].id, latestStatement.id);

  await sources.onModuleDestroy();
});

test("Statements & Billing Summary: Strict Cross-Tenant Isolation", async () => {
  const sources = new DataSourcesService();
  await sources.init();

  if (!sources["pg"]) return;

  // Retrieve two distinct customers
  const custRes = await sources["pg"].query("SELECT id, organization_id, account_name FROM customers LIMIT 2");
  if (custRes.rows.length < 2) {
    await sources.onModuleDestroy();
    return;
  }

  const custA = custRes.rows[0];
  const custB = custRes.rows[1];

  const ctxA: AuthContext = {
    userId: "user-a",
    email: "userA@example.com",
    role: "owner",
    organizationId: custA.organization_id,
    tenantId: custA.id,
    permissions: [],
    side: "client",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const ctxB: AuthContext = {
    userId: "user-b",
    email: "userB@example.com",
    role: "owner",
    organizationId: custB.organization_id,
    tenantId: custB.id,
    permissions: [],
    side: "client",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const stmtsA = await sources.getBillingStatements(ctxA);
  const stmtsB = await sources.getBillingStatements(ctxB);

  // Customer A's result must only contain Customer A's ID and data
  assert.equal(stmtsA.customer.id, custA.id);
  assert.equal(stmtsB.customer.id, custB.id);
  assert.notEqual(stmtsA.customer.id, stmtsB.customer.id);

  // Customer A cannot see Customer B's statement IDs
  for (const stA of stmtsA.statements) {
    for (const stB of stmtsB.statements) {
      assert.notEqual(stA.statement_number, stB.statement_number, "Statements must have unique customer-isolated identifiers");
    }
  }

  await sources.onModuleDestroy();
});
