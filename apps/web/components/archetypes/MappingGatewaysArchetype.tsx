"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";
import { ExportModal } from "../shared/ExportModal";
import { FormErrorAlert } from "../shared/FormErrorAlert";

export interface MappingGatewayRecord {
  id: string;
  vosGatewayId?: string;
  name: string;
  account?: string;
  customerId?: string | null;
  customerName?: string;
  organizationName?: string;
  customerBalance?: string | number;
  customerCurrency?: string;
  customerStatus?: string;
  configuredIp?: string;
  remoteIps?: string;
  signalingPort?: number;
  line_limit: number;
  capacity?: number;
  cps_limit: number;
  active_calls: number;
  current_cps?: number;
  lockType: number;
  lockStatus: "unlocked" | "locked";
  status: "online" | "locked" | "active" | "inactive";
  priority?: number;
  registerType: number;
  registerTypeName: string;
  protocol: number;
  protocolName: string;
  processTimeout?: number;
  protectRouteEnableTime?: number;
  conversationLimit?: number;
  rtpForwardType?: number;
  rtpForwardName?: string;
  rtpInterrupt?: boolean;
  memo?: string;
  networkQuality?: {
    latency_ms: number | null;
    packet_loss: string | null;
    jitter_ms: number | null;
    last_ping?: string | null;
  };
  updated_at?: string;
}

export function MappingGatewaysArchetype({
  title = "Mapping Gateways",
  purpose = "Customer ingress mapping gateways, IP whitelist authentication, line capacity, and real-time CPS controls.",
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
  const [gateways, setGateways] = useState<MappingGatewayRecord[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(10);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "unlocked" | "locked" | "static" | "dynamic" | "high_util">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedGateway, setSelectedGateway] = useState<MappingGatewayRecord | null>(null);
  const [editingGateway, setEditingGateway] = useState<MappingGatewayRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ping Diagnostic State in Drawer
  const [pingStatus, setPingStatus] = useState<"idle" | "running" | "success">("idle");
  const [pingData, setPingData] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchLiveGateways = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api("/api/v1/admin/gateways/mapping");
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? [res.data]);
        setGateways(items);
      }
      setLastRefreshed(new Date());
    } catch {
      // Degraded fallback
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      const res: any = await api("/api/v1/admin/customers");
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        setCustomers(items);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (rows && rows.length > 0) {
      setGateways(rows);
    } else {
      void fetchLiveGateways();
    }
  }, [rows, fetchLiveGateways]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => {
      void fetchLiveGateways();
    }, refreshInterval * 1000);
    return () => clearInterval(timer);
  }, [refreshInterval, fetchLiveGateways]);

  // Filtered dataset
  const filteredGateways = useMemo(() => {
    return gateways.filter((g) => {
      const isLocked = g.lockType !== 0 || g.status === "locked";
      if (activeFilter === "unlocked" && isLocked) return false;
      if (activeFilter === "locked" && !isLocked) return false;
      if (activeFilter === "static" && g.registerType === 1) return false;
      if (activeFilter === "dynamic" && g.registerType !== 1) return false;
      if (activeFilter === "high_util") {
        const cap = Number(g.capacity || g.line_limit) || 1;
        const util = (Number(g.active_calls) || 0) / cap;
        if (util < 0.7) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name?.toLowerCase().includes(q);
        const matchAccount = g.account?.toLowerCase().includes(q);
        const matchCustomer = g.customerName?.toLowerCase().includes(q);
        const matchOrg = g.organizationName?.toLowerCase().includes(q);
        const matchIp = (g.configuredIp || g.remoteIps)?.toLowerCase().includes(q);
        const matchMemo = g.memo?.toLowerCase().includes(q);
        if (!matchName && !matchAccount && !matchCustomer && !matchOrg && !matchIp && !matchMemo) {
          return false;
        }
      }
      return true;
    });
  }, [gateways, activeFilter, searchQuery]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const total = gateways.length;
    const unlocked = gateways.filter((g) => g.lockType === 0 && g.status !== "locked").length;
    const locked = total - unlocked;
    const totalCapacity = gateways.reduce((acc, g) => acc + (Number(g.capacity || g.line_limit) || 0), 0);
    const totalActiveCalls = gateways.reduce((acc, g) => acc + (Number(g.active_calls) || 0), 0);
    const totalCpsLimit = gateways.reduce((acc, g) => acc + (Number(g.cps_limit) || 0), 0);
    const mappedAccounts = new Set(gateways.map((g) => g.account || g.customerName).filter(Boolean)).size;
    return { total, unlocked, locked, totalCapacity, totalActiveCalls, totalCpsLimit, mappedAccounts };
  }, [gateways]);

  function copyText(key: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  async function handleTriggerPing(gw: MappingGatewayRecord) {
    setPingStatus("running");
    setPingData(null);
    try {
      const res: any = await api(`/api/v1/admin/gateways/mapping/${encodeURIComponent(gw.id)}/network`);
      if (res?.data) {
        setPingData(res.data);
        setPingStatus("success");
      } else {
        setPingData({
          target_ip: gw.configuredIp || "N/A",
          latency_ms: null,
          packet_loss: "N/A",
          jitter_ms: null,
          status: "unmeasured"
        });
        setPingStatus("success");
      }
    } catch {
      setPingData({
        target_ip: gw.configuredIp || "N/A",
        latency_ms: null,
        packet_loss: "100%",
        jitter_ms: null,
        status: "unreachable"
      });
      setPingStatus("success");
    }
  }

  return (
    <div className="content">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--primary)",
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            padding: "12px 20px",
            borderRadius: "var(--radius)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Icon name="check" size={16} style={{ color: "var(--success)" }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge badge-online" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="statusDot pulse" />
              <span>VOS3000 Ingress Engine Online</span>
            </span>
            <span className="badge" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
              {filteredGateways.length} of {gateways.length} Ingress Gateways
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
            title="Reload live gateway telemetry from VOS"
          >
            <Icon name="refresh" size={13} className={loading ? "animate-spin" : ""} />
            <span>{loading ? "Syncing…" : "Reload"}</span>
          </button>

          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Icon name="plus" size={13} />
            <span>Add Mapping Gateway</span>
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

      {/* KPI Cards */}
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
              Ingress Gateways
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
              Total Ingress Capacity
            </span>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(6, 182, 212, 0.12)", color: "var(--cyan-deep)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="pulse" size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "var(--text)", lineHeight: 1.2 }}>
            {stats.totalCapacity.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>Lines</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Across {stats.mappedAccounts} distinct customer accounts
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Active Ingress Calls
            </span>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(34, 197, 94, 0.12)", color: "var(--success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="phone" size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "var(--text)", lineHeight: 1.2 }}>
            {stats.totalActiveCalls} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>Channels Active</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Channel load: {stats.totalCapacity > 0 ? ((stats.totalActiveCalls / stats.totalCapacity) * 100).toFixed(1) : 0}% utilization
          </div>
        </div>

        <div className="card" style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 650, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Aggregate CPS Limits
            </span>
            <div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "rgba(245, 158, 11, 0.12)", color: "var(--warning)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="radar" size={16} />
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 750, color: "var(--text)", lineHeight: 1.2 }}>
            {stats.totalCpsLimit} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>Max CPS</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Per-gateway overload protection active
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
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
              placeholder="Search across Gateway Name, Account, Customer, IP Whitelist, Memo…"
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
            { id: "static", label: `Static IP (${gateways.filter(g => g.registerType !== 1).length})` },
            { id: "dynamic", label: `Dynamic Reg (${gateways.filter(g => g.registerType === 1).length})` },
            { id: "high_util", label: "High Load (>70%)" },
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

        {/* View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`btn sm ${viewMode === "table" ? "primary" : "secondary"}`}
            style={{ padding: "4px 8px" }}
            title="Dense Table View"
          >
            <Icon name="dashboard" size={13} />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`btn sm ${viewMode === "cards" ? "primary" : "secondary"}`}
            style={{ padding: "4px 8px" }}
            title="Card Grid View"
          >
            <Icon name="radar" size={13} />
          </button>
        </div>
      </div>

      {/* TABLE VIEW (Desktop Optimized) */}
      {viewMode === "table" ? (
        <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)" }}>
          <div style={{ overflowX: "auto", scrollbarGutter: "stable" }}>
            <table className="table" style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Lock / Status</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Gateway Identifier</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Owning Customer / Account</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Configured IP Whitelist</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 650 }}>Line Capacity & Active</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 650 }}>CPS Limit</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Register Mode</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 650 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGateways.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                      No mapping gateways match your current search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredGateways.map((gw, idx) => {
                    const isLocked = gw.lockType !== 0 || gw.status === "locked";
                    const ipDisplay = gw.configuredIp || gw.remoteIps || "192.168.1.100";
                    const cap = Number(gw.capacity || gw.line_limit) || 100;
                    const active = Number(gw.active_calls) || 0;
                    const utilPercent = Math.min(100, Math.round((active / cap) * 100));

                    return (
                      <tr
                        key={gw.id || idx}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                          transition: "background 0.15s ease",
                          cursor: "pointer",
                        }}
                        onClick={() => setSelectedGateway(gw)}
                        className="tableRowHover"
                      >
                        {/* Lock State */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <span
                            className={`badge ${!isLocked ? "badge-online" : "badge-danger"}`}
                            style={{ fontSize: 11, fontWeight: 650 }}
                          >
                            <span className={`statusDot ${!isLocked ? "green" : "red"}`} />
                            {!isLocked ? "Active" : "Locked"}
                          </span>
                        </td>

                        {/* Gateway Name & Protocol */}
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Link
                              href={`/admin/gateways/mapping/${encodeURIComponent(gw.id || gw.name)}`}
                              style={{ fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {gw.name}
                            </Link>
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
                              {gw.protocolName || "SIP"}
                            </span>
                          </div>
                          {gw.memo && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{gw.memo}</div>}
                        </td>

                        {/* Customer Owner */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          {gw.customerId ? (
                            <Link
                              href={`/admin/customers/${gw.customerId}`}
                              style={{ color: "var(--text)", textDecoration: "none", display: "flex", flexDirection: "column" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span style={{ fontWeight: 650, color: "var(--text)" }}>{gw.customerName || gw.organizationName || "Customer"}</span>
                              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono, monospace)" }}>
                                Acc: {gw.account || "—"}
                              </span>
                            </Link>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontWeight: 600, color: "var(--text)" }}>{gw.customerName || gw.account || "Unassigned"}</span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>Global / Carrier Pool</span>
                            </div>
                          )}
                        </td>

                        {/* Configured IP Whitelist */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              style={{
                                fontFamily: "var(--font-mono, monospace)",
                                fontSize: 12,
                                color: "var(--text)",
                                fontWeight: 550,
                              }}
                            >
                              {ipDisplay}:{gw.signalingPort || 5060}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText(`ip-${gw.id}`, `${ipDisplay}:${gw.signalingPort || 5060}`);
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
                        </td>

                        {/* Capacity & Active Calls */}
                        <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono, monospace)" }}>
                            {active} / {cap} <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>lines</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div
                            style={{
                              width: 90,
                              height: 4,
                              background: "var(--border)",
                              borderRadius: 2,
                              marginTop: 4,
                              marginLeft: "auto",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${utilPercent}%`,
                                height: "100%",
                                background: utilPercent > 85 ? "var(--danger)" : utilPercent > 60 ? "var(--warning)" : "var(--success)",
                                borderRadius: 2,
                              }}
                            />
                          </div>
                        </td>

                        {/* CPS Limit */}
                        <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono, monospace)" }}>
                            {gw.cps_limit || 20} <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>CPS</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)" }}>
                            {gw.current_cps ?? 0} live CPS
                          </div>
                        </td>

                        {/* Registration Mode */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: gw.registerType === 1 ? "rgba(168, 85, 247, 0.1)" : "rgba(37, 99, 235, 0.1)",
                              color: gw.registerType === 1 ? "#a855f7" : "var(--primary)",
                              fontWeight: 600,
                            }}
                          >
                            {gw.registerTypeName || (gw.registerType === 1 ? "Dynamic Register" : "Static IP")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                            <button
                              type="button"
                              className="btn secondary sm"
                              style={{ padding: "4px 8px", fontSize: 11.5 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingGateway(gw);
                              }}
                              title="Edit IP, CPS, and Limits"
                            >
                              <Icon name="settings" size={12} />
                              <span>Edit</span>
                            </button>

                            <Link
                              href={`/admin/gateways/mapping/${encodeURIComponent(gw.id || gw.name)}`}
                              className="btn secondary sm"
                              style={{ padding: "4px 8px" }}
                              onClick={(e) => e.stopPropagation()}
                              title="Open full gateway details page"
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
        /* CARDS VIEW (Responsive Grid) */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filteredGateways.map((gw, idx) => {
            const isLocked = gw.lockType !== 0 || gw.status === "locked";
            const ipDisplay = gw.configuredIp || gw.remoteIps || "192.168.1.100";
            return (
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
                onClick={() => setSelectedGateway(gw)}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{gw.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                        Customer: <strong style={{ color: "var(--text2)" }}>{gw.customerName || gw.account || "Carrier Pool"}</strong>
                      </div>
                    </div>
                    <span className={`badge ${!isLocked ? "badge-online" : "badge-danger"}`} style={{ fontSize: 11 }}>
                      <span className={`statusDot ${!isLocked ? "green" : "red"}`} />
                      {!isLocked ? "Active" : "Locked"}
                    </span>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: "8px 12px", borderRadius: "var(--radius-sm)", marginBottom: 12, fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "var(--muted)" }}>IP Endpoint:</span>
                      <span style={{ fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>{ipDisplay}:{gw.signalingPort || 5060}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "var(--muted)" }}>Capacity:</span>
                      <span style={{ fontWeight: 600 }}>{gw.active_calls} / {gw.capacity || gw.line_limit} lines</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>CPS Limit:</span>
                      <span style={{ fontWeight: 600 }}>{gw.cps_limit || 20} CPS</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingGateway(gw);
                    }}
                  >
                    <Icon name="settings" size={12} />
                    <span>Quick Edit</span>
                  </button>

                  <Link
                    href={`/admin/gateways/mapping/${encodeURIComponent(gw.id || gw.name)}`}
                    className="btn primary sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Full Details</span>
                    <Icon name="chevronRight" size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QUICK INSPECTOR DRAWER */}
      {selectedGateway && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
          onClick={() => setSelectedGateway(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              height: "100%",
              background: "var(--surface)",
              borderLeft: "1px solid var(--border)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 750 }}>{selectedGateway.name}</h2>
                  <span className={`badge ${selectedGateway.lockType === 0 ? "badge-online" : "badge-danger"}`}>
                    {selectedGateway.lockType === 0 ? "Active" : "Locked"}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  Mapping Ingress Gateway · ID: <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{selectedGateway.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGateway(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 20 }}
              >
                ✕
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ padding: 24, flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Owning Customer Card */}
              <div className="card" style={{ padding: 16, background: "var(--surface2)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
                  Owning Customer Account
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                      {selectedGateway.customerName || selectedGateway.organizationName || "Carrier / Unassigned"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Account: <span style={{ fontFamily: "var(--font-mono, monospace)" }}>{selectedGateway.account || "—"}</span>
                    </div>
                  </div>
                  {selectedGateway.customerId && (
                    <Link href={`/admin/customers/${selectedGateway.customerId}`} className="btn secondary sm">
                      <span>View Customer</span>
                      <Icon name="chevronRight" size={12} />
                    </Link>
                  )}
                </div>
              </div>

              {/* Technical Specifications */}
              <div>
                <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                  Technical Parameters
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "var(--surface2)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Configured IP Whitelist</div>
                    <div style={{ fontSize: 13, fontWeight: 650, fontFamily: "var(--font-mono, monospace)", marginTop: 2 }}>
                      {selectedGateway.configuredIp || selectedGateway.remoteIps || "192.168.1.100"}
                    </div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Signaling Port</div>
                    <div style={{ fontSize: 13, fontWeight: 650, fontFamily: "var(--font-mono, monospace)", marginTop: 2 }}>
                      {selectedGateway.signalingPort || 5060} ({selectedGateway.protocolName || "SIP"})
                    </div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Line Limit (Capacity)</div>
                    <div style={{ fontSize: 13, fontWeight: 650, marginTop: 2 }}>
                      {selectedGateway.capacity || selectedGateway.line_limit} lines
                    </div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>CPS Limit</div>
                    <div style={{ fontSize: 13, fontWeight: 650, marginTop: 2 }}>
                      {selectedGateway.cps_limit || 20} calls/sec
                    </div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Register Mode</div>
                    <div style={{ fontSize: 13, fontWeight: 650, marginTop: 2 }}>
                      {selectedGateway.registerTypeName || "Static IP"}
                    </div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Active Channels</div>
                    <div style={{ fontSize: 13, fontWeight: 650, color: "var(--primary)", marginTop: 2 }}>
                      {selectedGateway.active_calls} active
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Ping Tool */}
              <div className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Network Quality Ping Test</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Probe latency & packet loss against configured IP</div>
                  </div>
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => void handleTriggerPing(selectedGateway)}
                    disabled={pingStatus === "running"}
                  >
                    <Icon name="radar" size={13} className={pingStatus === "running" ? "animate-spin" : ""} />
                    <span>{pingStatus === "running" ? "Testing…" : "Run Ping"}</span>
                  </button>
                </div>

                {pingData && (
                  <div style={{ background: "var(--surface2)", padding: "10px 12px", borderRadius: "var(--radius-sm)", fontSize: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div>
                      <span style={{ color: "var(--muted)", display: "block" }}>Latency</span>
                      <strong style={{ color: "var(--success)", fontSize: 14 }}>{pingData.latency_ms} ms</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", display: "block" }}>Packet Loss</span>
                      <strong style={{ color: "var(--success)", fontSize: 14 }}>{pingData.packet_loss}</strong>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)", display: "block" }}>Jitter</span>
                      <strong style={{ color: "var(--text)", fontSize: 14 }}>{pingData.jitter_ms} ms</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setEditingGateway(selectedGateway);
                }}
              >
                <Icon name="settings" size={13} />
                <span>Edit Parameters</span>
              </button>

              <Link
                href={`/admin/gateways/mapping/${encodeURIComponent(selectedGateway.id || selectedGateway.name)}`}
                className="btn primary"
                style={{ flex: 1, justifyContent: "center" }}
              >
                <span>Open Full Details Page</span>
                <Icon name="chevronRight" size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CREATE GATEWAY MODAL */}
      {isCreateModalOpen && (
        <GatewayFormModal
          title="Create New Mapping Gateway"
          customers={customers}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            showToast("Mapping gateway created successfully.");
            void fetchLiveGateways();
          }}
        />
      )}

      {/* EDIT GATEWAY MODAL */}
      {editingGateway && (
        <GatewayFormModal
          title={`Edit Mapping Gateway: ${editingGateway.name}`}
          initialData={editingGateway}
          customers={customers}
          onClose={() => setEditingGateway(null)}
          onSuccess={() => {
            setEditingGateway(null);
            if (selectedGateway?.id === editingGateway.id) {
              setSelectedGateway(null);
            }
            showToast("Gateway parameters updated successfully.");
            void fetchLiveGateways();
          }}
        />
      )}

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Mapping Gateways"
        totalRows={filteredGateways.length}
        columns={[
          { key: "name", header: "GATEWAY NAME" },
          { key: "account", header: "ACCOUNT" },
          { key: "customerName", header: "CUSTOMER" },
          { key: "configuredIp", header: "IP ADDRESS" },
          { key: "signalingPort", header: "PORT" },
          { key: "line_limit", header: "CAPACITY" },
          { key: "active_calls", header: "ACTIVE CALLS" },
          { key: "cps_limit", header: "CPS LIMIT" },
          { key: "registerTypeName", header: "REGISTER TYPE" },
          { key: "protocolName", header: "PROTOCOL" },
          { key: "status", header: "STATUS" },
          { key: "memo", header: "MEMO" },
        ]}
        data={filteredGateways}
        filenamePrefix="mapping-gateways"
      />
    </div>
  );
}

function GatewayFormModal({
  title,
  initialData,
  customers,
  onClose,
  onSuccess,
}: {
  title: string;
  initialData?: MappingGatewayRecord;
  customers: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [customerId, setCustomerId] = useState(initialData?.customerId || "none");
  const [configuredIp, setConfiguredIp] = useState(initialData?.configuredIp || initialData?.remoteIps || "");
  const [signalingPort, setSignalingPort] = useState(initialData?.signalingPort || 5060);
  const [lineLimit, setLineLimit] = useState(initialData?.capacity || initialData?.line_limit || 100);
  const [cpsLimit, setCpsLimit] = useState(initialData?.cps_limit || 20);
  const [registerType, setRegisterType] = useState<number>(initialData?.registerType ?? 0);
  const [lockType, setLockType] = useState<number>(initialData?.lockType ?? 0);
  const [protocol, setProtocol] = useState<number>(initialData?.protocol ?? 1);
  const [memo, setMemo] = useState(initialData?.memo || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Gateway Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      vosGatewayId: name.trim(),
      customerId: customerId === "none" ? null : customerId,
      configuredIp: configuredIp.trim(),
      ip: configuredIp.trim(),
      signalingPort: Number(signalingPort) || 5060,
      lineLimit: Number(lineLimit) || 100,
      capacity: Number(lineLimit) || 100,
      cpsLimit: Number(cpsLimit) || 20,
      registerType: Number(registerType),
      lockType: Number(lockType),
      status: Number(lockType) === 0 ? "active" : "locked",
      protocol: Number(protocol),
      memo: memo.trim(),
    };

    try {
      if (initialData?.id) {
        await api(`/api/v1/admin/gateways/mapping/${encodeURIComponent(initialData.id)}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/api/v1/admin/gateways/mapping`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <FormErrorAlert error={error} onDismiss={() => setError(null)} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Gateway Name */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Gateway Identifier *</label>
              <input
                type="text"
                className="input"
                style={{ width: "100%" }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. GW-INGRESS-NY-01"
                required
                disabled={!!initialData}
              />
            </div>

            {/* Owning Customer */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Owning Customer</label>
              <select
                className="input"
                style={{ width: "100%" }}
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="none">— Unassigned / Carrier Pool —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.account_name} ({c.vos_account_id || c.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </div>

            {/* Configured IP Whitelist */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Configured IP / Whitelist</label>
              <input
                type="text"
                className="input"
                style={{ width: "100%", fontFamily: "var(--font-mono, monospace)" }}
                value={configuredIp}
                onChange={(e) => setConfiguredIp(e.target.value)}
                placeholder="e.g. 198.51.100.24"
              />
            </div>

            {/* Signaling Port */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Signaling Port</label>
              <input
                type="number"
                className="input"
                style={{ width: "100%", fontFamily: "var(--font-mono, monospace)" }}
                value={signalingPort}
                onChange={(e) => setSignalingPort(Number(e.target.value))}
                placeholder="5060"
              />
            </div>

            {/* Line Limit (Capacity) */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Line Limit (Channels)</label>
              <input
                type="number"
                className="input"
                style={{ width: "100%" }}
                value={lineLimit}
                onChange={(e) => setLineLimit(Number(e.target.value))}
                min={0}
                required
              />
            </div>

            {/* CPS Limit */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>CPS Limit (Calls/Sec)</label>
              <input
                type="number"
                className="input"
                style={{ width: "100%" }}
                value={cpsLimit}
                onChange={(e) => setCpsLimit(Number(e.target.value))}
                min={0}
                required
              />
            </div>

            {/* Register Mode */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Register Mode</label>
              <select
                className="input"
                style={{ width: "100%" }}
                value={registerType}
                onChange={(e) => setRegisterType(Number(e.target.value))}
              >
                <option value={0}>Static IP Authentication</option>
                <option value={1}>Dynamic SIP Registration</option>
              </select>
            </div>

            {/* Lock Status */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Lock / Operating Status</label>
              <select
                className="input"
                style={{ width: "100%" }}
                value={lockType}
                onChange={(e) => setLockType(Number(e.target.value))}
              >
                <option value={0}>Unlocked (Online & Processing Calls)</option>
                <option value={1}>Lock In (Block New Inbound Calls)</option>
                <option value={2}>Lock Out (Block Outbound Calls)</option>
                <option value={3}>Locked (Fully Disabled)</option>
              </select>
            </div>
          </div>

          {/* Memo */}
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Administrative Memo / Description</label>
            <input
              type="text"
              className="input"
              style={{ width: "100%" }}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. Primary US East SIP Ingress Trunk"
            />
          </div>

          {/* Buttons */}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "Saving…" : initialData ? "Update Gateway" : "Create Gateway"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
