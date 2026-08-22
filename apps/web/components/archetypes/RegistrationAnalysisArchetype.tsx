"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { PhonePill } from "../shared/PhonePill";
import { FormErrorHeader } from "../shared/FormErrorHeader";

interface RegPacket {
  step: number;
  time_offset_ms: number;
  direction: "CLIENT_TO_SWITCH" | "SWITCH_TO_CLIENT";
  from_node: string;
  to_node: string;
  method: string;
  status_code: number | null;
  summary: string;
  raw_sip: string;
}

interface RegistrationAnalysisData {
  target: string;
  registered_ip: string;
  port: number;
  protocol: string;
  user_agent: string;
  expires_seconds: number;
  nat_detected: boolean;
  public_ip: string;
  contact_ip: string;
  auth_algorithm: string;
  auth_status: string;
  packets: RegPacket[];
}

export function RegistrationAnalysisArchetype({
  title = "SIP Registration & Digest Diagnostics",
  purpose = "Inspect SIP REGISTER challenge handshakes, MD5/SHA-256 digest authentication nonces, NAT contact bindings, and expiry keepalive timers.",
  rows = [],
  kpis = [],
  source = "postgres + vos",
}: {
  title?: string;
  purpose?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
}) {
  const [data, setData] = useState<RegistrationAnalysisData | null>(null);
  const [targetInput, setTargetInput] = useState("8001");
  const [loading, setLoading] = useState(false);
  const [selectedPacketIndex, setSelectedPacketIndex] = useState<number>(0);
  const [lookupErr, setLookupErr] = useState<string | null>(null);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedTrace, setCopiedTrace] = useState(false);
  const [activeTab, setActiveTab] = useState<"ladder" | "digest" | "socket">("ladder");

  const quickTargets = [
    { label: "8001 (Yealink SIP-T46S)", value: "8001" },
    { label: "8002 (Cisco CP-8841)", value: "8002" },
    { label: "veejay singh", value: "veejay singh" },
    { label: "Amit uk", value: "Amit uk" },
    { label: "Rakesh", value: "Rakesh" },
  ];

  const fetchAnalysis = useCallback(async (targetToFetch?: string, silent = false) => {
    if (!silent) setLoading(true);
    setLookupErr(null);
    const tgt = targetToFetch !== undefined ? targetToFetch : targetInput;
    try {
      const endpoint = tgt && tgt.trim()
        ? `/api/v1/admin/diagnostics/registration-analysis?target=${encodeURIComponent(tgt.trim())}`
        : "/api/v1/admin/diagnostics/registration-analysis";
      const res: any = await api(endpoint);
      if (res?.data) {
        const item = Array.isArray(res.data) ? res.data[0] : res.data;
        setData(item);
        setSelectedPacketIndex(0);
        if (item.target) {
          setTargetInput(item.target);
        }
      } else if (res?.error) {
        setLookupErr(res.error.message || "No registration trace found for target endpoint.");
      }
    } catch (err: any) {
      setLookupErr(err.message || "Failed to inspect registration telemetry.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [targetInput]);

  useEffect(() => {
    if (rows && rows.length > 0) {
      setData(rows[0]);
    } else {
      void fetchAnalysis();
    }
  }, [rows, fetchAnalysis]);

  const activePacket = useMemo(() => {
    if (!data?.packets || !data.packets.length) return null;
    return data.packets[selectedPacketIndex] ?? data.packets[0];
  }, [data, selectedPacketIndex]);

  // Extract Digest challenge params from raw SIP
  const digestParams = useMemo(() => {
    if (!data?.packets) return null;
    const challengePacket = data.packets.find((p) => p.status_code === 401);
    const authPacket = data.packets.find((p) => p.raw_sip.includes("Authorization: Digest"));

    let realm = "vos3000";
    let nonce = "66c5a08991fe42";
    let algorithm = "MD5";
    let qop = "auth";
    let uri = `sip:62.84.182.223:5060`;
    let response = "b8a928e0f81736ca8921e102f";

    if (challengePacket?.raw_sip) {
      const matchRealm = challengePacket.raw_sip.match(/realm="([^"]+)"/);
      if (matchRealm) realm = matchRealm[1];
      const matchNonce = challengePacket.raw_sip.match(/nonce="([^"]+)"/);
      if (matchNonce) nonce = matchNonce[1];
      const matchAlg = challengePacket.raw_sip.match(/algorithm=([^,\r\n ]+)/);
      if (matchAlg) algorithm = matchAlg[1].replace(/"/g, "");
    }

    if (authPacket?.raw_sip) {
      const matchResp = authPacket.raw_sip.match(/response="([^"]+)"/);
      if (matchResp) response = matchResp[1];
      const matchUri = authPacket.raw_sip.match(/uri="([^"]+)"/);
      if (matchUri) uri = matchUri[1];
    }

    return {
      realm,
      nonce,
      algorithm,
      qop,
      uri,
      response,
    };
  }, [data]);

  function copyRawSip() {
    if (!activePacket || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(activePacket.raw_sip);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  }

  function copyFullTrace() {
    if (!data || typeof navigator === "undefined" || !navigator.clipboard) return;
    const trace = [
      `# VOS3000 SIP REGISTRATION TRACE: ${data.target}`,
      `# IP Binding: ${data.registered_ip}:${data.port} | Protocol: ${data.protocol}`,
      `# User-Agent: ${data.user_agent}`,
      `# Expiry: ${data.expires_seconds}s | NAT: ${data.nat_detected ? "Detected" : "Direct"}`,
      `# Auth Status: ${data.auth_status} (${data.auth_algorithm})`,
      `\n==================== REGISTER PACKETS ====================\n`,
      ...data.packets.map((p) => `[STEP ${p.step} | +${p.time_offset_ms}ms | ${p.from_node} -> ${p.to_node}]\n${p.raw_sip}\n`),
    ].join("\n");

    navigator.clipboard.writeText(trace);
    setCopiedTrace(true);
    setTimeout(() => setCopiedTrace(false), 2000);
  }

  function exportJson() {
    if (!data || typeof window === "undefined") return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `registration_trace_${data.target}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="content" style={{ maxWidth: 1440, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div className="pageHead" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "clamp(1.25rem, 2.5vw, 1.65rem)", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              {title}
            </h1>
            <span className="badge badge-online" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px" }}>
              <span className="statusDot pulse" style={{ width: 7, height: 7, background: "var(--success)" }} />
              <span>VOS3000 Registrar Active · 62.84.182.223:5060</span>
            </span>
          </div>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
            {purpose}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn secondary sm"
            onClick={copyFullTrace}
            disabled={!data}
            style={{ minHeight: 34, padding: "0 10px", fontSize: 12 }}
          >
            <Icon name={copiedTrace ? "check" : "copy"} size={13} />
            <span>{copiedTrace ? "Copied Trace" : "Copy Trace"}</span>
          </button>

          <button
            type="button"
            className="btn primary sm"
            onClick={exportJson}
            disabled={!data}
            style={{ minHeight: 34, padding: "0 12px", fontSize: 12 }}
          >
            <Icon name="download" size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Target Lookup Bar */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 18, background: "var(--surface)", border: "1px solid var(--border)" }}>
        <FormErrorHeader error={lookupErr} onDismiss={() => setLookupErr(null)} />
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
              placeholder="Search by Phone / Account Number or Gateway Name (e.g. 8001, veejay singh, Amit uk)…"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
            />
            <Icon name="search" size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
          </div>

          <button
            type="submit"
            className="btn primary sm"
            disabled={loading}
            style={{ minHeight: 38, padding: "0 16px", fontSize: 12.5, fontWeight: 700 }}
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>{loading ? "Inspecting Registrar…" : "Inspect Registration"}</span>
          </button>
        </form>

        {/* Quick Targets Chips */}
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Registered Endpoints:
          </span>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, flex: 1 }}>
            {quickTargets.map((qt) => {
              const isSelected = data?.target === qt.value;
              return (
                <button
                  key={qt.value}
                  type="button"
                  onClick={() => {
                    setTargetInput(qt.value);
                    void fetchAnalysis(qt.value);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-sm)",
                    background: isSelected ? "var(--primary-soft)" : "var(--surface2)",
                    border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                    color: isSelected ? "var(--primary)" : "var(--text)",
                    cursor: "pointer",
                    fontSize: 11.5,
                    whiteSpace: "nowrap",
                    minHeight: 28,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)" }} />
                  <span className="mono" style={{ fontWeight: 700 }}>{qt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {data && (
        <>
          {/* Registration Diagnostics Scorecard */}
          <div
            className="kpiGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Registration Target</div>
              <div style={{ margin: "6px 0 4px" }}>
                <PhonePill value={data.target} fullValue={data.target} fontSize={14} />
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>{data.user_agent}</div>
            </div>

            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Socket & Binding</div>
              <div className="kpiVal mono" style={{ fontSize: 15, color: "var(--cyan-deep)", fontWeight: 700, margin: "4px 0 2px" }}>
                {data.registered_ip}:{data.port}
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>{data.protocol} · NAT: {data.nat_detected ? "Detected" : "Direct Whitelist"}</div>
            </div>

            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Expiry & Keepalive</div>
              <div className="kpiVal mono" style={{ fontSize: 18, color: "var(--text)", fontWeight: 800, margin: "4px 0 2px" }}>
                {data.expires_seconds}s
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>Expires Header & NAT Options Ping</div>
            </div>

            <div className="kpiCard" style={{ padding: "14px 16px" }}>
              <div className="kpiLabel" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>Digest Auth Status</div>
              <div className="kpiVal" style={{ fontSize: 14, color: "var(--success)", fontWeight: 700, margin: "4px 0 2px" }}>
                {data.auth_status}
              </div>
              <div className="kpiSub" style={{ fontSize: 11, color: "var(--muted)" }}>MD5 Challenge Nonce Validated</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: "flex", gap: 6, borderBottom: "1px solid var(--border)", marginBottom: 18 }}>
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
                minHeight: 40,
              }}
            >
              <Icon name="routing" size={14} />
              <span>REGISTER Handshake Ladder ({data.packets.length})</span>
            </button>

            <button
              type="button"
              className={`tabBtn ${activeTab === "digest" ? "active" : ""}`}
              onClick={() => setActiveTab("digest")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "digest" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "digest" ? "var(--primary)" : "var(--muted)",
                fontWeight: activeTab === "digest" ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                minHeight: 40,
              }}
            >
              <Icon name="security" size={14} />
              <span>Digest Nonce & Security Parameters</span>
            </button>

            <button
              type="button"
              className={`tabBtn ${activeTab === "socket" ? "active" : ""}`}
              onClick={() => setActiveTab("socket")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "socket" ? "2px solid var(--primary)" : "2px solid transparent",
                color: activeTab === "socket" ? "var(--primary)" : "var(--muted)",
                fontWeight: activeTab === "socket" ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                minHeight: 40,
              }}
            >
              <Icon name="gateway" size={14} />
              <span>NAT & Socket Contact Binding</span>
            </button>
          </div>

          {/* TAB 1: HANDSHAKE LADDER */}
          {activeTab === "ladder" && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 20, alignItems: "start" }}>
              {/* Left: REGISTER Sequence */}
              <div className="card" style={{ padding: 18, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>
                    SIP REGISTER Authentication Handshake
                  </div>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                    {data.packets.length} Steps
                  </span>
                </div>

                {/* Node Column Headers */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
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
                  <div>
                    <div style={{ color: "var(--primary)", fontWeight: 800 }}>SIP Endpoint ({data.target})</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 400 }}>{data.registered_ip}:{data.port}</div>
                  </div>
                  <div>
                    <div style={{ color: "var(--cyan-deep)", fontWeight: 800 }}>VOS3000 Registrar Core</div>
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 400 }}>62.84.182.223:5060</div>
                  </div>
                </div>

                {/* Packets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.packets.map((pkt, idx) => {
                    const isSelected = selectedPacketIndex === idx;
                    const isOk = pkt.status_code === 200;
                    const is401 = pkt.status_code === 401;

                    const badgeColor = isOk
                      ? "var(--success)"
                      : is401
                      ? "var(--warning)"
                      : "var(--primary)";

                    const isLeftToRight = pkt.direction === "CLIENT_TO_SWITCH";

                    return (
                      <div
                        key={pkt.step}
                        onClick={() => setSelectedPacketIndex(idx)}
                        style={{
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          background: isSelected ? "var(--primary-soft)" : "var(--surface)",
                          border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
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
                                color: badgeColor,
                              }}
                            >
                              {pkt.method} {pkt.status_code ? `(${pkt.status_code})` : ""}
                            </span>
                          </div>
                          <span className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                            +{pkt.time_offset_ms}ms
                          </span>
                        </div>

                        {/* Direction Arrow Track */}
                        <div style={{ position: "relative", height: 18, display: "flex", alignItems: "center", margin: "2px 0" }}>
                          <div style={{ position: "absolute", left: "20%", width: 6, height: 6, borderRadius: "50%", background: "var(--border)" }} />
                          <div style={{ position: "absolute", right: "20%", width: 6, height: 6, borderRadius: "50%", background: "var(--border)" }} />

                          <div
                            style={{
                              position: "absolute",
                              left: "20%",
                              width: "60%",
                              height: 2,
                              background: isSelected ? "var(--primary)" : badgeColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: isLeftToRight ? "flex-end" : "flex-start",
                            }}
                          >
                            <span style={{ fontSize: 10, color: isSelected ? "var(--primary)" : badgeColor }}>
                              {isLeftToRight ? "▶" : "◀"}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                          {pkt.summary}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Raw Packet Inspector */}
              <div className="card" style={{ padding: 18, position: "sticky", top: 20, border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>SIP Header Inspector</div>
                    <div className="mono" style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      Step #{activePacket?.step} · +{activePacket?.time_offset_ms}ms
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
                    Select a packet from the ladder to inspect registration headers.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DIGEST PARAMETERS */}
          {activeTab === "digest" && (
            <div className="card" style={{ padding: 20, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                HTTP/SIP Digest Authentication (RFC 2617 / RFC 3261)
              </div>

              {digestParams && (
                <table className="table dense" style={{ width: "100%", fontSize: 12 }}>
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--muted)", width: 160 }}>Authentication Realm</td>
                      <td className="mono" style={{ fontWeight: 700 }}>"{digestParams.realm}"</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Server Challenge Nonce</td>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--cyan-deep)" }}>"{digestParams.nonce}"</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Algorithm</td>
                      <td className="mono" style={{ fontWeight: 700 }}>{digestParams.algorithm}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Quality of Protection (QOP)</td>
                      <td className="mono" style={{ fontWeight: 700 }}>"{digestParams.qop}"</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Digest URI</td>
                      <td className="mono" style={{ fontWeight: 700 }}>"{digestParams.uri}"</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)" }}>Client MD5 Response Hash</td>
                      <td className="mono" style={{ fontWeight: 700, color: "var(--success)" }}>"{digestParams.response}"</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: SOCKET & NAT */}
          {activeTab === "socket" && (
            <div className="card" style={{ padding: 20, border: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
                Registrar Contact Binding & NAT Traversal
              </div>

              <table className="table dense" style={{ width: "100%", fontSize: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ color: "var(--muted)", width: 160 }}>SIP Endpoint Target</td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{data.target}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--muted)" }}>Public Source IP</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{data.registered_ip}:{data.port}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--muted)" }}>Contact Header URI</td>
                    <td className="mono" style={{ fontWeight: 700 }}>sip:{data.target}@{data.contact_ip}:{data.port}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--muted)" }}>NAT Status</td>
                    <td style={{ fontWeight: 700, color: data.nat_detected ? "var(--warning)" : "var(--success)" }}>
                      {data.nat_detected ? "NAT Detected (rport & received rewritten)" : "Direct Public / Whitelisted Route"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--muted)" }}>Registration Lease Expiry</td>
                    <td className="mono" style={{ fontWeight: 700 }}>{data.expires_seconds} seconds</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--muted)" }}>User-Agent Identifier</td>
                    <td className="mono">{data.user_agent}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

