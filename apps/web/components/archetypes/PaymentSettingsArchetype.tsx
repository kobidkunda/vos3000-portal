"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";
import { FormErrorHeader } from "../shared/FormErrorHeader";

export function PaymentSettingsArchetype({
  side,
  title,
  purpose,
  source = "postgres (payment_provider_settings)",
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  source?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Settings State
  const [apiKey, setApiKey] = useState("");
  const [ipnSecret, setIpnSecret] = useState("");
  const [sandbox, setSandbox] = useState(true);
  const [publicWebhookUrl, setPublicWebhookUrl] = useState("");
  const [defaultWebhookUrl, setDefaultWebhookUrl] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasIpnSecret, setHasIpnSecret] = useState(false);
  const [envKeyConfigured, setEnvKeyConfigured] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      try {
        const res: any = await api("/api/v1/admin/settings/payments/nowpayments");
        if (res?.data) {
          const d = res.data;
          setSandbox(Boolean(d.sandbox));
          setPublicWebhookUrl(d.publicWebhookUrl || "");
          setDefaultWebhookUrl(d.defaultWebhookUrl || "");
          setIsConfigured(Boolean(d.isConfigured));
          setHasApiKey(Boolean(d.hasApiKey));
          setHasIpnSecret(Boolean(d.hasIpnSecret));
          setEnvKeyConfigured(Boolean(d.envKeyConfigured));
          if (d.hasApiKey) setApiKey("********");
          if (d.hasIpnSecret) setIpnSecret("********");
        }
      } catch (e: any) {
        setMsg({ type: "err", text: e.message || "Failed to load payment settings" });
      } finally {
        setLoading(false);
      }
    }
    void fetchSettings();
  }, []);

  const activeWebhookUrl = publicWebhookUrl || defaultWebhookUrl || "http://192.168.88.81:4000/api/v1/webhooks/nowpayments";

  function copyWebhook() {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(activeWebhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const payload: any = {
        sandbox,
        publicWebhookUrl: publicWebhookUrl.trim(),
      };
      if (apiKey && apiKey !== "********") payload.apiKey = apiKey.trim();
      if (ipnSecret && ipnSecret !== "********") payload.ipnSecret = ipnSecret.trim();

      const res: any = await api("/api/v1/admin/settings/payments/nowpayments", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (res?.data || res?.ok) {
        setMsg({ type: "ok", text: "NOWPayments configuration saved successfully!" });
        setHasApiKey(Boolean(payload.apiKey || hasApiKey));
        setHasIpnSecret(Boolean(payload.ipnSecret || hasIpnSecret));
        setIsConfigured(true);
        if (payload.apiKey) setApiKey("********");
        if (payload.ipnSecret) setIpnSecret("********");
      } else {
        setMsg({ type: "err", text: res?.error?.message || "Failed to save settings." });
      }
    } catch (err: any) {
      setMsg({ type: "err", text: err.message || "Network error while saving settings." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setMsg(null);
    try {
      const payload: any = { sandbox };
      if (apiKey && apiKey !== "********") payload.apiKey = apiKey.trim();

      const res: any = await api("/api/v1/admin/settings/payments/nowpayments/test", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.ok || res?.data?.ok) {
        setMsg({ type: "ok", text: res.data?.message || "Connection to NOWPayments API verified successfully!" });
      } else {
        setMsg({ type: "err", text: res?.data?.message || res?.error?.message || "NOWPayments API test failed." });
      }
    } catch (err: any) {
      setMsg({ type: "err", text: `Connection test error: ${err.message}` });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{title || "Payment Providers"}</h1>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose || "Configure cryptocurrency payment gateway (NOWPayments), API keys, and Instant Payment Notification (IPN) webhook endpoints."}</p>
        </div>

        <div className="pageActions">
          <Link href="/admin/payments" className="btn secondary sm">
            <Icon name="arrowLeft" size={13} />
            <span>Payments Overview</span>
          </Link>
        </div>
      </div>

      {msg && (
        <div className={msg.type === "ok" ? "notice" : "error"} style={{ marginBottom: 20 }}>
          <Icon name={msg.type === "ok" ? "check" : "alert"} size={16} />
          <span>{msg.text}</span>
        </div>
      )}

      {/* Prominent Webhook (IPN) Callout Box */}
      <div
        className="card"
        style={{
          marginBottom: 24,
          padding: 24,
          background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(6,182,212,0.04))",
          border: "1.5px solid var(--primary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon name="zap" size={18} className="text-primary" />
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--text)" }}>
                NOWPayments Webhook (IPN) URL
              </h2>
              <span className="badge badge-online">Live Endpoint</span>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", maxWidth: 650 }}>
              NOWPayments posts cryptographic Instant Payment Notifications (IPN) to this URL when clients send crypto payments. When verified, funds are automatically credited to PostgreSQL ledgers and VOS balances.
            </p>
          </div>

          <button
            type="button"
            className="btn primary"
            onClick={copyWebhook}
            style={{ height: 38, fontSize: 13, gap: 8 }}
          >
            <Icon name={copiedWebhook ? "check" : "copy"} size={14} />
            <span>{copiedWebhook ? "URL Copied to Clipboard!" : "Copy Webhook URL"}</span>
          </button>
        </div>

        {/* URL Box */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--surface)",
            padding: "12px 16px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--primary)",
            wordBreak: "break-all",
          }}
        >
          {activeWebhookUrl}
        </div>

        {/* Integration Instructions */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border)", display: "flex", gap: 20, fontSize: 12, color: "var(--text2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--surface2)", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700 }}>1</span>
            <span>Paste in NOWPayments Dashboard → <strong>Store Settings → IPN URL</strong></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--surface2)", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700 }}>2</span>
            <span>Copy <strong>IPN Secret Key</strong> into the form below</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--surface2)", display: "grid", placeItems: "center", fontSize: 10.5, fontWeight: 700 }}>3</span>
            <span>Automatic HMAC-SHA512 verification ensures zero fraud</span>
          </div>
        </div>
      </div>

      {/* Main Configuration Card */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div className="cardHead" style={{ marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 750 }}>NOWPayments Gateway Credentials</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              {envKeyConfigured ? "Loaded from .env with database overrides enabled." : "Configure API keys for invoice generation and IPN signature validation."}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Status value={hasApiKey ? "Configured" : "Action Required"} size="sm" />
            <span className={`badge ${sandbox ? "badge-warning" : "badge-online"}`}>
              {sandbox ? "Sandbox (Testnet)" : "Production (Live)"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave}>
          <FormErrorHeader error={msg?.type === "err" ? msg.text : null} onDismiss={() => setMsg(null)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {/* API Key */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                NOWPayments API Key
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  className="input"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? "******** (Saved in Database / .env)" : "e.g. 7X89W-12345-ABCDE-..."}
                  style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}
                />
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                Obtained from NOWPayments Dashboard → Store Settings → API Keys.
              </span>
            </div>

            {/* IPN Secret Key */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                IPN Secret Key (HMAC Signature Validation)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  className="input"
                  value={ipnSecret}
                  onChange={(e) => setIpnSecret(e.target.value)}
                  placeholder={hasIpnSecret ? "******** (Saved in Database / .env)" : "e.g. 9f8a7b6c5d..."}
                  style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}
                />
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                Used to cryptographically verify <code style={{ fontSize: 10.5 }}>x-nowpayments-sig</code> headers.
              </span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            {/* Environment Toggle */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                Operating Environment
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setSandbox(true)}
                  className={`btn sm ${sandbox ? "primary" : "secondary"}`}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Icon name="shield" size={13} />
                  <span>Sandbox (Testnet)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSandbox(false)}
                  className={`btn sm ${!sandbox ? "primary" : "secondary"}`}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <Icon name="zap" size={13} />
                  <span>Production (Live Mainnet)</span>
                </button>
              </div>
              <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                {sandbox
                  ? "Uses https://api-sandbox.nowpayments.io for testing without real funds."
                  : "Uses https://api.nowpayments.io for live commercial settlement."}
              </span>
            </div>

            {/* Custom Public Base Webhook URL */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 6 }}>
                Public Webhook Base URL Override (Optional)
              </label>
              <input
                type="text"
                className="input"
                value={publicWebhookUrl}
                onChange={(e) => setPublicWebhookUrl(e.target.value)}
                placeholder={defaultWebhookUrl || "http://192.168.88.81:4000/api/v1/webhooks/nowpayments"}
                style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}
              />
              <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, display: "block" }}>
                Specify if the API server is behind a reverse proxy, public domain, or tunnel.
              </span>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || (!apiKey && !hasApiKey)}
              className="btn secondary"
              style={{ gap: 8 }}
            >
              <Icon name="activity" size={14} />
              <span>{testing ? "Testing Connection…" : "Test NOWPayments Connection"}</span>
            </button>

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

      {/* Security & Audit Guidelines */}
      <div className="card" style={{ padding: 18, background: "var(--surface2)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Icon name="shield" size={18} className="text-primary" />
          <div style={{ fontSize: 12, color: "var(--text2)", lineHeight: 1.5 }}>
            <strong>Telecom Security & Financial Isolation Rules:</strong>
            <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
              <li>Client portal users only interact through tokenized deposits and NEVER have direct access to NOWPayments credentials.</li>
              <li>Every balance credit creates an immutable PostgreSQL ledger row with unique idempotency keys to prevent double-crediting.</li>
              <li>All gateway configuration changes and manual payments are cryptographically audited with the admin actor ID and client IP.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
