/**
 * Alarm Center — real alarm derivation.
 *
 * Alarms are NEVER fabricated. Every row is derived from verified state:
 *  - VOS mapping gateways (GetGatewayMapping.jsp, verified live against the
 *    production engine) — locked gateways, unmanaged mappings, missing mappings
 *  - PostgreSQL customers/gateways — balance vs overdraft, account expiry,
 *    portal gateways not present in the VOS mapping
 *  - VOS current calls (GetCurrentCalls.jsp) — capacity pressure per gateway
 *
 * Secret VOS fields (SIP passwords etc.) are never read: this module only
 * extracts the whitelisted fields below.
 */

export type AlarmSeverity = "critical" | "warning" | "info";
export type AlarmState = "open" | "acknowledged";

export interface AlarmSourceCustomer {
  id: string;
  account_name?: string;
  vos_account_id?: string | null;
  currency?: string | null;
  balance?: string | number | null;
  overdraft_limit?: string | number | null;
  expires_at?: string | null;
  status?: string | null;
}

export interface AlarmSourceGateway {
  id: string;
  vos_gateway_id?: string | null;
  name?: string | null;
  kind?: string | null;
  status?: string | null;
  configured_ip?: string | null;
  customer_id?: string | null;
}

export interface AlarmSourceVosGateway {
  /** VOS gateway name — whitelisted fields only, never credentials. */
  name: string;
  lockType?: number;
  registerType?: number;
  capacity?: number;
  remoteIps?: string;
}

export interface AlarmAckState {
  acked_by?: string;
  acked_at?: string;
  note?: string;
}

export interface AlarmRow {
  id: string;
  severity: AlarmSeverity;
  type: string;
  source: "gateway" | "customer" | "vos";
  gateway?: string;
  customer?: string;
  account?: string;
  message: string;
  state: AlarmState;
  first_seen: string;
  last_seen: string;
  acked_by?: string;
  acked_at?: string;
  note?: string;
  /** capacity_pressure only: measured active calls vs configured capacity */
  active_calls?: number;
  capacity?: number;
  balance?: number;
  overdraft?: number;
  expires_at?: string;
}

export interface DeriveAlarmsInput {
  customers?: AlarmSourceCustomer[];
  gateways?: AlarmSourceGateway[];
  vosGateways?: AlarmSourceVosGateway[];
  /** active call count per VOS gateway name (from GetCurrentCalls.jsp) */
  currentCallsByGateway?: Record<string, number>;
  /** total measured current calls (capacity pressure signal aggregation) */
  currentCalls?: number;
  acks?: Map<string, AlarmAckState>;
  now?: Date;
  /**
   * True only when a live VOS probe SUCCEEDED. When false, VOS-dependent rules
   * (locked, missing, unmanaged, capacity) are suppressed: an absent gateway
   * cannot be proven while the engine state is unreachable, and fabricating
   * drift alarms from a failed probe would be dishonest.
   */
  vosAvailable?: boolean;
}

const DAY = 86_400_000;

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function iso(d: Date): string {
  return d.toISOString();
}

/** Stable, addressable fingerprint for an alarm condition. */
function fingerprint(kind: string, key: string): string {
  return `${kind}:${key}`;
}

export function deriveAlarms(input: DeriveAlarmsInput = {}): AlarmRow[] {
  const now = input.now ?? new Date();
  const seen = new Map<string, AlarmRow>();

  function raise(row: Omit<AlarmRow, "id" | "state" | "first_seen" | "last_seen"> & { id: string }) {
    const ack = input.acks?.get(row.id);
    const alarm: AlarmRow = {
      ...row,
      state: ack ? "acknowledged" : "open",
      first_seen: ack?.acked_at ?? iso(now),
      last_seen: iso(now),
      ...(ack ? { acked_by: ack.acked_by, acked_at: ack.acked_at, note: ack.note } : {}),
    };
    seen.set(row.id, alarm);
  }

  const customers = input.customers ?? [];
  const gateways = input.gateways ?? [];
  const vosByName = new Map<string, AlarmSourceVosGateway>(
    (input.vosGateways ?? []).map((g) => [String(g.name ?? "").trim().toLowerCase(), g])
  );

  // 1. Customer balance vs overdraft — real ledger state from PostgreSQL.
  for (const c of customers) {
    const balance = num(c.balance);
    const overdraft = num(c.overdraft_limit);
    if (overdraft > 0 && balance <= overdraft) {
      const currency = String(c.currency ?? "USD");
      // A closed/disabled account is not an active billing alarm.
      if (["closed", "disabled"].includes(String(c.status ?? ""))) continue;
      raise({
        id: fingerprint("balance", c.id),
        severity: "critical",
        type: "balance.limit",
        source: "customer",
        customer: c.account_name || undefined,
        account: c.vos_account_id || undefined,
        message: `Balance ${currency} ${balance.toFixed(2)} is at or below the overdraft limit ${overdraft.toFixed(2)}`,
        balance,
        overdraft,
      });
    }
  }

  // 2. Account expiry — real expiry policy from PostgreSQL.
  for (const c of customers) {
    if (!c.expires_at) continue;
    const exp = new Date(c.expires_at);
    if (Number.isNaN(exp.getTime())) continue;
    const left = exp.getTime() - now.getTime();
    if (left < 0) {
      raise({
        id: fingerprint("expiry", c.id),
        severity: "critical",
        type: "account.expired",
        source: "customer",
        customer: c.account_name || undefined,
        account: c.vos_account_id || undefined,
        message: `Account expired on ${exp.toISOString().slice(0, 10)}`,
        expires_at: exp.toISOString(),
      });
    } else if (left <= 14 * DAY) {
      raise({
        id: fingerprint("expiry", c.id),
        severity: "warning",
        type: "account.expiring",
        source: "customer",
        customer: c.account_name || undefined,
        account: c.vos_account_id || undefined,
        message: `Account expires in ${Math.max(1, Math.ceil(left / DAY))} day(s) on ${exp.toISOString().slice(0, 10)}`,
        expires_at: exp.toISOString(),
      });
    }
  }

  const vosList = input.vosGateways ?? [];
  const vosAvailable = (input.vosAvailable ?? true) && (input.vosGateways !== undefined || (input.currentCalls ?? 0) > 0);

  // 3. Gateway locked in VOS — real engine configuration (needs live engine state).
  if (vosAvailable) {
    for (const g of vosList) {
      if (Number(g.lockType ?? 0) > 0) {
        const portal = gateways.find((p) => String(p.vos_gateway_id ?? "").trim().toLowerCase() === g.name.trim().toLowerCase());
        raise({
          id: fingerprint("locked", g.name),
          severity: Number(g.lockType) >= 3 ? "critical" : "warning",
          type: "gateway.locked",
          source: "gateway",
          gateway: g.name,
          message: `Gateway "${g.name}" is locked in VOS (lockType ${g.lockType}) — inbound/outbound service is configured off`,
        });
      }
    }
  }

  // 4. Capacity pressure — measured VOS current calls vs configured capacity.
  if (vosAvailable) {
    for (const [name, active] of Object.entries(input.currentCallsByGateway ?? {})) {
      const g = vosByName.get(String(name).toLowerCase());
      const capacity = Number(g?.capacity ?? 0);
      if (capacity > 0 && active >= Math.ceil(capacity * 0.8)) {
        raise({
          id: fingerprint("capacity", name),
          severity: active >= capacity ? "critical" : "warning",
          type: "gateway.capacity",
          source: "gateway",
          gateway: name,
          message: `Gateway "${name}" is at ${active}/${capacity} active calls (${Math.round((active / capacity) * 100)}% of capacity)`,
          active_calls: active,
          capacity,
        });
      }
    }
  }

  // 5. Portal gateway missing from the VOS mapping — real drift detection.
  if (vosAvailable) {
    for (const p of gateways) {
      const key = String(p.vos_gateway_id ?? "").trim().toLowerCase();
      if (!key) continue;
      if (!vosByName.has(key)) {
        raise({
          id: fingerprint("missing", p.id),
          severity: "critical",
          type: "gateway.missing",
          source: "gateway",
          gateway: p.name ?? p.vos_gateway_id ?? p.id,
          message: `Portal gateway "${p.name ?? key}" (${key}) is not present in the verified VOS mapping`,
        });
      }
    }
  }

  // 6. Unmanaged gateway in VOS — exists on the engine, no portal record.
  if (vosAvailable) {
    for (const g of vosList) {
      const key = g.name.trim().toLowerCase();
      const portal = gateways.find((p) => String(p.vos_gateway_id ?? "").trim().toLowerCase() === key);
      if (!portal) {
        raise({
          id: fingerprint("unmanaged", g.name),
          severity: "warning",
          type: "gateway.unmanaged",
          source: "vos",
          gateway: g.name,
          message: `Gateway "${g.name}" exists in VOS with no portal customer mapping — verify ownership`,
        });
      }
    }
  }

  const order: Record<AlarmSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return [...seen.values()].sort(
    (a, b) => order[a.severity] - order[b.severity] || String(b.last_seen).localeCompare(String(a.last_seen))
  );
}