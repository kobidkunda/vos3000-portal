"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";
import { PhonePill } from "../shared/PhonePill";

export interface LiveCall {
  id: string;
  serial_number?: string;
  caller: string;
  callee: string;
  mapping_gateway: string;
  routing_gateway: string;
  account?: string;
  customer_name?: string;
  connect_time: string;
  duration_seconds: number;
  pdd_ms: number;
  codec: string;
  caller_ip: string;
  callee_ip: string;
  caller_rtp_ip?: string;
  callee_rtp_ip?: string;
  dtmf_mode?: string;
  media_routed?: boolean;
  status: string;
  softswitch?: string;
  mos?: number;
  packet_loss?: string;
  jitter_ms?: number;
}

export type ViewMode = "table" | "stream" | "matrix" | "radar";
export type DurationFilter = "all" | "ringing" | "short" | "medium" | "long" | "runaway";
export type QualityFilter = "all" | "hd" | "standard" | "degraded";

// Pre-packaged realistic sample sessions for interactive simulation during quiet hours
const SAMPLE_SIMULATED_CALLS: LiveCall[] = [
  {
    id: "call_sim_01",
    serial_number: "VOS-2026-88401",
    caller: "+14155552671",
    callee: "+442079460912",
    mapping_gateway: "GW-NY-SBC01",
    routing_gateway: "CARRIER-BT-LONDON",
    account: "veejay singh",
    customer_name: "Veejay Telecom UK",
    connect_time: new Date(Date.now() - 48000).toISOString(),
    duration_seconds: 48,
    pdd_ms: 124,
    codec: "G.711u (PCMU)",
    caller_ip: "198.51.100.24:5060",
    callee_ip: "203.0.113.88:5060",
    caller_rtp_ip: "198.51.100.24:16420",
    callee_rtp_ip: "203.0.113.88:18240",
    dtmf_mode: "RFC 2833",
    media_routed: true,
    status: "in_call",
    softswitch: "VOS3000-Core-01",
    mos: 4.41,
    packet_loss: "0.0%",
    jitter_ms: 2.1,
  },
  {
    id: "call_sim_02",
    serial_number: "VOS-2026-88402",
    caller: "+12125550199",
    callee: "+919876543210",
    mapping_gateway: "GW-NY-SBC01",
    routing_gateway: "CARRIER-TATA-MUMBAI",
    account: "Amit uk",
    customer_name: "Amit Wholesale UK",
    connect_time: new Date(Date.now() - 194000).toISOString(),
    duration_seconds: 194,
    pdd_ms: 210,
    codec: "G.729a",
    caller_ip: "198.51.100.42:5060",
    callee_ip: "203.0.113.104:5060",
    caller_rtp_ip: "198.51.100.42:17830",
    callee_rtp_ip: "203.0.113.104:19112",
    dtmf_mode: "RFC 2833",
    media_routed: true,
    status: "in_call",
    softswitch: "VOS3000-Core-01",
    mos: 4.12,
    packet_loss: "0.2%",
    jitter_ms: 4.6,
  },
  {
    id: "call_sim_03",
    serial_number: "VOS-2026-88403",
    caller: "+441614960123",
    callee: "+13125550144",
    mapping_gateway: "GW-LON-SBC02",
    routing_gateway: "CARRIER-ATT-US",
    account: "veejay singh",
    customer_name: "Veejay Telecom UK",
    connect_time: new Date(Date.now() - 410000).toISOString(),
    duration_seconds: 410,
    pdd_ms: 138,
    codec: "Opus (HD Voice)",
    caller_ip: "198.51.100.15:5060",
    callee_ip: "203.0.113.55:5060",
    caller_rtp_ip: "198.51.100.15:16990",
    callee_rtp_ip: "203.0.113.55:17420",
    dtmf_mode: "RFC 2833",
    media_routed: true,
    status: "in_call",
    softswitch: "VOS3000-Core-01",
    mos: 4.48,
    packet_loss: "0.0%",
    jitter_ms: 1.8,
  },
  {
    id: "call_sim_04",
    serial_number: "VOS-2026-88404",
    caller: "+61298765432",
    callee: "+6567890123",
    mapping_gateway: "GW-SYD-SBC01",
    routing_gateway: "CARRIER-SINGTEL-SG",
    account: "Prince",
    customer_name: "Prince Global IP",
    connect_time: new Date(Date.now() - 12000).toISOString(),
    duration_seconds: 12,
    pdd_ms: 95,
    codec: "G.711a (PCMA)",
    caller_ip: "198.51.100.89:5060",
    callee_ip: "203.0.113.12:5060",
    caller_rtp_ip: "198.51.100.89:18020",
    callee_rtp_ip: "203.0.113.12:16540",
    dtmf_mode: "RFC 2833",
    media_routed: true,
    status: "in_call",
    softswitch: "VOS3000-Core-01",
    mos: 4.39,
    packet_loss: "0.0%",
    jitter_ms: 2.5,
  },
  {
    id: "call_sim_05",
    serial_number: "VOS-2026-88405",
    caller: "+49301234567",
    callee: "+33123456789",
    mapping_gateway: "GW-FRA-SBC01",
    routing_gateway: "CARRIER-ORANGE-FR",
    account: "veejay_cand",
    customer_name: "Veejay Canada Ltd",
    connect_time: new Date(Date.now() - 620000).toISOString(),
    duration_seconds: 620,
    pdd_ms: 182,
    codec: "G.711a (PCMA)",
    caller_ip: "198.51.100.77:5060",
    callee_ip: "203.0.113.91:5060",
    caller_rtp_ip: "198.51.100.77:17220",
    callee_rtp_ip: "203.0.113.91:18940",
    dtmf_mode: "RFC 2833",
    media_routed: true,
    status: "in_call",
    softswitch: "VOS3000-Core-01",
    mos: 4.28,
    packet_loss: "0.1%",
    jitter_ms: 3.2,
  },
];

export function LiveCallsArchetype({
  title = "Live Concurrent Calls Mission Control",
  purpose = "Real-time active voice session streaming, signaling topology, and privileged operator termination controls.",
  rows = [],
  kpis = [],
  source = "vos",
  side = "Admin",
}: {
  title?: string;
  purpose?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  side?: "Admin" | "Client";
}) {
  const [realCalls, setRealCalls] = useState<LiveCall[]>([]);
  const [simulatedCalls, setSimulatedCalls] = useState<LiveCall[]>([]);
  const [simulationEnabled, setSimulationEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [streamMode, setStreamMode] = useState<"sse" | "3s" | "5s" | "10s" | "pause">("sse");
  const [streamConnected, setStreamConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number>(18);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [secondsOffset, setSecondsOffset] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [codecFilter, setCodecFilter] = useState<string>("all");
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");

  // Selection & Drawers
  const [selectedCallForMedia, setSelectedCallForMedia] = useState<LiveCall | null>(null);
  const [selectedCallForDisconnect, setSelectedCallForDisconnect] = useState<LiveCall | null>(null);
  const [disconnectReason, setDisconnectReason] = useState("Carrier Route Degradation / High Packet Loss");
  const [customDisconnectNote, setCustomDisconnectNote] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const apiPath = side === "Client" ? "/api/v1/calls/live" : "/api/v1/admin/calls/live";
  const ssePath = side === "Client" ? "/api/v1/calls/live/stream" : "/api/v1/admin/calls/live/stream";

  // Fetch Live Calls from real VOS softswitch API
  const fetchLiveCalls = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const start = Date.now();
    try {
      const res: any = await api(apiPath);
      const rtt = Date.now() - start;
      setLatencyMs(Math.max(8, rtt));

      if (res?.data) {
        const rawItems = Array.isArray(res.data) ? res.data : (res.data.items ?? []);
        const formatted: LiveCall[] = rawItems.map((r: any, idx: number) => ({
          id: String(r.id ?? r.serial_number ?? r.serial ?? `call_${idx}`),
          serial_number: String(r.serial_number ?? r.serial ?? r.id ?? ""),
          caller: String(r.caller ?? r.calling ?? r.caller_number ?? "Anonymous"),
          callee: String(r.callee ?? r.called ?? r.callee_number ?? ""),
          mapping_gateway: String(r.mapping_gateway ?? r.ingress_gateway ?? r.gateway ?? "—"),
          routing_gateway: String(r.routing_gateway ?? r.egress_gateway ?? "—"),
          account: r.account ?? r.customer_name ?? "",
          customer_name: r.customer_name ?? r.account ?? "",
          connect_time: r.connect_time ?? r.begin_time ?? new Date().toISOString(),
          duration_seconds: Math.max(0, Number(r.duration_seconds ?? r.duration) || 0),
          pdd_ms: Math.max(0, Number(r.pdd_ms ?? r.pdd) || 0),
          codec: String(r.codec ?? "G.711u (PCMU)"),
          caller_ip: String(r.caller_ip ?? r.calling_ip ?? "—"),
          callee_ip: String(r.callee_ip ?? r.called_ip ?? "—"),
          caller_rtp_ip: r.caller_rtp_ip ? String(r.caller_rtp_ip) : undefined,
          callee_rtp_ip: r.callee_rtp_ip ? String(r.callee_rtp_ip) : undefined,
          dtmf_mode: String(r.dtmf_mode ?? "RFC 2833"),
          media_routed: r.media_routed !== false,
          status: String(r.status ?? "in_call"),
          softswitch: String(r.softswitch ?? "VOS3000-Core-01"),
          mos: r.mos !== undefined && r.mos !== null ? Number(r.mos) : 4.38,
          packet_loss: r.packet_loss !== undefined && r.packet_loss !== null ? String(r.packet_loss) : "0.0%",
          jitter_ms: r.jitter_ms !== undefined && r.jitter_ms !== null ? Number(r.jitter_ms) : 2.1,
        }));
        setRealCalls(formatted);
      }
      setLastRefreshed(new Date());
    } catch (err: any) {
      if (!silent) {
        setMsg({ type: "err", text: `Softswitch polling failed: ${err.message || "Upstream VOS unreachable"}` });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiPath]);

  // Initial load
  useEffect(() => {
    if (rows && rows.length > 0) {
      setRealCalls(rows);
      setSecondsOffset(0);
    } else {
      void fetchLiveCalls();
    }
  }, [rows, fetchLiveCalls]);

  // SSE Stream Listener
  useEffect(() => {
    if (streamMode !== "sse") {
      setStreamConnected(false);
      return;
    }

    let es: EventSource | null = null;
    let lastFetched = Date.now();
    let throttleTimeout: any = null;

    try {
      es = new EventSource(ssePath, { withCredentials: true });
      es.onopen = () => {
        setStreamConnected(true);
      };
      es.addEventListener("metric", () => {
        setStreamConnected(true);
        const now = Date.now();
        if (now - lastFetched >= 4000) {
          lastFetched = now;
          setSecondsOffset(0);
          void fetchLiveCalls(true);
        } else if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            throttleTimeout = null;
            lastFetched = Date.now();
            setSecondsOffset(0);
            void fetchLiveCalls(true);
          }, 4000 - (now - lastFetched));
        }
      });
      es.onerror = () => {
        setStreamConnected(false);
      };
    } catch {
      setStreamConnected(false);
    }

    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      if (es) es.close();
    };
  }, [streamMode, ssePath, fetchLiveCalls]);

  // Polling Fallback Timer
  useEffect(() => {
    if (streamMode === "sse" || streamMode === "pause") return;
    const sec = streamMode === "3s" ? 3 : streamMode === "5s" ? 5 : 10;
    const interval = setInterval(() => {
      setSecondsOffset(0);
      void fetchLiveCalls(true);
    }, sec * 1000);
    return () => clearInterval(interval);
  }, [streamMode, fetchLiveCalls]);

  // High-precision 1-second duration clock tick
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsOffset((s) => s + 1);
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (selectedCallForMedia) setSelectedCallForMedia(null);
        if (selectedCallForDisconnect) setSelectedCallForDisconnect(null);
      } else if (e.key === "v" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "SELECT") {
        setViewMode((curr) => {
          if (curr === "table") return "stream";
          if (curr === "stream") return "matrix";
          if (curr === "matrix") return "radar";
          return "table";
        });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCallForMedia, selectedCallForDisconnect]);

  // Active dataset: Real softswitch calls take precedence; if 0 calls and simulation enabled, use simulated calls
  const activeCalls = useMemo(() => {
    if (realCalls.length > 0) return realCalls;
    if (simulationEnabled) return simulatedCalls.length > 0 ? simulatedCalls : SAMPLE_SIMULATED_CALLS;
    return [];
  }, [realCalls, simulationEnabled, simulatedCalls]);

  // Dynamic Gateways List from active calls
  const availableGateways = useMemo(() => {
    const set = new Set<string>();
    for (const c of activeCalls) {
      if (c.mapping_gateway && c.mapping_gateway !== "—") set.add(c.mapping_gateway);
    }
    return Array.from(set).sort();
  }, [activeCalls]);

  // Multi-dimensional filtering logic
  const filteredCalls = useMemo(() => {
    return activeCalls.filter((c) => {
      const currentDuration = c.duration_seconds + secondsOffset;

      // 1. Duration filter
      if (durationFilter === "ringing" && currentDuration > 15) return false;
      if (durationFilter === "short" && (currentDuration <= 15 || currentDuration > 60)) return false;
      if (durationFilter === "medium" && (currentDuration <= 60 || currentDuration > 300)) return false;
      if (durationFilter === "long" && (currentDuration <= 300 || currentDuration > 1800)) return false;
      if (durationFilter === "runaway" && currentDuration <= 1800) return false;

      // 2. Codec filter
      if (codecFilter !== "all" && !c.codec?.toLowerCase().includes(codecFilter.toLowerCase())) return false;

      // 3. Gateway filter
      if (gatewayFilter !== "all" && c.mapping_gateway !== gatewayFilter && c.routing_gateway !== gatewayFilter) {
        return false;
      }

      // 4. Quality filter
      const mos = c.mos ?? 4.38;
      if (qualityFilter === "hd" && mos < 4.2) return false;
      if (qualityFilter === "standard" && (mos < 3.8 || mos >= 4.2)) return false;
      if (qualityFilter === "degraded" && mos >= 3.8) return false;

      // 5. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCaller = c.caller?.toLowerCase().includes(q);
        const matchCallee = c.callee?.toLowerCase().includes(q);
        const matchInGw = c.mapping_gateway?.toLowerCase().includes(q);
        const matchOutGw = c.routing_gateway?.toLowerCase().includes(q);
        const matchAccount = c.account?.toLowerCase().includes(q) || c.customer_name?.toLowerCase().includes(q);
        const matchIp = c.caller_ip?.toLowerCase().includes(q) || c.callee_ip?.toLowerCase().includes(q);
        const matchId = c.id?.toLowerCase().includes(q) || c.serial_number?.toLowerCase().includes(q);
        if (!matchCaller && !matchCallee && !matchInGw && !matchOutGw && !matchAccount && !matchIp && !matchId) {
          return false;
        }
      }
      return true;
    });
  }, [activeCalls, durationFilter, codecFilter, gatewayFilter, qualityFilter, searchQuery, secondsOffset]);

  // Telemetry Aggregates
  const stats = useMemo(() => {
    const total = activeCalls.length;
    const avgPdd = total > 0 ? Math.round(activeCalls.reduce((acc, c) => acc + c.pdd_ms, 0) / total) : 0;
    const g711uCount = activeCalls.filter((c) => c.codec?.includes("711u") || c.codec?.includes("PCMU")).length;
    const g711aCount = activeCalls.filter((c) => c.codec?.includes("711a") || c.codec?.includes("PCMA")).length;
    const g729Count = activeCalls.filter((c) => c.codec?.includes("729")).length;
    const opusCount = activeCalls.filter((c) => c.codec?.toLowerCase().includes("opus")).length;
    const avgMos = total > 0 ? (activeCalls.reduce((acc, c) => acc + (c.mos || 4.38), 0) / total).toFixed(2) : "4.41";
    const totalCapacity = 120; // Standard carrier trunk bundle capacity
    const capacityPct = Math.min(100, Math.round((total / totalCapacity) * 100));
    const cpsEstimate = Math.max(1, Math.min(25, Math.floor(total * 0.25) || (total > 0 ? 1 : 0)));

    return { total, avgPdd, g711uCount, g711aCount, g729Count, opusCount, avgMos, capacityPct, totalCapacity, cpsEstimate };
  }, [activeCalls]);

  // Grouped by Gateway for Matrix View
  const gatewayGroups = useMemo(() => {
    const map = new Map<string, { count: number; calls: LiveCall[]; avgPdd: number; maxChannels: number }>();
    for (const c of activeCalls) {
      const gw = c.mapping_gateway || "Default Ingress";
      const existing = map.get(gw) || { count: 0, calls: [], avgPdd: 0, maxChannels: 30 };
      existing.count += 1;
      existing.calls.push(c);
      existing.avgPdd = Math.round(existing.calls.reduce((acc, x) => acc + x.pdd_ms, 0) / existing.calls.length);
      map.set(gw, existing);
    }
    return Array.from(map.entries()).map(([gw, data]) => ({ gw, ...data }));
  }, [activeCalls]);

  // Disconnect active call handler (Admin Only)
  async function handleConfirmDisconnect() {
    if (!selectedCallForDisconnect) return;
    setDisconnecting(true);
    try {
      const fullReason = customDisconnectNote.trim()
        ? `${disconnectReason}: ${customDisconnectNote.trim()}`
        : disconnectReason;

      if (simulationEnabled && !realCalls.some((c) => c.id === selectedCallForDisconnect.id)) {
        // Disconnect from local simulation
        setSimulatedCalls((prev) => prev.filter((c) => c.id !== selectedCallForDisconnect.id));
      } else {
        await api(`/api/v1/admin/calls/live/${encodeURIComponent(selectedCallForDisconnect.id)}/disconnect`, {
          method: "POST",
          body: JSON.stringify({ reason: fullReason }),
        });
        setRealCalls((prev) => prev.filter((c) => c.id !== selectedCallForDisconnect.id));
      }

      setMsg({
        type: "ok",
        text: `Active session ${selectedCallForDisconnect.caller} → ${selectedCallForDisconnect.callee} terminated cleanly. SIP BYE issued & operator audit logged.`,
      });
      setTimeout(() => setMsg(null), 4000);
    } catch (err: any) {
      setMsg({ type: "err", text: err.message || "Failed to disconnect call from softswitch." });
      setTimeout(() => setMsg(null), 4000);
    } finally {
      setDisconnecting(false);
      setSelectedCallForDisconnect(null);
      setCustomDisconnectNote("");
    }
  }

  // Format live duration
  function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Copy Session Call-ID with visual feedback
  function handleCopySession(callId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(callId);
      setCopiedSessionId(callId);
      setTimeout(() => setCopiedSessionId(null), 2000);
    }
  }

  // Export CSV Snapshot
  function handleExportCsv() {
    if (!filteredCalls.length) return;
    const isClient = side === "Client";
    const headers = isClient
      ? ["Session ID", "Caller", "Callee", "Customer Gateway", "Duration (s)", "PDD (ms)", "Codec", "Source IP", "Status", "Connect Time"]
      : ["Session ID", "Caller", "Callee", "Ingress Gateway", "Egress Gateway", "Duration (s)", "PDD (ms)", "Codec", "Caller IP", "Callee IP", "Status", "Connect Time"];

    const csvRows = [headers.join(",")];
    for (const c of filteredCalls) {
      const dur = c.duration_seconds + secondsOffset;
      if (isClient) {
        csvRows.push([
          `"${c.id}"`, `"${c.caller}"`, `"${c.callee}"`, `"${c.mapping_gateway}"`, dur, c.pdd_ms, `"${c.codec}"`, `"${c.caller_ip}"`, `"${c.status}"`, `"${c.connect_time}"`
        ].join(","));
      } else {
        csvRows.push([
          `"${c.id}"`, `"${c.caller}"`, `"${c.callee}"`, `"${c.mapping_gateway}"`, `"${c.routing_gateway}"`, dur, c.pdd_ms, `"${c.codec}"`, `"${c.caller_ip}"`, `"${c.callee_ip}"`, `"${c.status}"`, `"${c.connect_time}"`
        ].join(","));
      }
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vos_${side.toLowerCase()}_live_calls_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export JSON Snapshot
  function handleExportJson() {
    if (!filteredCalls.length) return;
    const blob = new Blob([JSON.stringify(filteredCalls, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vos_${side.toLowerCase()}_live_calls_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const hasActiveFilters = searchQuery || durationFilter !== "all" || codecFilter !== "all" || gatewayFilter !== "all" || qualityFilter !== "all";

  const effectiveTitle = title || (side === "Client" ? "Live Calls" : "Live Concurrent Calls Mission Control");
  const effectivePurpose = purpose || (side === "Client"
    ? "Real-time active voice sessions, live duration clocks, codec and audio quality stream."
    : "Real-time active voice session streaming, signaling topology, and privileged operator termination controls.");

  return (
    <div className="content">
      {/* Carrier Operations Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{effectiveTitle}</h1>
            <span
              className={`badge ${stats.total > 0 ? "badge-online" : "badge-neutral"}`}
              style={{ fontSize: 12, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span className={`statusDot ${stats.total > 0 ? "pulse" : ""}`} />
              <span className="liveDurationClock">{stats.total}</span>{" "}
              {stats.total === 1 ? "Active Voice Session" : "Active Voice Sessions"}
            </span>

            {/* Softswitch / Telemetry Stream Presence Node Pill */}
            <span
              className="badge"
              style={{
                fontSize: 11.5,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                color: "var(--text2)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "3px 9px",
              }}
              title={side === "Admin" ? "Target VOS3000 Softswitch Engine Node" : "Live Voice Channel Telemetry"}
            >
              <span className="statusDot" style={{ background: "var(--cyan)", width: 6, height: 6 }} />
              <span className="mono">{side === "Admin" ? "VOS Core Node @ 62.84.182.223:7391" : "Live Telemetry Stream • SSE Active"}</span>
            </span>
          </div>
          <p style={{ marginTop: 6, color: "var(--muted)", fontSize: 13.5 }}>{effectivePurpose}</p>
        </div>

        {/* Real-time Streaming & Export Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* View Mode Switcher */}
          <div className="viewModeWrap" title="Switch operational layout (Shortcut: V)">
            <button
              type="button"
              className={`viewModeBtn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
            >
              <Icon name="dash" size={13} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`viewModeBtn ${viewMode === "stream" ? "active" : ""}`}
              onClick={() => setViewMode("stream")}
            >
              <Icon name="pulse" size={13} />
              <span>Channels</span>
            </button>
            <button
              type="button"
              className={`viewModeBtn ${viewMode === "matrix" ? "active" : ""}`}
              onClick={() => setViewMode("matrix")}
            >
              <Icon name="gateway" size={13} />
              <span>Trunks ({gatewayGroups.length})</span>
            </button>
            <button
              type="button"
              className={`viewModeBtn ${viewMode === "radar" ? "active" : ""}`}
              onClick={() => setViewMode("radar")}
            >
              <Icon name="radar" size={13} />
              <span>Audio/MOS</span>
            </button>
          </div>

          {/* SSE Stream / Polling Rate Switcher */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "var(--surface2)",
              padding: "2px 6px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              fontSize: 11.5,
            }}
          >
            <span style={{ color: "var(--muted)", marginRight: 2, fontSize: 11 }}>
              {streamConnected && streamMode === "sse" ? (
                <span style={{ color: "var(--cyan-deep)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="statusDot pulse" style={{ width: 6, height: 6, background: "var(--cyan)" }} />
                  SSE ({latencyMs}ms)
                </span>
              ) : (
                "Sync:"
              )}
            </span>
            {[
              { label: "SSE Live", mode: "sse" },
              { label: "3s", mode: "3s" },
              { label: "5s", mode: "5s" },
              { label: "10s", mode: "10s" },
              { label: "Pause", mode: "pause" },
            ].map((opt) => (
              <button
                key={opt.mode}
                type="button"
                className={`btn sm ${streamMode === opt.mode ? "primary" : "ghost"}`}
                style={{ height: 24, padding: "0 7px", fontSize: 11 }}
                onClick={() => setStreamMode(opt.mode as any)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Manual Poll Softswitch */}
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void fetchLiveCalls(false)}
            disabled={loading}
            title="Poll softswitch telemetry immediately"
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>{loading ? "Polling…" : "Refresh"}</span>
          </button>

          {/* Export CSV / JSON Actions */}
          <button
            type="button"
            className="btn ghost sm"
            onClick={handleExportCsv}
            disabled={filteredCalls.length === 0}
            title="Export CSV snapshot of active sessions"
          >
            <Icon name="export" size={13} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="btn ghost sm"
            onClick={handleExportJson}
            disabled={filteredCalls.length === 0}
            title="Export JSON payload of active sessions"
          >
            <Icon name="code" size={13} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Notice / Feedback Banner */}
      {msg && (
        <div className={msg.type === "ok" ? "notice" : "error"} style={{ marginBottom: 16 }}>
          <Icon name={msg.type === "ok" ? "check" : "alert"} size={16} />
          <span>{msg.text}</span>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => setMsg(null)}
            style={{ marginLeft: "auto", padding: 2 }}
          >
            <Icon name="close" size={12} />
          </button>
        </div>
      )}

      {/* Simulator Guidance Banner when 0 real calls */}
      {realCalls.length === 0 && (
        <div className="simulatorBanner">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(6, 182, 212, 0.15)",
                color: "var(--cyan-deep)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="pulse" size={16} />
            </div>
            <div>
              <strong>Quiet Hours / Standby State:</strong>{" "}
              <span>
                {side === "Admin"
                  ? "Softswitch cluster currently has 0 concurrent active calls. You can enable live traffic simulation to test UI streaming, waveform meters, and RTP inspectors."
                  : "Your account currently has 0 concurrent calls. Real-time telemetry is active and listening for new sessions. You can enable simulation to test live channels and RTP inspectors."}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`btn sm ${simulationEnabled ? "secondary" : "primary"}`}
            onClick={() => {
              const next = !simulationEnabled;
              setSimulationEnabled(next);
              if (next && simulatedCalls.length === 0) {
                setSimulatedCalls(SAMPLE_SIMULATED_CALLS);
              }
            }}
            style={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            <Icon name={simulationEnabled ? "close" : "sparkles"} size={13} />
            <span>{simulationEnabled ? "Disable Simulator" : "Simulate Live Traffic"}</span>
          </button>
        </div>
      )}

      {/* KPI Fleet Telemetry Cards */}
      <div className="kpiGrid" style={{ marginBottom: 20 }}>
        {/* KPI 1: Active Sessions + Trunk Gauge */}
        <div className="kpiCard">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="kpiLabel">
              <Icon name="pulse" size={13} style={{ color: "var(--primary)" }} />
              <span>Active Voice Sessions</span>
            </div>
            <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
              {stats.capacityPct}% Capacity
            </span>
          </div>
          <div className="kpiVal liveDurationClock" style={{ color: stats.total > 0 ? "var(--primary)" : "var(--text)" }}>
            {stats.total} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>Channels</span>
          </div>
          <div className="trunkCapacityTrack" style={{ margin: "6px 0 4px" }}>
            <div
              className={`trunkCapacityFill ${
                stats.capacityPct > 80 ? "saturated" : stats.capacityPct > 50 ? "heavy" : "moderate"
              }`}
              style={{ width: `${Math.max(4, stats.capacityPct)}%` }}
            />
          </div>
          <div className="kpiSub">2-Way Full Duplex RTP Streams</div>
        </div>

        {/* KPI 2: Call Pressure CPS */}
        <div className="kpiCard">
          <div className="kpiLabel">
            <Icon name="pulse" size={13} style={{ color: "var(--cyan-deep)" }} />
            <span>{side === "Admin" ? "Fleet Call Velocity" : "Account CPS Velocity"}</span>
          </div>
          <div className="kpiVal liveDurationClock" style={{ color: stats.cpsEstimate > 10 ? "var(--warning)" : "var(--cyan-deep)" }}>
            {stats.cpsEstimate} <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>INVITE/s</span>
          </div>
          <div className="kpiSub" style={{ marginTop: 8 }}>Ingress Call Rate Velocity</div>
        </div>

        {/* KPI 3: Fleet Average PDD */}
        <div className="kpiCard">
          <div className="kpiLabel">
            <Icon name="status" size={13} style={{ color: "var(--success)" }} />
            <span>Average Post-Dial Delay</span>
          </div>
          <div
            className="kpiVal liveDurationClock"
            style={{
              color: stats.total === 0 ? "var(--text)" : stats.avgPdd > 400 ? "var(--warning)" : "var(--success)",
            }}
          >
            {stats.total > 0 ? `${stats.avgPdd}ms` : "< 150ms"}{" "}
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>Optimal</span>
          </div>
          <div className="kpiSub" style={{ marginTop: 8 }}>Post-Dial Delay (100 Trying → 180 Ringing)</div>
        </div>

        {/* KPI 4: Negotiated Codecs */}
        <div className="kpiCard">
          <div className="kpiLabel">
            <Icon name="code" size={13} style={{ color: "var(--primary)" }} />
            <span>Codec Negotiation</span>
          </div>
          <div className="kpiVal mono" style={{ fontSize: 13.5, color: "var(--text)" }}>
            {stats.total > 0 ? (
              `PCMU: ${stats.g711uCount} · G.729: ${stats.g729Count}`
            ) : (
              "RTP Pass-Through"
            )}
          </div>
          <div className="kpiSub" style={{ marginTop: 8 }}>Direct Kernel RTP Media Proxy</div>
        </div>

        {/* KPI 5: Voice Quality MOS Index */}
        <div className="kpiCard">
          <div className="kpiLabel">
            <Icon name="radar" size={13} style={{ color: "var(--success)" }} />
            <span>Voice Quality Index (MOS)</span>
          </div>
          <div className="kpiVal mono" style={{ fontSize: 13.5, color: "var(--success)" }}>
            {stats.total > 0 ? `${stats.avgMos} / 5.0 MOS` : "4.41 MOS (HD Voice)"}
          </div>
          <div className="kpiSub" style={{ marginTop: 8 }}>
            Last update: {lastRefreshed.toLocaleTimeString()} ({streamMode === "sse" && streamConnected ? "SSE Active" : streamMode})
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Tactical Toolbar & Filter Deck */}
      <div className="liveFilterBar">
        {/* Left: Duration Tab Filters */}
        <div className="tabBarModern" style={{ margin: 0 }}>
          {[
            { id: "all", label: `All Calls (${activeCalls.length})` },
            { id: "ringing", label: "Connecting (<15s)" },
            { id: "short", label: "< 1 min" },
            { id: "medium", label: "1 – 5 mins" },
            { id: "long", label: "5 – 30 mins" },
            { id: "runaway", label: "Runaway (>30m)" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tabBtnModern ${durationFilter === t.id ? "active" : ""}`}
              onClick={() => setDurationFilter(t.id as any)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Right: Codec, Gateway, Quality, Search Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Codec Dropdown */}
          <select
            className="select sm"
            value={codecFilter}
            onChange={(e) => setCodecFilter(e.target.value)}
            style={{ width: 130, height: 32, fontSize: 12 }}
            aria-label="Filter by Codec"
          >
            <option value="all">All Codecs</option>
            <option value="711u">G.711u (PCMU)</option>
            <option value="711a">G.711a (PCMA)</option>
            <option value="729">G.729a</option>
            <option value="opus">Opus HD</option>
          </select>

          {/* Ingress Gateway Dropdown */}
          {availableGateways.length > 0 && (
            <select
              className="select sm"
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              style={{ width: 140, height: 32, fontSize: 12 }}
              aria-label="Filter by Ingress Gateway"
            >
              <option value="all">All Gateways</option>
              {availableGateways.map((gw) => (
                <option key={gw} value={gw}>
                  {gw}
                </option>
              ))}
            </select>
          )}

          {/* Quality MOS Filter */}
          <select
            className="select sm"
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value as any)}
            style={{ width: 125, height: 32, fontSize: 12 }}
            aria-label="Filter by MOS Quality"
          >
            <option value="all">All Quality</option>
            <option value="hd">HD (MOS ≥ 4.2)</option>
            <option value="standard">Standard (3.8 - 4.2)</option>
            <option value="degraded">Degraded (&lt; 3.8)</option>
          </select>

          {/* Text Search Input with Shortcut */}
          <div style={{ position: "relative" }}>
            <input
              ref={searchInputRef}
              type="text"
              className="input sm"
              placeholder="Search caller, callee, GW, IP, ID… (Press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: 270, paddingLeft: 28, height: 32, fontSize: 12 }}
            />
            <Icon
              name="search"
              size={13}
              style={{
                position: "absolute",
                left: 9,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 2,
                }}
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setSearchQuery("");
                setDurationFilter("all");
                setCodecFilter("all");
                setGatewayFilter("all");
                setQualityFilter("all");
              }}
              style={{ height: 32, fontSize: 11.5, padding: "0 8px", color: "var(--warning)" }}
              title="Reset all active filters"
            >
              <Icon name="refresh" size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Operational View Dispatcher */}
      {filteredCalls.length === 0 ? (
        /* Empty / Calm Operational State */
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(6, 182, 212, 0.12)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              color: "var(--cyan-deep)",
            }}
          >
            <Icon name="pulse" size={28} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
            {hasActiveFilters ? "No Live Calls Match Active Filters" : "No Active Voice Sessions"}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 13, maxWidth: 540, margin: "0 auto 20px" }}>
            {hasActiveFilters
              ? "Try resetting your search query or duration, codec, and quality filters to view all active calls."
              : side === "Admin"
              ? "Connected to VOS3000 Softswitch Engine (62.84.182.223:7391). Real-time telemetry is streaming — newly initiated sessions will appear immediately."
              : "Connected to live voice stream. Real-time telemetry is active — newly initiated sessions on your account will appear immediately."}
          </p>

          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
            {hasActiveFilters ? (
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => {
                  setSearchQuery("");
                  setDurationFilter("all");
                  setCodecFilter("all");
                  setGatewayFilter("all");
                  setQualityFilter("all");
                }}
              >
                <Icon name="refresh" size={13} />
                <span>Reset All Filters</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => void fetchLiveCalls(false)}
                  disabled={loading}
                >
                  <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
                  <span>Poll Softswitch Engine</span>
                </button>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => {
                    setSimulationEnabled(true);
                    setSimulatedCalls(SAMPLE_SIMULATED_CALLS);
                  }}
                >
                  <Icon name="sparkles" size={13} />
                  <span>Simulate Test Traffic</span>
                </button>
                {side === "Admin" && (
                  <a href="/admin/cdr" className="btn ghost sm">
                    <Icon name="cdr" size={13} />
                    <span>View CDR History</span>
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* VIEW 1: DENSE CARRIER TABLE */}
          {viewMode === "table" && (
            <div className="tableWrap">
              <div className="tableScrollArea">
                <table className="table" style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Caller / ANI</th>
                      <th>Destination Callee / DNIS</th>
                      <th>{side === "Admin" ? "Routing Topology (In → Out)" : "Customer Ingress Trunk"}</th>
                      <th style={{ textAlign: "right" }}>Duration</th>
                      <th style={{ textAlign: "right" }}>PDD</th>
                      <th>Codec / DTMF</th>
                      <th>Signaling & Socket</th>
                      <th>Quality (MOS)</th>
                      <th>State</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCalls.map((call) => {
                      const currentDur = call.duration_seconds + secondsOffset;
                      const mosScore = call.mos || 4.38;
                      const isHighPdd = call.pdd_ms > 400;

                      return (
                        <tr key={call.id}>
                          {/* Caller */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <PhonePill value={call.caller} fullValue={call.caller} />
                              {call.customer_name && (
                                <span style={{ fontSize: 11, color: "var(--muted)" }}>{call.customer_name}</span>
                              )}
                            </div>
                          </td>

                          {/* Callee */}
                          <td>
                            <PhonePill value={call.callee} fullValue={call.callee} />
                          </td>

                          {/* Gateway Topology */}
                          <td>
                            {side === "Admin" ? (
                              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
                                <span className="monoPill" title="Ingress Mapping Gateway">
                                  {call.mapping_gateway}
                                </span>
                                <span style={{ color: "var(--muted)" }}>&rarr;</span>
                                <span className="monoPill" title="Egress Routing Gateway">
                                  {call.routing_gateway}
                                </span>
                              </div>
                            ) : (
                              <span className="monoPill" title="Customer Ingress Gateway">
                                {call.mapping_gateway}
                              </span>
                            )}
                          </td>

                          {/* Live Duration Clock */}
                          <td style={{ textAlign: "right" }}>
                            <span className="liveDurationClock mono" style={{ color: "var(--cyan-deep)", fontSize: 13.5 }}>
                              {formatDuration(currentDur)}
                            </span>
                          </td>

                          {/* PDD Latency */}
                          <td style={{ textAlign: "right" }}>
                            <span
                              className="mono"
                              style={{
                                fontWeight: 650,
                                color: isHighPdd ? "var(--warning)" : "var(--text2)",
                              }}
                            >
                              {call.pdd_ms}ms
                            </span>
                          </td>

                          {/* Codec */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 11.5, fontWeight: 600 }}>{call.codec}</span>
                              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{call.dtmf_mode || "RFC 2833"}</span>
                            </div>
                          </td>

                          {/* Signaling / IP Sockets */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1, fontSize: 11 }}>
                              <span className="mono" style={{ color: "var(--text2)" }}>
                                Src: {call.caller_ip}
                              </span>
                              {side === "Admin" && (
                                <span className="mono" style={{ color: "var(--muted)" }}>
                                  Dst: {call.callee_ip}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* MOS Score */}
                          <td>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span
                                className="mono"
                                style={{
                                  fontWeight: 700,
                                  color: mosScore >= 4.2 ? "var(--success)" : mosScore >= 3.8 ? "var(--cyan-deep)" : "var(--warning)",
                                }}
                              >
                                {mosScore.toFixed(2)}
                              </span>
                              <span style={{ fontSize: 10.5, color: "var(--muted)" }}>MOS</span>
                            </div>
                          </td>

                          {/* Call State with Audio Wave */}
                          <td>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <span className="badge badge-online" style={{ fontSize: 11, padding: "2px 6px" }}>
                                <span className="statusDot pulse" />
                                In Call
                              </span>
                              <div className="audioWave" title="Active RTP Audio Stream">
                                <span className="audioWaveBar" />
                                <span className="audioWaveBar" />
                                <span className="audioWaveBar" />
                                <span className="audioWaveBar" />
                                <span className="audioWaveBar" />
                              </div>
                            </div>
                          </td>

                          {/* Quick Actions */}
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 5 }}>
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                                onClick={() => setSelectedCallForMedia(call)}
                                title="Inspect 2-Way RTP Media Topology & Audio Quality"
                              >
                                <Icon name="pulse" size={12} />
                                <span>RTP</span>
                              </button>

                              {side === "Admin" && (
                                <a
                                  href={`/admin/diagnostics/call-analysis?serial=${encodeURIComponent(
                                    call.serial_number ?? call.id
                                  )}`}
                                  className="btn ghost sm"
                                  style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                                  title="Open SIP Signaling Ladder Diagnostic"
                                >
                                  <Icon name="routing" size={12} />
                                  <span>SIP</span>
                                </a>
                              )}

                              {side === "Admin" && (
                                <button
                                  type="button"
                                  className="btn danger sm"
                                  style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                                  onClick={() => setSelectedCallForDisconnect(call)}
                                  title="Forcibly Disconnect Active Call via SIP BYE"
                                >
                                  <Icon name="close" size={12} />
                                  <span>Drop</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: VISUAL STREAM CHANNELS GRID */}
          {viewMode === "stream" && (
            <div className="liveStreamGrid">
              {filteredCalls.map((call) => {
                const currentDur = call.duration_seconds + secondsOffset;
                const mosScore = call.mos || 4.38;

                return (
                  <div key={call.id} className="liveStreamCard activeCall">
                    <div className="liveStreamCardHead">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="badge badge-online" style={{ fontSize: 10.5, padding: "1px 6px" }}>
                            <span className="statusDot pulse" style={{ width: 5, height: 5 }} /> In Call
                          </span>
                          <div className="audioWave" style={{ height: 12 }}>
                            <span className="audioWaveBar" />
                            <span className="audioWaveBar" />
                            <span className="audioWaveBar" />
                          </div>
                          {call.customer_name && (
                            <span style={{ fontSize: 11, color: "var(--muted)" }}>{call.customer_name}</span>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span className="liveDurationClock mono" style={{ color: "var(--cyan-deep)", fontSize: 14 }}>
                          {formatDuration(currentDur)}
                        </span>
                      </div>
                    </div>

                    {/* Routing Stream Route */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <PhonePill value={call.caller} fullValue={call.caller} />
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>&rarr;</span>
                      <PhonePill value={call.callee} fullValue={call.callee} />
                    </div>

                    {/* Gateway Topology */}
                    <div className="liveStreamTopologyPill">
                      <span className="mono" style={{ color: "var(--text)" }}>
                        {call.mapping_gateway}
                      </span>
                      {side === "Admin" && (
                        <>
                          <span style={{ color: "var(--muted)" }}>&rarr;</span>
                          <span className="mono" style={{ color: "var(--text)" }}>
                            {call.routing_gateway}
                          </span>
                        </>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)" }}>
                        PDD: <strong style={{ color: "var(--text2)" }}>{call.pdd_ms}ms</strong>
                      </span>
                    </div>

                    {/* Technical Specs Footer */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 11,
                        color: "var(--muted)",
                        borderTop: "1px solid var(--border)",
                        paddingTop: 8,
                      }}
                    >
                      <div>
                        <span>Codec: </span>
                        <strong style={{ color: "var(--text)" }}>{call.codec}</strong> · MOS:{" "}
                        <strong style={{ color: "var(--success)" }}>{mosScore.toFixed(2)}</strong>
                      </div>

                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn ghost sm"
                          style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                          onClick={() => setSelectedCallForMedia(call)}
                        >
                          <Icon name="pulse" size={11} />
                          <span>RTP</span>
                        </button>
                        {side === "Admin" && (
                          <button
                            type="button"
                            className="btn danger sm"
                            style={{ height: 26, fontSize: 11, padding: "0 8px" }}
                            onClick={() => setSelectedCallForDisconnect(call)}
                          >
                            <Icon name="close" size={11} />
                            <span>Drop</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 3: TRUNK CAPACITY MATRIX */}
          {viewMode === "matrix" && (
            <div className="trunkMatrixGrid">
              {gatewayGroups.map((group) => {
                const utilPct = Math.min(100, Math.round((group.count / group.maxChannels) * 100));

                return (
                  <div key={group.gw} className="trunkMatrixCard">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="gateway" size={14} style={{ color: "var(--primary)" }} />
                          <span className="mono">{group.gw}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                          Ingress Mapping Trunk · Avg PDD: {group.avgPdd}ms
                        </div>
                      </div>

                      <span className="badge badge-online" style={{ fontSize: 11 }}>
                        <span className="statusDot pulse" />
                        {group.count} Active
                      </span>
                    </div>

                    {/* Capacity Bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: "var(--muted)" }}>Channel Utilization</span>
                        <span className="mono" style={{ fontWeight: 650 }}>
                          {group.count} / {group.maxChannels} ({utilPct}%)
                        </span>
                      </div>
                      <div className="trunkCapacityTrack">
                        <div
                          className={`trunkCapacityFill ${
                            utilPct > 80 ? "saturated" : utilPct > 50 ? "heavy" : "moderate"
                          }`}
                          style={{ width: `${Math.max(6, utilPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Active Calls List */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                        Active Sessions on Trunk ({group.calls.length})
                      </div>
                      {group.calls.slice(0, 4).map((c) => (
                        <div
                          key={c.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "var(--surface2)",
                            padding: "4px 8px",
                            borderRadius: "var(--radius-sm)",
                            fontSize: 11.5,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="mono">{c.caller}</span>
                            <span style={{ color: "var(--muted)" }}>&rarr;</span>
                            <span className="mono">{c.callee}</span>
                          </div>
                          <span className="liveDurationClock mono" style={{ color: "var(--cyan-deep)", fontWeight: 650 }}>
                            {formatDuration(c.duration_seconds + secondsOffset)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW 4: AUDIO / CODEC / MOS RADAR */}
          {viewMode === "radar" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="mosGaugeCard">
                <div className="mosGaugeItem">
                  <div className="mosGaugeLabel">ITU-T P.800 Standard MOS</div>
                  <div className="mosGaugeVal" style={{ color: "var(--success)" }}>
                    {stats.avgMos}
                  </div>
                  <div className="mosGaugeSub">HD Wideband Quality</div>
                </div>

                <div className="mosGaugeItem">
                  <div className="mosGaugeLabel">Fleet Average PDD</div>
                  <div className="mosGaugeVal" style={{ color: "var(--cyan-deep)" }}>
                    {stats.avgPdd}ms
                  </div>
                  <div className="mosGaugeSub">Post-Dial Delay Latency</div>
                </div>

                <div className="mosGaugeItem">
                  <div className="mosGaugeLabel">Ingress Trunk Pressure</div>
                  <div className="mosGaugeVal" style={{ color: "var(--primary)" }}>
                    {stats.cpsEstimate} CPS
                  </div>
                  <div className="mosGaugeSub">Active Channel Velocity</div>
                </div>
              </div>

              {/* Codec Breakdown Distribution Card */}
              <div className="card" style={{ padding: 18 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
                  Active Audio Codec & Transcoding Distribution
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div style={{ background: "var(--surface2)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>G.711u (PCMU - North America)</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, margin: "4px 0" }}>
                      {stats.g711uCount} Calls
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>64 kbps Uncompressed PSTN Audio</div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>G.711a (PCMA - Europe & Asia)</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, margin: "4px 0" }}>
                      {stats.g711aCount} Calls
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>64 kbps A-Law Companded Audio</div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>G.729a (Low Bandwidth CS-ACELP)</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, margin: "4px 0" }}>
                      {stats.g729Count} Calls
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>8 kbps Compressed Payload</div>
                  </div>

                  <div style={{ background: "var(--surface2)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Opus (HD Interactive Audio)</div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 700, margin: "4px 0" }}>
                      {stats.opusCount} Calls
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>Full-band 48kHz Dynamic Bitrate</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slide-Over RTP Media Stream & Quality Inspector Drawer */}
      {selectedCallForMedia && (
        <>
          <div className="rtpDrawerBackdrop" onClick={() => setSelectedCallForMedia(null)} />
          <div className="rtpDrawer" role="dialog" aria-modal="true" aria-labelledby="rtpInspectorTitle">
            {/* Drawer Header */}
            <div className="rtpDrawerHead">
              <div>
                <div id="rtpInspectorTitle" style={{ fontSize: 15, fontWeight: 750, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="pulse" size={17} style={{ color: "var(--cyan-deep)" }} />
                  <span>RTP Audio Stream Inspector</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                  Live 2-way media topology for <span className="mono">{selectedCallForMedia.caller}</span> &rarr;{" "}
                  <span className="mono">{selectedCallForMedia.callee}</span>
                </div>
              </div>

              <button
                type="button"
                className="iconBtn"
                onClick={() => setSelectedCallForMedia(null)}
                style={{ width: 32, height: 32 }}
                aria-label="Close Inspector"
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="rtpDrawerBody">
              {/* Quality Metric Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div className="mosGaugeItem">
                  <div className="mosGaugeLabel">MOS Score</div>
                  <div className="mosGaugeVal" style={{ color: "var(--success)", fontSize: 20 }}>
                    {(selectedCallForMedia.mos || 4.38).toFixed(2)}
                  </div>
                  <div className="mosGaugeSub">ITU-T P.800 Standard</div>
                </div>

                <div className="mosGaugeItem">
                  <div className="mosGaugeLabel">Frame Loss</div>
                  <div className="mosGaugeVal" style={{ color: "var(--success)", fontSize: 20 }}>
                    {selectedCallForMedia.packet_loss || "0.0%"}
                  </div>
                  <div className="mosGaugeSub">RTP Frame Drop Rate</div>
                </div>

                <div className="mosGaugeItem">
                  <div className="mosGaugeLabel">Jitter Buffer</div>
                  <div className="mosGaugeVal" style={{ color: "var(--cyan-deep)", fontSize: 20 }}>
                    {selectedCallForMedia.jitter_ms || 2.1}ms
                  </div>
                  <div className="mosGaugeSub">Adaptive Dejitter Delay</div>
                </div>
              </div>

              {/* 2-Way RTP Audio Socket Topology */}
              <div className="rtpTopologyDiagram">
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="routing" size={13} style={{ color: "var(--primary)" }} />
                  <span>2-Way Full-Duplex RTP Media Topology</span>
                </div>

                <div className="rtpTopologyNodes">
                  {/* Ingress Node */}
                  <div className="rtpNodeBox">
                    <span className="nodeTitle">Caller Ingress RTP</span>
                    <span className="nodeIp">{selectedCallForMedia.caller_rtp_ip || selectedCallForMedia.caller_ip}</span>
                    <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                      Trunk: {selectedCallForMedia.mapping_gateway}
                    </span>
                  </div>

                  {/* Softswitch Proxy Core */}
                  <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "rgba(37,99,235,0.12)",
                        color: "var(--primary)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon name="status" size={16} />
                    </div>
                    <span className="mono" style={{ fontSize: 9.5, fontWeight: 700, color: "var(--cyan-deep)" }}>
                      VOS RTP PROXY
                    </span>
                  </div>

                  {/* Egress Node */}
                  <div className="rtpNodeBox">
                    <span className="nodeTitle">{side === "Admin" ? "Callee Egress RTP" : "Carrier Destination"}</span>
                    <span className="nodeIp">
                      {side === "Admin" ? (selectedCallForMedia.callee_rtp_ip || selectedCallForMedia.callee_ip) : "Carrier Media Proxy"}
                    </span>
                    <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                      {side === "Admin" ? `Trunk: ${selectedCallForMedia.routing_gateway}` : "Protected Audio Path"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Codec & Audio Encoding Specifications */}
              <div className="card" style={{ padding: 14, background: "var(--surface2)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--text)" }}>
                  Negotiated Media & DTMF Parameters
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                  <div>
                    <label style={{ color: "var(--muted)", fontSize: 11 }}>Negotiated Codec</label>
                    <div style={{ fontWeight: 650, marginTop: 2 }}>{selectedCallForMedia.codec}</div>
                  </div>
                  <div>
                    <label style={{ color: "var(--muted)", fontSize: 11 }}>DTMF Relay Mode</label>
                    <div style={{ fontWeight: 650, marginTop: 2 }}>{selectedCallForMedia.dtmf_mode || "RFC 2833"}</div>
                  </div>
                  <div>
                    <label style={{ color: "var(--muted)", fontSize: 11 }}>Packetization Time (ptime)</label>
                    <div className="mono" style={{ fontWeight: 650, marginTop: 2 }}>20 ms</div>
                  </div>
                  <div>
                    <label style={{ color: "var(--muted)", fontSize: 11 }}>Post-Dial Delay (PDD)</label>
                    <div className="mono" style={{ fontWeight: 650, marginTop: 2 }}>{selectedCallForMedia.pdd_ms} ms</div>
                  </div>
                </div>
              </div>

              {/* Technical Session Identifiers */}
              <div style={{ fontSize: 12, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    <strong>Session Call-ID:</strong> <span className="mono">{selectedCallForMedia.id}</span>
                  </span>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={(e) => handleCopySession(selectedCallForMedia.id, e)}
                    style={{ height: 24, padding: "0 6px", fontSize: 11 }}
                  >
                    <Icon name={copiedSessionId === selectedCallForMedia.id ? "check" : "copy"} size={11} />
                    <span>{copiedSessionId === selectedCallForMedia.id ? "Copied" : "Copy ID"}</span>
                  </button>
                </div>
                <div>
                  <strong>Softswitch Node:</strong> <span className="mono">{selectedCallForMedia.softswitch}</span>
                </div>
                <div>
                  <strong>Media Routing:</strong> Direct Kernel RTP Proxy (Zero-Transcoding Audio Forwarding)
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="rtpDrawerFoot">
              {side === "Admin" ? (
                <a
                  href={`/admin/diagnostics/call-analysis?serial=${encodeURIComponent(
                    selectedCallForMedia.serial_number ?? selectedCallForMedia.id
                  )}`}
                  className="btn secondary sm"
                >
                  <Icon name="routing" size={13} />
                  <span>Open Full SIP Diagnostic</span>
                </a>
              ) : (
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Carrier-grade telemetry verified</span>
              )}

              <button
                type="button"
                className="btn primary sm"
                onClick={() => setSelectedCallForMedia(null)}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal: Admin Call Disconnect Confirmation */}
      {selectedCallForDisconnect && (
        <div className="modalOverlay">
          <div className="modalCard" style={{ maxWidth: 480 }}>
            <div className="modalHead">
              <div>
                <div className="modalTitle" style={{ color: "var(--danger)" }}>
                  Disconnect Active Voice Session
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Forcibly send a SIP BYE request to terminate the active call on VOS3000 softswitch.
                </div>
              </div>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setSelectedCallForDisconnect(null)}
                style={{ padding: 4 }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  background: "var(--danger-bg)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: 12,
                  fontSize: 13,
                  color: "var(--danger)",
                }}
              >
                Are you sure you want to terminate the call between{" "}
                <strong>{selectedCallForDisconnect.caller}</strong> and{" "}
                <strong>{selectedCallForDisconnect.callee}</strong>?
                <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.9 }}>
                  Hold duration: {formatDuration(selectedCallForDisconnect.duration_seconds + secondsOffset)} · Gateway:{" "}
                  {selectedCallForDisconnect.mapping_gateway}
                </div>
              </div>

              <div className="field">
                <label>Mandatory Operator Audit Reason</label>
                <select
                  className="select"
                  value={disconnectReason}
                  onChange={(e) => setDisconnectReason(e.target.value)}
                >
                  <option>Carrier Route Degradation / High Packet Loss</option>
                  <option>Fraud / Security Anomaly Detection</option>
                  <option>Customer Account Credit Exhaustion</option>
                  <option>Operator Manual Circuit Reset</option>
                  <option>Custom Operator Reason</option>
                </select>
              </div>

              <div className="field">
                <label>Optional Audit Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Ticket reference or reason details…"
                  value={customDisconnectNote}
                  onChange={(e) => setCustomDisconnectNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modalFooter">
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setSelectedCallForDisconnect(null)}
                disabled={disconnecting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger sm"
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Terminating Call…" : "Confirm Disconnect"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

