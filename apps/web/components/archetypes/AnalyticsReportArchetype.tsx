"use client";
import React, { useState, useMemo } from "react";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { MultiSeriesChart } from "../Chart";
import { FilterBar } from "../shared/FilterBar";
import { DataTable } from "../shared/DataTable";
import { ExportModal } from "../shared/ExportModal";
import { Icon } from "../../lib/icons";

export function AnalyticsReportArchetype({
  side,
  title,
  purpose,
  rows = [],
  kpis = [],
  chart = [],
  source = "clickhouse (cdr_events) + postgres",
  warnings,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  rows?: any[];
  kpis?: any[];
  chart?: number[];
  source?: string;
  warnings?: string[];
}) {
  const [selectedPreset, setSelectedPreset] = useState("24h");
  const [searchTerm, setSearchTerm] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);

  const realRows = useMemo(() => {
    return rows && Array.isArray(rows) ? rows : [];
  }, [rows]);

  const filteredRows = useMemo(() => {
    return realRows.filter((r) => {
      const q = searchTerm.toLowerCase().trim();
      return (
        !q ||
        Object.values(r).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    });
  }, [realRows, searchTerm]);

  const columns = useMemo(() => {
    if (filteredRows.length > 0) return Object.keys(filteredRows[0]);
    return ["destination", "trafficMinutes", "calls", "asr", "acd", "revenue", "margin"];
  }, [filteredRows]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{title}</h1>
            <span className="badge">
              {filteredRows.length.toLocaleString()} records
            </span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose || "Comprehensive traffic volume, quality breakdown, and commercial performance analytics."}</p>
        </div>

        <div className="pageActions">
          <button
            type="button"
            className="btn primary sm"
            onClick={() => setIsExportOpen(true)}
          >
            <Icon name="download" size={13} />
            <span>Export Analytics</span>
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

      {/* Real KPI Cards */}
      {kpis && kpis.length > 0 && (
        <KpiGrid>
          {kpis.slice(0, 4).map((k, idx) => (
            <KpiCard
              key={idx}
              label={k.label ?? "Metric"}
              value={k.value ?? "0"}
              trend={k.trend}
              trendDirection={k.trend ? (k.trend.includes("-") ? "down" : "up") : "neutral"}
              icon={idx === 0 ? "dashboard" : idx === 1 ? "call" : idx === 2 ? "radar" : "dollar"}
              color={idx === 0 ? "blue" : idx === 1 ? "cyan" : idx === 2 ? "green" : "amber"}
            />
          ))}
        </KpiGrid>
      )}

      {/* Traffic Trend Chart if data exists */}
      {chart && chart.length > 0 && (
        <MultiSeriesChart
          title="Traffic Minutes Trend (ClickHouse Rollup)"
          series={[
            { name: "Traffic Minutes", color: "#2563eb", values: chart, unit: "mins" },
          ]}
          selectedInterval={selectedPreset}
          onIntervalChange={setSelectedPreset}
          height={220}
        />
      )}

      {/* Filter Bar */}
      <FilterBar
        searchPlaceholder="Filter records by destination or prefix…"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        datePresets={["Today", "24h", "7d", "30d", "Custom"]}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        statusOptions={[]}
        onReset={() => {
          setSearchTerm("");
          setSelectedPreset("24h");
        }}
        onExportClick={() => setIsExportOpen(true)}
        totalCount={filteredRows.length}
      />

      {/* Analytics Breakdown Table */}
      <DataTable
        columns={columns}
        data={filteredRows}
        pageSize={10}
        emptyMessage={`No analytics rollups found matching the current criteria (Source: ${source}).`}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title={`Export ${title}`}
        totalRows={filteredRows.length}
        columns={columns}
        data={filteredRows}
        filenamePrefix={title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}
      />
    </div>
  );
}
