"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { FormErrorAlert } from "../shared/FormErrorAlert";

export interface RateGroupOption {
  id: string;
  name: string;
  side: string;
  rate_count: number;
  attached_accounts_count: number;
}

export function RateImportsArchetype({
  title = "Rate Sheet Ingestion Wizard",
  purpose = "Safe 4-stage rate deck ingestion pipeline with column verification, dry-run diff preview, and rollback snapshot.",
  source = "postgres (rates) + vos",
  warnings,
}: {
  title?: string;
  purpose?: string;
  source?: string;
  warnings?: string[];
}) {
  const [activeTab, setActiveTab] = useState<"wizard" | "history">("wizard");
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Rate Groups List
  const [groups, setGroups] = useState<RateGroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(true);

  // Stage 1: Upload State
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [delimiter, setDelimiter] = useState("auto");
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [reason, setReason] = useState("");
  const [uploadErr, setUploadErr] = useState<unknown | null>(null);

  // Stage 2: Column Mapping & Raw Headers
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    prefix: "",
    area_name: "",
    rate_per_minute: "",
    interval: "",
    rate_type: "",
  });
  const [rawPreviewRows, setRawPreviewRows] = useState<string[][]>([]);
  const [mappingErr, setMappingErr] = useState<unknown | null>(null);

  // Stage 3: Review / Dry-Run Diff
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState<unknown | null>(null);
  const [confirmedImpact, setConfirmedImpact] = useState(false);
  const [confirmErr, setConfirmErr] = useState<unknown | null>(null);

  // Stage 4: Processing State
  const [processBusy, setProcessBusy] = useState(false);
  const [processResult, setProcessResult] = useState<any>(null);
  const [processErr, setProcessErr] = useState<unknown | null>(null);

  // History State
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [rollbackErr, setRollbackErr] = useState<unknown | null>(null);

  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Check URL search params for pre-selected group
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const gId = params.get("groupId") || params.get("rate_group_id");
      if (gId) setSelectedGroupId(gId);
    }
  }, []);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res: any = await api("/api/v1/admin/rates/groups");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setGroups(list);
      if (list.length > 0 && !selectedGroupId) {
        setSelectedGroupId(list[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoadingGroups(false);
    }
  }, [selectedGroupId]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res: any = await api("/api/v1/admin/rates/imports/history");
      const list = Array.isArray(res?.data?.items) ? res.data.items : Array.isArray(res?.data) ? res.data : [];
      setHistory(list);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (activeTab === "history") void fetchHistory();
  }, [activeTab, fetchHistory]);

  // File Drop / Selection handler
  function handleFileSelect(file: File) {
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || "");
      setFileContent(text);
      parseHeadersAndSample(text);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  // Parse headers from file content
  function parseHeadersAndSample(text: string) {
    const lines = text
      .replace(/\uFEFF/g, "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    // Detect delimiter
    const delim = delimiter !== "auto" ? delimiter : detectDelim(lines.slice(0, 10));
    const headerLine = lines[0];
    const headers = splitLine(headerLine, delim);
    setRawHeaders(headers);

    // Initial Guess for Mapping
    const mapping: Record<string, string> = {
      prefix: "",
      area_name: "",
      rate_per_minute: "",
      interval: "",
      rate_type: "",
    };

    headers.forEach((h) => {
      const norm = h.toLowerCase().replace(/[\s\-_]+/g, "_");
      if (!mapping.prefix && /^(prefix|dial_code|code|dest_code|digits)$/.test(norm)) mapping.prefix = h;
      else if (!mapping.area_name && /^(destination|area|country|area_name|desc|name)$/.test(norm)) mapping.area_name = h;
      else if (!mapping.rate_per_minute && /^(rate|price|rate_usd|cost|tariff|rate_per_min)$/.test(norm)) mapping.rate_per_minute = h;
      else if (!mapping.interval && /^(interval|cycle|billing_cycle|increment|pulse)$/.test(norm)) mapping.interval = h;
      else if (!mapping.rate_type && /^(rate_type|type|tariff_type)$/.test(norm)) mapping.rate_type = h;
    });

    // Fallbacks if not detected by name
    if (!mapping.prefix && headers.length > 0) mapping.prefix = headers[0];
    if (!mapping.rate_per_minute && headers.length > 1) mapping.rate_per_minute = headers[1];
    if (!mapping.area_name && headers.length > 2) mapping.area_name = headers[2];

    setColumnMapping(mapping);

    // Sample top 5 data rows
    const sample = lines.slice(1, 6).map((l) => splitLine(l, delim));
    setRawPreviewRows(sample);
  }

  function detectDelim(sampleLines: string[]): string {
    const delims = [",", ";", "\t", "|"];
    let best = ",";
    let max = -1;
    for (const d of delims) {
      const counts = sampleLines.map((l) => l.split(d).length);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (avg > max && avg > 1) {
        max = avg;
        best = d;
      }
    }
    return best;
  }

  function splitLine(line: string, delim: string): string[] {
    const res: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"' || c === "'") inQuotes = !inQuotes;
      else if (c === delim && !inQuotes) {
        res.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += c;
      }
    }
    res.push(current.trim().replace(/^["']|["']$/g, ""));
    return res;
  }

  // Stage 1 -> Stage 2 Transition
  function proceedToVerify() {
    setUploadErr(null);
    if (!selectedGroupId) {
      setUploadErr("Please select a target Rate Group.");
      return;
    }
    if (!fileContent.trim()) {
      setUploadErr("Please select or drop a CSV rate sheet file.");
      return;
    }
    parseHeadersAndSample(fileContent);
    setCurrentStep(2);
  }

  // Stage 2 -> Stage 3 Transition (Run Dry-Run Preview)
  async function proceedToReview() {
    setMappingErr(null);
    if (!columnMapping.prefix || !columnMapping.rate_per_minute) {
      setMappingErr("Both Prefix and Rate per Minute columns must be mapped.");
      return;
    }

    setPreviewLoading(true);
    setPreviewErr(null);
    setCurrentStep(3);

    try {
      const res: any = await api("/api/v1/admin/rates/imports/preview", {
        method: "POST",
        body: JSON.stringify({
          rate_group_id: selectedGroupId,
          file_content: fileContent,
          delimiter: delimiter !== "auto" ? delimiter : undefined,
          column_mapping: columnMapping,
          mode,
        }),
      });
      setPreviewResult(res?.data || null);
    } catch (e: any) {
      setPreviewErr(e);
    } finally {
      setPreviewLoading(false);
    }
  }

  // Stage 3 -> Stage 4 Transition (Execute Batch Ingestion)
  async function proceedToProcess() {
    setConfirmErr(null);
    if (!confirmedImpact) {
      setConfirmErr("Please review and confirm the rate sheet impact before processing.");
      return;
    }

    setProcessBusy(true);
    setProcessErr(null);
    setCurrentStep(4);

    try {
      const res: any = await api("/api/v1/admin/rates/imports/process", {
        method: "POST",
        body: JSON.stringify({
          rate_group_id: selectedGroupId,
          file_content: fileContent,
          delimiter: delimiter !== "auto" ? delimiter : undefined,
          column_mapping: columnMapping,
          mode,
          file_name: fileName || "manual_upload.csv",
          reason: reason.trim() || undefined,
        }),
      });
      setProcessResult(res?.data || null);
      setNotice({ type: "ok", text: "Rate sheet processed and synced to VOS cluster successfully." });
    } catch (e: any) {
      setProcessErr(e);
    } finally {
      setProcessBusy(false);
    }
  }

  // Rollback Action
  async function handleRollback(snapshotId: string) {
    if (!snapshotId || rollingBackId) return;
    if (!confirm("Are you sure you want to rollback to this snapshot? Current rates will be restored to the previous state.")) return;

    setRollingBackId(snapshotId);
    setRollbackErr(null);
    try {
      await api(`/api/v1/admin/rates/snapshots/${snapshotId}/rollback`, { method: "POST" });
      setNotice({ type: "ok", text: "Rate catalog rolled back to snapshot state successfully." });
      void fetchHistory();
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setRollbackErr(e);
    } finally {
      setRollingBackId(null);
    }
  }

  const selectedGroupObj = groups.find((g) => g.id === selectedGroupId);

  return (
    <div className="content">
      {/* Header */}
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

        <div className="pageActions">
          <Link href="/admin/rates/groups" className="btn secondary sm">
            <Icon name="arrowLeft" size={13} />
            <span>Rate Groups</span>
          </Link>
          <Link href="/admin/rates/lookup" className="btn secondary sm">
            <Icon name="search" size={13} />
            <span>Rate Lookup</span>
          </Link>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className={notice.type === "ok" ? "notice" : "error"} style={{ marginBottom: 20 }}>
          <Icon name={notice.type === "ok" ? "check" : "alert"} size={16} />
          <span>{notice.text}</span>
        </div>
      )}

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 650, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>{warnings.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === "wizard" ? "primary" : "secondary"} sm`}
          onClick={() => setActiveTab("wizard")}
        >
          <Icon name="upload" size={13} />
          <span>Import Wizard</span>
        </button>
        <button
          type="button"
          className={`btn ${activeTab === "history" ? "primary" : "secondary"} sm`}
          onClick={() => setActiveTab("history")}
        >
          <Icon name="records" size={13} />
          <span>Ingestion History & Rollback</span>
        </button>
      </div>

      {activeTab === "history" ? (
        /* History & Snapshot View */
        <div className="card">
          <FormErrorAlert
            error={rollbackErr}
            onDismiss={() => setRollbackErr(null)}
            style={{ margin: "14px 18px 0" }}
          />
          <div className="cardHead">
            <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
              Rate Ingestion Snapshots & Rollback History
            </div>
            <button type="button" className="btn secondary xs" onClick={() => void fetchHistory()}>
              <Icon name="refresh" size={12} className={historyLoading ? "spin" : ""} />
              <span>Refresh History</span>
            </button>
          </div>

          {historyLoading ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted)" }}>
              <Icon name="refresh" size={16} className="spin" style={{ marginBottom: 8 }} />
              <div>Loading ingestion snapshots…</div>
            </div>
          ) : history.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "var(--muted)" }}>
              No previous import jobs recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Rate Group</th>
                    <th>File Name</th>
                    <th>Strategy</th>
                    <th style={{ textAlign: "right" }}>Added</th>
                    <th style={{ textAlign: "right" }}>Updated</th>
                    <th style={{ textAlign: "right" }}>Deleted</th>
                    <th>Operator</th>
                    <th style={{ textAlign: "right" }}>Snapshot Action</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id || h.import_id}>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>
                        {h.created_at ? new Date(h.created_at).toLocaleString() : "—"}
                      </td>
                      <td style={{ fontWeight: 650 }}>{h.rate_group_name || h.rate_group_id}</td>
                      <td className="mono" style={{ fontSize: 12 }}>
                        {h.file_name || "manual_sheet.csv"}
                      </td>
                      <td>
                        <span className="badge" style={{ textTransform: "capitalize" }}>
                          {h.mode || "merge"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", color: "var(--success)", fontWeight: 700 }}>
                        +{h.rates_added ?? h.added_count ?? 0}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--warning)", fontWeight: 700 }}>
                        ~{h.rates_updated ?? h.updated_count ?? 0}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--danger)", fontWeight: 700 }}>
                        -{h.rates_deleted ?? h.deleted_count ?? 0}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{h.actor || "admin"}</td>
                      <td style={{ textAlign: "right" }}>
                        {h.snapshot_id ? (
                          <button
                            type="button"
                            className="btn secondary xs"
                            onClick={() => void handleRollback(h.snapshot_id)}
                            disabled={rollingBackId === h.snapshot_id}
                          >
                            <Icon name="arrowLeft" size={11} />
                            <span>{rollingBackId === h.snapshot_id ? "Rolling back…" : "Rollback"}</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>No snapshot</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Wizard Workflow View */
        <div>
          {/* Stepper Progress Bar */}
          <div
            className="card"
            style={{
              marginBottom: 24,
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {[
              { num: 1, label: "1. Upload File & Group" },
              { num: 2, label: "2. Verify Column Mapping" },
              { num: 3, label: "3. Review Dry-Run Diff" },
              { num: 4, label: "4. Process & Synchronize" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isDone = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: isActive ? "var(--primary)" : isDone ? "var(--success)" : "var(--muted)",
                    fontWeight: isActive || isDone ? 750 : 500,
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: isActive
                        ? "var(--primary)"
                        : isDone
                        ? "var(--success)"
                        : "var(--border)",
                      color: isActive || isDone ? "#fff" : "var(--muted)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {isDone ? "✓" : step.num}
                  </div>
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>

          {/* STAGE 1: UPLOAD */}
          {currentStep === 1 && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 750, marginBottom: 4 }}>
                Stage 1: Select Target Group & Upload Sheet
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 20 }}>
                Choose the destination Rate Group, select ingestion strategy, and upload a CSV, TSV, or TXT file.
              </p>

              <FormErrorAlert
                error={uploadErr}
                onDismiss={() => setUploadErr(null)}
                style={{ marginBottom: 20 }}
              />

              <div className="formGrid" style={{ marginBottom: 20 }}>
                {/* Rate Group Selector */}
                <div className="field">
                  <label>Target Rate Group *</label>
                  <select
                    className="select"
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    disabled={loadingGroups}
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.side} · {Number(g.rate_count || 0).toLocaleString()} existing rates · {g.attached_accounts_count} accounts)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ingestion Strategy */}
                <div className="field">
                  <label>Ingestion Strategy</label>
                  <select
                    className="select"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as any)}
                  >
                    <option value="merge">Merge / Upsert (Keep unmentioned rates, update matching & add new)</option>
                    <option value="replace">Full Replace (Replace entire rate catalog with this sheet)</option>
                  </select>
                  <div className="help">
                    {mode === "merge"
                      ? "Safe mode: Existing unmentioned prefixes are preserved."
                      : "Destructive mode: Clears existing prefixes in this group and replaces them entirely."}
                  </div>
                </div>

                {/* Delimiter */}
                <div className="field">
                  <label>Delimiter</label>
                  <select
                    className="select"
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                  >
                    <option value="auto">Auto-Detect (Comma, Semicolon, Tab, Pipe)</option>
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="&#9;">Tab (\t)</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>

                {/* Reason */}
                <div className="field">
                  <label>Change Reason / Memo (Optional)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Q3 2026 Wholesale Carrier Tariff Revision"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
              </div>

              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "36px 20px",
                  textAlign: "center",
                  background: "rgba(100, 116, 139, 0.04)",
                  marginBottom: 24,
                  cursor: "pointer",
                }}
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".csv,.tsv,.txt,.xlsx";
                  input.onchange = (e: any) => {
                    if (e.target?.files?.[0]) handleFileSelect(e.target.files[0]);
                  };
                  input.click();
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <Icon name="upload" size={22} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
                  {fileName ? fileName : "Drop rate sheet CSV file here, or click to browse"}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {fileSize > 0
                    ? `${(fileSize / 1024).toFixed(1)} KB loaded · ${fileContent.split("\n").length} rows detected`
                    : "Supports standard CSV decks with columns: prefix, destination, rate, interval"}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={proceedToVerify}
                  disabled={!fileContent.trim() || !selectedGroupId}
                >
                  <span>Next: Verify Column Mapping →</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 2: VERIFY */}
          {currentStep === 2 && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                Stage 2: Verify & Map Rate Columns
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 20 }}>
                Ensure each required rate parameter maps to the correct column in your uploaded file.
              </p>

              <FormErrorAlert
                error={mappingErr}
                onDismiss={() => setMappingErr(null)}
                style={{ marginBottom: 20 }}
              />

              <div className="grid2" style={{ gap: 20, marginBottom: 24 }}>
                {/* Column Mappings */}
                <div className="card" style={{ padding: 18, background: "rgba(100, 116, 139, 0.04)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                    Field Definitions & Header Mapping
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="field">
                      <label>Dial Prefix Column *</label>
                      <select
                        className="select sm"
                        value={columnMapping.prefix}
                        onChange={(e) => setColumnMapping({ ...columnMapping, prefix: e.target.value })}
                      >
                        <option value="">-- Select Header --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Rate per Minute Column ($/min) *</label>
                      <select
                        className="select sm"
                        value={columnMapping.rate_per_minute}
                        onChange={(e) => setColumnMapping({ ...columnMapping, rate_per_minute: e.target.value })}
                      >
                        <option value="">-- Select Header --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Destination / Area / Country Name Column</label>
                      <select
                        className="select sm"
                        value={columnMapping.area_name}
                        onChange={(e) => setColumnMapping({ ...columnMapping, area_name: e.target.value })}
                      >
                        <option value="">-- Auto-resolve from dial code --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field">
                      <label>Billing Cadence / Interval Column (e.g. 60/1)</label>
                      <select
                        className="select sm"
                        value={columnMapping.interval}
                        onChange={(e) => setColumnMapping({ ...columnMapping, interval: e.target.value })}
                      >
                        <option value="">-- Default to 60s / 1s --</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Target Scope Summary */}
                <div className="card" style={{ padding: 18, background: "rgba(100, 116, 139, 0.04)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
                    Ingestion Scope & Strategy
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Target Rate Group:</span>
                      <strong>{selectedGroupObj?.name || selectedGroupId}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Catalog Side:</span>
                      <span style={{ textTransform: "capitalize" }}>{selectedGroupObj?.side || "customer"}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Attached Accounts:</span>
                      <strong>{selectedGroupObj?.attached_accounts_count || 0}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Ingestion Mode:</span>
                      <span className="badge" style={{ textTransform: "capitalize" }}>
                        {mode}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--muted)" }}>Source File:</span>
                      <span className="mono" style={{ fontSize: 12 }}>{fileName || "uploaded_sheet.csv"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Parsed Rows Table */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>
                  RAW DATA SAMPLE (TOP 5 ROWS)
                </div>
                <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                  <table className="table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        {rawHeaders.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rawPreviewRows.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {row.map((cell, colIdx) => (
                            <td key={colIdx} className="mono" style={{ fontSize: 12 }}>
                              {cell || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="btn secondary sm" onClick={() => setCurrentStep(1)}>
                  ← Back to Upload
                </button>
                <button type="button" className="btn primary sm" onClick={() => void proceedToReview()}>
                  <span>Next: Review Dry-Run Diff →</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 3: REVIEW / DRY-RUN */}
          {currentStep === 3 && (
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
                Stage 3: Review Dry-Run Diff & Validation
              </div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 20 }}>
                Comprehensive dry-run results comparing your uploaded sheet against existing rate records in{" "}
                <strong>{selectedGroupObj?.name}</strong>.
              </p>

              {previewLoading ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
                  <Icon name="refresh" size={20} className="spin" style={{ marginBottom: 10 }} />
                  <div>Computing dry-run diff & collision tree…</div>
                </div>
              ) : null}

              <FormErrorAlert
                error={previewErr}
                onDismiss={() => setPreviewErr(null)}
                style={{ marginBottom: 20 }}
              />

              <FormErrorAlert
                error={confirmErr}
                onDismiss={() => setConfirmErr(null)}
                style={{ marginBottom: 20 }}
              />

              {previewResult ? (
                <div>
                  {/* Summary Metric Badges */}
                  <div className="kpiGrid" style={{ marginBottom: 20 }}>
                    <div className="card kpiCard">
                      <div className="kpiLabel">Total Sheet Rows</div>
                      <div className="kpiValue">{previewResult.summary?.total_rows ?? 0}</div>
                      <div className="kpiSub">{previewResult.summary?.valid_rows ?? 0} valid rows</div>
                    </div>
                    <div className="card kpiCard">
                      <div className="kpiLabel">Rates Added</div>
                      <div className="kpiValue" style={{ color: "var(--success)" }}>
                        +{previewResult.summary?.added ?? 0}
                      </div>
                      <div className="kpiSub">New dial destinations</div>
                    </div>
                    <div className="card kpiCard">
                      <div className="kpiLabel">Rates Updated</div>
                      <div className="kpiValue" style={{ color: "var(--warning)" }}>
                        ~{previewResult.summary?.updated ?? 0}
                      </div>
                      <div className="kpiSub">Price or interval diffs</div>
                    </div>
                    <div className="card kpiCard">
                      <div className="kpiLabel">Rates Deleted</div>
                      <div className="kpiValue" style={{ color: mode === "replace" ? "var(--danger)" : "var(--muted)" }}>
                        -{previewResult.summary?.deleted ?? 0}
                      </div>
                      <div className="kpiSub">{mode === "replace" ? "Replaced from catalog" : "Preserved in merge"}</div>
                    </div>
                  </div>

                  {/* Validation Errors Notice */}
                  {previewResult.validation_errors && previewResult.validation_errors.length > 0 && (
                    <div
                      className="card"
                      style={{
                        marginBottom: 20,
                        padding: 16,
                        borderColor: "var(--warning)",
                        background: "rgba(245, 158, 11, 0.08)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--warning)", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                        <Icon name="alert" size={16} />
                        <span>{previewResult.validation_errors.length} Format Warnings / Skipped Rows:</span>
                      </div>
                      <div style={{ maxHeight: 120, overflowY: "auto", fontSize: 12 }}>
                        {previewResult.validation_errors.map((e: any, idx: number) => (
                          <div key={idx} style={{ color: "var(--muted)", marginBottom: 4 }}>
                            • Row {e.row_number}: <strong>{e.error}</strong> (Prefix: {e.prefix || "N/A"})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dry Run Preview Table */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "var(--muted)" }}>
                      DRY-RUN DIFF PREVIEW (FIRST 20 ROWS)
                    </div>
                    <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius)" }}>
                      <table className="table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>Prefix</th>
                            <th>Country & Area</th>
                            <th style={{ textAlign: "right" }}>Old Rate</th>
                            <th style={{ textAlign: "right" }}>New Rate</th>
                            <th style={{ textAlign: "center" }}>Interval</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(previewResult.preview_rows || []).slice(0, 20).map((r: any, idx: number) => (
                            <tr key={idx}>
                              <td>
                                <span
                                  className="badge"
                                  style={{
                                    textTransform: "uppercase",
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    background:
                                      r.action === "added"
                                        ? "rgba(16, 185, 129, 0.15)"
                                        : r.action === "updated"
                                        ? "rgba(245, 158, 11, 0.15)"
                                        : r.action === "deleted"
                                        ? "rgba(239, 68, 68, 0.15)"
                                        : "rgba(100, 116, 139, 0.1)",
                                    color:
                                      r.action === "added"
                                        ? "var(--success)"
                                        : r.action === "updated"
                                        ? "var(--warning)"
                                        : r.action === "deleted"
                                        ? "var(--danger)"
                                        : "var(--muted)",
                                  }}
                                >
                                  {r.action}
                                </span>
                              </td>
                              <td className="mono" style={{ fontWeight: 750, color: "var(--primary)" }}>
                                +{r.prefix}
                              </td>
                              <td>{r.area_name || r.country_name || "—"}</td>
                              <td style={{ textAlign: "right", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                                {r.old_rate ? `$${r.old_rate}` : "—"}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 750, fontVariantNumeric: "tabular-nums" }}>
                                {r.new_rate ? `$${r.new_rate}` : "—"}
                              </td>
                              <td style={{ textAlign: "center" }}>
                                <span className="badge" style={{ fontSize: 11 }}>
                                  {r.initial_interval || 60}s/{r.increment_interval || 1}s
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Impact Confirmation Checkbox */}
                  <div
                    style={{
                      background: "rgba(37,99,235,0.06)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: 16,
                      marginBottom: 24,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={confirmedImpact}
                        onChange={(e) => setConfirmedImpact(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>
                        I have verified the rate diff preview and confirm applying these changes to{" "}
                        <strong>{selectedGroupObj?.name}</strong>.
                      </span>
                    </label>
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="btn secondary sm" onClick={() => setCurrentStep(2)}>
                  ← Back to Mapping
                </button>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => void proceedToProcess()}
                  disabled={!confirmedImpact || previewLoading}
                >
                  <span>Commit & Ingest Rates →</span>
                </button>
              </div>
            </div>
          )}

          {/* STAGE 4: PROCESS & COMPLETION */}
          {currentStep === 4 && (
            <div className="card" style={{ padding: 32, textAlign: "center" }}>
              {processBusy ? (
                <div style={{ padding: "40px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37,99,235,0.12)", color: "var(--primary)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon name="refresh" size={28} className="spin" />
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    Processing Rate Ingestion & Syncing VOS…
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: 13 }}>
                    Inserting batch records into PostgreSQL and syncing longest-prefix routing tables.
                  </p>
                </div>
              ) : processErr ? (
                <div style={{ padding: "20px 0", maxWidth: 600, margin: "0 auto" }}>
                  <FormErrorAlert
                    error={processErr}
                    onDismiss={() => setProcessErr(null)}
                    style={{ marginBottom: 20 }}
                  />
                  <button type="button" className="btn secondary sm" onClick={() => setCurrentStep(3)}>
                    ← Return to Review
                  </button>
                </div>
              ) : (
                <div style={{ padding: "20px 0" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(16,185,129,0.12)", color: "var(--success)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon name="check" size={28} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                    Rate Sheet Ingested Successfully!
                  </h2>
                  <p style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 24 }}>
                    Rates have been committed to <strong>{selectedGroupObj?.name}</strong> and are active for call billing.
                  </p>

                  <div className="kpiGrid" style={{ maxWidth: 640, margin: "0 auto 28px" }}>
                    <div className="card kpiCard">
                      <div className="kpiLabel">Added</div>
                      <div className="kpiValue" style={{ color: "var(--success)" }}>
                        +{processResult?.added ?? 0}
                      </div>
                    </div>
                    <div className="card kpiCard">
                      <div className="kpiLabel">Updated</div>
                      <div className="kpiValue" style={{ color: "var(--warning)" }}>
                        ~{processResult?.updated ?? 0}
                      </div>
                    </div>
                    <div className="card kpiCard">
                      <div className="kpiLabel">Snapshot ID</div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--primary)" }}>
                        {processResult?.snapshot_id ? `${processResult.snapshot_id.slice(0, 8)}…` : "Generated"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
                    <Link href={`/admin/rates/groups/${selectedGroupId}`} className="btn primary sm">
                      <Icon name="edit" size={13} />
                      <span>View in Rate Editor</span>
                    </Link>
                    <Link href="/admin/rates/lookup" className="btn secondary sm">
                      <Icon name="search" size={13} />
                      <span>Test in Rate Lookup</span>
                    </Link>
                    <button
                      type="button"
                      className="btn secondary sm"
                      onClick={() => {
                        setFileContent("");
                        setFileName("");
                        setPreviewResult(null);
                        setProcessResult(null);
                        setConfirmedImpact(false);
                        setCurrentStep(1);
                      }}
                    >
                      <span>Import Another Sheet</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
