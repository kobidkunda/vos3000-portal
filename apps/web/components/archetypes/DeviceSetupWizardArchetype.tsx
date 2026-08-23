"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import { Icon } from "../../lib/icons";
import { getDevice, DEVICES } from "../../lib/devicesRegistry";
import type { SipProvisioningDTO, VerifyResponseDTO } from "@vos/shared";

const STEPS = [
  { id: 1, label: "Choose Device", helper: "Pick your dialer or phone" },
  { id: 2, label: "SIP Account", helper: "Copy credentials & provisioning" },
  { id: 3, label: "Network & Codecs", helper: "Transport, STUN, codecs" },
  { id: 4, label: "Test & Verify", helper: "Check registration & troubleshoot" },
] as const;

function usePersisted(key: string, fallback: Record<string, unknown>) {
  const [val, setVal] = useState<Record<string, unknown>>(fallback);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setVal(JSON.parse(raw));
    } catch { /* corrupted -> ignore */ }
  }, [key]);
  const save = useCallback((next: Record<string, unknown>) => {
    setVal(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key]);
  return [val, save] as const;
}

export function DeviceSetupWizardArchetype({ side = "Client" as "Admin" | "Client", deviceKeyProp }: { side?: "Admin" | "Client"; deviceKeyProp?: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const urlDeviceKey = searchParams.get("deviceKey") ?? deviceKeyProp ?? pathname.split("/").pop() ?? "";
  const gatewayId = searchParams.get("gatewayId") ?? "";
  const stepParam = Number(searchParams.get("step") ?? "1");
  const [activeStep, setActiveStep] = useState<number>(stepParam >= 1 && stepParam <= 4 ? stepParam : 1);
  const device = getDevice(urlDeviceKey);
  const base = side === "Admin" ? "/admin" : "/app";
  const hubHref = `${base}/devices/setup`;

  const storageKey = `device-setup-wizard:${urlDeviceKey || "unknown"}`;
  const [persisted, savePersisted] = usePersisted(storageKey, {});

  // SIP provisioning state
  const [creds, setCreds] = useState<SipProvisioningDTO | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [credsLoading, setCredsLoading] = useState(false);
  const [credsErr, setCredsErr] = useState("");
  const [copiedField, setCopiedField] = useState<string>("");
  const [qrOpen, setQrOpen] = useState(false);

  // Verify state
  const [verifyState, setVerifyState] = useState<VerifyResponseDTO | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState("");

  // Network step local state (informational)
  const [transport, setTransport] = useState<"udp" | "tcp" | "tls">("udp");
  const [stun, setStun] = useState(false);
  const [keepAlive, setKeepAlive] = useState("30");
  const [codecs, setCodecs] = useState<Record<string, boolean>>({ G711u: true, G711a: true, G722: true, G729: false });

  const gatewayMissing = !gatewayId;

  const loadCreds = useCallback(async (doReveal: boolean) => {
    if (!device || !gatewayId) return;
    setCredsLoading(true);
    setCredsErr("");
    try {
      const qs = new URLSearchParams({ deviceKey: device.key, gatewayId });
      if (doReveal) qs.set("reveal", "1");
      const ep = side === "Admin" ? `/api/v1/admin/devices/setup/instructions?${qs.toString()}` : `/api/v1/devices/setup/instructions?${qs.toString()}`;
      const res = (await api(ep)) as { data?: SipProvisioningDTO };
      setCreds(res.data ?? null);
      setRevealed(doReveal);
      if (doReveal) savePersisted({ ...persisted, gatewayId, step: activeStep, completed: activeStep > 2 });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setCredsErr(msg);
    } finally {
      setCredsLoading(false);
    }
  }, [device, gatewayId, side, persisted, activeStep, savePersisted]);

  useEffect(() => {
    if (activeStep === 2 && device && gatewayId && !creds && !credsLoading) {
      void loadCreds(false);
    }
  }, [activeStep, device, gatewayId, creds, credsLoading, loadCreds]);



  const goStep = useCallback((n: number) => {
    setActiveStep(n);
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.set("step", String(n));
      window.history.replaceState(null, "", `${window.location.pathname}?${sp.toString()}`);
    } catch { /* SSR guard */ }
    savePersisted({ gatewayId, step: n });
  }, [gatewayId, savePersisted]);

  const copyField = useCallback(async (field: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 1500);
      // audit fire-and-forget
      if (gatewayId && device) {
        void api(side === "Admin" ? "/api/v1/admin/devices/setup/copy-event" : "/api/v1/devices/setup/copy-event", { method: "POST", body: JSON.stringify({ gatewayId, deviceKey: device.key, field }) }).catch(() => {});
      }
    } catch {}
  }, [gatewayId, device, side]);

  const handleReveal = useCallback(async () => {
    await loadCreds(true);
  }, [loadCreds]);

  const handleVerify = useCallback(async () => {
    if (!gatewayId || !device) return;
    setVerifying(true);
    setVerifyErr("");
    try {
      const ep = side === "Admin" ? "/api/v1/admin/devices/setup/verify" : "/api/v1/devices/setup/verify";
      const res = (await api<{ data?: VerifyResponseDTO }>(ep, { method: "POST", body: JSON.stringify({ gatewayId, deviceKey: device.key }) }));
      setVerifyState(res.data ?? null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setVerifyErr(msg);
      setVerifyState({ registered: false, lastSeenIso: new Date(Date.now() - 120000).toISOString(), degraded: true });
    } finally {
      setVerifying(false);
    }
  }, [gatewayId, device, side]);

  const downloadCfg = useCallback(() => {
    if (!creds || !device || !gatewayId) return;
    const content = creds.cfgSnippet ?? `account.1.sip_server_host = ${creds.sipServer}\naccount.1.sip_server_port = ${creds.port}\naccount.1.transport = ${creds.transport}\naccount.1.sip_user_id = ${creds.username}\n# password masked: ${creds.passwordMasked}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vos3000-${device.key}-${gatewayId.slice(0, 8)}.cfg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [creds, device, gatewayId]);

  if (!device) {
    return (
      <div className="content">
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", borderRadius: 12, border: "1px solid #E2E8F0", maxWidth: 560, margin: "24px auto" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#F8FAFC", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icon name="alert" size={20} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Device not found</h2>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>We could not find "{urlDeviceKey}". Choose a supported device below.</p>
          <Link href={hubHref} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Back to Device Setup Hub</Link>
          <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {DEVICES.slice(0, 6).map((d) => (
              <Link key={d.key} href={`${base}/devices/setup/${encodeURIComponent(d.key)}?gatewayId=${encodeURIComponent(gatewayId)}`} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 999, border: "1px solid #E2E8F0", background: "#FFFFFF", textDecoration: "none", color: "#334155" }}>{d.label}</Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", fontSize: 13, color: "#64748B" }}>
        <Link href={hubHref} style={{ color: "#2563EB", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="chevronLeft" size={14} /> Device Setup Hub</Link>
        <span>·</span>
        <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 12 }}>{device.key}</span>
        {gatewayMissing && <span style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A", borderRadius: 999, padding: "2px 8px", fontSize: 11 }}>Gateway required — pick one in hub</span>}
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Stepper vertical desktop */}
        <div style={{ flex: "0 0 248px", minWidth: 220 }} className="wizardStepper">
          <div className="card" style={{ padding: 12, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
            {STEPS.map((s) => {
              const isActive = activeStep === s.id;
              const isDone = activeStep > s.id;
              return (
                <button key={s.id} type="button" onClick={() => goStep(s.id)} style={{ width: "100%", display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 8, border: isActive ? "1px solid #2563EB" : "1px solid transparent", background: isActive ? "#EFF6FF" : isDone ? "#F0FDF4" : "transparent", textAlign: "left", cursor: "pointer" }}>
                  <span style={{ width: 28, height: 28, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: isDone ? "#16A34A" : isActive ? "#2563EB" : "#F1F5F9", color: isDone || isActive ? "#FFFFFF" : "#64748B", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{isDone ? "✓" : s.id}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? "#1E40AF" : "#0F172A" }}>{s.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: "#64748B" }}>{s.helper}</span>
                  </span>
                </button>
              );
            })}
            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 12, color: "#475569" }}>
              <div style={{ fontWeight: 600, color: "#0F172A", marginBottom: 4, display: "flex", gap: 6, alignItems: "center" }}><Icon name="phone" size={12} /> {device.label}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {device.capabilities.qr && <span style={{ fontSize: 10, fontWeight: 600, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 999, padding: "2px 6px" }}>QR</span>}
                {device.capabilities.cfg && <span style={{ fontSize: 10, fontWeight: 600, background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0", borderRadius: 999, padding: "2px 6px" }}>CFG</span>}
                {device.capabilities.webrtc && <span style={{ fontSize: 10, fontWeight: 600, background: "#ECFEFF", color: "#0E7490", border: "1px solid #A5F3FC", borderRadius: 999, padding: "2px 6px" }}>WebRTC</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: "1 1 420px", maxWidth: 720, minWidth: 0 }}>

          {activeStep === 1 && (
            <div className="card" style={{ padding: 20, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 6 }}>{device.label}</h2>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 14 }}>{device.category} · {device.effortMinutes === 0 ? "Instant" : `${device.effortMinutes} min`} setup · {device.prerequisites?.join(" · ")}</p>
              <div style={{ padding: 12, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", marginBottom: 14, fontSize: 13, color: "#334155" }}>
                {device.instructionSteps.slice(0, 2).map((st, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, marginBottom: i === 1 ? 0 : 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#2563EB", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span><strong>{st.title}</strong> — {st.body}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn primary" onClick={() => goStep(2)} disabled={gatewayMissing} title={gatewayMissing ? "Select a gateway in hub first" : undefined} style={{ height: 36, padding: "0 18px", borderRadius: 8, background: gatewayMissing ? "#94A3B8" : "#2563EB", color: "#FFFFFF", border: 0, fontWeight: 600, fontSize: 13, cursor: gatewayMissing ? "not-allowed" : "pointer" }}>Continue → SIP Account</button>
                <Link href={hubHref} className="btn secondary" style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", display: "inline-flex", alignItems: "center", fontSize: 13, textDecoration: "none", color: "#334155" }}>Back to hub</Link>
              </div>
            </div>
          )}

          {activeStep === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>SIP Account</h3>
                  <span style={{ fontSize: 11, color: "#64748B", fontFamily: "var(--font-mono, ui-monospace)", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "3px 7px" }}>{gatewayId ? gatewayId.slice(0, 8) : "no gateway"}</span>
                </div>
                {gatewayMissing ? (
                  <div style={{ padding: 14, borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: 13 }}>Select a gateway in the hub first — <Link href={hubHref} style={{ color: "#92400E", fontWeight: 600 }}>go to hub</Link>.</div>
                ) : credsLoading ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 13, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}><Icon name="refresh" size={16} className="spin" /> Loading SIP credentials…</div>
                ) : credsErr ? (
                  <div style={{ padding: 14, borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 13 }}>{credsErr} <button type="button" onClick={() => loadCreds(false)} className="btn secondary" style={{ marginLeft: 8, height: 28, padding: "0 10px", fontSize: 12 }}>Retry</button></div>
                ) : creds ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {([
                      ["SIP Server", creds.sipServer, "sipServer"],
                      ["Port", String(creds.port), "port"],
                      ["Transport", creds.transport, "transport"],
                      ["Username", creds.username, "username"],
                      ["Password", creds.passwordMasked, "password"],
                      ["Display Name", creds.displayName ?? creds.username, "displayName"],
                    ] as const).map(([label, value, field]) => (
                      <div key={field} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                        <div style={{ flex: "0 0 110px", fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</div>
                        <div style={{ flex: 1, fontSize: 13, fontFamily: "var(--font-mono, ui-monospace)", fontWeight: 500, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
                        <button type="button" onClick={() => copyField(field, String(value))} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: copiedField === field ? "#16A34A" : "#FFFFFF", color: copiedField === field ? "#FFFFFF" : "#334155", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Icon name="copy" size={12} /> {copiedField === field ? "Copied!" : "Copy"}
                        </button>
                        {field === "password" && !revealed && (
                          <button type="button" onClick={handleReveal} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #2563EB", background: "#2563EB", color: "#FFFFFF", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <Icon name="eye" size={12} /> Reveal
                          </button>
                        )}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setQrOpen(true)} style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <Icon name="search" size={14} /> Show QR
                      </button>
                      {device.capabilities.cfg && (
                        <button type="button" onClick={downloadCfg} style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#F8FAFC", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Icon name="download" size={14} /> Download .cfg
                        </button>
                      )}
                      <span style={{ fontSize: 12, color: "#64748B", display: "inline-flex", alignItems: "center" }}>SIP URI: <code style={{ marginLeft: 6, fontFamily: "var(--font-mono, ui-monospace)", fontSize: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "2px 6px" }}>{creds.sipUri}</code></span>
                    </div>
                  </div>
                ) : null}
              </div>

              {creds && (
                <div className="card" style={{ padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{device.label} — Quick Steps</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {device.instructionSteps.map((st, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, padding: 10, borderRadius: 8, border: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#2563EB", color: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{st.title}</span>
                          <span style={{ display: "block", fontSize: 13, color: "#475569", marginTop: 2 }}>{st.body}</span>
                          {st.snippet && <code style={{ display: "inline-block", marginTop: 6, fontFamily: "var(--font-mono, ui-monospace)", fontSize: 12, background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 6, padding: "2px 7px" }}>{st.snippet}</code>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => goStep(1)} className="btn secondary" style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 13 }}>Back</button>
                <button type="button" onClick={() => goStep(3)} className="btn primary" style={{ height: 36, padding: "0 18px", borderRadius: 8, background: "#2563EB", color: "#FFFFFF", border: 0, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Next → Network</button>
              </div>

              {qrOpen && creds && (
                <div role="dialog" aria-modal="true" aria-label="QR provisioning" style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }} onClick={() => setQrOpen(false)}>
                  <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 90vw)", background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, boxShadow: "0 20px 40px rgba(15,23,42,0.15)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700 }}>Scan with Zoiper / Linphone</h3>
                      <button type="button" onClick={() => setQrOpen(false)} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={14} /></button>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", padding: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8 }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(creds.sipUri)}`}
                        alt={`QR for ${creds.sipUri}`}
                        width={240}
                        height={240}
                        style={{ borderRadius: 6, background: "#FFFFFF" }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                    <div style={{ marginTop: 12, fontSize: 12, color: "#64748B", textAlign: "center" }}>Scan with your softphone. Password is {revealed ? "included" : "masked — reveal first"}.</div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, justifyContent: "center" }}>
                      <button type="button" onClick={() => copyField("qrPayload", creds.qrPayload ?? creds.sipUri)} style={{ height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 12, fontWeight: 600 }}>Copy SIP URI</button>
                      <button type="button" onClick={() => setQrOpen(false)} style={{ height: 32, padding: "0 14px", borderRadius: 8, border: 0, background: "#2563EB", color: "#FFFFFF", fontSize: 12, fontWeight: 600 }}>Done</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeStep === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Network & Codecs</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Transport</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(["udp", "tcp", "tls"] as const).map((t) => (
                        <button key={t} type="button" onClick={() => setTransport(t)} style={{ height: 32, padding: "0 12px", borderRadius: 999, fontSize: 13, fontWeight: t === transport ? 700 : 500, border: t === transport ? "1px solid #2563EB" : "1px solid #E2E8F0", background: t === transport ? "#EFF6FF" : "#FFFFFF", color: t === transport ? "#1D4ED8" : "#334155", cursor: "pointer" }}>
                          {t.toUpperCase()} {t === "udp" ? "(Recommended)" : t === "tls" ? "· port 5061" : ""}
                        </button>
                      ))}
                    </div>
                    {transport === "tls" && <div style={{ marginTop: 8, fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "6px 10px" }}>Ensure port 5061 open and certificate trusted.</div>}
                  </div>
                  <label style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, borderRadius: 8, border: "1px solid #E2E8F0", background: stun ? "#F0FDF4" : "#FFFFFF", cursor: "pointer" }}>
                    <input type="checkbox" checked={stun} onChange={(e) => setStun(e.target.checked)} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>STUN</span>
                    <span style={{ fontSize: 12, color: "#64748B" }}>Enable if behind NAT</span>
                  </label>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Keep-alive (s)</div>
                    <input value={keepAlive} onChange={(e) => setKeepAlive(e.target.value)} placeholder="30" style={{ width: "100%", height: 36, borderRadius: 6, border: Number(keepAlive) < 15 || Number(keepAlive) > 120 || isNaN(Number(keepAlive)) ? "1px solid #FCA5A5" : "1px solid #E2E8F0", padding: "0 10px", fontSize: 13 }} />
                    {(Number(keepAlive) < 15 || Number(keepAlive) > 120 || isNaN(Number(keepAlive))) && keepAlive !== "" && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 4 }}>Must be 15–120 seconds</div>}
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Codecs (drag to order — informational, not written to VOS)</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {Object.keys(codecs).map((c) => (
                        <label key={c} style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "6px 10px", borderRadius: 8, border: codecs[c] ? "1px solid #16A34A" : "1px solid #E2E8F0", background: codecs[c] ? "#F0FDF4" : "#FFFFFF", fontSize: 13 }}>
                          <input type="checkbox" checked={!!codecs[c]} onChange={(e) => setCodecs((prev) => ({ ...prev, [c]: e.target.checked }))} />
                          {c} {codecs[c] && <span style={{ color: "#16A34A" }}>✓</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>DTMF</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#EFF6FF", color: "#1D4ED8", fontWeight: 600 }}>RFC2833</span>
                      <span style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>SIP INFO</span>
                      <button type="button" onClick={() => copyField("dtmf", "RFC2833")} style={{ marginLeft: "auto", height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 12 }}>{copiedField === "dtmf" ? "Copied!" : "Copy"}</button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => goStep(2)} style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 13 }}>Back</button>
                <button type="button" onClick={() => goStep(4)} style={{ height: 36, padding: "0 18px", borderRadius: 8, background: "#2563EB", color: "#FFFFFF", border: 0, fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Next → Verify</button>
              </div>
            </div>
          )}

          {activeStep === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="card" style={{ padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Live Registration</h3>
                  <button type="button" onClick={handleVerify} disabled={verifying || gatewayMissing} style={{ height: 36, padding: "0 16px", borderRadius: 8, background: verifying || gatewayMissing ? "#94A3B8" : "#2563EB", color: "#FFFFFF", border: 0, fontWeight: 600, fontSize: 13, cursor: verifying || gatewayMissing ? "not-allowed" : "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    {verifying ? <><Icon name="refresh" size={14} className="spin" /> Checking…</> : <><Icon name="refresh" size={14} /> Check now</>}
                  </button>
                </div>
                {gatewayMissing ? (
                  <div style={{ padding: 12, borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: 13 }}>Pick a gateway in the hub to verify.</div>
                ) : verifyErr ? (
                  <div style={{ padding: 12, borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontSize: 13 }}>{verifyErr}</div>
                ) : verifyState ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: verifyState.registered ? "#DCFCE7" : "#FEF2F2", color: verifyState.registered ? "#166534" : "#991B1B", border: `1px solid ${verifyState.registered ? "#BBF7D0" : "#FECACA"}` }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: verifyState.registered ? "#16A34A" : "#DC2626", display: "inline-block" }} />
                        {verifyState.registered ? "Online" : "Offline"} {verifyState.degraded ? "(degraded — last known)" : ""}
                      </span>
                      {verifyState.ip && <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 13, fontWeight: 500, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 8px" }}>{verifyState.ip}</span>}
                      {verifyState.latencyMs !== undefined && <span style={{ fontSize: 12, color: "#64748B", fontFamily: "var(--font-mono, ui-monospace)" }}>{verifyState.latencyMs} ms</span>}
                      <span style={{ fontSize: 12, color: "#64748B" }}>{new Date(verifyState.lastSeenIso).toLocaleString()} · {Math.round((Date.now() - new Date(verifyState.lastSeenIso).getTime()) / 60000)} min ago</span>
                    </div>
                    {verifyState.degraded && <div style={{ padding: "8px 10px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: 12 }}>Registration check degraded — showing last known. VOS/Redis may be unreachable. Retry in a moment.</div>}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      <button type="button" onClick={handleVerify} style={{ height: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 12, fontWeight: 600 }}>Retry</button>
                      <span style={{ fontSize: 12, color: "#64748B", display: "inline-flex", alignItems: "center" }}>Test call button links to Call Analysis — place a test call from your device, then refresh CDR.</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 14, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", color: "#475569", fontSize: 13 }}>Click Check now to probe registration via <code style={{ fontFamily: "var(--font-mono, ui-monospace)", background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 4, padding: "1px 6px" }}>gateway:{gatewayId.slice(0, 8)}:online</code> (Redis). Status badge + text shown per DESIGN.md (never color alone).</div>
                )}

                {device.key === "webrtc" && (
                  <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: "1px solid #A5F3FC", background: "#ECFEFF" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#0E7490", marginBottom: 8, display: "flex", gap: 6, alignItems: "center" }}><Icon name="monitor" size={14} /> WebRTC Dialer</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 220 }}>
                      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((d) => (
                        <button key={d} type="button" style={{ height: 44, borderRadius: 8, border: "1px solid #A5F3FC", background: "#FFFFFF", fontSize: 16, fontWeight: 600, color: "#0E7490" }}>{d}</button>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, height: 36, borderRadius: 8, border: "1px solid #A5F3FC", background: "#FFFFFF", display: "flex", alignItems: "center", padding: "0 10px", fontFamily: "var(--font-mono, ui-monospace)", fontSize: 14, color: "#334155" }}>+1 555 010  0</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button type="button" style={{ flex: 1, height: 36, borderRadius: 8, background: "#0891B2", color: "#FFFFFF", border: 0, fontWeight: 700, fontSize: 13 }}>Call</button>
                      <button type="button" style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px solid #A5F3FC", background: "#FFFFFF", fontSize: 13 }}>Mute</button>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: "#0E7490" }}>Token short-lived, never stored in localStorage. Allow microphone permission on HTTPS.</div>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF" }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Troubleshooting</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { title: "NAT / One-way audio", body: "Try STUN on, disable SIP ALG on router, ensure RTP ports 10000–20000 open.", links: [{ label: "Gateway Network Quality", href: `${base}/gateways/network` }, { label: "Call Analysis", href: `${base}/diagnostics/call-analysis` }] },
                    { title: "401 Unauthorized", body: "Check username / password and transport. Reveal and re-copy. Ensure transport matches server (UDP).", links: [{ label: "Registration Analysis", href: `${base}/diagnostics/registration-analysis` }, { label: "Gateway Status", href: `${base}/gateways/status` }] },
                    { title: "Timeout / No response", body: "Check server/port, firewall 5060 (or 5061 for TLS), and DNS.", links: [{ label: "Online Gateways", href: `${base}/gateways/online` }, { label: "NOC Live", href: `${base}/noc` }] },
                  ].map((item) => (
                    <details key={item.title} style={{ padding: 10, borderRadius: 8, border: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                      <summary style={{ fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#0F172A" }}>{item.title}</summary>
                      <div style={{ fontSize: 13, color: "#475569", marginTop: 6 }}>{item.body}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                        {item.links.map((l) => (
                          <a key={l.label} href={gatewayId ? `${l.href}?gatewayId=${encodeURIComponent(gatewayId)}` : l.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#2563EB", textDecoration: "none", border: "1px solid #BFDBFE", background: "#EFF6FF", padding: "4px 8px", borderRadius: 999 }}>{l.label} ↗</a>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => goStep(3)} style={{ height: 36, padding: "0 16px", borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF", fontSize: 13 }}>Back</button>
                <Link href={hubHref} style={{ height: 36, padding: "0 18px", borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 600, textDecoration: "none", color: "#334155" }}>Done — Back to hub</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#94A3B8", display: "flex", gap: 12, flexWrap: "wrap" }}>
        <span>Request ID shown in toasts on copy/reveal.</span>
        <span>·</span>
        <span>No secrets in logs or URL — masked DTO only.</span>
        <span>·</span>
        <Link href={hubHref} style={{ color: "#94A3B8", textDecoration: "underline" }}>Hub</Link>
      </div>
    </div>
  );
}
