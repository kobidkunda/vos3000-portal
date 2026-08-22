"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { CurrencyCell, DateCell, MonoPill } from "./DataTable";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  record?: Record<string, any> | null;
  headerHero?: React.ReactNode;
  actions?: { label: string; onClick: () => void; danger?: boolean; primary?: boolean }[];
  children?: React.ReactNode;
  size?: "medium" | "large" | string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  record,
  headerHero,
  actions,
  children,
  size,
}: DrawerProps) {
  const [activeTab, setActiveTab] = useState<"fields" | "json">("fields");
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen || (!record && !children)) return null;

  function copyAllJson() {
    if (typeof navigator !== "undefined" && navigator.clipboard && record) {
      void navigator.clipboard.writeText(JSON.stringify(record, null, 2));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  }

  const entries = record ? Object.entries(record) : [];

  return (
    <>
      <div className="detailBackdrop" onClick={onClose} />
      <div className={`detailDrawer ${size === "large" ? "drawerLarge" : ""}`} style={size === "large" ? { maxWidth: 840 } : undefined}>
        {/* Drawer Header */}
        <div className="detailHead">
          <div>
            <h3>{title}</h3>
            {subtitle && <div className="detailSub">{subtitle}</div>}
          </div>
          <button
            type="button"
            className="iconBtn"
            onClick={onClose}
            aria-label="Close drawer"
            style={{ width: 32, height: 32 }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="detailBody">
          {children ? (
            children
          ) : (
            <>
              {headerHero && (
                <div style={{ marginBottom: 14 }}>
                  {headerHero}
                </div>
              )}

          {/* Tabs */}
          <div className="detailTabs">
            <button
              type="button"
              className={`detailTab ${activeTab === "fields" ? "active" : ""}`}
              onClick={() => setActiveTab("fields")}
            >
              Structured Fields ({entries.length})
            </button>
            <button
              type="button"
              className={`detailTab ${activeTab === "json" ? "active" : ""}`}
              onClick={() => setActiveTab("json")}
            >
              Raw Payload (JSON)
            </button>
          </div>

          {activeTab === "fields" ? (
            <div className="detailGrid">
              {entries.map(([key, val]) => {
                const isCurrency = /(amount|balance|charge|revenue|cost|overdraft_limit|low_balance_threshold)/i.test(key);
                const isMono = /(id|ip|call_id|gateway|prefix|endpoint|request_id|token|secret|uuid|host|account_id)/i.test(key);
                const isStatus = /status|severity|state/i.test(key);
                const isDate = /(created_at|updated_at|begin|time|expires_at|created|lastlogin|lastused|updated)/i.test(key);

                return (
                  <div key={key} className="detailField">
                    <label>{key.replace(/_/g, " ").toUpperCase()}</label>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      {val === null || val === undefined || val === "" ? (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      ) : isStatus ? (
                        <Status value={val} size="sm" />
                      ) : isCurrency ? (
                        <CurrencyCell amount={val} currency={record?.currency ?? "USD"} />
                      ) : isDate && typeof val === "string" && val.includes("T") ? (
                        <DateCell isoString={val} />
                      ) : isMono ? (
                        <MonoPill value={String(val)} shorten={false} />
                      ) : (
                        <span className="value">{String(val)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={copyAllJson}
                  style={{ height: 28, fontSize: 11.5, gap: 6 }}
                >
                  <Icon name={copiedAll ? "check" : "copy"} size={12} />
                  <span>{copiedAll ? "JSON Copied" : "Copy Raw JSON"}</span>
                </button>
              </div>
              <pre
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 16,
                  fontSize: 12,
                  fontFamily: "IBM Plex Mono, monospace",
                  overflowX: "auto",
                  color: "var(--text)",
                  lineHeight: 1.6,
                }}
              >
                {JSON.stringify(record, null, 2)}
              </pre>
            </div>
          )}
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="detailFoot">
          <span>Carrier-grade telemetry verified</span>
          {actions && actions.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              {actions.map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`btn sm ${act.danger ? "danger" : act.primary ? "primary" : "secondary"}`}
                  onClick={act.onClick}
                >
                  {act.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
