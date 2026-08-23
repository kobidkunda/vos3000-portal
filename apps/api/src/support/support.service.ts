import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { DataSourcesService } from "../data-sources.service.js";
import {
  type SupportConfigData,
  type SupportConfigPutBody,
  buildSupportConfigData,
  defaultSupportConfig,
} from "@vos/shared";

const REDIS_KEY = "support:config";
const REDIS_TTL_SECONDS = 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Demo mode (no PostgreSQL) in-process store so admin saves round-trip for the
// running instance. External mode always uses portal_resources and never this.
let demoStore: SupportConfigData | null = null;

@Injectable()
export class SupportService {
  constructor(
    @Inject(forwardRef(() => DataSourcesService))
    private sources: DataSourcesService
  ) {}

  /**
   * Global support contacts config. Redis fast-path (60s TTL) -> PostgreSQL
   * portal_resources (organization_id IS NULL, resource_type='support_config',
   * resource_key='global'). Demo mode (no PG) returns defaults; external mode
   * with a failing PG fails closed with 503 DEGRADED instead of fabricating data.
   */
  async getSupportConfig(): Promise<SupportConfigData> {
    try {
      if (this.sources.redis?.isOpen) {
        const cached = await this.sources.redis.get(REDIS_KEY);
        if (cached) return JSON.parse(cached) as SupportConfigData;
      }
    } catch {
      // Redis unavailable -> fall through to DB; never fail reads on cache errors
    }

    let data: SupportConfigData | null = null;
    if (this.sources.pg) {
      try {
        const res = await this.sources.pg.query(
          `SELECT data FROM portal_resources
           WHERE organization_id IS NULL AND resource_type = 'support_config' AND resource_key = 'global'
           LIMIT 1`
        );
        const raw = res.rowCount ? res.rows[0]?.data : null;
        if (raw && typeof raw === "object") data = raw as SupportConfigData;
      } catch (e: any) {
        const err: any = new Error(`Support config storage unavailable: ${e?.message ?? "postgres error"}`);
        err.code = "DEGRADED";
        err.statusCode = 503;
        throw err;
      }
    } else {
      data = demoStore;
    }

    const out = data ?? defaultSupportConfig();
    try {
      if (this.sources.redis?.isOpen) {
        await this.sources.redis.set(REDIS_KEY, JSON.stringify(out), { EX: REDIS_TTL_SECONDS });
      }
    } catch {
      // Cache write is best-effort only
    }
    return out;
  }

  /**
   * Validate + persist global support config, then invalidate the Redis cache.
   * Throws VALIDATION_ERROR (with .details[]) on invalid input via buildSupportConfigData.
   */
  async saveSupportConfig(input: SupportConfigPutBody, actorUserId: string): Promise<SupportConfigData> {
    let prev: SupportConfigData | null = null;
    try {
      prev = await this.getSupportConfig();
    } catch {
      prev = null;
    }
    const next = buildSupportConfigData(input, prev, actorUserId);

    if (this.sources.pg) {
      const actorUuid = UUID_RE.test(String(actorUserId ?? "")) ? String(actorUserId) : null;
      await this.sources.pg.query(
        `INSERT INTO portal_resources (organization_id, resource_type, resource_key, data, updated_by, updated_at)
         VALUES (NULL, 'support_config', 'global', $1::jsonb, $2::uuid, now())
         ON CONFLICT (organization_id, resource_type, resource_key)
         DO UPDATE SET data = EXCLUDED.data, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [JSON.stringify(next), actorUuid]
      );
    } else {
      demoStore = next;
    }

    try {
      if (this.sources.redis?.isOpen) await this.sources.redis.del(REDIS_KEY);
    } catch {
      // Invalidation is best-effort; TTL bounds staleness at 60s anyway
    }
    return next;
  }
}
