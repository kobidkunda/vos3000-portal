"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Icon } from "../../lib/icons";
import { DEVICES, filterDevices, type DeviceDefinition } from "../../lib/devicesRegistry";

interface Props {
  side?: "Admin" | "Client";
  title?: string;
  purpose?: string;
}

type Gate = { id: string; name: string; configured_ip?: string; vos_gateway_id?: string; status?: string };

/** Device silhouette SVGs — pure inline, no external asset, 120x80 viewBox */
function DeviceSilhouette({ icon, label }: { icon: string; label: string }) {
  // softphone: rounded rect with handset, deskphone: classic T-series silhouette
  if (icon === "devices") {
    return (
      <svg viewBox="0 0 120 80" width="56" height="36" aria-hidden className="deviceSilhouette">
        <rect x="14" y="10" width="92" height="54" rx="8" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
        <rect x="22" y="16" width="76" height="28" rx="5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        <circle cx="34" cy="56" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="48" cy="56" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="62" cy="56" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="72" y="52" width="18" height="8" rx="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <title>{label}</title>
      </svg>
    );
  }
  if (icon === "smartphone" || icon === "mobile") {
    return (
      <svg viewBox="0 0 120 80" width="44" height="36" aria-hidden className="deviceSilhouette">
        <rect x="42" y="6" width="36" height="68" rx="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="50" y="14" width="20" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
        <circle cx="60" cy="62" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <title>{label}</title>
      </svg>
    );
  }
  if (icon === "monitor") {
    return (
      <svg viewBox="0 0 120 80" width="56" height="36" aria-hidden className="deviceSilhouette">
        <rect x="18" y="12" width="84" height="48" rx="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <rect x="28" y="20" width="64" height="28" rx="4" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.55" />
        <rect x="52" y="60" width="16" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <title>{label}</title>
      </svg>
    );
  }
  // softphone default: handset + window
  return (
    <svg viewBox="0 0 120 80" width="56" height="36" aria-hidden className="deviceSilhouette">
      <rect x="16" y="12" width="68" height="50" rx="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="24" y="20" width="52" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <path d="M88 22c7 0 13 5 13 13s-6 13-13 13" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="92" cy="35" r="2.2" fill="currentColor" />
      <title>{label}</title>
    </svg>
  );
}

export function DeviceSetupHubArchetype({ side = "Client", title = "Choose your device", purpose = "Guide users to configure dialers, softphones, and IP phones — pick a device, get copy-ready SIP fields, QR, and one-click verification." }: Props) {
  const base = side === "Admin" ? "/admin" : "/app";
  const [gateways, setGateways] = useState<Gate[]>([]);
  const [selectedGatewayId, setSelectedGatewayId] = useState<string>("");
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [isDegraded, setIsDegraded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadGateways() {
      setLoading(true);
      setErr("");
      setIsForbidden(false);
      setIsDegraded(false);
      try {
        // Try real gateways API (tenant-scoped)
        const data = await api<{ data?: unknown }>(side === "Admin" ? "/api/v1/admin/gateways/mapping" : "/api/v1/gateways").catch(() => null);
        // Normalize: gateways API may return in different shapes; fallback to demo gateways for UI demo
        let list: Gate[] = [];
        if (Array.isArray((data as { data?: unknown })?.data)) list = (data as { data: Gate[] }).data;
        else if (Array.isArray(data)) list = data as Gate[];
        else if ((data as { data?: { items?: Gate[] } })?.data && Array.isArray((data as { data: { items: Gate[] } }).data.items)) list = (data as { data: { items: Gate[] } }).data.items;
        // Demo fallback synthetic gateways so hub is never empty in dev
        if (list.length === 0) {
          list = [
            { id: "a1b2c3d4-1111-4111-8111-111111111111", name: "Primary Ingress (Demo)", configured_ip: "203.0.113.10", status: "online" },
            { id: "b2c3d4e5-2222-4222-8222-222222222222", name: "Egress EU (Demo)", configured_ip: "198.51.100.22", status: "online" },
            { id: "c3d4e5f6-3333-4333-8333-333333333333", name: "WebRTC Edge (Demo)", configured_ip: "192.0.2.15", status: "online" },
          ];
          setIsDegraded(true);
        }
        if (!cancelled) {
          setGateways(list);
          if (list.length && !selectedGatewayId) setSelectedGatewayId(list[0].id);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) {
          if (/forbidden|permission|403/i.test(msg)) setIsForbidden(true);
          else setErr(msg);
          // still show demo gateways so user can explore
          const demo: Gate[] = [{ id: "a1b2c3d4-1111-4111-8111-111111111111", name: "Primary Ingress (Demo)", configured_ip: "203.0.113.10", status: "online" }];
          setGateways(demo);
          if (!selectedGatewayId) setSelectedGatewayId(demo[0].id);
          setIsDegraded(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadGateways();
    return () => { cancelled = true; };
  }, [side, selectedGatewayId]);

  const filtered: DeviceDefinition[] = useMemo(() => {
    return filterDevices(category === "all" ? undefined : (category as DeviceDefinition["category"]), search.trim() || undefined);
  }, [category, search]);

  const isLoading = loading && gateways.length === 0;

  if (isLoading) {
    return (
      <div className="content">
        <div className="pageHead" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</h1>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>{purpose}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card" style={{ padding: 16, borderRadius: 8, border: "1px solid var(--border)", height: 168, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ height: 36, background: "var(--border)", borderRadius: 6, opacity: 0.6 }} />
              <div style={{ height: 14, background: "var(--border)", borderRadius: 4, width: "60%" }} />
              <div style={{ height: 12, background: "var(--border)", borderRadius: 4, width: "40%", opacity: 0.7 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isForbidden) {
    return (
      <div className="content">
        <div className="pageHead" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>{title}</h1>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>Permission Denied</p>
          </div>
        </div>
        <div className="card" style={{ padding: "32px 24px", textAlign: "center", maxWidth: 560, margin: "24px auto", borderRadius: 12, border: "1px solid #F59E0B", background: "#FFFBEB" }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FEF3C7", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12, color: "#D97706" }}>
            <Icon name="alert" size={22} />
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#92400E" }}>Access Restricted</h2>
          <p style={{ color: "#92400E", fontSize: 13, marginBottom: 16 }}>Your role cannot access Device Setup. Contact your administrator for devices:read permission.</p>
          <Link href={side === "Admin" ? "/admin" : "/app"} className="btn secondary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Icon name="dashboard" size={14} /> Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (err && filtered.length === 0) {
    return (
      <div className="content">
        <div className="pageHead" style={{ marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>{title}</h1>
            <p style={{ fontSize: 14, color: "var(--muted)" }}>Operational Error</p>
          </div>
        </div>
        <div className="card" style={{ padding: "28px 24px", textAlign: "center", maxWidth: 560, margin: "24px auto", borderRadius: 12, border: "1px solid #FCA5A5" }}>
          <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 16 }}>{err}</p>
          <button type="button" className="btn primary" onClick={() => location.reload()} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Icon name="refresh" size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 }}>{title}</h1>
          <p style={{ fontSize: 14, color: "var(--muted)", maxWidth: 720 }}>{purpose}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge" style={{ fontSize: 12, fontWeight: 600, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 999, padding: "4px 10px" }}>
            {filtered.length} devices
          </span>
          <span className="badge" style={{ fontSize: 12, background: isDegraded ? "#FFFBEB" : "#F0FDF4", color: isDegraded ? "#92400E" : "#166534", border: `1px solid ${isDegraded ? "#FDE68A" : "#BBF7D0"}`, borderRadius: 999, padding: "4px 10px" }}>
            {isDegraded ? "Demo gateways" : `${gateways.length} gateways`}
          </span>
        </div>
      </div>

      {isDegraded && (
        <div role="status" aria-live="polite" style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: "#FFFBEB", border: "1px solid #FDE68A", color: "#92400E", fontSize: 13, display: "flex", gap: 10, alignItems: "center" }}>
          <Icon name="alert" size={16} />
          <span>Showing demo gateways - live VOS unreachable. Real credentials will appear when connected. Last checked {new Date().toLocaleTimeString()}.</span>
        </div>
      )}

      {/* Controls: gateway picker + category pills + search */}
      <div className="card" style={{ padding: 16, borderRadius: 12, border: "1px solid #E2E8F0", background: "#FFFFFF", marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label htmlFor="gateway-picker" style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Gateway</label>
          <select
            id="gateway-picker"
            value={selectedGatewayId}
            onChange={(e) => setSelectedGatewayId(e.target.value)}
            style={{ minWidth: 220, height: 36, borderRadius: 6, border: "1px solid #E2E8F0", padding: "0 10px", fontSize: 13, background: "#FFFFFF" }}
          >
            {gateways.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.configured_ip ?? g.vos_gateway_id ?? g.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono, ui-monospace)", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 8px" }}>
            {selectedGatewayId ? selectedGatewayId.slice(0, 8) : "—"}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {(["all", "softphone", "deskphone", "mobile", "webrtc"] as const).map((cat) => {
            const active = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                aria-pressed={active}
                style={{
                  height: 32, padding: "0 12px", borderRadius: 999, fontSize: 13, fontWeight: active ? 700 : 500,
                  border: active ? "1px solid #2563EB" : "1px solid #E2E8F0",
                  background: active ? "#2563EB" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#334155",
                  cursor: "pointer",
                }}
              >
                {cat === "all" ? "All" : cat === "softphone" ? "Softphone" : cat === "deskphone" ? "Desk Phone" : cat === "mobile" ? "Mobile" : "WebRTC"}
              </button>
            );
          })}
        </div>
        <div style={{ flex: "1 1 200px", maxWidth: 280 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748B" }}>
              <Icon name="search" size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search devices, e.g. Yealink"
              aria-label="Search devices"
              style={{ width: "100%", height: 36, paddingLeft: 32, borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, background: "#FFFFFF" }}
            />
          </div>
        </div>
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <div style={{ color: "#64748B", fontSize: 13, marginBottom: 12 }}>No devices match your filter. Clear search or select All.</div>
          <button type="button" className="btn secondary" onClick={() => { setSearch(""); setCategory("all"); }}>
            Clear filters
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
          {filtered.map((d) => (
            <Link
              key={d.key}
              href={`${base}/devices/setup/${encodeURIComponent(d.key)}?gatewayId=${encodeURIComponent(selectedGatewayId)}`}
              aria-label={`Configure ${d.label} - ${d.category}, ${d.effortMinutes === 0 ? "instant" : `${d.effortMinutes} min setup`}`}
              style={{
                display: "flex", flexDirection: "column", gap: 12, padding: 16, borderRadius: 8, border: "1px solid #E2E8F0", background: "#FFFFFF",
                textDecoration: "none", color: "inherit", transition: "all 140ms ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#F1F5F9"; (e.currentTarget as HTMLElement).style.borderColor = "#CBD5E1"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#FFFFFF"; (e.currentTarget as HTMLElement).style.borderColor = "#E2E8F0"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: 64, height: 40, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }}>
                  <DeviceSilhouette icon={d.icon} label={d.label} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 999, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  {d.category}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.2 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="refresh" size={12} /> {d.effortMinutes === 0 ? "Instant" : `${d.effortMinutes} min`}</span>
                  <span>·</span>
                  <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 11 }}>{d.key}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {d.capabilities.qr && <span style={{ fontSize: 11, fontWeight: 600, background: "#EFF6FF", color: "#1D4ED8", border: "1px solid #BFDBFE", borderRadius: 999, padding: "2px 7px" }}>QR</span>}
                {d.capabilities.cfg && <span style={{ fontSize: 11, fontWeight: 600, background: "#F0FDF4", color: "#166534", border: "1px solid #BBF7D0", borderRadius: 999, padding: "2px 7px" }}>CFG</span>}
                {d.capabilities.webrtc && <span style={{ fontSize: 11, fontWeight: 600, background: "#ECFEFF", color: "#0E7490", border: "1px solid #A5F3FC", borderRadius: 999, padding: "2px 7px" }}>WebRTC</span>}
                {!d.capabilities.qr && !d.capabilities.cfg && !d.capabilities.webrtc && <span style={{ fontSize: 11, color: "#64748B" }}>Manual</span>}
              </div>
              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 6, color: "#2563EB", fontSize: 13, fontWeight: 600 }}>
                <span>Configure</span> <Icon name="chevronRight" size={14} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20, padding: 14, borderRadius: 8, background: "#F8FAFC", border: "1px solid #E2E8F0", fontSize: 13, color: "#475569", display: "flex", gap: 10, alignItems: "center" }}>
        <Icon name="help" size={16} />
        <span>Tip: pick your gateway first — wizard pre-fills SIP server, port and transport from the mapping gateway. Credentials are masked until you reveal.</span>
      </div>
    </div>
  );
}
