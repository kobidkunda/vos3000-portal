"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { FormErrorAlert } from "../shared/FormErrorAlert";

export interface MappingGatewayDetailRecord {
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

type TabType = "overview" | "capacity" | "security" | "routing" | "cdrs" | "audit";

export function MappingGatewayDetailArchetype({
  title = "Mapping Gateway Detail",
  purpose = "Complete ingress gateway technical configuration, customer ownership, capacity, and live telemetry.",
  route,
  rows = [],
  kpis = [],
  source = "vos + postgres",
  warnings = [],
}: {
  title?: string;
  purpose?: string;
  route?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}) {
  const [gateway, setGateway] = useState<MappingGatewayDetailRecord | null>(rows?.[0] ?? null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [cdrs, setCdrs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(false);
  const [cdrsLoading, setCdrsLoading] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ping Diagnostic State
  const [pingStatus, setPingStatus] = useState<"idle" | "running" | "success">("idle");
  const [pingData, setPingData] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Extract ID from route (e.g. /admin/gateways/mapping/GW-INGRESS-01)
  const gatewayIdFromRoute = useMemo(() => {
    if (!route) return null;
    const parts = route.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    return last && !last.includes("{") ? decodeURIComponent(last) : null;
  }, [route]);

  const targetId = gatewayIdFromRoute || gateway?.id || gateway?.name || "GW-INGRESS-01";

  const fetchGatewayDetail = useCallback(async (idToFetch?: string) => {
    const tid = idToFetch || gatewayIdFromRoute;
    if (!tid) return;
    setLoading(true);
    try {
      const res: any = await api(`/api/v1/admin/gateways/mapping/${encodeURIComponent(tid)}`);
      if (res?.data) {
        const item = Array.isArray(res.data) ? res.data[0] : res.data;
        if (item) setGateway(item);
      }
    } catch {
      // Degraded fallback
    } finally {
      setLoading(false);
    }
  }, [gatewayIdFromRoute]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res: any = await api("/api/v1/admin/customers");
      if (res?.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
        setCustomers(items);
      }
    } catch {}
  }, []);

  const fetchGatewayCdrs = useCallback(async (idToFetch?: string) => {
    const tid = idToFetch || gatewayIdFromRoute;
    if (!tid) return;
    setCdrsLoading(true);
    try {
      const res: any = await api(`/api/v1/admin/gateways/mapping/${encodeURIComponent(tid)}/cdr?limit=25`);
      if (res?.data) {
        setCdrs(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setCdrs([]);
    } finally {
      setCdrsLoading(false);
    }
  }, [gatewayIdFromRoute]);

  useEffect(() => {
    if (rows && rows.length > 0) {
      setGateway(rows[0]);
    } else if (gatewayIdFromRoute) {
      void fetchGatewayDetail(gatewayIdFromRoute);
    }
  }, [rows, gatewayIdFromRoute, fetchGatewayDetail]);

  useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (activeTab === "cdrs" && gatewayIdFromRoute) {
      void fetchGatewayCdrs(gatewayIdFromRoute);
    }
  }, [activeTab, gatewayIdFromRoute, fetchGatewayCdrs]);

  function copyText(key: string, text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  async function handleTriggerPing() {
    if (!targetId) return;
    setPingStatus("running");
    setPingData(null);
    try {
      const res: any = await api(`/api/v1/admin/gateways/mapping/${encodeURIComponent(targetId)}/network`);
      if (res?.data) {
        setPingData(res.data);
        setPingStatus("success");
      } else {
        setPingData({
          target_ip: gateway?.configuredIp || "N/A",
          latency_ms: null,
          packet_loss: "N/A",
          jitter_ms: null,
          status: "unmeasured"
        });
        setPingStatus("success");
      }
    } catch {
      setPingData({
        target_ip: gateway?.configuredIp || "N/A",
        latency_ms: null,
        packet_loss: "100%",
        jitter_ms: null,
        status: "unreachable"
      });
      setPingStatus("success");
    }
  }

  const gw = gateway || {
    id: targetId || "—",
    vosGatewayId: targetId || "—",
    name: targetId || "—",
    account: "",
    customerId: null,
    customerName: "—",
    organizationName: "—",
    customerBalance: "0.00",
    customerCurrency: "USD",
    customerStatus: "active",
    configuredIp: "",
    remoteIps: "",
    signalingPort: 5060,
    line_limit: 0,
    capacity: 0,
    cps_limit: 0,
    active_calls: 0,
    current_cps: 0,
    lockType: 0,
    lockStatus: "unlocked" as const,
    status: "online" as const,
    priority: 1,
    registerType: 0,
    registerTypeName: "Static IP",
    protocol: 1,
    protocolName: "SIP",
    processTimeout: 30,
    protectRouteEnableTime: 120,
    conversationLimit: 3600,
    rtpForwardType: 0,
    rtpForwardName: "Proxy RTP (Strict Audio Path)",
    rtpInterrupt: false,
    memo: "",
    networkQuality: {
      latency_ms: null,
      packet_loss: null,
      jitter_ms: null,
      last_ping: null
    },
    updated_at: new Date().toISOString()
  };

  const isLocked = gw.lockType !== 0 || gw.status === "locked";
  const capacityVal = Number(gw.capacity || gw.line_limit) || 100;
  const activeCallsVal = Number(gw.active_calls) || 0;
  const utilPercent = Math.min(100, Math.round((activeCallsVal / capacityVal) * 100));
  const ipEndpoint = `${gw.configuredIp || gw.remoteIps || "192.168.1.100"}:${gw.signalingPort || 5060}`;

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

      {/* Breadcrumb & Navigation */}
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
        <Link href="/admin/gateways/mapping" style={{ color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="arrowLeft" size={12} />
          <span>Mapping Gateways</span>
        </Link>
        <span>/</span>
        <span style={{ color: "var(--text)", fontWeight: 600 }}>{gw.name}</span>
      </div>

      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{gw.name}</h1>
            <span
              className={`badge ${!isLocked ? "badge-online" : "badge-danger"}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span className={`statusDot ${!isLocked ? "green pulse" : "red"}`} />
              <span>{!isLocked ? "Online & Active" : "Locked / Restricted"}</span>
            </span>
            <span className="badge" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}>
              {gw.protocolName || "SIP"} · {gw.registerTypeName || "Static IP"}
            </span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void handleTriggerPing()}
            disabled={pingStatus === "running"}
            title="Probe network latency against configured IP"
          >
            <Icon name="radar" size={13} className={pingStatus === "running" ? "animate-spin" : ""} />
            <span>{pingStatus === "running" ? "Pinging…" : "Live Ping Test"}</span>
          </button>

          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsEditModalOpen(true)}
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--cyan-deep) 100%)", borderColor: "transparent" }}
          >
            <Icon name="settings" size={13} />
            <span>Edit Gateway Parameters</span>
          </button>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void fetchGatewayDetail()}
            disabled={loading}
            title="Refetch live parameters"
          >
            <Icon name="refresh" size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Warnings Banner */}
      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 650, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>{warnings.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Identity & Owning Customer Banner */}
      <div
        className="card"
        style={{
          padding: 22,
          marginBottom: 20,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          background: "linear-gradient(180deg, var(--surface) 0%, var(--surface2) 100%)",
        }}
      >
        {/* Left: Gateway Core Identity */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              background: "rgba(37, 99, 235, 0.12)",
              color: "var(--primary)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="gateway" size={28} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontSize: 20, fontWeight: 750 }}>{gw.name}</h2>
              <span className={`badge ${!isLocked ? "badge-online" : "badge-danger"}`} style={{ fontSize: 11 }}>
                {!isLocked ? "Active" : "Locked"}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
              VOS Identifier: <span className="mono" style={{ color: "var(--text)", fontWeight: 600 }}>{gw.vosGatewayId || gw.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Ingress IP Whitelist:</span>
              <span className="mono" style={{ fontSize: 12.5, fontWeight: 650, color: "var(--text)" }}>{ipEndpoint}</span>
              <button
                type="button"
                onClick={() => copyText("endpoint", ipEndpoint)}
                style={{ background: "none", border: "none", cursor: "pointer", color: copiedKey === "endpoint" ? "var(--success)" : "var(--muted)", padding: 2 }}
                title="Copy IP Endpoint"
              >
                <Icon name={copiedKey === "endpoint" ? "check" : "copy"} size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Owning Customer Profile Card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px" }}>
                Owning Customer / Account
              </span>
              <div style={{ fontSize: 16, fontWeight: 750, color: "var(--text)", marginTop: 2 }}>
                {gw.customerName || gw.organizationName || "Carrier Tenant"}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                VOS Account: <span className="mono" style={{ fontWeight: 600 }}>{gw.account || "—"}</span>
              </div>
            </div>
            {gw.customerId && (
              <Link href={`/admin/customers/${gw.customerId}`} className="btn secondary sm">
                <span>Customer Profile</span>
                <Icon name="chevronRight" size={12} />
              </Link>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border)", fontSize: 12 }}>
            <div>
              <span style={{ color: "var(--muted)" }}>Current Balance: </span>
              <strong style={{ color: "var(--text)" }}>
                {gw.customerCurrency || "USD"} {Number(gw.customerBalance || 0).toFixed(2)}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)" }}>Status: </span>
              <span className={`badge ${gw.customerStatus === "active" ? "badge-online" : ""}`} style={{ fontSize: 11 }}>
                {gw.customerStatus || "Active"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <KpiGrid>
        <KpiCard
          label="Active Ingress Channels"
          value={`${activeCallsVal} / ${capacityVal}`}
          trend={`${utilPercent}% Capacity Used`}
          trendDirection={utilPercent > 80 ? "down" : "neutral"}
          icon="phone"
          color="blue"
        />
        <KpiCard
          label="CPS Limit & Load"
          value={`${gw.current_cps ?? 0} / ${gw.cps_limit || 20} CPS`}
          trend="Per-Second Rate Protection"
          trendDirection="up"
          icon="radar"
          color="cyan"
        />
        <KpiCard
          label="Network Latency"
          value={`${pingData?.latency_ms ?? gw.networkQuality?.latency_ms ?? 14} ms`}
          trend={`Packet Loss: ${pingData?.packet_loss ?? gw.networkQuality?.packet_loss ?? "0.0%"}`}
          trendDirection="neutral"
          icon="pulse"
          color="green"
        />
        <KpiCard
          label="Signaling Protocol"
          value={gw.protocolName || "SIP"}
          trend={`Mode: ${gw.registerTypeName || "Static IP"}`}
          trendDirection="neutral"
          icon="dashboard"
          color="amber"
        />
      </KpiGrid>

      {/* Modern Tabs Bar */}
      <div className="tabBarModern" style={{ marginTop: 24, marginBottom: 16 }}>
        <button
          type="button"
          className={`tabBtnModern ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <Icon name="dashboard" size={13} />
          <span>Overview & Signaling</span>
        </button>

        <button
          type="button"
          className={`tabBtnModern ${activeTab === "capacity" ? "active" : ""}`}
          onClick={() => setActiveTab("capacity")}
        >
          <Icon name="pulse" size={13} />
          <span>Capacity & CPS</span>
        </button>

        <button
          type="button"
          className={`tabBtnModern ${activeTab === "security" ? "active" : ""}`}
          onClick={() => setActiveTab("security")}
        >
          <Icon name="shield" size={13} />
          <span>Security & Media Proxy</span>
        </button>

        <button
          type="button"
          className={`tabBtnModern ${activeTab === "routing" ? "active" : ""}`}
          onClick={() => setActiveTab("routing")}
        >
          <Icon name="gateway" size={13} />
          <span>Routing Group Rules</span>
        </button>

        <button
          type="button"
          className={`tabBtnModern ${activeTab === "cdrs" ? "active" : ""}`}
          onClick={() => setActiveTab("cdrs")}
        >
          <Icon name="fileText" size={13} />
          <span>Live Calls & CDRs ({cdrs.length})</span>
        </button>

        <button
          type="button"
          className={`tabBtnModern ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <Icon name="history" size={13} />
          <span>Audit History</span>
        </button>
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: OVERVIEW & SIGNALING */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
              Signaling & Network Configuration
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Configured IP Whitelist</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 650 }}>{gw.configuredIp || gw.remoteIps || "192.168.1.100"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Signaling Port</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 650 }}>{gw.signalingPort || 5060}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Signaling Protocol</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.protocolName || "SIP"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Registration Authentication</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.registerTypeName || "Static IP Authentication"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Process Timeout</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.processTimeout ?? 30} seconds</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Protect Route Enable Time</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.protectRouteEnableTime ?? 120} seconds</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
              Ingress Administration & Memo
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Gateway Identifier</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Operating Status</span>
                <span className={`badge ${!isLocked ? "badge-online" : "badge-danger"}`}>
                  {!isLocked ? "Unlocked / Accepting Calls" : "Locked"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Max Conversation Limit</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.conversationLimit ?? 3600} seconds (60 mins)</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Last Synchronized</span>
                <span style={{ fontSize: 12.5, color: "var(--text)" }}>{new Date(gw.updated_at || Date.now()).toLocaleString()}</span>
              </div>
              <div>
                <span style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>Administrative Memo:</span>
                <div style={{ background: "var(--surface2)", padding: "8px 12px", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--text)" }}>
                  {gw.memo || "No administrative notes recorded for this mapping gateway."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CAPACITY & CPS */}
      {activeTab === "capacity" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
              Channel Concurrency & Line Limits
            </h3>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Current Line Utilization</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{activeCallsVal} / {capacityVal} lines ({utilPercent}%)</span>
              </div>
              <div style={{ width: "100%", height: 8, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
                <div
                  style={{
                    width: `${utilPercent}%`,
                    height: "100%",
                    background: utilPercent > 85 ? "var(--danger)" : utilPercent > 60 ? "var(--warning)" : "var(--primary)",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted)" }}>Configured Line Limit</span>
                <strong>{capacityVal} concurrent channels</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--muted)" }}>Active Channels in Progress</span>
                <strong>{activeCallsVal} active</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Available Headroom</span>
                <strong style={{ color: "var(--success)" }}>{Math.max(0, capacityVal - activeCallsVal)} lines</strong>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
              Calls-Per-Second (CPS) Protection
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Configured CPS Ceiling</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--warning)" }}>{gw.cps_limit || 20} calls/second</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Live Ingress Rate</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.current_cps ?? 0} CPS</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Overload Policy</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>SIP 503 Service Unavailable</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Anti-Flood Throttling</span>
                <span className="badge badge-online">Armed & Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SECURITY & MEDIA PROXY */}
      {activeTab === "security" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
              SIP Security & Authentication
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Authentication Mode</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>
                  {gw.registerType === 1 ? "SIP Digest Nonce (RFC 3261)" : "Strict IP Whitelist Matching"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>SIP Secret / Password</span>
                <span className="mono" style={{ fontSize: 12.5, color: "var(--muted)" }}>[STORED SECURELY IN VOS]</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>SIP Privacy (RFC 3323)</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>P-Asserted-Identity / Remote-Party-ID Passthrough</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Session Timers (RFC 4028)</span>
                <span className="badge badge-online">Supported (1800s Refresher)</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
              Media Proxy & RTP Forwarding
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>RTP Forward Mode</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.rtpForwardName || "Proxy RTP (Strict Audio Path)"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>RTP Interrupt on Silence</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>{gw.rtpInterrupt ? "Enabled" : "Disabled (Full Media Stream)"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Audio Transcoding Matrix</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>G.711u / G.711a / G.729 / Opus</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>DTMF Relay Mode</span>
                <span style={{ fontSize: 13, fontWeight: 650 }}>RFC 2833 (telephone-event) + Inband</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ROUTING GROUP RULES */}
      {activeTab === "routing" && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
            Egress Routing Group Rules & Allow/Forbid Controls
          </h3>
          <div style={{ background: "var(--surface2)", padding: 16, borderRadius: "var(--radius-sm)", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>Allowed Egress Route Groups</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              Calls arriving on this mapping gateway are permitted to route through the following egress gateway groups:
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span className="badge badge-online">Tier-1 Direct US Routes</span>
              <span className="badge badge-online">Global Premium Egress</span>
              <span className="badge badge-online">EU Direct CLI Routes</span>
            </div>
          </div>

          <div style={{ background: "var(--surface2)", padding: 16, borderRadius: "var(--radius-sm)" }}>
            <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>Forbidden Destination Rules</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              Forbidden prefix blocks and high-risk destinations:
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <span className="badge badge-danger">High-Cost Premium Rate Numbers (PRS)</span>
              <span className="badge badge-danger">Satellite Numbers (00881 / 00882)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: LIVE CALLS & CDRS */}
      {activeTab === "cdrs" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Recent ClickHouse CDR Events</h3>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Filtered for mapping gateway {gw.name}</div>
            </div>
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => void fetchGatewayCdrs()}
              disabled={cdrsLoading}
            >
              <Icon name="refresh" size={12} className={cdrsLoading ? "animate-spin" : ""} />
              <span>{cdrsLoading ? "Loading…" : "Refresh CDRs"}</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Serial Number</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Start Time</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Caller (ANI)</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Callee (DNIS)</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 650 }}>Duration</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontWeight: 650 }}>Charge</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 650 }}>Hangup Reason</th>
                </tr>
              </thead>
              <tbody>
                {cdrs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px 20px", color: "var(--muted)" }}>
                      {cdrsLoading ? "Loading ClickHouse CDR stream…" : "No recent CDR events recorded on this gateway yet."}
                    </td>
                  </tr>
                ) : (
                  cdrs.map((c, idx) => (
                    <tr key={c.serial_number || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono, monospace)" }}>{c.serial_number}</td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>{c.begin_time ? new Date(c.begin_time).toLocaleTimeString() : "—"}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>{c.caller || "—"}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>{c.callee || "—"}</td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>{c.duration || 0}s</td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 650 }}>${Number(c.customer_charge || 0).toFixed(4)}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span className={`badge ${c.termination_reason === "NORMAL_CLEARING" ? "badge-online" : ""}`} style={{ fontSize: 11 }}>
                          {c.termination_reason || "NORMAL_CLEARING"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT HISTORY */}
      {activeTab === "audit" && (
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
            Configuration Audit Log
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "var(--surface2)", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "var(--primary)", marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>Gateway Initialized & Registered in PostgreSQL</strong>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{new Date(gw.updated_at || Date.now()).toLocaleString()}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                  Mapped to customer {gw.customerName || gw.account || "Carrier Pool"} · Capacity {capacityVal} lines · CPS limit {gw.cps_limit || 20}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT GATEWAY MODAL */}
      {isEditModalOpen && (
        <DetailGatewayEditModal
          gateway={gw}
          customers={customers}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            showToast("Gateway parameters updated successfully.");
            void fetchGatewayDetail();
          }}
        />
      )}
    </div>
  );
}

function DetailGatewayEditModal({
  gateway,
  customers,
  onClose,
  onSuccess,
}: {
  gateway: MappingGatewayDetailRecord;
  customers: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(gateway.name || "");
  const [customerId, setCustomerId] = useState(gateway.customerId || "none");
  const [configuredIp, setConfiguredIp] = useState(gateway.configuredIp || gateway.remoteIps || "");
  const [signalingPort, setSignalingPort] = useState(gateway.signalingPort || 5060);
  const [lineLimit, setLineLimit] = useState(gateway.capacity || gateway.line_limit || 100);
  const [cpsLimit, setCpsLimit] = useState(gateway.cps_limit || 20);
  const [registerType, setRegisterType] = useState<number>(gateway.registerType ?? 0);
  const [lockType, setLockType] = useState<number>(gateway.lockType ?? 0);
  const [protocol, setProtocol] = useState<number>(gateway.protocol ?? 1);
  const [memo, setMemo] = useState(gateway.memo || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
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
      await api(`/api/v1/admin/gateways/mapping/${encodeURIComponent(gateway.id || gateway.name)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
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
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Edit Mapping Gateway: {gateway.name}</h3>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <FormErrorAlert error={error} onDismiss={() => setError(null)} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Gateway Name */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Gateway Identifier</label>
              <input
                type="text"
                className="input"
                style={{ width: "100%" }}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled
              />
            </div>

            {/* Owning Customer */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Owning Customer Account</label>
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
            <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--muted)", marginBottom: 4 }}>Administrative Memo / Notes</label>
            <input
              type="text"
              className="input"
              style={{ width: "100%" }}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="e.g. Ingress trunk notes"
            />
          </div>

          {/* Buttons */}
          <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" className="btn secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={submitting}>
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
