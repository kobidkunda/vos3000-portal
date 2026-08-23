"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { ExportModal } from "../shared/ExportModal";
import { FormErrorHeader, FormErrorAlert } from "../shared/FormErrorHeader";

export interface RoutingGatewayRecord {
  id: string;
  name: string;
  prefix: string;
  prefixStyle: number;
  capacity: number;
  active_calls: number;
  lockType: number;
  lockStatus: "unlocked" | "lock_in" | "lock_out" | "locked";
  status: "online" | "restricted" | "locked";
  priority: number;
  registerType: number;
  registerTypeName: string;
  remoteIp: string;
  signalPort: number;
  protocol: number;
  protocolName: string;
  rtpForwardType: number;
  rtpForwardName: string;
  rewriteRulesInCaller: string;
  rewriteRulesInCallee: string;
  clearingAccount?: string;
  clearingAccountName?: string;
  leastCostRouting?: boolean;
  sipTimer?: boolean;
  sip100Rel?: boolean;
  sipT38?: boolean;
  sipDisplay?: boolean;
  sipRemotePartyId?: boolean;
  sipPrivacy?: number;
  sipPAssertedIdentity?: number;
  audioCodecTranscodingEnable?: boolean;
  h323Codecs?: string[];
  sipCodecs?: string[];
  memo?: string;
  password?: string;
  customerPassword?: string;
  updated_at?: string;
}

export function RoutingGatewaysArchetype({
  title = "Routing Gateways",
  purpose = "Carrier-grade egress gateway routing table, prefix matching rules, SIP signaling profiles, and number translation matrix.",
  rows = [],
  kpis = [],
  source = "vos + postgres",
}: {
  title?: string;
  purpose?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
}) {
  const router = useRouter();
  const [gateways, setGateways] = useState<RoutingGatewayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unlocked" | "locked" | "static" | "rewrite_callee" | "rewrite_caller">("all");
  // null = auto (cards on narrow viewports, table on desktop)
  const [viewMode, setViewMode] = useState<null | "table" | "cards">(null);
  const [viewportNarrow, setViewportNarrow] = useState(false);
  const effectiveView: "table" | "cards" = viewMode ?? (viewportNarrow ? "cards" : "table");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1280px)");
    const apply = () => setViewportNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    // resize fallback: some engines miss the media-query change event
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quick Edit Modal State
  const [editingGateway, setEditingGateway] = useState<RoutingGatewayRecord | null>(null);
  const [editForm, setEditForm] = useState({
    prefix: "",
    signalPort: 5060,
    remoteIp: "",
    capacity: 30,
    priority: 1,
    lockType: 0,
    rewriteRulesInCallee: "",
    rewriteRulesInCaller: "",
    memo: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<unknown | null>(null);

  // Simulator Modal State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simCallee, setSimCallee] = useState("886144060644");
  const [simCaller, setSimCaller] = useState("1234567890");
  const [simSelectedGw, setSimSelectedGw] = useState<string>("auto");

  const fetchLiveGateways = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res: any = await api("/api/v1/admin/gateways/routing");
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? [res.data]);
        setGateways(items);
      }
      setLastRefreshed(new Date());
    } catch {
      // Degraded fallback
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (rows && rows.length > 0) {
      setGateways(rows);
    } else {
      void fetchLiveGateways();
    }
  }, [rows, fetchLiveGateways]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      void fetchLiveGateways(true);
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, fetchLiveGateways]);

  // Handle Quick Edit Open
  function openQuickEdit(gw: RoutingGatewayRecord) {
    setEditingGateway(gw);
    setEditForm({
      prefix: gw.prefix || "",
      signalPort: gw.signalPort || 5060,
      remoteIp: gw.remoteIp || "",
      capacity: gw.capacity || 30,
      priority: gw.priority || 1,
      lockType: gw.lockType !== undefined ? gw.lockType : 0,
      rewriteRulesInCallee: gw.rewriteRulesInCallee || "",
      rewriteRulesInCaller: gw.rewriteRulesInCaller || "",
      memo: gw.memo || "",
    });
    setSaveError("");
    setSaveSuccess(false);
  }

  // Handle Save Quick Edit
  async function handleSaveQuickEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGateway) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res: any = await api(`/api/v1/admin/gateways/routing/${encodeURIComponent(editingGateway.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingGateway.name,
          vosGatewayId: editingGateway.id,
          prefix: editForm.prefix,
          signalPort: Number(editForm.signalPort),
          remoteIp: editForm.remoteIp,
          capacity: Number(editForm.capacity),
          priority: Number(editForm.priority),
          lockType: Number(editForm.lockType),
          rewriteRulesInCallee: editForm.rewriteRulesInCallee,
          rewriteRulesInCaller: editForm.rewriteRulesInCaller,
          memo: editForm.memo,
        }),
      });

      if (res?.ok || res?.data) {
        setSaveSuccess(true);
        // Optimistically update list
        setGateways((prev) =>
          prev.map((g) => {
            if (g.id === editingGateway.id || g.name === editingGateway.name) {
              return {
                ...g,
                prefix: editForm.prefix,
                signalPort: Number(editForm.signalPort),
                remoteIp: editForm.remoteIp,
                capacity: Number(editForm.capacity),
                priority: Number(editForm.priority),
                lockType: Number(editForm.lockType),
                lockStatus: Number(editForm.lockType) === 0 ? "unlocked" : "locked",
                status: Number(editForm.lockType) === 0 ? "online" : "locked",
                rewriteRulesInCallee: editForm.rewriteRulesInCallee,
                rewriteRulesInCaller: editForm.rewriteRulesInCaller,
                memo: editForm.memo,
                updated_at: new Date().toISOString(),
              };
            }
            return g;
          })
        );

        setTimeout(() => {
          setEditingGateway(null);
          setSaveSuccess(false);
        }, 1000);
      } else {
        setSaveError(res?.error || "Failed to save gateway changes");
      }
    } catch (err: any) {
      setSaveError(err);
    } finally {
      setSaving(false);
    }
  }

  // Filtered dataset
  const filteredGateways = useMemo(() => {
    return gateways.filter((g) => {
      if (activeFilter === "unlocked" && g.lockType !== 0) return false;
      if (activeFilter === "locked" && g.lockType === 0) return false;
      if (activeFilter === "static" && g.registerType !== 0) return false;
      if (activeFilter === "rewrite_callee" && (!g.rewriteRulesInCallee || !g.rewriteRulesInCallee.trim())) return false;
      if (activeFilter === "rewrite_caller" && (!g.rewriteRulesInCaller || !g.rewriteRulesInCaller.trim())) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name?.toLowerCase().includes(q);
        const matchPrefix = g.prefix?.toLowerCase().includes(q);
        const matchIp = g.remoteIp?.toLowerCase().includes(q);
        const matchPort = String(g.signalPort ?? "").includes(q);
        const matchCalleeRewrite = g.rewriteRulesInCallee?.toLowerCase().includes(q);
        const matchCallerRewrite = g.rewriteRulesInCaller?.toLowerCase().includes(q);
        const matchMemo = g.memo?.toLowerCase().includes(q);
        if (!matchName && !matchPrefix && !matchIp && !matchPort && !matchCalleeRewrite && !matchCallerRewrite && !matchMemo) {
          return false;
        }
      }
      return true;
    });
  }, [gateways, activeFilter, searchQuery]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = gateways.length;
    const unlocked = gateways.filter((g) => g.lockType === 0).length;
    const locked = total - unlocked;
    const totalCapacity = gateways.reduce((acc, g) => acc + (Number(g.capacity) || 0), 0);
    const totalActiveCalls = gateways.reduce((acc, g) => acc + (Number(g.active_calls) || 0), 0);
    const withRewrites = gateways.filter(
      (g) => (g.rewriteRulesInCallee && g.rewriteRulesInCallee.trim()) || (g.rewriteRulesInCaller && g.rewriteRulesInCaller.trim())
    ).length;
    return { total, unlocked, locked, totalCapacity, totalActiveCalls, withRewrites };
  }, [gateways]);

  function copyText(key: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  // Simulation Evaluation Engine
  const simulationResult = useMemo(() => {
    if (!simCallee.trim()) return null;
    const cleanedCallee = simCallee.trim();
    const cleanedCaller = simCaller.trim();

    let matchedGw: RoutingGatewayRecord | undefined;
    if (simSelectedGw !== "auto") {
      matchedGw = gateways.find((g) => g.name === simSelectedGw || g.id === simSelectedGw);
    } else {
      let longestMatchLen = -1;
      for (const g of gateways) {
        const pfxParts = (g.prefix || "").split(":");
        const pfx = pfxParts[0] || "";
        if (pfx && cleanedCallee.startsWith(pfx)) {
          if (pfx.length > longestMatchLen) {
            longestMatchLen = pfx.length;
            matchedGw = g;
          }
        }
      }
      if (!matchedGw && gateways.length > 0) {
        matchedGw = gateways[0];
      }
    }

    if (!matchedGw) return null;

    let transformedCallee = cleanedCallee;
    let calleeRuleApplied = "None";
    if (matchedGw.rewriteRulesInCallee && matchedGw.rewriteRulesInCallee.includes(":")) {
      const parts = matchedGw.rewriteRulesInCallee.split(";").map((x) => x.trim()).filter(Boolean);
      for (const rule of parts) {
        const [matchPattern, replacePattern] = rule.split(":");
        if (matchPattern && replacePattern !== undefined) {
          if (matchPattern === "*" || transformedCallee.startsWith(matchPattern)) {
            calleeRuleApplied = rule;
            if (matchPattern === "*") {
              transformedCallee = replacePattern + transformedCallee;
            } else {
              transformedCallee = replacePattern + transformedCallee.slice(matchPattern.length);
            }
            break;
          }
        }
      }
    }

    let transformedCaller = cleanedCaller;
    let callerRuleApplied = "None";
    if (matchedGw.rewriteRulesInCaller && matchedGw.rewriteRulesInCaller.includes(":")) {
      const parts = matchedGw.rewriteRulesInCaller.split(";").map((x) => x.trim()).filter(Boolean);
      for (const rule of parts) {
        const [matchPattern, replacePattern] = rule.split(":");
        if (matchPattern && replacePattern !== undefined) {
          if (matchPattern === "*" || transformedCaller.startsWith(matchPattern)) {
            callerRuleApplied = rule;
            if (matchPattern === "*") {
              if (replacePattern.includes("?")) {
                const wildCount = (replacePattern.match(/\?/g) || []).length;
                const base = replacePattern.replace(/\?/g, "");
                const suffix = cleanedCaller.slice(-wildCount);
                transformedCaller = base + suffix;
              } else {
                transformedCaller = replacePattern;
              }
            } else {
              transformedCaller = replacePattern + transformedCaller.slice(matchPattern.length);
            }
            break;
          }
        }
      }
    }

    const sipUri = `sip:${transformedCallee}@${matchedGw.remoteIp || "127.0.0.1"}:${matchedGw.signalPort || 5060}`;
    return {
      gateway: matchedGw,
      originalCallee: cleanedCallee,
      transformedCallee,
      calleeRuleApplied,
      originalCaller: cleanedCaller,
      transformedCaller,
      callerRuleApplied,
      sipUri,
    };
  }, [simCallee, simCaller, simSelectedGw, gateways]);

  return (
    <div className="content">
      {/* Top Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge badge-online" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="statusDot pulse" />
              <span>Real VOS3000 Connected</span>
            </span>
            <span className="badge" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
              {filteredGateways.length} of {gateways.length} Egress Routes
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        {/* Action Buttons & Realtime Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Refresh Polling Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface2)",
              padding: "4px 10px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontSize: 12,
            }}
          >
            <span style={{ color: "var(--muted)" }}>Live Sync:</span>
            {[
              { label: "5s", sec: 5 },
              { label: "10s", sec: 10 },
              { label: "30s", sec: 30 },
              { label: "Off", sec: 0 },
            ].map((p) => (
              <button
                key={p.sec}
                type="button"
                onClick={() => setRefreshInterval(p.sec)}
                style={{
                  background: refreshInterval === p.sec ? "var(--primary)" : "transparent",
                  color: refreshInterval === p.sec ? "#ffffff" : "var(--text)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 8px",
                  fontSize: 11.5,
                  fontWeight: 650,
                  cursor: "pointer",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void fetchLiveGateways()}
            disabled={loading}
            title="Refresh from VOS media server"
          >
            <Icon name="refresh" size={13} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Syncing…" : "Reload"}</span>
          </button>

          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsSimulatorOpen(true)}
          >
            <Icon name="radar" size={13} />
            <span>Rewrite Simulator</span>
          </button>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => setIsExportOpen(true)}
          >
            <Icon name="download" size={13} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Real KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Egress Routes
            </span>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(37, 99, 235, 0.12)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="gateway" size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "var(--text)", lineHeight: 1.2 }}>
            {stats.total.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--success)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span className="statusDot green" />
            <span>{stats.unlocked} Active / {stats.locked} Locked</span>
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Total Channel Capacity
            </span>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(6, 182, 212, 0.12)", color: "var(--cyan-deep)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="pulse" size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "var(--text)", lineHeight: 1.2 }}>
            {stats.totalCapacity.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>Lines</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Across {stats.total} configured routing entities
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Active Live Calls
            </span>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(34, 197, 94, 0.12)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="phone" size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "var(--text)", lineHeight: 1.2 }}>
            {stats.totalActiveCalls} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>Active Channels</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Egress pressure: {stats.totalCapacity > 0 ? ((stats.totalActiveCalls / stats.totalCapacity) * 100).toFixed(1) : 0}% utilization
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              E.164 Rewrite Engine
            </span>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(245, 158, 11, 0.12)", color: "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="wrench" size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "var(--text)", lineHeight: 1.2 }}>
            {stats.withRewrites} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>Active Rules</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            ANI/DNIS rewrite profiles armed & active
          </div>
        </div>
      </div>

      {/* Modern Filter & Search Controls */}
      <div
        className="card"
        style={{
          padding: 14,
          marginBottom: 16,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        {/* Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 300px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              type="text"
              placeholder="Search across Name, Prefix (e.g. 8861), IP, Port, Rewrite Rules, Memo…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: 34, width: "100%", height: 36, fontSize: 13 }}
            />
            <div style={{ position: "absolute", left: 11, top: 10, color: "var(--muted)" }}>
              <Icon name="search" size={15} />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: 9,
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${gateways.length})` },
            { id: "unlocked", label: `Unlocked (${stats.unlocked})` },
            { id: "locked", label: `Locked (${stats.locked})` },
            { id: "static", label: `Static IP (${gateways.length})` },
            { id: "rewrite_callee", label: "Callee Rewrite" },
            { id: "rewrite_caller", label: "Caller Rewrite" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as any)}
              style={{
                background: activeFilter === f.id ? "var(--primary-soft)" : "var(--surface2)",
                color: activeFilter === f.id ? "var(--primary)" : "var(--text2)",
                border: activeFilter === f.id ? "1px solid var(--primary)" : "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "4px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Layout Toggle (Desktop Table vs Mobile Cards) */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`btn sm ${effectiveView === "table" ? "primary" : "secondary"}`}
            style={{ padding: "4px 8px" }}
            title="Dense Table View"
          >
            <Icon name="dashboard" size={13} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`btn sm ${effectiveView === "cards" ? "primary" : "secondary"}`}
            style={{ padding: "4px 8px" }}
            title="Card Grid View"
          >
            <Icon name="radar" size={13} />
          </button>
        </div>
      </div>

      {/* TABLE VIEW (Desktop Optimized) */}
      {effectiveView === "table" ? (
        <div className="card rgw-table-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)" }}>
          <div className="rgw-table-scroll">
            <table className="table" style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 650 }}>Lock / Status</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 650 }}>Gateway Identifier</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 650 }}>Routing Prefix</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 650 }}>Remote Destination</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 650 }}>Protocol & RTP</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 650 }}>Capacity</th>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 650 }}>Number Rewrites</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontWeight: 650 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGateways.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                      No routing gateways match your current search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredGateways.map((gw, idx) => {
                    return (
                      <tr
                        key={gw.id || idx}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                          transition: "background 0.15s ease",
                          cursor: "pointer",
                        }}
                        onClick={() => router.push(`/admin/gateways/routing/${encodeURIComponent(gw.id)}`)}
                        className="tableRowHover"
                      >
                        {/* Lock State */}
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          <span
                            className={`badge ${gw.lockType === 0 ? "badge-online" : gw.lockType === 3 ? "badge-danger" : "badge-warning"}`}
                            style={{ fontSize: 11, fontWeight: 650 }}
                          >
                            <span className={`statusDot ${gw.lockType === 0 ? "green" : "red"}`} />
                            {gw.lockType === 0 ? "Unlocked" : gw.lockType === 1 ? "Lock In" : gw.lockType === 2 ? "Lock Out" : "Locked (3)"}
                          </span>
                        </td>

                        {/* Name & Priority */}
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 650, color: "var(--text)" }}>{gw.name}</span>
                            <span
                              style={{
                                fontSize: 10.5,
                                padding: "1px 5px",
                                borderRadius: 3,
                                background: "var(--surface2)",
                                color: "var(--muted)",
                                border: "1px solid var(--border)",
                                fontWeight: 700,
                              }}
                            >
                              P{gw.priority || 1}
                            </span>
                          </div>
                          {gw.memo && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{gw.memo}</div>}
                        </td>

                        {/* Prefix */}
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontFamily: "var(--font-mono, monospace)",
                              fontSize: 12,
                              padding: "2px 7px",
                              borderRadius: 4,
                              background: "rgba(6, 182, 212, 0.1)",
                              color: "var(--cyan-deep)",
                              fontWeight: 650,
                              border: "1px solid rgba(6, 182, 212, 0.25)",
                            }}
                          >
                            {gw.prefix || "Default"}
                          </span>
                        </td>

                        {/* Remote Destination */}
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                fontFamily: "var(--font-mono, monospace)",
                                fontSize: 12,
                                color: "var(--text)",
                                fontWeight: 550,
                              }}
                            >
                              {gw.remoteIp}:{gw.signalPort || 5060}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText(`ip-${gw.id}`, `${gw.remoteIp}:${gw.signalPort || 5060}`);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: copiedKey === `ip-${gw.id}` ? "var(--success)" : "var(--muted)",
                                cursor: "pointer",
                                padding: 2,
                              }}
                              title="Copy IP:Port"
                            >
                              <Icon name={copiedKey === `ip-${gw.id}` ? "check" : "copy"} size={12} />
                            </button>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>{gw.registerTypeName}</span>
                        </td>

                        {/* Protocol & RTP */}
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{gw.protocolName}</div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>{gw.rtpForwardName}</div>
                        </td>

                        {/* Capacity */}
                        <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono, monospace)" }}>
                            {gw.capacity} <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>lines</span>
                          </div>
                          <div style={{ fontSize: 11, color: gw.active_calls > 0 ? "var(--primary)" : "var(--muted)" }}>
                            {gw.active_calls} active
                          </div>
                        </td>

                        {/* Rewrites */}
                        <td style={{ padding: "8px 10px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            {gw.rewriteRulesInCallee && (
                              <span
                                style={{
                                  fontFamily: "var(--font-mono, monospace)",
                                  fontSize: 11,
                                  color: "var(--text2)",
                                  background: "var(--surface2)",
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  border: "1px solid var(--border)",
                                  display: "inline-block",
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Callee: ${gw.rewriteRulesInCallee}`}
                              >
                                🎯 {gw.rewriteRulesInCallee}
                              </span>
                            )}
                            {gw.rewriteRulesInCaller && (
                              <span
                                style={{
                                  fontFamily: "var(--font-mono, monospace)",
                                  fontSize: 11,
                                  color: "var(--muted)",
                                  background: "var(--surface2)",
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  display: "inline-block",
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={`Caller: ${gw.rewriteRulesInCaller}`}
                              >
                                👤 {gw.rewriteRulesInCaller}
                              </span>
                            )}
                            {!gw.rewriteRulesInCallee && !gw.rewriteRulesInCaller && (
                              <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>Passthrough</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                            <button
                              type="button"
                              className="btn secondary sm"
                              style={{ padding: "4px 8px", fontSize: 11.5 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                openQuickEdit(gw);
                              }}
                              title="Quick Edit gateway parameters"
                            >
                              <Icon name="wrench" size={12} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="btn secondary sm"
                              style={{ padding: "4px 8px", fontSize: 11.5 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSimSelectedGw(gw.name);
                                const pfx = (gw.prefix || "8861").split(":")[0];
                                setSimCallee(`${pfx}44123456`);
                                setIsSimulatorOpen(true);
                              }}
                              title="Test number translation with this gateway"
                            >
                              <Icon name="radar" size={12} />
                              <span>Simulate</span>
                            </button>

                            <Link
                              href={`/admin/gateways/routing/${encodeURIComponent(gw.id)}`}
                              className="btn primary sm"
                              style={{ padding: "4px 8px" }}
                              onClick={(e) => e.stopPropagation()}
                              title="Open dedicated full details page"
                            >
                              <Icon name="chevronRight" size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARDS VIEW (Mobile & Responsive Grid) */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filteredGateways.map((gw, idx) => (
            <div
              key={gw.id || idx}
              className="card"
              style={{
                padding: 16,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: "1px solid var(--border)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onClick={() => router.push(`/admin/gateways/routing/${encodeURIComponent(gw.id)}`)}
            >
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{gw.name}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <span
                        style={{
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: 11.5,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: "rgba(6, 182, 212, 0.1)",
                          color: "var(--cyan-deep)",
                          fontWeight: 650,
                          border: "1px solid rgba(6, 182, 212, 0.25)",
                        }}
                      >
                        Prefix: {gw.prefix || "Default"}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>P{gw.priority || 1}</span>
                    </div>
                  </div>

                  <span className={`badge ${gw.lockType === 0 ? "badge-online" : "badge-danger"}`} style={{ fontSize: 11 }}>
                    <span className={`statusDot ${gw.lockType === 0 ? "green" : "red"}`} />
                    {gw.lockType === 0 ? "Unlocked" : "Locked"}
                  </span>
                </div>

                {/* Card Parameters */}
                <div style={{ background: "var(--surface2)", padding: 10, borderRadius: "var(--radius-sm)", fontSize: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--muted)" }}>Remote IP:</span>
                    <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>{gw.remoteIp}:{gw.signalPort || 5060}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--muted)" }}>Protocol:</span>
                    <span style={{ fontWeight: 550 }}>{gw.protocolName} · {gw.rtpForwardName}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Capacity:</span>
                    <span style={{ fontWeight: 650 }}>{gw.capacity} lines ({gw.active_calls} active)</span>
                  </div>
                </div>

                {/* Rewrite Summary */}
                {(gw.rewriteRulesInCallee || gw.rewriteRulesInCaller) && (
                  <div style={{ fontSize: 11.5, color: "var(--text2)", marginBottom: 12 }}>
                    {gw.rewriteRulesInCallee && (
                      <div style={{ fontFamily: "var(--font-mono, monospace)", marginBottom: 2 }}>
                        🎯 Callee: {gw.rewriteRulesInCallee}
                      </div>
                    )}
                    {gw.rewriteRulesInCaller && (
                      <div style={{ fontFamily: "var(--font-mono, monospace)", color: "var(--muted)" }}>
                        👤 Caller: {gw.rewriteRulesInCaller}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border)", gap: 6 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ fontSize: 11.5 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openQuickEdit(gw);
                  }}
                >
                  <Icon name="wrench" size={12} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  className="btn secondary sm"
                  style={{ fontSize: 11.5 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSimSelectedGw(gw.name);
                    const pfx = (gw.prefix || "8861").split(":")[0];
                    setSimCallee(`${pfx}44123456`);
                    setIsSimulatorOpen(true);
                  }}
                >
                  <Icon name="radar" size={12} />
                  <span>Simulate</span>
                </button>

                <Link
                  href={`/admin/gateways/routing/${encodeURIComponent(gw.id)}`}
                  className="btn primary sm"
                  style={{ fontSize: 11.5 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>Details</span>
                  <Icon name="chevronRight" size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QUICK EDIT MODAL */}
      {editingGateway && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !saving && setEditingGateway(null)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 580,
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Quick Edit Gateway Configuration</h2>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "4px 0 0" }}>
                  Editing <strong>{editingGateway.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && setEditingGateway(null)}
                style={{ background: "transparent", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {saveSuccess && (
              <div style={{ background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "var(--success)", padding: "10px 14px", borderRadius: "var(--radius-sm)", fontSize: 13, marginBottom: 14 }}>
                ✓ Gateway configuration updated and audited successfully!
              </div>
            )}

            <form onSubmit={handleSaveQuickEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormErrorAlert error={saveError} onDismiss={() => setSaveError(null)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                    Routing Prefix
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.prefix}
                    onChange={(e) => setEditForm({ ...editForm, prefix: e.target.value })}
                    placeholder="e.g. 8861:1"
                    style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                    Line Capacity (Channels)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    className="input"
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                    Remote IP Address
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={editForm.remoteIp}
                    onChange={(e) => setEditForm({ ...editForm, remoteIp: e.target.value })}
                    placeholder="e.g. 104.243.37.23"
                    style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                    Signal Port
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    className="input"
                    value={editForm.signalPort}
                    onChange={(e) => setEditForm({ ...editForm, signalPort: Number(e.target.value) })}
                    style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                    Priority Tier
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="input"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
                    style={{ fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                    Lock State
                  </label>
                  <select
                    className="input"
                    value={editForm.lockType}
                    onChange={(e) => setEditForm({ ...editForm, lockType: Number(e.target.value) })}
                    style={{ fontSize: 13 }}
                  >
                    <option value={0}>0 — Unlocked (Normal)</option>
                    <option value={1}>1 — Lock Inbound</option>
                    <option value={2}>2 — Lock Outbound</option>
                    <option value={3}>3 — Fully Locked</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                  Callee Rewrite Rules (DNIS)
                </label>
                <input
                  type="text"
                  className="input"
                  value={editForm.rewriteRulesInCallee}
                  onChange={(e) => setEditForm({ ...editForm, rewriteRulesInCallee: e.target.value })}
                  placeholder="e.g. 886144:060644"
                  style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                  Caller Rewrite Rules (ANI)
                </label>
                <input
                  type="text"
                  className="input"
                  value={editForm.rewriteRulesInCaller}
                  onChange={(e) => setEditForm({ ...editForm, rewriteRulesInCaller: e.target.value })}
                  placeholder="e.g. *:441485540747"
                  style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                  Administrative Memo
                </label>
                <input
                  type="text"
                  className="input"
                  value={editForm.memo}
                  onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                  placeholder="e.g. Premium Direct Route"
                  style={{ fontSize: 13 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setEditingGateway(null)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={saving}
                >
                  {saving ? "Saving Changes…" : "Save Gateway Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* E.164 SIMULATOR MODAL */}
      {isSimulatorOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setIsSimulatorOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 750, color: "var(--text)" }}>E.164 Dialling & Rewrite Simulator</h2>
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
                  Test how dialled destination digits and caller IDs are transformed by VOS3000 routing gateway rules.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSimulatorOpen(false)}
                style={{ background: "transparent", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                  Dialled Callee Number (DNIS)
                </label>
                <input
                  type="text"
                  className="input"
                  value={simCallee}
                  onChange={(e) => setSimCallee(e.target.value)}
                  placeholder="e.g. 886144060644 or 95951234"
                  style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                  Caller ID (ANI)
                </label>
                <input
                  type="text"
                  className="input"
                  value={simCaller}
                  onChange={(e) => setSimCaller(e.target.value)}
                  placeholder="e.g. 441485540747"
                  style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, marginBottom: 6 }}>
                Target Gateway Selection
              </label>
              <select
                className="input"
                value={simSelectedGw}
                onChange={(e) => setSimSelectedGw(e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="auto">⚡ Automatic (Best Matching Prefix)</option>
                {gateways.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name} (Prefix: {g.prefix}, P{g.priority})
                  </option>
                ))}
              </select>
            </div>

            {simulationResult ? (
              <div
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    SIP Routing Pipeline Result
                  </span>
                  <span className="badge badge-online" style={{ fontSize: 11 }}>
                    Matched: {simulationResult.gateway.name}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5 }}>
                  <div style={{ background: "var(--surface)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 650, textTransform: "uppercase" }}>1. Callee Number Translation (DNIS)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontFamily: "var(--font-mono, monospace)" }}>
                      <span style={{ color: "var(--danger)", textDecoration: "line-through" }}>{simulationResult.originalCallee}</span>
                      <span>➔</span>
                      <span style={{ color: "var(--success)", fontWeight: 750, fontSize: 14 }}>{simulationResult.transformedCallee}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      Rule applied: <code>{simulationResult.calleeRuleApplied}</code>
                    </div>
                  </div>

                  <div style={{ background: "var(--surface)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 650, textTransform: "uppercase" }}>2. Caller ID Translation (ANI)</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontFamily: "var(--font-mono, monospace)" }}>
                      <span style={{ color: "var(--muted)" }}>{simulationResult.originalCaller}</span>
                      <span>➔</span>
                      <span style={{ color: "var(--primary)", fontWeight: 750, fontSize: 14 }}>{simulationResult.transformedCaller}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      Rule applied: <code>{simulationResult.callerRuleApplied}</code>
                    </div>
                  </div>

                  <div style={{ background: "var(--surface)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 650, textTransform: "uppercase" }}>3. Target Egress SIP Request-URI</div>
                    <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, fontWeight: 700, color: "var(--cyan-deep)", marginTop: 4 }}>
                      {simulationResult.sipUri}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center", color: "var(--muted)" }}>
                Enter dialled number and caller ID to run simulation.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setIsSimulatorOpen(false)}
              >
                Close Simulator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Routing Gateways Data"
        totalRows={filteredGateways.length}
        filenamePrefix="vos3000_routing_gateways"
        columns={[
          "name",
          "prefix",
          "remoteIp",
          "signalPort",
          "protocolName",
          "capacity",
          "lockType",
          "rewriteRulesInCallee",
          "rewriteRulesInCaller",
          "rtpForwardName",
          "memo",
        ]}
        data={filteredGateways}
      />
    </div>
  );
}
