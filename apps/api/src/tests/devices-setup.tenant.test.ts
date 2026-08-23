import { test } from "node:test";
import assert from "node:assert/strict";

// Unit-level tenant isolation contract for DevicesSetupService.assertGatewayOwnership
// We test the pure logic by re-implementing the guard decision table against the service module.
// The service synthesizes demo gateways when PG is absent; the critical invariant:
// a client ctx with tenantId A must NEVER receive credentials for a gateway owned by tenant B.

const FOREIGN_PROBE_IDS = ["bbbb1111-2222-4333-8444-555566667777", "00000000-0000-0000-0000-000000000000"];

test("foreign gateway probes are rejected with TENANT_MISMATCH", async () => {
  // Import the compiled service logic through transform boundary is not enough;
  // we exercise the real service with a stubbed DataSourcesService.
  const { DevicesSetupService } = await import("../devices-setup/service.js");
  const stubSources = {
    listGateways: async (_ctx: unknown, id: string) => {
      // Simulate PG present, gateway belongs to tenant-B
      if (id === "bbbb1111-2222-4333-8444-555566667777") {
        return { id, customer_id: "tenant-B", configured_ip: "10.9.9.9", vos_gateway_id: "gwB" };
      }
      return undefined;
    },
    audit: async () => {},
    redis: undefined,
  } as never;
  const svc = new DevicesSetupService(stubSources);
  const ctxA = { side: "client", tenantId: "tenant-A", email: "a@example.com", role: "owner" } as never;

  for (const foreign of FOREIGN_PROBE_IDS) {
    await assert.rejects(
      () => svc.getInstructions(ctxA, "microsip", foreign, undefined, false, "req-test"),
      (e: { code?: string }) => e.code === "TENANT_MISMATCH",
      `expected TENANT_MISMATCH for ${foreign}`
    );
  }
});

test("own-tenant gateway resolves and returns masked DTO", async () => {
  const { DevicesSetupService } = await import("../devices-setup/service.js");
  const ownGw = { id: "aaaa1111-2222-4333-8444-555566667777", customer_id: "tenant-A", configured_ip: "203.0.113.50", sip_username: "1001", sip_password: "s3cret!", name: "My GW" };
  const stubSources = {
    listGateways: async () => ownGw,
    audit: async () => {},
    redis: undefined,
  } as never;
  const svc = new DevicesSetupService(stubSources);
  const ctxA = { side: "client", tenantId: "tenant-A", email: "a@example.com", role: "owner" } as never;
  const dto = await svc.getInstructions(ctxA, "microsip", "aaaa1111-2222-4333-8444-555566667777", undefined, false, "req-test");
  assert.equal(dto.sipServer, "203.0.113.50");
  assert.ok(!dto.passwordMasked.includes("s3cret!"), "masked password must not leak raw secret");
});

test("unknown deviceKey yields DEVICE_NOT_FOUND", async () => {
  const { DevicesSetupService } = await import("../devices-setup/service.js");
  const stubSources = { listGateways: async () => undefined, audit: async () => {}, redis: undefined } as never;
  const svc = new DevicesSetupService(stubSources);
  const ctxA = { side: "client", tenantId: "tenant-A", email: "a@example.com", role: "owner" } as never;
  await assert.rejects(
    () => svc.getInstructions(ctxA, "not-a-device", "aaaa1111-2222-4333-8444-555566667777", undefined, false, "req-test"),
    (e: { code?: string }) => e.code === "DEVICE_NOT_FOUND"
  );
});
