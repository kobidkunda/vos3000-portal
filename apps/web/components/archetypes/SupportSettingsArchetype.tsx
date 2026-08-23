"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";
import { FormErrorHeader } from "../shared/FormErrorHeader";

function previewTelegram(handle: string): string {
  const s = handle.trim().replace(/^@+/, "");
  const m = s.match(/(?:https?:\/\/)?t\.me\/([a-zA-Z0-9_]{1,64})/i);
  const h = m ? m[1] : s;
  return /^([a-zA-Z0-9_]{5,32})$/.test(h) ? `https://t.me/${h}` : "";
}
function previewTeams(id: string): string {
  const s = id.trim();
  if (!s || s.length > 320) return "";
  const emailOk = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(s);
  const handleOk = /^[a-zA-Z0-9._-]{1,64}$/.test(s);
  return emailOk || handleOk ? `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(s)}` : "";
}

export function SupportSettingsArchetype({
  side,
  title,
  purpose,
  source = "postgres (portal_resources:support_config)",
  warnings,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  source?: string;
  warnings?: string[];
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ telegramHandle?: string; teamsId?: string }>({});

  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");
  const [tgEnabled, setTgEnabled] = useState(false);
  const [tgHandle, setTgHandle] = useState("");
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [teamsId, setTeamsId] = useState("");

  async function fetchConfig() {
    setLoading(true);
    setLoadError(null);
    setDenied(false);
    try {
      const res: any = await api("/api/v1/admin/settings/support");
      if (res?.data) {
        const d = res.data;
        setEnabled(Boolean(d.enabled));
        setLabel(d.label || "");
        setTgEnabled(Boolean(d.telegram?.enabled));
        setTgHandle(d.telegram?.handle || "");
        setTeamsEnabled(Boolean(d.teams?.enabled));
        setTeamsId(d.teams?.id || "");
      } else if (res?.error?.code === "FORBIDDEN") {
        setDenied(true);
      } else {
        setLoadError(res?.error?.message || "Failed to load support settings");
      }
    } catch (e: any) {
      setLoadError(e?.message || "Failed to load support settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setFieldErrors({});
    try {
      const payload = {
        enabled,
        label: label.trim(),
        telegram: { enabled: tgEnabled, handle: tgHandle.trim() },
        teams: { enabled: teamsEnabled, id: teamsId.trim() },
      };
      const res: any = await api("/api/v1/admin/settings/support", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (res?.ok || res?.data) {
        setMsg({ type: "ok", text: "Support contacts saved and audited" });
      } else if (res?.error?.code === "VALIDATION_ERROR") {
        const fields: any[] = res.error?.details?.fields ?? [];
        const fe: typeof fieldErrors = {};
        for (const f of fields) {
          if (f.field === "telegram.handle") fe.telegramHandle = f.message;
          if (f.field === "teams.id") fe.teamsId = f.message;
        }
        setFieldErrors(fe);
        setMsg({ type: "err", text: res.error?.message || "Validation failed" });
      } else {
        setMsg({ type: "err", text: res?.error?.message || "Failed to save support settings." });
      }
    } catch (err: any) {
      setMsg({ type: "err", text: err?.message || "Network error while saving settings." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="content">
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "48px 0", color: "var(--muted)" }}>
          <span style={{ display: "inline-flex", animation: "spin 1s linear infinite" }}><Icon name="refresh" size={18} /></span>
          <span style={{ fontSize: 13 }}>Loading support settings…</span>
        </div>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="content">
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <Icon name="shield" size={28} />
          <h2 style={{ fontSize: 16, margin: "12px 0 6px" }}>Permission denied</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
            Your role is not authorized to manage global support contacts. Ask a super admin for access.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="content">
        <div className="error" style={{ marginBottom: 16 }}>
          <Icon name="alert" size={16} />
          <span>{loadError}</span>
        </div>
        <button type="button" className="btn secondary sm" onClick={() => void fetchConfig()}>
          <Icon name="refresh" size={13} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const tgPreview = tgHandle.trim() ? previewTelegram(tgHandle) : "";
  const teamsPreview = teamsId.trim() ? previewTeams(teamsId) : "";

  return (
    <div className="content">
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title || "Support Settings"}</h1>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
            <Status value={enabled ? "Enabled" : "Disabled"} size="sm" />
          </div>
          <p>{purpose || "Configure the Telegram and Microsoft Teams contacts shown in the floating Support button on every client portal page."}</p>
        </div>
      </div>

      {msg && (
        <div className={msg.type === "ok" ? "notice" : "error"} style={{ marginBottom: 20 }}>
          <Icon name={msg.type === "ok" ? "check" : "alert"} size={16} />
          <span>{msg.text}</span>
        </div>
      )}

      {warnings && warnings.length > 0 && (
        <div className="error" style={{ marginBottom: 20, borderColor: "var(--warning, #f59e0b)" }}>
          <Icon name="alert" size={16} />
          <span>Integration degraded — changes may be delayed. {(warnings[0] || "").toString()}</span>
        </div>
      )}

      {!tgEnabled && !teamsEnabled && !tgHandle.trim() && !teamsId.trim() && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <Icon name="support" size={16} />
          <span>No support contacts configured — add a Telegram or Teams handle below.</span>
        </div>
      )}

      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="cardHead" style={{ marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 750 }}>Global Support Contacts</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Applies to all client portal users. Changes are validated, audited and cached for ~60 seconds.
            </div>
          </div>
          <span className={`badge ${enabled ? "badge-online" : "badge-warning"}`}>
            {enabled ? "FAB Visible to Clients" : "FAB Hidden"}
          </span>
        </div>

        <form onSubmit={handleSave}>
          <FormErrorHeader error={msg?.type === "err" ? msg.text : null} onDismiss={() => setMsg(null)} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Support Button</label>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setEnabled(true)} className={`btn sm ${enabled ? "primary" : "secondary"}`} style={{ flex: 1, justifyContent: "center" }}>
                  <Icon name="check" size={13} />
                  <span>Enabled</span>
                </button>
                <button type="button" onClick={() => setEnabled(false)} className={`btn sm ${!enabled ? "primary" : "secondary"}`} style={{ flex: 1, justifyContent: "center" }}>
                  <span>Disabled</span>
                </button>
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                When disabled, clients never see the Support button.
              </span>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Button Label (Optional)</label>
              <input
                type="text"
                className="input"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Need help? Talk to us"
                maxLength={120}
                style={{ width: "100%", fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                Shown next to the Support icon. Max 120 characters.
              </span>
            </div>
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 750 }}>
                <Icon name="external_link" size={15} />
                Telegram
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setTgEnabled(true)} className={`btn sm ${tgEnabled ? "primary" : "secondary"}`}>On</button>
                <button type="button" onClick={() => setTgEnabled(false)} className={`btn sm ${!tgEnabled ? "primary" : "secondary"}`}>Off</button>
              </div>
            </div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Telegram Handle</label>
            <input
              type="text"
              className="input"
              value={tgHandle}
              onChange={(e) => setTgHandle(e.target.value)}
              placeholder="@my_support_bot or https://t.me/my_support_bot"
              style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}
            />
            {fieldErrors.telegramHandle && (
              <div style={{ fontSize: 11.5, color: "var(--danger, #dc2626)", marginTop: 4 }}>{fieldErrors.telegramHandle}</div>
            )}
            <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
              5–32 letters, digits or underscores. Leading @ or a t.me link is accepted.
            </span>
            {tgEnabled && tgPreview && (
              <div style={{ marginTop: 8, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--primary)", wordBreak: "break-all" }}>
                Preview: <a href={tgPreview} target="_blank" rel="noopener noreferrer">{tgPreview}</a>
              </div>
            )}
          </div>

          <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 750 }}>
                <Icon name="users" size={15} />
                Microsoft Teams
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setTeamsEnabled(true)} className={`btn sm ${teamsEnabled ? "primary" : "secondary"}`}>On</button>
                <button type="button" onClick={() => setTeamsEnabled(false)} className={`btn sm ${!teamsEnabled ? "primary" : "secondary"}`}>Off</button>
              </div>
            </div>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>Teams ID (email or handle)</label>
            <input
              type="text"
              className="input"
              value={teamsId}
              onChange={(e) => setTeamsId(e.target.value)}
              placeholder="support@yourcompany.com"
              style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}
            />
            {fieldErrors.teamsId && (
              <div style={{ fontSize: 11.5, color: "var(--danger, #dc2626)", marginTop: 4 }}>{fieldErrors.teamsId}</div>
            )}
            <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
              A work email or a Teams handle (max 320 chars). Opens a Teams chat draft.
            </span>
            {teamsEnabled && teamsPreview && (
              <div style={{ marginTop: 8, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--primary)", wordBreak: "break-all" }}>
                Preview: <a href={teamsPreview} target="_blank" rel="noopener noreferrer">{teamsPreview}</a>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button
              type="submit"
              disabled={saving}
              className="btn primary"
              style={{ minWidth: 140, justifyContent: "center", gap: 8 }}
            >
              <Icon name="check" size={14} />
              <span>{saving ? "Saving…" : "Save Configuration"}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ padding: 18, background: "var(--surface2)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Icon name="shield" size={18} className="text-primary" />
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
            <strong>How this reaches clients:</strong>
            <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
              <li>Only resolved URLs are sent to clients — raw handles/IDs never leave the admin API.</li>
              <li>Every change is written to the audit log with before/after values and your user ID.</li>
              <li>Clients see a floating Support button on every portal page; it opens Telegram or Teams in a new tab.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
