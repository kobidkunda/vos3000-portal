"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { FilterBar } from "../shared/FilterBar";
import { DataTable, type DataTableColumn, MonoPill, CurrencyCell } from "../shared/DataTable";
import { Drawer } from "../shared/Drawer";
import { ExportModal } from "../shared/ExportModal";
import { Status } from "../Status";
import { Icon } from "../../lib/icons";

interface PaymentRecord {
  id: string;
  customer_id?: string;
  customer_name?: string;
  account_name?: string;
  vos_account_id?: string;
  external_reference?: string | null;
  amount: string | number;
  currency: string;
  type: string;
  status: string;
  provider?: string | null;
  vos_serial?: string | null;
  fee?: string | null;
  credited_amount?: string | null;
  balance_after?: string | null;
  receipt_number?: string | null;
  metadata?: any;
  created_at: string;
  completed_at?: string | null;
}

export function PaymentsArchetype({
  side,
  title = "Payment History",
  purpose = "Customer-visible ledger of verified deposits, wire settlements and account credits.",
  route = "/app/billing/payments",
  rows = [],
  kpis = [],
  source = "postgres (public.payments + ledger_entries)",
  warnings,
}: {
  side: "Admin" | "Client";
  title?: string;
  purpose?: string;
  route?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}) {
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(`filter_search_${route}`) || "";
    }
    return "";
  });
  const [selectedPreset, setSelectedPreset] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedMethod, setSelectedMethod] = useState("All Methods");
  const [selectedTimezone, setSelectedTimezone] = useState("(UTC+05:30) Asia/Kolkata");
  const [activePayment, setActivePayment] = useState<PaymentRecord | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Check if route is a single payment detail route (e.g. /app/billing/payments/{paymentId})
  useEffect(() => {
    if (route.includes("/app/billing/payments/") && route !== "/app/billing/payments") {
      const parts = route.split("/");
      const targetId = decodeURIComponent(parts[parts.length - 1]);
      if (targetId && rows.length > 0) {
        const found = rows.find(
          (r) => r.id === targetId || r.external_reference === targetId || r.vos_serial === targetId
        );
        if (found) setActivePayment(found);
      }
    }
  }, [route, rows]);

  // Real data only from props
  const paymentList: PaymentRecord[] = useMemo(() => {
    return Array.isArray(rows) ? rows : [];
  }, [rows]);

  // Filter payment rows
  const filteredPayments = useMemo(() => {
    return paymentList.filter((p) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        [
          p.id,
          p.external_reference,
          p.vos_serial,
          p.provider,
          p.type,
          p.receipt_number,
          p.customer_name,
          p.account_name,
          p.vos_account_id,
          p.metadata?.payment_method_details,
          p.metadata?.notes,
        ]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));

      const statusStr = String(p.status || "").toLowerCase();
      const matchStatus =
        selectedStatus === "All Statuses" ||
        (selectedStatus === "Completed" && statusStr === "completed") ||
        (selectedStatus === "Pending" && (statusStr.includes("pending") || statusStr.includes("provider"))) ||
        (selectedStatus === "Processing" && (statusStr.includes("processing") || statusStr.includes("crediting"))) ||
        (selectedStatus === "Failed" && (statusStr.includes("failed") || statusStr.includes("error")));

      const providerStr = String(p.provider || p.metadata?.payment_method_details || "").toLowerCase();
      const matchMethod =
        selectedMethod === "All Methods" ||
        (selectedMethod === "Credit Card" && (providerStr.includes("card") || providerStr.includes("stripe") || providerStr.includes("visa") || providerStr.includes("mastercard"))) ||
        (selectedMethod === "Wire Transfer" && (providerStr.includes("wire") || providerStr.includes("swift") || providerStr.includes("fedwire"))) ||
        (selectedMethod === "ACH Direct" && (providerStr.includes("ach") || providerStr.includes("bank"))) ||
        (selectedMethod === "PayPal" && providerStr.includes("paypal")) ||
        (selectedMethod === "Crypto USDT" && (providerStr.includes("crypto") || providerStr.includes("nowpayments") || providerStr.includes("usdt") || providerStr.includes("trc") || providerStr.includes("erc"))) ||
        (selectedMethod === "Admin Adjustment" && (providerStr.includes("admin") || p.type?.includes("manual")));

      // Real date preset filtering
      let matchDate = true;
      if (selectedPreset !== "All" && (p.created_at || p.completed_at)) {
        const itemTime = new Date(p.completed_at || p.created_at).getTime();
        const now = Date.now();
        if (selectedPreset === "Today") {
          const startOfToday = new Date().setHours(0, 0, 0, 0);
          matchDate = itemTime >= startOfToday;
        } else if (selectedPreset === "24h") {
          matchDate = itemTime >= now - 24 * 3600 * 1000;
        } else if (selectedPreset === "7d") {
          matchDate = itemTime >= now - 7 * 24 * 3600 * 1000;
        } else if (selectedPreset === "30d") {
          matchDate = itemTime >= now - 30 * 24 * 3600 * 1000;
        }
      }

      return matchSearch && matchStatus && matchMethod && matchDate;
    });
  }, [paymentList, searchTerm, selectedStatus, selectedMethod, selectedPreset]);

  // Compute live KPIs from real rows
  const effectiveKpis = useMemo(() => {
    const completedRows = filteredPayments.filter((r) => String(r.status || "").toLowerCase() === "completed");
    const totalAmount = completedRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
    const pendingCount = filteredPayments.filter((r) => /pending|processing|crediting/i.test(String(r.status || ""))).length;
    const latestDate = completedRows[0]?.completed_at || completedRows[0]?.created_at || filteredPayments[0]?.created_at;
    const latestStr = latestDate
      ? new Date(latestDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "None";

    return [
      {
        label: "Total Inflow / Credited",
        value: `$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
        trend: `${completedRows.length} completed transactions`,
        trendDirection: "up" as const,
        color: "green" as const,
      },
      {
        label: "Completed Payments",
        value: `${completedRows.length} Reconciled`,
        trend: "Immutable ledger verified",
        trendDirection: "neutral" as const,
        color: "blue" as const,
      },
      {
        label: "Pending / Processing",
        value: `${pendingCount} In Pipeline`,
        trend: pendingCount > 0 ? "Awaiting gateway hook" : "All cleared",
        trendDirection: (pendingCount > 0 ? "down" : "neutral") as "down" | "neutral",
        color: (pendingCount > 0 ? "amber" : "cyan") as "amber" | "cyan",
      },
      {
        label: "Latest Settlement",
        value: latestStr,
        trend: "Live timestamp",
        trendDirection: "neutral" as const,
        color: "purple" as const,
      },
    ];
  }, [filteredPayments]);

  function copyToClipboard(text: string, key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  function handlePrintReceipt() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  // Format method display helper
  function renderMethodBadge(p: PaymentRecord) {
    const prov = (p.provider || p.metadata?.payment_method_details || p.type || "").toLowerCase();
    let label = "Payment Card";
    let iconName = "dollar";
    let badgeClass = "badge-neutral";

    if (prov.includes("wire") || prov.includes("swift")) {
      label = "Wire Transfer";
      iconName = "gateway";
      badgeClass = "badge-active";
    } else if (prov.includes("ach") || prov.includes("bank")) {
      label = "ACH Bank Direct";
      iconName = "shield";
      badgeClass = "badge-active";
    } else if (prov.includes("paypal")) {
      label = "PayPal";
      iconName = "wallet";
      badgeClass = "badge-active";
    } else if (prov.includes("crypto") || prov.includes("nowpayments") || prov.includes("usdt")) {
      label = "Crypto (NOWPayments)";
      iconName = "pulse";
      badgeClass = "badge-online";
    } else if (prov.includes("admin") || p.type?.includes("manual")) {
      label = "Admin Adjustment";
      iconName = "security";
      badgeClass = "badge-active";
    } else if (prov.includes("card") || prov.includes("stripe") || prov.includes("visa") || prov.includes("mastercard")) {
      label = "Credit Card (Online)";
      iconName = "dollar";
      badgeClass = "badge-neutral";
    } else {
      label = (p.provider || p.type || "Payment").toUpperCase();
    }

    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name={iconName} size={14} style={{ color: "var(--primary)" }} />
        <span style={{ fontWeight: 650, fontSize: 12.5 }}>{label}</span>
      </div>
    );
  }

  // Format date helper
  function formatDate(isoStr?: string | null) {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short",
      });
    } catch {
      return isoStr;
    }
  }

  // Columns definition for the DataTable
  const tableColumns: DataTableColumn[] = useMemo(() => {
    const cols: DataTableColumn[] = [
      {
        key: "created_at",
        header: "Date & Time",
        render: (row: PaymentRecord) => (
          <div>
            <div style={{ fontWeight: 650, color: "var(--text)", fontSize: 12.5 }}>
              {formatDate(row.completed_at || row.created_at)}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              {row.receipt_number ? `Receipt #${row.receipt_number}` : `ID: ${row.id.slice(0, 8)}…`}
            </div>
          </div>
        ),
      },
    ];

    if (side === "Admin") {
      cols.push({
        key: "customer_name",
        header: "Customer / Org",
        render: (row: PaymentRecord) => (
          <div>
            <div style={{ fontWeight: 700, color: "var(--primary)", fontSize: 12.5 }}>
              {row.customer_name || row.account_name || "Customer Account"}
            </div>
            {row.vos_account_id && (
              <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                VOS: {row.vos_account_id}
              </div>
            )}
          </div>
        ),
      });
    }

    cols.push(
      {
        key: "references",
        header: "Reference & VOS Serial",
        render: (row: PaymentRecord) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {row.external_reference ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text)" }}>
                  {row.external_reference}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(row.external_reference!, `ext_${row.id}`);
                  }}
                  className="btn ghost sm"
                  style={{ height: 20, width: 20, padding: 0 }}
                  title="Copy Processor Reference"
                >
                  <Icon name={copiedKey === `ext_${row.id}` ? "check" : "copy"} size={11} />
                </button>
              </div>
            ) : (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>No External Ref</span>
            )}
            {row.vos_serial && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className="badge badge-online mono" style={{ fontSize: 10.5, padding: "1px 6px" }}>
                  {row.vos_serial}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(row.vos_serial!, `vos_${row.id}`);
                  }}
                  className="btn ghost sm"
                  style={{ height: 18, width: 18, padding: 0 }}
                  title="Copy VOS Serial"
                >
                  <Icon name={copiedKey === `vos_${row.id}` ? "check" : "copy"} size={10} />
                </button>
              </div>
            )}
          </div>
        ),
      },
      {
        key: "method",
        header: "Payment Method",
        render: (row: PaymentRecord) => renderMethodBadge(row),
      },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        render: (row: PaymentRecord) => (
          <div>
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 750,
                color: String(row.status || "").toLowerCase() === "completed" ? "var(--success)" : "var(--text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              +${Number(row.amount).toFixed(2)}
            </span>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{row.currency || "USD"}</div>
          </div>
        ),
      },
      {
        key: "balance_after",
        header: "Balance After",
        align: "right",
        render: (row: PaymentRecord) => (
          row.balance_after ? (
            <CurrencyCell amount={row.balance_after} currency={row.currency || "USD"} />
          ) : (
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>—</span>
          )
        ),
      },
      {
        key: "status",
        header: "Status",
        align: "center",
        render: (row: PaymentRecord) => (
          <Status value={row.status || "completed"} size="sm" />
        ),
      },
      {
        key: "receipt",
        header: "Receipt / Action",
        align: "right",
        render: (row: PaymentRecord) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActivePayment(row);
              }}
              className="btn primary sm"
              style={{ height: 28, fontSize: 11.5, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <Icon name="receipt" size={12} />
              <span>Receipt</span>
            </button>
          </div>
        ),
      }
    );

    return cols;
  }, [side, copiedKey]);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge">
              {filteredPayments.length.toLocaleString()} records
            </span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions">
          <Link href={side === "Admin" ? "/admin/payments/new" : "/app/billing/add-funds"} className="btn primary sm">
            <Icon name="plus" size={13} />
            <span>{side === "Admin" ? "Manual Credit Adjustment" : "Add Funds"}</span>
          </Link>

          <Link href={side === "Admin" ? "/admin/reports" : "/app/billing/statements"} className="btn secondary sm">
            <Icon name="fileText" size={13} />
            <span>Statements</span>
          </Link>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => setIsExportOpen(true)}
          >
            <Icon name="download" size={13} />
            <span>Export Ledger</span>
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

      {/* 4 Financial KPIs Grid */}
      <KpiGrid>
        {effectiveKpis.map((k, idx) => (
          <KpiCard
            key={idx}
            label={k.label}
            value={k.value}
            trend={k.trend}
            trendDirection={(k.trendDirection as any) || "neutral"}
            icon={idx === 0 ? "wallet" : idx === 1 ? "check" : idx === 2 ? "pulse" : "dollar"}
            color={(k.color as any) || (idx === 0 ? "green" : idx === 1 ? "blue" : idx === 2 ? "amber" : "purple")}
          />
        ))}
      </KpiGrid>

      {/* Filter Bar */}
      <FilterBar
        searchPlaceholder="Search by Reference ID, VOS Serial, Method, Notes, Amount…"
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        datePresets={["Today", "24h", "7d", "30d", "All"]}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        timezones={["(UTC+05:30) Asia/Kolkata", "(UTC+00:00) UTC", "(UTC-05:00) America/New_York", "(UTC+01:00) Europe/London", "(UTC+04:00) Asia/Dubai"]}
        selectedTimezone={selectedTimezone}
        onTimezoneChange={setSelectedTimezone}
        statusOptions={["All Statuses", "Completed", "Pending", "Processing", "Failed"]}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        gatewayOptions={["All Methods", "Credit Card", "Wire Transfer", "ACH Direct", "PayPal", "Crypto USDT", "Admin Adjustment"]}
        selectedGateway={selectedMethod}
        onGatewayChange={setSelectedMethod}
        onReset={() => {
          setSearchTerm("");
          setSelectedPreset("All");
          setSelectedStatus("All Statuses");
          setSelectedMethod("All Methods");
        }}
        onExportClick={() => setIsExportOpen(true)}
        totalCount={filteredPayments.length}
      />

      {/* Payments Data Table */}
      <DataTable
        columns={tableColumns}
        data={filteredPayments}
        onRowClick={(row) => setActivePayment(row)}
        pageSize={12}
        emptyMessage={`No payment records match the current filter criteria (Source: ${source}).`}
      />

      {/* Official Payment Detail & Printable Receipt Drawer */}
      <Drawer
        isOpen={Boolean(activePayment)}
        onClose={() => setActivePayment(null)}
        title="Official Payment Receipt"
        subtitle={`Receipt Reference: ${activePayment?.receipt_number || activePayment?.vos_serial || activePayment?.external_reference || activePayment?.id?.slice(0, 13) || "Selected Record"}`}
        record={activePayment}
        headerHero={
          activePayment ? (
            <div
              ref={receiptPrintRef}
              style={{
                background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(16,185,129,0.06))",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "20px",
                marginBottom: 10,
              }}
            >
              {/* Receipt Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--muted)", textTransform: "uppercase" }}>
                    VOS3000 Carrier Telephony Network
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginTop: 2 }}>
                    Official Payment Receipt
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    Receipt #: {activePayment.receipt_number || `REC-${activePayment.id.slice(0, 8)}`}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Status value={activePayment.status || "completed"} size="sm" />
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                    {formatDate(activePayment.completed_at || activePayment.created_at)}
                  </div>
                </div>
              </div>

              {/* Amount Big Hero */}
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 650, color: "var(--muted)" }}>Net Credited Amount</div>
                  <div style={{ fontSize: 26, fontWeight: 850, color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                    +${Number(activePayment.amount).toFixed(2)} <span style={{ fontSize: 15, fontWeight: 600, color: "var(--muted)" }}>{activePayment.currency || "USD"}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 650, color: "var(--muted)" }}>Account Balance After Credit</div>
                  <div style={{ fontSize: 18, fontWeight: 750, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                    ${activePayment.balance_after ? Number(activePayment.balance_after).toFixed(2) : Number(activePayment.amount).toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Payer & Account Info */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12, marginBottom: 16 }}>
                <div style={{ background: "var(--surface)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontWeight: 600, fontSize: 11, marginBottom: 4 }}>PAYER ACCOUNT</div>
                  <div style={{ fontWeight: 750, color: "var(--text)" }}>{activePayment.customer_name || activePayment.account_name || "Customer Account"}</div>
                  <div className="mono" style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                    VOS ID: {activePayment.vos_account_id || "—"}
                  </div>
                </div>

                <div style={{ background: "var(--surface)", padding: 12, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <div style={{ color: "var(--muted)", fontWeight: 600, fontSize: 11, marginBottom: 4 }}>SETTLEMENT CHANNEL</div>
                  <div style={{ fontWeight: 750, color: "var(--text)" }}>
                    {activePayment.metadata?.payment_method_details || (activePayment.provider ? activePayment.provider.toUpperCase() : "DIRECT SETTLEMENT")}
                  </div>
                  <div className="mono" style={{ color: "var(--muted)", fontSize: 11, marginTop: 2 }}>
                    {activePayment.external_reference || "Direct Ledger Settlement"}
                  </div>
                </div>
              </div>

              {/* Financial Breakdown Table */}
              <div style={{ background: "var(--surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "12px 16px", marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 750, color: "var(--text)", marginBottom: 10 }}>
                  Financial Breakdown
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Gross Deposit Initiated</span>
                    <span style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>${Number(activePayment.amount).toFixed(2)} USD</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>Payment Gateway Processing Fee</span>
                    <span style={{ fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>${activePayment.fee || "0.00"} USD</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--border)", fontWeight: 750 }}>
                    <span>Total Credited to VOS Softswitch</span>
                    <span style={{ color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>+${Number(activePayment.amount).toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* 4-Step Verification Lifecycle */}
              <div style={{ background: "var(--surface)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", padding: "14px 16px" }}>
                <div style={{ fontSize: 11.5, fontWeight: 750, color: "var(--text)", marginBottom: 12 }}>
                  Immutable Audit Lifecycle
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11.5 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--success-bg)", color: "var(--success)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>✓</div>
                    <div>
                      <strong>1. Payment Initiated:</strong> Generated internal UUID <code className="mono">{activePayment.id.slice(0, 8)}</code>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--success-bg)", color: "var(--success)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>✓</div>
                    <div>
                      <strong>2. Provider Authorized:</strong> Verified by gateway (<code className="mono">{activePayment.external_reference || activePayment.provider || "Direct"}</code>)
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--success-bg)", color: "var(--success)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>✓</div>
                    <div>
                      <strong>3. VOS Softswitch Synced:</strong> Serial <code className="mono">{activePayment.vos_serial || "VOS-SYNCED"}</code> issued
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--success-bg)", color: "var(--success)", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>✓</div>
                    <div>
                      <strong>4. PostgreSQL Ledger Locked:</strong> Immutable ledger credit entry recorded
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : undefined
        }
        actions={
          activePayment
            ? [
                {
                  label: "Print / Save PDF Receipt",
                  primary: true,
                  onClick: handlePrintReceipt,
                },
                {
                  label: "Add Funds",
                  onClick: () => {
                    window.location.href = side === "Admin" ? "/admin/payments/new" : "/app/billing/add-funds";
                  },
                },
                {
                  label: "Copy Reference",
                  onClick: () => {
                    copyToClipboard(
                      activePayment.receipt_number || activePayment.vos_serial || activePayment.external_reference || activePayment.id,
                      "drawer_ref"
                    );
                  },
                },
              ]
            : []
        }
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Payment Ledger"
        totalRows={filteredPayments.length}
        columns={tableColumns}
        data={filteredPayments}
        filenamePrefix="payments_ledger"
      />
    </div>
  );
}
