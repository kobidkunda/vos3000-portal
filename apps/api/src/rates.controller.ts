import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { AuthService } from "./auth.service.js";
import { DataSourcesService } from "./data-sources.service.js";
import { RateManagementService, DecimalUtil } from "./rate-management.service.js";
import { authorizeProductApi, validateBrowserOrigin } from "./access-policy.js";
import { parseTelecomPhone, getCountryName, normalizeTelecomString } from "@vos/shared";

const rid = () => crypto.randomUUID();

@ApiTags("admin-rates")
@Controller("api/v1")
export class RatesController {
  constructor(
    @Inject(AuthService) private auth: AuthService,
    @Inject(DataSourcesService) private sources: DataSourcesService,
    @Inject(RateManagementService) private rateEngine: RateManagementService
  ) {}

  private async ctx(req: FastifyRequest) {
    return this.auth.resolveContext(req.headers as any, req.ip);
  }

  private originOk(req: FastifyRequest, method: string) {
    const source = this.auth.tokenFromHeaders(req.headers as any)?.source;
    return validateBrowserOrigin(req.headers as any, method, source);
  }

  private checkAdminAuth(c: any, method: string, pathName: string) {
    if (!c) {
      return { ok: false, statusCode: 401, code: "UNAUTHENTICATED", message: "Authentication required" };
    }
    if (c.side !== "admin") {
      return { ok: false, statusCode: 403, code: "FORBIDDEN", message: "Admin session required" };
    }
    return authorizeProductApi(c, {
      method: method as any,
      path: pathName,
      sides: ["Admin"],
      pages: ["Rate Management"],
      pageRoutes: ["/admin/rates"]
    } as any);
  }

  // -------------------------------------------------------------------------
  // 1. GET /api/v1/admin/rates/groups
  // -------------------------------------------------------------------------
  @Get("admin/rates/groups")
  async listRateGroups(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "GET", "/api/v1/admin/rates/groups");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }

    try {
      const url = new URL(req.url, "http://internal");
      const search = url.searchParams.get("search") || undefined;
      const side = url.searchParams.get("side") || undefined;
      const status = url.searchParams.get("status") || undefined;

      const groups = await this.sources.listRateGroups(c, search, side, status);
      return { ok: true, request_id, data: groups };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "LIST_RATE_GROUPS_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 2. POST /api/v1/admin/rates/groups
  // -------------------------------------------------------------------------
  @Post("admin/rates/groups")
  async createRateGroup(@Body() body: any, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/groups");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "POST")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const name = String(body?.name ?? "").trim();
      if (!name) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "Rate group name is required" } };
      }
      const created = await this.sources.createRateGroup(c!, body);
      await this.sources.audit(c, request_id, "POST /api/v1/admin/rates/groups", "rate_group", String(created.id), undefined, created, req.ip);
      await this.sources.publish("portal.events", {
        id: request_id,
        type: "portal.rate_group.created",
        organization_id: c?.organizationId,
        rate_group_id: created.id,
        actor: c?.userId,
        created_at: new Date().toISOString()
      }, request_id);

      return { ok: true, request_id, data: created };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "CREATE_RATE_GROUP_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 3. GET /api/v1/admin/rates/groups/:id
  // -------------------------------------------------------------------------
  @Get("admin/rates/groups/:id")
  async getRateGroupDetail(@Param("id") id: string, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "GET", "/api/v1/admin/rates/groups/{id}");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }

    try {
      const group = await this.sources.getRateGroupById(c, id);
      return { ok: true, request_id, data: group };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "GET_RATE_GROUP_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 4. PATCH /api/v1/admin/rates/groups/:id
  // -------------------------------------------------------------------------
  @Patch("admin/rates/groups/:id")
  async updateRateGroup(@Param("id") id: string, @Body() body: any, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "PATCH", "/api/v1/admin/rates/groups/{id}");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "PATCH")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const before = await this.sources.getRateGroupById(c, id);
      const updated = await this.sources.updateRateGroup(c!, id, body);
      await this.sources.audit(c, request_id, `PATCH /api/v1/admin/rates/groups/${id}`, "rate_group", id, before, updated, req.ip);
      await this.sources.publish("portal.events", {
        id: request_id,
        type: "portal.rate_group.updated",
        organization_id: c?.organizationId,
        rate_group_id: id,
        actor: c?.userId,
        created_at: new Date().toISOString()
      }, request_id);

      return { ok: true, request_id, data: updated };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "UPDATE_RATE_GROUP_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 5. DELETE /api/v1/admin/rates/groups/:id
  // -------------------------------------------------------------------------
  @Delete("admin/rates/groups/:id")
  async deleteRateGroup(@Param("id") id: string, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "DELETE", "/api/v1/admin/rates/groups/{id}");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "DELETE")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const before = await this.sources.getRateGroupById(c, id).catch(() => undefined);
      const deleted = await this.sources.deleteRateGroup(c!, id);
      await this.sources.audit(c, request_id, `DELETE /api/v1/admin/rates/groups/${id}`, "rate_group", id, before, undefined, req.ip);
      await this.sources.publish("portal.events", {
        id: request_id,
        type: "portal.rate_group.deleted",
        organization_id: c?.organizationId,
        rate_group_id: id,
        actor: c?.userId,
        created_at: new Date().toISOString()
      }, request_id);

      return { ok: true, request_id, data: deleted };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "DELETE_RATE_GROUP_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 6. POST /api/v1/admin/rates/groups/:id/duplicate
  // -------------------------------------------------------------------------
  @Post("admin/rates/groups/:id/duplicate")
  async duplicateRateGroup(@Param("id") id: string, @Body() body: any, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/groups/{id}/duplicate");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "POST")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const newName = String(body?.new_name || body?.name || "").trim();
      if (!newName) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "new_name is required for duplication" } };
      }

      const cloned = await this.sources.duplicateRateGroup(c!, id, newName, body?.side, body?.memo);
      await this.sources.audit(c, request_id, `POST /api/v1/admin/rates/groups/${id}/duplicate`, "rate_group", String(cloned.id), { source_id: id }, cloned, req.ip);
      await this.sources.publish("portal.events", {
        id: request_id,
        type: "portal.rate_group.duplicated",
        organization_id: c?.organizationId,
        source_rate_group_id: id,
        new_rate_group_id: cloned.id,
        actor: c?.userId,
        created_at: new Date().toISOString()
      }, request_id);

      return { ok: true, request_id, data: cloned };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "DUPLICATE_RATE_GROUP_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 7. GET /api/v1/admin/rates/groups/:id/rates
  // -------------------------------------------------------------------------
  @Get("admin/rates/groups/:id/rates")
  async listGroupRates(@Param("id") id: string, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "GET", "/api/v1/admin/rates/groups/{id}/rates");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }

    try {
      const url = new URL(req.url, "http://internal");
      const query = {
        prefix: url.searchParams.get("prefix") || undefined,
        country: url.searchParams.get("country") || undefined,
        area_name: url.searchParams.get("area_name") || undefined,
        rate_type: url.searchParams.get("rate_type") || undefined,
        status: url.searchParams.get("status") || undefined,
        page: url.searchParams.get("page") || undefined,
        limit: url.searchParams.get("limit") || undefined,
        sort_by: url.searchParams.get("sort_by") || undefined,
        sort_dir: url.searchParams.get("sort_dir") || undefined
      };

      const data = await this.sources.listRatesPaginated(c!, id, query);
      return { ok: true, request_id, data };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "LIST_RATES_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 8. POST /api/v1/admin/rates/groups/:id/rates
  // -------------------------------------------------------------------------
  @Post("admin/rates/groups/:id/rates")
  async createGroupRate(@Param("id") id: string, @Body() body: any, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/groups/{id}/rates");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "POST")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const ratePerMin = Number(body?.rate_per_minute);
      if (body?.rate_per_minute === undefined || isNaN(ratePerMin) || ratePerMin < 0) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "Rate per minute must be >= 0" } };
      }
      const prefix = String(body?.prefix || "").replace(/\D/g, "");
      if (!prefix) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "Prefix is required and must contain digits" } };
      }

      const created = await this.sources.createRate(c!, { ...body, rate_group_id: id, prefix });
      await this.sources.audit(c, request_id, `POST /api/v1/admin/rates/groups/${id}/rates`, "rate", String(created.id), undefined, created, req.ip);
      return { ok: true, request_id, data: created };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "CREATE_RATE_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 9. PATCH /api/v1/admin/rates/groups/:id/rates/:rateId
  // -------------------------------------------------------------------------
  @Patch("admin/rates/groups/:id/rates/:rateId")
  async updateGroupRate(
    @Param("id") id: string,
    @Param("rateId") rateId: string,
    @Body() body: any,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "PATCH", "/api/v1/admin/rates/groups/{id}/rates/{rateId}");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "PATCH")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      if (body?.rate_per_minute !== undefined) {
        const rpm = Number(body.rate_per_minute);
        if (isNaN(rpm) || rpm < 0) {
          res.status(400);
          return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "Rate per minute must be >= 0" } };
        }
      }

      const before = await this.sources.getRateById(c, rateId, id);
      const updated = await this.sources.updateRate(c!, id, rateId, body);
      await this.sources.audit(c, request_id, `PATCH /api/v1/admin/rates/groups/${id}/rates/${rateId}`, "rate", rateId, before, updated, req.ip);
      return { ok: true, request_id, data: updated };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "UPDATE_RATE_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 10. DELETE /api/v1/admin/rates/groups/:id/rates/:rateId
  // -------------------------------------------------------------------------
  @Delete("admin/rates/groups/:id/rates/:rateId")
  async deleteGroupRate(
    @Param("id") id: string,
    @Param("rateId") rateId: string,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "DELETE", "/api/v1/admin/rates/groups/{id}/rates/{rateId}");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "DELETE")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const deleted = await this.sources.deleteRate(c!, rateId, id);
      await this.sources.audit(c, request_id, `DELETE /api/v1/admin/rates/groups/${id}/rates/${rateId}`, "rate", rateId, deleted, undefined, req.ip);
      return { ok: true, request_id, data: { deleted: true, id: rateId, ...deleted } };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "DELETE_RATE_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 11. POST /api/v1/admin/rates/groups/:id/bulk-adjust
  // -------------------------------------------------------------------------
  @Post("admin/rates/groups/:id/bulk-adjust")
  async bulkAdjustRates(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply
  ) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/groups/{id}/bulk-adjust");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "POST")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const adjType = body?.adjustment_type === "fixed" ? "fixed" : "percentage";
      const val = Number(body?.value);
      if (body?.value === undefined || isNaN(val)) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "Adjustment value must be a valid number" } };
      }

      const result = await this.sources.bulkAdjustRates(c!, id, body);
      await this.sources.audit(c, request_id, `POST /api/v1/admin/rates/groups/${id}/bulk-adjust`, "rate_group", id, undefined, result, req.ip);
      await this.sources.publish("portal.events", {
        id: request_id,
        type: "portal.rates.bulk_adjusted",
        organization_id: c?.organizationId,
        rate_group_id: id,
        actor: c?.userId,
        stats: result,
        created_at: new Date().toISOString()
      }, request_id);

      return { ok: true, request_id, data: result };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "BULK_ADJUST_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 12. POST /api/v1/admin/rates/imports/preview
  // -------------------------------------------------------------------------
  @Post("admin/rates/imports/preview")
  async previewRateImport(@Body() body: any, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/imports/preview");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }

    try {
      const rateGroupId = String(body?.rate_group_id || body?.rateGroupId || "").trim();
      if (!rateGroupId) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "rate_group_id is required" } };
      }
      const fileContent = String(body?.file_content || body?.content || "");
      if (!fileContent.trim()) {
        res.status(400);
        return { ok: false, request_id, error: { code: "EMPTY_RATE_SHEET", message: "Rate sheet contains no valid rate rows" } };
      }

      const mode = body?.mode === "replace" || body?.strategy === "replace" ? "replace" : "merge";
      const delimiter = body?.delimiter || this.rateEngine.detectDelimiter(fileContent);
      const parsed = this.rateEngine.parseCsvRows(fileContent, delimiter, body?.column_mapping);

      if (parsed.rows.length === 0) {
        res.status(400);
        return { ok: false, request_id, error: { code: "EMPTY_RATE_SHEET", message: "Rate sheet contains no data rows" } };
      }

      const existingRates = await this.sources.listRates(c!, undefined, rateGroupId);
      const diffResult = this.rateEngine.calculateDryRunDiff(existingRates, parsed.rows, mode);

      return {
        ok: true,
        request_id,
        data: {
          delimiter,
          headers: parsed.headers,
          ...diffResult
        }
      };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "IMPORT_PREVIEW_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 13. POST /api/v1/admin/rates/imports/process
  // -------------------------------------------------------------------------
  @Post("admin/rates/imports/process")
  async processRateImport(@Body() body: any, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/imports/process");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "POST")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const rateGroupId = String(body?.rate_group_id || body?.rateGroupId || "").trim();
      if (!rateGroupId) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "rate_group_id is required" } };
      }
      const fileContent = String(body?.file_content || body?.content || "");
      if (!fileContent.trim()) {
        res.status(400);
        return { ok: false, request_id, error: { code: "EMPTY_RATE_SHEET", message: "Rate sheet contains no valid rate rows" } };
      }

      const mode = body?.mode === "replace" || body?.strategy === "replace" ? "replace" : "merge";
      const delimiter = body?.delimiter || this.rateEngine.detectDelimiter(fileContent);
      const parsed = this.rateEngine.parseCsvRows(fileContent, delimiter, body?.column_mapping);

      const validRows = parsed.rows.filter((r) => !r.error);
      if (validRows.length === 0) {
        res.status(400);
        return {
          ok: false,
          request_id,
          error: {
            code: "VALIDATION_ERROR",
            message: "No valid rate rows found in the import sheet",
            details: parsed.rows.map((r) => ({ row_number: r.row_number, error: r.error }))
          }
        };
      }

      const importResult = await this.sources.batchUpsertRates(
        c!,
        rateGroupId,
        validRows,
        mode,
        body?.file_name || body?.filename,
        body?.reason
      );

      await this.sources.audit(c, request_id, "POST /api/v1/admin/rates/imports/process", "rate_import", String(importResult.import_id || rateGroupId), undefined, importResult, req.ip);
      await this.sources.publish("portal.events", {
        id: request_id,
        type: "portal.rates.imported",
        organization_id: c?.organizationId,
        rate_group_id: rateGroupId,
        actor: c?.userId,
        stats: importResult,
        created_at: new Date().toISOString()
      }, request_id);

      return {
        ok: true,
        request_id,
        data: {
          ...importResult,
          valid_rows: validRows.length,
          error_rows: parsed.rows.length - validRows.length
        }
      };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "IMPORT_PROCESS_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 14. GET /api/v1/admin/rates/imports/history
  // -------------------------------------------------------------------------
  @Get("admin/rates/imports/history")
  async getRateImportHistory(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "GET", "/api/v1/admin/rates/imports/history");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }

    try {
      const url = new URL(req.url, "http://internal");
      const groupId = url.searchParams.get("rate_group_id") || undefined;
      const page = parseInt(url.searchParams.get("page") || "1", 10) || 1;
      const limit = parseInt(url.searchParams.get("limit") || "20", 10) || 20;

      const history = await this.sources.listRateImportHistory(c!, groupId, page, limit);
      return { ok: true, request_id, data: history };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "IMPORT_HISTORY_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // 15. POST /api/v1/admin/rates/lookup
  // -------------------------------------------------------------------------
  @Post("admin/rates/lookup")
  async adminRateLookup(@Body() body: any, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/lookup");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }

    try {
      const destination = String(body?.destination || body?.number || "").trim();
      if (!destination) {
        res.status(400);
        return { ok: false, request_id, error: { code: "VALIDATION_ERROR", message: "destination dial string is required" } };
      }
      const customerGroupId = body?.customer_rate_group_id || body?.customerGroupId;
      const carrierGroupId = body?.carrier_rate_group_id || body?.carrierGroupId;
      const durationSeconds = Math.max(0, parseInt(body?.duration_seconds || body?.duration || "60", 10) || 60);

      const result = await this.sources.longestPrefixLookup(destination, customerGroupId, carrierGroupId, durationSeconds);
      return { ok: true, request_id, data: result };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "LOOKUP_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // Snapshot Rollback Endpoint
  // -------------------------------------------------------------------------
  @Post("admin/rates/snapshots/:id/rollback")
  async rollbackRateSnapshot(@Param("id") id: string, @Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    const authCheck = this.checkAdminAuth(c, "POST", "/api/v1/admin/rates/snapshots/{id}/rollback");
    if (!authCheck.ok) {
      res.status(authCheck.statusCode!);
      return { ok: false, request_id, error: { code: authCheck.code, message: authCheck.message } };
    }
    if (!this.originOk(req, "POST")) {
      res.status(403);
      return { ok: false, request_id, error: { code: "INVALID_ORIGIN", message: "Browser origin rejected" } };
    }

    try {
      const result = await this.sources.rollbackRateSnapshot(c!, id);
      await this.sources.audit(c, request_id, `POST /api/v1/admin/rates/snapshots/${id}/rollback`, "rate_snapshot", id, undefined, result, req.ip);
      await this.sources.publish("portal.events", {
        id: request_id,
        type: "portal.rates.rolled_back",
        organization_id: c?.organizationId,
        snapshot_id: id,
        rate_group_id: result.rate_group_id,
        actor: c?.userId,
        created_at: new Date().toISOString()
      }, request_id);

      return { ok: true, request_id, data: result };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "ROLLBACK_FAILED", message: e.message } };
    }
  }

  // -------------------------------------------------------------------------
  // Client Scoped Rate Sheet & Lookup Endpoints
  // -------------------------------------------------------------------------
  @Get("rates")
  async clientRateSheet(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) {
      res.status(401);
      return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } };
    }
    if (c.side !== "client" && c.side !== "admin") {
      res.status(403);
      return { ok: false, request_id, error: { code: "FORBIDDEN", message: "Client session required" } };
    }

    try {
      const rates = await this.sources.listRates(c);
      // Client response scrubs carrier fields
      const scrubbed = rates.map((r: any) => ({
        prefix: r.prefix,
        area_name: r.area_name,
        rate_type: r.rate_type,
        rate_per_minute: r.rate_per_minute,
        billing_cycle_seconds: r.billing_cycle_seconds || r.initial_interval || 60
      }));
      return { ok: true, request_id, data: { items: scrubbed, source: "postgres" } };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "CLIENT_RATES_FAILED", message: e.message } };
    }
  }

  @Get("rates/lookup")
  async clientRateLookupGet(@Req() req: FastifyRequest, @Res({ passthrough: true }) res: FastifyReply) {
    const request_id = rid();
    const c = await this.ctx(req);
    if (!c) {
      res.status(401);
      return { ok: false, request_id, error: { code: "UNAUTHENTICATED", message: "Authentication required" } };
    }
    try {
      const url = new URL(req.url, "http://internal");
      const number = url.searchParams.get("number") || url.searchParams.get("destination") || "";
      const match: any = await this.sources.listRates(c, number);
      if (!match) {
        return { ok: true, request_id, data: { items: [] } };
      }
      // Client-safe projection only: never expose carrier cost, rate_group_id or internal IDs.
      return {
        ok: true,
        request_id,
        data: {
          items: [
            {
              prefix: match.prefix,
              area_name: match.area_name,
              country_code: match.country_code,
              country_name: match.country_name,
              rate_type: match.rate_type,
              rate_per_minute: match.rate_per_minute,
              billing_cycle_seconds: match.billing_cycle_seconds || 60,
              initial_interval: match.initial_interval || match.billing_cycle_seconds || 60,
              increment_interval: match.increment_interval || 1,
            }
          ]
        }
      };
    } catch (e: any) {
      res.status(e.statusCode ?? 500);
      return { ok: false, request_id, error: { code: e.code ?? "CLIENT_LOOKUP_FAILED", message: e.message } };
    }
  }
}
