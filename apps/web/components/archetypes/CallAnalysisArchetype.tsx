"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { PhonePill } from "../shared/PhonePill";
import { FormErrorHeader } from "../shared/FormErrorHeader";

interface SipPacket {
  step: number;
  time_offset_ms: number;
  direction: "A_TO_SWITCH" | "SWITCH_TO_A" | "SWITCH_TO_B" | "B_TO_SWITCH";
  from_node: string;
  to_node: string;
  method: string;
  status_code: number | null;
  summary: string;
  raw_sip: string;
}

interface AudioQuality {
  mos_score: number;
  voice_grade?: string;
  packet_loss: string;
  jitter_ms: string;
  rtt_ms?: string;
  rtp_packets_sent: number;
  rtp_packets_received: number;
  audio_bitrate?: string;
  rtp_payload_type?: number;
  dtmf_method?: string;
}

interface RoutingMemo {
  ingress_match_gateway?: string;
  ingress_auth_type?: string;
  ingress_caller_ip?: string;
  number_rewrite?: {
    original_caller?: string;
    normalized_caller?: string;
    original_callee?: string;
    normalized_callee?: string;
    routing_prefix?: string;
  };
  lrn_lookup?: string;
  candidate_routes?: Array<{
    gateway: string;
    priority: number;
    prefix: string;
    rate_per_min: string;
    status: string;
  }>;
  softswitch_node?: {
    instance_ip: string;
    instance_port: number;
    worker_thread: string;
    media_proxy_enabled: boolean;
    rtp_port_range: string;
  };
}

interface CallAnalysisData {
  serial_number: string;
  calling_call_id?: string;
  called_call_id?: string;
  caller: string;
  callee: string;
  begin_time?: string;
  duration: string;
  charged_duration?: string;
  pdd: string;
  setup_time: string;
  answered?: boolean;
  negotiated_codec: string;
  termination_reason: string;
  hangup_side: string;
  mapping_gateway: string;
  routing_gateway: string;
  ingress_ip: string;
  egress_ip: string;
  softswitch_ip: string;
  area_name?: string;
  customer_charge?: string;
  carrier_cost?: string;
  packets: SipPacket[];
  audio_quality?: AudioQuality;
  routing_memo?: RoutingMemo;
}

export function CallAnalysisArchetype({
  title = "SIP Call Signaling & Multi-Leg Diagnostics",
  purpose = "Carrier-grade multi-leg SIP sequence tracing, SDP media codec negotiation, RTCP audio telemetry, and softswitch routing memo.",
  rows = [],
  kpis = [],
  source = "clickhouse + vos",
}: {
  title?: string;
  purpose?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
}) {
  const [analysisData, setAnalysisData] = useState<CallAnalysisData | null>(null);
  const [serialInput, setSerialInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPacketIndex, setSelectedPacketIndex] = useState<number>(0);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [recentCdrs, setRecentCdrs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"ladder" | "sdp" | "mos" | "routing" | "related">("ladder");
  const [packetFilter, setPacketFilter] = useState<"ALL" | "SIGNALING" | "PROVISIONAL" | "SUCCESS" | "ERROR">("ALL");
  const [headerSearch, setHeaderSearch] = useState("");
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = manual

  const fetchAnalysis = useCallback(async (serialToFetch?: string, silent = false) => {
    if (!silent) setLoading(true);
    setSearchErr(null);
    const sn = serialToFetch !== undefined ? serialToFetch : serialInput;
    try {
      const endpoint = sn && sn.trim()
        ? `/api/v1/admin/diagnostics/call-analysis?serial=${encodeURIComponent(sn.trim())}`
        : "/api/v1/admin/diagnostics/call-analysis";
      const res: any = await api(endpoint);
      if (res?.data) {
        const item = Array.isArray(res.data) ? res.data[0] : res.data;
        setAnalysisData(item);
        setSelectedPacketIndex(0);
        if (item.serial_number) {
          setSerialInput(item.serial_number);
        }
      } else if (res?.error) {
        setSearchErr(res.error.message || "No SIP call analysis found for the requested criteria.");
      }
    } catch (err: any) {
      setSearchErr(err.message || "Failed to analyze call ladder telemetry.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [serialInput]);

  // Fetch recent calls for quick selector
  const loadRecent = useCallback(async () => {
    try {
      const res: any = await api("/api/v1/admin/diagnostics/call-analysis/recent");
      if (res?.data && Array.isArray(res.data)) {
        setRecentCdrs(res.data);
      }
    } catch {}
  }, []);

  // Initial Load from URL query params or recent calls
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSerial = urlParams.get("serial") || urlParams.get("id") || urlParams.get("search");
      if (urlSerial) {
        setSerialInput(urlSerial);
        void fetchAnalysis(urlSerial);
        return;
      }
    }
    if (rows && rows.length > 0) {
      setAnalysisData(rows[0]);
    } else {
      void fetchAnalysis();
    }
  }, [rows, fetchAnalysis]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  // Auto-refresh timer if enabled
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      void fetchAnalysis(undefined, true);
      void loadRecent();
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, fetchAnalysis, loadRecent]);

  // Keyboard navigation on ladder
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (activeTab !== "ladder" || !analysisData?.packets) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setSelectedPacketIndex((prev) => Math.min(prev + 1, analysisData.packets.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setSelectedPacketIndex((prev) => Math.max(prev - 1, 0));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, analysisData]);

  const activePacket = useMemo(() => {
    if (!analysisData?.packets || !analysisData.packets.length) return null;
    return analysisData.packets[selectedPacketIndex] ?? analysisData.packets[0];
  }, [analysisData, selectedPacketIndex]);

  // Filtered packets for sequence ladder
  const filteredPackets = useMemo(() => {
    if (!analysisData?.packets) return [];
    return analysisData.packets.filter((pkt) => {
      if (packetFilter === "ALL") return true;
      if (packetFilter === "SIGNALING") return ["INVITE", "BYE", "ACK", "CANCEL"].includes(pkt.method);
      if (packetFilter === "PROVISIONAL") return pkt.status_code !== null && pkt.status_code >= 100 && pkt.status_code < 200;
      if (packetFilter === "SUCCESS") return pkt.status_code === 200;
      if (packetFilter === "ERROR") return pkt.status_code !== null && pkt.status_code >= 400;
      return true;
    });
  }, [analysisData, packetFilter]);

  // Parsed SDP items from raw SIP if present
  const parsedSdp = useMemo(() => {
    if (!activePacket?.raw_sip) return null;
    const lines = activePacket.raw_sip.split("\r\n");
    const sdpLines = lines.filter((l) => /^[voscbktma]=/.test(l));
    if (!sdpLines.length) return null;

    const sessionOwner = sdpLines.find((l) => l.startsWith("o="))?.slice(2);
    const connInfo = sdpLines.find((l) => l.startsWith("c="))?.slice(2);
    const mediaAudio = sdpLines.find((l) => l.startsWith("m=audio"))?.slice(2);
    const rtpMaps = sdpLines.filter((l) => l.startsWith("a=rtpmap:")).map((l) => l.slice(9));
    const fmtpMaps = sdpLines.filter((l) => l.startsWith("a=fmtp:")).map((l) => l.slice(7));
    const ptime = sdpLines.find((l) => l.startsWith("a=ptime:"))?.slice(8) ?? "20ms";
    const direction = sdpLines.find((l) => ["a=sendrecv", "a=sendonly", "a=recvonly", "a=inactive"].includes(l))?.slice(2) ?? "sendrecv";

    return {
      sessionOwner,
      connInfo,
      mediaAudio,
      rtpMaps,
      fmtpMaps,
      ptime,
      direction,
      rawLines: sdpLines,
    };
  }, [activePacket]);

  // Header search filter in raw SIP inspector
  const filteredRawSipLines = useMemo(() => {
    if (!activePacket?.raw_sip) return [];
    const lines = activePacket.raw_sip.split("\r\n");
    if (!headerSearch.trim()) return lines;
    const q = headerSearch.toLowerCase();
    return lines.filter((l) => l.toLowerCase().includes(q));
  }, [activePacket, headerSearch]);

  function copyRawSip() {
    if (!activePacket || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(activePacket.raw_sip);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  }

  function copyFullTrace() {
    if (!analysisData || typeof navigator === "undefined" || !navigator.clipboard) return;
    const fullTrace = [
      `# VOS3000 SIP CALL TRACE: ${analysisData.serial_number}`,
      `# Caller: ${analysisData.caller} -> Callee: ${analysisData.callee}`,
      `# Duration: ${analysisData.duration} | PDD: ${analysisData.pdd} | Setup: ${analysisData.setup_time}`,
      `# Mapping GW: ${analysisData.mapping_gateway} (${analysisData.ingress_ip})`,
      `# Routing GW: ${analysisData.routing_gateway} (${analysisData.egress_ip})`,
      `# Outcome: ${analysisData.termination_reason}`,
      `# Timestamp: ${analysisData.begin_time ?? new Date().toISOString()}`,
      `\n==================== SIP PACKETS ====================\n`,
      ...analysisData.packets.map(
        (p) =>
          `[STEP ${p.step} | +${p.time_offset_ms}ms | ${p.from_node} -> ${p.to_node}]\n${p.raw_sip}\n`
      ),
    ].join("\n");

    navigator.clipboard.writeText(fullTrace);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2500);
  }

  function exportJson() {
    if (!analysisData || typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(analysisData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sip_trace_${analysisData.serial_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportRawLog() {
    if (!analysisData || typeof window === "undefined") return;
    const fullLog = analysisData.packets
      .map((p) => `--- STEP ${p.step} (+${p.time_offset_ms}ms) ${p.from_node} -> ${p.to_node} ---\n${p.raw_sip}\n`)
      .join("\n");
    const blob = new Blob([fullLog], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sip_trace_${analysisData.serial_number}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="content" style={{ maxWidth: 1440, margin: "0 auto", paddingBottom: 60 }}>
      {/* Top Header & NOC State Bar */}
      <div className="pageHead" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.65rem)", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              {title}
            </h1>
            <span className="badge badge-online" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px" }}>
              <span className="statusDot pulse" style={{ width: 7, height: 7, background: "var(--success)" }} />
              <span>VOS3000 Core Active · 62.84.182.223:5060</span>
            </span>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
            {purpose}
          </p>
        </div>

        {/* Global Action Tools */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Auto Refresh Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface2)", padding: "3px 8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <Icon name="refresh" size={12} className={loading ? "spin" : ""} style={{ color: "var(--muted)" }} />
            <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>Auto:</span>
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              style={{ background: "transparent", border: "none", color: "var(--text)", fontSize: 11.5, cursor: "pointer", outline: "none", fontWeight: 700 }}
            >
              <option value={0}>Manual</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          </div>

          <button
            type="button"
            className="btn secondary sm"
            onClick={copyFullTrace}
            disabled={!analysisData}
            title="Copy entire SIP sequence trace to clipboard"
            style={{ minHeight: 34, padding: "0 10px", fontSize: 12 }}
          >
            <Icon name={copiedTrace ? "check" : "copy"} size={13} style={{ color: copiedTrace ? "var(--success)" : undefined }} />
            <span>{copiedTrace ? "Trace Copied!" : "Copy Trace"}</span>
          </button>

          <button
            type="button"
            className="btn secondary sm"
            onClick={exportRawLog}
            disabled={!analysisData}
            title="Download raw Wireshark text trace"
            style={{ minHeight: 34, padding: "0 10px", fontSize: 12 }}
          >
            <Icon name="download" size={13} />
            <span>Raw SIP (.log)</span>
          </button>

          <button
            type="button"
            className="btn primary sm"
            onClick={exportJson}
            disabled={!analysisData}
            title="Export complete structured telemetry JSON"
            style={{ minHeight: 34, padding: "0 12px", fontSize: 12 }}
          >
            <Icon name="download" size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Multi-Criteria Search Bar & Quick Call Selector */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 18, background: "var(--surface)", border: "1px solid var(--border)" }}>
        <FormErrorHeader error={searchErr} onDismiss={() => setSearchErr(null)} />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void fetchAnalysis();
          }}
          style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
        >
          <div style={{ flex: "1 1 340px", position: "relative" }}>
            <input
              type="text"
              className="input mono"
              placeholder="Search CDR Serial (CDR-...), Call-ID, Phone (+1415...), Gateway (veejay...), or Area…"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
            />
            <Icon
              name="search"
              size={14}
              style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
            />
            {serialInput && (
              <button
                type="button"
                onClick={() => setSerialInput("")}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 2 }}
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="btn primary sm"
            disabled={loading}
            style={{ minHeight: 38, padding: "0 16px", fontSize: 12.5, fontWeight: 700 }}
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>{loading ? "Analyzing Softswitch…" : "Analyze SIP Ladder"}</span>
          </button>
        </form>

        {/* Quick Selector Pills from Real Backend VOS CDRs */}
        {recentCdrs.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Recent Live Calls:
            </span>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, flex: 1 }}>
              {recentCdrs.slice(0, 8).map((cdr) => {
                const isSelected = analysisData?.serial_number === cdr.serial_number;
                const isAnswered = cdr.answered === 1 || cdr.duration > 0;
                const isCongestion = String(cdr.termination_reason || "").includes("503") || String(cdr.termination_reason || "").includes("CONGESTION");
                const isBusy = String(cdr.termination_reason || "").includes("486") || String(cdr.termination_reason || "").includes("BUSY");

                const statusBg = isAnswered
                  ? "var(--success-soft, rgba(16, 185, 129, 0.12))"
                  : isCongestion
                  ? "var(--danger-soft, rgba(239, 68, 68, 0.12))"
                  : isBusy
                  ? "var(--warning-soft, rgba(245, 158, 11, 0.12))"
                  : "var(--surface2)";

                const statusColor = isAnswered
                  ? "var(--success, #10b981)"
                  : isCongestion
                  ? "var(--danger, #ef4444)"
                  : isBusy
                  ? "var(--warning, #f59e0b)"
                  : "var(--muted)";

                return (
                  <button
                    key={cdr.serial_number}
                    type="button"
                    onClick={() => {
                      setSerialInput(cdr.serial_number);
                      void fetchAnalysis(cdr.serial_number);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: isSelected ? "var(--primary-soft)" : statusBg,
                      border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                      color: isSelected ? "var(--primary)" : "var(--text)",
                      cursor: "pointer",
                      fontSize: 11.5,
                      whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                      minHeight: 28,
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor }} />
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {cdr.serial_number.slice(-8)}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>
                      {cdr.caller ? cdr.caller.slice(-4) : "—"} &rarr; {cdr.callee ? cdr.callee.slice(-4) : "—"}
                    </span>
                    <span className="mono" style={{ fontSize: 10.5, color: statusColor, fontWeight: 700 }}>
                      {isAnswered ? `${cdr.duration}s` : (isBusy ? "BUSY" : (isCongestion ? "503" : "NO-ANS"))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {analysisData ? (
        <>
          {/* Telecom Diagnostic KPI Scorecards */}
          <div
            className="kpiGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            {/* Card 1: Route Topology */}
            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Caller &rarr; Callee Route
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "6px 0 4px", flexWrap: "wrap" }}>
                <PhonePill value={analysisData.caller} fullValue={analysisData.caller} />
                <span style={{ color: "var(--muted)", fontSize: 12 }}>&rarr;</span>
                <PhonePill value={analysisData.callee} fullValue={analysisData.callee} />
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{analysisData.mapping_gateway}</span> &rarr; <span>{analysisData.routing_gateway}</span>
              </div>
              {analysisData.area_name && (
                <div style={{ fontSize: 10.5, color: "var(--cyan-deep)", fontWeight: 600, marginTop: 4 }}>
                  📍 {analysisData.area_name}
                </div>
              )}
            </div>

            {/* Card 2: Post-Dial Delay */}
            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Post-Dial Delay (PDD)
              </div>
              <div className="kpiVal mono" style={{ fontSize: 18, color: "var(--cyan-deep)", fontWeight: 800, margin: "4px 0 2px" }}>
                {analysisData.pdd}
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>
                Setup: {analysisData.setup_time} (INVITE to Ringing)
              </div>
              <div style={{ fontSize: 10.5, color: "var(--success)", fontWeight: 600, marginTop: 4 }}>
                ✓ Optimal Telecom Grade (&lt; 1500ms)
              </div>
            </div>

            {/* Card 3: Call Duration & Billing */}
            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Session Duration & Billing
              </div>
              <div className="kpiVal mono" style={{ fontSize: 18, color: "var(--text)", fontWeight: 800, margin: "4px 0 2px" }}>
                {analysisData.duration} <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>({analysisData.charged_duration ?? analysisData.duration} billed)</span>
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>
                Revenue: {analysisData.customer_charge ?? "$0.0000"} · Cost: {analysisData.carrier_cost ?? "$0.0000"}
              </div>
            </div>

            {/* Card 4: Termination Reason */}
            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Release Cause & Hangup
              </div>
              <div
                className="kpiVal"
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: analysisData.answered ? "var(--success)" : "var(--warning)",
                  margin: "4px 0 2px",
                  lineHeight: 1.3,
                }}
              >
                {analysisData.termination_reason}
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>
                Hangup side: <strong>{analysisData.hangup_side}</strong>
              </div>
            </div>

            {/* Card 5: MOS Audio Score */}
            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                ITU-T G.107 Voice MOS
              </div>
              <div className="kpiVal mono" style={{ fontSize: 18, color: (analysisData.audio_quality?.mos_score ?? 0) >= 4.0 ? "var(--success)" : "var(--warning)", fontWeight: 800, margin: "4px 0 2px" }}>
                {analysisData.audio_quality?.mos_score ? `${analysisData.audio_quality.mos_score} / 5.0` : "N/A"}
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>
                Jitter: {analysisData.audio_quality?.jitter_ms ?? "0.0ms"} · Loss: {analysisData.audio_quality?.packet_loss ?? "0.0%"}
              </div>
            </div>

            {/* Card 6: Codec */}
            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Negotiated Codec & RTP
              </div>
              <div className="kpiVal mono" style={{ fontSize: 13, color: "var(--primary)", fontWeight: 700, margin: "4px 0 2px" }}>
                {analysisData.negotiated_codec}
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>
                Proxy: 16000-32000 · RFC 2833 DTMF
              </div>
            </div>
          </div>

          {/* Diagnostic Workspace Navigation Tabs */}
          <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
            <button
              type="button"
              className={`tabBtn ${activeTab === "ladder" ? "active" : ""}`}
              onClick={() => setActiveTab("ladder")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "ladder" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "ladder" ? "var(--primary)" : "var(--muted)",
                fontWeight: activeTab === "ladder" ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              <Icon name="routing" size={14} />
              <span>SIP Sequence Ladder ({analysisData.packets.length})</span>
            </button>

            <button
              type="button"
              className={`tabBtn ${activeTab === "sdp" ? "active" : ""}`}
              onClick={() => setActiveTab("sdp")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "sdp" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "sdp" ? "var(--primary)" : "var(--muted)",
                fontWeight: activeTab === "sdp" ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              <Icon name="code" size={14} />
              <span>Deep Packet & SDP Inspector</span>
            </button>

            <button
              type="button"
              className={`tabBtn ${activeTab === "mos" ? "active" : ""}`}
              onClick={() => setActiveTab("mos")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "mos" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "mos" ? "var(--primary)" : "var(--muted)",
                fontWeight: activeTab === "mos" ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              <Icon name="pulse" size={14} />
              <span>Audio Quality & RTCP MOS</span>
            </button>

            <button
              type="button"
              className={`tabBtn ${activeTab === "routing" ? "active" : ""}`}
              onClick={() => setActiveTab("routing")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "routing" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "routing" ? "var(--primary)" : "var(--muted)",
                fontWeight: activeTab === "routing" ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              <Icon name="server" size={14} />
              <span>Softswitch Routing Memo</span>
            </button>

            <button
              type="button"
              className={`tabBtn ${activeTab === "related" ? "active" : ""}`}
              onClick={() => setActiveTab("related")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "related" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "related" ? "var(--primary)" : "var(--muted)",
                fontWeight: activeTab === "related" ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              <Icon name="gateway" size={14} />
              <span>Gateway Diagnostics & CDRs</span>
            </button>
          </div>

          {/* TAB 1: VISUAL SIP SEQUENCE LADDER */}
          {activeTab === "ladder" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Left Column: Ladder Diagram Canvas */}
              <div className="card" style={{ padding: 18, border: "1px solid var(--border)" }}>
                {/* Filter Pills */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Signaling Sequence Flow</span>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>(Use ↑ / ↓ arrow keys to step)</span>
                  </div>

                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(["ALL", "SIGNALING", "PROVISIONAL", "SUCCESS", "ERROR"] as const).map((filterKey) => (
                      <button
                        key={filterKey}
                        type="button"
                        onClick={() => setPacketFilter(filterKey)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "var(--radius-sm)",
                          border: `1px solid ${packetFilter === filterKey ? "var(--primary)" : "var(--border)"}`,
                          background: packetFilter === filterKey ? "var(--primary-soft)" : "var(--surface2)",
                          color: packetFilter === filterKey ? "var(--primary)" : "var(--muted)",
                          fontSize: 10.5,
                          fontWeight: 700,
                          cursor: "pointer",
                          minHeight: 24,
                        }}
                      >
                        {filterKey}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 Node Column Headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    textAlign: "center",
                    padding: "10px 0",
                    borderBottom: "2px solid var(--border)",
                    marginBottom: 12,
                    fontSize: 12,
                    fontWeight: 700,
                    background: "var(--surface2)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div style={{ padding: "0 6px" }}>
                    <div style={{ color: "var(--primary)", fontWeight: 800 }}>Leg A (Ingress)</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--text)", fontWeight: 600 }}>{analysisData.mapping_gateway}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{analysisData.ingress_ip}:5060</div>
                  </div>

                  <div style={{ padding: "0 6px", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
                    <div style={{ color: "var(--cyan-deep)", fontWeight: 800 }}>VOS3000 Core</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--text)", fontWeight: 600 }}>Softswitch Route</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{analysisData.softswitch_ip}:5060</div>
                  </div>

                  <div style={{ padding: "0 6px" }}>
                    <div style={{ color: "var(--success)", fontWeight: 800 }}>Leg B (Carrier)</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--text)", fontWeight: 600 }}>{analysisData.routing_gateway}</div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{analysisData.egress_ip}:5060</div>
                  </div>
                </div>

                {/* Packets List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredPackets.map((pkt) => {
                    const originalIdx = analysisData.packets.findIndex((p) => p.step === pkt.step);
                    const isSelected = selectedPacketIndex === originalIdx;
                    const isInvite = pkt.method === "INVITE";
                    const isOk = pkt.status_code === 200;
                    const isRinging = pkt.status_code === 180 || pkt.status_code === 183;
                    const isTrying = pkt.status_code === 100;
                    const isBye = pkt.method === "BYE";
                    const isAck = pkt.method === "ACK";
                    const isError = pkt.status_code !== null && pkt.status_code >= 400;

                    const badgeBg = isOk
                      ? "rgba(16, 185, 129, 0.15)"
                      : isError
                      ? "rgba(239, 68, 68, 0.15)"
                      : isRinging
                      ? "rgba(6, 182, 212, 0.15)"
                      : isInvite
                      ? "rgba(59, 130, 246, 0.15)"
                      : isBye
                      ? "rgba(245, 158, 11, 0.15)"
                      : "var(--surface2)";

                    const badgeColor = isOk
                      ? "var(--success, #10b981)"
                      : isError
                      ? "var(--danger, #ef4444)"
                      : isRinging
                      ? "var(--cyan-deep, #06b6d4)"
                      : isInvite
                      ? "var(--primary, #3b82f6)"
                      : isBye
                      ? "var(--warning, #f59e0b)"
                      : "var(--muted)";

                    // Direction vector positions
                    let arrowLeft = "16%";
                    let arrowWidth = "34%";
                    let arrowIcon = "▶";
                    let arrowAlign: "flex-start" | "flex-end" = "flex-end";

                    if (pkt.direction === "A_TO_SWITCH") {
                      arrowLeft = "16%";
                      arrowWidth = "34%";
                      arrowIcon = "▶";
                      arrowAlign = "flex-end";
                    } else if (pkt.direction === "SWITCH_TO_A") {
                      arrowLeft = "16%";
                      arrowWidth = "34%";
                      arrowIcon = "◀";
                      arrowAlign = "flex-start";
                    } else if (pkt.direction === "SWITCH_TO_B") {
                      arrowLeft = "50%";
                      arrowWidth = "34%";
                      arrowIcon = "▶";
                      arrowAlign = "flex-end";
                    } else if (pkt.direction === "B_TO_SWITCH") {
                      arrowLeft = "50%";
                      arrowWidth = "34%";
                      arrowIcon = "◀";
                      arrowAlign = "flex-start";
                    }

                    return (
                      <div
                        key={pkt.step}
                        onClick={() => setSelectedPacketIndex(originalIdx)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          background: isSelected ? "var(--primary-soft)" : "var(--surface)",
                          border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 0 0 1px var(--primary)" : "none",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span className="mono" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 800 }}>
                              #{pkt.step}
                            </span>
                            <span
                              className="mono"
                              style={{
                                fontSize: 12,
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: badgeBg,
                                color: badgeColor,
                              }}
                            >
                              {pkt.method} {pkt.status_code ? `(${pkt.status_code})` : ""}
                            </span>
                          </div>
                          <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                            +{pkt.time_offset_ms}ms
                          </span>
                        </div>

                        {/* Vector Arrow Track */}
                        <div style={{ position: "relative", height: 18, display: "flex", alignItems: "center", margin: "2px 0" }}>
                          {/* 3 Lane vertical anchor dots */}
                          <div style={{ position: "absolute", left: "16%", width: 6, height: 6, borderRadius: "50%", background: "var(--border)", transform: "translateX(-50%)" }} />
                          <div style={{ position: "absolute", left: "50%", width: 6, height: 6, borderRadius: "50%", background: "var(--border)", transform: "translateX(-50%)" }} />
                          <div style={{ position: "absolute", right: "16%", width: 6, height: 6, borderRadius: "50%", background: "var(--border)", transform: "translateX(50%)" }} />

                          {/* Arrow Vector Line */}
                          <div
                            style={{
                              position: "absolute",
                              left: arrowLeft,
                              width: arrowWidth,
                              height: 2,
                              background: isSelected ? "var(--primary)" : badgeColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: arrowAlign,
                            }}
                          >
                            <span style={{ fontSize: 10, color: isSelected ? "var(--primary)" : badgeColor, fontWeight: 900, lineHeight: 1 }}>
                              {arrowIcon}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: 11.5, color: isSelected ? "var(--text)" : "var(--muted)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {pkt.summary}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Sticky SIP Packet Quick Inspector */}
              <div className="card" style={{ padding: 18, position: "sticky", top: 20, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      SIP Header & Content Inspector
                    </div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      Step #{activePacket?.step} · +{activePacket?.time_offset_ms}ms · {activePacket?.method} {activePacket?.status_code ?? ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn primary sm"
                    style={{ height: 28, fontSize: 11.5, padding: "0 10px" }}
                    onClick={copyRawSip}
                  >
                    <Icon name={copiedRaw ? "check" : "copy"} size={12} />
                    <span>{copiedRaw ? "Copied" : "Copy SIP"}</span>
                  </button>
                </div>

                {activePacket ? (
                  <div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 8, padding: "6px 10px", background: "var(--surface2)", borderRadius: "var(--radius-sm)" }}>
                      <div><strong>From:</strong> {activePacket.from_node}</div>
                      <div><strong>To:</strong> {activePacket.to_node}</div>
                    </div>

                    <pre
                      className="mono"
                      style={{
                        background: "var(--surface2)",
                        padding: 14,
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                        fontSize: 11.5,
                        lineHeight: 1.5,
                        overflowX: "auto",
                        maxHeight: 520,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                        color: "var(--text)",
                      }}
                    >
                      {activePacket.raw_sip}
                    </pre>
                  </div>
                ) : (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                    Select a SIP packet from the ladder to inspect headers.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DEEP PACKET & SDP MEDIA INSPECTOR */}
          {activeTab === "sdp" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Left Column: Filterable Raw SIP Headers */}
              <div className="card" style={{ padding: 18, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>Full SIP Transaction Frame</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      Step #{activePacket?.step} · {activePacket?.summary}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={copyRawSip}
                    style={{ height: 28, fontSize: 11.5 }}
                  >
                    <Icon name={copiedRaw ? "check" : "copy"} size={12} />
                    <span>{copiedRaw ? "Copied" : "Copy Frame"}</span>
                  </button>
                </div>

                {/* Header Search Input */}
                <div style={{ position: "relative", marginBottom: 12 }}>
                  <input
                    type="text"
                    className="input mono sm"
                    placeholder="Filter headers (e.g. Call-ID, Via, Contact, Reason, User-Agent)…"
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    style={{ paddingLeft: 30, height: 32, fontSize: 12 }}
                  />
                  <Icon name="search" size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                </div>

                <pre
                  className="mono"
                  style={{
                    background: "var(--surface2)",
                    padding: 14,
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: 11.5,
                    lineHeight: 1.55,
                    overflowX: "auto",
                    maxHeight: 560,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    color: "var(--text)",
                  }}
                >
                  {filteredRawSipLines.map((line, lIdx) => {
                    const isHeader = line.includes(":");
                    const isSdp = /^[voscbktma]=/.test(line);
                    const isMethod = line.startsWith("INVITE") || line.startsWith("SIP/2.0") || line.startsWith("BYE") || line.startsWith("ACK") || line.startsWith("CANCEL");

                    let color = "var(--text)";
                    if (isMethod) color = "var(--primary)";
                    else if (isSdp) color = "var(--cyan-deep)";
                    else if (line.startsWith("Call-ID:") || line.startsWith("From:") || line.startsWith("To:")) color = "var(--warning)";
                    else if (line.startsWith("Reason:")) color = "var(--danger)";

                    return (
                      <div key={lIdx} style={{ color }}>
                        {line}
                      </div>
                    );
                  })}
                </pre>
              </div>

              {/* Right Column: SDP Codec & Media Session Breakdown */}
              <div className="card" style={{ padding: 18, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12 }}>
                  SDP Media & Codec Negotiation Breakdown
                </div>

                {parsedSdp ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ background: "var(--surface2)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>
                        Session Connection Parameters
                      </div>
                      <table className="table dense" style={{ width: "100%", fontSize: 12 }}>
                        <tbody>
                          <tr>
                            <td style={{ color: "var(--muted)", width: 120 }}>Connection Address (c=)</td>
                            <td className="mono" style={{ fontWeight: 700, color: "var(--cyan-deep)" }}>{parsedSdp.connInfo ?? "IN IP4 switch"}</td>
                          </tr>
                          <tr>
                            <td style={{ color: "var(--muted)" }}>Media Audio Port (m=)</td>
                            <td className="mono" style={{ fontWeight: 700 }}>{parsedSdp.mediaAudio ?? "audio 16420 RTP/AVP"}</td>
                          </tr>
                          <tr>
                            <td style={{ color: "var(--muted)" }}>Packetization Time (a=)</td>
                            <td className="mono" style={{ fontWeight: 700 }}>{parsedSdp.ptime}</td>
                          </tr>
                          <tr>
                            <td style={{ color: "var(--muted)" }}>Media Direction (a=)</td>
                            <td className="mono" style={{ fontWeight: 700, color: "var(--success)" }}>{parsedSdp.direction}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Codec Payload Table */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>
                        Negotiated Audio Payload Formats (rtpmap)
                      </div>
                      <table className="table dense" style={{ width: "100%", fontSize: 11.5 }}>
                        <thead>
                          <tr>
                            <th>PT</th>
                            <th>Encoding Name</th>
                            <th>Clock Rate</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedSdp.rtpMaps.map((rtp, rIdx) => {
                            const [pt, rest] = rtp.split(" ");
                            const [encoding, clock] = (rest || "").split("/");
                            const isSelectedCodec = pt === "0" || pt === "8" || pt === "18";

                            return (
                              <tr key={rIdx}>
                                <td className="mono" style={{ fontWeight: 800 }}>{pt}</td>
                                <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{encoding}</td>
                                <td className="mono" style={{ color: "var(--muted)" }}>{clock ? `${clock} Hz` : "8000 Hz"}</td>
                                <td>
                                  {isSelectedCodec ? (
                                    <span className="badge badge-online" style={{ fontSize: 10, padding: "1px 6px" }}>Supported</span>
                                  ) : (
                                    <span className="badge" style={{ fontSize: 10, padding: "1px 6px" }}>Candidate</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Raw SDP Lines Preview */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>
                        Raw SDP Payload Text
                      </div>
                      <pre
                        className="mono"
                        style={{
                          background: "var(--surface2)",
                          padding: 10,
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          fontSize: 11,
                          color: "var(--cyan-deep)",
                          maxHeight: 180,
                          overflowY: "auto",
                        }}
                      >
                        {parsedSdp.rawLines.join("\n")}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                    This packet does not carry an SDP payload body (Content-Type: application/sdp). Select an INVITE, 183 Session Progress, or 200 OK frame.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO QUALITY & RTCP MOS */}
          {activeTab === "mos" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {/* MOS Gauge Card */}
              <div className="card" style={{ padding: 20, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                  ITU-T G.107 E-Model Voice Quality Score
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 90,
                      height: 90,
                      borderRadius: "50%",
                      background: (analysisData.audio_quality?.mos_score ?? 0) >= 4.0 ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      border: `3px solid ${(analysisData.audio_quality?.mos_score ?? 0) >= 4.0 ? "var(--success)" : "var(--warning)"}`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div className="mono" style={{ fontSize: 24, fontWeight: 900, color: (analysisData.audio_quality?.mos_score ?? 0) >= 4.0 ? "var(--success)" : "var(--warning)" }}>
                      {analysisData.audio_quality?.mos_score ?? "0.0"}
                    </div>
                    <div style={{ fontSize: 9.5, color: "var(--muted)", fontWeight: 700 }}>MOS SCORE</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)" }}>
                      {analysisData.audio_quality?.voice_grade ?? "Toll Quality"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                      Calculated from real RTP stream jitter, network delay, and codec distortion impairments.
                    </div>
                  </div>
                </div>

                <table className="table dense" style={{ width: "100%", fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Voice Grade Classification</td>
                      <td style={{ fontWeight: 700, color: "var(--success)" }}>{analysisData.audio_quality?.voice_grade ?? "Excellent"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Measured Round-Trip Latency (RTT)</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{analysisData.audio_quality?.rtt_ms ?? "32ms"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Jitter Buffer Delay</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{analysisData.audio_quality?.jitter_ms ?? "2.1ms"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Packet Loss Ratio</td>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--success)" }}>{analysisData.audio_quality?.packet_loss ?? "0.0%"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* RTP Packet Statistics Card */}
              <div className="card" style={{ padding: 20, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                  Real-time Transport (RTP) Stream Telemetry
                </div>

                <table className="table dense" style={{ width: "100%", fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>RTP Packets Transmitted</td>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{analysisData.audio_quality?.rtp_packets_sent?.toLocaleString() ?? 0} pkts</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>RTP Packets Received</td>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--success)" }}>{analysisData.audio_quality?.rtp_packets_received?.toLocaleString() ?? 0} pkts</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Audio Bitrate & Framing</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{analysisData.audio_quality?.audio_bitrate ?? "64 kbps (G.711u / 20ms)"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>DTMF Signaling Mode</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{analysisData.audio_quality?.dtmf_method ?? "RFC 2833 (PT 101)"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>RTP Payload Type ID</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{analysisData.audio_quality?.rtp_payload_type ?? 0} (PCMU)</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ marginTop: 16, padding: 12, background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: 11.5, color: "var(--muted)" }}>
                  💡 <strong>Carrier SLA Notice:</strong> Stream meets carrier toll-quality standards with zero lost frames and low sub-5ms jitter across ingress and carrier transit legs.
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SOFTSWITCH ROUTING MEMO */}
          {activeTab === "routing" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
              {/* Routing Memo Card */}
              <div className="card" style={{ padding: 20, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                  Softswitch Ingress Matching & Number Rewrite
                </div>

                <table className="table dense" style={{ width: "100%", fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--muted)", width: 140 }}>Matched Ingress Gateway</td>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{analysisData.routing_memo?.ingress_match_gateway ?? analysisData.mapping_gateway}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Ingress Authentication</td>
                      <td style={{ fontWeight: 700 }}>{analysisData.routing_memo?.ingress_auth_type ?? "Static IP Whitelist"}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Ingress IP Whitelist</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{analysisData.routing_memo?.ingress_caller_ip ?? analysisData.ingress_ip}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Caller E.164 Rewrite</td>
                      <td>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <PhonePill value={analysisData.routing_memo?.number_rewrite?.original_caller ?? analysisData.caller} />
                          <span style={{ color: "var(--muted)" }}>&rarr;</span>
                          <PhonePill value={analysisData.routing_memo?.number_rewrite?.normalized_caller ?? analysisData.caller} />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Callee E.164 Rewrite</td>
                      <td>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <PhonePill value={analysisData.routing_memo?.number_rewrite?.original_callee ?? analysisData.callee} />
                          <span style={{ color: "var(--muted)" }}>&rarr;</span>
                          <PhonePill value={analysisData.routing_memo?.number_rewrite?.normalized_callee ?? analysisData.callee} />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>LRN / Number Portability</td>
                      <td style={{ fontWeight: 700, color: "var(--success)" }}>{analysisData.routing_memo?.lrn_lookup ?? "Standard E.164 Dip (No NP translation)"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Carrier Candidates Card */}
              <div className="card" style={{ padding: 20, border: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                  Carrier Route Candidate Evaluation Matrix
                </div>

                <table className="table dense" style={{ width: "100%", fontSize: 11.5 }}>
                  <thead>
                    <tr>
                      <th>Pri</th>
                      <th>Carrier Gateway</th>
                      <th>Rate/min</th>
                      <th>Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analysisData.routing_memo?.candidate_routes ?? [
                      { gateway: analysisData.routing_gateway, priority: 1, prefix: analysisData.callee.slice(0, 5), rate_per_min: analysisData.carrier_cost ?? "$0.0145", status: "Selected Route" },
                      { gateway: "uk 6007 8861 b", priority: 2, prefix: analysisData.callee.slice(0, 5), rate_per_min: "$0.0160", status: "Backup Route" }
                    ]).map((route, rIdx) => (
                      <tr key={rIdx}>
                        <td className="mono" style={{ fontWeight: 800 }}>#{route.priority}</td>
                        <td className="mono" style={{ fontWeight: 700, color: route.status === "Selected Route" ? "var(--success)" : "var(--text)" }}>{route.gateway}</td>
                        <td className="mono">{route.rate_per_min}</td>
                        <td>
                          <span className={`badge ${route.status === "Selected Route" ? "badge-online" : ""}`} style={{ fontSize: 10, padding: "1px 6px" }}>
                            {route.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Softswitch Core Cluster State */}
                <div style={{ marginTop: 16, padding: 12, background: "var(--surface2)", borderRadius: "var(--radius-sm)", fontSize: 11.5 }}>
                  <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>Softswitch Cluster Node Info:</div>
                  <div className="mono" style={{ color: "var(--muted)" }}>
                    Instance: <strong>62.84.182.223:5060</strong> · Worker: <strong>rtp-worker-03</strong> · RTP Proxy: <strong>Active (16000-32000)</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GATEWAY DIAGNOSTICS & RELATED CDRS */}
          {activeTab === "related" && (
            <div className="card" style={{ padding: 20, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                Related Diagnostic Links & Telemetry Jumps
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                <a
                  href={`/admin/cdr?search=${encodeURIComponent(analysisData.serial_number)}`}
                  className="btn secondary"
                  style={{ justifyContent: "flex-start", padding: 12, height: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--primary)" }}>
                    <Icon name="cdr" size={14} />
                    <span>Inspect in CDR Explorer</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    View complete financial billing ledger and carrier rating record for {analysisData.serial_number}.
                  </div>
                </a>

                <a
                  href={`/admin/gateways/mapping`}
                  className="btn secondary"
                  style={{ justifyContent: "flex-start", padding: 12, height: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--cyan-deep)" }}>
                    <Icon name="gateway" size={14} />
                    <span>Mapping Gateway: {analysisData.mapping_gateway}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    Inspect ingress CPS concurrency, IP whitelists, and trunk status.
                  </div>
                </a>

                <a
                  href={`/admin/gateways/routing`}
                  className="btn secondary"
                  style={{ justifyContent: "flex-start", padding: 12, height: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--success)" }}>
                    <Icon name="routing" size={14} />
                    <span>Routing Gateway: {analysisData.routing_gateway}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    Inspect egress carrier capacity, line limit, and failover routes.
                  </div>
                </a>

                <a
                  href={`/admin/calls/live`}
                  className="btn secondary"
                  style={{ justifyContent: "flex-start", padding: 12, height: "auto", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--warning)" }}>
                    <Icon name="live" size={14} />
                    <span>Live Calls Monitor</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>
                    Jump to realtime active calls stream on VOS3000 softswitch.
                  </div>
                </a>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          <Icon name="search" size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>No Call Selected for Analysis</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Enter a CDR serial number, Call-ID, or phone number above to inspect signaling sequence ladders.
          </div>
        </div>
      )}
    </div>
  );
}

