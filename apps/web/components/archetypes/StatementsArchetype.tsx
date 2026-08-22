"use client";
import React, { useState, useMemo } from "react";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { MultiSeriesChart } from "../Chart";
import { FilterBar } from "../shared/FilterBar";
import { DataTable } from "../shared/DataTable";
import { Drawer } from "../shared/Drawer";
import { ExportModal } from "../shared/ExportModal";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";

export interface StatementItem {
  id: string;
  statement_number: string;
  period: string;
  period_key: string;
  period_start: string;
  period_end: string;
  currency: string;
  opening_balance: string;
  payments_credits: string;
  call_charges: string;
  package_rent: string;
  net_change: string;
  closing_balance: string;
  total_calls: number;
  answered_calls: number;
  total_minutes: string;
  asr: string;
  acd_seconds: number;
  status: "OPEN" | "SETTLED";
  payment_count: number;
  due_date: string;
  generated_at: string;
}

export interface StatementDetailData {
  customer?: {
    id: string;
    account_name: string;
    vos_account_id: string;
    currency: string;
    current_balance: string;
    overdraft_limit: string;
    status: string;
  };
  summary?: {
    opening_balance: string;
    current_balance: string;
    total_payments: string;
    total_charges: string;
    net_financial_change: string;
    total_calls: number;
    total_answered: number;
    total_minutes: string;
    overall_asr: string;
    statement_count: number;
    active_statements: number;
    settled_statements: number;
  };
  statements?: StatementItem[];
  daily_breakdown?: Array<{
    date_str: string;
    month_str: string;
    calls: number;
    answered_calls: number;
    minutes: number;
    charges: number;
  }>;
  transactions?: Array<{
    id: string;
    external_reference: string;
    amount: string;
    currency: string;
    type: string;
    status: string;
    provider: string;
    created_at: string;
  }>;
  top_destinations?: Array<{
    prefix: string;
    destination: string;
    calls: number;
    answered: number;
    minutes: string;
    charges: string;
  }>;
}

export function StatementsArchetype({
  side = "Client",
  title = "Statements & Billing Summary",
  purpose = "Periodic usage and financial summary with real-time balance reconciliation.",
  rows = [],
  kpis = [],
  chart = [],
  source = "clickhouse + postgres",
  warnings,
  detailData,
}: {
  side?: "Admin" | "Client";
  title?: string;
  purpose?: string;
  rows?: StatementItem[];
  kpis?: any[];
  chart?: number[];
  source?: string;
  warnings?: string[];
  detailData?: StatementDetailData;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("All Statuses");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatement, setSelectedStatement] = useState<StatementItem | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "daily" | "destinations" | "payments">("overview");

  const rawStatements: StatementItem[] = useMemo(() => {
    if (detailData?.statements && Array.isArray(detailData.statements)) return detailData.statements;
    if (Array.isArray(rows) && rows.length > 0) return rows;
    return [];
  }, [detailData?.statements, rows]);

  const summary = detailData?.summary;
  const customer = detailData?.customer;
  const allDaily = detailData?.daily_breakdown || [];
  const allTransactions = detailData?.transactions || [];
  const allDestinations = detailData?.top_destinations || [];

  // Filter statements by period, search query & status
  const filteredStatements = useMemo(() => {
    return rawStatements.filter((st) => {
      const matchPeriod = selectedPeriod === "all" || st.period_key === selectedPeriod || st.period.toLowerCase().includes(selectedPeriod.toLowerCase());
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        st.statement_number.toLowerCase().includes(q) ||
        st.period.toLowerCase().includes(q) ||
        st.status.toLowerCase().includes(q);
      const matchStatus =
        selectedStatus === "All Statuses" ||
        (selectedStatus.toLowerCase().includes("open") && st.status === "OPEN") ||
        (selectedStatus.toLowerCase().includes("settled") && st.status === "SETTLED");
      return matchPeriod && matchSearch && matchStatus;
    });
  }, [rawStatements, selectedPeriod, searchTerm, selectedStatus]);

  // Filtered daily breakdown according to selected period
  const filteredDaily = useMemo(() => {
    if (selectedPeriod === "all") return allDaily;
    return allDaily.filter((d) => d.month_str === selectedPeriod);
  }, [allDaily, selectedPeriod]);

  // Active statement for drawer detail view (or default to latest)
  const activeStatement = selectedStatement || (filteredStatements.length > 0 ? filteredStatements[0] : null);

  // Daily records for drawer
  const drawerDaily = useMemo(() => {
    if (!activeStatement) return allDaily.slice(0, 15);
    return allDaily.filter((d) => d.month_str === activeStatement.period_key);
  }, [allDaily, activeStatement]);

  // Transactions for drawer
  const drawerTransactions = useMemo(() => {
    if (!activeStatement) return allTransactions;
    return allTransactions.filter((t) => {
      const d = new Date(t.created_at);
      const s = new Date(activeStatement.period_start);
      const e = new Date(activeStatement.period_end);
      return d >= s && d <= e;
    });
  }, [allTransactions, activeStatement]);

  // Chart data for daily charges and minutes
  const chartData = useMemo(() => {
    const sorted = [...filteredDaily].reverse();
    const labels = sorted.map((d) => d.date_str.slice(5)); // MM-DD
    const minutesValues = sorted.map((d) => Number(d.minutes) || 0);
    const chargesValues = sorted.map((d) => Number(d.charges) || 0);
    return { labels, minutesValues, chargesValues };
  }, [filteredDaily]);

  // Function to download statement CSV
  function downloadStatementCsv(st?: StatementItem | null) {
    const target = st || activeStatement;
    if (!target) return;

    const rowsCsv = [
      ["VOS3000 CARRIER BILLING STATEMENT"],
      ["Statement Number", target.statement_number],
      ["Period", target.period],
      ["Date Range", `${target.period_start.slice(0, 10)} to ${target.period_end.slice(0, 10)}`],
      ["Account Name", customer?.account_name || "Customer Account"],
      ["Account ID", customer?.vos_account_id || customer?.id || ""],
      ["Currency", target.currency],
      ["Status", target.status],
      [""],
      ["FINANCIAL SUMMARY"],
      ["Opening Balance", `$${target.opening_balance}`],
      ["Payments & Credits", `+$${target.payments_credits}`],
      ["Call Usage Charges", `-$${target.call_charges}`],
      ["Package & Monthly Rent", `-$${target.package_rent}`],
      ["Net Financial Change", `$${target.net_change}`],
      ["Closing Balance", `$${target.closing_balance}`],
      [""],
      ["TRAFFIC METRICS"],
      ["Total Call Attempts", String(target.total_calls)],
      ["Answered Calls", String(target.answered_calls)],
      ["Billed Duration (Minutes)", target.total_minutes],
      ["Answer Seizure Ratio (ASR)", target.asr],
      ["Average Call Duration (ACD)", `${target.acd_seconds}s`],
      [""],
      ["DAILY BREAKDOWN (DATE, CALLS, ANSWERED, MINUTES, CHARGES)"],
      ...drawerDaily.map((d) => [d.date_str, String(d.calls), String(d.answered_calls), String(d.minutes), `$${Number(d.charges).toFixed(4)}`]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rowsCsv.map((e) => e.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `statement_${target.statement_number}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Function to print or save PDF statement
  function printStatement() {
    window.print();
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge badge-online" style={{ fontSize: 11, padding: "3px 8px" }}>
              <span className="dot dot-online" style={{ width: 6, height: 6 }} />
              Source: {source}
            </span>
            <span className="badge" style={{ fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              {customer?.account_name || "Account"} · {customer?.currency || "USD"}
            </span>
            <span className="badge badge-online" style={{ fontSize: 10.5, color: "var(--success)" }}>
              ✓ 100% Reconciled
            </span>
          </div>
          <p style={{ marginTop: 4 }}>
            {purpose || "Monthly billing statements, immutable ledger records, and CDR usage breakdown."}
          </p>
        </div>

        <div className="pageActions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => downloadStatementCsv()}
            title="Download CSV breakdown of current statement"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="download" size={13} />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={printStatement}
            title="Print or Save Statement PDF"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="file" size={13} />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Warnings Banner if any */}
      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 650, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>{warnings.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Reconciled 5-Metric KPI Strip */}
      <KpiGrid>
        <KpiCard
          label="Opening Balance"
          value={`$${summary?.opening_balance || "0.00"}`}
          trend="Period Starting"
          trendDirection="neutral"
          icon="wallet"
          color="blue"
        />
        <KpiCard
          label="Total Payments & Top-Ups"
          value={`+$${summary?.total_payments || "0.00"}`}
          trend={`${allTransactions.length} completed deposits`}
          trendDirection="up"
          icon="dollar"
          color="green"
        />
        <KpiCard
          label="Total Call Usage Charges"
          value={`-$${summary?.total_charges || "0.00"}`}
          trend={`${summary?.total_minutes || "0"} mins (${summary?.total_calls || 0} calls)`}
          trendDirection="down"
          icon="call"
          color="amber"
        />
        <KpiCard
          label="Current Live Balance"
          value={`$${summary?.current_balance || customer?.current_balance || "0.00"}`}
          trend="Reconciled Live"
          trendDirection="up"
          icon="dashboard"
          color="cyan"
        />
        <KpiCard
          label="Billed Voice Traffic"
          value={`${summary?.total_minutes || "0"} mins`}
          trend={`${summary?.overall_asr || "0%"} ASR · ${summary?.total_calls || 0} calls`}
          trendDirection="neutral"
          icon="radar"
          color="blue"
        />
      </KpiGrid>

      {/* Period Selection & Financial Flow Summary */}
      <div className="card" style={{ marginBottom: 20, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>Select Billing Period:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="select"
              style={{ padding: "6px 12px", fontSize: 13, minWidth: 200, borderRadius: 6 }}
            >
              <option value="all">All Statements (Lifetime)</option>
              {rawStatements.map((s) => (
                <option key={s.period_key} value={s.period_key}>
                  {s.period} ({s.status}) — Net: ${s.net_change}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Statements: <strong style={{ color: "var(--foreground)" }}>{rawStatements.length}</strong> total
              ({rawStatements.filter((s) => s.status === "SETTLED").length} settled, {rawStatements.filter((s) => s.status === "OPEN").length} open)
            </span>
          </div>
        </div>

        {/* Financial Flow Cards for Selected Period */}
        {activeStatement && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              background: "var(--background-alt, rgba(0,0,0,0.02))",
              padding: "14px",
              borderRadius: 8,
              border: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Opening Balance</div>
              <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
                ${activeStatement.opening_balance}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>(+) Payments / Credits</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--success)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
                +${activeStatement.payments_credits}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>(-) Call Usage Charges</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--warning)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
                -${activeStatement.call_charges}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>(-) Package / Rent</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "var(--muted)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
                -${activeStatement.package_rent}
              </div>
            </div>
            <div style={{ borderLeft: "2px solid var(--primary)", paddingLeft: 12 }}>
              <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.5px" }}>(=) Closing Balance</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)", marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
                ${activeStatement.closing_balance}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Traffic Trend & Spend Distribution Chart */}
      {chartData.minutesValues.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <MultiSeriesChart
            title={`Daily Voice Traffic Minutes & Usage Trend (${selectedPeriod === "all" ? "Historical" : selectedPeriod})`}
            series={[
              { name: "Traffic Minutes", color: "#2563eb", values: chartData.minutesValues, unit: "mins" },
              { name: "Daily Charges ($)", color: "#10b981", values: chartData.chargesValues.map((v) => Math.round(v * 100) / 100), unit: "$" },
            ]}
            height={220}
          />
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        searchPlaceholder="Filter statements by number or period…"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        datePresets={["All", "Current Month", "Last Month", "Last 3 Months"]}
        selectedPreset={selectedPeriod === "all" ? "All" : selectedPeriod}
        onPresetChange={(p) => {
          if (p === "All") setSelectedPeriod("all");
          else if (p === "Current Month" && rawStatements[0]) setSelectedPeriod(rawStatements[0].period_key);
          else if (p === "Last Month" && rawStatements[1]) setSelectedPeriod(rawStatements[1].period_key);
          else setSelectedPeriod("all");
        }}
        statusOptions={["All Statuses", "Open (Current)", "Settled"]}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onReset={() => {
          setSearchTerm("");
          setSelectedPeriod("all");
          setSelectedStatus("All Statuses");
        }}
        onExportClick={() => setIsExportOpen(true)}
        totalCount={filteredStatements.length}
      />

      {/* Statements Table */}
      <div className="card" style={{ marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Carrier Billing Statements Ledger</h3>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0 0" }}>
              Itemized statement records calculated directly from ClickHouse CDR events and PostgreSQL ledger entries.
            </p>
          </div>
          <span className="badge" style={{ fontSize: 11 }}>
            {filteredStatements.length} statements
          </span>
        </div>

        <div className="tableWrap" style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--background-alt, rgba(0,0,0,0.02))", textAlign: "left" }}>
                <th style={{ padding: "10px 14px" }}>Statement #</th>
                <th style={{ padding: "10px 14px" }}>Billing Period</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Opening ($)</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Payments ($)</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Call Usage ($)</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Rent / Package ($)</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Closing Balance ($)</th>
                <th style={{ padding: "10px 14px", textAlign: "center" }}>Minutes / Calls</th>
                <th style={{ padding: "10px 14px", textAlign: "center" }}>ASR / ACD</th>
                <th style={{ padding: "10px 14px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStatements.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: "36px 14px", textAlign: "center", color: "var(--muted)" }}>
                    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <Icon name="file" size={24} />
                      <span>No billing statements match the selected filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStatements.map((st) => (
                  <tr
                    key={st.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "background 0.15s ease",
                    }}
                    onClick={() => setSelectedStatement(st)}
                    className="hover-row"
                  >
                    <td style={{ padding: "11px 14px", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                      <span className="badge" style={{ fontSize: 11.5 }}>
                        {st.statement_number}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px", fontWeight: 600 }}>
                      <div>{st.period}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                        {st.period_start.slice(0, 10)} → {st.period_end.slice(0, 10)}
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                      ${st.opening_balance}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--success)", fontWeight: 600 }}>
                      +${st.payments_credits}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--warning)", fontWeight: 600 }}>
                      -${st.call_charges}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--muted)" }}>
                      -${st.package_rent}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 750, color: "var(--primary)" }}>
                      ${st.closing_balance}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      <div style={{ fontWeight: 600 }}>{st.total_minutes} mins</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{st.total_calls} calls</div>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center", fontSize: 12 }}>
                      <div>{st.asr}</div>
                      <div style={{ color: "var(--muted)", fontSize: 11 }}>{st.acd_seconds}s avg</div>
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "center" }}>
                      {st.status === "OPEN" ? (
                        <span className="badge badge-online" style={{ fontSize: 10.5 }}>
                          ● Current Open
                        </span>
                      ) : (
                        <span className="badge" style={{ fontSize: 10.5, color: "var(--success)", borderColor: "var(--success)" }}>
                          ✓ Settled
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "11px 14px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn secondary xs"
                          onClick={() => setSelectedStatement(st)}
                          title="View statement details"
                        >
                          <Icon name="eye" size={12} />
                          <span>View</span>
                        </button>
                        <button
                          type="button"
                          className="btn secondary xs"
                          onClick={() => downloadStatementCsv(st)}
                          title="Download CSV"
                        >
                          <Icon name="download" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Detailed Breakdown: Daily Usage & Spend, Destinations, Payments */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ borderBottom: "1px solid var(--border)", display: "flex", gap: 4, padding: "0 16px" }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "overview" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "overview" ? "var(--primary)" : "var(--muted)",
              fontWeight: activeTab === "overview" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Itemized Daily Spend ({filteredDaily.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "destinations" ? "active" : ""}`}
            onClick={() => setActiveTab("destinations")}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "destinations" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "destinations" ? "var(--primary)" : "var(--muted)",
              fontWeight: activeTab === "destinations" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Top Call Destinations ({allDestinations.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "payments" ? "active" : ""}`}
            onClick={() => setActiveTab("payments")}
            style={{
              padding: "12px 16px",
              background: "none",
              border: "none",
              borderBottom: activeTab === "payments" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "payments" ? "var(--primary)" : "var(--muted)",
              fontWeight: activeTab === "payments" ? 700 : 500,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Payment Transactions & Top-Ups ({allTransactions.length})
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {activeTab === "overview" && (
            <div className="tableWrap">
              <table className="table" style={{ width: "100%", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "var(--background-alt, rgba(0,0,0,0.02))", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Date</th>
                    <th style={{ padding: "8px 12px" }}>Billing Cycle</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Total Calls</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Answered</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>ASR (%)</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Traffic Minutes</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Billed Charges ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDaily.slice(0, 20).map((d, idx) => {
                    const asr = d.calls > 0 ? ((d.answered_calls / d.calls) * 100).toFixed(1) + "%" : "0.0%";
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>{d.date_str}</td>
                        <td style={{ padding: "8px 12px", color: "var(--muted)" }}>{d.month_str}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{d.calls}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--success)" }}>{d.answered_calls}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{asr}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{Number(d.minutes).toFixed(2)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--warning)", fontWeight: 700 }}>
                          ${Number(d.charges).toFixed(4)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "destinations" && (
            <div className="tableWrap">
              <table className="table" style={{ width: "100%", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "var(--background-alt, rgba(0,0,0,0.02))", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Prefix</th>
                    <th style={{ padding: "8px 12px" }}>Destination Area</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Calls</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Answered</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Minutes</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Total Charges ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {allDestinations.map((dst, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>{dst.prefix}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{dst.destination}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{dst.calls}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--success)" }}>{dst.answered}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{dst.minutes}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--warning)", fontWeight: 700 }}>
                        ${dst.charges}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="tableWrap">
              <table className="table" style={{ width: "100%", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "var(--background-alt, rgba(0,0,0,0.02))", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Payment Reference</th>
                    <th style={{ padding: "8px 12px" }}>Type / Provider</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount ($)</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {allTransactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                        {tx.external_reference || tx.id.slice(0, 12)}
                      </td>
                      <td style={{ padding: "8px 12px", textTransform: "capitalize" }}>
                        {tx.type} ({tx.provider})
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--success)", fontWeight: 700 }}>
                        +${tx.amount} {tx.currency}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>
                        <span className="badge badge-online" style={{ fontSize: 10.5 }}>
                          ✓ {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--muted)", fontSize: 11.5 }}>
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Statement Detail Drawer / Invoice View */}
      {selectedStatement && (
        <Drawer
          isOpen={!!selectedStatement}
          onClose={() => setSelectedStatement(null)}
          title={`Statement: ${selectedStatement.statement_number}`}
          size="large"
        >
          <div style={{ padding: "20px 24px" }}>
            {/* Invoice Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                paddingBottom: 20,
                borderBottom: "1px solid var(--border)",
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--muted)", letterSpacing: "1px" }}>Carrier Billing Statement</div>
                <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 2px 0" }}>{selectedStatement.period}</h2>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono, monospace)" }}>
                  Period: {selectedStatement.period_start.slice(0, 10)} to {selectedStatement.period_end.slice(0, 10)}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div className="badge" style={{ fontSize: 12, fontFamily: "var(--font-mono, monospace)", marginBottom: 6 }}>
                  {selectedStatement.statement_number}
                </div>
                <div>
                  {selectedStatement.status === "OPEN" ? (
                    <span className="badge badge-online" style={{ fontSize: 11 }}>● Current Open Cycle</span>
                  ) : (
                    <span className="badge" style={{ fontSize: 11, color: "var(--success)", borderColor: "var(--success)" }}>✓ Settled Cycle</span>
                  )}
                </div>
              </div>
            </div>

            {/* Customer & Account Info */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                padding: "16px",
                background: "var(--background-alt, rgba(0,0,0,0.02))",
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Billed Organization</div>
                <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{customer?.account_name || "Customer Account"}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  VOS Account ID: <strong style={{ color: "var(--foreground)" }}>{customer?.vos_account_id || customer?.id}</strong>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Account Settlement</div>
                <div style={{ fontSize: 13, marginTop: 2 }}>Currency: <strong>{selectedStatement.currency}</strong></div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Due Date: <strong>{selectedStatement.due_date}</strong>
                </div>
              </div>
            </div>

            {/* Financial Ledger Balance Reconciliation */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Financial Ledger Reconciliation</h3>
            <table className="table" style={{ width: "100%", fontSize: 13, marginBottom: 24, borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--muted)" }}>Opening Balance (Start of Period)</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 600 }}>
                    ${selectedStatement.opening_balance}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--success)" }}>(+) Payments & Wallet Top-Ups</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--success)", fontWeight: 700 }}>
                    +${selectedStatement.payments_credits}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--warning)" }}>(-) Voice Call Usage Charges</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--warning)", fontWeight: 700 }}>
                    -${selectedStatement.call_charges}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 12px", color: "var(--muted)" }}>(-) Package / Monthly Rent Fees</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                    -${selectedStatement.package_rent}
                  </td>
                </tr>
                <tr style={{ background: "rgba(37,99,235,0.06)", borderTop: "2px solid var(--primary)" }}>
                  <td style={{ padding: "12px", fontWeight: 750, color: "var(--primary)" }}>Closing / Ending Statement Balance</td>
                  <td style={{ padding: "12px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>
                    ${selectedStatement.closing_balance}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* CDR Traffic Metrics */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Voice Traffic & Quality Metrics</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              <div style={{ padding: "12px", background: "var(--background-alt)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Total Calls</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{selectedStatement.total_calls}</div>
              </div>
              <div style={{ padding: "12px", background: "var(--background-alt)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Answered</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--success)", marginTop: 2 }}>{selectedStatement.answered_calls}</div>
              </div>
              <div style={{ padding: "12px", background: "var(--background-alt)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Duration (Mins)</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{selectedStatement.total_minutes}</div>
              </div>
              <div style={{ padding: "12px", background: "var(--background-alt)", borderRadius: 6 }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>ASR / ACD</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{selectedStatement.asr} / {selectedStatement.acd_seconds}s</div>
              </div>
            </div>

            {/* Period Daily Records */}
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Daily Log for this Period</h3>
            <div className="tableWrap" style={{ maxHeight: 240, overflowY: "auto", marginBottom: 24 }}>
              <table className="table" style={{ width: "100%", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "var(--background-alt)", textAlign: "left" }}>
                    <th style={{ padding: "6px 10px" }}>Date</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Calls</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Minutes</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Charges ($)</th>
                  </tr>
                </thead>
                <tbody>
                  {drawerDaily.map((d, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "6px 10px", fontFamily: "var(--font-mono, monospace)" }}>{d.date_str}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{d.calls} ({d.answered_calls} ans)</td>
                      <td style={{ padding: "6px 10px", textAlign: "right" }}>{Number(d.minutes).toFixed(2)}</td>
                      <td style={{ padding: "6px 10px", textAlign: "right", fontFamily: "var(--font-mono, monospace)", color: "var(--warning)", fontWeight: 650 }}>
                        ${Number(d.charges).toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Drawer Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn secondary"
                onClick={() => downloadStatementCsv(selectedStatement)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="download" size={14} />
                <span>Download Statement CSV</span>
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={printStatement}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="file" size={14} />
                <span>Print Statement / Save PDF</span>
              </button>
            </div>
          </div>
        </Drawer>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Carrier Statements Ledger"
        totalRows={filteredStatements.length}
        columns={["statement_number", "period", "period_start", "period_end", "opening_balance", "payments_credits", "call_charges", "package_rent", "net_change", "closing_balance", "total_minutes", "total_calls", "status"]}
        data={filteredStatements}
        filenamePrefix={`billing_statements_${customer?.account_name || "carrier"}`}
      />
    </div>
  );
}
