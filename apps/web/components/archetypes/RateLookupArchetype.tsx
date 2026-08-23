"use client";
/**
 * Rate Lookup — DETAIL archetype (docs/ui-template-pack/05_CLIENT_PAGES/027_rate-lookup.md)
 *
 * Client side performs longest-prefix price lookups against the customer's own rate
 * sheet via GET /api/v1/rates/lookup?number=... Admin side additionally simulates
 * sell-vs-buy margin via POST /api/v1/admin/rates/lookup. All monetary values are
 * formatted for display only; billing decisions always come from the backend.
 */
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { DataTable, DataTableColumn } from "../shared/DataTable";
import { ExportModal } from "../shared/ExportModal";
import { PhoneInput, CountryFlag } from "../shared/PhonePill";
import { Icon } from "../../lib/icons";
import { api, ApiClientError } from "../../lib/api";
import { parseTelecomPhone, getCountryName } from "@vos/shared";

type LookupRow = {
  prefix?: string | null;
  area_name?: string | null;
  country_code?: string | null;
  country_name?: string | null;
  rate_type?: string | null;
  rate_per_minute?: string | number | null;
  billing_cycle_seconds?: number | null;
  initial_interval?: number | null;
  increment_interval?: number | null;
};

const DEFAULT_NUMBER = "+1 415 555 0199";
const MIN_LOOKUP_DIGITS = 7;

// Preset numbers resolve against real prefixes in the active rate sheet.
const QUICK_PRESETS = [
  { label: "US · San Francisco", number: "+1 415 555 0199" },
  { label: "US · New York", number: "+1 212 555 0164" },
  { label: "UK · London", number: "+44 20 7946 0991" },
  { label: "UK · Manchester", number: "+44 161 555 0123" },
  { label: "India", number: "+91 98200 12345" },
  { label: "Singapore", number: "+65 6789 0123" },
];

/** Accepts flat arrays or legacy [[row,...]] page payloads; drops non-objects. */
function normalizeRateRows(input: unknown): LookupRow[] {
  let list: unknown[] = [];
  if (Array.isArray(input)) {
    list = input.length === 1 && Array.isArray(input[0]) ? (input[0] as unknown[]) : input;
  }
  return list.filter((r): r is LookupRow => !!r && typeof r === "object");
}

function fmtMoney(value: number, maxFrac = 4): string {
  return Number.isFinite(value)
    ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: maxFrac })
    : "0.00";
}

function fmtRate(value: number): string {
  return Number.isFinite(value) ? value.toFixed(5) : "0.00000";
}

function KVCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px 14px", minWidth: 0, background: "var(--surface)" }}>
      <div
        style={{
          fontSize: 10.5,
          textTransform: "uppercase",
          letterSpacing: "0.07em",
          color: "var(--muted)",
          fontWeight: 650,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text)", fontWeight: 600 }}>{children}</div>
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div style={{ padding: 14, display: "grid", gap: 10 }}>
      <div className="skeletonPulse" style={{ height: 13, width: "38%" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <div className="skeletonPulse" style={{ height: 36 }} />
        <div className="skeletonPulse" style={{ height: 36 }} />
        <div className="skeletonPulse" style={{ height: 36 }} />
        <div className="skeletonPulse" style={{ height: 36 }} />
      </div>
    </div>
  );
}

export function RateLookupArchetype({
  side,
  title = "Rate Lookup",
  purpose = "Instant price lookup for a called number.",
  rows = [],
  source = "postgres",
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
  const isAdmin = side === "Admin";

  const [dialInput, setDialInput] = useState(DEFAULT_NUMBER);
  const [durationMinutes, setDurationMinutes] = useState(5);

  // Customer's full rate sheet powers the catalog table (and survives legacy payloads).
  const [catalogRows, setCatalogRows] = useState<LookupRow[]>(() => normalizeRateRows(rows));
  useEffect(() => setCatalogRows(normalizeRateRows(rows)), [rows]);

  // Admin-only rate-group selectors for sell/buy simulation.
  const [groups, setGroups] = useState<any[]>([]);
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [carrierGroupId, setCarrierGroupId] = useState("");

  const [lookupResult, setLookupResult] = useState<LookupRow | null>(null);
  const [adminMatch, setAdminMatch] = useState<{ rate_per_minute?: string | number | null } | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [errorRequestId, setErrorRequestId] = useState<string | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const requestSeq = useRef(0);
  const lastQuery = useRef<string>("");

  useEffect(() => {
    if (!isAdmin) return;
    void api("/api/v1/admin/rates/groups")
      .then((res: any) => {
        const list: any[] = Array.isArray(res?.data) ? res.data : [];
        setGroups(list);
        const custGroup = list.find((g: any) => g.side === "customer");
        const carrGroup = list.find((g: any) => g.side === "carrier");
        if (custGroup) setCustomerGroupId(custGroup.id);
        if (carrGroup) setCarrierGroupId(carrGroup.id);
      })
      .catch(() => {});
  }, [isAdmin]);

  const cleanDigits = useMemo(() => dialInput.replace(/\D/g, ""), [dialInput]);
  const canLookup = cleanDigits.length >= MIN_LOOKUP_DIGITS;
  const durationSeconds = Math.max(0, Math.round(durationMinutes * 60));

  const performLookup = useCallback(async () => {
    if (!canLookup) {
      setLookupResult(null);
      setAdminMatch(null);
      setLookupError(null);
      setErrorRequestId(undefined);
      setLookingUp(false);
      return;
    }
    const mySeq = ++requestSeq.current;
    const queryKey = JSON.stringify([cleanDigits, durationSeconds, customerGroupId, carrierGroupId]);
    if (queryKey === lastQuery.current) return;
    lastQuery.current = queryKey;

    setLookingUp(true);
    try {
      if (isAdmin) {
        const res: any = await api("/api/v1/admin/rates/lookup", {
          method: "POST",
          body: JSON.stringify({
            destination: cleanDigits,
            customer_rate_group_id: customerGroupId || undefined,
            carrier_rate_group_id: carrierGroupId || undefined,
            duration_seconds: durationSeconds,
          }),
        });
        if (requestSeq.current !== mySeq) return;
        const data = res?.data ?? {};
        setAdminMatch(data.customer_match ?? null);
        setLookupResult(data.customer_match ?? null);
      } else {
        const res: any = await api(`/api/v1/rates/lookup?number=${encodeURIComponent(cleanDigits)}`);
        if (requestSeq.current !== mySeq) return;
        const items = res?.data?.items;
        const item = Array.isArray(items) ? items[0] ?? null : res?.data ?? null;
        setLookupResult(item);
      }
      setLookupError(null);
      setErrorRequestId(undefined);
      setLastUpdatedAt(new Date());
    } catch (e: any) {
      if (requestSeq.current !== mySeq) return;
      setLookupResult(null);
      setAdminMatch(null);
      setLookupError(e?.message || "Rate lookup failed. Check your connection and try again.");
      const ridVal = e instanceof ApiClientError ? e.request_id : undefined;
      setErrorRequestId(typeof ridVal === "string" ? ridVal : undefined);
    } finally {
      if (requestSeq.current === mySeq) setLookingUp(false);
    }
  }, [canLookup, cleanDigits, durationSeconds, customerGroupId, carrierGroupId, isAdmin]);

  // Debounced lookup — safe read query only, never a submit.
  useEffect(() => {
    const timer = setTimeout(() => void performLookup(), 300);
    return () => clearTimeout(timer);
  }, [performLookup]);

  const phoneInfo = useMemo(() => parseTelecomPhone(dialInput), [dialInput]);

  // ---- Derived commercial values (display-only math on backend numbers) ----
  const custRate = Number(lookupResult?.rate_per_minute ?? NaN);
  const hasRate = lookupResult != null && Number.isFinite(custRate);
  const initialInterval = Number(lookupResult?.initial_interval ?? lookupResult?.billing_cycle_seconds ?? 60) || 60;
  const incrementInterval = Number(lookupResult?.increment_interval ?? 1) || 1;
  const billableSeconds =
    durationSeconds <= initialInterval
      ? initialInterval
      : initialInterval + Math.ceil((durationSeconds - initialInterval) / incrementInterval) * incrementInterval;
  const custCost = hasRate ? (billableSeconds / 60) * custRate : 0;

  const carrRate = adminMatch ? Number(adminMatch.rate_per_minute ?? NaN) : NaN;
  const hasCarrier = Number.isFinite(carrRate);
  const carrCost = hasCarrier ? (billableSeconds / 60) * carrRate : 0;
  const marginPerMin = hasCarrier ? custRate - carrRate : NaN;
  const marginTotal = hasCarrier ? custCost - carrCost : NaN;
  const marginPct = hasCarrier && custRate > 0 ? ((custRate - carrRate) / custRate) * 100 : 0;
  const isProfitable = hasCarrier ? marginPerMin >= 0 && marginTotal >= 0 : false;

  const destTitle =
    lookupResult?.area_name ||
    lookupResult?.country_name ||
    phoneInfo.countryName ||
    getCountryName(phoneInfo.country) ||
    (canLookup ? "Unmapped destination" : "Enter a destination");
  const flagCode = lookupResult?.country_code || phoneInfo.country || undefined;
  const matchedPrefix = lookupResult?.prefix || null;
  const rateType = lookupResult?.rate_type || "standard";
  const normalizedDisplay =
    canLookup && phoneInfo.normalized && phoneInfo.normalized.startsWith("+")
      ? phoneInfo.normalized
      : canLookup
        ? `+${cleanDigits}`
        : "";

  const copySummary = useCallback(async () => {
    if (!hasRate) return;
    const lines = [
      "VOS3000 rate lookup",
      `Number: ${normalizedDisplay}`,
      `Destination: ${destTitle}`,
      `Matched prefix: ${matchedPrefix ? `+${matchedPrefix}` : "—"}`,
      `Rate type: ${rateType}`,
      `Rate: $${fmtRate(custRate)} / min`,
      `Billing: ${initialInterval}s initial + ${incrementInterval}s increments`,
      `${durationMinutes} min estimated cost: $${fmtMoney(custCost)} USD`,
    ];
    if (isAdmin && hasCarrier) {
      lines.push(
        `Carrier cost: $${fmtRate(carrRate)} / min`,
        `Margin: ${isProfitable ? "+" : ""}${marginPct.toFixed(1)}% ($${fmtMoney(marginPerMin)} / min)`
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — silent, non-critical */
    }
  }, [hasRate, normalizedDisplay, destTitle, matchedPrefix, rateType, custRate, initialInterval, incrementInterval, durationMinutes, custCost, isAdmin, hasCarrier, carrRate, marginPct, marginPerMin, isProfitable]);

  const catalogColumns: DataTableColumn<LookupRow>[] = useMemo(
    () => [
      {
        key: "prefix",
        header: "Prefix",
        sortable: true,
        category: "technical",
        render: (r) => <span className="mono">{r.prefix ?? "—"}</span>,
      },
      {
        key: "area_name",
        header: "Destination",
        sortable: true,
        render: (r) => (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <CountryFlag countryCode={r.country_code ?? undefined} countryName={r.country_name ?? undefined} size="sm" showTooltip={false} />
            {r.area_name ?? r.country_name ?? "—"}
          </span>
        ),
      },
      {
        key: "rate_type",
        header: "Type",
        render: (r) => <span style={{ textTransform: "capitalize" }}>{r.rate_type ?? "standard"}</span>,
      },
      {
        key: "rate_per_minute",
        header: "Rate / min",
        align: "right",
        sortable: true,
        render: (r) => <span className="mono">${fmtRate(Number(r.rate_per_minute))}</span>,
      },
      {
        key: "billing",
        header: "Billing init/inc",
        align: "right",
        render: (r) => (
          <span className="mono">
            {Number(r.initial_interval ?? r.billing_cycle_seconds ?? 60)}/{Number(r.increment_interval ?? 1)}
          </span>
        ),
      },
    ],
    []
  );

  const statusBadge = lookingUp
    ? { cls: "badge-degraded", label: "Looking up…" }
    : lookupError
      ? { cls: "badge-failed", label: "Lookup failed" }
      : hasRate
        ? { cls: "badge-online", label: "Rate matched" }
        : canLookup
          ? { cls: "badge-degraded", label: "No rate found" }
          : { cls: "", label: "Awaiting number" };

  return (
    <div className="content">
      {/* Page header */}
      <div className="pageHead" style={{ marginBottom: 18 }}>
        <div>
          <h1>{title}</h1>
          <p>{purpose} Longest-prefix matching against the active tariff tables.</p>
        </div>
        <div className="pageActions">
          {isAdmin && (
            <>
              <Link href="/admin/rates/groups" className="btn sm">
                <Icon name="rates" size={13} />
                <span>Rate Groups</span>
              </Link>
              <Link href="/admin/rates/imports" className="btn sm">
                <Icon name="filetext" size={13} />
                <span>Import Rates</span>
              </Link>
            </>
          )}
          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsExportOpen(true)}
            disabled={!catalogRows.length}
          >
            <Icon name="download" size={13} />
            <span>Export Rate Sheet</span>
          </button>
        </div>
      </div>

      {/* Degraded-source warning */}
      {warnings && warnings.length > 0 && (
        <div
          className="card"
          role="status"
          style={{
            marginBottom: 16,
            borderLeft: "3px solid var(--warning)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <span style={{ color: "var(--warning)", marginTop: 1 }}>
            <Icon name="alert" size={15} />
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 650 }}>Rate data may be incomplete</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{warnings.join(" · ")}</div>
          </div>
        </div>
      )}

      {/* Lookup workspace */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="cardHead">
          <div>
            <div className="cardTitle">Price Lookup</div>
            <div className="cardSub">Enter a destination number — the longest matching prefix wins.</div>
          </div>
          <span className={`badge ${statusBadge.cls}`}>
            {statusBadge.cls === "badge-online" && <span className="statusDot" />}
            {statusBadge.label}
          </span>
        </div>

        <div className="cardBody">
          <div className="grid2 rateLookupGrid" style={{ gap: 24 }}>
            {/* Left: query inputs */}
            <div>
              <div className="field" style={{ marginBottom: 14 }}>
                <label htmlFor="rate-lookup-number">Destination number</label>
                <PhoneInput
                  id="rate-lookup-number"
                  name="rate-lookup-number"
                  value={dialInput}
                  onChange={setDialInput}
                  placeholder="+1 415 555 0199 or 442079460991"
                />
                <div className="help" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>
                    Normalized:{" "}
                    <span className="mono" style={{ color: canLookup ? "var(--text)" : "var(--muted)" }}>
                      {normalizedDisplay || "—"}
                    </span>
                  </span>
                  {!canLookup && <span style={{ color: "var(--muted)" }}>{cleanDigits.length}/{MIN_LOOKUP_DIGITS} digits min</span>}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>Quick presets</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {QUICK_PRESETS.map((p) => (
                    <button
                      key={p.number}
                      type="button"
                      onClick={() => setDialInput(p.number)}
                      aria-label={`Look up example number ${p.number}`}
                      style={{
                        height: 28,
                        padding: "0 10px",
                        borderRadius: "var(--radius-full)",
                        border: `1px solid ${dialInput === p.number ? "var(--primary)" : "var(--border)"}`,
                        background: dialInput === p.number ? "var(--primary-soft)" : "var(--surface)",
                        color: dialInput === p.number ? "var(--primary-hover)" : "var(--text2)",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: isAdmin && groups.length > 0 ? 16 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <label htmlFor="rate-lookup-duration" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text2)" }}>
                    Simulated call duration
                  </label>
                  <strong style={{ fontVariantNumeric: "tabular-nums", fontSize: 12.5 }}>
                    {durationMinutes} min · {durationSeconds}s
                  </strong>
                </div>
                <input
                  id="rate-lookup-duration"
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--primary)", cursor: "pointer", height: 22 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }} aria-hidden="true">
                  <span>1m</span>
                  <span>15m</span>
                  <span>30m</span>
                  <span>60m</span>
                </div>
              </div>

              {isAdmin && groups.length > 0 && (
                <div className="grid2" style={{ gap: 12, gridTemplateColumns: "1fr 1fr" }}>
                  <div className="field">
                    <label htmlFor="rate-lookup-sell-group">Sell from (customer)</label>
                    <select
                      id="rate-lookup-sell-group"
                      className="select"
                      value={customerGroupId}
                      onChange={(e) => setCustomerGroupId(e.target.value)}
                    >
                      <option value="">Default active group</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.side})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="rate-lookup-buy-group">Buy from (carrier)</label>
                    <select
                      id="rate-lookup-buy-group"
                      className="select"
                      value={carrierGroupId}
                      onChange={(e) => setCarrierGroupId(e.target.value)}
                    >
                      <option value="">No carrier comparison</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.side})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Right: result panel */}
            <div
              style={{
                border: `1px solid ${lookupError ? "var(--danger-border)" : "var(--border)"}`,
                borderRadius: "var(--radius)",
                background: "var(--surface2)",
                padding: 16,
                minHeight: 260,
                display: "flex",
                flexDirection: "column",
                overflowWrap: "anywhere",
              }}
              aria-live="polite"
            >
              {lookingUp && !hasRate ? (
                <ResultSkeleton />
              ) : lookupError ? (
                <div style={{ margin: "auto", textAlign: "center", maxWidth: 320 }}>
                  <span style={{ color: "var(--danger)" }}>
                    <Icon name="alert" size={22} />
                  </span>
                  <div style={{ fontSize: 13.5, fontWeight: 650, marginTop: 8, color: "var(--danger)" }}>Lookup failed</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{lookupError}</div>
                  {errorRequestId && (
                    <div className="mono" style={{ fontSize: 11, marginTop: 8, color: "var(--muted)" }}>
                      request_id: {errorRequestId}
                    </div>
                  )}
                </div>
              ) : !canLookup ? (
                <div style={{ margin: "auto", textAlign: "center", maxWidth: 300 }}>
                  <span style={{ color: "var(--muted)" }}>
                    <Icon name="search" size={22} />
                  </span>
                  <div style={{ fontSize: 13.5, fontWeight: 650, marginTop: 8 }}>Enter a destination number</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    Type an E.164 number (at least {MIN_LOOKUP_DIGITS} digits) or pick a preset to see its price.
                  </div>
                </div>
              ) : !hasRate ? (
                <div style={{ margin: "auto", textAlign: "center", maxWidth: 320 }}>
                  <span style={{ color: "var(--warning)" }}>
                    <Icon name="help" size={22} />
                  </span>
                  <div style={{ fontSize: 13.5, fontWeight: 650, marginTop: 8 }}>No rate configured</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    Your active rate sheet has no price for prefix{" "}
                    <span className="mono">+{matchedPrefix ?? cleanDigits.slice(0, 3)}…</span>. Contact support to request
                    coverage for this destination.
                  </div>
                  {errorRequestId && (
                    <div className="mono" style={{ fontSize: 11, marginTop: 8, color: "var(--muted)" }}>
                      request_id: {errorRequestId}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Identity */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CountryFlag countryCode={flagCode} countryName={destTitle} callingCode={phoneInfo.countryCallingCode} size="lg" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 750, lineHeight: 1.25 }}>{destTitle}</div>
                      <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                        {normalizedDisplay}
                      </div>
                    </div>
                  </div>

                  {/* Key values */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                      gap: 1,
                      background: "var(--border)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                      marginTop: 14,
                    }}
                  >
                    <KVCell label="Matched prefix">
                      <span className="mono">+{matchedPrefix ?? "—"}</span>
                    </KVCell>
                    <KVCell label="Rate type">{rateType}</KVCell>
                    <KVCell label="Billing init/inc">
                      <span className="mono">
                        {initialInterval}/{incrementInterval}s
                      </span>
                    </KVCell>
                    <KVCell label={`Billable (${durationSeconds}s dialed)`}>
                      <span className="mono">{billableSeconds}s</span>
                    </KVCell>
                  </div>

                  {/* Cost summary */}
                  <div style={{ marginTop: 14, display: "grid", gap: 8, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <span style={{ color: "var(--muted)" }}>Your rate</span>
                      <strong style={{ fontVariantNumeric: "tabular-nums" }}>${fmtRate(custRate)} / min</strong>
                    </div>
                    {isAdmin && hasCarrier && (
                      <>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "var(--muted)" }}>Carrier cost</span>
                          <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--text2)" }}>${fmtRate(carrRate)} / min</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <span style={{ color: "var(--muted)" }}>Margin</span>
                          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 650, color: isProfitable ? "var(--success)" : "var(--danger)" }}>
                            {isProfitable ? "+" : ""}
                            {marginPct.toFixed(1)}% · ${fmtMoney(marginPerMin)} / min
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: "auto",
                      paddingTop: 14,
                      borderTop: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Estimated {durationMinutes}-minute cost</div>
                      <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                        ${fmtMoney(custCost)}
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--muted)" }}> USD</span>
                      </div>
                      {isAdmin && hasCarrier && (
                        <div style={{ fontSize: 12, color: isProfitable ? "var(--success)" : "var(--danger)", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                          {isProfitable ? "+" : "−"}${fmtMoney(Math.abs(marginTotal))} gross profit
                        </div>
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
                      <button type="button" className="btn sm" onClick={() => void copySummary()} disabled={!hasRate}>
                        <Icon name={copied ? "check" : "copy"} size={13} />
                        <span>{copied ? "Copied" : "Copy result"}</span>
                      </button>
                      <span style={{ fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                        {lastUpdatedAt ? `Updated ${lastUpdatedAt.toLocaleTimeString()}` : `Source: ${source}`}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer rate-sheet catalog */}
      <div className="card">
        <div className="cardHead">
          <div>
            <div className="cardTitle">Your Rate Sheet</div>
            <div className="cardSub">
              All active prices in your tariff group · {catalogRows.length} destinations
              {lastUpdatedAt ? ` · updated ${lastUpdatedAt.toLocaleTimeString()}` : ""}
            </div>
          </div>
          <span className="badge">{catalogRows.length} rates</span>
        </div>
        <DataTable
          columns={catalogColumns}
          data={catalogRows}
          pageSize={10}
          isLoading={lookingUp && !catalogRows.length}
          emptyMessage={
            lookupError
              ? `Rate sheet unavailable: ${lookupError}`
              : "No rates are configured for your account yet. Contact support to activate your tariff group."
          }
        />
      </div>

      {/* Export modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Rate Sheet"
        totalRows={catalogRows.length}
        columns={catalogColumns}
        data={catalogRows}
        filenamePrefix="vos3000_rate_sheet"
      />
    </div>
  );
}
