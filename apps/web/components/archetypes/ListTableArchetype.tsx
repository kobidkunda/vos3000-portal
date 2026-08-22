"use client";
import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { KpiCard, KpiGrid } from "../shared/KpiCard";
import { FilterBar } from "../shared/FilterBar";
import { DataTable, type DataTableColumn, MonoPill, CurrencyCell } from "../shared/DataTable";
import { Drawer } from "../shared/Drawer";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { ExportModal } from "../shared/ExportModal";
import { Status } from "../Status";
import { QualityMeter } from "../Chart";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { FormErrorAlert } from "../shared/FormErrorAlert";
import { useFormError } from "../../lib/use-form-error";

export function ListTableArchetype({
  side,
  title,
  purpose,
  route,
  columns = [],
  rows = [],
  kpis = [],
  source = "vos + postgres (vos_portal)",
  warnings,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  route: string;
  columns?: string[];
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
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Real data state
  const [localRows, setLocalRows] = useState<any[]>(rows);
  useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  // Admin Manual Payment State
  const [isManualPaymentOpen, setIsManualPaymentOpen] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [manualAmount, setManualAmount] = useState("");
  const [manualMethod, setManualMethod] = useState("manual_bank_wire");
  const [manualRef, setManualRef] = useState("");
  const [manualMemo, setManualMemo] = useState("");
  const [manualBusy, setManualBusy] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState("");

  const {
    formError: manualFormError,
    fieldErrors: manualFieldErrors,
    setError: setManualError,
    clearFieldError: clearManualFieldError,
    clearErrors: clearManualErrors,
    bannerRef: manualBannerRef,
  } = useFormError({
    fallbackMessage: "Failed to submit manual payment.",
  });

  // Preserve search and status filter across navigation
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`filter_search_${route}`, searchTerm);
      sessionStorage.setItem(`filter_status_${route}`, selectedStatus);
    }
  }, [searchTerm, selectedStatus, route]);

  // Fetch customers when manual payment modal opens
  useEffect(() => {
    if (isManualPaymentOpen && side === "Admin") {
      async function loadCustomers() {
        try {
          const res: any = await api("/api/v1/admin/customers");
          if (res?.data || res?.items) {
            const list = Array.isArray(res.data) ? res.data : Array.isArray(res.items) ? res.items : [];
            setCustomerOptions(list);
            if (list.length > 0 && !selectedCustomerId) {
              setSelectedCustomerId(list[0].id);
            }
          }
        } catch {}
      }
      void loadCustomers();
    }
  }, [isManualPaymentOpen, side, selectedCustomerId]);

  // Route type checks
  const isCdr = route.includes("/cdr");
  const isGateway = route.includes("/gateways");
  const isAlarm = route.includes("/alarms");
  const isCustomer = route.includes("/customers");
  const isPayments = route.includes("/payments");

  // Real data only from state
  const effectiveData = useMemo(() => {
    return localRows && Array.isArray(localRows) ? localRows : [];
  }, [localRows]);

  // Live gateway options derived from real CDR rows - no hardcoded mock values
  const liveGatewayOptions = useMemo(() => {
    if (!isCdr) return [];
    const names = new Set<string>();
    effectiveData.forEach((r: any) => {
      const gw = r.mapping_gateway_id || r.gateway || r.gateway_name;
      if (gw) names.add(String(gw).trim());
    });
    return names.size > 0 ? ["All Gateways", ...Array.from(names).sort()] : [];
  }, [effectiveData, isCdr]);

  // Determine dynamic columns
  const effectiveColumns: (string | DataTableColumn)[] = useMemo(() => {
    if (isCustomer) {
      return [
        {
          key: "account_name",
          header: "Customer / Organization",
          render: (row: any) => {
            const name = row.organization_name ?? row.account_name ?? row.name ?? "Customer";
            return (
              <div>
                <Link
                  href={`/admin/customers/${row.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontWeight: 700, color: "var(--primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                  title="Open Dedicated Customer Details Workspace"
                >
                  <span>{name}</span>
                  <Icon name="external" size={11} />
                </Link>
                {row.vos_account_id && (
                  <div className="mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    VOS: {row.vos_account_id}
                  </div>
                )}
              </div>
            );
          },
        },
        { key: "vos_account_id", header: "VOS Account", mono: true },
        {
          key: "balance",
          header: "Wallet Balance",
          align: "right",
          render: (row: any) => {
            const bal = Number(row.balance) || 0;
            return (
              <span
                className="tabular"
                style={{
                  fontWeight: 750,
                  color: bal < 0 ? "var(--danger)" : bal < 50 ? "var(--warning)" : "var(--success)",
                }}
              >
                ${bal.toFixed(2)} USD
              </span>
            );
          },
        },
        {
          key: "status",
          header: "Status",
          render: (row: any) => <Status value={row.status ?? "active"} size="sm" />,
        },
        { key: "created_at", header: "Created", format: "datetime" },
      ];
    }

    if (columns && columns.length > 0) {
      return columns;
    }

    if (effectiveData.length > 0) {
      return Object.keys(effectiveData[0]).slice(0, 7);
    }

    return ["id", "name", "status", "created_at"];
  }, [isCustomer, columns, effectiveData]);

  // Filter rows by search term, status, and gateway
  const filteredRows = useMemo(() => {
    return effectiveData.filter((r) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        Object.values(r).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        );

      const rowAnswered = r.answered === 1 || r.answered === true || r.answered === "1" || /answered/i.test(String(r.status ?? ""));
      const rowStatus = String(r.status ?? r.state ?? r.severity ?? r.result ?? (rowAnswered ? "ANSWERED" : "FAILED")).toLowerCase();
      const termReason = String(r.termination_reason ?? "").toLowerCase();

      const matchStatus =
        selectedStatus === "All Statuses" ||
        rowStatus === selectedStatus.toLowerCase() ||
        (selectedStatus === "ANSWERED" && rowAnswered) ||
        (selectedStatus === "FAILED" && !rowAnswered) ||
        (selectedStatus === "NO ANSWER" && termReason.includes("no answer")) ||
        (selectedStatus === "CONGESTION" && termReason.includes("congestion")) ||
        (selectedStatus === "BUSY" && termReason.includes("busy"));

      const matchGateway =
        selectedGateway === "All Gateways" ||
        String(r.gateway ?? r.mapping_gateway_id ?? r.routing_gateway_id ?? r.entity ?? "").toLowerCase().includes(selectedGateway.toLowerCase());

      return matchSearch && matchStatus && matchGateway;
    });
  }, [effectiveData, searchTerm, selectedStatus, selectedGateway]);

  // Primary action button config
  const createAction = useMemo(() => {
    if (route.includes("/customers")) return { label: "Create Customer", href: "/admin/customers/new" };
    if (route.includes("/gateways")) return { label: "Add Gateway", href: "/admin/gateways/mapping" };
    if (route.includes("/rates")) return { label: "New Rate Group", href: "/admin/rates/groups" };
    if (route.includes("/users")) return { label: "Invite Admin", href: "/admin/security/users" };
    if (isPayments && side === "Client") return { label: "Add Funds (Crypto)", href: "/app/billing/add-funds" };
    return null;
  }, [route, isPayments, side]);

  function handleDelete() {
    if (!rowToDelete) return;
    setDeleting(true);
    setTimeout(() => {
      setDeleting(false);
      setRowToDelete(null);
    }, 600);
  }

  async function handleRecordManualPayment(e: React.FormEvent) {
    e.preventDefault();
    clearManualErrors();
    const amountNum = Number(manualAmount);
    const errs: Record<string, string> = {};

    if (!selectedCustomerId) {
      errs.customerId = "Please select a customer account.";
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      errs.amount = "Please enter a valid positive payment amount.";
    }
    if (!manualMemo.trim()) {
      errs.memo = "Internal memo / audit notes are required.";
    }

    if (Object.keys(errs).length > 0) {
      setManualError({
        message: "Please correct the highlighted fields before proceeding.",
        code: "VALIDATION_ERROR",
        fieldErrors: Object.entries(errs).map(([field, message]) => ({ field, message })),
        fieldErrorMap: errs,
      });
      return;
    }

    setManualBusy(true);

    try {
      const res: any = await api("/api/v1/admin/payments/manual", {
        method: "POST",
        body: JSON.stringify({
          customerId: selectedCustomerId,
          amount: amountNum.toFixed(2),
          currency: "USD",
          paymentMethod: manualMethod,
          reference: manualRef.trim() || undefined,
          memo: manualMemo.trim(),
        }),
      });

      if (res?.data?.payment || res?.ok) {
        const newPayment = res.data?.payment || {
          id: `manual_${Date.now()}`,
          customer_id: selectedCustomerId,
          amount: amountNum.toFixed(2),
          currency: "USD",
          type: "manual_payment",
          status: "COMPLETED",
          provider: manualMethod,
          created_at: new Date().toISOString(),
        };

        setLocalRows((prev) => [newPayment, ...prev]);
        setManualSuccessMsg(`Successfully credited $${amountNum.toFixed(2)} USD to customer.`);
        setManualAmount("");
        setManualRef("");
        setManualMemo("");
        setIsManualPaymentOpen(false);
        setTimeout(() => setManualSuccessMsg(""), 5000);
      } else {
        setManualError(res?.error || res || "Failed to record manual payment.");
      }
    } catch (err: any) {
      setManualError(err, { fallbackMessage: "Failed to submit manual payment." });
    } finally {
      setManualBusy(false);
    }
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge">
              {filteredRows.length.toLocaleString()} records
            </span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose || "Carrier-grade database records and operational listings."}</p>
        </div>

        <div className="pageActions">
          {/* Admin Record Manual Payment Button on Payments Route */}
          {isPayments && side === "Admin" && (
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                clearManualErrors();
                setIsManualPaymentOpen(true);
              }}
            >
              <Icon name="plus" size={13} />
              <span>Record Manual Payment</span>
            </button>
          )}

          {createAction && (
            <Link href={createAction.href} className="btn primary sm">
              <Icon name="plus" size={13} />
              <span>{createAction.label}</span>
            </Link>
          )}

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => setIsExportOpen(true)}
          >
            <Icon name="download" size={13} />
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {manualSuccessMsg && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <Icon name="check" size={16} />
          <span>{manualSuccessMsg}</span>
        </div>
      )}

      {/* Warnings Banner */}
      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 650, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>{warnings.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Summary KPI Grid */}
      {kpis && kpis.length > 0 && (
        <KpiGrid>
          {kpis.slice(0, 4).map((k: any, idx: number) => (
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
      )}

      {/* Filter Toolbar */}
      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusOptions={
          isCdr
            ? ["All Statuses", "ANSWERED", "FAILED", "NO ANSWER", "CONGESTION", "BUSY"]
            : ["All Statuses", "Active", "Completed", "Pending", "Failed", "Disabled"]
        }
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        gatewayOptions={
          isCdr && liveGatewayOptions.length > 0
            ? liveGatewayOptions
            : undefined
        }
        selectedGateway={selectedGateway}
        onGatewayChange={setSelectedGateway}
        selectedPreset={selectedPreset}
        onPresetChange={setSelectedPreset}
        selectedTimezone={selectedTimezone}
        onTimezoneChange={setSelectedTimezone}
        totalCount={filteredRows.length}
      />

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <DataTable
          columns={effectiveColumns}
          data={filteredRows}
          onRowClick={(row) => setActiveRow(row)}
          emptyMessage={`No ${title.toLowerCase()} records match your filter criteria.`}
        />
      </div>

      {/* Record Manual Payment Modal Dialog */}
      {isManualPaymentOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(3px)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 24,
              boxShadow: "var(--shadow-lg)",
              background: "var(--surface)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="dollar" size={18} className="text-primary" />
                <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Record Manual Customer Payment</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsManualPaymentOpen(false)}
                className="btn secondary sm"
                style={{ padding: "4px 8px" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordManualPayment} noValidate>
              <FormErrorAlert
                ref={manualBannerRef}
                error={manualFormError}
                onDismiss={clearManualErrors}
              />
              {/* Customer Selector */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="field-customerId" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Target Customer Account *
                </label>
                <select
                  id="field-customerId"
                  className={`input ${manualFieldErrors.customerId ? "inputError" : ""}`}
                  value={selectedCustomerId}
                  onChange={(e) => {
                    setSelectedCustomerId(e.target.value);
                    clearManualFieldError("customerId");
                  }}
                  aria-invalid={Boolean(manualFieldErrors.customerId)}
                  aria-describedby={manualFieldErrors.customerId ? "field-customerId-error" : undefined}
                  required
                  style={{ width: "100%" }}
                >
                  <option value="">Select Customer...</option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.account_name || c.organization_name || c.name} (VOS: {c.vos_account_id || "Unmapped"} · Bal: ${Number(c.balance || 0).toFixed(2)})
                    </option>
                  ))}
                </select>
                {manualFieldErrors.customerId && (
                  <div className="fieldError" id="field-customerId-error" role="alert" style={{ marginTop: 4 }}>
                    {manualFieldErrors.customerId}
                  </div>
                )}
              </div>

              {/* Amount & Method */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label htmlFor="field-amount" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Amount (USD) *
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontWeight: 700 }}>$</span>
                    <input
                      id="field-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={`input ${manualFieldErrors.amount ? "inputError" : ""}`}
                      style={{ paddingLeft: 24, width: "100%", fontWeight: 700 }}
                      placeholder="100.00"
                      value={manualAmount}
                      onChange={(e) => {
                        setManualAmount(e.target.value);
                        clearManualFieldError("amount");
                      }}
                      aria-invalid={Boolean(manualFieldErrors.amount)}
                      aria-describedby={manualFieldErrors.amount ? "field-amount-error" : undefined}
                      required
                    />
                  </div>
                  {manualFieldErrors.amount && (
                    <div className="fieldError" id="field-amount-error" role="alert" style={{ marginTop: 4 }}>
                      {manualFieldErrors.amount}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="field-paymentMethod" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    Payment Method *
                  </label>
                  <select
                    id="field-paymentMethod"
                    className="input"
                    value={manualMethod}
                    onChange={(e) => setManualMethod(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="manual_bank_wire">Bank Wire / ACH</option>
                    <option value="manual_crypto_direct">Direct Crypto (Off-chain)</option>
                    <option value="manual_cash">Cash Settlement</option>
                    <option value="manual_check">Check / Cheque</option>
                    <option value="manual_admin_credit">Admin Credit Adjustment</option>
                  </select>
                </div>
              </div>

              {/* Reference / Transaction ID */}
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="field-reference" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  External Reference / Bank Slip # / Tx Hash (Optional)
                </label>
                <input
                  id="field-reference"
                  type="text"
                  className="input"
                  placeholder="e.g. WIRE-2026-98124 or 0x3f98a..."
                  value={manualRef}
                  onChange={(e) => setManualRef(e.target.value)}
                  style={{ width: "100%", fontFamily: "IBM Plex Mono, monospace", fontSize: 12 }}
                />
              </div>

              {/* Notes / Memo */}
              <div style={{ marginBottom: 20 }}>
                <label htmlFor="field-memo" style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Internal Memo / Audit Notes *
                </label>
                <textarea
                  id="field-memo"
                  className={`input ${manualFieldErrors.memo ? "inputError" : ""}`}
                  rows={2}
                  placeholder="Enter reason or settlement details for immutable audit log..."
                  value={manualMemo}
                  onChange={(e) => {
                    setManualMemo(e.target.value);
                    clearManualFieldError("memo");
                  }}
                  aria-invalid={Boolean(manualFieldErrors.memo)}
                  aria-describedby={manualFieldErrors.memo ? "field-memo-error" : undefined}
                  style={{ width: "100%", fontSize: 12 }}
                  required
                />
                {manualFieldErrors.memo && (
                  <div className="fieldError" id="field-memo-error" role="alert" style={{ marginTop: 4 }}>
                    {manualFieldErrors.memo}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setIsManualPaymentOpen(false)}
                  disabled={manualBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={manualBusy || !selectedCustomerId || !manualAmount}
                  style={{ gap: 6 }}
                >
                  <Icon name="check" size={14} />
                  <span>{manualBusy ? "Recording Payment…" : "Record & Credit Account"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Row Inspection Drawer */}
      <Drawer
        isOpen={Boolean(activeRow)}
        onClose={() => setActiveRow(null)}
        title={
          activeRow
            ? `Record Inspection: ${activeRow.id ?? activeRow.serial_number ?? activeRow.name ?? "Detail"}`
            : "Record Detail"
        }
        subtitle="PostgreSQL ledger record details and VOS engine state."
        record={activeRow ?? {}}
        actions={
          activeRow && activeRow.customer_id
            ? [
                {
                  label: "View Customer Overview",
                  primary: true,
                  onClick: () => {
                    window.location.href = `/admin/customers/${activeRow.customer_id}`;
                  },
                },
                {
                  label: "Export Record",
                  onClick: () => setIsExportOpen(true),
                },
                {
                  label: "Delete / Revoke",
                  danger: true,
                  onClick: () => {
                    const target = activeRow;
                    setActiveRow(null);
                    setRowToDelete(target);
                  },
                },
              ]
            : [
                {
                  label: "Export Record",
                  primary: true,
                  onClick: () => setIsExportOpen(true),
                },
                {
                  label: "Delete / Revoke",
                  danger: true,
                  onClick: () => {
                    const target = activeRow;
                    setActiveRow(null);
                    setRowToDelete(target);
                  },
                },
              ]
        }
      />

      {/* Export Modal Dialog */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title={`Export ${title} Records`}
        totalRows={filteredRows.length}
        columns={effectiveColumns}
        data={filteredRows}
        filenamePrefix={title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}
      />

      {/* Delete / Revoke Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(rowToDelete)}
        title="Confirm Record Deletion"
        message={`Are you sure you want to delete or revoke this record (${rowToDelete?.id ?? rowToDelete?.name ?? "Selected item"})? This action cannot be undone and will be logged in the immutable audit registry.`}
        confirmLabel="Confirm Delete"
        isDanger={true}
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setRowToDelete(null)}
      />
    </div>
  );
}
