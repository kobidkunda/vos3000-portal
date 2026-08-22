"use client";
import React, { useState } from "react";
import { Icon } from "../../lib/icons";
import { FormErrorAlert } from "./FormErrorAlert";

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  totalRows: number;
  columns: (string | { key: string; header: string })[];
  data: Record<string, any>[];
  filenamePrefix?: string;
}

export function ExportModal({
  isOpen,
  onClose,
  title = "Export Telemetry & Database Records",
  totalRows,
  columns: rawCols,
  data,
  filenamePrefix = "vos3000_export",
}: ExportModalProps) {
  const [format, setFormat] = useState<"csv" | "xlsx" | "json" | "tsv">("csv");
  const [busy, setBusy] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [exportError, setExportError] = useState<unknown | null>(null);

  if (!isOpen) return null;

  const columnKeys = rawCols.map((c) => (typeof c === "string" ? c : c.key));
  const columnHeaders = rawCols.map((c) => (typeof c === "string" ? c.replace(/_/g, " ").toUpperCase() : c.header));

  function triggerDownload() {
    setBusy(true);
    setSuccessMsg("");
    setExportError(null);

    setTimeout(() => {
      try {
        let content = "";
        let mimeType = "text/csv;charset=utf-8";
        let extension = "csv";

        if (format === "csv" || format === "tsv") {
          const delimiter = format === "tsv" ? "\t" : ",";
          const headers = columnHeaders.map((h) => `"${h.replace(/"/g, '""')}"`).join(delimiter);
          const rows = data.map((row) =>
            columnKeys
              .map((key) => {
                const val = row[key];
                const str = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
                return `"${str.replace(/"/g, '""')}"`;
              })
              .join(delimiter)
          );
          content = [headers, ...rows].join("\n");
          mimeType = format === "tsv" ? "text/tab-separated-values;charset=utf-8" : "text/csv;charset=utf-8";
          extension = format;
        } else if (format === "xlsx") {
          // HTML table format recognized by Excel
          const headerHtml = `<tr>${columnHeaders.map((h) => `<th>${h}</th>`).join("")}</tr>`;
          const rowsHtml = data
            .map(
              (row) =>
                `<tr>${columnKeys
                  .map((k) => `<td>${row[k] === null || row[k] === undefined ? "" : String(row[k])}</td>`)
                  .join("")}</tr>`
            )
            .join("");
          content = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Telemetry</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${headerHtml}${rowsHtml}</table></body></html>`;
          mimeType = "application/vnd.ms-excel;charset=utf-8";
          extension = "xls";
        } else if (format === "json") {
          content = JSON.stringify(data, null, 2);
          mimeType = "application/json;charset=utf-8";
          extension = "json";
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.${extension}`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setSuccessMsg(`Export completed (${data.length} records in ${format.toUpperCase()} format).`);
        setTimeout(() => {
          setSuccessMsg("");
          onClose();
        }, 1200);
      } catch (err: any) {
        setExportError(err);
      } finally {
        setBusy(false);
      }
    }, 400);
  }

  function copyToClipboard() {
    setExportError(null);
    try {
      const headers = columnHeaders.join("\t");
      const rows = data.map((row) =>
        columnKeys
          .map((k) => (row[k] === null || row[k] === undefined ? "" : String(row[k])))
          .join("\t")
      );
      const text = [headers, ...rows].join("\n");
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        void navigator.clipboard.writeText(text);
        setSuccessMsg(`Copied ${data.length} records (TSV format) to clipboard!`);
        setTimeout(() => setSuccessMsg(""), 2000);
      }
    } catch (e: any) {
      setExportError(e);
    }
  }

  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--primary-soft)",
                color: "var(--primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name="download" size={16} />
            </div>
            <div className="modalTitle">{title}</div>
          </div>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Close modal">
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="modalBody">
          <FormErrorAlert
            error={exportError}
            onDismiss={() => setExportError(null)}
            style={{ marginBottom: 14 }}
          />

          {successMsg && (
            <div className="notice" style={{ marginBottom: 16 }}>
              <Icon name="check" size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 750, color: "var(--muted)", marginBottom: 8, letterSpacing: "0.04em" }}>
              EXPORT FILE FORMAT
            </label>
            <div className="exportFormatGrid">
              {[
                { id: "csv", name: "CSV", sub: "Comma Sep" },
                { id: "xlsx", name: "Excel", sub: ".XLS Table" },
                { id: "tsv", name: "TSV", sub: "Tab Sep" },
                { id: "json", name: "JSON", sub: "Raw Payload" },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setFormat(fmt.id as any)}
                  style={{
                    border: `1.5px solid ${format === fmt.id ? "var(--primary)" : "var(--border)"}`,
                    background: format === fmt.id ? "var(--primary-soft)" : "var(--surface)",
                    color: format === fmt.id ? "var(--primary)" : "var(--text)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 6px",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 120ms",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt.name}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{fmt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--surface2)", padding: 12, borderRadius: "var(--radius-sm)", fontSize: 12, color: "var(--text2)", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Total rows to export:</span>
              <strong>{data.length.toLocaleString()} records</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span>Active columns:</span>
              <strong>{columnKeys.length} fields</strong>
            </div>
          </div>

          <button
            type="button"
            className="btn ghost sm"
            onClick={copyToClipboard}
            style={{ width: "100%", justifyContent: "center", gap: 6, height: 32 }}
          >
            <Icon name="copy" size={13} />
            <span>Copy Data Directly to Clipboard</span>
          </button>
        </div>

        <div className="modalFoot">
          <button type="button" className="btn secondary sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn primary sm" onClick={triggerDownload} disabled={busy}>
            {busy ? "Generating File…" : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}
