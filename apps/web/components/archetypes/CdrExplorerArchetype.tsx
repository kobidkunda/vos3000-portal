"use client";
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { FilterBar } from "../shared/FilterBar";
import { DataTable, type DataTableColumn, MonoPill, CurrencyCell, PhonePill, DateCell } from "../shared/DataTable";
import { Drawer } from "../shared/Drawer";
import { ExportModal } from "../shared/ExportModal";
import { Status } from "../Status";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { RawJsonInspector } from "../shared/RawJsonInspector";

export interface CdrExplorerArchetypeProps {
  side: "Admin" | "Client";
  title?: string;
  purpose?: string;
  route?: string;
  initialRows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}

function formatDuration(seconds: number | string): string {
  const s = typeof seconds === "number" ? seconds : parseInt(String(seconds) || "0", 10);
  if (isNaN(s) || s <= 0) return "0s";
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}m ${rem}s (${s}s)`;
}

export function CdrExplorerArchetype({
  side,
  title = "CDR Explorer",
  purpose = "Customer-scoped call history and ClickHouse CDR exploration.",
  route = "/app/cdr",
  initialRows = [],
  kpis: initialKpis = [],
  source = "clickhouse (vos.cdr_events)",
  warnings: initialWarnings,
}: CdrExplorerArchetypeProps) {
  // Filter state
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`filter_search_${route}`) || "";
    }
    return "";
  });
  const [selectedPreset, setSelectedPreset] = useState("24h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`filter_status_${route}`) || "All Statuses";
    }
    return "All Statuses";
  });
  const [selectedGateway, setSelectedGateway] = useState("All Gateways");
  const [selectedTimezone, setSelectedTimezone] = useState("(UTC+05:30) Asia/Kolkata");

  // Gateway options dynamically loaded from database
  const [availableGateways, setAvailableGateways] = useState<string[]>([]);

  // Query and table state
  const [rows, setRows] = useState<any[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [activeRow, setActiveRow] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "sip" | "media" | "raw">("summary");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState("");

  // Pagination state
  const [pageSize, setPageSize] = useState(25);

  // Preserve search and status in sessionStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`filter_search_${route}`, searchTerm);
      sessionStorage.setItem(`filter_status_${route}`, selectedStatus);
    }
  }, [searchTerm, selectedStatus, route]);

  // Load real customer / admin mapping gateways dynamically from database
  useEffect(() => {
    let isMounted = true;
    async function loadGateways() {
      try {
        const endpoint = side === "Admin" ? "/api/v1/admin/gateways/mapping" : "/api/v1/gateways";
        const res: any = await api(endpoint);
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
        const names = new Set<string>();
        list.forEach((gw: any) => {
          const name = gw.name || gw.gateway_name || gw.mapping_gateway_id || gw.id;
          if (name) names.add(String(name).trim());
        });
        // Also add any gateway IDs present in initialRows
        initialRows.forEach((r: any) => {
          const gw = r.mapping_gateway_id || r.gateway;
          if (gw) names.add(String(gw).trim());
        });
        if (isMounted) {
          setAvailableGateways(Array.from(names).sort());
        }
      } catch {
        const names = new Set<string>();
        initialRows.forEach((r: any) => {
          const gw = r.mapping_gateway_id || r.gateway;
          if (gw) names.add(String(gw).trim());
        });
        if (isMounted && names.size > 0) {
          setAvailableGateways(Array.from(names).sort());
        }
      }
    }
    void loadGateways();
    return () => {
      isMounted = false;
    };
  }, [side, initialRows]);

  // Compute from/to dates for ClickHouse query based on preset
  const dateRange = useMemo(() => {
    const now = new Date();
    if (selectedPreset === "Today") {
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (selectedPreset === "24h") {
      const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (selectedPreset === "7d") {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (selectedPreset === "30d") {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from: from.toISOString(), to: now.toISOString() };
    }
    if (selectedPreset === "Custom" && customFrom) {
      return {
        from: new Date(customFrom).toISOString(),
        to: customTo ? new Date(customTo).toISOString() : now.toISOString(),
      };
    }
    return { from: undefined, to: undefined };
  }, [selectedPreset, customFrom, customTo]);

  // Fetch CDR records from ClickHouse API with live server-side filters
  const isFirstRender = useRef(true);
  const loadCdrData = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    try {
      const baseApi = side === "Admin" ? "/api/v1/admin/cdr" : "/api/v1/cdr";
      const params = new URLSearchParams();
      params.set("limit", "250");

      if (dateRange.from) params.set("from", dateRange.from);
      if (dateRange.to) params.set("to", dateRange.to);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedStatus !== "All Statuses") params.set("status", selectedStatus);
      if (selectedGateway !== "All Gateways") params.set("gateway", selectedGateway);

      const res: any = await api(`${baseApi}?${params.toString()}`);
      const items = Array.isArray(res?.data?.items)
        ? res.data.items
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setRows(items);

      setAvailableGateways((prev) => {
        const set = new Set(prev);
        items.forEach((r: any) => {
          const gw = r.mapping_gateway_id || r.gateway;
          if (gw) set.add(String(gw).trim());
        });
        return Array.from(set).sort();
      });
    } catch (e: any) {
      setFetchError(e.message || "Failed to load CDR records from ClickHouse.");
    } finally {
      setLoading(false);
    }
  }, [side, dateRange.from, dateRange.to, searchTerm, selectedStatus, selectedGateway]);

  // Debounced search / filter trigger
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (!initialRows || initialRows.length === 0) {
        void loadCdrData();
      }
      return;
    }
    const timer = setTimeout(() => {
      void loadCdrData();
    }, 280);
    return () => clearTimeout(timer);
  }, [loadCdrData, initialRows]);

  // Compute live KPIs dynamically from authentic ClickHouse records
  const dynamicKpis = useMemo(() => {
    const totalCalls = rows.length;
    const answeredCalls = rows.filter(
      (r) => r.answered === 1 || Number(r.duration) > 0 || /answered|200 ok/i.test(String(r.termination_reason ?? ""))
    ).length;
    const asr = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : "0.0";
    const totalSecs = rows.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
    const totalMins = (totalSecs / 60).toFixed(1);
    const acd = answeredCalls > 0 ? Math.round(totalSecs / answeredCalls) : 0;
    const totalCharge = rows.reduce((acc, r) => acc + (Number(r.customer_charge) || 0), 0).toFixed(4);

    return [
      {
        label: "CDR Records (Filtered)",
        value: `${totalCalls.toLocaleString()} Calls`,
        trend: selectedPreset === "All" ? "Full Dataset" : `Window: ${selectedPreset}`,
        color: "blue",
      },
      {
        label: "Answer Seizure Ratio (ASR)",
        value: `${answeredCalls} / ${totalCalls} (${asr}%)`,
        trend: Number(asr) >= 70 ? "Healthy Route Quality" : Number(asr) > 0 ? "Degraded Connect Rate" : "No Connects",
        color: Number(asr) >= 70 ? "green" : Number(asr) > 0 ? "amber" : "blue",
      },
      {
        label: "Billed Voice Traffic",
        value: `${totalMins} mins`,
        trend: `ACD: ${acd}s · Total: ${totalSecs}s`,
        color: "cyan",
      },
      {
        label: side === "Admin" ? "Total Revenue Billed" : "Total Customer Charge",
        value: `$${totalCharge} USD`,
        trend: "ClickHouse Verified",
        color: "amber",
      },
    ];
  }, [rows, selectedPreset, side]);

  // Telecom Columns Specification conforming to 012_cdr-explorer.md
  const columns: DataTableColumn[] = useMemo(() => {
    return [
      {
        key: "serial_number",
        header: "CDR SERIAL / BEGIN TIME",
        render: (row: any) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <MonoPill value={String(row.serial_number ?? "—")} shorten={true} />
            {row.begin_time && (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {new Date(row.begin_time).toLocaleDateString("en-GB", {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "answered",
        header: "RESULT / STATUS",
        render: (row: any) => {
          const isAns = row.answered === 1 || Number(row.duration) > 0 || /answered|200 ok/i.test(String(row.termination_reason ?? ""));
          const reason = String(row.termination_reason ?? "");
          if (isAns) {
            return (
              <span className="badge badge-online" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="check" size={12} />
                <span>200 OK · Answered</span>
              </span>
            );
          }
          if (/486|busy/i.test(reason)) {
            return (
              <span className="badge badge-amber" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="alert" size={12} />
                <span>486 Busy</span>
              </span>
            );
          }
          if (/503|congestion/i.test(reason)) {
            return (
              <span className="badge badge-danger" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="alert" size={12} />
                <span>503 Congestion</span>
              </span>
            );
          }
          if (/480|no answer/i.test(reason)) {
            return (
              <span className="badge" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icon name="clock" size={12} />
                <span>480 No Answer</span>
              </span>
            );
          }
          return (
            <span className="badge badge-danger" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="alert" size={12} />
              <span>{reason ? reason.slice(0, 20) : "Failed"}</span>
            </span>
          );
        },
      },
      {
        key: "caller",
        header: "CALLER (ANI)",
        render: (row: any) => <PhonePill value={String(row.caller ?? "—")} fullValue={String(row.caller ?? "")} />,
      },
      {
        key: "callee",
        header: "CALLEE (DNIS) / DESTINATION",
        render: (row: any) => (
          <div>
            <PhonePill value={String(row.callee ?? "—")} fullValue={String(row.callee ?? "")} />
            {row.area_name && (
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                {row.area_name}
              </div>
            )}
          </div>
        ),
      },
      {
        key: "duration",
        header: "DURATION",
        align: "right",
        render: (row: any) => (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
              {formatDuration(row.duration)}
            </div>
            {row.charged_duration !== undefined && row.charged_duration !== row.duration && (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                Billed: {row.charged_duration}s
              </div>
            )}
          </div>
        ),
      },
      {
        key: "customer_charge",
        header: "CHARGE",
        align: "right",
        render: (row: any) => <CurrencyCell amount={row.customer_charge ?? 0} currency="USD" />,
      },
      {
        key: "mapping_gateway_id",
        header: "GATEWAY",
        render: (row: any) => (
          <span className="mono" style={{ fontSize: 12, background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>
            {row.mapping_gateway_id || "Default Ingress"}
          </span>
        ),
      },
      {
        key: "termination_reason",
        header: "CAUSE / HANGUP",
        render: (row: any) => {
          const reason = String(row.termination_reason ?? "NORMAL_CLEARING");
          const hangup = row.hangup_side ? ` · ${row.hangup_side}` : "";
          return (
            <div style={{ maxWidth: 220, fontSize: 12 }} title={`${reason}${hangup}`}>
              <div style={{ color: "var(--text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {reason}
              </div>
              {row.hangup_side && (
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Hangup Side: <strong>{row.hangup_side}</strong>
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: "actions",
        header: "ACTIONS",
        align: "right",
        render: (row: any) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              type="button"
              className="btn secondary sm"
              style={{ height: 26, fontSize: 11.5, padding: "0 8px" }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveRow(row);
              }}
              title="Inspect Full Call Details & Signaling"
            >
              <Icon name="search" size={11} />
              <span>Inspect</span>
            </button>
            <Link
              href={side === "Admin" ? `/admin/cdr/${row.serial_number}` : `/app/cdr/${row.serial_number}`}
              onClick={(e) => e.stopPropagation()}
              className="btn primary sm"
              style={{ height: 26, fontSize: 11.5, padding: "0 8px" }}
              title="Open Dedicated CDR Workspace"
            >
              <Icon name="external" size={11} />
              <span>Detail</span>
            </Link>
          </div>
        ),
      },
    ];
  }, [side]);

  // Parse raw JSON safely without fake fallbacks
  const parsedRawJson = useMemo(() => {
    if (!activeRow?.raw_json) return null;
    try {
      if (typeof activeRow.raw_json === "object") return activeRow.raw_json;
      return JSON.parse(String(activeRow.raw_json));
    } catch {
      return null;
    }
  }, [activeRow]);

  // Telemetry metrics: ONLY show authentic values if present in record, otherwise "—" (NO fake IPs/metrics)
  const mediaMetrics = useMemo(() => {
    if (!activeRow) return null;
    const raw = parsedRawJson || {};
    return {
      codec: activeRow.codec || raw.codec || "—",
      mos_score: activeRow.mos_score !== undefined ? String(activeRow.mos_score) : raw.mos_score !== undefined ? String(raw.mos_score) : "—",
      packet_loss: activeRow.packet_loss !== undefined ? `${activeRow.packet_loss}%` : raw.packet_loss !== undefined ? `${raw.packet_loss}%` : "—",
      jitter_ms: activeRow.jitter_ms !== undefined ? `${activeRow.jitter_ms}ms` : raw.jitter_ms !== undefined ? `${raw.jitter_ms}ms` : "—",
      pdd_ms: activeRow.pdd_ms !== undefined && activeRow.pdd_ms !== null ? `${activeRow.pdd_ms} ms` : "—",
      connect_delay_ms: activeRow.connect_delay_ms !== undefined && activeRow.connect_delay_ms !== null ? `${activeRow.connect_delay_ms} ms` : "—",
      caller_ip: activeRow.caller_ip || raw.caller_ip || "—",
      callee_ip: activeRow.callee_ip || raw.callee_ip || "—",
    };
  }, [activeRow, parsedRawJson]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge">{rows.length.toLocaleString()} records loaded</span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions">
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void loadCdrData()}
            disabled={loading}
            title="Reload ClickHouse CDR stream"
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>{loading ? "Loading…" : "Refresh"}</span>
          </button>

          <Link
            href={side === "Admin" ? "/admin/cdr/exports" : "/app/cdr/exports"}
            className="btn secondary sm"
            title="Manage Async CDR Export Files"
          >
            <Icon name="download" size={13} />
            <span>Export Jobs</span>
          </Link>

          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsExportOpen(true)}
            title="Export CSV / JSON"
          >
            <Icon name="download" size={13} />
            <span>Export CDRs</span>
          </button>
        </div>
      </div>

      {/* Export Feedback Notification Banner */}
      {exportSuccessMsg && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <Icon name="check" size={16} />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Warnings & Fetch Error Banner */}
      {(fetchError || (initialWarnings && initialWarnings.length > 0)) && (
        <div className="card" style={{ marginBottom: 20, borderColor: fetchError ? "var(--danger)" : "var(--warning)", background: fetchError ? "var(--danger-bg)" : "var(--warning-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: fetchError ? "var(--danger)" : "var(--warning)", fontWeight: 650, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>{fetchError || initialWarnings?.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Real ClickHouse Dynamic KPIs */}
      <KpiGrid>
        {dynamicKpis.map((k, idx) => (
          <KpiCard
            key={idx}
            label={k.label}
            value={k.value}
            trend={k.trend}
            trendDirection={k.trend ? (k.trend.includes("-") || k.trend.includes("Degraded") ? "down" : "up") : "neutral"}
            icon={idx === 0 ? "dashboard" : idx === 1 ? "pulse" : idx === 2 ? "radar" : "dollar"}
            color={k.color as any}
          />
        ))}
      </KpiGrid>

      {/* Filter Bar with Live Server-Side Filtering */}
      <FilterBar
        searchPlaceholder="Filter Caller ANI, Callee DNIS, Gateway, Serial, Call-ID, Area…"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        datePresets={["Today", "24h", "7d", "30d", "All"]}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        timezones={[
          "(UTC+05:30) Asia/Kolkata",
          "(UTC+00:00) UTC",
          "(UTC-05:00) America/New_York",
          "(UTC+01:00) Europe/London",
          "(UTC+04:00) Asia/Dubai",
          "(UTC+08:00) Asia/Singapore",
        ]}
        selectedTimezone={selectedTimezone}
        onTimezoneChange={setSelectedTimezone}
        statusOptions={["All Statuses", "ANSWERED", "BUSY", "CONGESTION", "NO ANSWER", "FAILED"]}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        gatewayOptions={availableGateways.length > 0 ? availableGateways : undefined}
        selectedGateway={selectedGateway}
        onGatewayChange={setSelectedGateway}
        onReset={() => {
          setSearchTerm("");
          setSelectedPreset("24h");
          setSelectedStatus("All Statuses");
          setSelectedGateway("All Gateways");
          setCustomFrom("");
          setCustomTo("");
        }}
        onExportClick={() => setIsExportOpen(true)}
        totalCount={rows.length}
      />

      {/* ClickHouse CDR Data Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={(row) => setActiveRow(row)}
          pageSize={pageSize}
          isLoading={loading}
          emptyMessage="No ClickHouse CDR records match the current filter criteria."
        />
      </div>

      {/* Detailed Call Inspection Drawer */}
      <Drawer
        isOpen={Boolean(activeRow)}
        onClose={() => setActiveRow(null)}
        title="CDR Call Inspector"
        subtitle={`Serial: ${activeRow?.serial_number ?? "Selected Call"}`}
        record={activeRow}
        headerHero={
          activeRow ? (
            <div style={{ background: "rgba(37,99,235,0.06)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 750, color: "var(--text)" }}>
                      {activeRow.caller} &rarr; {activeRow.callee}
                    </span>
                    <span className={`badge ${activeRow.answered === 1 ? "badge-online" : "badge-amber"}`} style={{ fontSize: 11 }}>
                      {activeRow.answered === 1 ? "200 OK · Answered" : "Incomplete / Failed"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {activeRow.area_name || "International Destination"} · {formatDuration(activeRow.duration)} ·{" "}
                    <strong>${Number(activeRow.customer_charge || 0).toFixed(4)} USD</strong>
                  </div>
                </div>

                <Link
                  href={side === "Admin" ? `/admin/cdr/${activeRow.serial_number}` : `/app/cdr/${activeRow.serial_number}`}
                  className="btn primary sm"
                  style={{ height: 28 }}
                >
                  <Icon name="external" size={12} />
                  <span>Dedicated Page &rarr;</span>
                </Link>
              </div>

              {/* Sub-tabs in Drawer */}
              <div style={{ display: "flex", gap: 6, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                <button
                  type="button"
                  className={`btn ${activeTab === "summary" ? "primary" : "secondary"} sm`}
                  style={{ height: 24, fontSize: 11 }}
                  onClick={() => setActiveTab("summary")}
                >
                  Overview
                </button>
                <button
                  type="button"
                  className={`btn ${activeTab === "sip" ? "primary" : "secondary"} sm`}
                  style={{ height: 24, fontSize: 11 }}
                  onClick={() => setActiveTab("sip")}
                >
                  SIP Signaling
                </button>
                <button
                  type="button"
                  className={`btn ${activeTab === "media" ? "primary" : "secondary"} sm`}
                  style={{ height: 24, fontSize: 11 }}
                  onClick={() => setActiveTab("media")}
                >
                  RTP Quality
                </button>
                <button
                  type="button"
                  className={`btn ${activeTab === "raw" ? "primary" : "secondary"} sm`}
                  style={{ height: 24, fontSize: 11 }}
                  onClick={() => setActiveTab("raw")}
                >
                  Raw ClickHouse JSON
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === "sip" && (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 8, fontSize: 12 }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Calling Call-ID (Leg A):</span>
                    <div className="mono" style={{ fontSize: 11.5, wordBreak: "break-all", marginTop: 2, background: "var(--bg-card)", padding: 6, borderRadius: 4 }}>
                      {activeRow.calling_call_id || "—"}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Called Call-ID (Leg B):</span>
                    <div className="mono" style={{ fontSize: 11.5, wordBreak: "break-all", marginTop: 2, background: "var(--bg-card)", padding: 6, borderRadius: 4 }}>
                      {activeRow.called_call_id || "—"}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Caller IP:</span>
                      <div className="mono" style={{ fontSize: 11.5, marginTop: 2 }}>{mediaMetrics?.caller_ip}</div>
                    </div>
                    <div>
                      <span style={{ color: "var(--muted)" }}>Callee IP:</span>
                      <div className="mono" style={{ fontSize: 11.5, marginTop: 2 }}>{mediaMetrics?.callee_ip}</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "media" && (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Audio Codec:</span>
                    <div style={{ fontWeight: 650, marginTop: 2 }}>{mediaMetrics?.codec}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>MOS Quality Score:</span>
                    <div style={{ fontWeight: 650, marginTop: 2, color: mediaMetrics?.mos_score !== "—" ? "var(--success)" : "var(--muted)" }}>
                      {mediaMetrics?.mos_score !== "—" ? `${mediaMetrics?.mos_score} / 5.0` : "—"}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Post-Dial Delay (PDD):</span>
                    <div className="mono" style={{ marginTop: 2 }}>{mediaMetrics?.pdd_ms}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Connect Delay:</span>
                    <div className="mono" style={{ marginTop: 2 }}>{mediaMetrics?.connect_delay_ms}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Packet Loss:</span>
                    <div className="mono" style={{ marginTop: 2 }}>{mediaMetrics?.packet_loss}</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Jitter:</span>
                    <div className="mono" style={{ marginTop: 2 }}>{mediaMetrics?.jitter_ms}</div>
                  </div>
                </div>
              )}

              {activeTab === "raw" && (
                <div style={{ marginTop: 12 }}>
                  <RawJsonInspector data={activeRow} title="ClickHouse CDR Document" />
                </div>
              )}
            </div>
          ) : undefined
        }
        actions={[
          {
            label: "Open Dedicated CDR Page",
            primary: true,
            onClick: () => {
              if (activeRow?.serial_number) {
                window.location.href = side === "Admin" ? `/admin/cdr/${activeRow.serial_number}` : `/app/cdr/${activeRow.serial_number}`;
              }
            },
          },
          {
            label: "Export Single CDR",
            onClick: () => setIsExportOpen(true),
          },
        ]}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title={`Export ${title} Records`}
        totalRows={rows.length}
        columns={columns}
        data={rows}
        filenamePrefix={side === "Admin" ? "admin_cdr_clickhouse" : "client_cdr_clickhouse"}
      />
    </div>
  );
}
