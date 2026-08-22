"use client";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { DataTable, type DataTableColumn, MonoPill } from "../shared/DataTable";
import { Drawer } from "../shared/Drawer";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Status } from "../Status";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { FormErrorAlert } from "../shared/FormErrorAlert";

export interface CdrExportJob {
  id: string;
  organization_id?: string;
  report_type: string;
  filters: any;
  format: "csv" | "csv.gz" | "parquet";
  status: "queued" | "running" | "ready" | "failed" | "expired" | "cancelled";
  object_path?: string;
  row_count?: number;
  file_size_bytes?: number;
  file_size_formatted?: string;
  download_url?: string;
  is_expired?: boolean;
  expires_at?: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export function CdrExportsArchetype({
  side,
  title = "CDR Export Jobs",
  purpose = "Generate, monitor, and download asynchronous bulk call detail record exports with custom date ranges and telecom filters.",
  initialRows = [],
  kpis: initialKpis = [],
  source = "postgres (report_jobs) + clickhouse (cdr_events)",
  warnings,
}: {
  side: "Admin" | "Client";
  title?: string;
  purpose?: string;
  initialRows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}) {
  const [jobs, setJobs] = useState<CdrExportJob[]>(() => (Array.isArray(initialRows) ? initialRows : []));
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedFormat, setSelectedFormat] = useState("All Formats");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>(() => new Date().toLocaleTimeString());

  // Modal & Drawer states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<CdrExportJob | null>(null);
  const [jobToDelete, setJobToDelete] = useState<CdrExportJob | null>(null);
  const [jobToCancel, setJobToCancel] = useState<CdrExportJob | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<unknown | null>(null);
  const [drawerNotice, setDrawerNotice] = useState<string | null>(null);

  // Create Form State
  const [datePreset, setDatePreset] = useState<string>("all_time");
  const [fromDate, setFromDate] = useState("2026-05-01");
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportFormat, setExportFormat] = useState<"csv" | "csv.gz" | "parquet">("csv");
  const [filterGateway, setFilterGateway] = useState("All Gateways");
  const [filterCaller, setFilterCaller] = useState("");
  const [filterCallee, setFilterCallee] = useState("");
  const [filterAnswered, setFilterAnswered] = useState("all");
  const [customerGateways, setCustomerGateways] = useState<string[]>([]);

  // Real-time ClickHouse Estimation
  const [estimate, setEstimate] = useState<{
    count: number;
    answeredCount: number;
    estimatedMinutes: number;
    estimatedCharge: number;
    loading: boolean;
    error?: string;
  }>({
    count: 0,
    answeredCount: 0,
    estimatedMinutes: 0,
    estimatedCharge: 0,
    loading: false,
  });

  // Fetch / Refresh Jobs
  const fetchJobs = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const endpoint = side === "Admin" ? "/api/v1/admin/cdr/exports" : "/api/v1/cdr/exports";
      const res: any = await api(endpoint);
      const items = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
      setJobs(items);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (e: any) {
      console.error("Failed to fetch export jobs:", e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [side]);

  // Load customer mapping gateways for filter dropdown
  useEffect(() => {
    async function loadGateways() {
      try {
        const res: any = await api("/api/v1/gateways");
        const list = res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
        const names = list.map((g: any) => g.name || g.vos_gateway_id || g.id).filter(Boolean);
        setCustomerGateways(Array.from(new Set(names)) as string[]);
      } catch {}
    }
    void loadGateways();
  }, []);

  // Preset Date range selection
  const handlePresetSelect = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date(now.getTime() - 86400000);
      setFromDate(y.toISOString().slice(0, 10));
      setToDate(y.toISOString().slice(0, 10));
    } else if (preset === "7d") {
      const d7 = new Date(now.getTime() - 7 * 86400000);
      setFromDate(d7.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (preset === "30d") {
      const d30 = new Date(now.getTime() - 30 * 86400000);
      setFromDate(d30.toISOString().slice(0, 10));
      setToDate(todayStr);
    } else if (preset === "all_time") {
      setFromDate("2026-05-01");
      setToDate(todayStr);
    }
  };

  // Live estimate debounced call to ClickHouse
  useEffect(() => {
    if (!isCreateOpen) return;
    let cancelled = false;
    setEstimate((prev) => ({ ...prev, loading: true }));

    const timer = setTimeout(async () => {
      try {
        const estimatePayload = {
          from: fromDate,
          to: toDate,
          gateway: filterGateway !== "All Gateways" ? filterGateway : undefined,
          caller: filterCaller.trim() || undefined,
          callee: filterCallee.trim() || undefined,
          answered: filterAnswered !== "all" ? (filterAnswered === "answered" ? 1 : 0) : undefined,
        };
        const endpoint = side === "Admin" ? "/api/v1/admin/cdr/exports/estimate" : "/api/v1/cdr/exports/estimate";
        const res: any = await api(endpoint, {
          method: "POST",
          body: JSON.stringify(estimatePayload),
        });
        if (!cancelled && res?.data) {
          setEstimate({
            count: Number(res.data.count ?? 0),
            answeredCount: Number(res.data.answeredCount ?? 0),
            estimatedMinutes: Number(res.data.estimatedMinutes ?? 0),
            estimatedCharge: Number(res.data.estimatedCharge ?? 0),
            loading: false,
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setEstimate((prev) => ({ ...prev, loading: false, error: e.message }));
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isCreateOpen, fromDate, toDate, filterGateway, filterCaller, filterCallee, filterAnswered, side]);

  // Auto-refresh interval when active jobs exist or enabled
  useEffect(() => {
    if (!autoRefresh) return;
    const hasActive = jobs.some((j) => j.status === "queued" || j.status === "running");
    const intervalMs = hasActive ? 4000 : 12000;
    const timer = setInterval(() => {
      void fetchJobs(true);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoRefresh, jobs, fetchJobs]);

  // Create Job Action
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError("");

    try {
      const payload = {
        from: fromDate,
        to: toDate,
        format: exportFormat,
        gateway: filterGateway !== "All Gateways" ? filterGateway : undefined,
        caller: filterCaller.trim() || undefined,
        callee: filterCallee.trim() || undefined,
        answered: filterAnswered !== "all" ? (filterAnswered === "answered" ? 1 : 0) : undefined,
      };

      const endpoint = side === "Admin" ? "/api/v1/admin/cdr/exports" : "/api/v1/cdr/exports";
      await api(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setIsCreateOpen(false);
      await fetchJobs();
    } catch (err: any) {
      setActionError(err.message || "Failed to create CDR export job");
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Job Action
  const handleCancelJob = async () => {
    if (!jobToCancel) return;
    setActionLoading(true);
    try {
      const endpoint = side === "Admin"
        ? `/api/v1/admin/cdr/exports/${jobToCancel.id}/cancel`
        : `/api/v1/cdr/exports/${jobToCancel.id}/cancel`;
      await api(endpoint, { method: "POST" });
      setJobToCancel(null);
      await fetchJobs();
    } catch (e: any) {
      alert(`Cancel failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Job Action
  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    setActionLoading(true);
    try {
      const endpoint = side === "Admin"
        ? `/api/v1/admin/cdr/exports/${jobToDelete.id}`
        : `/api/v1/cdr/exports/${jobToDelete.id}`;
      await api(endpoint, { method: "DELETE" });
      setJobToDelete(null);
      await fetchJobs();
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Real KPI calculations from real data
  const realKpis = useMemo(() => {
    const totalJobs = jobs.length;
    const readyJobs = jobs.filter((j) => j.status === "ready" && !j.is_expired).length;
    const activeJobs = jobs.filter((j) => j.status === "queued" || j.status === "running").length;
    const totalRowsExported = jobs.reduce((acc, j) => acc + (Number(j.row_count) || 0), 0);

    return [
      {
        label: "Export Jobs",
        value: `${totalJobs} Total`,
        change: totalJobs > 0 ? `${readyJobs} Ready` : undefined,
        status: totalJobs > 0 ? "healthy" : undefined,
        icon: "download" as const,
      },
      {
        label: "Ready for Download",
        value: `${readyJobs} Available`,
        change: readyJobs > 0 ? "Click to Download" : undefined,
        status: readyJobs > 0 ? "healthy" : undefined,
        icon: "check" as const,
      },
      {
        label: "In Progress / Queued",
        value: `${activeJobs} Active`,
        change: activeJobs > 0 ? "ClickHouse processing" : "Idle",
        status: activeJobs > 0 ? "warning" : undefined,
        icon: "refresh" as const,
      },
      {
        label: "Total Rows Exported",
        value: `${totalRowsExported.toLocaleString()} Records`,
        change: "ClickHouse CDR Store",
        status: "info" as const,
        icon: "cdr" as const,
      },
    ];
  }, [jobs]);

  // Filtered rows
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        job.id.toLowerCase().includes(q) ||
        String(job.format ?? "").toLowerCase().includes(q) ||
        JSON.stringify(job.filters ?? {}).toLowerCase().includes(q) ||
        String(job.status ?? "").toLowerCase().includes(q);

      const matchStatus =
        selectedStatus === "All Statuses" ||
        job.status?.toLowerCase() === selectedStatus.toLowerCase();

      const matchFormat =
        selectedFormat === "All Formats" ||
        job.format?.toLowerCase() === selectedFormat.toLowerCase();

      return matchSearch && matchStatus && matchFormat;
    });
  }, [jobs, searchTerm, selectedStatus, selectedFormat]);

  // Format Helper for Filters
  const renderFilterBadge = (filters: any) => {
    if (!filters || typeof filters !== "object") return <span className="muted">-</span>;
    const from = filters.from || "Start";
    const to = filters.to || "End";
    const gw = filters.gateway;
    const answered = filters.answered;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ fontWeight: 650, fontSize: 12.5, color: "var(--text)" }}>
          {from} → {to}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {gw && gw !== "All Gateways" && (
            <span className="badge badge-info" style={{ fontSize: 10.5, padding: "1px 6px" }}>
              GW: {gw}
            </span>
          )}
          {filters.caller && (
            <span className="badge badge-secondary" style={{ fontSize: 10.5, padding: "1px 6px" }}>
              Src: {filters.caller}
            </span>
          )}
          {filters.callee && (
            <span className="badge badge-secondary" style={{ fontSize: 10.5, padding: "1px 6px" }}>
              Dst: {filters.callee}
            </span>
          )}
          {answered !== undefined && (
            <span className={`badge badge-${answered === 1 ? "online" : "warning"}`} style={{ fontSize: 10.5, padding: "1px 6px" }}>
              {answered === 1 ? "Answered Only" : "Failed/Unanswered"}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Table Columns Definition
  const columns: DataTableColumn<CdrExportJob>[] = useMemo(() => [
    {
      key: "id",
      header: "Export Job ID",
      width: 150,
      render: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MonoPill value={row.id} fullValue={row.id} shorten={true} />
        </div>
      ),
    },
    {
      key: "scope",
      header: "Requested Range & Filters",
      render: (row) => renderFilterBadge(row.filters),
    },
    {
      key: "format",
      header: "Format",
      width: 100,
      align: "center",
      render: (row) => {
        const fmt = String(row.format ?? "csv").toUpperCase();
        const badgeColor = fmt === "PARQUET" ? "purple" : fmt.includes("GZ") ? "cyan" : "blue";
        return (
          <span
            className="mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              background: `var(--${badgeColor}-bg, rgba(37,99,235,0.1))`,
              color: `var(--${badgeColor}, var(--primary))`,
              border: `1px solid var(--border)`,
            }}
          >
            <Icon name="download" size={10} />
            <span>{fmt}</span>
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: 130,
      align: "center",
      render: (row) => {
        const s = row.status ?? "queued";
        if (s === "running") {
          return (
            <span
              className="badge"
              style={{
                background: "rgba(37,99,235,0.12)",
                color: "var(--primary)",
                border: "1px solid rgba(37,99,235,0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
              }}
            >
              <Icon name="refresh" size={11} className="spin" />
              <span>Processing…</span>
            </span>
          );
        }
        if (s === "queued") {
          return (
            <span
              className="badge badge-warning"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
              }}
            >
              <Icon name="time" size={11} />
              <span>Queued</span>
            </span>
          );
        }
        if (s === "ready") {
          return (
            <span
              className="badge badge-online"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
              }}
            >
              <Icon name="check" size={11} />
              <span>Ready</span>
            </span>
          );
        }
        if (s === "failed") {
          return (
            <span
              className="badge badge-offline"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
              }}
              title={row.error || "Export failed"}
            >
              <Icon name="alert" size={11} />
              <span>Failed</span>
            </span>
          );
        }
        return <Status value={s} size="sm" />;
      },
    },
    {
      key: "row_count",
      header: "Rows",
      width: 110,
      align: "right",
      render: (row) => (
        <div style={{ textAlign: "right" }}>
          <span className="mono" style={{ fontWeight: 700, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
            {row.row_count !== undefined && row.row_count !== null ? Number(row.row_count).toLocaleString() : "—"}
          </span>
          {row.file_size_formatted && (
            <div style={{ fontSize: 10.5, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              {row.file_size_formatted}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created / Expiry",
      width: 170,
      render: (row) => {
        const created = row.created_at ? new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
        const expires = row.expires_at ? new Date(row.expires_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
        return (
          <div style={{ fontSize: 12 }}>
            <div style={{ color: "var(--text)", fontWeight: 600 }}>{created}</div>
            {expires && (
              <div style={{ color: "var(--muted)", fontSize: 11, marginTop: 1 }}>
                Exp: {expires}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      width: 170,
      align: "right",
      render: (row) => {
        const isReady = row.status === "ready" && !row.is_expired;
        const isQueuedOrRunning = row.status === "queued" || row.status === "running";
        const downloadHref = row.download_url || `/api/v1/downloads/${row.id}/file`;

        return (
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
            {isReady && (
              <a
                href={downloadHref}
                download
                className="btn primary sm"
                style={{ height: 28, fontSize: 11.5, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
                title="Download CSV/Parquet Export"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="download" size={12} />
                <span>Download</span>
              </a>
            )}

            {isQueuedOrRunning && (
              <button
                type="button"
                className="btn secondary sm"
                style={{ height: 28, fontSize: 11, padding: "0 8px", color: "var(--warning)" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setJobToCancel(row);
                }}
                title="Cancel in-progress export job"
              >
                <span>Cancel</span>
              </button>
            )}

            <button
              type="button"
              className="btn secondary sm"
              style={{ height: 28, width: 28, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              onClick={(e) => {
                e.stopPropagation();
                setActiveJob(row);
              }}
              title="View Technical Details"
            >
              <Icon name="external" size={12} />
            </button>

            <button
              type="button"
              className="btn secondary sm"
              style={{ height: 28, width: 28, padding: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--danger)" }}
              onClick={(e) => {
                e.stopPropagation();
                setJobToDelete(row);
              }}
              title="Delete Export Record"
            >
              <Icon name="delete" size={12} />
            </button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{title}</h1>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void fetchJobs()}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            title="Refresh Jobs"
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn primary sm"
            onClick={() => {
              setIsCreateOpen(true);
              handlePresetSelect("all_time");
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="plus" size={13} />
            <span>New CDR Export</span>
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

      {/* Real KPI Summary Grid */}
      <div style={{ marginBottom: 24 }}>
        <KpiGrid>
          {realKpis.map((k, idx) => (
            <KpiCard
              key={idx}
              label={k.label}
              value={k.value}
              trend={k.change}
              trendDirection={k.change ? (k.change.includes("-") ? "down" : "up") : "neutral"}
              icon={k.icon}
              color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "cyan" : "amber"}
            />
          ))}
        </KpiGrid>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, flex: 1 }}>
            {/* Search Input */}
            <div style={{ position: "relative", minWidth: 240, maxWidth: 360, flex: 1 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                <Icon name="search" size={14} />
              </span>
              <input
                type="text"
                className="input"
                style={{ height: 34, fontSize: 12.5, paddingLeft: 32 }}
                placeholder="Search by Job ID, format, filter…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Dropdown */}
            <select
              className="input select"
              style={{ height: 34, fontSize: 12.5, width: 140 }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="All Statuses">All Statuses</option>
              <option value="ready">Ready</option>
              <option value="queued">Queued</option>
              <option value="running">Running</option>
              <option value="failed">Failed</option>
              <option value="expired">Expired</option>
            </select>

            {/* Format Dropdown */}
            <select
              className="input select"
              style={{ height: 34, fontSize: 12.5, width: 130 }}
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
            >
              <option value="All Formats">All Formats</option>
              <option value="csv">CSV</option>
              <option value="csv.gz">CSV.GZ</option>
              <option value="parquet">Parquet</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--muted)" }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <span>Live Auto-Poll</span>
            </label>
            <span style={{ color: "var(--border)" }}>|</span>
            <span>Updated {lastRefreshed}</span>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <DataTable
          columns={columns}
          data={filteredJobs}
          emptyMessage="No CDR export jobs found. Click 'New CDR Export' above to query ClickHouse and generate bulk call records."
          pageSize={20}
        />
      </div>

      {/* ========================================================================= */}
      {/* Interactive New CDR Export Modal with Real-Time ClickHouse Estimator     */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !actionLoading && setIsCreateOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 620,
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              border: "1px solid var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 750, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="download" size={18} />
                  <span>New CDR Export Job</span>
                </h2>
                <p style={{ color: "var(--muted)", fontSize: 12.5, margin: "4px 0 0 0" }}>
                  Query real ClickHouse CDR events and generate a downloadable dataset.
                </p>
              </div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ width: 28, height: 28, padding: 0 }}
                onClick={() => setIsCreateOpen(false)}
                disabled={actionLoading}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob}>
              <FormErrorHeader error={actionError} onDismiss={() => setActionError("")} />
              {/* Date Presets */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                  DATE RANGE PRESETS
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {[
                    { id: "all_time", label: "All Records (May-Aug 2026)" },
                    { id: "30d", label: "Last 30 Days" },
                    { id: "7d", label: "Last 7 Days" },
                    { id: "yesterday", label: "Yesterday" },
                    { id: "today", label: "Today" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`btn sm ${datePreset === p.id ? "primary" : "secondary"}`}
                      style={{ fontSize: 11.5, padding: "4px 10px" }}
                      onClick={() => handlePresetSelect(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Inputs */}
              <div className="grid2" style={{ gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>
                    FROM DATE (UTC)
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={fromDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setFromDate(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 4 }}>
                    TO DATE (UTC)
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={toDate}
                    onChange={(e) => {
                      setDatePreset("custom");
                      setToDate(e.target.value);
                    }}
                    required
                  />
                </div>
              </div>

              {/* Format Selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                  EXPORT FILE FORMAT
                </label>
                <div className="grid3" style={{ gap: 10 }}>
                  {[
                    { id: "csv", name: "CSV Plaintext", ext: ".csv", desc: "Standard comma-separated table" },
                    { id: "csv.gz", name: "CSV GZIP", ext: ".csv.gz", desc: "Compressed for bulk downloads" },
                    { id: "parquet", name: "Parquet", ext: ".parquet", desc: "High performance columnar" },
                  ].map((fmt) => (
                    <div
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as any)}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        border: `1.5px solid ${exportFormat === fmt.id ? "var(--primary)" : "var(--border)"}`,
                        background: exportFormat === fmt.id ? "rgba(37,99,235,0.06)" : "var(--card-bg)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                        <span>{fmt.name}</span>
                        <span className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>{fmt.ext}</span>
                      </div>
                      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{fmt.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Telecom Filters */}
              <div style={{ marginBottom: 18, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 8 }}>
                  OPTIONAL TELECOM FILTERS
                </label>

                <div className="grid2" style={{ gap: 12, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                      Mapping Gateway
                    </label>
                    <select
                      className="input select"
                      value={filterGateway}
                      onChange={(e) => setFilterGateway(e.target.value)}
                    >
                      <option value="All Gateways">All Customer Gateways</option>
                      {customerGateways.map((gw) => (
                        <option key={gw} value={gw}>{gw}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                      Call Disposition
                    </label>
                    <select
                      className="input select"
                      value={filterAnswered}
                      onChange={(e) => setFilterAnswered(e.target.value)}
                    >
                      <option value="all">All Dispositions</option>
                      <option value="answered">Answered Calls Only (duration &gt; 0)</option>
                      <option value="unanswered">Unanswered / Failed Calls Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid2" style={{ gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                      Caller Number Prefix
                    </label>
                    <input
                      type="text"
                      className="input mono"
                      placeholder="e.g. +1415 or 44"
                      value={filterCaller}
                      onChange={(e) => setFilterCaller(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                      Callee / Destination Prefix
                    </label>
                    <input
                      type="text"
                      className="input mono"
                      placeholder="e.g. +4420 or 1"
                      value={filterCallee}
                      onChange={(e) => setFilterCallee(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Real-time ClickHouse Estimation Card */}
              <div
                className="card"
                style={{
                  marginBottom: 20,
                  padding: 14,
                  background: "rgba(37,99,235,0.04)",
                  borderColor: "rgba(37,99,235,0.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Icon name="analytics" size={13} />
                    <span>ClickHouse Estimation</span>
                  </span>
                  {estimate.loading && (
                    <span style={{ fontSize: 11, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="refresh" size={11} className="spin" />
                      <span>Scanning…</span>
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className="mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                    {estimate.count.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    CDR rows will be exported
                  </span>
                </div>

                <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 11.5, color: "var(--muted)" }}>
                  <span>Answered: <strong style={{ color: "var(--text)" }}>{estimate.answeredCount.toLocaleString()}</strong></span>
                  <span>Duration: <strong style={{ color: "var(--text)" }}>{estimate.estimatedMinutes} mins</strong></span>
                  <span>Total Billed: <strong style={{ color: "var(--text)" }}>${estimate.estimatedCharge.toFixed(4)}</strong></span>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={actionLoading}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 140, justifyContent: "center" }}
                >
                  {actionLoading ? (
                    <>
                      <Icon name="refresh" size={14} className="spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="download" size={14} />
                      <span>Generate Export</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Job Details Technical Drawer                                             */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={!!activeJob}
        onClose={() => setActiveJob(null)}
        title="CDR Export Job Details"
      >
        {activeJob && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Status value={activeJob.status} />
              <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                ID: {activeJob.id}
              </span>
            </div>

            <div className="card" style={{ padding: 14, background: "var(--card-bg)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Technical Specification
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Format:</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{String(activeJob.format).toUpperCase()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Record Count:</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{activeJob.row_count !== undefined ? Number(activeJob.row_count).toLocaleString() : "Pending"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>File Size:</span>
                  <span className="mono">{activeJob.file_size_formatted || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>Created At:</span>
                  <span>{new Date(activeJob.created_at).toLocaleString()}</span>
                </div>
                {activeJob.completed_at && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Completed At:</span>
                    <span>{new Date(activeJob.completed_at).toLocaleString()}</span>
                  </div>
                )}
                {activeJob.expires_at && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Retention Expiry:</span>
                    <span>{new Date(activeJob.expires_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter JSON */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 6 }}>
                Applied Query Filter Parameters
              </div>
              <pre
                className="mono"
                style={{
                  padding: 12,
                  borderRadius: 6,
                  background: "rgba(0,0,0,0.25)",
                  fontSize: 11.5,
                  overflowX: "auto",
                  border: "1px solid var(--border)",
                }}
              >
                {JSON.stringify(activeJob.filters ?? {}, null, 2)}
              </pre>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
              {activeJob.status === "ready" && !activeJob.is_expired && (
                <a
                  href={activeJob.download_url || `/api/v1/downloads/${activeJob.id}/file`}
                  download
                  className="btn primary"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 10 }}
                >
                  <Icon name="download" size={14} />
                  <span>Download Export Artifact ({String(activeJob.format).toUpperCase()})</span>
                </a>
              )}

              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  navigator.clipboard.writeText(activeJob.id);
                  alert("Copied Job UUID to clipboard");
                }}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Icon name="external" size={13} />
                <span>Copy Job ID ({activeJob.id.slice(0, 8)}…)</span>
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirmation Dialog for Deletion */}
      <ConfirmDialog
        isOpen={!!jobToDelete}
        onCancel={() => setJobToDelete(null)}
        onConfirm={handleDeleteJob}
        title="Delete CDR Export Record"
        message={`Are you sure you want to permanently remove export job ${jobToDelete?.id.slice(0, 8)}? Any stored artifact files will be purged.`}
        confirmLabel="Delete Export"
        isDanger={true}
        busy={actionLoading}
      />

      {/* Confirmation Dialog for Cancellation */}
      <ConfirmDialog
        isOpen={!!jobToCancel}
        onCancel={() => setJobToCancel(null)}
        onConfirm={handleCancelJob}
        title="Cancel CDR Export Job"
        message={`Cancel active export job ${jobToCancel?.id.slice(0, 8)}? The background query will be terminated.`}
        confirmLabel="Cancel Job"
        isDanger={false}
        busy={actionLoading}
      />
    </div>
  );
}
