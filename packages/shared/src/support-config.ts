// Support contacts configuration for Admin settings -> Client FAB
// Stored as portal_resources resource_type='support_config' resource_key='global' data jsonb
// Synthetic structure: { enabled:boolean, label?:string, telegram:{enabled,handle,url}, teams:{enabled,id,url}, updatedAt:ISO8601, updatedBy:uuid }
// Date format ISO8601 UTC, e.g. "2026-08-23T12:00:00.000Z"

export interface SupportTelegramConfig {
  enabled: boolean;
  handle: string;
  url: string;
}

export interface SupportTeamsConfig {
  enabled: boolean;
  id: string;
  url: string;
}

export interface SupportConfigData {
  enabled: boolean;
  label?: string;
  telegram: SupportTelegramConfig;
  teams: SupportTeamsConfig;
  updatedAt: string;
  updatedBy: string;
}

export interface SupportConfigPutBody {
  enabled: boolean;
  label?: string;
  telegram: { enabled: boolean; handle: string };
  teams: { enabled: boolean; id: string };
}

const TELEGRAM_HANDLE_RE = /^[a-zA-Z0-9_]{5,32}$/;
const TEAMS_EMAIL_RE = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const TEAMS_HANDLE_RE = /^[a-zA-Z0-9._-]{1,64}$/;

function extractTelegramHandle(raw: string): string {
  if (!raw) return "";
  let s = String(raw).trim();
  // Scheme injection (javascript:/data:/vbscript:) and backslashes are rejected
  // by returning "" which always fails TELEGRAM_HANDLE_RE downstream.
  if (/^\s*(javascript|data|vbscript):/i.test(s)) return "";
  if (s.includes("\\")) return "";
  const tmeMatch = s.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{1,64})(?:\/|\?|$)?/i);
  if (tmeMatch) s = tmeMatch[1];
  s = s.replace(/^@+/, "").trim();
  return s;
}

export function isValidTelegramHandle(raw: string): boolean {
  if (raw == null) return false;
  const h = extractTelegramHandle(raw);
  return TELEGRAM_HANDLE_RE.test(h);
}

export function isValidTeamsId(raw: string): boolean {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s) return false;
  if (s.length > 320) return false;
  if (/^\s*(javascript|data|vbscript):/i.test(s)) return false;
  if (s.includes("\\") || s.includes(" ") || s.includes("<") || s.includes(">")) return false;
  if (TEAMS_EMAIL_RE.test(s)) return true;
  if (s.includes("@")) return false;
  return TEAMS_HANDLE_RE.test(s);
}

export function buildTelegramUrl(rawHandle: string): string {
  const h = extractTelegramHandle(rawHandle);
  if (!TELEGRAM_HANDLE_RE.test(h)) throw new Error("VALIDATION_ERROR: telegram.handle invalid");
  return `https://t.me/${h}`;
}

export function buildTeamsUrl(rawId: string): string {
  const s = String(rawId).trim();
  if (!isValidTeamsId(s)) throw new Error("VALIDATION_ERROR: teams.id invalid");
  return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(s)}`;
}

export function normalizeSupportConfigPutBody(body: SupportConfigPutBody): SupportConfigPutBody {
  return {
    enabled: Boolean(body.enabled),
    label: body.label != null ? String(body.label).trim().slice(0, 120) : undefined,
    telegram: { enabled: Boolean(body.telegram?.enabled), handle: String(body.telegram?.handle ?? "").trim() },
    teams: { enabled: Boolean(body.teams?.enabled), id: String(body.teams?.id ?? "").trim() },
  };
}

export function validateSupportConfigPutBody(body: SupportConfigPutBody): Array<{field: string; message: string; code: string}> {
  const errors: Array<{field: string; message: string; code: string}> = [];
  const b = normalizeSupportConfigPutBody(body as any);
  if (b.telegram.enabled) {
    if (!b.telegram.handle) errors.push({ field: "telegram.handle", message: "Telegram handle is required when Telegram is enabled", code: "REQUIRED" });
    else if (!isValidTelegramHandle(b.telegram.handle)) errors.push({ field: "telegram.handle", message: "Invalid Telegram handle (5-32 letters, digits, underscore; or https://t.me/handle)", code: "VALIDATION_ERROR" });
  } else if (b.telegram.handle && !isValidTelegramHandle(b.telegram.handle)) {
    errors.push({ field: "telegram.handle", message: "Invalid Telegram handle", code: "VALIDATION_ERROR" });
  }
  if (b.teams.enabled) {
    if (!b.teams.id) errors.push({ field: "teams.id", message: "Teams ID is required when Teams is enabled", code: "REQUIRED" });
    else if (!isValidTeamsId(b.teams.id)) errors.push({ field: "teams.id", message: "Invalid Teams ID (email or handle)", code: "VALIDATION_ERROR" });
  } else if (b.teams.id && !isValidTeamsId(b.teams.id)) {
    errors.push({ field: "teams.id", message: "Invalid Teams ID", code: "VALIDATION_ERROR" });
  }
  return errors;
}

export function buildSupportConfigData(put: SupportConfigPutBody, prev: SupportConfigData | null, actorUserId: string): SupportConfigData {
  const errs = validateSupportConfigPutBody(put);
  if (errs.length) {
    const e: any = new Error(errs[0].message);
    e.details = errs;
    e.code = "VALIDATION_ERROR";
    throw e;
  }
  const b = normalizeSupportConfigPutBody(put);
  const telegramHandle = b.telegram.handle ? extractTelegramHandle(b.telegram.handle) : "";
  const teamsId = b.teams.id ? String(b.teams.id).trim() : "";
  const now = new Date().toISOString();
  return {
    enabled: Boolean(b.enabled),
    label: b.label,
    telegram: {
      enabled: Boolean(b.telegram.enabled),
      handle: telegramHandle,
      url: telegramHandle && b.telegram.enabled ? buildTelegramUrl(telegramHandle) : telegramHandle ? `https://t.me/${telegramHandle}` : "",
    },
    teams: {
      enabled: Boolean(b.teams.enabled),
      id: teamsId,
      url: teamsId && b.teams.enabled ? buildTeamsUrl(teamsId) : teamsId ? `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(teamsId)}` : "",
    },
    updatedAt: now,
    updatedBy: actorUserId || prev?.updatedBy || "system",
  };
}

export function defaultSupportConfig(): SupportConfigData {
  return {
    enabled: false,
    label: "",
    telegram: { enabled: false, handle: "", url: "" },
    teams: { enabled: false, id: "", url: "" },
    updatedAt: new Date().toISOString(),
    updatedBy: "system",
  };
}
