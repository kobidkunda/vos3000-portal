"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { QualityMeter } from "../Chart";
import { PhonePill, CountryFlag, PhoneInput } from "./PhonePill";
export { PhonePill, CountryFlag, PhoneInput };

export interface DataTableColumn<T = any> {
  key: string;
  header: string;
  render?: (row: T, isSelected?: boolean) => React.ReactNode;
  width?: string | number;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  category?: "essential" | "financial" | "technical" | "general";
  hiddenByDefault?: boolean;
}

export interface DataTableProps<T = any> {
  columns: (string | DataTableColumn<T>)[];
  data: T[];
  onRowClick?: (row: T) => void;
  onEditClick?: (row: T) => void;
  onDeleteClick?: (row: T) => void;
  onBulkExport?: (selectedRows: T[]) => void;
  pageSize?: number;
  emptyMessage?: string;
  isLoading?: boolean;
  title?: string;
  enableSelection?: boolean;
  enableColumnChooser?: boolean;
  enableDensity?: boolean;
  enableViewToggle?: boolean;
  defaultDensity?: "comfortable" | "compact" | "dense";
  defaultViewMode?: "table" | "card" | "auto";
}

// --------------------------------------------------------------------------
// Sub-components: Formatting & Utility Badges
// --------------------------------------------------------------------------

export function MonoPill({
  value,
  fullValue,
  shorten = true,
}: {
  value: string;
  fullValue?: string;
  shorten?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const targetVal = fullValue ?? value;

  const displayVal = useMemo(() => {
    if (!shorten || !value) return value;
    if (value.length > 20 && value.includes("-")) {
      // UUID format: 43932076-8fe2-44f4-b341-6d1289790ce3 -> 4393...0ce3
      const parts = value.split("-");
      return `${parts[0].slice(0, 4)}…${parts[parts.length - 1].slice(-4)}`;
    }
    if (value.length > 22) {
      return `${value.slice(0, 8)}…${value.slice(-6)}`;
    }
    return value;
  }, [value, shorten]);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(targetVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <span className="monoPill" title={`Click to copy: ${targetVal}`} onClick={handleCopy}>
      <span className="monoPillText">{displayVal}</span>
      <button
        type="button"
        className={`monoPillBtn ${copied ? "copied" : ""}`}
        aria-label="Copy identifier"
      >
        <Icon name={copied ? "check" : "copy"} size={11} />
      </button>
    </span>
  );
}

export function CurrencyCell({
  amount,
  currency = "USD",
}: {
  amount: number | string;
  currency?: string;
}) {
  const num = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (isNaN(num)) return <span style={{ color: "var(--muted)" }}>—</span>;

  const isZero = num === 0;
  const isNegative = num < 0;

  // Currency symbol mapping
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "CA$",
    AUD: "AU$",
    INR: "₹",
    AED: "AED ",
    SGD: "SG$",
  };
  const sym = symbols[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;

  // Precise or 2 decimals
  const formatted = Math.abs(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(num) < 0.01 && num !== 0 ? 4 : 2,
  });

  return (
    <span
      className={`currencyCell ${isZero ? "amountZero" : isNegative ? "amountNegative" : "amountPositive"}`}
    >
      {isNegative ? "-" : ""}
      {sym}
      {formatted}
    </span>
  );
}

export function DateCell({ isoString }: { isoString: string }) {
  if (!isoString) return <span style={{ color: "var(--muted)" }}>—</span>;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return <span>{isoString}</span>;

  // Format: Aug 22, 2026 11:24 AM
  const formatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <span style={{ fontSize: 12.5 }} title={isoString}>
      <span style={{ color: "var(--text)", fontWeight: 550 }}>{formatted}</span>{" "}
      <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{timeFormatted}</span>
    </span>
  );
}

// --------------------------------------------------------------------------
// Main DataTable Component
// --------------------------------------------------------------------------

export function DataTable<T extends Record<string, any> = any>({
  columns: rawColumns,
  data,
  onRowClick,
  onEditClick,
  onDeleteClick,
  onBulkExport,
  pageSize = 10,
  emptyMessage = "No records found matching current query criteria.",
  isLoading = false,
  enableSelection = true,
  enableColumnChooser = true,
  enableDensity = true,
  enableViewToggle = true,
  defaultDensity = "compact",
  defaultViewMode = "auto",
}: DataTableProps<T>) {
  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);
  const [density, setDensity] = useState<"comfortable" | "compact" | "dense">(defaultDensity);
  const [viewMode, setViewMode] = useState<"table" | "card" | "auto">(defaultViewMode);
  const [isMobile, setIsMobile] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Column Chooser Popover State
  const [isColumnChooserOpen, setIsColumnChooserOpen] = useState(false);
  const [columnSearch, setColumnSearch] = useState("");
  const columnChooserRef = useRef<HTMLDivElement>(null);

  // Responsive Breakpoint Detection
  useEffect(() => {
    function checkWidth() {
      setIsMobile(window.innerWidth < 768);
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Close Column Chooser on Outside Click
  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (columnChooserRef.current && !columnChooserRef.current.contains(e.target as Node)) {
        setIsColumnChooserOpen(false);
      }
    }
    if (isColumnChooserOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isColumnChooserOpen]);

  // Normalize column definitions & Smart Header Humanization
  const allColumns: DataTableColumn<T>[] = useMemo(() => {
    const isBigDataset = rawColumns.length >= 8;

    return rawColumns.map((col) => {
      if (typeof col === "string") {
        const key = col;

        // Categorize & Label
        let header = key.replace(/_/g, " ").toUpperCase();
        let category: DataTableColumn["category"] = "general";
        let hiddenByDefault = false;

        if (key === "organization_name") {
          header = "CUSTOMER / ORG";
          category = "essential";
        } else if (key === "account_name" || key === "name") {
          header = "NAME / ACCOUNT";
          category = "essential";
        } else if (key === "vos_account_id") {
          header = "VOS ACCOUNT";
          category = "essential";
        } else if (key === "balance") {
          header = "BALANCE";
          category = "financial";
        } else if (key === "currency") {
          header = "CURRENCY";
          category = "financial";
        } else if (key === "overdraft_limit") {
          header = "OVERDRAFT LIMIT";
          category = "financial";
        } else if (key === "low_balance_threshold") {
          header = "LOW BALANCE THRESHOLD";
          category = "financial";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "status" || key === "state" || key === "severity") {
          header = "STATUS";
          category = "essential";
        } else if (key === "created_at" || key === "created") {
          header = "CREATED DATE";
          category = "essential";
        } else if (key === "updated_at" || key === "updated") {
          header = "UPDATED DATE";
          category = "technical";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "expires_at") {
          header = "EXPIRY";
          category = "financial";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "rate_group_id") {
          header = "RATE GROUP";
          category = "financial";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "organization_id") {
          header = "ORGANIZATION ID";
          category = "technical";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "vos_instance_id") {
          header = "INSTANCE ID";
          category = "technical";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "kind") {
          header = "DIRECTION / KIND";
          category = "essential";
        } else if (key === "configured_ip") {
          header = "CONFIGURED IP";
          category = "technical";
        } else if (key === "register_type") {
          header = "REGISTRATION TYPE";
          category = "technical";
        } else if (key === "line_limit") {
          header = "LINE CAPACITY";
          category = "technical";
        } else if (key === "cps_limit") {
          header = "CPS LIMIT";
          category = "technical";
        } else if (key === "last_registered_at") {
          header = "LAST REGISTERED";
          category = "technical";
        } else if (key === "vos_gateway_id") {
          header = "VOS GATEWAY";
          category = "technical";
        } else if (key === "id") {
          header = "IDENTIFIER";
          category = "technical";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "caller" || key === "calling" || key === "caller_number" || key === "ani") {
          header = "CALLER (ANI)";
          category = "essential";
        } else if (key === "callee" || key === "called" || key === "callee_number" || key === "dnis") {
          header = "CALLEE (DNIS)";
          category = "essential";
        } else if (key === "phone" || key === "mobile" || key === "contact_phone") {
          header = "PHONE NUMBER";
          category = "essential";
        } else if (key === "serial_number") {
          header = "SERIAL NUMBER";
          category = "essential";
        } else if (key === "answered") {
          header = "CALL STATUS";
          category = "essential";
        } else if (key === "duration") {
          header = "DURATION";
          category = "essential";
        } else if (key === "charged_duration") {
          header = "BILLED DURATION";
          category = "essential";
        } else if (key === "customer_charge") {
          header = "CUSTOMER CHARGE";
          category = "financial";
        } else if (key === "carrier_cost") {
          header = "CARRIER COST";
          category = "financial";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "mapping_gateway_id") {
          header = "INGRESS GATEWAY";
          category = "technical";
        } else if (key === "routing_gateway_id") {
          header = "EGRESS GATEWAY";
          category = "technical";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "termination_reason") {
          header = "TERMINATION REASON";
          category = "essential";
        } else if (key === "hangup_side") {
          header = "HANGUP SIDE";
          category = "technical";
        } else if (key === "calling_call_id") {
          header = "LEG A CALL-ID";
          category = "technical";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "called_call_id") {
          header = "LEG B CALL-ID";
          category = "technical";
          if (isBigDataset) hiddenByDefault = true;
        } else if (key === "area_name") {
          header = "DESTINATION";
          category = "essential";
        } else if (key === "area_prefix") {
          header = "PREFIX";
          category = "technical";
        } else if (key === "pdd_ms") {
          header = "PDD (MS)";
          category = "technical";
        } else if (key === "begin_time") {
          header = "START TIME";
          category = "essential";
        } else if (key === "end_time") {
          header = "END TIME";
          category = "essential";
        }

        const isPhone = /(^(caller|callee|calling|called|ani|dnis|phone|mobile|telephone|contact_phone)$|_phone$|_caller$|_callee$|caller_e164|callee_e164)/i.test(key);
        const isCurrency = /(amount|balance|charge|revenue|cost|overdraft_limit|low_balance_threshold)/i.test(key);
        const isNum = !isPhone && (isCurrency || /(rate|cps|asr|acd|channels|rows|count|minutes)/i.test(key));
        const isMono = !isPhone && /(id|ip|call_id|gateway|prefix|endpoint|request_id|token|secret|uuid|host|account_id|vos_account|serial_number)/i.test(key);
        const isStatus = /(status|severity|state|health)/i.test(key);
        const isQuality = /(pdd|latency|packet_loss|mos)/i.test(key);
        const isDate = /(created_at|updated_at|begin|time|expires_at|created|lastlogin|lastused|updated)/i.test(key);

        return {
          key,
          header,
          category,
          hiddenByDefault,
          align: isNum ? "right" : isStatus || key === "answered" ? "left" : "left",
          sortable: true,
          render: (row: any) => {
            const val = row[key];
            if (val === null || val === undefined || val === "") {
              return <span style={{ color: "var(--muted)" }}>—</span>;
            }

            if (key === "answered") {
              const isAnswered = val === 1 || val === true || val === "1";
              const reason = row.termination_reason ? String(row.termination_reason).split("(")[0].trim() : "";
              return (
                <span className={`badge ${isAnswered ? "badge-online" : "badge-offline"}`} style={{ fontSize: 11, fontWeight: 700 }}>
                  {isAnswered ? "ANSWERED" : reason || "FAILED"}
                </span>
              );
            }

            if (isStatus) {
              return <Status value={val} size="sm" />;
            }

            if (isPhone) {
              return <PhonePill value={String(val)} fullValue={String(val)} />;
            }

            if (isCurrency) {
              return <CurrencyCell amount={val} currency={row.currency ?? "USD"} />;
            }

            if (key === "duration" || key === "charged_duration") {
              const secs = Number(val) || 0;
              const m = Math.floor(secs / 60);
              const s = secs % 60;
              const formatted = m > 0 ? `${m}m ${s}s` : `${s}s`;
              return (
                <span className="mono" style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: 12 }}>
                  {formatted} <span style={{ color: "var(--muted)", fontSize: 10 }}>({secs}s)</span>
                </span>
              );
            }

            if (key === "hangup_side") {
              return (
                <span className="badge" style={{ fontSize: 10.5, textTransform: "capitalize", background: "var(--surface2)" }}>
                  {String(val)}
                </span>
              );
            }

            if (key === "termination_reason") {
              const str = String(val);
              const isNormal = /normal/i.test(str);
              return (
                <span style={{ fontSize: 12, color: isNormal ? "var(--text)" : "var(--danger)", fontWeight: isNormal ? 400 : 600 }} title={str}>
                  {str}
                </span>
              );
            }

            if (key === "mapping_gateway_id" || key === "routing_gateway_id") {
              return (
                <span className="monoPill" style={{ fontSize: 11.5 }}>
                  <span className="monoPillText">{String(val)}</span>
                </span>
              );
            }

            if (isQuality && typeof val === "number") {
              return <QualityMeter value={val} type={key.includes("mos") ? "mos" : "latency"} />;
            }

            if (isDate && typeof val === "string" && (val.includes("T") || val.includes("-") || val.includes(":"))) {
              return <DateCell isoString={val} />;
            }

            if (isMono) {
              return <MonoPill value={String(val)} />;
            }

            if (typeof val === "number") {
              return (
                <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {val.toLocaleString()}
                </span>
              );
            }

            return <span style={{ fontWeight: key.includes("name") ? 600 : 400 }}>{String(val)}</span>;
          },
        };
      }
      return col;
    });
  }, [rawColumns]);

  // Visible Columns Set
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    allColumns.forEach((col) => {
      if (!col.hiddenByDefault) initial.add(col.key);
    });
    // Ensure at least some columns visible
    if (initial.size === 0) {
      allColumns.slice(0, 5).forEach((col) => initial.add(col.key));
    }
    return initial;
  });

  const activeColumns = useMemo(() => {
    return allColumns.filter((col) => visibleColumnKeys.has(col.key));
  }, [allColumns, visibleColumnKeys]);

  // Column Presets Handlers
  function applyPreset(type: "essential" | "financial" | "all") {
    const next = new Set<string>();
    allColumns.forEach((col) => {
      if (type === "all") {
        next.add(col.key);
      } else if (type === "essential") {
        if (col.category === "essential" || col.category === "financial" || !col.hiddenByDefault) {
          next.add(col.key);
        }
      } else if (type === "financial") {
        if (
          col.category === "financial" ||
          col.key.includes("name") ||
          col.key === "status" ||
          col.key === "currency"
        ) {
          next.add(col.key);
        }
      }
    });
    setVisibleColumnKeys(next);
  }

  function toggleColumn(key: string) {
    setVisibleColumnKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Quick Filter within table data
  const filteredData = useMemo(() => {
    if (!quickFilter.trim()) return data;
    const q = quickFilter.toLowerCase().trim();
    return data.filter((row: any) =>
      Object.values(row).some(
        (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q)
      )
    );
  }, [data, quickFilter]);

  // Sorting
  function handleHeaderClick(col: DataTableColumn) {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(col.key);
      setSortDir("asc");
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a: any, b: any) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDir === "asc" ? numA - numB : numB - numA;
      }
      return sortDir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  // Selection Handlers
  const isAllPaginatedSelected =
    paginatedData.length > 0 &&
    paginatedData.every((row: any) => selectedIds.has(String(row.id ?? row._id ?? row.serial_number ?? JSON.stringify(row))));

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPaginatedSelected) {
        paginatedData.forEach((row: any) => {
          next.delete(String(row.id ?? row._id ?? row.serial_number ?? JSON.stringify(row)));
        });
      } else {
        paginatedData.forEach((row: any) => {
          next.add(String(row.id ?? row._id ?? row.serial_number ?? JSON.stringify(row)));
        });
      }
      return next;
    });
  }

  function toggleSelectRow(row: any, e: React.MouseEvent) {
    e.stopPropagation();
    const id = String(row.id ?? row._id ?? row.serial_number ?? JSON.stringify(row));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleCopySelectedIds() {
    const ids = Array.from(selectedIds);
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(ids.join(", "));
      alert(`Copied ${ids.length} identifiers to clipboard.`);
    }
  }

  const selectedRowsList = useMemo(() => {
    return data.filter((row: any) =>
      selectedIds.has(String(row.id ?? row._id ?? row.serial_number ?? JSON.stringify(row)))
    );
  }, [data, selectedIds]);

  const hasActions = Boolean(onRowClick || onEditClick || onDeleteClick);
  const effectiveIsCardView = viewMode === "card" || (viewMode === "auto" && isMobile);

  return (
    <div className={`tableWrap density-${density}`}>
      {/* -------------------------------------------------------------------- */}
      {/* Table Toolbar: Quick Filter, View Switcher, Density, Column Chooser */}
      {/* -------------------------------------------------------------------- */}
      <div className="tableToolbar">
        <div className="tableToolbarGroup">
          {/* Quick Search within Table */}
          <div className="filterInputWrap" style={{ width: 220, minWidth: 160 }}>
            <Icon name="search" size={13} />
            <input
              type="text"
              className="filterInput"
              placeholder={`Filter ${filteredData.length} records…`}
              value={quickFilter}
              onChange={(e) => {
                setQuickFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ height: 32, fontSize: 12 }}
            />
            {quickFilter && (
              <button
                type="button"
                onClick={() => setQuickFilter("")}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 2,
                }}
                aria-label="Clear filter"
              >
                <Icon name="close" size={11} />
              </button>
            )}
          </div>

          {/* Table / Card View Mode Switcher */}
          {enableViewToggle && (
            <div className="tableSegmentControl">
              <button
                type="button"
                className={`tableSegmentBtn ${!effectiveIsCardView ? "active" : ""}`}
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <Icon name="file" size={12} />
                <span>Table</span>
              </button>
              <button
                type="button"
                className={`tableSegmentBtn ${effectiveIsCardView ? "active" : ""}`}
                onClick={() => setViewMode("card")}
                title="Card View (Mobile Optimized)"
              >
                <Icon name="dashboard" size={12} />
                <span>Cards</span>
              </button>
            </div>
          )}

          {/* Density Segmented Control */}
          {enableDensity && !effectiveIsCardView && (
            <div className="tableSegmentControl desktopDensityControl">
              <button
                type="button"
                className={`tableSegmentBtn ${density === "comfortable" ? "active" : ""}`}
                onClick={() => setDensity("comfortable")}
                title="Comfortable Row Height (48px)"
              >
                Comfort
              </button>
              <button
                type="button"
                className={`tableSegmentBtn ${density === "compact" ? "active" : ""}`}
                onClick={() => setDensity("compact")}
                title="Compact Row Height (38px)"
              >
                Compact
              </button>
              <button
                type="button"
                className={`tableSegmentBtn ${density === "dense" ? "active" : ""}`}
                onClick={() => setDensity("dense")}
                title="Dense Carrier Telemetry (30px)"
              >
                Dense
              </button>
            </div>
          )}
        </div>

        <div className="tableToolbarGroup">
          {/* Column Chooser Dropdown */}
          {enableColumnChooser && (
            <div className="columnChooserWrapper" ref={columnChooserRef}>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setIsColumnChooserOpen((o) => !o)}
                style={{ height: 32, fontSize: 12, padding: "0 10px", gap: 6 }}
              >
                <Icon name="settings" size={13} />
                <span>Columns ({activeColumns.length}/{allColumns.length})</span>
                <Icon name="chevronDown" size={11} />
              </button>

              {isColumnChooserOpen && (
                <div className="columnChooserPopover">
                  <div className="columnChooserHead">
                    <span>Customize Columns</span>
                    <button
                      type="button"
                      className="iconBtn"
                      onClick={() => setIsColumnChooserOpen(false)}
                      style={{ width: 22, height: 22 }}
                    >
                      <Icon name="close" size={12} />
                    </button>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="columnChooserPresets">
                    <button
                      type="button"
                      className="columnChooserPresetBtn"
                      onClick={() => applyPreset("essential")}
                    >
                      Essential
                    </button>
                    <button
                      type="button"
                      className="columnChooserPresetBtn"
                      onClick={() => applyPreset("financial")}
                    >
                      Financial
                    </button>
                    <button
                      type="button"
                      className="columnChooserPresetBtn"
                      onClick={() => applyPreset("all")}
                    >
                      All ({allColumns.length})
                    </button>
                  </div>

                  {/* Column Search Input */}
                  <div style={{ padding: "6px 10px", borderBottom: "1px solid var(--border)" }}>
                    <input
                      type="text"
                      className="input sm"
                      placeholder="Search columns…"
                      value={columnSearch}
                      onChange={(e) => setColumnSearch(e.target.value)}
                      style={{ width: "100%", height: 28, fontSize: 11.5 }}
                    />
                  </div>

                  {/* Checkbox List */}
                  <div className="columnChooserList">
                    {allColumns
                      .filter((col) =>
                        col.header.toLowerCase().includes(columnSearch.toLowerCase()) ||
                        col.key.toLowerCase().includes(columnSearch.toLowerCase())
                      )
                      .map((col) => {
                        const isChecked = visibleColumnKeys.has(col.key);
                        return (
                          <label key={col.key} className="columnChooserItem">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleColumn(col.key)}
                            />
                            <span>{col.header}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* View 1: Responsive Table View (Desktop & Tablet)                     */}
      {/* -------------------------------------------------------------------- */}
      {!effectiveIsCardView ? (
        <div className="tableScrollArea">
          <table className="table">
            <thead>
              <tr>
                {enableSelection && (
                  <th style={{ width: 36, textAlign: "center", padding: "10px 8px" }}>
                    <input
                      type="checkbox"
                      checked={isAllPaginatedSelected}
                      onChange={toggleSelectAll}
                      style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                      aria-label="Select all rows on page"
                    />
                  </th>
                )}

                {activeColumns.map((col, idx) => (
                  <th
                    key={col.key}
                    className={`${col.sortable ? "sortable" : ""} ${idx === 0 ? "stickyLeft" : ""}`}
                    style={{
                      textAlign: col.align ?? "left",
                      width: col.width,
                    }}
                    onClick={() => handleHeaderClick(col)}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        justifyContent:
                          col.align === "right"
                            ? "flex-end"
                            : col.align === "center"
                            ? "center"
                            : "flex-start",
                        width: "100%",
                      }}
                    >
                      <span>{col.header}</span>
                      {sortKey === col.key && (
                        <Icon name={sortDir === "asc" ? "chevronUp" : "chevronDown"} size={11} />
                      )}
                    </div>
                  </th>
                ))}

                {hasActions && (
                  <th className="actionsCol" style={{ textAlign: "right", width: 90 }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {enableSelection && <td style={{ width: 36 }}><div className="skeletonPulse" style={{ width: 16, height: 16, margin: "auto" }} /></td>}
                    {activeColumns.map((col) => (
                      <td key={col.key}>
                        <div className="skeletonPulse" style={{ height: 16, width: "70%" }} />
                      </td>
                    ))}
                    {hasActions && <td className="actionsCol"><div className="skeletonPulse" style={{ height: 16, width: 40, marginLeft: "auto" }} /></td>}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + (enableSelection ? 1 : 0) + (hasActions ? 1 : 0)}
                    style={{ textAlign: "center", padding: "48px 24px", color: "var(--muted)" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          background: "var(--surface2)",
                          display: "grid",
                          placeItems: "center",
                          color: "var(--muted)",
                        }}
                      >
                        <Icon name="search" size={20} />
                      </div>
                      <div style={{ fontWeight: 650, color: "var(--text)" }}>{emptyMessage}</div>
                      {quickFilter && (
                        <button
                          type="button"
                          className="btn secondary sm"
                          onClick={() => setQuickFilter("")}
                          style={{ height: 28 }}
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row: any, rIdx) => {
                  const rowId = String(row.id ?? row._id ?? row.serial_number ?? rIdx);
                  const isSelected = selectedIds.has(rowId);

                  return (
                    <tr
                      key={rowId}
                      className={isSelected ? "rowSelected" : ""}
                      onClick={() => onRowClick?.(row)}
                      style={{ cursor: onRowClick ? "pointer" : "default" }}
                    >
                      {enableSelection && (
                        <td
                          style={{ width: 36, textAlign: "center", padding: "10px 8px" }}
                          onClick={(e) => toggleSelectRow(row, e)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                            aria-label={`Select row ${rowId}`}
                          />
                        </td>
                      )}

                      {activeColumns.map((col, idx) => (
                        <td
                          key={col.key}
                          className={`${col.align === "right" ? "numeric" : ""} ${idx === 0 ? "stickyLeft" : ""}`}
                        >
                          {col.render ? col.render(row, isSelected) : row[col.key] ?? "—"}
                        </td>
                      ))}

                      {hasActions && (
                        <td
                          className="actionsCol"
                          style={{ textAlign: "right" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="rowActions" style={{ justifyContent: "flex-end" }}>
                            {onRowClick && (
                              <button
                                type="button"
                                className="rowActionBtn view"
                                onClick={() => onRowClick(row)}
                                title="Inspect Record Details"
                                aria-label="Inspect row details"
                              >
                                <Icon name="search" size={13} />
                              </button>
                            )}
                            {onEditClick && (
                              <button
                                type="button"
                                className="rowActionBtn edit"
                                onClick={() => onEditClick(row)}
                                title="Edit Record"
                                aria-label="Edit record"
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            {onDeleteClick && (
                              <button
                                type="button"
                                className="rowActionBtn delete"
                                onClick={() => onDeleteClick(row)}
                                title="Delete / Revoke"
                                aria-label="Delete record"
                              >
                                <Icon name="close" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* -------------------------------------------------------------------- */
        /* View 2: Mobile Responsive Card Grid (Auto & Manual Cards)            */
        /* -------------------------------------------------------------------- */
        <div className="tableCardGrid">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="tableCard">
                <div className="skeletonPulse" style={{ height: 24, width: "60%" }} />
                <div className="skeletonPulse" style={{ height: 60, width: "100%" }} />
                <div className="skeletonPulse" style={{ height: 20, width: "40%" }} />
              </div>
            ))
          ) : paginatedData.length === 0 ? (
            <div style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
              {emptyMessage}
            </div>
          ) : (
            paginatedData.map((row: any, rIdx) => {
              const rowId = String(row.id ?? row._id ?? row.serial_number ?? rIdx);
              const isSelected = selectedIds.has(rowId);

              const primaryTitle =
                row.organization_name ??
                row.account_name ??
                row.name ??
                row.subject ??
                row.gateway ??
                row.id ??
                `Record #${rIdx + 1}`;

              const statusVal = row.status ?? row.state ?? row.severity;

              return (
                <div
                  key={rowId}
                  className={`tableCard ${isSelected ? "cardSelected" : ""}`}
                  onClick={() => onRowClick?.(row)}
                >
                  <div className="tableCardHead">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {enableSelection && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(e) => toggleSelectRow(row, e)}
                          onChange={() => {}}
                          style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                        />
                      )}
                      <div className="tableCardTitle">{primaryTitle}</div>
                    </div>
                    {statusVal && <Status value={statusVal} size="sm" />}
                  </div>

                  {/* Key Metrics Grid */}
                  <div className="tableCardMetrics">
                    {activeColumns
                      .filter((c) => !c.key.includes("name") && c.key !== "status")
                      .slice(0, 4)
                      .map((col) => (
                        <div key={col.key} className="tableCardMetricItem">
                          <span className="tableCardMetricLabel">{col.header}</span>
                          <span className="tableCardMetricValue">
                            {col.render ? col.render(row, isSelected) : row[col.key] ?? "—"}
                          </span>
                        </div>
                      ))}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="tableCardFoot" onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
                    </span>

                    <div style={{ display: "flex", gap: 6 }}>
                      {onRowClick && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => onRowClick(row)}
                          style={{ height: 28, fontSize: 11.5, padding: "0 8px" }}
                        >
                          <Icon name="search" size={12} />
                          <span>Inspect</span>
                        </button>
                      )}
                      {onEditClick && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => onEditClick(row)}
                          style={{ height: 28, fontSize: 11.5, padding: "0 8px" }}
                        >
                          <Icon name="edit" size={12} />
                          <span>Edit</span>
                        </button>
                      )}
                      {onDeleteClick && (
                        <button
                          type="button"
                          className="btn ghost sm"
                          onClick={() => onDeleteClick(row)}
                          style={{ height: 28, fontSize: 11.5, padding: "0 8px", color: "var(--danger)" }}
                        >
                          <Icon name="close" size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Pagination Bar                                                       */}
      {/* -------------------------------------------------------------------- */}
      <div className="paginationBar">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <span>
            Showing <strong>{Math.min(filteredData.length, (currentPage - 1) * rowsPerPage + 1)}</strong> to{" "}
            <strong>{Math.min(filteredData.length, currentPage * rowsPerPage)}</strong> of{" "}
            <strong>{filteredData.length.toLocaleString()}</strong> entries
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>Per page:</span>
            <select
              className="select sm"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{ height: 26, padding: "0 18px 0 6px", fontSize: 11.5 }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="pageControls">
            <button
              type="button"
              className="btn ghost sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              style={{ height: 28, padding: "0 6px" }}
              title="First Page"
            >
              «
            </button>
            <button
              type="button"
              className="btn ghost sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ height: 28, padding: "0 8px" }}
            >
              Prev
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              // Sliding window for page numbers
              let pageNum = i + 1;
              if (totalPages > 5) {
                const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                pageNum = start + i;
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  className={`btn sm ${currentPage === pageNum ? "primary" : "ghost"}`}
                  onClick={() => setCurrentPage(pageNum)}
                  style={{ height: 28, minWidth: 28, padding: 0 }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              className="btn ghost sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ height: 28, padding: "0 8px" }}
            >
              Next
            </button>
            <button
              type="button"
              className="btn ghost sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ height: 28, padding: "0 6px" }}
              title="Last Page"
            >
              »
            </button>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Floating Bulk Action Bar (When 1+ rows are selected)                 */}
      {/* -------------------------------------------------------------------- */}
      {selectedIds.size > 0 && (
        <div className="bulkActionBar">
          <div className="bulkActionCount">
            <span
              style={{
                background: "var(--primary)",
                color: "#ffffff",
                borderRadius: "50%",
                width: 22,
                height: 22,
                display: "grid",
                placeItems: "center",
                fontSize: 11.5,
              }}
            >
              {selectedIds.size}
            </span>
            <span>records selected</span>
          </div>

          <div className="bulkActionButtons">
            {onBulkExport && (
              <button
                type="button"
                className="btn primary sm"
                onClick={() => onBulkExport(selectedRowsList)}
                style={{ height: 30, fontSize: 12 }}
              >
                <Icon name="download" size={13} />
                <span>Export Selected</span>
              </button>
            )}

            <button
              type="button"
              className="btn secondary sm"
              onClick={handleCopySelectedIds}
              style={{ height: 30, fontSize: 12, background: "rgba(255,255,255,0.1)", color: "#fff", borderColor: "rgba(255,255,255,0.2)" }}
            >
              <Icon name="copy" size={13} />
              <span>Copy IDs</span>
            </button>

            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setSelectedIds(new Set())}
              style={{ height: 30, fontSize: 12, color: "#cbd5e1" }}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
