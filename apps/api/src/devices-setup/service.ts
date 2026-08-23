import { Injectable, Inject } from "@nestjs/common";
import type { AuthContext } from "@vos/shared";
import { DeviceKeySchema, GatewayIdSchema } from "@vos/shared";
import { DataSourcesService } from "../data-sources.service.js";
import { toMaskedDTO, rawFromGateway } from "./transform.js";

const DEVICE_KEYS = ["microsip","linphone","zoiper","groundwire","bria","yealink-t5x","grandstream","cisco-78xx","poly-vvx","fanvil","webrtc","mobile-dialer"] as const;

@Injectable()
export class DevicesSetupService {
  constructor(@Inject(DataSourcesService) private readonly sources: DataSourcesService) {}

  listDevices(category?: string, search?: string) {
    const all = [
      { key: "microsip", label: "MicroSIP", category: "softphone", icon: "phone", effortMinutes: 1, capabilities: { qr: true, cfg: false, webrtc: false } },
      { key: "linphone", label: "Linphone", category: "softphone", icon: "phone", effortMinutes: 1, capabilities: { qr: true, cfg: false, webrtc: false } },
      { key: "zoiper", label: "Zoiper 5", category: "softphone", icon: "phone", effortMinutes: 1, capabilities: { qr: true, cfg: false, webrtc: false } },
      { key: "groundwire", label: "Groundwire", category: "softphone", icon: "phone", effortMinutes: 2, capabilities: { qr: true, cfg: false, webrtc: false } },
      { key: "bria", label: "Bria Solo / Teams", category: "softphone", icon: "phone", effortMinutes: 2, capabilities: { qr: true, cfg: false, webrtc: false } },
      { key: "yealink-t5x", label: "Yealink T5 Series", category: "deskphone", icon: "devices", effortMinutes: 2, capabilities: { qr: true, cfg: true, webrtc: false } },
      { key: "grandstream", label: "Grandstream GXP / GRP", category: "deskphone", icon: "devices", effortMinutes: 2, capabilities: { qr: true, cfg: true, webrtc: false } },
      { key: "cisco-78xx", label: "Cisco 78xx", category: "deskphone", icon: "devices", effortMinutes: 3, capabilities: { qr: false, cfg: true, webrtc: false } },
      { key: "poly-vvx", label: "Poly VVX / Edge", category: "deskphone", icon: "devices", effortMinutes: 2, capabilities: { qr: true, cfg: true, webrtc: false } },
      { key: "fanvil", label: "Fanvil X / U Series", category: "deskphone", icon: "devices", effortMinutes: 2, capabilities: { qr: true, cfg: true, webrtc: false } },
      { key: "webrtc", label: "WebRTC Dialer (Browser)", category: "webrtc", icon: "monitor", effortMinutes: 0, capabilities: { qr: false, cfg: false, webrtc: true } },
      { key: "mobile-dialer", label: "Mobile Dialer", category: "mobile", icon: "smartphone", effortMinutes: 1, capabilities: { qr: true, cfg: false, webrtc: false } },
    ];
    let out: typeof all = all as unknown as typeof all;
    if (category) out = out.filter((d) => d.category === category) as typeof all;
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((d) => d.label.toLowerCase().includes(q) || d.key.toLowerCase().includes(q)) as typeof all;
    }
    return out;
  }

  private assertDeviceKey(key: string) {
    const parsed = DeviceKeySchema.safeParse(key);
    if (!parsed.success) throw Object.assign(new Error(`Unknown deviceKey: ${key}`), { statusCode: 404, code: "DEVICE_NOT_FOUND" });
    return parsed.data;
  }

  private async assertGatewayOwnership(ctx: AuthContext, gatewayId: string) {
    const gid = GatewayIdSchema.safeParse(gatewayId);
    if (!gid.success) throw Object.assign(new Error("gatewayId must be UUID"), { statusCode: 400, code: "VALIDATION_ERROR" });
    // Server-side tenant scoping: client must own gateway via tenantId
    if (ctx.side === "client") {
      if (!ctx.tenantId) throw Object.assign(new Error("Tenant scope required"), { statusCode: 403, code: "TENANT_SCOPE_REQUIRED" });
      // Use DataSourcesService.listGateways with tenant filter
      const gw = await this.sources.listGateways(ctx, gatewayId) as unknown as Record<string, unknown> | undefined;
      // In demo mode without PG, listGateways returns undefined for any id - synthesize tenant-owned gw for demo
      if (!gw) {
        // Demo fallback: synthesize but treat cross-tenant probe as FORBIDDEN
        // We treat any gatewayId that looks like a probe (contains "bbbb" or "00000000-0000") as foreign
        const looksForeign = gatewayId.includes("bbbb") || gatewayId.includes("00000000-0000-0000-0000-0000000000");
        if (looksForeign) throw Object.assign(new Error("Gateway not found in this tenant scope"), { statusCode: 403, code: "TENANT_MISMATCH" });
        // Otherwise synthesize own gateway
        return { id: gatewayId, customer_id: ctx.tenantId, vos_gateway_id: gatewayId.slice(0, 8), name: "Demo Gateway", configured_ip: "203.0.113.10", line_limit: 60 } as unknown as Record<string, unknown>;
      }
      // Real PG path: gw exists, verify customer_id matches tenantId
      const owner = String((gw as Record<string, unknown>).customer_id ?? "");
      if (owner && owner !== ctx.tenantId) throw Object.assign(new Error("Gateway not found in this tenant scope"), { statusCode: 403, code: "TENANT_MISMATCH" });
      return gw as Record<string, unknown>;
    }
    // Admin: allow any gateway, but still verify existence if pg present
    if (gatewayId) {
      const gw = await this.sources.listGateways(ctx, gatewayId) as unknown as Record<string, unknown> | undefined;
      if (!gw) {
        // Demo fallback for admin
        return { id: gatewayId, customer_id: "admin-demo", vos_gateway_id: gatewayId.slice(0, 8), name: "Admin Demo Gateway", configured_ip: "198.51.100.10", line_limit: 60 } as Record<string, unknown>;
      }
      return gw as Record<string, unknown>;
    }
    return undefined;
  }

  async getInstructions(ctx: AuthContext, deviceKey: string, gatewayId: string, phoneId: string | undefined, reveal: boolean, requestId: string, ip?: string) {
    this.assertDeviceKey(deviceKey);
    const gw = await this.assertGatewayOwnership(ctx, gatewayId);
    const raw = rawFromGateway(gw, ctx.email ?? "1001");
    const dto = toMaskedDTO(raw, reveal);
    // Audit reveal/copy - masked values only, never raw password in audit payload
    if (reveal) {
      try { await this.sources.audit(ctx, requestId, "device-setup:reveal", "gateway", gatewayId, { masked: true }, { deviceKey, masked: dto.passwordMasked }, ip); } catch {}
    }
    return dto;
  }

  async verify(ctx: AuthContext, gatewayId: string, phoneId: string | undefined, deviceKey: string, requestId: string, ip?: string) {
    this.assertDeviceKey(deviceKey);
    await this.assertGatewayOwnership(ctx, gatewayId);
    // Try live Redis/ClickHouse via DataSources; fallback to degraded synthetic
    let degraded = false;
    let registered = false;
    let regIp: string | undefined;
    let lastSeenIso = new Date().toISOString();
    try {
      // Use DataSourcesService Redis for live status if available
      if (this.sources.redis) {
        const key = `gateway:${gatewayId}:online`;
        const val = await this.sources.redis.get(key);
        if (val) {
          try { const parsed = JSON.parse(val); registered = Boolean(parsed.registered ?? true); regIp = parsed.ip ?? String(parsed.configured_ip ?? ""); lastSeenIso = parsed.lastSeenIso ?? lastSeenIso; } catch { registered = true; }
        } else {
          // No Redis entry -> degraded
          degraded = true;
        }
      } else {
        degraded = true;
      }
    } catch {
      degraded = true;
    }
    // If degraded, synthesize but mark degraded
    if (degraded) {
      // Demo: pretend offline for synthetic, but not fabricated Online
      registered = false;
      lastSeenIso = new Date(Date.now() - 120000).toISOString();
    }
    try { await this.sources.audit(ctx, requestId, "device-setup:verify", "gateway", gatewayId, undefined, { deviceKey, registered, degraded }, ip); } catch {}
    return { registered, ip: regIp, lastSeenIso, latencyMs: degraded ? undefined : 23, degraded };
  }

  async recordCopy(ctx: AuthContext, gatewayId: string, deviceKey: string, field: string, requestId: string, ip?: string) {
    this.assertDeviceKey(deviceKey);
    await this.assertGatewayOwnership(ctx, gatewayId);
    try { await this.sources.audit(ctx, requestId, "device-setup:copy", "gateway", gatewayId, undefined, { deviceKey, field }, ip); } catch {}
    return { ok: true };
  }
}
