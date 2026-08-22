"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { FormErrorAlert } from "../shared/FormErrorAlert";
import { useFormError } from "../../lib/use-form-error";

export function EditorFormArchetype({
  side,
  title,
  purpose,
  route,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  route: string;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    prefixRule: "",
    billingCycle: "60/1",
    maxCps: "50",
    maxChannels: "100",
    failoverEnabled: true,
    alertThreshold: "90",
    emailNotification: "",
    notes: "",
  });

  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    formError,
    fieldErrors,
    setError,
    clearFieldError,
    clearErrors,
    bannerRef,
  } = useFormError({
    fallbackMessage: "Failed to save configuration profile.",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    setSuccessMsg(null);

    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Profile name is required";
    if (Object.keys(errs).length > 0) {
      setError({
        message: "Please complete all required fields before saving.",
        code: "VALIDATION_ERROR",
        fieldErrors: Object.entries(errs).map(([field, message]) => ({ field, message })),
        fieldErrorMap: errs,
      });
      return;
    }

    setBusy(true);

    setTimeout(() => {
      setBusy(false);
      setSuccessMsg("Configuration saved and synced to VOS3000 cluster successfully.");
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 600);
  }

  return (
    <div className="content">
      {/* Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <h1>{title}</h1>
          <p>{purpose || "Configure routing parameters, rate packages, and carrier policies."}</p>
        </div>

        <div className="pageActions">
          <Link href={side === "Admin" ? "/admin" : "/app"} className="btn secondary sm">
            <Icon name="arrowLeft" size={13} />
            <span>Cancel & Back</span>
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <Icon name="check" size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <FormErrorAlert
          ref={bannerRef}
          error={formError}
          onDismiss={clearErrors}
        />
        {/* Section 1: General Information */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="cardHead">
            <div>
              <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
                1. General Information & Identity
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Core identifier and profile metadata
              </div>
            </div>
          </div>

          <div className="formGrid">
            <div className="field">
              <label htmlFor="field-name">Profile Name *</label>
              <input
                id="field-name"
                type="text"
                className={`input ${fieldErrors.name ? "inputError" : ""}`}
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  clearFieldError("name");
                }}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "field-name-error" : undefined}
                required
              />
              {fieldErrors.name && (
                <div className="fieldError" id="field-name-error" role="alert">
                  {fieldErrors.name}
                </div>
              )}
            </div>

            <div className="field">
              <label htmlFor="field-prefixRule">Prefix Matching Rules</label>
              <input
                id="field-prefixRule"
                type="text"
                className={`input mono ${fieldErrors.prefixRule ? "inputError" : ""}`}
                value={formData.prefixRule}
                onChange={(e) => {
                  setFormData({ ...formData, prefixRule: e.target.value });
                  clearFieldError("prefixRule");
                }}
                aria-invalid={Boolean(fieldErrors.prefixRule)}
              />
              <div className="help">Comma-separated international dial codes</div>
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="field-description">Description</label>
              <input
                id="field-description"
                type="text"
                className={`input ${fieldErrors.description ? "inputError" : ""}`}
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  clearFieldError("description");
                }}
                aria-invalid={Boolean(fieldErrors.description)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Capacity & Operational Thresholds */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="cardHead">
            <div>
              <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
                2. Capacity Limits & Routing Policies
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Channel boundaries, CPS pacing, and billing intervals
              </div>
            </div>
          </div>

          <div className="formGrid">
            <div className="field">
              <label htmlFor="field-maxCps">Maximum CPS Limit</label>
              <input
                id="field-maxCps"
                type="number"
                className={`input ${fieldErrors.maxCps ? "inputError" : ""}`}
                value={formData.maxCps}
                onChange={(e) => {
                  setFormData({ ...formData, maxCps: e.target.value });
                  clearFieldError("maxCps");
                }}
                aria-invalid={Boolean(fieldErrors.maxCps)}
              />
            </div>

            <div className="field">
              <label htmlFor="field-maxChannels">Maximum Concurrent Channels</label>
              <input
                id="field-maxChannels"
                type="number"
                className={`input ${fieldErrors.maxChannels ? "inputError" : ""}`}
                value={formData.maxChannels}
                onChange={(e) => {
                  setFormData({ ...formData, maxChannels: e.target.value });
                  clearFieldError("maxChannels");
                }}
                aria-invalid={Boolean(fieldErrors.maxChannels)}
              />
            </div>

            <div className="field">
              <label htmlFor="field-billingCycle">Billing Cadence (Initial / Increment)</label>
              <select
                id="field-billingCycle"
                className={`select ${fieldErrors.billingCycle ? "inputError" : ""}`}
                value={formData.billingCycle}
                onChange={(e) => {
                  setFormData({ ...formData, billingCycle: e.target.value });
                  clearFieldError("billingCycle");
                }}
                aria-invalid={Boolean(fieldErrors.billingCycle)}
              >
                <option value="60/1">60/1 (1 min initial, 1 sec increment)</option>
                <option value="60/60">60/60 (Full minute intervals)</option>
                <option value="1/1">1/1 (Pure per-second billing)</option>
                <option value="30/6">30/6 (30s initial, 6s increment)</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="field-alertThreshold">Utilization Alert Threshold (%)</label>
              <input
                id="field-alertThreshold"
                type="number"
                className={`input ${fieldErrors.alertThreshold ? "inputError" : ""}`}
                value={formData.alertThreshold}
                onChange={(e) => {
                  setFormData({ ...formData, alertThreshold: e.target.value });
                  clearFieldError("alertThreshold");
                }}
                aria-invalid={Boolean(fieldErrors.alertThreshold)}
              />
            </div>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.failoverEnabled}
                onChange={(e) => setFormData({ ...formData, failoverEnabled: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
              />
              <div>
                <strong style={{ fontSize: 13, color: "var(--text)" }}>Enable Automatic Dynamic Failover</strong>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                  If primary SBC response exceeds 250ms or returns 503, immediately re-route to secondary gateway.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Section 3: Notification & Notes */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="cardHead">
            <div>
              <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
                3. Alerts & Operational Notes
              </div>
            </div>
          </div>

          <div className="formGrid">
            <div className="field">
              <label htmlFor="field-emailNotification">Alert Email Recipient</label>
              <input
                id="field-emailNotification"
                type="email"
                className={`input ${fieldErrors.emailNotification ? "inputError" : ""}`}
                value={formData.emailNotification}
                onChange={(e) => {
                  setFormData({ ...formData, emailNotification: e.target.value });
                  clearFieldError("emailNotification");
                }}
                aria-invalid={Boolean(fieldErrors.emailNotification)}
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="field-notes">Administrative Notes</label>
              <textarea
                id="field-notes"
                className={`textarea ${fieldErrors.notes ? "inputError" : ""}`}
                rows={3}
                value={formData.notes}
                onChange={(e) => {
                  setFormData({ ...formData, notes: e.target.value });
                  clearFieldError("notes");
                }}
                aria-invalid={Boolean(fieldErrors.notes)}
              />
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className="editorSaveBar">
          <span style={{ fontSize: 12, color: "var(--muted)" }}>
            Changes will take effect across VOS3000 nodes within 500ms
          </span>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href={side === "Admin" ? "/admin" : "/app"} className="btn secondary sm">
              Cancel
            </Link>
            <button type="submit" className="btn primary sm" disabled={busy} style={{ minWidth: 130 }}>
              <Icon name={busy ? "pulse" : "check"} size={14} />
              <span>{busy ? "Saving Changes…" : "Save Configuration"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
