"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { FilterBar } from "../shared/FilterBar";
import { DataTable, type DataTableColumn, MonoPill, CurrencyCell, PhonePill, DateCell } from "../shared/DataTable";
import { Drawer } from "../shared/Drawer";
import { ExportModal } from "../shared/ExportModal";
import { Status } from "../Status";
import { QualityMeter } from "../Chart";
import { Icon } from "../../lib/icons";
import { RawJsonInspector } from "../shared/RawJsonInspector";

export interface RecentCallsArchetypeProps {
  side: "Admin" | "Client";
  title?: string;
  purpose?: string;
  route?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
  onRefresh?: () => void;
}

function formatDuration(seconds: number | string): string {
  const s = typeof seconds === "number" ? seconds : parseInt(String(seconds) || "0", 10);
  if (isNaN(s) || s <= 0) return "0s";
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}m ${rem}s (${s}s)`;
}

export function RecentCallsArchetype({
  side,
  title = "Recent Calls",
  purpose = "Fast view of recent records and live CDR streaming.",
  route = "/app/cdr/recent",
  rows = [],
  kpis = [],
  source = "clickhouse (vos.cdr_events)",
  warnings,
  onRefresh,
}: RecentCallsArchetypeProps) {
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`filter_search_${route}`) || "";
    }
    return "";
  });
  const [selectedPreset, setSelectedPreset] = useState("24h");
  const [selectedStatus, setSelectedStatus] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`filter_status_${route}`) || "All Statuses";
    }
    return "All Statuses";
  });
  const [selectedGateway, setSelectedGateway] = useState("All Gateways");
  const [selectedTimezone, setSelectedTimezone] = useState("(UTC+05:30) Asia/Kolkata");
  const [activeRow, setActiveRow] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "sip" | "media" | "raw">("summary");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Preserve search and status filter across navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`filter_search_${route}`, searchTerm);
      sessionStorage.setItem(`filter_status_${route}`, selectedStatus);
    }
  }, [searchTerm, selectedStatus, route]);

  // Real data only from ClickHouse props
  const realData = useMemo(() => {
    return rows && Array.isArray(rows) ? rows : [];
  }, [rows]);

  // Extract unique gateways from real rows
  const gatewayOptions = useMemo(() => {
    const set = new Set<string>();
    realData.forEach((r) => {
      const gw = r.mapping_gateway_id ?? r.gateway ?? r.routing_gateway_id;
      if (gw) set.add(String(gw));
    });
    return Array.from(set);
  }, [realData]);

  // Filter rows by search term, status and gateway
  const filteredRows = useMemo(() => {
    return realData.filter((r) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        [
          r.serial_number,
          r.caller,
          r.callee,
          r.mapping_gateway_id,
          r.routing_gateway_id,
          r.calling_call_id,
          r.called_call_id,
          r.area_name,
          r.termination_reason,
          r.caller_ip,
          r.callee_ip,
        ].some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q));

      let matchStatus = true;
      if (selectedStatus !== "All Statuses") {
        const isAns = r.answered === 1 || Number(r.duration) > 0 || /answered|200 ok/i.test(String(r.termination_reason ?? ""));
        const isBusy = /busy|486/i.test(String(r.termination_reason ?? ""));
        const isCongestion = /congestion|503|service unavailable/i.test(String(r.termination_reason ?? ""));
        const isNoAnswer = /no answer|480|temporarily unavailable/i.test(String(r.termination_reason ?? ""));

        if (selectedStatus === "ANSWERED") matchStatus = isAns;
        else if (selectedStatus === "BUSY") matchStatus = isBusy;
        else if (selectedStatus === "CONGESTION") matchStatus = isCongestion;
        else if (selectedStatus === "NO ANSWER") matchStatus = isNoAnswer;
        else if (selectedStatus === "FAILED") matchStatus = !isAns;
      }

      const matchGateway =
        selectedGateway === "All Gateways" ||
        String(r.mapping_gateway_id ?? r.gateway ?? "").toLowerCase() === selectedGateway.toLowerCase();

      return matchSearch && matchStatus && matchGateway;
    });
  }, [realData, searchTerm, selectedStatus, selectedGateway]);

  // Compute live KPIs dynamically from ClickHouse records
  const dynamicKpis = useMemo(() => {
    if (kpis && kpis.length >= 4) return kpis;
    const totalCalls = realData.length;
    const answeredCalls = realData.filter(
      (r) => r.answered === 1 || Number(r.duration) > 0 || /answered|200 ok/i.test(String(r.termination_reason ?? ""))
    ).length;
    const asr = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : "0.0";
    const totalSecs = realData.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
    const totalMins = (totalSecs / 60).toFixed(1);
    const acd = answeredCalls > 0 ? Math.round(totalSecs / answeredCalls) : 0;
    const totalCharge = realData.reduce((acc, r) => acc + (Number(r.customer_charge) || 0), 0).toFixed(4);

    return [
      { label: "Recent Records", value: `${totalCalls} Calls`, status: totalCalls > 0 ? "healthy" : undefined },
      {
        label: "Answer Ratio (ASR)",
        value: `${answeredCalls} / ${totalCalls} (${asr}%)`,
        status: Number(asr) >= 70 ? "healthy" : Number(asr) > 0 ? "warning" : undefined,
      },
      { label: "Traffic Duration", value: `${totalMins} mins (ACD ${acd}s)`, status: "info" },
      { label: "Customer Charge", value: `$${totalCharge}`, status: "healthy" },
    ];
  }, [kpis, realData]);

  // Columns specification fulfilling F01..F08
  const columns: DataTableColumn[] = useMemo(() => {
    const list: DataTableColumn[] = [
      {
        key: "serial_number",
        header: "CDR SERIAL / ID",
        render: (row: any) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <MonoPill value={String(row.serial_number ?? "—")} shorten={true} />
            {row.begin_time && (
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {new Date(row.begin_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
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
              <span>{reason ? reason.slice(0, 18) : "Failed"}</span>
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
        header: "CALLEE (DNIS)",
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
            {row.mapping_gateway_id ?? "Default"}
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
                  Hangup: <strong>{row.hangup_side}</strong>
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
              title="Inspect Full SIP Signaling & Quality Metrics"
            >
              <Icon name="search" size={11} />
              <span>Inspect</span>
            </button>
            <Link
              href={side === "Admin" ? `/admin/cdr/${row.serial_number}` : `/app/cdr/${row.serial_number}`}
              onClick={(e) => e.stopPropagation()}
              className="btn primary sm"
              style={{ height: 26, fontSize: 11.5, padding: "0 8px" }}
              title="Open Dedicated CDR Page"
            >
              <Icon name="external" size={11} />
              <span>Detail</span>
            </Link>
          </div>
        ),
      },
    ];

    return list;
  }, [side]);

  // Parse raw_json if available
  const parsedRawJson = useMemo(() => {
    if (!activeRow?.raw_json) return null;
    try {
      if (typeof activeRow.raw_json === "object") return activeRow.raw_json;
      return JSON.parse(String(activeRow.raw_json));
    } catch {
      return null;
    }
  }, [activeRow]);

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
            <span className="badge">{filteredRows.length.toLocaleString()} records</span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions">
          {onRefresh && (
            <button type="button" className="btn secondary sm" onClick={onRefresh} title="Reload ClickHouse stream">
              <Icon name="refresh" size={13} />
              <span>Refresh</span>
            </button>
          )}

          <button type="button" className="btn secondary sm" onClick={() => setIsExportOpen(true)} title="Export CSV / JSON">
            <Icon name="download" size={13} />
            <span>Export CDRs</span>
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

      {/* Real ClickHouse Dynamic KPIs */}
      <KpiGrid>
        {dynamicKpis.map((k, idx) => (
          <KpiCard
            key={idx}
            label={k.label ?? "Metric"}
            value={k.value ?? "0"}
            trend={k.trend}
            trendDirection={k.trend ? (k.trend.includes("-") ? "down" : "up") : "neutral"}
            icon={idx === 0 ? "dashboard" : idx === 1 ? "pulse" : idx === 2 ? "radar" : "dollar"}
            color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "cyan" : "amber"}
          />
        ))}
      </KpiGrid>

      {/* Filter Bar */}
      <FilterBar
        searchPlaceholder="Search Caller ANI, Callee DNIS, Gateway, Serial, Call-ID, Area…"
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
        ]}
        selectedTimezone={selectedTimezone}
        onTimezoneChange={setSelectedTimezone}
        statusOptions={["All Statuses", "ANSWERED", "NO ANSWER", "CONGESTION", "BUSY", "FAILED"]}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        gatewayOptions={gatewayOptions.length ? gatewayOptions : undefined}
        selectedGateway={selectedGateway}
        onGatewayChange={setSelectedGateway}
        onReset={() => {
          setSearchTerm("");
          setSelectedPreset("24h");
          setSelectedStatus("All Statuses");
          setSelectedGateway("All Gateways");
        }}
        onExportClick={() => setIsExportOpen(true)}
        totalCount={filteredRows.length}
      />

      {/* Real ClickHouse CDR Table */}
      <DataTable
        columns={columns}
        data={filteredRows}
        onRowClick={(row) => setActiveRow(row)}
        pageSize={15}
        emptyMessage="No recent ClickHouse CDR records match the current filter criteria."
      />

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
                      {activeRow.answered === 1 ? "200 OK" : "Incomplete"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {activeRow.area_name || "International Destination"} · {formatDuration(activeRow.duration)} ·{" "}
                    <strong>${Number(activeRow.customer_charge || 0).toFixed(4)}</strong>
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
                  Raw JSON
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
                    <div style={{ fontWeight: 650, marginTop: 2, color: "var(--success)" }}>
                      {mediaMetrics?.mos_score} / 5.0
                    </div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Post-Dial Delay (PDD):</span>
                    <div className="mono" style={{ marginTop: 2 }}>{mediaMetrics?.pdd_ms} ms</div>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Connect Delay:</span>
                    <div className="mono" style={{ marginTop: 2 }}>{mediaMetrics?.connect_delay_ms} ms</div>
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
                  <RawJsonInspector data={activeRow} title={side === "Admin" ? "ClickHouse CDR Schema" : "CDR Record Fields"} />
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
        title="Export Recent ClickHouse CDRs"
        totalRows={filteredRows.length}
        columns={columns}
        data={filteredRows}
        filenamePrefix="recent_cdr_clickhouse"
      />
    </div>
  );
}
