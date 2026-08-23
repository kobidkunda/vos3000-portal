export type PortalSide = "Admin" | "Client";
export type PageArchetype = "AUTH" | "WIZARD" | "LIVE_MONITOR" | "DASHBOARD" | "DETAIL" | "FINANCE_ACTION" | "ANALYTICS_REPORT" | "SETTINGS" | "EDITOR_FORM" | "LIST_TABLE";
export type AuthType = "session" | "api_key";
export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  tenantId?: string;
  organizationId?: string;
  side: "admin"|"client";
  sessionId?: string;
  authType?: AuthType;
  scopes?: string[];
  permissions?: string[];
  exp: number;
}
export type PageSource = "demo"|"postgres"|"clickhouse"|"redis"|"vos"|"mixed"|"portal"|"protected"|"unavailable";
export interface PagePayload {
  route: string;
  title: string;
  group: string;
  archetype: PageArchetype;
  purpose: string;
  kpis: Array<{label:string;value:string;trend?:string;status?:string}>;
  columns: string[];
  rows: Record<string,unknown>[];
  chart: number[];
  features: string[];
  apis: string[];
  generatedAt: string;
  source: PageSource;
  stale?: boolean;
  warnings?: string[];
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}
export interface ApiEnvelope<T=unknown> {
  ok: boolean;
  request_id: string;
  data?: T;
  error?: { code:string; message:string; details?:unknown };
}
