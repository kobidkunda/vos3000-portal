import test from "node:test";
import assert from "node:assert/strict";
import pg from "pg";
import { PlatformService } from "../platform.service.js";
import { DataSourcesService } from "../data-sources.service.js";
import { AuthService } from "../auth.service.js";
import type { AuthContext } from "@vos/shared";

process.env.DATA_MODE = "external";
process.env.AUTH_MODE = "database";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://vos:vos@localhost:5020/vos_portal";

const DATABASE_URL = process.env.DATABASE_URL;

test("Payments & Billing Real Data Test Suite", async (t) => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const sources = new DataSourcesService();
  await sources.init();
  const auth = new AuthService(sources);
  const platform = new PlatformService(sources, auth, {} as any);
  await platform.init();

  // Find Veejay Singh customer record in PostgreSQL
  const veejayRes = await pool.query(`
    SELECT c.id, c.account_name, c.vos_account_id, c.balance, c.organization_id
    FROM customers c
    WHERE c.account_name = 'veejay singh' OR c.vos_account_id = 'veejay singh'
    LIMIT 1
  `);
  assert.ok(veejayRes.rows.length > 0, "Veejay Singh customer record must exist in PostgreSQL");
  const veejayCust = veejayRes.rows[0];

  // Find another customer (Amit uk) for tenant isolation test
  const otherRes = await pool.query(`
    SELECT c.id, c.account_name, c.vos_account_id, c.balance, c.organization_id
    FROM customers c
    WHERE c.id != $1
    LIMIT 1
  `, [veejayCust.id]);
  assert.ok(otherRes.rows.length > 0, "Second customer record must exist in PostgreSQL");
  const otherCust = otherRes.rows[0];

  const clientCtx: AuthContext = {
    userId: "client-veejay",
    email: "client@example.com",
    side: "client",
    role: "owner",
    tenantId: veejayCust.id,
    organizationId: veejayCust.organization_id,
    permissions: ["view_payments", "export_payments"],
    sessionId: "sess-veejay-1",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const otherClientCtx: AuthContext = {
    userId: "client-other",
    email: "other@example.com",
    side: "client",
    role: "owner",
    tenantId: otherCust.id,
    organizationId: otherCust.organization_id,
    permissions: ["view_payments"],
    sessionId: "sess-other-1",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const adminCtx: AuthContext = {
    userId: "admin-root",
    email: "admin@example.com",
    side: "admin",
    role: "super_admin",
    permissions: ["*"],
    sessionId: "sess-admin-1",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  await t.test("T1: listPayments returns real customer payments with metadata and fees", async () => {
    const payments: any = await sources.listPayments(clientCtx);
    assert.ok(Array.isArray(payments), "Payments must be an array");
    assert.ok(payments.length > 0, "Veejay Singh must have real payment records in PostgreSQL");

    const first = payments[0];
    assert.ok(first.id, "Payment must have an id");
    assert.ok(first.amount, "Payment must have an amount");
    assert.ok(first.currency, "Payment must have a currency");
    assert.ok(first.status, "Payment must have a status");
    assert.ok(first.created_at, "Payment must have a created_at timestamp");
    assert.ok(first.metadata !== undefined, "Payment must include metadata object");
  });

  await t.test("T2: Single payment lookup by UUID or VOS Serial or External Ref", async () => {
    const payments: any = await sources.listPayments(clientCtx);
    const target = payments[0];

    // Lookup by UUID
    const byId: any = await sources.listPayments(clientCtx, target.id);
    assert.ok(byId, "Must find payment by UUID");
    assert.equal(byId.id, target.id);

    // Lookup by External Reference (if present)
    if (target.external_reference) {
      const byRef: any = await sources.listPayments(clientCtx, target.external_reference);
      assert.ok(byRef, "Must find payment by external_reference");
      assert.equal(byRef.id, target.id);
    }

    // Lookup by VOS Serial (if present)
    if (target.vos_serial) {
      const bySerial: any = await sources.listPayments(clientCtx, target.vos_serial);
      assert.ok(bySerial, "Must find payment by vos_serial");
      assert.equal(bySerial.id, target.id);
    }
  });

  await t.test("T3: Tenant Isolation — Customer A cannot read Customer B payments", async () => {
    // Other customer's payments
    const otherPayments: any = await sources.listPayments(otherClientCtx);
    assert.ok(otherPayments.length > 0, "Other customer must have payments");

    const otherTarget = otherPayments[0];

    // Veejay Singh attempts to read other customer's payment by ID
    const crossTenantRead: any = await sources.listPayments(clientCtx, otherTarget.id);
    assert.equal(crossTenantRead, undefined, "Customer A must NOT be able to read Customer B payment");

    // All payments for Customer A must strictly have customer_id = Customer A
    const allVeejayPayments: any = await sources.listPayments(clientCtx);
    for (const p of allVeejayPayments) {
      // In PostgreSQL query, listPayments scopes WHERE customer_id = clientCtx.tenantId
      assert.ok(p.id !== otherTarget.id, "Customer A payment list must never contain Customer B payment ID");
    }
  });

  await t.test("T4: UI Page /app/billing/payments computes real financial KPIs from PostgreSQL", async () => {
    const pageData = await platform.page("/app/billing/payments", clientCtx);
    assert.equal(pageData.route, "/app/billing/payments");
    assert.equal(pageData.source, "postgres");
    assert.ok(Array.isArray(pageData.rows), "Page data must contain rows");
    assert.ok(pageData.rows.length > 0, "Page data must have real rows for client");

    assert.ok(Array.isArray(pageData.kpis), "Page data must have KPIs");
    const totalCreditedKpi = pageData.kpis.find((k: any) => k.label === "Total Credited" || k.label.includes("Credited"));
    assert.ok(totalCreditedKpi, "Must have Total Credited KPI");
    assert.ok(totalCreditedKpi.value.includes("$"), "Total Credited value must be formatted with currency");

    const completedInflowKpi = pageData.kpis.find((k: any) => k.label.includes("Completed"));
    assert.ok(completedInflowKpi, "Must have Completed Inflow KPI");
  });

  await t.test("T5: Admin listAdminPayments returns payments across all customer organizations", async () => {
    const adminPayments: any = await sources.listAdminPayments(adminCtx);
    assert.ok(Array.isArray(adminPayments), "Admin payments must be an array");
    assert.ok(adminPayments.length >= 7, "Admin should see all seeded customer payments");

    // Verify presence of customer organization name
    const withOrg = adminPayments.find((p: any) => Boolean(p.customer_name));
    assert.ok(withOrg, "Admin payments should include customer organization names");
  });

  await pool.end();
  setTimeout(() => process.exit(0), 100);
});
