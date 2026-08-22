"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { DataTable } from "../shared/DataTable";
import { ExportModal } from "../shared/ExportModal";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { parseTelecomPhone, getCountryName } from "@vos/shared";

export function RateLookupArchetype({
  side,
  title = "Rate Lookup & Commercial Margin Analyzer",
  purpose = "Real-time longest-prefix matching, multi-tier tariff estimation, and carrier cost vs customer margin simulator.",
  rows = [],
  kpis = [],
  source = "postgres (rates) + vos",
  warnings,
}: {
  side: "Admin" | "Client";
  title?: string;
  purpose?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}) {
  const [dialInput, setDialInput] = useState("+1 415 555 0199");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Rate Groups List for Selector
  const [groups, setGroups] = useState<any[]>([]);
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [carrierGroupId, setCarrierGroupId] = useState("");

  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Fetch all rate groups for admin
  useEffect(() => {
    if (side === "Admin") {
      void api("/api/v1/admin/rates/groups").then((res: any) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setGroups(list);
        const custGroup = list.find((g: any) => g.side === "customer");
        const carrGroup = list.find((g: any) => g.side === "carrier");
        if (custGroup) setCustomerGroupId(custGroup.id);
        if (carrGroup) setCarrierGroupId(carrGroup.id);
      }).catch(() => {});
    }
  }, [side]);

  // Debounced lookup query
  const performLookup = useCallback(async () => {
    const clean = dialInput.replace(/\D/g, "");
    if (clean.length < 1) return;

    setLookingUp(true);
    try {
      if (side === "Admin") {
        const res: any = await api("/api/v1/admin/rates/lookup", {
          method: "POST",
          body: JSON.stringify({
            destination: clean,
            customer_rate_group_id: customerGroupId || undefined,
            carrier_rate_group_id: carrierGroupId || undefined,
            duration_seconds: durationMinutes * 60,
          }),
        });
        setLookupResult(res?.data || null);
      } else {
        const res: any = await api(`/api/v1/rates/lookup?number=${encodeURIComponent(clean)}`);
        const item = Array.isArray(res?.data?.items) ? res.data.items[0] : res?.data;
        if (item) {
          const custRate = Number(item.rate_per_minute || 0);
          setLookupResult({
            destination: clean,
            matched_prefix: item.prefix,
            country_name: item.area_name,
            customer_rate: custRate.toFixed(6),
            customer_cost: (custRate * durationMinutes).toFixed(6),
          });
        } else {
          setLookupResult(null);
        }
      }
    } catch {
      setLookupResult(null);
    } finally {
      setLookingUp(false);
    }
  }, [dialInput, durationMinutes, customerGroupId, carrierGroupId, side]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void performLookup();
    }, 250);
    return () => clearTimeout(timer);
  }, [performLookup]);

  // Destination Metadata
  const phoneInfo = useMemo(() => {
    return parseTelecomPhone(dialInput);
  }, [dialInput]);

  const countryName = lookupResult?.country_name || phoneInfo.countryName || getCountryName(phoneInfo.country) || "International Destination";
  const matchedPrefix = lookupResult?.matched_prefix || phoneInfo.countryCallingCode || dialInput.replace(/\D/g, "").slice(0, 3) || "—";

  const custRate = Number(lookupResult?.customer_rate ?? 0);
  const custCost = Number(lookupResult?.customer_cost ?? custRate * durationMinutes);
  const carrRate = Number(lookupResult?.carrier_rate ?? 0);
  const carrCost = Number(lookupResult?.carrier_cost ?? carrRate * durationMinutes);

  const rateSpread = (custRate - carrRate).toFixed(6);
  const totalMarginProfit = (custCost - carrCost).toFixed(4);
  const marginPct = custRate > 0 ? (((custRate - carrRate) / custRate) * 100).toFixed(1) : "0.0";
  const isProfitable = custRate >= carrRate;

  const realRows = useMemo(() => {
    return rows && Array.isArray(rows) ? rows : [];
  }, [rows]);

  const columns = useMemo(() => {
    if (realRows.length > 0) return Object.keys(realRows[0]);
    return ["prefix", "destination", "rate", "billing", "asr", "status"];
  }, [realRows]);

  const quickPresets = [
    { label: "🇺🇸 US San Francisco", number: "+1 415 555 0199" },
    { label: "🇬🇧 UK London", number: "+44 20 7946 0991" },
    { label: "🇮🇳 India Mobile", number: "+91 98200 12345" },
    { label: "🇩🇪 Germany Frankfurt", number: "+49 69 1234 5678" },
    { label: "🇦🇪 UAE Dubai", number: "+971 4 312 3456" },
    { label: "🇸🇬 Singapore", number: "+65 6789 0123" },
  ];

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions">
          {side === "Admin" && (
            <>
              <Link href="/admin/rates/groups" className="btn secondary sm">
                <Icon name="rates" size={13} />
                <span>Rate Groups</span>
              </Link>
              <Link href="/admin/rates/imports" className="btn secondary sm">
                <Icon name="upload" size={13} />
                <span>Import Rates</span>
              </Link>
            </>
          )}
          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsExportOpen(true)}
          >
            <Icon name="download" size={13} />
            <span>Export Rate Deck</span>
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

      {/* Interactive Rate & Margin Analyzer Card */}
      <div className="card" style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 750, marginBottom: 16 }}>
          Live Longest-Prefix Matcher & Commercial Calculator
        </div>

        {/* Quick Country Presets */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600, alignSelf: "center" }}>
            Quick Dial Presets:
          </span>
          {quickPresets.map((p) => (
            <button
              key={p.number}
              type="button"
              className="btn secondary xs"
              onClick={() => setDialInput(p.number)}
              style={{ fontSize: 11.5 }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="grid2 rateLookupGrid" style={{ gap: 24 }}>
          {/* Left Column: Inputs & Group Selectors */}
          <div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>ENTER E.164 NUMBER OR DESTINATION PREFIX *</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                  <Icon name="call" size={18} />
                </span>
                <input
                  type="text"
                  className="input mono"
                  style={{ height: 46, fontSize: 16, fontWeight: 700, paddingLeft: 42 }}
                  placeholder="+1 415 555 0199 or 4420..."
                  value={dialInput}
                  onChange={(e) => setDialInput(e.target.value)}
                />
              </div>
            </div>

            {side === "Admin" && groups.length > 0 && (
              <div className="grid2" style={{ gap: 12, marginBottom: 16 }}>
                <div className="field">
                  <label>Customer Rate Group (Sell)</label>
                  <select
                    className="select sm"
                    value={customerGroupId}
                    onChange={(e) => setCustomerGroupId(e.target.value)}
                  >
                    <option value="">-- Active Customer Group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.side})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label>Carrier Cost Group (Buy)</label>
                  <select
                    className="select sm"
                    value={carrierGroupId}
                    onChange={(e) => setCarrierGroupId(e.target.value)}
                  >
                    <option value="">-- Carrier Cost Group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.side})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Duration Slider */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 650, marginBottom: 6 }}>
                <span style={{ color: "var(--muted)" }}>Simulated Call Duration:</span>
                <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                  {durationMinutes} minutes ({durationMinutes * 60} seconds)
                </strong>
              </div>
              <input
                type="range"
                min={1}
                max={60}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer", height: 6 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                <span>1m</span>
                <span>15m</span>
                <span>30m</span>
                <span>60m</span>
              </div>
            </div>
          </div>

          {/* Right Column: Commercial Estimation & Margin Card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(6,182,212,0.04))",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="badge badge-online">
                  <span className="statusDot pulse" />
                  {lookingUp ? "Evaluating Radix Trie…" : "VOS Longest-Prefix Match"}
                </span>
                <span className="mono" style={{ fontSize: 12.5, fontWeight: 800, color: "var(--primary)" }}>
                  Prefix: +{matchedPrefix}
                </span>
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>
                {countryName}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
                Longest-match algorithm resolved across active tariff tables.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Customer Sell Rate:</span>
                  <strong style={{ fontVariantNumeric: "tabular-nums", color: "var(--text)" }}>
                    ${custRate.toFixed(6)} / min
                  </strong>
                </div>

                {side === "Admin" && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Carrier Buy Cost:</span>
                    <span style={{ fontVariantNumeric: "tabular-nums", color: "#c084fc", fontWeight: 650 }}>
                      ${carrRate.toFixed(6)} / min
                    </span>
                  </div>
                )}

                {side === "Admin" && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Commercial Spread / Margin:</span>
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 750,
                        color: isProfitable ? "var(--success)" : "var(--danger)",
                      }}
                    >
                      {isProfitable ? `+${marginPct}% ($${rateSpread}/min)` : `${marginPct}% ($${rateSpread}/min)`}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Billing Interval:</span>
                  <span style={{ fontWeight: 600 }}>{lookupResult?.billing_cycle_seconds || "60"}s / 1s</span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 14,
                marginTop: 14,
                borderTop: "1px solid var(--border)",
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Estimated {durationMinutes}-Min Charge:</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
                  ${custCost.toFixed(4)} USD
                </div>
              </div>

              {side === "Admin" && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Net Gross Profit:</div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: isProfitable ? "var(--success)" : "var(--danger)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {isProfitable ? `+$${totalMarginProfit}` : `-$${Math.abs(Number(totalMarginProfit)).toFixed(4)}`}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Active Rates Matrix Catalog */}
      <div className="card">
        <div className="cardHead">
          <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
            Active Tariff Catalog Rates
          </div>
          <span className="badge">{realRows.length} active records</span>
        </div>

        <DataTable
          columns={columns}
          data={realRows}
          pageSize={10}
          emptyMessage={`No rate records found in database for this scope (Source: ${source}).`}
        />
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Rate Deck"
        totalRows={realRows.length}
        columns={columns}
        data={realRows}
        filenamePrefix="vos3000_rates_deck"
      />
    </div>
  );
}
