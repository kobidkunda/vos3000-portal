import { Body, Controller, Get, Post, Query, Req, Res, Inject } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { AuthService } from "../auth.service.js";
import { DataSourcesService } from "../data-sources.service.js";
import { DevicesSetupService } from "./service.js";
import { authorizeProductApi } from "../access-policy.js";
import { productApis } from "@vos/shared";
import { z } from "zod";

const rid = () => crypto.randomUUID();

@Controller("api/v1")
export class DevicesSetupController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(DataSourcesService) private readonly sources: DataSourcesService,
    @Inject(DevicesSetupService) private readonly svc: DevicesSetupService,
  ) {}

  private async ctx(req: FastifyRequest) {
    return this.auth.resolveContext(req.headers as unknown as Record<string, unknown>, req.ip);
  }

  private denyFor(c: unknown, method: string, path: string) {
    const def = productApis.find((d) => d.method === method && d.path === path);
    // widen type for authorizeProductApi
    return def ? authorizeProductApi(c as Parameters<typeof authorizeProductApi>[0], def as Parameters<typeof authorizeProductApi>[1]) : { ok: true } as const;
  }

  // Client

  @Get("devices/setup/devices")
  async listClientDevices(@Query() q: Record<string, unknown>, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) { res.status(401); return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }; }
    const decision = this.denyFor(c, "GET", "/api/v1/devices/setup/devices");
    if (!decision.ok) { res.status((decision as { statusCode?: number }).statusCode ?? 403); return { ok: false, request_id, error: { code: (decision as {code:string}).code, message: (decision as {message:string}).message } }; }
    const category = typeof q.category === "string" ? q.category : undefined;
    const search = typeof q.search === "string" ? q.search : undefined;
    return { ok: true, request_id, data: this.svc.listDevices(category, search) };
  }

  @Get("devices/setup/instructions")
  async clientInstructions(@Query() q: Record<string, unknown>, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) { res.status(401); return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }; }
    const decision = this.denyFor(c, "GET", "/api/v1/devices/setup/instructions");
    if (!decision.ok) { res.status((decision as { statusCode?: number }).statusCode ?? 403); return { ok: false, request_id, error: { code: (decision as {code:string}).code, message: (decision as {message:string}).message } }; }
    const deviceKey = String(q.deviceKey ?? q.devicekey ?? "");
    const gatewayId = String(q.gatewayId ?? "");
    const phoneId = q.phoneId ? String(q.phoneId) : undefined;
    const reveal = q.reveal === "1" || q.reveal === true || q.reveal === "true";
    if (!deviceKey || !gatewayId) { res.status(400); return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "deviceKey and gatewayId required" } }; }
    try {
      const data = await this.svc.getInstructions(c as unknown as import("@vos/shared").AuthContext, deviceKey, gatewayId, phoneId, reveal, request_id, req.ip);
      return { ok: true, request_id, data };
    } catch (e: unknown) {
      const err = e as { statusCode?: number; code?: string; message?: string };
      res.status(err.statusCode ?? 500);
      return { ok: false, request_id, error: { code: err.code ?? "DEVICE_SETUP_ERROR", message: err.message ?? String(e) } };
    }
  }

  @Post("devices/setup/verify")
  async clientVerify(@Body() body: Record<string, unknown>, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) { res.status(401); return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }; }
    const decision = this.denyFor(c, "POST", "/api/v1/devices/setup/verify");
    if (!decision.ok) { res.status((decision as { statusCode?: number }).statusCode ?? 403); return { ok: false, request_id, error: { code: (decision as {code:string}).code, message: (decision as {message:string}).message } }; }
    const gatewayId = String(body.gatewayId ?? "");
    const phoneId = body.phoneId ? String(body.phoneId) : undefined;
    const deviceKey = String(body.deviceKey ?? "");
    if (!gatewayId || !deviceKey) { res.status(400); return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "gatewayId and deviceKey required" } }; }
    try {
      const data = await this.svc.verify(c as unknown as import("@vos/shared").AuthContext, gatewayId, phoneId, deviceKey, request_id, req.ip);
      return { ok: true, request_id, data };
    } catch (e: unknown) {
      const err = e as { statusCode?: number; code?: string; message?: string };
      res.status(err.statusCode ?? 500);
      return { ok: false, request_id, error: { code: err.code ?? "VERIFY_FAILED", message: err.message ?? String(e) } };
    }
  }

  @Post("devices/setup/copy-event")
  async clientCopy(@Body() body: Record<string, unknown>, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) { res.status(401); return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }; }
    const gatewayId = String(body.gatewayId ?? "");
    const deviceKey = String(body.deviceKey ?? "");
    const field = String(body.field ?? "unknown");
    if (!gatewayId || !deviceKey) { res.status(400); return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "gatewayId and deviceKey required" } }; }
    try {
      const data = await this.svc.recordCopy(c as unknown as import("@vos/shared").AuthContext, gatewayId, deviceKey, field, request_id, req.ip);
      return { ok: true, request_id, data };
    } catch (e: unknown) {
      const err = e as { statusCode?: number; code?: string; message?: string };
      res.status(err.statusCode ?? 500);
      return { ok: false, request_id, error: { code: err.code ?? "COPY_EVENT_FAILED", message: err.message ?? String(e) } };
    }
  }

  // Admin mirrors

  @Get("admin/devices/setup/devices")
  async listAdminDevices(@Query() q: Record<string, unknown>, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) { res.status(401); return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }; }
    const decision = this.denyFor(c, "GET", "/api/v1/admin/devices/setup/devices");
    if (!decision.ok) { res.status((decision as { statusCode?: number }).statusCode ?? 403); return { ok: false, request_id, error: { code: (decision as {code:string}).code, message: (decision as {message:string}).message } }; }
    const category = typeof q.category === "string" ? q.category : undefined;
    const search = typeof q.search === "string" ? q.search : undefined;
    return { ok: true, request_id, data: this.svc.listDevices(category, search) };
  }

  @Get("admin/devices/setup/instructions")
  async adminInstructions(@Query() q: Record<string, unknown>, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) { res.status(401); return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }; }
    const decision = this.denyFor(c, "GET", "/api/v1/admin/devices/setup/instructions");
    if (!decision.ok) { res.status((decision as { statusCode?: number }).statusCode ?? 403); return { ok: false, request_id, error: { code: (decision as {code:string}).code, message: (decision as {message:string}).message } }; }
    const deviceKey = String(q.deviceKey ?? "");
    const gatewayId = String(q.gatewayId ?? "");
    const phoneId = q.phoneId ? String(q.phoneId) : undefined;
    const reveal = q.reveal === "1" || q.reveal === true || q.reveal === "true";
    if (!deviceKey || !gatewayId) { res.status(400); return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "deviceKey and gatewayId required" } }; }
    try {
      const data = await this.svc.getInstructions(c as unknown as import("@vos/shared").AuthContext, deviceKey, gatewayId, phoneId, reveal, request_id, req.ip);
      return { ok: true, request_id, data };
    } catch (e: unknown) {
      const err = e as { statusCode?: number; code?: string; message?: string };
      res.status(err.statusCode ?? 500);
      return { ok: false, request_id, error: { code: err.code ?? "DEVICE_SETUP_ERROR", message: err.message ?? String(e) } };
    }
  }

  @Post("admin/devices/setup/verify")
  async adminVerify(@Body() body: Record<string, unknown>, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) { res.status(401); return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } }; }
    const decision = this.denyFor(c, "POST", "/api/v1/admin/devices/setup/verify");
    if (!decision.ok) { res.status((decision as { statusCode?: number }).statusCode ?? 403); return { ok: false, request_id, error: { code: (decision as {code:string}).code, message: (decision as {message:string}).message } }; }
    const gatewayId = String(body.gatewayId ?? "");
    const phoneId = body.phoneId ? String(body.phoneId) : undefined;
    const deviceKey = String(body.deviceKey ?? "");
    if (!gatewayId || !deviceKey) { res.status(400); return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "gatewayId and deviceKey required" } }; }
    try {
      const data = await this.svc.verify(c as unknown as import("@vos/shared").AuthContext, gatewayId, phoneId, deviceKey, request_id, req.ip);
      return { ok: true, request_id, data };
    } catch (e: unknown) {
      const err = e as { statusCode?: number; code?: string; message?: string };
      res.status(err.statusCode ?? 500);
      return { ok: false, request_id, error: { code: err.code ?? "VERIFY_FAILED", message: err.message ?? String(e) } };
    }
  }
}
