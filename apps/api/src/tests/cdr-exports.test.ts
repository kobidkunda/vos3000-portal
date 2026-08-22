import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DataSourcesService } from "../data-sources.service.js";
import type { AuthContext } from "@vos/shared";

test("CDR Exports: ClickHouse Row & Duration Estimation", async () => {
  const sources = new DataSourcesService();
  await sources.init();

  if (!sources.pg || !sources.ch) {
    return;
  }

  const custRes = await sources.pg.query("SELECT id, organization_id FROM customers WHERE account_name='veejay singh' LIMIT 1");
  assert.ok(custRes.rows.length > 0, "Customer Veejay Singh must exist in database");
  const cust = custRes.rows[0];

  const ctx: AuthContext = {
    userId: "test-client-user",
    email: "client@example.com",
    role: "owner",
    organizationId: cust.organization_id,
    tenantId: cust.id,
    permissions: [],
    side: "client",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const estimate = await sources.estimateExportRows(ctx, {
    from: "2026-05-01",
    to: "2026-08-23",
  });

  assert.ok(typeof estimate.count === "number", "Estimate count must be a number");
  assert.ok(estimate.count >= 300, `Expected at least 300 real CDRs for Veejay Singh, got ${estimate.count}`);
  assert.ok(estimate.estimatedMinutes > 0, "Estimated traffic minutes must be > 0");
  assert.ok(estimate.estimatedCharge > 0, "Estimated customer charge must be > 0");

  await sources.onModuleDestroy();
});

test("CDR Exports: Create, Process ClickHouse Export, and Stream CSV File", async () => {
  const sources = new DataSourcesService();
  await sources.init();

  if (!sources.pg || !sources.ch) {
    await sources.onModuleDestroy();
    return;
  }

  const custRes = await sources.pg.query("SELECT id, organization_id FROM customers WHERE account_name='veejay singh' LIMIT 1");
  const cust = custRes.rows[0];

  const ctx: AuthContext = {
    userId: "test-client-user",
    email: "client@example.com",
    role: "owner",
    organizationId: cust.organization_id,
    tenantId: cust.id,
    permissions: [],
    side: "client",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  // Create job
  const job = await sources.createReportJob(ctx, {
    from: "2026-05-01",
    to: "2026-08-23",
    format: "csv",
    filters: { answered: "answered" },
  });

  assert.ok(job.id, "Job ID must be generated");
  assert.equal(job.format, "csv");
  assert.equal(job.report_type, "cdr_export");

  // Process job directly
  await sources.processReportJob(job.id);

  // Retrieve job
  const readyJob = await sources.getReportForDownload(ctx, job.id);
  assert.ok(readyJob, "Job must be ready and downloadable");
  assert.equal(readyJob.status, "ready");
  assert.ok(Number(readyJob.row_count) > 0, "Row count must be > 0");
  assert.ok(readyJob.object_path && fs.existsSync(readyJob.object_path), "Export file must exist on disk");

  // Verify file content has headers and real CDR lines
  const fileContent = fs.readFileSync(readyJob.object_path, "utf8");
  assert.ok(fileContent.includes("serial_number"), "File header must include serial_number");
  assert.ok(fileContent.includes("customer_charge"), "File header must include customer_charge");
  assert.ok(fileContent.includes("veejay singh"), "File rows must contain customer gateway/CDR details");

  // Test listing jobs
  const jobsList = await sources.getReportJobs(ctx);
  const found = jobsList.find((j: any) => j.id === job.id);
  assert.ok(found, "Created job must appear in getReportJobs list");
  assert.ok(found.file_size_formatted, "Job must include formatted file size");
  assert.ok(found.download_url, "Job must include download_url");

  // Test clean up / deletion
  const delRes = await sources.deleteReportJob(ctx, job.id);
  assert.equal(delRes.deleted, true, "Job deletion must succeed");

  await sources.onModuleDestroy();
});

test("CDR Exports: Tenant Isolation Guard", async () => {
  const sources = new DataSourcesService();
  await sources.init();

  if (!sources.pg) {
    await sources.onModuleDestroy();
    return;
  }

  const orgA = "be52237d-8f56-4c41-affd-640cf46cb77f"; // Veejay Singh
  const orgB = "fa480bbf-ef87-4a0f-975a-233cd330894b"; // Amit uk

  const ctxA: AuthContext = {
    userId: "user-a",
    email: "a@example.com",
    role: "owner",
    organizationId: orgA,
    tenantId: "b2c1eb03-ecc2-4a90-ad16-888b31d11548",
    permissions: [],
    side: "client",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const ctxB: AuthContext = {
    userId: "user-b",
    email: "b@example.com",
    role: "owner",
    organizationId: orgB,
    tenantId: "43932076-8fe2-44f4-b341-6d1289790ce3",
    permissions: [],
    side: "client",
    authType: "session",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  // Create job under Org A
  const jobA = await sources.createReportJob(ctxA, {
    from: "2026-05-01",
    to: "2026-08-23",
    format: "csv",
  });
  await sources.processReportJob(jobA.id);

  // User B attempts to access Org A's job for download
  const forbiddenDownload = await sources.getReportForDownload(ctxB, jobA.id);
  assert.equal(forbiddenDownload, undefined, "Customer B must NOT be able to access Customer A's report job");

  // User B lists jobs - must not contain Job A
  const listB = await sources.getReportJobs(ctxB);
  assert.equal(
    listB.some((j: any) => j.id === jobA.id),
    false,
    "Customer B's job list must NOT leak Customer A's jobs"
  );

  // Clean up
  await sources.deleteReportJob(ctxA, jobA.id);

  await sources.onModuleDestroy();
});
