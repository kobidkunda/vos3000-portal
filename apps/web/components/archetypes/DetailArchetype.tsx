"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { Status } from "../Status";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { MultiSeriesChart, type ChartSeries } from "../Chart";
import { MappingGatewayDetailArchetype } from "./MappingGatewayDetailArchetype";
import { RawJsonInspector } from "../shared/RawJsonInspector";
import { ActivityTimeline, type TimelineEvent } from "../shared/ActivityTimeline";
import { ExportModal } from "../shared/ExportModal";
import { PhonePill } from "../shared/PhonePill";
import { FormErrorAlert, FormErrorHeader } from "../shared/FormErrorHeader";

type CustomerTab =
  | "overview"
  | "gateways"
  | "sip"
  | "ip"
  | "billing"
  | "rates"
  | "live"
  | "cdr"
  | "reports"
  | "limits"
  | "users"
  | "audit"
  | "raw";

type MetricWindow = "1m" | "5m" | "30m" | "1h" | "6h" | "24h" | "custom";

function isCustomerRoute(route: string): boolean {
  return /\/admin\/customers\/[^/]+\/?$/.test(route) || route.includes("/customers/{customerId}");
}

function isMappingGatewayRoute(route: string): boolean {
  return route.includes("/gateways/mapping/") || route.includes("/gateways/mapping/{gatewayId}");
}

function extractCustomerId(route: string, firstRow: any): string | null {
  const m = route.match(/\/admin\/customers\/([a-f0-9-]{36})/i);
  if (m) return m[1];
  if (firstRow?.id && /^[0-9a-f-]{36}$/i.test(String(firstRow.id))) return String(firstRow.id);
  if (firstRow?.customer_id && /^[0-9a-f-]{36}$/i.test(String(firstRow.customer_id))) return String(firstRow.customer_id);
  if (firstRow?.customerId && /^[0-9a-f-]{36}$/i.test(String(firstRow.customerId))) return String(firstRow.customerId);
  if (firstRow?.vos_account_id) return String(firstRow.vos_account_id);
  if (firstRow?.account_name) return String(firstRow.account_name);
  if (typeof window !== "undefined") {
    const sp = new URLSearchParams(window.location.search);
    const fromQuery = sp.get("customerId") || sp.get("impersonate") || sp.get("id");
    if (fromQuery) return fromQuery;
  }
  return firstRow?.id ? String(firstRow.id) : null;
}

function formatMoney(v: any, currency = "USD"): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

function formatDate(v: any): string {
  if (!v) return "—";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return (
    d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" }) +
    " " +
    d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function DetailArchetype({
  side,
  title,
  purpose,
  route,
  rows = [],
  kpis = [],
  source = "vos + postgres (vos_portal)",
  warnings,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  route: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}) {
  if (isMappingGatewayRoute(route) || (rows[0]?.kind === "mapping" && route.includes("/gateways/mapping"))) {
    return <MappingGatewayDetailArchetype title={title} purpose={purpose} route={route} rows={rows} kpis={kpis} source={source} warnings={warnings} />;
  }
  if (isCustomerRoute(route) || (rows[0]?.organization_name && rows[0]?.vos_account_id !== undefined)) {
    return <CustomerDetailView side={side} title={title} purpose={purpose} route={route} rows={rows} kpis={kpis} source={source} warnings={warnings} />;
  }
  return <GenericDetailView side={side} title={title} purpose={purpose} route={route} rows={rows} kpis={kpis} source={source} warnings={warnings} />;
}

function GenericDetailView({
  side,
  title,
  purpose,
  route,
  rows,
  kpis,
  source,
  warnings,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  route: string;
  rows: any[];
  kpis: any[];
  source: string;
  warnings?: string[];
}) {
  const [activeTab, setActiveTab] = useState<"fields" | "raw">("fields");
  const [copiedIp, setCopiedIp] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const firstRow = rows && rows.length > 0 ? rows[0] : null;
  const entityName = firstRow ? String(firstRow.name ?? firstRow.account_name ?? firstRow.organization_name ?? firstRow.serial_number ?? firstRow.caller ?? title) : title;
  const entitySubtitle = firstRow ? (firstRow.vos_account_id ? `VOS Account: ${firstRow.vos_account_id} · ID: ${firstRow.id ?? "—"}` : firstRow.id ? `Entity ID: ${firstRow.id}` : purpose) : purpose;
  const registeredIp = firstRow?.ip ?? firstRow?.registered_ip ?? firstRow?.base_url ?? firstRow?.host ?? null;
  const entityStatus = firstRow?.status ?? firstRow?.state ?? firstRow?.severity ?? "Active";

  function copyText(keyId: string, val: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      if (keyId === "ip") {
        setCopiedIp(true);
        setTimeout(() => setCopiedIp(false), 2000);
      } else {
        setCopiedKey(keyId);
        setTimeout(() => setCopiedKey(null), 2000);
      }
    }
  }

  const entries = useMemo(() => {
    if (!firstRow) return [];
    return Object.entries(firstRow);
  }, [firstRow]);

  return (
    <div className="content">
      <div className="pageHead" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{title}</h1>
            <Status value={entityStatus} size="sm" />
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>Source: {source}</span>
          </div>
          <p>{purpose || "Detailed entity inspection and verified technical parameters."}</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href={side === "Admin" ? "/admin" : "/app"} className="btn secondary sm">
            <Icon name="arrowLeft" size={13} />
            <span>Back to Portal</span>
          </Link>
        </div>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 650, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>{warnings.join(" · ")}</span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: "rgba(37, 99, 235, 0.12)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="gateway" size={26} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: 20, fontWeight: 750 }}>{entityName}</h2>
                <Status value={entityStatus} size="sm" />
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>{entitySubtitle}</div>
              {registeredIp && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>Endpoint / IP:</span>
                  <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{registeredIp}</span>
                  <button type="button" onClick={() => copyText("ip", String(registeredIp))} style={{ background: "none", border: "none", cursor: "pointer", color: copiedIp ? "var(--success)" : "var(--muted)", padding: 2 }} title="Copy IP">
                    <Icon name={copiedIp ? "check" : "copy"} size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
            <div>Persisted Record: <strong>{firstRow ? "Active" : "Not Found"}</strong></div>
            <div style={{ marginTop: 4 }}>Verified Engine: <strong>{side === "Admin" ? "VOS 62.84.182.223" : "Active Telemetry"}</strong></div>
          </div>
        </div>
      </div>

      {kpis && kpis.length > 0 && (
        <KpiGrid>
          {kpis.slice(0, 4).map((k: any, idx: number) => (
            <KpiCard key={idx} label={k.label ?? "Metric"} value={k.value ?? "0"} trend={k.trend} trendDirection={k.trend ? (k.trend.includes("-") ? "down" as const : "up" as const) : "neutral"} icon={idx === 0 ? "dashboard" : idx === 1 ? "pulse" : idx === 2 ? "radar" : "dollar"} color={idx === 0 ? "blue" : idx === 1 ? "cyan" : idx === 2 ? "green" : "amber"} />
          ))}
        </KpiGrid>
      )}

      <div className="tabBarModern">
        <button type="button" className={`tabBtnModern ${activeTab === "fields" ? "active" : ""}`} onClick={() => setActiveTab("fields")}>
          Structured Fields ({entries.length})
        </button>
        <button type="button" className={`tabBtnModern ${activeTab === "raw" ? "active" : ""}`} onClick={() => setActiveTab("raw")}>
          Raw Database Payload (JSON & Tree)
        </button>
      </div>

      {activeTab === "fields" && (
        <div className="card" style={{ padding: 20 }}>
          {entries.length === 0 ? (
            <div style={{ padding: 36, textAlign: "center", color: "var(--muted)" }}>No detailed record fields found for this query scope in PostgreSQL/VOS.</div>
          ) : (
            <div className="detailGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              {entries.map(([key, val]) => {
                const isMono = /(id|ip|call_id|gateway|prefix|endpoint|request_id|token|secret|uuid|host)/i.test(key);
                const isStatusKey = /status|severity|state/i.test(key);
                const strVal = val === null || val === undefined ? "—" : typeof val === "object" ? JSON.stringify(val) : String(val);
                return (
                  <div key={key} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>{key.replace(/_/g, " ")}</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      {isStatusKey ? <Status value={val as string} size="sm" /> : <span className={isMono ? "mono" : ""} style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", wordBreak: "break-all" }}>{strVal}</span>}
                      {strVal !== "—" && (
                        <button type="button" onClick={() => copyText(key, strVal)} style={{ background: "none", border: "none", cursor: "pointer", color: copiedKey === key ? "var(--success)" : "var(--muted)", padding: 2 }} title="Copy field value">
                          <Icon name={copiedKey === key ? "check" : "copy"} size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "raw" && (
        <RawJsonInspector
          data={firstRow}
          title={entityName}
          filenamePrefix="entity_record"
          source={source}
        />
      )}
    </div>
  );
}

function CustomerDetailView({
  side,
  title,
  purpose,
  route,
  rows,
  kpis,
  source,
  warnings,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  route: string;
  rows: any[];
  kpis: any[];
  source: string;
  warnings?: string[];
}) {
  const firstRow = rows && rows.length > 0 ? rows[0] : null;
  const customerId = useMemo(() => extractCustomerId(route, firstRow), [route, firstRow]);

  // Tab state synchronized with URL query parameter ?tab=
  const [activeTab, setActiveTabState] = useState<CustomerTab>("overview");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const tabParam = sp.get("tab") as CustomerTab;
      const validTabs: CustomerTab[] = [
        "overview",
        "gateways",
        "sip",
        "ip",
        "billing",
        "rates",
        "live",
        "cdr",
        "reports",
        "limits",
        "users",
        "audit",
        "raw",
      ];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTabState(tabParam);
      }
    }
  }, []);

  const setActiveTab = useCallback((tab: CustomerTab) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      sp.set("tab", tab);
      const newUrl = `${window.location.pathname}?${sp.toString()}`;
      window.history.replaceState(null, "", newUrl);
    }
  }, []);

  // Time-window metrics state
  const [metricWindow, setMetricWindow] = useState<MetricWindow>("24h");
  const [customFrom, setCustomFrom] = useState<string>(() => new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [autoRefresh, setAutoRefresh] = useState<number>(0);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(false);
  const [metricsErr, setMetricsErr] = useState<string | null>(null);

  // Sub-entities state
  const [gateways, setGateways] = useState<any[] | null>(null);
  const [gatewaysErr, setGatewaysErr] = useState<any>(null);
  const [gatewaysLoading, setGatewaysLoading] = useState(false);

  const [users, setUsers] = useState<any[] | null>(null);
  const [usersErr, setUsersErr] = useState<any>(null);
  const [usersLoading, setUsersLoading] = useState(false);

  const [ledger, setLedger] = useState<any[] | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [cdrs, setCdrs] = useState<any[] | null>(null);
  const [cdrsLoading, setCdrsLoading] = useState(false);

  const [liveCalls, setLiveCalls] = useState<any[] | null>(null);
  const [liveCallsErr, setLiveCallsErr] = useState<any>(null);
  const [liveCallsLoading, setLiveCallsLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Rate lookup calculator state
  const [lookupPrefix, setLookupPrefix] = useState("1");
  const [rateCalcResult, setRateCalcResult] = useState<any | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [ratesList, setRatesList] = useState<any[] | null>(null);
  const [ratesListErr, setRatesListErr] = useState<any>(null);
  const [ratesListLoading, setRatesListLoading] = useState(false);

  // Rate Group management state
  const [activeRateGroupId, setActiveRateGroupId] = useState<string | null>(() => firstRow?.rate_group_id ? String(firstRow.rate_group_id) : null);
  const [activeRateGroupName, setActiveRateGroupName] = useState<string | null>(() => firstRow?.rate_group_name ?? null);
  const [allRateGroups, setAllRateGroups] = useState<any[] | null>(null);
  const [rateGroupsLoading, setRateGroupsLoading] = useState(false);

  useEffect(() => {
    if (firstRow?.rate_group_id) {
      setActiveRateGroupId(String(firstRow.rate_group_id));
      if (firstRow.rate_group_name) {
        setActiveRateGroupName(firstRow.rate_group_name);
      }
    }
  }, [firstRow?.rate_group_id, firstRow?.rate_group_name]);

  useEffect(() => {
    if (activeRateGroupId && allRateGroups && allRateGroups.length > 0) {
      const found = allRateGroups.find((g: any) => String(g.id) === String(activeRateGroupId));
      if (found) setActiveRateGroupName(found.name);
    }
  }, [activeRateGroupId, allRateGroups]);

  // Rate Group Modals state
  const [assignRgOpen, setAssignRgOpen] = useState(false);
  const [selectedRgToAssign, setSelectedRgToAssign] = useState<string>("");
  const [assignRgBusy, setAssignRgBusy] = useState(false);
  const [assignRgErr, setAssignRgErr] = useState<any>(null);

  const [createRgOpen, setCreateRgOpen] = useState(false);
  const [newRgName, setNewRgName] = useState("");
  const [newRgSide, setNewRgSide] = useState<"customer" | "carrier" | "shared">("customer");
  const [createRgBusy, setCreateRgBusy] = useState(false);
  const [createRgErr, setCreateRgErr] = useState<any>(null);

  const [addRateOpen, setAddRateOpen] = useState(false);
  const [newRatePrefix, setNewRatePrefix] = useState("");
  const [newRateArea, setNewRateArea] = useState("");
  const [newRatePrice, setNewRatePrice] = useState("");
  const [newRateCycle, setNewRateCycle] = useState("60");
  const [newRateType, setNewRateType] = useState("standard");
  const [addRateBusy, setAddRateBusy] = useState(false);
  const [addRateErr, setAddRateErr] = useState<any>(null);

  const [unassignRgConfirmOpen, setUnassignRgConfirmOpen] = useState(false);
  const [unassignBusy, setUnassignBusy] = useState(false);
  const [unassignErr, setUnassignErr] = useState<any>(null);
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null);

  // Number limits state (E.164 section limits)
  const [numberLimits, setNumberLimits] = useState<any[] | null>(null);
  const [numberLimitsLoading, setNumberLimitsLoading] = useState(false);
  const [numberLimitsErr, setNumberLimitsErr] = useState<any>(null);
  const [createLimitOpen, setCreateLimitOpen] = useState(false);
  const [limitPrefix, setLimitPrefix] = useState("");
  const [limitDestination, setLimitDestination] = useState("");
  const [limitDirection, setLimitDirection] = useState("Ingress + Egress");
  const [limitLines, setLimitLines] = useState("100");
  const [limitCps, setLimitCps] = useState("20");
  const [limitBusy, setLimitBusy] = useState(false);
  const [limitErr, setLimitErr] = useState<any>(null);

  // Live updated customer balance state
  const [currentBalance, setCurrentBalance] = useState<string | null>(() => firstRow?.balance ?? firstRow?.wallet_balance ?? null);

  // Export Modal state
  const [exportOpen, setExportOpen] = useState(false);

  // Add Funds Modal state
  const [fundsOpen, setFundsOpen] = useState(false);
  const [fundsDirection, setFundsDirection] = useState<"credit" | "debit">("credit");
  const [fundsAmount, setFundsAmount] = useState("");
  const [fundsCategory, setFundsCategory] = useState("manual_adjustment");
  const [fundsRef, setFundsRef] = useState("");
  const [fundsMemo, setFundsMemo] = useState("");
  const [fundsBusy, setFundsBusy] = useState(false);
  const [fundsErr, setFundsErr] = useState<any>(null);
  const [fundsOk, setFundsOk] = useState<any | null>(null);

  // Create Mapping Gateway Modal state (1:N)
  const [createGwOpen, setCreateGwOpen] = useState(false);
  const [gwName, setGwName] = useState("");
  const [gwRegisterType, setGwRegisterType] = useState<"static" | "dynamic">("static");
  const [gwIp, setGwIp] = useState("");
  const [gwSipUser, setGwSipUser] = useState("");
  const [gwSipPwd, setGwSipPwd] = useState("");
  const [gwLineLimit, setGwLineLimit] = useState("100");
  const [gwCpsLimit, setGwCpsLimit] = useState("20");
  const [gwBusy, setGwBusy] = useState(false);
  const [gwErr, setGwErr] = useState<any>(null);
  const [gwOk, setGwOk] = useState<any | null>(null);

  // Update IP Modal state
  const [ipModalOpen, setIpModalOpen] = useState(false);
  const [ipTargetGw, setIpTargetGw] = useState("");
  const [ipValue, setIpValue] = useState("");
  const [ipBusy, setIpBusy] = useState(false);
  const [ipErr, setIpErr] = useState<any>(null);
  const [ipOk, setIpOk] = useState<any | null>(null);

  // SIP Registration Auth Modal state
  const [sipModalOpen, setSipModalOpen] = useState(false);
  const [sipTargetGw, setSipTargetGw] = useState("");
  const [sipRegisterType, setSipRegisterType] = useState<"dynamic" | "static">("dynamic");
  const [sipUser, setSipUser] = useState("");
  const [sipPwd, setSipPwd] = useState("");
  const [sipBusy, setSipBusy] = useState(false);
  const [sipErr, setSipErr] = useState<any>(null);
  const [sipOk, setSipOk] = useState<any | null>(null);
  const [showSipSecrets, setShowSipSecrets] = useState<Record<string, boolean>>({});

  // Password reset modal state
  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdTarget, setPwdTarget] = useState<string>("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdErr, setPwdErr] = useState<any>(null);
  const [pwdOk, setPwdOk] = useState<{ requestId?: string; email?: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  // Keyboard accessibility: Escape closes any open modal (modern web guidance)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (fundsOpen && !fundsBusy) setFundsOpen(false);
        if (createGwOpen && !gwBusy) setCreateGwOpen(false);
        if (ipModalOpen && !ipBusy) setIpModalOpen(false);
        if (sipModalOpen && !sipBusy) setSipModalOpen(false);
        if (pwdOpen && !pwdBusy) setPwdOpen(false);
        if (createLimitOpen && !limitBusy) setCreateLimitOpen(false);
        if (assignRgOpen && !assignRgBusy) setAssignRgOpen(false);
        if (createRgOpen && !createRgBusy) setCreateRgOpen(false);
        if (addRateOpen && !addRateBusy) setAddRateOpen(false);
        if (unassignRgConfirmOpen && !unassignBusy) setUnassignRgConfirmOpen(false);
        if (exportOpen) setExportOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fundsOpen, fundsBusy, createGwOpen, gwBusy, ipModalOpen, ipBusy, sipModalOpen, sipBusy, pwdOpen, pwdBusy, createLimitOpen, limitBusy, assignRgOpen, assignRgBusy, createRgOpen, createRgBusy, addRateOpen, addRateBusy, unassignRgConfirmOpen, unassignBusy, exportOpen]);

  const entityName = firstRow ? String(firstRow.organization_name ?? firstRow.account_name ?? firstRow.name ?? title) : title;
  const vosAccountId = firstRow?.vos_account_id ? String(firstRow.vos_account_id) : null;
  const currency = firstRow?.currency ? String(firstRow.currency) : "USD";
  const overdraft = firstRow?.overdraft_limit ?? null;
  const status = String(firstRow?.status ?? "active");
  const expiresAt = firstRow?.expires_at ?? null;
  const rateGroupId = activeRateGroupId;
  const lowThreshold = firstRow?.low_balance_threshold ?? null;

  const numericBalance = currentBalance !== null && currentBalance !== undefined ? Number(currentBalance) : null;
  const numericOverdraft = overdraft !== null && overdraft !== undefined ? Number(overdraft) : 0;
  const availableCredit = numericBalance !== null ? numericBalance + numericOverdraft : null;

  const expiringSoon = useMemo(() => {
    if (!expiresAt) return false;
    const d = new Date(String(expiresAt));
    return !Number.isNaN(d.getTime()) && d.getTime() - Date.now() < 30 * 24 * 3600 * 1000 && d.getTime() > Date.now();
  }, [expiresAt]);

  const isExpired = useMemo(() => {
    if (!expiresAt) return false;
    const d = new Date(String(expiresAt));
    return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
  }, [expiresAt]);

  const negativeBalance = numericBalance !== null && numericBalance < 0;
  const lowBalanceWarning = useMemo(() => {
    if (numericBalance === null || lowThreshold === null || lowThreshold === undefined) return false;
    return Number(numericBalance) <= Number(lowThreshold);
  }, [numericBalance, lowThreshold]);

  const offlineGateways = useMemo(() => {
    if (!gateways) return 0;
    return gateways.filter((g) => /offline|disabled|degraded|unknown|locked/i.test(String(g.status ?? ""))).length;
  }, [gateways]);

  const hasRisk = negativeBalance || isExpired || expiringSoon || lowBalanceWarning || offlineGateways > 0;

  function copy(key: string, val: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  // Fetch metrics across time-windows
  const loadMetrics = useCallback(async (win: MetricWindow, customFromVal?: string, customToVal?: string) => {
    if (!customerId) return;
    setMetricsLoading(true);
    setMetricsErr(null);
    try {
      let q = `/api/v1/admin/customers/${encodeURIComponent(customerId)}/metrics?window=${win}`;
      const f = customFromVal || customFrom;
      const t = customToVal || customTo;
      if (win === "custom" && f && t) {
        const fromIso = new Date(f).toISOString();
        const toIso = new Date(t).toISOString();
        q += `&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
      }
      const res: any = await api(q);
      const data = res.data ?? res;
      setMetrics(data);
    } catch (e: any) {
      setMetricsErr(e.message ?? "Failed to load metrics");
    } finally {
      setMetricsLoading(false);
    }
  }, [customerId, customFrom, customTo]);

  const loadGateways = useCallback(async () => {
    if (!customerId) return;
    setGatewaysLoading(true);
    setGatewaysErr(null);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/gateways`);
      const data = Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
      setGateways(data);
      if (data.length > 0) {
        setIpTargetGw((prev) => prev || String(data[0].id));
        setSipTargetGw((prev) => prev || String(data[0].id));
        setSipUser((prev) => prev || String(data[0].name));
      }
    } catch (e: any) {
      setGatewaysErr(e.message ?? "Failed to load gateways");
      setGateways([]);
    } finally {
      setGatewaysLoading(false);
    }
  }, [customerId]);

  const loadUsers = useCallback(async () => {
    if (!customerId) return;
    setUsersLoading(true);
    setUsersErr(null);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/users`);
      const data = Array.isArray(res.data) ? res.data : [];
      setUsers(data);
      if (data.length) setPwdTarget((prev) => prev || String(data[0].id));
    } catch (e: any) {
      setUsersErr(e.message ?? "Failed to load users");
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [customerId]);

  const loadLedger = useCallback(async () => {
    if (!customerId) return;
    setLedgerLoading(true);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/ledger`);
      setLedger(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  }, [customerId]);

  const loadCdrs = useCallback(async () => {
    if (!customerId) return;
    setCdrsLoading(true);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/cdr?limit=50`);
      setCdrs(Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : []);
    } catch {
      setCdrs([]);
    } finally {
      setCdrsLoading(false);
    }
  }, [customerId]);

  const loadLiveCalls = useCallback(async () => {
    setLiveCallsLoading(true);
    try {
      const res: any = await api(`/api/v1/admin/calls/live`);
      const allCalls = Array.isArray(res.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
      // Scope strictly to this customer account/gateways
      const scoped = allCalls.filter((c: any) => {
        if (!vosAccountId && !customerId) return false;
        return (customerId && c.customer_id === customerId) || (vosAccountId && (c.account_id === vosAccountId || c.account === vosAccountId));
      });
      setLiveCalls(scoped);
    } catch {
      setLiveCalls([]);
    } finally {
      setLiveCallsLoading(false);
    }
  }, [customerId, vosAccountId]);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res: any = await api(`/api/v1/audit`);
      const allAudit = Array.isArray(res.data) ? res.data : Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      const scoped = allAudit.filter((a: any) => a.resource_id === customerId || (firstRow?.organization_id && a.organization_id === firstRow.organization_id));
      setAuditLogs(scoped);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, [customerId, firstRow?.organization_id]);

  const loadNumberLimits = useCallback(async () => {
    if (!customerId) return;
    setNumberLimitsLoading(true);
    setNumberLimitsErr(null);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/number-limits`);
      const items = Array.isArray(res.data) ? res.data : Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setNumberLimits(items);
    } catch (e: any) {
      setNumberLimitsErr(e.message ?? "Failed to load prefix limits");
      setNumberLimits([]);
    } finally {
      setNumberLimitsLoading(false);
    }
  }, [customerId]);

  const loadAllRateGroups = useCallback(async () => {
    setRateGroupsLoading(true);
    try {
      const res: any = await api(`/api/v1/admin/rate-groups`);
      const items = Array.isArray(res.data) ? res.data : Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setAllRateGroups(items);
      if (activeRateGroupId && items.length > 0) {
        const found = items.find((g: any) => String(g.id) === String(activeRateGroupId));
        if (found) setActiveRateGroupName(found.name);
      }
    } catch {
      setAllRateGroups([]);
    } finally {
      setRateGroupsLoading(false);
    }
  }, [activeRateGroupId]);

  const loadRatesList = useCallback(async () => {
    if (!activeRateGroupId) {
      setRatesList([]);
      return;
    }
    setRatesListLoading(true);
    try {
      const endpoint = `/api/v1/admin/rates?rateGroupId=${encodeURIComponent(String(activeRateGroupId))}`;
      const res: any = await api(endpoint);
      const items = Array.isArray(res.data) ? res.data : Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
      setRatesList(items);
    } catch {
      setRatesList([]);
    } finally {
      setRatesListLoading(false);
    }
  }, [activeRateGroupId]);

  // Real Rate lookup calculator querying PostgreSQL / VOS
  const calculateRate = useCallback(async (prefix: string) => {
    const clean = prefix.replace(/[^0-9]/g, "");
    if (!clean) {
      setRateCalcResult(null);
      return;
    }
    setRateLoading(true);
    try {
      const endpoint = `/api/v1/admin/rates/lookup?number=${encodeURIComponent(clean)}${activeRateGroupId ? `&rateGroupId=${encodeURIComponent(String(activeRateGroupId))}` : ""}`;
      const res: any = await api(endpoint);
      const item = res?.data ?? (Array.isArray(res?.items) && res.items.length > 0 ? res.items[0] : null);
      if (item) {
        setRateCalcResult({
          prefix: `+${item.prefix || clean}`,
          destination: item.area_name || item.destination || "Matched Tariff Destination",
          ratePerMinute: Number(item.rate_per_minute ?? item.rate ?? 0),
          connectionFee: Number(item.connection_fee ?? 0.0),
          billingInterval: `${item.billing_cycle_seconds ?? item.billing ?? "60"}s / ${item.billing_cycle_seconds ?? item.billing ?? "60"}s`,
          tariffGroup: activeRateGroupName || (activeRateGroupId ? `Rate Group ${String(activeRateGroupId).slice(0, 8)}…` : "Default Tariff Plan"),
          privateRate: false,
        });
      } else {
        setRateCalcResult({
          prefix: `+${clean}`,
          destination: "No destination tariff configured for this prefix",
          ratePerMinute: 0,
          connectionFee: 0.0,
          billingInterval: "—",
          tariffGroup: activeRateGroupName || (activeRateGroupId ? `Rate Group ${String(activeRateGroupId).slice(0, 8)}…` : "Default Tariff Plan"),
          privateRate: false,
        });
      }
    } catch {
      setRateCalcResult(null);
    } finally {
      setRateLoading(false);
    }
  }, [activeRateGroupId, activeRateGroupName]);

  useEffect(() => {
    void calculateRate(lookupPrefix);
  }, [calculateRate, lookupPrefix]);

  // Initial Core Load: Metrics, Gateways, and Rate Groups
  useEffect(() => {
    void loadMetrics(metricWindow);
    void loadGateways();
    void loadAllRateGroups();
  }, [loadMetrics, loadGateways, loadAllRateGroups, metricWindow]);

  // Tab-Driven Lazy Loading
  useEffect(() => {
    if (activeTab === "billing") void loadLedger();
    else if (activeTab === "cdr" || activeTab === "reports") void loadCdrs();
    else if (activeTab === "live") void loadLiveCalls();
    else if (activeTab === "users") void loadUsers();
    else if (activeTab === "audit") void loadAudit();
    else if (activeTab === "rates") {
      void loadRatesList();
      void loadAllRateGroups();
    }
    else if (activeTab === "limits") void loadNumberLimits();
    else if (activeTab === "gateways" || activeTab === "sip" || activeTab === "ip") void loadGateways();
  }, [activeTab, loadLedger, loadCdrs, loadLiveCalls, loadUsers, loadAudit, loadRatesList, loadAllRateGroups, loadNumberLimits, loadGateways]);

  // Rate Group mutation handlers
  async function submitAssignRateGroup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customerId || assignRgBusy) return;
    setAssignRgBusy(true);
    setAssignRgErr(null);
    try {
      const targetId = selectedRgToAssign || null;
      const res: any = await api(`/api/v1/admin/customers/${customerId}/rate-group`, {
        method: "PATCH",
        body: JSON.stringify({ rate_group_id: targetId }),
      });
      setActiveRateGroupId(targetId);
      const found = allRateGroups?.find((g) => String(g.id) === String(targetId));
      setActiveRateGroupName(found ? found.name : res.data?.rate_group_name ?? null);
      setAssignRgOpen(false);
      void loadRatesList();
      void loadAudit();
    } catch (err: any) {
      setAssignRgErr(err);
    } finally {
      setAssignRgBusy(false);
    }
  }

  async function submitUnassignRateGroup() {
    if (!customerId || unassignBusy) return;
    setUnassignBusy(true);
    setUnassignErr(null);
    try {
      await api(`/api/v1/admin/customers/${customerId}/rate-group`, {
        method: "PATCH",
        body: JSON.stringify({ rate_group_id: null }),
      });
      setActiveRateGroupId(null);
      setActiveRateGroupName(null);
      setUnassignRgConfirmOpen(false);
      setRatesList([]);
      void loadAudit();
    } catch (err: any) {
      setUnassignErr(err);
    } finally {
      setUnassignBusy(false);
    }
  }

  async function submitCreateRateGroup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!newRgName.trim() || createRgBusy) return;
    setCreateRgBusy(true);
    setCreateRgErr(null);
    try {
      const res: any = await api(`/api/v1/admin/rate-groups`, {
        method: "POST",
        body: JSON.stringify({ name: newRgName.trim(), side: newRgSide }),
      });
      const created = res.data;
      if (created?.id && customerId) {
        await api(`/api/v1/admin/customers/${customerId}/rate-group`, {
          method: "PATCH",
          body: JSON.stringify({ rate_group_id: created.id }),
        });
        setActiveRateGroupId(created.id);
        setActiveRateGroupName(created.name);
      }
      setCreateRgOpen(false);
      setNewRgName("");
      void loadAllRateGroups();
      void loadRatesList();
      void loadAudit();
    } catch (err: any) {
      setCreateRgErr(err);
    } finally {
      setCreateRgBusy(false);
    }
  }

  async function submitAddRatePrefix(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!activeRateGroupId || !newRatePrefix.trim() || addRateBusy) return;
    setAddRateBusy(true);
    setAddRateErr(null);
    try {
      await api(`/api/v1/admin/rates`, {
        method: "POST",
        body: JSON.stringify({
          rate_group_id: activeRateGroupId,
          prefix: newRatePrefix.trim().replace(/^\+/, ""),
          area_name: newRateArea.trim() || `Prefix +${newRatePrefix.trim().replace(/^\+/, "")}`,
          rate_per_minute: Number(newRatePrice) || 0,
          billing_cycle_seconds: Number(newRateCycle) || 60,
          rate_type: newRateType,
        }),
      });
      setAddRateOpen(false);
      setNewRatePrefix("");
      setNewRateArea("");
      setNewRatePrice("");
      void loadRatesList();
      void loadAllRateGroups();
      void loadAudit();
    } catch (err: any) {
      setAddRateErr(err);
    } finally {
      setAddRateBusy(false);
    }
  }

  async function deleteRatePrefix(rateId: string) {
    if (!rateId || deletingRateId) return;
    setDeletingRateId(rateId);
    setRatesListErr(null);
    try {
      await api(`/api/v1/admin/rates/${rateId}`, { method: "DELETE" });
      void loadRatesList();
      void loadAllRateGroups();
      void loadAudit();
    } catch (err: any) {
      setRatesListErr(err);
    } finally {
      setDeletingRateId(null);
    }
  }

  // Auto-refresh timer for active view
  useEffect(() => {
    if (!autoRefresh || autoRefresh <= 0) return;
    const interval = setInterval(() => {
      void loadMetrics(metricWindow);
      if (activeTab === "overview" || activeTab === "gateways" || activeTab === "sip" || activeTab === "ip") {
        void loadGateways();
      }
      if (activeTab === "billing") void loadLedger();
      if (activeTab === "live") void loadLiveCalls();
      if (activeTab === "rates") void loadRatesList();
      if (activeTab === "limits") void loadNumberLimits();
    }, autoRefresh * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadMetrics, loadGateways, loadLedger, loadLiveCalls, loadRatesList, loadNumberLimits, metricWindow, activeTab]);

  // Handle Add Funds Form Submission
  async function submitAddFunds(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customerId || !fundsAmount || Number(fundsAmount) <= 0 || fundsBusy) return;
    setFundsBusy(true);
    setFundsErr(null);
    setFundsOk(null);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/adjustments`, {
        method: "POST",
        body: JSON.stringify({
          amount: fundsAmount,
          direction: fundsDirection,
          type: fundsCategory,
          reference: fundsRef,
          memo: fundsMemo || `Manual ${fundsDirection} applied by admin`,
        }),
      });
      const data = res.data ?? res;
      setFundsOk(data);
      if (data.new_balance) setCurrentBalance(data.new_balance);
      setFundsAmount("");
      setFundsMemo("");
      setFundsRef("");
      void loadLedger();
      void loadAudit();
      setTimeout(() => {
        setFundsOpen(false);
        setFundsOk(null);
      }, 1600);
    } catch (err: any) {
      setFundsErr(err);
    } finally {
      setFundsBusy(false);
    }
  }

  // Handle Create Mapping Gateway Submission (1:N)
  async function submitCreateGateway(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customerId || !gwName.trim() || gwBusy) return;
    setGwBusy(true);
    setGwErr(null);
    setGwOk(null);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/gateways`, {
        method: "POST",
        body: JSON.stringify({
          name: gwName.trim(),
          registerType: gwRegisterType,
          configuredIp: gwRegisterType === "static" ? gwIp.trim() : null,
          sipUsername: gwRegisterType === "dynamic" ? (gwSipUser.trim() || gwName.trim()) : null,
          sipPassword: gwRegisterType === "dynamic" ? gwSipPwd.trim() : null,
          lineLimit: Number(gwLineLimit) || 100,
          cpsLimit: Number(gwCpsLimit) || 20,
        }),
      });
      const created = res.data ?? res;
      setGwOk(created);
      setGwName("");
      setGwIp("");
      setGwSipUser("");
      setGwSipPwd("");
      void loadGateways();
      void loadAudit();
      setTimeout(() => {
        setCreateGwOpen(false);
        setGwOk(null);
      }, 1600);
    } catch (err: any) {
      setGwErr(err);
    } finally {
      setGwBusy(false);
    }
  }

  // Handle Update IP Submission
  async function submitUpdateIp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customerId || !ipTargetGw || ipBusy) return;
    setIpBusy(true);
    setIpErr(null);
    setIpOk(null);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/gateways/${ipTargetGw}/ips`, {
        method: "POST",
        body: JSON.stringify({ ip: ipValue.trim() }),
      });
      setIpOk(res.data ?? res);
      void loadGateways();
      void loadAudit();
      setTimeout(() => {
        setIpModalOpen(false);
        setIpOk(null);
      }, 1500);
    } catch (err: any) {
      setIpErr(err);
    } finally {
      setIpBusy(false);
    }
  }

  // Handle SIP Auth update
  async function submitSipAuth(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customerId || !sipTargetGw || sipBusy) return;
    setSipBusy(true);
    setSipErr(null);
    setSipOk(null);
    try {
      const res: any = await api(`/api/v1/admin/customers/${customerId}/gateways/${sipTargetGw}/sip-auth`, {
        method: "POST",
        body: JSON.stringify({
          registerType: sipRegisterType,
          sipUsername: sipUser.trim(),
          sipPassword: sipPwd.trim(),
        }),
      });
      setSipOk(res.data ?? res);
      void loadGateways();
      void loadAudit();
      setTimeout(() => {
        setSipModalOpen(false);
        setSipOk(null);
      }, 1500);
    } catch (err: any) {
      setSipErr(err);
    } finally {
      setSipBusy(false);
    }
  }

  // Toggle Gateway Lock/Unlock
  async function toggleGatewayLock(gatewayId: string, currentStatus: string) {
    if (!customerId) return;
    const isLocked = currentStatus === "locked";
    setGatewaysErr(null);
    try {
      await api(`/api/v1/admin/customers/${customerId}/gateways/${gatewayId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: isLocked ? "active" : "locked" }),
      });
      void loadGateways();
      void loadAudit();
    } catch (err: any) {
      setGatewaysErr(err);
    }
  }

  // Disconnect a live call
  async function disconnectLiveCall(callId: string) {
    if (!confirm(`Force disconnect live call ${callId}?`)) return;
    setLiveCallsErr(null);
    try {
      await api(`/api/v1/admin/calls/${callId}/disconnect`, { method: "POST" });
      void loadLiveCalls();
    } catch (err: any) {
      setLiveCallsErr(err);
    }
  }

  // Password reset handler
  const pwdStrength = useMemo(() => {
    if (!pwdNew) return { label: "", color: "var(--muted)" };
    if (pwdNew.length < 10) return { label: "Too short — 10 characters minimum", color: "var(--danger)" };
    const hasUpper = /[A-Z]/.test(pwdNew);
    const hasLower = /[a-z]/.test(pwdNew);
    const hasNum = /[0-9]/.test(pwdNew);
    const hasSym = /[^A-Za-z0-9]/.test(pwdNew);
    const score = Number(hasUpper) + Number(hasLower) + Number(hasNum) + Number(hasSym);
    if (pwdNew.length >= 14 && score >= 3) return { label: "Strong — meets policy", color: "var(--success)" };
    if (pwdNew.length >= 10 && score >= 2) return { label: "Good — meets minimum", color: "var(--success)" };
    return { label: "Weak — add upper, number or symbol", color: "var(--warning)" };
  }, [pwdNew]);

  const pwdMismatch = pwdNew && pwdConfirm && pwdNew !== pwdConfirm;
  const pwdCanSubmit = pwdNew.length >= 10 && pwdNew === pwdConfirm && !pwdMismatch && !!pwdTarget && !pwdBusy;

  async function submitPassword(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!pwdCanSubmit || !customerId) return;
    setPwdBusy(true);
    setPwdErr(null);
    setPwdOk(null);
    try {
      const body: any = { newPassword: pwdNew };
      if (pwdTarget) body.userId = pwdTarget;
      const res: any = await api(`/api/v1/admin/customers/${customerId}/password`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setPwdOk({ requestId: res.request_id, email: res.data?.email });
      setPwdNew("");
      setPwdConfirm("");
      setTimeout(() => {
        setPwdOpen(false);
        setPwdOk(null);
      }, 1800);
      void loadUsers();
      void loadAudit();
    } catch (err: any) {
      setPwdErr(err);
    } finally {
      setPwdBusy(false);
    }
  }

  // Handle Create Prefix Number Limit Submission
  async function submitCreateLimit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!customerId || !limitPrefix.trim() || limitBusy) return;
    setLimitBusy(true);
    setLimitErr(null);
    try {
      await api(`/api/v1/admin/customers/${customerId}/number-limits`, {
        method: "POST",
        body: JSON.stringify({
          prefix: limitPrefix.trim().replace(/^\+/, ""),
          destination: limitDestination.trim() || `Prefix +${limitPrefix.trim().replace(/^\+/, "")}`,
          direction: limitDirection,
          lines: Number(limitLines) || 100,
          cps: Number(limitCps) || 20,
          status: "active",
        }),
      });
      setCreateLimitOpen(false);
      setLimitPrefix("");
      setLimitDestination("");
      void loadNumberLimits();
      void loadAudit();
    } catch (err: any) {
      setLimitErr(err);
    } finally {
      setLimitBusy(false);
    }
  }

  const entries = useMemo(() => {
    if (!firstRow) return [];
    const preferred = [
      "id",
      "organization_name",
      "account_name",
      "vos_account_id",
      "currency",
      "balance",
      "overdraft_limit",
      "low_balance_threshold",
      "status",
      "rate_group_id",
      "expires_at",
      "created_at",
      "updated_at",
    ];
    const keys = Array.from(new Set([...preferred, ...Object.keys(firstRow)]));
    return keys.filter((k) => firstRow[k] !== undefined).map((k) => [k, firstRow[k]] as const);
  }, [firstRow]);

  const billingBalancePreview = formatMoney(currentBalance, currency);
  const creditPreview = formatMoney(availableCredit, currency);

  // Composite diagnostics telemetry payload
  const compositeTelemetryData = useMemo(() => {
    return {
      customer: firstRow,
      liveState: {
        currentBalance: numericBalance,
        availableCredit,
        currency,
        status,
        expiresAt,
        hasRisk,
      },
      gateways: gateways ?? [],
      users: users ?? [],
      recentTransactions: ledger?.slice(0, 10) ?? [],
      recentCdrs: cdrs?.slice(0, 10) ?? [],
      metricsSummary: metrics ?? {},
      metadata: {
        source: "VOS 3000 Adapter + PostgreSQL",
        generatedAt: new Date().toISOString(),
        environment: "production",
      },
    };
  }, [firstRow, numericBalance, availableCredit, currency, status, expiresAt, hasRisk, gateways, users, ledger, cdrs, metrics]);

  // Time-series Chart formatting & timestamps from ClickHouse
  const chartTimestamps: string[] = useMemo(() => {
    if (!metrics?.timeseries || !metrics.timeseries.length) return [];
    return metrics.timeseries.map((pt: any) => pt.time);
  }, [metrics?.timeseries]);

  const chartSeries: ChartSeries[] = useMemo(() => {
    if (!metrics?.timeseries || !metrics.timeseries.length) {
      return [
        { name: "Total Calls", color: "#2563eb", values: [], unit: "calls" },
        { name: "Answered Calls", color: "#06b6d4", values: [], unit: "calls" },
        { name: "Financial Spend", color: "#10b981", values: [], unit: currency, yAxis: "right" },
      ];
    }
    return [
      { name: "Total Calls", color: "#2563eb", values: metrics.timeseries.map((pt: any) => pt.calls), unit: "calls" },
      { name: "Answered Calls", color: "#06b6d4", values: metrics.timeseries.map((pt: any) => pt.answered), unit: "calls" },
      { name: "Financial Spend", color: "#10b981", values: metrics.timeseries.map((pt: any) => pt.spend), unit: currency, yAxis: "right" },
    ];
  }, [metrics?.timeseries, currency]);

  // Timeline events for Audit Trail tab
  const timelineEvents: TimelineEvent[] = useMemo(() => {
    if (!auditLogs || auditLogs.length === 0) {
      return [];
    }
    return auditLogs.map((log, idx) => ({
      id: log.id || String(idx),
      title: log.action || "Administrative Operation",
      time: formatDate(log.created_at || log.timestamp),
      actor: log.actor_user_id || log.actor || "Admin Operator",
      details: log.details || (log.after_data ? JSON.stringify(log.after_data) : `Target: ${log.resource_type || "customer"}`),
      status: log.action?.includes("DELETE") || log.action?.includes("LOCK") ? "danger" : log.action?.includes("POST") ? "online" : "info",
    }));
  }, [auditLogs]);

  return (
    <div className="content">
      {/* Breadcrumb Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
        <Link href="/admin/customers" style={{ color: "var(--muted)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Icon name="arrowLeft" size={11} />
          <span>Customer Directory</span>
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>{entityName}</span>
        <span>/</span>
        <span style={{ textTransform: "capitalize", color: "var(--primary)", fontWeight: 600 }}>{activeTab}</span>
      </div>

      {/* Top Head */}
      <div className="pageHead" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 20 }}>{entityName}</h1>
            <Status value={status} size="sm" />
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>Source: {source}</span>
            {customerId && <span className="mono" style={{ fontSize: 11, color: "var(--muted)", background: "var(--surface2)", border: "1px solid var(--border)", padding: "2px 6px", borderRadius: 9999 }}>{customerId.slice(0, 8)}…</span>}
          </div>
          <p style={{ marginTop: 4 }}>{purpose || "360° customer workspace — identity, 1:N mapping gateways, SIP credentials, balance, and ClickHouse CDR analytics."}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn secondary sm" onClick={() => setExportOpen(true)}>
            <Icon name="download" size={13} />
            <span>Export Workspace</span>
          </button>
          <Link href="/admin/customers" className="btn secondary sm">
            <Icon name="arrowLeft" size={13} />
            <span>Directory</span>
          </Link>
          <Link href={side === "Admin" ? "/admin" : "/app"} className="btn secondary sm">
            <Icon name="dashboard" size={13} />
            <span>Portal</span>
          </Link>
        </div>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 14, borderColor: "var(--warning)", background: "var(--warning-bg)", padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 650, fontSize: 12.5 }}>
            <Icon name="alert" size={15} />
            <span>{warnings.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Hero Workspace Header */}
      <div className="card" style={{ marginBottom: 14, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(37, 99, 235, 0.12)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Icon name="customer" size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ fontSize: 18, fontWeight: 750, letterSpacing: "-0.02em" }}>{entityName}</h2>
                <Status value={status} size="sm" />
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {vosAccountId ? (
                  <span>
                    VOS Account: <span className="mono" style={{ fontWeight: 600, color: "var(--text)" }}>{vosAccountId}</span>
                  </span>
                ) : (
                  <span style={{ color: "var(--warning)", fontWeight: 600 }}>No VOS mapping</span>
                )}
                {customerId && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    ID: <span className="mono" style={{ fontWeight: 600, color: "var(--text)" }}>{customerId}</span>
                    <button
                      type="button"
                      onClick={() => copy("cid", customerId)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: copied === "cid" ? "var(--success)" : "var(--muted)", padding: 2 }}
                      title="Copy customer ID"
                    >
                      <Icon name={copied === "cid" ? "check" : "copy"} size={11} />
                    </button>
                  </span>
                )}
                {rateGroupId ? (
                  <span className="badge badge-online" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Icon name="tag" size={11} />
                    <span>Rate Group: <strong>{activeRateGroupName || rateGroupId.slice(0, 8) + "…"}</strong></span>
                  </span>
                ) : (
                  <span className="badge badge-warning" style={{ fontSize: 11, display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <Icon name="alert" size={11} />
                    <span>No Rate Group Assigned</span>
                  </span>
                )}
              </div>

              {/* Quick Action Buttons */}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => {
                    setFundsErr(null);
                    setFundsOk(null);
                    setFundsOpen(true);
                  }}
                  style={{ height: 32, background: "var(--success)", borderColor: "var(--success)" }}
                >
                  <Icon name="dollar" size={13} />
                  <span>Add Funds</span>
                </button>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => {
                    setGwErr(null);
                    setGwOk(null);
                    setCreateGwOpen(true);
                  }}
                  style={{ height: 32 }}
                >
                  <Icon name="plus" size={13} />
                  <span>Create Gateway</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setSelectedRgToAssign(activeRateGroupId || "");
                    setAssignRgErr(null);
                    setAssignRgOpen(true);
                  }}
                  style={{ height: 32 }}
                >
                  <Icon name="tag" size={13} />
                  <span>{rateGroupId ? "Change Rate Group" : "Assign Rate Group"}</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setIpErr(null);
                    setIpOk(null);
                    setIpModalOpen(true);
                  }}
                  style={{ height: 32 }}
                >
                  <Icon name="globe" size={13} />
                  <span>Update IP</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setSipErr(null);
                    setSipOk(null);
                    setSipModalOpen(true);
                  }}
                  style={{ height: 32 }}
                >
                  <Icon name="server" size={13} />
                  <span>SIP Auth</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setPwdErr(null);
                    setPwdOk(null);
                    setPwdOpen(true);
                  }}
                  style={{ height: 32 }}
                >
                  <Icon name="shield" size={13} />
                  <span>Reset Password</span>
                </button>
                <Link
                  href={`/app?impersonate=${customerId}`}
                  target="_blank"
                  className="btn ghost sm"
                  style={{ height: 32, color: "var(--primary)" }}
                  title="Open customer self-service view"
                >
                  <Icon name="external" size={13} />
                  <span>Open Client Portal</span>
                </Link>
              </div>
            </div>
          </div>
          <div style={{ minWidth: 220, textAlign: "right" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.04em" }}>Balance · {currency}</div>
            <div style={{ fontSize: 22, fontWeight: 750, color: negativeBalance ? "var(--danger)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>{billingBalancePreview}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
              Available credit: {creditPreview} {rateGroupId ? `· Rate: ${String(rateGroupId).slice(0, 8)}…` : "· No rate group"}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              Expires: {expiresAt ? formatDate(expiresAt) : "No expiry"} · <span style={{ fontVariantNumeric: "tabular-nums" }}>{firstRow?.created_at ? `Created ${formatDate(firstRow.created_at)}` : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Signals */}
      {hasRisk && (
        <div className="card" style={{ marginBottom: 14, borderColor: isExpired || negativeBalance ? "var(--danger-border)" : "var(--warning-border)", background: isExpired || negativeBalance ? "var(--danger-bg)" : "var(--warning-bg)", padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, fontWeight: 650, color: isExpired || negativeBalance ? "var(--danger)" : "var(--warning)", flexWrap: "wrap" }}>
            <Icon name="alert" size={14} />
            <span>Risk signals:</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontWeight: 500 }}>
              {negativeBalance && <span className="badge" style={{ background: "var(--danger)", color: "white", fontSize: 11 }}>Negative balance {billingBalancePreview}</span>}
              {isExpired && <span className="badge" style={{ background: "var(--danger)", color: "white", fontSize: 11 }}>Expired {formatDate(expiresAt)}</span>}
              {expiringSoon && !isExpired && <span className="badge" style={{ background: "var(--warning)", color: "white", fontSize: 11 }}>Expiring soon {formatDate(expiresAt)}</span>}
              {lowBalanceWarning && <span className="badge" style={{ background: "var(--warning)", color: "white", fontSize: 11 }}>At low-balance threshold {formatMoney(lowThreshold, currency)}</span>}
              {offlineGateways > 0 && <span className="badge" style={{ background: "#475569", color: "white", fontSize: 11 }}>{offlineGateways} gateway(s) offline/locked</span>}
              {!vosAccountId && <span className="badge" style={{ background: "#7c3aed", color: "white", fontSize: 11 }}>VOS mapping missing — provisioning incomplete</span>}
            </div>
          </div>
        </div>
      )}

      {/* Time-Window Selector & Real-Time Metrics Bar */}
      <div className="card" style={{ marginBottom: 14, padding: 14, background: "var(--surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.04em" }}>Metrics Window:</span>
            <div className="presetChips" style={{ display: "flex", gap: 4 }}>
              {(["1m", "5m", "30m", "1h", "6h", "24h", "custom"] as const).map((win) => (
                <button
                  key={win}
                  type="button"
                  className={`presetChip ${metricWindow === win ? "active" : ""}`}
                  onClick={() => {
                    setMetricWindow(win);
                    void loadMetrics(win);
                  }}
                  style={{ fontSize: 11.5, padding: "4px 10px", borderRadius: 6 }}
                >
                  {win.toUpperCase()}
                </button>
              ))}
            </div>
            {metricWindow === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ padding: "3px 6px", fontSize: 11.5, border: "1px solid var(--border)", borderRadius: 4 }} />
                <span>to</span>
                <input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ padding: "3px 6px", fontSize: 11.5, border: "1px solid var(--border)", borderRadius: 4 }} />
                <button type="button" className="btn secondary sm" onClick={() => void loadMetrics("custom", customFrom, customTo)} style={{ height: 26, fontSize: 11.5 }}>Apply</button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
            <span style={{ color: "var(--muted)" }}>Auto-Refresh:</span>
            <select
              value={autoRefresh}
              onChange={(e) => setAutoRefresh(Number(e.target.value))}
              style={{ padding: "3px 8px", fontSize: 11.5, border: "1px solid var(--border)", borderRadius: 4, background: "var(--surface)" }}
            >
              <option value={0}>Off</option>
              <option value={5}>5 seconds</option>
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
            <button type="button" className="btn secondary sm" onClick={() => void loadMetrics(metricWindow)} disabled={metricsLoading} style={{ height: 26, padding: "0 8px" }} title="Refresh metrics">
              <Icon name="refresh" size={12} className={metricsLoading ? "spin" : ""} />
            </button>
          </div>
        </div>

        {/* 5 Real-Time KPI Cards */}
        <KpiGrid>
          <KpiCard
            label={`Spend (${metricWindow.toUpperCase()})`}
            value={metricsLoading ? "…" : formatMoney(metrics?.spend ?? 0, currency)}
            icon="dollar"
            color="green"
            subtext={`${metrics?.minutes ?? 0} billable mins`}
          />
          <KpiCard
            label={`Calls Made (${metricWindow.toUpperCase()})`}
            value={metricsLoading ? "…" : (metrics?.calls ?? 0).toLocaleString()}
            icon="pulse"
            color="blue"
            subtext={`${metrics?.answered ?? 0} answered`}
          />
          <KpiCard
            label={`ASR (${metricWindow.toUpperCase()})`}
            value={metricsLoading ? "…" : `${metrics?.asr ?? 0}%`}
            icon="radar"
            color={Number(metrics?.asr ?? 0) >= 50 ? "green" : Number(metrics?.asr ?? 0) >= 25 ? "amber" : "red"}
            subtext={Number(metrics?.asr ?? 0) >= 50 ? "Healthy completion" : "Attention needed"}
          />
          <KpiCard
            label={`ACD (${metricWindow.toUpperCase()})`}
            value={metricsLoading ? "…" : (metrics?.acd_formatted ?? "00:00")}
            icon="dashboard"
            color="cyan"
            subtext={`${metrics?.acd_seconds ?? 0}s avg duration`}
          />
          <KpiCard
            label="Mapping Gateways"
            value={gatewaysLoading ? "…" : String(gateways?.length ?? (firstRow?.gateways_count ?? firstRow?.gateways?.length ?? 0))}
            icon="gateway"
            color={offlineGateways > 0 ? "amber" : "purple"}
            subtext={offlineGateways > 0 ? `${offlineGateways} locked/offline` : "All operational"}
            linkLabel="View Gateways"
            onClick={() => setActiveTab("gateways")}
          />
        </KpiGrid>
      </div>

      {/* Modern Multi-Tab Bar */}
      <div className="tabBarModern" style={{ marginTop: 14, overflowX: "auto" }}>
        {([
          ["overview", "Overview"],
          ["gateways", `Mapping Gateways${gateways ? ` (${gateways.length})` : ""}`],
          ["sip", "SIP Auth"],
          ["ip", "IP Whitelist"],
          ["billing", `Billing & Ledger${ledger ? ` (${ledger.length})` : ""}`],
          ["rates", "Rates & Pricing"],
          ["live", `Live Calls${liveCalls ? ` (${liveCalls.length})` : ""}`],
          ["cdr", `Customer CDR${cdrs ? ` (${cdrs.length})` : ""}`],
          ["reports", "Reports & Traffic"],
          ["limits", "Number Limits"],
          ["users", `Portal Users${users ? ` (${users.length})` : ""}`],
          ["audit", "Audit Trail"],
          ["raw", "Raw Payload (JSON & Tree)"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`tabBtnModern ${activeTab === key ? "active" : ""}`}
            onClick={() => setActiveTab(key as CustomerTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                Structured Attributes · {entries.length} verified database fields
              </h3>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Click copy icon to copy any ID/IP</span>
            </div>
            {entries.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No customer attributes found.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {entries.map(([key, val]) => {
                  const isMono = /(id|vos_account|prefix|endpoint|request_id|token|uuid|host|rate_group)/i.test(key);
                  const isStatusKey = /status|severity|state/i.test(key);
                  const isMoney = /balance|overdraft|threshold|amount|credit/i.test(key);
                  const raw = val === null || val === undefined ? "—" : typeof val === "object" ? JSON.stringify(val) : String(val);
                  const display = isMoney && raw !== "—" && !Number.isNaN(Number(raw)) ? formatMoney(raw, currency) : raw;
                  return (
                    <div key={key} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px" }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 4, letterSpacing: "0.04em" }}>{key.replace(/_/g, " ")}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        {isStatusKey ? (
                          <Status value={String(val)} size="sm" />
                        ) : (
                          <span className={isMono ? "mono" : ""} style={{ fontSize: isMoney ? 13 : 12.5, fontWeight: 600, color: "var(--text)", fontVariantNumeric: isMoney ? "tabular-nums" : undefined, wordBreak: isMono ? "break-all" : "break-word", textAlign: isMoney ? "right" : "left", flex: 1 }}>{display}</span>
                        )}
                        {raw !== "—" && (
                          <button type="button" onClick={() => copy(key, raw)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === key ? "var(--success)" : "var(--muted)", padding: 2 }} title="Copy">
                            <Icon name={copied === key ? "check" : "copy"} size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Traffic Trend Chart in Overview */}
          <div className="card" style={{ padding: 16 }}>
            <MultiSeriesChart
              series={chartSeries}
              height={190}
              title={`Telephony Activity & Spend Trend (${metricWindow.toUpperCase()})`}
              timestamps={chartTimestamps}
              intervals={[]}
            />
          </div>
        </div>
      )}

      {/* TAB 2: MAPPING GATEWAYS (1:N) */}
      {activeTab === "gateways" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                Mapping Gateways (1:N) · {gatewaysLoading ? "loading…" : `${gateways?.length ?? 0} mapped to customer`}
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                Multiple ingress mapping gateways linked to this account for PBXs, branches, and dialers.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn secondary sm" onClick={() => void loadGateways()} disabled={gatewaysLoading}>
                <Icon name="refresh" size={13} className={gatewaysLoading ? "spin" : ""} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  setGwErr(null);
                  setGwOk(null);
                  setCreateGwOpen(true);
                }}
              >
                <Icon name="plus" size={13} />
                <span>Create Mapping Gateway</span>
              </button>
            </div>
          </div>

          {gatewaysLoading && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ height: 110, borderRadius: "var(--radius-sm)", background: "var(--surface2)", border: "1px solid var(--border)", opacity: 0.6 }} />
              ))}
            </div>
          )}

          {gatewaysErr && (
            <FormErrorAlert error={gatewaysErr} onDismiss={() => setGatewaysErr(null)} onRetry={() => void loadGateways()} />
          )}

          {!gatewaysLoading && !gatewaysErr && (!gateways || gateways.length === 0) && (
            <div style={{ padding: 32, textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius)", background: "var(--surface2)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                <Icon name="gateway" size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No Mapping Gateways Found</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, maxWidth: 460, margin: "4px auto 0" }}>
                This customer has no mapping gateways provisioned yet. Create one to allow the customer to send incoming SIP traffic.
              </div>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  setGwErr(null);
                  setGwOk(null);
                  setCreateGwOpen(true);
                }}
                style={{ marginTop: 14 }}
              >
                <Icon name="plus" size={13} />
                <span>Create Mapping Gateway (1:N)</span>
              </button>
            </div>
          )}

          {!gatewaysLoading && !gatewaysErr && gateways && gateways.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {gateways.map((g: any) => {
                const isDynamic = g.register_type === "dynamic" || g.register_type === 1;
                const isLocked = g.status === "locked" || g.lockType > 0;
                return (
                  <div key={g.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                          <Icon name="gateway" size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 750, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>{g.name}</span>
                            <span className="badge" style={{ fontSize: 10, background: isDynamic ? "rgba(124,58,237,0.12)" : "rgba(37,99,235,0.12)", color: isDynamic ? "#7c3aed" : "var(--primary)", border: "1px solid var(--border)" }}>
                              {isDynamic ? "Dynamic SIP Register" : "Static IP Auth"}
                            </span>
                          </div>
                          <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                            <span>VOS ID: {g.vos_gateway_id}</span>
                            <button type="button" onClick={() => copy(`gw-${g.id}`, String(g.vos_gateway_id))} style={{ background: "none", border: "none", cursor: "pointer", color: copied === `gw-${g.id}` ? "var(--success)" : "var(--muted)", padding: 1 }} title="Copy VOS ID">
                              <Icon name={copied === `gw-${g.id}` ? "check" : "copy"} size={11} />
                            </button>
                          </div>
                        </div>
                      </div>
                      <Status value={g.status} size="sm" />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Configured IP / Whitelist</div>
                        <div className="mono" style={{ fontSize: 12, fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{g.configured_ip ?? (isDynamic ? "Dynamic" : "—")}</span>
                          {g.configured_ip && (
                            <button type="button" onClick={() => copy(`ip-${g.id}`, String(g.configured_ip))} style={{ background: "none", border: "none", cursor: "pointer", color: copied === `ip-${g.id}` ? "var(--success)" : "var(--muted)", padding: 1 }}>
                              <Icon name={copied === `ip-${g.id}` ? "check" : "copy"} size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "8px 10px" }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Capacity & CPS</div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                          {g.line_limit ?? 100} Lines · {g.cps_limit ?? 20} CPS
                        </div>
                      </div>
                    </div>

                    {/* Gateway Actions */}
                    <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => {
                          setIpTargetGw(String(g.id));
                          setIpValue(g.configured_ip || "");
                          setIpErr(null);
                          setIpOk(null);
                          setIpModalOpen(true);
                        }}
                        style={{ height: 28, fontSize: 11.5 }}
                      >
                        <Icon name="globe" size={12} />
                        <span>Update IP</span>
                      </button>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => {
                          setSipTargetGw(String(g.id));
                          setSipRegisterType(isDynamic ? "dynamic" : "static");
                          setSipUser(g.name);
                          setSipErr(null);
                          setSipOk(null);
                          setSipModalOpen(true);
                        }}
                        style={{ height: 28, fontSize: 11.5 }}
                      >
                        <Icon name="shield" size={12} />
                        <span>SIP Auth</span>
                      </button>
                      <button
                        type="button"
                        className="btn secondary sm"
                        onClick={() => void toggleGatewayLock(String(g.id), g.status)}
                        style={{ height: 28, fontSize: 11.5, color: isLocked ? "var(--success)" : "var(--danger)" }}
                      >
                        <Icon name={isLocked ? "check" : "alert"} size={12} />
                        <span>{isLocked ? "Unlock" : "Lock"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SIP REGISTRATION & AUTH */}
      {activeTab === "sip" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>SIP Registration & Trunk Authentication</h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Configure dynamic digest registration (SIP REGISTER) or IP authorization for this customer's trunks.</p>
            </div>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                setSipErr(null);
                setSipOk(null);
                setSipModalOpen(true);
              }}
            >
              <Icon name="shield" size={13} />
              <span>Configure SIP Auth</span>
            </button>
          </div>

          {/* Softswitch Connection Guide */}
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Softswitch SIP Trunk Connection Parameters</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>SIP Registrar / Proxy:</span>
                <div className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>62.84.182.223</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>SIP Port:</span>
                <div className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>5060 (UDP/TCP)</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>SIP Realm / Domain:</span>
                <div className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>vos3000</div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Supported Codecs:</span>
                <div className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>G.711u, G.711a, G.729</div>
              </div>
            </div>
          </div>

          {/* Mapping Gateways Auth List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {!gateways || gateways.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No mapping gateways linked to configure SIP authentication.{" "}
                <button type="button" onClick={() => setCreateGwOpen(true)} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer", padding: 0 }}>
                  Create mapping gateway
                </button>
              </div>
            ) : (
              gateways.map((g: any) => {
                const isDynamic = g.register_type === "dynamic" || g.register_type === 1;
                const gwKey = String(g.id);
                const isRevealed = !!showSipSecrets[gwKey];
                return (
                  <div key={g.id} style={{ border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 750, fontSize: 13.5 }}>{g.name}</span>
                        <span className="badge" style={{ fontSize: 10.5, background: isDynamic ? "rgba(124,58,237,0.12)" : "rgba(37,99,235,0.12)", color: isDynamic ? "#7c3aed" : "var(--primary)", border: "1px solid var(--border)" }}>
                          {isDynamic ? "Dynamic SIP Registration" : "Static IP Auth"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                        {isDynamic ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                            <span>SIP Account: <strong className="mono" style={{ color: "var(--text)" }}>{g.name}</strong></span>
                            <span>Password: <strong className="mono" style={{ color: "var(--text)" }}>{isRevealed ? "Configured in VOS" : "••••••••••••"}</strong></span>
                            <button
                              type="button"
                              onClick={() => setShowSipSecrets((prev) => ({ ...prev, [gwKey]: !prev[gwKey] }))}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 11.5, textDecoration: "underline" }}
                            >
                              {isRevealed ? "Hide" : "Reveal status"}
                            </button>
                          </div>
                        ) : (
                          <div>Authorized IP: <strong className="mono" style={{ color: "var(--text)" }}>{g.configured_ip ?? "No IP configured"}</strong></div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() => {
                        setSipTargetGw(String(g.id));
                        setSipRegisterType(isDynamic ? "dynamic" : "static");
                        setSipUser(g.name);
                        setSipErr(null);
                        setSipOk(null);
                        setSipModalOpen(true);
                      }}
                      style={{ height: 30 }}
                    >
                      <Icon name="shield" size={13} />
                      <span>Edit Credentials / Auth Mode</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: IP WHITELIST & MANAGEMENT */}
      {activeTab === "ip" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>Customer IP Address Whitelist</h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Authorized remote IPv4/IPv6 addresses and subnets for this customer's gateways.</p>
            </div>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                setIpErr(null);
                setIpOk(null);
                setIpModalOpen(true);
              }}
            >
              <Icon name="plus" size={13} />
              <span>Update Gateway IP</span>
            </button>
          </div>

          {!gateways || gateways.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No gateways configured to manage IP addresses.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 10px" }}>Gateway</th>
                    <th style={{ padding: "8px 10px" }}>Auth Mode</th>
                    <th style={{ padding: "8px 10px" }}>Authorized IP Address / CIDR</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {gateways.map((g: any) => (
                    <tr key={g.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 600 }}>{g.name}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{g.vos_gateway_id}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span className="badge" style={{ fontSize: 10.5 }}>{g.register_type === "dynamic" || g.register_type === 1 ? "Dynamic SIP" : "Static IP"}</span>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <div className="mono" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{g.configured_ip || "—"}</span>
                          {g.configured_ip && (
                            <button type="button" onClick={() => copy(`ip-${g.id}`, String(g.configured_ip))} style={{ background: "none", border: "none", cursor: "pointer", color: copied === `ip-${g.id}` ? "var(--success)" : "var(--muted)", padding: 1 }}>
                              <Icon name={copied === `ip-${g.id}` ? "check" : "copy"} size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "10px" }}><Status value={g.status} size="sm" /></td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => {
                            setIpTargetGw(String(g.id));
                            setIpValue(g.configured_ip || "");
                            setIpModalOpen(true);
                          }}
                          style={{ height: 28, fontSize: 11.5 }}
                        >
                          Edit IP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BILLING & LEDGER */}
      {activeTab === "billing" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>Financial Ledger & Balance Adjustments</h3>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  setFundsErr(null);
                  setFundsOk(null);
                  setFundsOpen(true);
                }}
                style={{ background: "var(--success)", borderColor: "var(--success)" }}
              >
                <Icon name="dollar" size={13} />
                <span>Add Funds Manually</span>
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Current Balance</div>
                <div style={{ fontSize: 20, fontWeight: 750, marginTop: 4, color: negativeBalance ? "var(--danger)" : "var(--text)", fontVariantNumeric: "tabular-nums" }}>{billingBalancePreview}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{currency} ledger</div>
              </div>
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Available Credit</div>
                <div style={{ fontSize: 20, fontWeight: 750, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{creditPreview}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Overdraft {formatMoney(overdraft, currency)}</div>
              </div>
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Rate Group</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4, color: rateGroupId ? "var(--text)" : "var(--warning)" }}>
                    {activeRateGroupName || (rateGroupId ? String(rateGroupId).slice(0, 12) + "…" : "Unassigned")}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{rateGroupId ? "Active tariff plan" : "No pricing group"}</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRgToAssign(rateGroupId || "");
                    setAssignRgErr(null);
                    setAssignRgOpen(true);
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--primary)", fontSize: 11.5, fontWeight: 650, padding: 0 }}
                >
                  {rateGroupId ? "Change" : "Assign"}
                </button>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Ledger Transactions History</div>
            {ledgerLoading ? (
              <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                <Icon name="refresh" size={13} className="spin" /> Loading ledger…
              </div>
            ) : !ledger || ledger.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 12.5 }}>No ledger entries found for this customer. Use "Add Funds" to record a manual transaction.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "8px 10px" }}>Date</th>
                      <th style={{ padding: "8px 10px" }}>Type</th>
                      <th style={{ padding: "8px 10px" }}>Reason / Memo</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Amount</th>
                      <th style={{ padding: "8px 10px" }}>Idempotency Ref</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((entry: any) => {
                      const isCredit = entry.direction === "credit";
                      return (
                        <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 10px", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{formatDate(entry.created_at)}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className="badge" style={{ background: isCredit ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: isCredit ? "#10b981" : "#ef4444", fontSize: 10.5, textTransform: "uppercase", fontWeight: 700 }}>
                              {entry.direction}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px" }}>{entry.reason}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: isCredit ? "var(--success)" : "var(--danger)", fontVariantNumeric: "tabular-nums" }}>
                            {isCredit ? "+" : "-"}{formatMoney(entry.amount, entry.currency || currency)}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{entry.idempotency_key ? String(entry.idempotency_key).slice(0, 16) + "…" : "—"}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: RATES & PRICING */}
      {activeTab === "rates" && (
        <div style={{ display: "grid", gap: 14 }}>
          {/* Rate Group Overview & Actions Banner */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                  Customer Tariff Deck & Rate Group
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Active pricing rate group, destination prefix ratings, and custom prefix additions for this customer.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => {
                    setNewRatePrefix("");
                    setNewRateArea("");
                    setNewRatePrice("");
                    setAddRateErr(null);
                    setAddRateOpen(true);
                  }}
                  disabled={!rateGroupId}
                  style={{ height: 32 }}
                  title={!rateGroupId ? "Assign a Rate Group first before adding individual prefix rates" : "Add rate prefix to this group"}
                >
                  <Icon name="plus" size={13} />
                  <span>Add Rate Prefix</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setSelectedRgToAssign(rateGroupId || "");
                    setAssignRgErr(null);
                    setAssignRgOpen(true);
                  }}
                  style={{ height: 32 }}
                >
                  <Icon name="tag" size={13} />
                  <span>{rateGroupId ? "Change Rate Group" : "Assign Rate Group"}</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setNewRgName("");
                    setCreateRgErr(null);
                    setCreateRgOpen(true);
                  }}
                  style={{ height: 32 }}
                >
                  <Icon name="plus" size={13} />
                  <span>Create Rate Group</span>
                </button>
                {rateGroupId && (
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => {
                      setUnassignErr(null);
                      setUnassignRgConfirmOpen(true);
                    }}
                    style={{ height: 32, color: "var(--danger)", borderColor: "rgba(239,68,68,0.3)" }}
                    title="Detach and unassign this Rate Group from customer"
                  >
                    <Icon name="close" size={13} />
                    <span>Unassign Rate Group</span>
                  </button>
                )}
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    void loadRatesList();
                    void loadAllRateGroups();
                  }}
                  disabled={ratesListLoading || rateGroupsLoading}
                  style={{ height: 32 }}
                >
                  <Icon name="refresh" size={13} className={ratesListLoading ? "spin" : ""} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Rate Group Summary Card / Warning */}
            {rateGroupId ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Assigned Rate Group</div>
                  <div style={{ fontSize: 16, fontWeight: 750, marginTop: 4, color: "var(--text)" }}>{activeRateGroupName || "Custom Rate Group"}</div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{rateGroupId}</span>
                    <button type="button" onClick={() => copy("rgid", rateGroupId)} style={{ background: "none", border: "none", cursor: "pointer", color: copied === "rgid" ? "var(--success)" : "var(--muted)", padding: 1 }}>
                      <Icon name={copied === "rgid" ? "check" : "copy"} size={11} />
                    </button>
                  </div>
                </div>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Total Prefix Rates</div>
                  <div style={{ fontSize: 20, fontWeight: 750, marginTop: 4, color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
                    {ratesListLoading ? "…" : ratesList?.length ?? 0}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Active destination entries</div>
                </div>
                <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Billing Currency</div>
                  <div style={{ fontSize: 20, fontWeight: 750, marginTop: 4, color: "var(--text)" }}>{currency}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Tariff rating unit</div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "14px 16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "var(--radius)", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(245,158,11,0.15)", color: "#f59e0b", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name="alert" size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 750, fontSize: 13.5, color: "var(--text)" }}>No Rate Group Assigned to Customer</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Outbound calls will not have prefix destination rate calculations or will fall back to unbilled default rules.
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn primary sm" onClick={() => { setSelectedRgToAssign(""); setAssignRgErr(null); setAssignRgOpen(true); }} style={{ height: 32 }}>
                    <Icon name="tag" size={13} />
                    <span>Assign Rate Group</span>
                  </button>
                  <button type="button" className="btn secondary sm" onClick={() => { setNewRgName(""); setCreateRgErr(null); setCreateRgOpen(true); }} style={{ height: 32 }}>
                    <Icon name="plus" size={13} />
                    <span>Create New</span>
                  </button>
                </div>
              </div>
            )}

            {/* Rate Prefix Calculator */}
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Test Destination Prefix (E.164)</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: 220 }}>
                  <input
                    type="text"
                    value={lookupPrefix}
                    onChange={(e) => setLookupPrefix(e.target.value)}
                    placeholder="e.g. 1, 44, 880, 971"
                    style={{ height: 34, padding: "0 10px 0 28px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace", border: "1px solid var(--border)", borderRadius: 6, width: "100%" }}
                  />
                  <span style={{ position: "absolute", left: 10, top: 8, color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>+</span>
                </div>
                <button type="button" className="btn primary sm" onClick={() => void calculateRate(lookupPrefix)} disabled={rateLoading} style={{ height: 34 }}>
                  <Icon name="search" size={13} />
                  <span>Lookup Rate</span>
                </button>
              </div>

              {rateCalcResult && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 14, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 12 }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Destination</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{rateCalcResult.destination}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Rate / Minute</div>
                    <div style={{ fontSize: 15, fontWeight: 750, color: "var(--success)", marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                      {formatMoney(rateCalcResult.ratePerMinute, currency)} / min
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Billing Interval</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }} className="mono">{rateCalcResult.billingInterval}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Tariff Group</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{rateCalcResult.tariffGroup}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Rates Table from Real Database */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
                Active Destination Rates ({ratesListLoading ? "loading…" : `${ratesList?.length ?? 0} destinations`})
              </div>
              {rateGroupId && ratesList && ratesList.length > 0 && (
                <button type="button" className="btn ghost sm" onClick={() => { setNewRatePrefix(""); setNewRateArea(""); setNewRatePrice(""); setAddRateErr(null); setAddRateOpen(true); }} style={{ height: 26, fontSize: 11.5, color: "var(--primary)" }}>
                  <Icon name="plus" size={12} />
                  <span>Add Another Prefix</span>
                </button>
              )}
            </div>

            {ratesListErr && (
              <FormErrorAlert error={ratesListErr} onDismiss={() => setRatesListErr(null)} />
            )}

            {ratesListLoading ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                <Icon name="refresh" size={14} className="spin" /> Loading rate plan…
              </div>
            ) : !ratesList || ratesList.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius)", background: "var(--surface2)" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                  <Icon name="tag" size={20} />
                </div>
                <div style={{ fontWeight: 650, fontSize: 13 }}>
                  {rateGroupId ? `No rate prefixes exist under ${activeRateGroupName || "this Rate Group"}.` : "No Rate Group assigned to this customer."}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, maxWidth: 460, margin: "4px auto 14px" }}>
                  {rateGroupId
                    ? "Add your first destination prefix (e.g. +1, +44, +880) to configure per-minute pricing for this rate group."
                    : "Assign a rate group or create a new one to begin managing destination prefix tariffs."}
                </div>
                {rateGroupId ? (
                  <button type="button" className="btn primary sm" onClick={() => { setNewRatePrefix(""); setNewRateArea(""); setNewRatePrice(""); setAddRateErr(null); setAddRateOpen(true); }} style={{ height: 32 }}>
                    <Icon name="plus" size={13} />
                    <span>Add First Rate Prefix</span>
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <button type="button" className="btn primary sm" onClick={() => { setSelectedRgToAssign(""); setAssignRgErr(null); setAssignRgOpen(true); }} style={{ height: 32 }}>
                      <Icon name="tag" size={13} />
                      <span>Assign Existing Rate Group</span>
                    </button>
                    <button type="button" className="btn secondary sm" onClick={() => { setNewRgName(""); setCreateRgErr(null); setCreateRgOpen(true); }} style={{ height: 32 }}>
                      <Icon name="plus" size={13} />
                      <span>Create New Rate Group</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                      <th style={{ padding: "8px 10px" }}>Dial Prefix</th>
                      <th style={{ padding: "8px 10px" }}>Destination / Area</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Rate / Min</th>
                      <th style={{ padding: "8px 10px" }}>Billing Cycle</th>
                      <th style={{ padding: "8px 10px" }}>Rate Type</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratesList.map((r: any, i: number) => (
                      <tr key={r.id || i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }} className="mono">+{r.prefix}</td>
                        <td style={{ padding: "8px 10px" }}>{r.area_name || r.destination || `Prefix +${r.prefix}`}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                          {formatMoney(r.rate_per_minute ?? r.rate ?? 0, currency)}
                        </td>
                        <td style={{ padding: "8px 10px" }} className="mono">{r.billing_cycle_seconds ? `${r.billing_cycle_seconds}s / ${r.billing_cycle_seconds}s` : "60s / 60s"}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span className="badge badge-online" style={{ fontSize: 10 }}>{r.rate_type || "Standard"}</span>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn secondary sm"
                            onClick={() => void deleteRatePrefix(String(r.id))}
                            disabled={deletingRateId === String(r.id)}
                            style={{ height: 26, fontSize: 11, color: "var(--danger)", padding: "0 8px" }}
                            title="Remove rate prefix"
                          >
                            {deletingRateId === String(r.id) ? (
                              <Icon name="refresh" size={11} className="spin" />
                            ) : (
                              <>
                                <Icon name="close" size={11} />
                                <span>Remove</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: LIVE CALLS */}
      {activeTab === "live" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                Active Telephony Channels · Real-time Softswitch ({liveCalls?.length ?? 0})
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Live ongoing calls originating or terminating on this customer's mapping gateways.</p>
            </div>
            <button type="button" className="btn secondary sm" onClick={() => void loadLiveCalls()} disabled={liveCallsLoading}>
              <Icon name="refresh" size={13} className={liveCallsLoading ? "spin" : ""} />
              <span>Refresh Calls</span>
            </button>
          </div>

          {liveCallsErr && (
            <FormErrorAlert error={liveCallsErr} onDismiss={() => setLiveCallsErr(null)} onRetry={() => void loadLiveCalls()} />
          )}

          {liveCallsLoading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <Icon name="refresh" size={14} className="spin" /> Querying softswitch live channels…
            </div>
          ) : !liveCalls || liveCalls.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius)", background: "var(--surface2)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                <Icon name="pulse" size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No Active Calls Right Now</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                This customer currently has 0 concurrent active channels on the softswitch.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 10px" }}>Call ID / Channel</th>
                    <th style={{ padding: "8px 10px" }}>Caller</th>
                    <th style={{ padding: "8px 10px" }}>Callee</th>
                    <th style={{ padding: "8px 10px" }}>Gateway</th>
                    <th style={{ padding: "8px 10px" }}>Codec</th>
                    <th style={{ padding: "8px 10px" }}>Duration</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {liveCalls.map((c: any, i: number) => {
                    const cid = c.call_id || c.id || `CALL-${i + 1}`;
                    return (
                      <tr key={cid} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px" }}>
                          <span className="mono" style={{ fontWeight: 600, fontSize: 12 }}>{cid}</span>
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <PhonePill value={c.caller || c.caller_e164} />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <PhonePill value={c.callee || c.callee_e164} />
                        </td>
                        <td style={{ padding: "8px 10px" }} className="mono">{c.mapping_gateway_id || c.gateway_id || "—"}</td>
                        <td style={{ padding: "8px 10px" }}><span className="badge" style={{ fontSize: 10 }}>{c.codec || "G.711u"}</span></td>
                        <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums", color: "var(--primary)", fontWeight: 700 }}>
                          {c.duration_seconds !== undefined ? `${c.duration_seconds}s` : c.duration !== undefined ? `${c.duration}s` : "0s"}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn secondary sm"
                            onClick={() => void disconnectLiveCall(cid)}
                            style={{ height: 26, fontSize: 11, color: "var(--danger)", borderColor: "var(--danger-border)" }}
                          >
                            Disconnect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: CUSTOMER CDR (CLICKHOUSE) */}
      {activeTab === "cdr" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>Customer CDR Stream · ClickHouse</h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Live verified call detail records scoped to this customer.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn secondary sm" onClick={() => void loadCdrs()} disabled={cdrsLoading}>
                <Icon name="refresh" size={13} className={cdrsLoading ? "spin" : ""} />
                <span>Refresh</span>
              </button>
              <Link href={customerId ? `/admin/cdr?customer=${customerId}` : "/admin/cdr"} className="btn primary sm">
                <Icon name="cdr" size={13} />
                <span>Open CDR Explorer</span>
              </Link>
            </div>
          </div>

          {cdrsLoading ? (
            <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <Icon name="refresh" size={13} className="spin" /> Loading recent CDRs…
            </div>
          ) : !cdrs || cdrs.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No recent CDRs recorded for this customer in ClickHouse.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 10px" }}>Time</th>
                    <th style={{ padding: "8px 10px" }}>Caller</th>
                    <th style={{ padding: "8px 10px" }}>Callee</th>
                    <th style={{ padding: "8px 10px" }}>Duration</th>
                    <th style={{ padding: "8px 10px" }}>Charge</th>
                    <th style={{ padding: "8px 10px" }}>Gateway</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cdrs.map((c: any) => (
                    <tr key={c.serial_number} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 10px", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{formatDate(c.begin_time)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <PhonePill value={c.caller} />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <PhonePill value={c.callee} />
                      </td>
                      <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}>{c.duration}s</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{formatMoney(c.customer_charge, currency)}</td>
                      <td style={{ padding: "8px 10px" }} className="mono">{c.mapping_gateway_id || "—"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <Status value={c.answered === 1 ? "answered" : c.termination_reason || "failed"} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 9: REPORTS & TRAFFIC */}
      {activeTab === "reports" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                  Traffic Analytics & Call Completion Quality
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Direct ClickHouse CDR event aggregations for {entityName}.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>Window:</span>
                <div className="presetChips" style={{ display: "flex", gap: 4 }}>
                  {(["1m", "5m", "30m", "1h", "6h", "24h", "custom"] as const).map((win) => (
                    <button
                      key={win}
                      type="button"
                      className={`presetChip ${metricWindow === win ? "active" : ""}`}
                      onClick={() => setMetricWindow(win)}
                      style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6 }}
                    >
                      {win.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => void loadMetrics(metricWindow)}
                  disabled={metricsLoading}
                  style={{ height: 26, padding: "0 8px" }}
                  title="Refresh metrics"
                >
                  <Icon name="refresh" size={12} className={metricsLoading ? "spin" : ""} />
                </button>
              </div>
            </div>
            <MultiSeriesChart
              series={chartSeries}
              height={220}
              title={`Call Volume & Financial Spend (${metricWindow.toUpperCase()})`}
              timestamps={chartTimestamps}
              intervals={[]}
            />
          </div>

          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>Network Key Performance Indicators</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ background: "var(--surface2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Post Dial Delay (PDD)</div>
                <div style={{ fontSize: 18, fontWeight: 750, marginTop: 4 }}>
                  {metrics?.summary?.avg_pdd !== undefined && metrics.summary.avg_pdd > 0 ? `${metrics.summary.avg_pdd} ms` : "—"}
                </div>
                <div style={{ fontSize: 11, color: metrics?.summary?.avg_pdd && metrics.summary.avg_pdd < 2500 ? "var(--success)" : "var(--muted)", marginTop: 2 }}>
                  {metrics?.summary?.avg_pdd ? (metrics.summary.avg_pdd < 2500 ? "Within carrier SLA (< 2.5s)" : "Elevated latency") : "No traffic in window"}
                </div>
              </div>
              <div style={{ background: "var(--surface2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Answer-Seizure Ratio (ASR)</div>
                <div style={{ fontSize: 18, fontWeight: 750, marginTop: 4 }}>
                  {metrics?.summary?.asr !== undefined ? `${metrics.summary.asr}%` : "—"}
                </div>
                <div style={{ fontSize: 11, color: metrics?.summary?.asr && metrics.summary.asr > 50 ? "var(--success)" : "var(--muted)", marginTop: 2 }}>
                  {metrics?.summary?.calls ? `${metrics.summary.answered ?? 0} / ${metrics.summary.calls} answered` : "No traffic in window"}
                </div>
              </div>
              <div style={{ background: "var(--surface2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Active Concurrent Channels</div>
                <div style={{ fontSize: 18, fontWeight: 750, marginTop: 4 }}>
                  {liveCalls ? `${liveCalls.length} active` : "0 active"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {gateways && gateways.length > 0 ? `${gateways.reduce((acc, g) => acc + (Number(g.line_limit ?? g.capacity) || 100), 0)} line capacity` : "Live Softswitch Session"}
                </div>
              </div>
              <div style={{ background: "var(--surface2)", padding: 12, borderRadius: 6, border: "1px solid var(--border)" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700, textTransform: "uppercase" }}>Total Billed Traffic</div>
                <div style={{ fontSize: 18, fontWeight: 750, marginTop: 4, color: "var(--primary)" }}>
                  {metrics?.summary?.minutes !== undefined ? `${Number(metrics.summary.minutes).toLocaleString()} mins` : "0 mins"}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {metrics?.summary?.spend !== undefined ? `${formatMoney(metrics.summary.spend, currency)} total spend` : "0.00 spend"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 10: NUMBER LIMITS */}
      {activeTab === "limits" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                E.164 Number Section Limits & Prefix Permissions ({numberLimitsLoading ? "loading…" : `${numberLimits?.length ?? 0} rules`})
              </h3>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Controlled prefix boundaries and maximum concurrent channels per destination group.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn secondary sm" onClick={() => void loadNumberLimits()} disabled={numberLimitsLoading}>
                <Icon name="refresh" size={13} className={numberLimitsLoading ? "spin" : ""} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  setLimitErr(null);
                  setCreateLimitOpen(true);
                }}
              >
                <Icon name="plus" size={13} />
                <span>Add Prefix Rule</span>
              </button>
            </div>
          </div>

          {numberLimitsLoading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <Icon name="refresh" size={14} className="spin" /> Loading prefix restrictions…
            </div>
          ) : !numberLimits || numberLimits.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius)", background: "var(--surface2)" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                <Icon name="shield" size={22} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>No Custom Prefix Limits Configured</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, maxWidth: 460, margin: "4px auto 14px" }}>
                This customer operates under default mapping gateway line capacity and CPS limits. Add a prefix rule to restrict or allocate channels to specific destination groups.
              </div>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => {
                  setLimitErr(null);
                  setCreateLimitOpen(true);
                }}
              >
                <Icon name="plus" size={13} />
                <span>Add First Prefix Rule</span>
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 10px" }}>Prefix</th>
                    <th style={{ padding: "8px 10px" }}>Destination Name</th>
                    <th style={{ padding: "8px 10px" }}>Call Direction</th>
                    <th style={{ padding: "8px 10px" }}>Max Channels</th>
                    <th style={{ padding: "8px 10px" }}>CPS Limit</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {numberLimits.map((lim: any, idx: number) => (
                    <tr key={lim.id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 750 }} className="mono">+{lim.prefix}</td>
                      <td style={{ padding: "8px 10px" }}>{lim.destination || `Prefix +${lim.prefix}`}</td>
                      <td style={{ padding: "8px 10px" }}>{lim.direction || "Ingress + Egress"}</td>
                      <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}>{lim.lines ?? lim.max_lines ?? 100} lines</td>
                      <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}>{lim.cps ?? lim.cps_limit ?? 20} CPS</td>
                      <td style={{ padding: "8px 10px" }}><Status value={lim.status || "active"} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 11: PORTAL USERS */}
      {activeTab === "users" && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
              Portal Users · {usersLoading ? "loading…" : `${users?.length ?? 0} in customer organization`}
            </h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn secondary sm" onClick={() => void loadUsers()} disabled={usersLoading}>
                <Icon name="refresh" size={13} className={usersLoading ? "spin" : ""} />
                <span>Refresh</span>
              </button>
              <button type="button" className="btn primary sm" onClick={() => setPwdOpen(true)}>
                <Icon name="shield" size={13} />
                <span>Reset Password</span>
              </button>
            </div>
          </div>

          {usersLoading && (
            <div style={{ padding: 18, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              <Icon name="refresh" size={14} className="spin" /> Loading users…
            </div>
          )}
          {!usersLoading && usersErr && (
            <FormErrorAlert error={usersErr} onDismiss={() => setUsersErr(null)} />
          )}
          {!usersLoading && !usersErr && users && users.length === 0 && (
            <div style={{ padding: 22, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>No portal users found for this customer.</div>
          )}
          {!usersLoading && !usersErr && users && users.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid var(--border)" }}>
                    <th style={{ padding: "8px 10px" }}>User</th>
                    <th style={{ padding: "8px 10px" }}>Role</th>
                    <th style={{ padding: "8px 10px" }}>Status</th>
                    <th style={{ padding: "8px 10px" }}>Last Login</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u: any) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px" }}>
                        <div style={{ fontWeight: 600 }}>{u.display_name ?? u.email}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "10px" }}>
                        <span className="badge" style={{ background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 11 }}>
                          {Array.isArray(u.roles) ? u.roles.join(", ") : u.roles ?? "—"}
                        </span>
                      </td>
                      <td style={{ padding: "10px" }}><Status value={u.status} size="sm" /></td>
                      <td style={{ padding: "10px", fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                        {u.last_login_at ? formatDate(u.last_login_at) : "—"}
                      </td>
                      <td style={{ padding: "10px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => {
                            setPwdTarget(String(u.id));
                            setPwdOpen(true);
                          }}
                          style={{ height: 28, fontSize: 12 }}
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 12: AUDIT & ACTIVITY LOG */}
      {activeTab === "audit" && (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)" }}>
                  Administrative Activity Audit Trail ({auditLoading ? "loading…" : `${timelineEvents.length} events`})
                </h3>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Immutable compliance log recording all balance changes, gateway creations, and security events.</p>
              </div>
              <button type="button" className="btn secondary sm" onClick={() => void loadAudit()} disabled={auditLoading}>
                <Icon name="refresh" size={13} className={auditLoading ? "spin" : ""} />
                <span>Refresh Log</span>
              </button>
            </div>
            {auditLoading ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                <Icon name="refresh" size={14} className="spin" /> Loading customer audit trail…
              </div>
            ) : timelineEvents.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", border: "1px dashed var(--border)", borderRadius: "var(--radius)", background: "var(--surface2)" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "grid", placeItems: "center", margin: "0 auto 10px" }}>
                  <Icon name="audit" size={22} />
                </div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>No Audit Events Recorded Yet</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                  Administrative mutations (funds adjustments, gateway changes, credentials) for this customer will be logged here.
                </div>
              </div>
            ) : (
              <ActivityTimeline events={timelineEvents} title={`Audit Events (${timelineEvents.length})`} />
            )}
          </div>
        </div>
      )}

      {/* TAB 13: RAW PAYLOAD & TELEMETRY INSPECTOR (BRAND NEW) */}
      {activeTab === "raw" && (
        <RawJsonInspector
          data={firstRow}
          compositeData={compositeTelemetryData}
          title={entityName}
          filenamePrefix="customer_raw_telemetry"
          onReload={() => {
            void loadMetrics(metricWindow);
            void loadGateways();
            void loadUsers();
            void loadLedger();
            void loadCdrs();
          }}
          source="PostgreSQL (vos_portal) + VOS 3000 Adapter"
        />
      )}

      {/* MODAL 1: ADD FUNDS MANUALLY */}
      {fundsOpen && (
        <div className="cmdBackdrop" onClick={() => !fundsBusy && setFundsOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "rgba(16,185,129,0.08)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--success)", fontWeight: 750, fontSize: 13 }}>
                <Icon name="dollar" size={16} />
                <span>Add / Adjust Customer Funds</span>
              </div>
              <button type="button" onClick={() => !fundsBusy && setFundsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitAddFunds} style={{ padding: 16 }}>
              <FormErrorAlert error={fundsErr} onDismiss={() => setFundsErr(null)} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                Adjust funds for <strong style={{ color: "var(--text)" }}>{entityName}</strong>. This creates an audited ledger entry and synchronizes the balance.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Adjustment Direction</label>
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="direction" checked={fundsDirection === "credit"} onChange={() => setFundsDirection("credit")} />
                      <span style={{ fontWeight: 600, color: "var(--success)" }}>Credit (+) Top-up / Deposit</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="direction" checked={fundsDirection === "debit"} onChange={() => setFundsDirection("debit")} />
                      <span style={{ fontWeight: 600, color: "var(--danger)" }}>Debit (-) Deduction / Fee</span>
                    </label>
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="funds-amt" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                    Amount ({currency}) <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input id="funds-amt" type="number" step="0.01" min="0.01" value={fundsAmount} onChange={(e) => setFundsAmount(e.target.value)} placeholder="e.g. 250.00" required style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={fundsBusy} />
                </div>

                <div className="field">
                  <label htmlFor="funds-cat" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Adjustment Category</label>
                  <select id="funds-cat" value={fundsCategory} onChange={(e) => setFundsCategory(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", fontSize: 13 }} disabled={fundsBusy}>
                    <option value="wire_transfer">Bank Wire Transfer</option>
                    <option value="credit_card">Credit Card / Gateway</option>
                    <option value="manual_adjustment">Operator Manual Top-Up</option>
                    <option value="promotional_credit">Promotional Bonus</option>
                    <option value="dispute_correction">Dispute / Correction</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="funds-ref" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Reference Number / Wire ID</label>
                  <input id="funds-ref" value={fundsRef} onChange={(e) => setFundsRef(e.target.value)} placeholder="e.g. TXN-998824" style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={fundsBusy} />
                </div>

                <div className="field">
                  <label htmlFor="funds-memo" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Operator Note / Reason <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input id="funds-memo" value={fundsMemo} onChange={(e) => setFundsMemo(e.target.value)} placeholder="e.g. Received confirmation from accounting" required style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={fundsBusy} />
                </div>

                {fundsOk && <div style={{ padding: "8px 10px", background: "var(--success-bg)", color: "var(--success)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}><Icon name="check" size={12} /> Balance updated to {formatMoney(fundsOk.new_balance, currency)}!</div>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setFundsOpen(false)} disabled={fundsBusy} style={{ height: 36 }}>Cancel</button>
                <button type="submit" className="btn primary" disabled={fundsBusy || !fundsAmount || Number(fundsAmount) <= 0} style={{ height: 36, background: "var(--success)", borderColor: "var(--success)" }}>
                  {fundsBusy ? "Processing…" : `Confirm ${fundsDirection === "credit" ? "Credit" : "Debit"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE MAPPING GATEWAY (1:N) */}
      {createGwOpen && (
        <div className="cmdBackdrop" onClick={() => !gwBusy && setCreateGwOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "rgba(37,99,235,0.08)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--primary)", fontWeight: 750, fontSize: 13 }}>
                <Icon name="gateway" size={16} />
                <span>Create Mapping Gateway (Linked 1:N)</span>
              </div>
              <button type="button" onClick={() => !gwBusy && setCreateGwOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitCreateGateway} style={{ padding: 16 }}>
              <FormErrorAlert error={gwErr} onDismiss={() => setGwErr(null)} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                Provision a new mapping gateway linked to <strong style={{ color: "var(--text)" }}>{entityName}</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="gw-name" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Gateway Name / Trunk ID <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input id="gw-name" value={gwName} onChange={(e) => setGwName(e.target.value)} placeholder="e.g. gw_customer_01" required style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={gwBusy} />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Authentication Mode</label>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="gwRegType" checked={gwRegisterType === "static"} onChange={() => setGwRegisterType("static")} />
                      <span>Static IP Authorization</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="gwRegType" checked={gwRegisterType === "dynamic"} onChange={() => setGwRegisterType("dynamic")} />
                      <span>Dynamic SIP Registration</span>
                    </label>
                  </div>
                </div>

                {gwRegisterType === "static" ? (
                  <div className="field">
                    <label htmlFor="gw-ip" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Authorized Remote IP / CIDR <span style={{ color: "var(--danger)" }}>*</span></label>
                    <input id="gw-ip" value={gwIp} onChange={(e) => setGwIp(e.target.value)} placeholder="e.g. 203.0.113.50" required style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace" }} disabled={gwBusy} />
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div className="field">
                      <label htmlFor="gw-sip-user" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>SIP Account</label>
                      <input id="gw-sip-user" value={gwSipUser} onChange={(e) => setGwSipUser(e.target.value)} placeholder="Defaults to Gateway Name" style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={gwBusy} />
                    </div>
                    <div className="field">
                      <label htmlFor="gw-sip-pwd" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>SIP Password</label>
                      <input id="gw-sip-pwd" type="password" value={gwSipPwd} onChange={(e) => setGwSipPwd(e.target.value)} placeholder="Auto-generated if empty" style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={gwBusy} />
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label htmlFor="gw-lines" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Capacity (Lines)</label>
                    <input id="gw-lines" type="number" min="1" value={gwLineLimit} onChange={(e) => setGwLineLimit(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={gwBusy} />
                  </div>
                  <div className="field">
                    <label htmlFor="gw-cps" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>CPS Limit</label>
                    <input id="gw-cps" type="number" min="1" value={gwCpsLimit} onChange={(e) => setGwCpsLimit(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={gwBusy} />
                  </div>
                </div>

                {gwOk && <div style={{ padding: "8px 10px", background: "var(--success-bg)", color: "var(--success)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}><Icon name="check" size={12} /> Gateway {gwOk.name} created!</div>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setCreateGwOpen(false)} disabled={gwBusy} style={{ height: 36 }}>Cancel</button>
                <button type="submit" className="btn primary" disabled={gwBusy || !gwName.trim()} style={{ height: 36 }}>
                  {gwBusy ? "Provisioning…" : "Create Gateway"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: UPDATE IP ADDRESS */}
      {ipModalOpen && (
        <div className="cmdBackdrop" onClick={() => !ipBusy && setIpModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750, fontSize: 13 }}>
                <Icon name="globe" size={16} />
                <span>Update Gateway Authorized IP</span>
              </div>
              <button type="button" onClick={() => !ipBusy && setIpModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitUpdateIp} style={{ padding: 16 }}>
              <FormErrorAlert error={ipErr} onDismiss={() => setIpErr(null)} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="ip-gw-sel" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Target Gateway</label>
                  <select id="ip-gw-sel" value={ipTargetGw} onChange={(e) => setIpTargetGw(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", fontSize: 13 }} disabled={ipBusy}>
                    {gateways && gateways.map((g: any) => (
                      <option key={g.id} value={String(g.id)}>{g.name} ({g.configured_ip || "Dynamic"})</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="ip-val" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>New IP Address / CIDR <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input id="ip-val" value={ipValue} onChange={(e) => setIpValue(e.target.value)} placeholder="e.g. 198.51.100.22" required style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace" }} disabled={ipBusy} />
                </div>
                {ipOk && <div style={{ padding: "8px 10px", background: "var(--success-bg)", color: "var(--success)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}><Icon name="check" size={12} /> IP updated successfully!</div>}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setIpModalOpen(false)} disabled={ipBusy} style={{ height: 36 }}>Cancel</button>
                <button type="submit" className="btn primary" disabled={ipBusy || !ipValue.trim()} style={{ height: 36 }}>
                  {ipBusy ? "Saving…" : "Save IP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: SIP AUTHENTICATION CONFIG */}
      {sipModalOpen && (
        <div className="cmdBackdrop" onClick={() => !sipBusy && setSipModalOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "rgba(124,58,237,0.08)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#7c3aed", fontWeight: 750, fontSize: 13 }}>
                <Icon name="shield" size={16} />
                <span>Configure SIP Trunk Registration Auth</span>
              </div>
              <button type="button" onClick={() => !sipBusy && setSipModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitSipAuth} style={{ padding: 16 }}>
              <FormErrorAlert error={sipErr} onDismiss={() => setSipErr(null)} />
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="sip-gw-sel" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Target Gateway</label>
                  <select
                    id="sip-gw-sel"
                    value={sipTargetGw}
                    onChange={(e) => {
                      setSipTargetGw(e.target.value);
                      const found = gateways?.find((g) => String(g.id) === e.target.value);
                      if (found) setSipUser(found.name);
                    }}
                    style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", fontSize: 13 }}
                    disabled={sipBusy}
                  >
                    {gateways && gateways.map((g: any) => (
                      <option key={g.id} value={String(g.id)}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Authentication Mode</label>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="sipMode" checked={sipRegisterType === "dynamic"} onChange={() => setSipRegisterType("dynamic")} />
                      <span>Dynamic SIP Registration (Digest Auth)</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                      <input type="radio" name="sipMode" checked={sipRegisterType === "static"} onChange={() => setSipRegisterType("static")} />
                      <span>Static IP Auth</span>
                    </label>
                  </div>
                </div>
                {sipRegisterType === "dynamic" && (
                  <>
                    <div className="field">
                      <label htmlFor="sip-user-val" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>SIP Username / Account</label>
                      <input id="sip-user-val" value={sipUser} onChange={(e) => setSipUser(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={sipBusy} />
                    </div>
                    <div className="field">
                      <label htmlFor="sip-pwd-val" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>New SIP Trunk Password</label>
                      <input id="sip-pwd-val" type="password" value={sipPwd} onChange={(e) => setSipPwd(e.target.value)} placeholder="Leave blank to keep current" style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={sipBusy} />
                    </div>
                  </>
                )}
                {sipOk && <div style={{ padding: "8px 10px", background: "var(--success-bg)", color: "var(--success)", borderRadius: 6, fontSize: 12, fontWeight: 600 }}><Icon name="check" size={12} /> SIP credentials updated!</div>}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setSipModalOpen(false)} disabled={sipBusy} style={{ height: 36 }}>Cancel</button>
                <button type="submit" className="btn primary" disabled={sipBusy} style={{ height: 36, background: "#7c3aed", borderColor: "#7c3aed" }}>
                  {sipBusy ? "Saving…" : "Save SIP Auth"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: RESET PORTAL PASSWORD */}
      {pwdOpen && (
        <div className="cmdBackdrop" onClick={() => !pwdBusy && setPwdOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--warning-bg)", borderBottom: "1px solid var(--warning-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--warning)", fontWeight: 750, fontSize: 13 }}>
                <Icon name="shield" size={16} />
                <span>Reset Portal Password</span>
              </div>
              <button type="button" onClick={() => !pwdBusy && setPwdOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitPassword} style={{ padding: 16 }}>
              <FormErrorAlert error={pwdErr || (pwdMismatch ? "Passwords do not match." : null)} onDismiss={() => setPwdErr(null)} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                This resets the portal login password for a user in <strong style={{ color: "var(--text)" }}>{entityName}</strong>. The user will be signed out of all sessions.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="pwd-user" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Target portal user</label>
                  {usersLoading ? (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>Loading users…</div>
                  ) : users && users.length > 0 ? (
                    <select id="pwd-user" value={pwdTarget} onChange={(e) => setPwdTarget(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", color: "var(--text)", fontSize: 13 }} disabled={pwdBusy}>
                      {users.map((u: any) => (
                        <option key={u.id} value={String(u.id)}>{u.email} — {u.display_name ?? (Array.isArray(u.roles) ? u.roles.join(",") : "")}</option>
                      ))}
                    </select>
                  ) : (
                    <input id="pwd-user" value={pwdTarget} onChange={(e) => setPwdTarget(e.target.value)} placeholder="User ID" style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={pwdBusy} />
                  )}
                </div>

                <div className="field">
                  <label htmlFor="pwd-new" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>New password <span style={{ color: "var(--danger)" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input id="pwd-new" type={showPwd ? "text" : "password"} value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} placeholder="At least 10 characters" autoComplete="new-password" style={{ width: "100%", height: 36, border: `1px solid ${pwdNew && pwdNew.length < 10 ? "var(--danger)" : "var(--border)"}`, borderRadius: 6, padding: "0 36px 0 10px", fontSize: 13 }} disabled={pwdBusy} />
                    <button type="button" onClick={() => setShowPwd((v) => !v)} style={{ position: "absolute", right: 6, top: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }} title={showPwd ? "Hide" : "Show"}>
                      <Icon name={showPwd ? "eyeoff" : "eye"} size={14} />
                    </button>
                  </div>
                  {pwdNew && <div style={{ fontSize: 11.5, marginTop: 4, color: pwdStrength.color }}>{pwdStrength.label}</div>}
                </div>

                <div className="field">
                  <label htmlFor="pwd-confirm" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Confirm password <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input id="pwd-confirm" type={showPwd ? "text" : "password"} value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} placeholder="Repeat new password" autoComplete="new-password" style={{ width: "100%", height: 36, border: `1px solid ${pwdMismatch ? "var(--danger)" : "var(--border)"}`, borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={pwdBusy} />
                  {pwdMismatch && <div style={{ fontSize: 11.5, color: "var(--danger)", marginTop: 4 }}>Passwords do not match.</div>}
                </div>

                {pwdOk && (
                  <div style={{ padding: "10px 12px", background: "var(--success-bg)", border: "1px solid var(--success-border)", borderRadius: 8, color: "var(--success)", fontSize: 12.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="check" size={13} /> Password updated — user {pwdOk.email ?? ""} signed out.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setPwdOpen(false)} disabled={pwdBusy} style={{ height: 36 }}>Cancel</button>
                <button type="submit" className="btn primary" disabled={!pwdCanSubmit} style={{ height: 36, opacity: pwdCanSubmit ? 1 : 0.55 }}>
                  {pwdBusy ? (
                    <>
                      <Icon name="refresh" size={13} className="spin" />
                      <span>Updating…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="shield" size={13} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: CREATE PREFIX NUMBER LIMIT */}
      {createLimitOpen && (
        <div className="cmdBackdrop" onClick={() => !limitBusy && setCreateLimitOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750, fontSize: 13 }}>
                <Icon name="shield" size={16} />
                <span>Add E.164 Prefix Restriction Rule</span>
              </div>
              <button type="button" onClick={() => !limitBusy && setCreateLimitOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitCreateLimit} style={{ padding: 16 }}>
              <FormErrorAlert error={limitErr} onDismiss={() => setLimitErr(null)} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                Configure channel and CPS limit constraints for a specific dial prefix on <strong style={{ color: "var(--text)" }}>{entityName}</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="lim-pfx" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>E.164 Country/Area Prefix <span style={{ color: "var(--danger)" }}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input id="lim-pfx" value={limitPrefix} onChange={(e) => setLimitPrefix(e.target.value)} placeholder="e.g. 1, 44, 880, 971" required style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px 0 26px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace" }} disabled={limitBusy} />
                    <span style={{ position: "absolute", left: 10, top: 8, color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>+</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="lim-dest" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Destination Label</label>
                  <input id="lim-dest" value={limitDestination} onChange={(e) => setLimitDestination(e.target.value)} placeholder="e.g. United States Standard, UK Mobile" style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={limitBusy} />
                </div>
                <div className="field">
                  <label htmlFor="lim-dir" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Call Direction</label>
                  <select id="lim-dir" value={limitDirection} onChange={(e) => setLimitDirection(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", fontSize: 13 }} disabled={limitBusy}>
                    <option value="Ingress + Egress">Ingress + Egress (Bidirectional)</option>
                    <option value="Ingress">Ingress Only (Origination)</option>
                    <option value="Egress">Egress Only (Termination)</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label htmlFor="lim-lines" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Max Channels</label>
                    <input id="lim-lines" type="number" min="1" max="10000" value={limitLines} onChange={(e) => setLimitLines(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={limitBusy} />
                  </div>
                  <div className="field">
                    <label htmlFor="lim-cps" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>CPS Limit</label>
                    <input id="lim-cps" type="number" min="1" max="1000" value={limitCps} onChange={(e) => setLimitCps(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }} disabled={limitBusy} />
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setCreateLimitOpen(false)} disabled={limitBusy} style={{ height: 36 }}>Cancel</button>
                <button type="submit" className="btn primary" disabled={limitBusy || !limitPrefix.trim()} style={{ height: 36 }}>
                  {limitBusy ? "Saving…" : "Save Prefix Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: EXPORT WORKSPACE */}
      {exportOpen && (
        <ExportModal
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          title={`Export Workspace Data · ${entityName}`}
          totalRows={entries.length}
          columns={entries.map(([k]) => k)}
          data={entries.map(([k, v]) => ({ field: k, value: typeof v === "object" ? JSON.stringify(v) : String(v) }))}
          filenamePrefix={`customer_${customerId || "export"}`}
        />
      )}

      {/* MODAL 8: ASSIGN RATE GROUP */}
      {assignRgOpen && (
        <div className="cmdBackdrop" onClick={() => !assignRgBusy && setAssignRgOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750, fontSize: 13 }}>
                <Icon name="tag" size={16} />
                <span>Assign Tariff Rate Group to Customer</span>
              </div>
              <button type="button" onClick={() => !assignRgBusy && setAssignRgOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitAssignRateGroup} style={{ padding: 16 }}>
              <FormErrorAlert error={assignRgErr} onDismiss={() => setAssignRgErr(null)} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                Select an active Rate Group from the database to rate voice traffic on <strong style={{ color: "var(--text)" }}>{entityName}</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="rg-select" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                    Select Rate Group <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  {rateGroupsLoading ? (
                    <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "8px 0" }}>Loading available rate groups…</div>
                  ) : !allRateGroups || allRateGroups.length === 0 ? (
                    <div style={{ padding: 12, border: "1px dashed var(--border)", borderRadius: 6, fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
                      No Rate Groups exist yet in PostgreSQL.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setAssignRgOpen(false);
                          setNewRgName("");
                          setCreateRgErr(null);
                          setCreateRgOpen(true);
                        }}
                        style={{ color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                      >
                        Create one now
                      </button>
                    </div>
                  ) : (
                    <select
                      id="rg-select"
                      value={selectedRgToAssign}
                      onChange={(e) => setSelectedRgToAssign(e.target.value)}
                      style={{ width: "100%", height: 38, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", fontSize: 13 }}
                      disabled={assignRgBusy}
                    >
                      <option value="">— Select a Rate Group —</option>
                      {allRateGroups.map((rg: any) => (
                        <option key={rg.id} value={String(rg.id)}>
                          {rg.name} ({rg.prefix_count ?? 0} prefixes · {rg.side || "customer"} side)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => {
                    setAssignRgOpen(false);
                    setNewRgName("");
                    setCreateRgErr(null);
                    setCreateRgOpen(true);
                  }}
                  style={{ color: "var(--primary)", fontSize: 12 }}
                >
                  <Icon name="plus" size={12} />
                  <span>Create New Group</span>
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn secondary" onClick={() => setAssignRgOpen(false)} disabled={assignRgBusy} style={{ height: 36 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn primary" disabled={assignRgBusy || !selectedRgToAssign} style={{ height: 36 }}>
                    {assignRgBusy ? "Assigning…" : "Assign Rate Group"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 9: CREATE NEW RATE GROUP */}
      {createRgOpen && (
        <div className="cmdBackdrop" onClick={() => !createRgBusy && setCreateRgOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750, fontSize: 13 }}>
                <Icon name="plus" size={16} />
                <span>Create & Assign New Rate Group</span>
              </div>
              <button type="button" onClick={() => !createRgBusy && setCreateRgOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitCreateRateGroup} style={{ padding: 16 }}>
              <FormErrorAlert error={createRgErr} onDismiss={() => setCreateRgErr(null)} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                Create a new pricing tariff group in PostgreSQL and immediately assign it to <strong style={{ color: "var(--text)" }}>{entityName}</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="new-rg-name" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                    Rate Group Name <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <input
                    id="new-rg-name"
                    value={newRgName}
                    onChange={(e) => setNewRgName(e.target.value)}
                    placeholder="e.g. Direct US/EU Premium Tier-1"
                    required
                    style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }}
                    disabled={createRgBusy}
                  />
                </div>
                <div className="field">
                  <label htmlFor="new-rg-side" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Tariff Side / Scope</label>
                  <select
                    id="new-rg-side"
                    value={newRgSide}
                    onChange={(e) => setNewRgSide(e.target.value as any)}
                    style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", fontSize: 13 }}
                    disabled={createRgBusy}
                  >
                    <option value="customer">Customer Tariff (Origination / Ingress)</option>
                    <option value="carrier">Carrier Tariff (Termination / Egress)</option>
                    <option value="shared">Shared / Universal Deck</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setCreateRgOpen(false)} disabled={createRgBusy} style={{ height: 36 }}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={createRgBusy || !newRgName.trim()} style={{ height: 36 }}>
                  {createRgBusy ? "Creating…" : "Create & Assign Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 10: ADD RATE PREFIX */}
      {addRateOpen && (
        <div className="cmdBackdrop" onClick={() => !addRateBusy && setAddRateOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "var(--surface2)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 750, fontSize: 13 }}>
                <Icon name="dollar" size={16} />
                <span>Add Destination Prefix Rate</span>
              </div>
              <button type="button" onClick={() => !addRateBusy && setAddRateOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <form onSubmit={submitAddRatePrefix} style={{ padding: 16 }}>
              <FormErrorAlert error={addRateErr} onDismiss={() => setAddRateErr(null)} />
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>
                Add or override a destination prefix rate in <strong style={{ color: "var(--text)" }}>{activeRateGroupName || "Assigned Rate Group"}</strong>.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="field">
                  <label htmlFor="rate-pfx" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                    E.164 Country/Area Dial Prefix <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="rate-pfx"
                      value={newRatePrefix}
                      onChange={(e) => setNewRatePrefix(e.target.value)}
                      placeholder="e.g. 1, 44, 880, 971"
                      required
                      style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px 0 26px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace" }}
                      disabled={addRateBusy}
                    />
                    <span style={{ position: "absolute", left: 10, top: 8, color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>+</span>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="rate-area" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Destination Label / Description</label>
                  <input
                    id="rate-area"
                    value={newRateArea}
                    onChange={(e) => setNewRateArea(e.target.value)}
                    placeholder="e.g. United States Standard, UK Mobile O2"
                    style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }}
                    disabled={addRateBusy}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="field">
                    <label htmlFor="rate-price" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>
                      Rate / Min ({currency}) <span style={{ color: "var(--danger)" }}>*</span>
                    </label>
                    <input
                      id="rate-price"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={newRatePrice}
                      onChange={(e) => setNewRatePrice(e.target.value)}
                      placeholder="0.0150"
                      required
                      style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13, fontFamily: "IBM Plex Mono, monospace" }}
                      disabled={addRateBusy}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rate-cycle" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Billing Interval (Sec)</label>
                    <input
                      id="rate-cycle"
                      type="number"
                      min="1"
                      value={newRateCycle}
                      onChange={(e) => setNewRateCycle(e.target.value)}
                      style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", fontSize: 13 }}
                      disabled={addRateBusy}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="rate-type" style={{ fontSize: 12, fontWeight: 700, color: "var(--text2)" }}>Tariff Quality Tier</label>
                  <select
                    id="rate-type"
                    value={newRateType}
                    onChange={(e) => setNewRateType(e.target.value)}
                    style={{ width: "100%", height: 36, border: "1px solid var(--border)", borderRadius: 6, padding: "0 10px", background: "var(--surface)", fontSize: 13 }}
                    disabled={addRateBusy}
                  >
                    <option value="standard">Standard Direct Route</option>
                    <option value="premium">CLI Premium Direct Route</option>
                    <option value="wholesale">Wholesale Non-CLI</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                <button type="button" className="btn secondary" onClick={() => setAddRateOpen(false)} disabled={addRateBusy} style={{ height: 36 }}>
                  Cancel
                </button>
                <button type="submit" className="btn primary" disabled={addRateBusy || !newRatePrefix.trim() || !newRatePrice.trim()} style={{ height: 36 }}>
                  {addRateBusy ? "Saving…" : "Save Prefix Rate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 11: UNASSIGN RATE GROUP CONFIRMATION */}
      {unassignRgConfirmOpen && (
        <div className="cmdBackdrop" onClick={() => !unassignBusy && setUnassignRgConfirmOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "grid", placeItems: "center", zIndex: 50, padding: 16 }}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "var(--shadow-lg)", overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", background: "rgba(239,68,68,0.08)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--danger)", fontWeight: 750, fontSize: 13 }}>
                <Icon name="alert" size={16} />
                <span>Confirm Rate Group Removal</span>
              </div>
              <button type="button" onClick={() => !unassignBusy && setUnassignRgConfirmOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
                Are you sure you want to unassign <strong style={{ color: "var(--primary)" }}>{activeRateGroupName || "the active Rate Group"}</strong> from <strong>{entityName}</strong>?
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.5, background: "var(--surface2)", padding: 10, borderRadius: 6, border: "1px solid var(--border)" }}>
                Unassigning will detach all prefix rates ({ratesList?.length ?? 0} destinations) from this customer account. Calls will fall back to default routing tariffs. This mutation will be recorded in the administrative audit trail.
              </div>
              {unassignErr && (
                <FormErrorAlert error={unassignErr} onDismiss={() => setUnassignErr(null)} />
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
                <button type="button" className="btn secondary" onClick={() => setUnassignRgConfirmOpen(false)} disabled={unassignBusy} style={{ height: 36 }}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void submitUnassignRateGroup()}
                  disabled={unassignBusy}
                  style={{ height: 36, background: "var(--danger)", borderColor: "var(--danger)" }}
                >
                  {unassignBusy ? "Unassigning…" : "Unassign Rate Group"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
