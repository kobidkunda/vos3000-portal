"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";

interface OnlineGateway {
  id: string;
  name: string;
  vos_gateway_id: string;
  kind: "mapping" | "routing";
  customer_id?: string;
  customer_name?: string;
  registered_ip: string;
  port: number;
  protocol: string;
  line_limit: number;
  active_calls: number;
  cps: number;
  asr: string;
  acd: string;
  latency_ms: number;
  encryption: string;
  softswitch: string;
  registered_at: string;
  status: string;
  updated_at: string;
}

export function OnlineGatewaysArchetype({
  title = "Online Gateways Presence Monitor",
  purpose = "Live operational view of all active ingress mapping and egress routing gateways registered with VOS3000.",
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
  const [activeTab, setActiveTab] = useState<"all" | "mapping" | "routing">("all");
  const [gateways, setGateways] = useState<OnlineGateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(15); // seconds
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLiveGateways = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res: any = await api("/api/v1/admin/gateways/online");
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : [res.data];
        setGateways(items);
      }
      setLastRefreshed(new Date());
    } catch {
      // Degraded
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
    const interval = setInterval(() => {
      void fetchLiveGateways(true);
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchLiveGateways]);

  const filteredGateways = useMemo(() => {
    return gateways.filter((g) => {
      if (activeTab !== "all" && g.kind !== activeTab) return false;
      if (statusFilter !== "all" && g.status?.toLowerCase() !== statusFilter.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = g.name?.toLowerCase().includes(q);
        const matchIp = g.registered_ip?.toLowerCase().includes(q);
        const matchCustomer = g.customer_name?.toLowerCase().includes(q);
        const matchSwitch = g.softswitch?.toLowerCase().includes(q);
        if (!matchName && !matchIp && !matchCustomer && !matchSwitch) return false;
      }
      return true;
    });
  }, [gateways, activeTab, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = gateways.length;
    const online = gateways.filter((g) => g.status === "online").length;
    const totalCalls = gateways.reduce((acc, g) => acc + (Number(g.active_calls) || 0), 0);
    const totalCapacity = gateways.reduce((acc, g) => acc + (Number(g.line_limit) || 100), 0);
    const capacityPct = totalCapacity > 0 ? Math.round((totalCalls / totalCapacity) * 100) : 0;
    const avgLatency = gateways.length > 0 ? Math.round(gateways.reduce((acc, g) => acc + (Number(g.latency_ms) || 0), 0) / gateways.length) : 14;
    return { total, online, totalCalls, totalCapacity, capacityPct, avgLatency };
  }, [gateways]);

  function copyText(id: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <div className="content">
      {/* Top Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge badge-online">
              <span className="statusDot pulse" />
              Live Presence ({stats.online} Online)
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        {/* Live Polling & Refresh Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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
            <span style={{ color: "var(--muted)" }}>Auto-Refresh:</span>
            {[
              { label: "5s", sec: 5 },
              { label: "10s", sec: 10 },
              { label: "30s", sec: 30 },
              { label: "Pause", sec: 0 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                className={`btn sm ${refreshInterval === opt.sec ? "primary" : "ghost"}`}
                style={{ height: 22, padding: "0 6px", fontSize: 11 }}
                onClick={() => setRefreshInterval(opt.sec)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn primary sm"
            onClick={() => void fetchLiveGateways()}
            disabled={loading}
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>{loading ? "Polling VOS…" : "Refresh Now"}</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI Metric Cards */}
      <div className="kpiGrid" style={{ marginBottom: 20 }}>
        <div className="kpiCard">
          <div className="kpiLabel">Online Gateways</div>
          <div className="kpiVal" style={{ color: "var(--success)" }}>
            {stats.online} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {stats.total} total</span>
          </div>
          <div className="kpiSub">Live SIP Registration & ACL Socket</div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Channel Capacity Load</div>
          <div className="kpiVal" style={{ color: stats.capacityPct > 80 ? "var(--warning)" : "var(--cyan-deep)" }}>
            {stats.totalCalls} <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>/ {stats.totalCapacity} lines</span>
          </div>
          <div style={{ width: "100%", height: 5, background: "var(--surface2)", borderRadius: 3, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, stats.capacityPct)}%`, height: "100%", background: stats.capacityPct > 80 ? "var(--warning)" : "var(--primary)", transition: "width 0.3s ease" }} />
          </div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Average Network Latency</div>
          <div className="kpiVal" style={{ color: "var(--text)" }}>
            {stats.avgLatency}ms
          </div>
          <div className="kpiSub">Roundtrip SIP OPTIONS Heartbeat</div>
        </div>

        <div className="kpiCard">
          <div className="kpiLabel">Telemetry Source</div>
          <div className="kpiVal mono" style={{ fontSize: 14, color: "var(--primary)" }}>
            {source}
          </div>
          <div className="kpiSub">Last polled: {lastRefreshed.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Tabs & Search Filter Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div className="tabBarModern" style={{ margin: 0 }}>
          {[
            { id: "all", label: `All Gateways (${gateways.length})` },
            { id: "mapping", label: `Ingress Mapping (${gateways.filter((g) => g.kind === "mapping").length})` },
            { id: "routing", label: `Egress Routing (${gateways.filter((g) => g.kind === "routing").length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tabBtnModern ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="input sm"
              placeholder="Filter by gateway, IP, customer…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 240, paddingLeft: 28 }}
            />
            <Icon name="search" size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          </div>

          <select
            className="select sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 120 }}
          >
            <option value="all">All Statuses</option>
            <option value="online">Online</option>
            <option value="degraded">Degraded</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* Main Table / Hybrid Card View */}
      <div className="tableWrap">
        <div className="tableScrollArea">
          {filteredGateways.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
              <Icon name="gateway" size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
              <div style={{ fontSize: 14, fontWeight: 650 }}>No Online Gateways Found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {searchQuery ? "Try clearing your search query." : "No gateways are currently registered or online with VOS3000."}
              </div>
            </div>
          ) : (
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Gateway Name</th>
                  <th>Kind / Direction</th>
                  <th>Socket & IP</th>
                  <th>Capacity (Active / Limit)</th>
                  <th>CPS / ASR</th>
                  <th>Latency</th>
                  <th>Softswitch Node</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGateways.map((g) => {
                  const calls = Number(g.active_calls) || 0;
                  const limit = Number(g.line_limit) || 100;
                  const usage = Math.min(100, Math.round((calls / limit) * 100));

                  return (
                    <tr key={g.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ color: "var(--text)" }}>{g.name}</strong>
                          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                            {g.customer_name ?? "Carrier Partner"}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="badge" style={{ background: g.kind === "mapping" ? "var(--primary-soft)" : "var(--surface2)", color: g.kind === "mapping" ? "var(--primary)" : "var(--text)" }}>
                          {g.kind === "mapping" ? "Ingress (Customer)" : "Egress (Carrier)"}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="monoPill" style={{ fontSize: 12 }}>
                            {g.registered_ip}:{g.port}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyText(g.id, `${g.registered_ip}:${g.port}`)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: copiedId === g.id ? "var(--success)" : "var(--muted)" }}
                            title="Copy IP:Port"
                          >
                            <Icon name={copiedId === g.id ? "check" : "copy"} size={12} />
                          </button>
                        </div>
                      </td>

                      <td style={{ minWidth: 160 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                          <span className="mono" style={{ fontWeight: 650 }}>{calls} / {limit} lines</span>
                          <span style={{ color: "var(--muted)" }}>{usage}%</span>
                        </div>
                        <div style={{ width: "100%", height: 5, background: "var(--surface2)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${usage}%`, height: "100%", background: usage > 80 ? "var(--warning)" : "var(--primary)", transition: "width 0.2s" }} />
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={{ fontSize: 12 }}>CPS: <strong>{g.cps}</strong></span>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>ASR: {g.asr} · ACD: {g.acd}</span>
                        </div>
                      </td>

                      <td>
                        <span className="mono" style={{ color: g.latency_ms > 50 ? "var(--warning)" : "var(--cyan-deep)" }}>
                          {g.latency_ms}ms
                        </span>
                      </td>

                      <td>
                        <span className="monoPill" style={{ fontSize: 11.5 }}>
                          {g.softswitch}
                        </span>
                      </td>

                      <td>
                        <Status value={g.status} size="sm" />
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <a
                          href={`/admin/calls/live?gateway=${encodeURIComponent(g.name)}`}
                          className="btn ghost sm"
                          style={{ height: 26, fontSize: 11.5, padding: "0 8px" }}
                        >
                          <Icon name="pulse" size={12} />
                          <span>Calls</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
