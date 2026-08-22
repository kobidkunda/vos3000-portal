"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Icon } from "../../lib/icons";

type Severity = "critical" | "warning" | "info";
type AlarmState = "open" | "acknowledged";

interface AlarmRow {
  id: string;
  severity: Severity;
  type: string;
  source: string;
  gateway?: string;
  customer?: string;
  account?: string;
  message: string;
  state: AlarmState;
  first_seen: string;
  last_seen: string;
  acked_by?: string;
  acked_at?: string;
  note?: string;
  active_calls?: number;
  capacity?: number;
  balance?: number;
  overdraft?: number;
  expires_at?: string;
}

const SEV_META: Record<Severity, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "sevCritical" },
  warning: { label: "Warning", cls: "sevWarning" },
  info: { label: "Info", cls: "sevInfo" },
};

function fmtTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function AlarmCenterArchetype({
  title = "Alarm Center",
  purpose = "Unified current and historical alarm workspace.",
  initialRows = [],
  source: initialSource = "postgres + vos",
  warnings: initialWarnings = [],
}: {
  title?: string;
  purpose?: string;
  initialRows?: any[];
  source?: string;
  warnings?: string[];
}) {
  const [rows, setRows] = useState<AlarmRow[]>(initialRows || []);
  const [source, setSource] = useState(initialSource);
  const [warnings, setWarnings] = useState<string[]>(initialWarnings);
  const [loading, setLoading] = useState(initialRows.length === 0);
  const [err, setErr] = useState<{ message: string; requestId?: string } | null>(null);
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState<"all" | Severity>("all");
  const [stateFilter, setStateFilter] = useState<"all" | AlarmState>("all");
  const [tab, setTab] = useState<"current" | "history" | "all">("current");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [ackTarget, setAckTarget] = useState<string | null>(null);
  const [ackNote, setAckNote] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [justAcked, setJustAcked] = useState<string | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setErr(null);
    try {
      const r: any = await api("/api/v1/admin/alarms");
      setRows(Array.isArray(r?.data?.items) ? r.data.items : []);
      setSource(r?.data?.source ?? "");
      setWarnings(Array.isArray(r?.data?.warnings) ? r.data.warnings : []);
      setUpdatedAt(new Date());
    } catch (e: any) {
      setErr({ message: e.message ?? "Failed to load alarms", requestId: e.request_id });
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      setRows(initialRows);
    } else {
      void load();
    }
    headRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRows]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0, open: 0, acked: 0 };
    for (const r of rows) {
      c[r.severity] += 1;
      if (r.state === "open") c.open += 1;
      else c.acked += 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sevFilter !== "all" && r.severity !== sevFilter) return false;
      if (stateFilter !== "all" && r.state !== stateFilter) return false;
      if (tab === "current" && r.state !== "open") return false;
      if (tab === "history" && r.state !== "acknowledged") return false;
      if (!q) return true;
      return [r.message, r.gateway, r.customer, r.account, r.type, r.source, r.acked_by]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, sevFilter, stateFilter, tab]);

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function ack(id: string, note?: string) {
    setBusy(id);
    try {
      await api(`/api/v1/admin/alarms/${encodeURIComponent(id)}/ack`, {
        method: "POST",
        body: JSON.stringify({ note: note?.trim() ? note.trim() : undefined }),
      });
      setJustAcked(id);
      setAckTarget(null);
      setAckNote("");
      await load();
      window.setTimeout(() => setJustAcked(null), 2500);
    } catch (e: any) {
      setErr({ message: `Acknowledge failed: ${e.message ?? "request error"}`, requestId: e.request_id });
    } finally {
      setBusy(null);
    }
  }

  async function ackSelected() {
    for (const id of [...selected]) {
      setBusy(id);
      try {
        await api(`/api/v1/admin/alarms/${encodeURIComponent(id)}/ack`, { method: "POST", body: "{}" });
      } catch (e: any) {
        setErr({ message: `Acknowledge failed: ${e.message ?? "request error"}`, requestId: e.request_id });
        setBusy(null);
        return;
      }
    }
    setBusy(null);
    setSelected(new Set());
    setJustAcked("__bulk__");
    await load();
    window.setTimeout(() => setJustAcked(null), 2500);
  }

  function exportCsv() {
    const header = ["id", "severity", "type", "source", "gateway", "customer", "account", "message", "state", "first_seen", "last_seen", "acked_by", "acked_at", "note"];
    const lines = [header.join(","), ...filtered.map((r) => header.map((h) => csvCell(r[h as keyof AlarmRow])).join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alarm-center-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderRowActions(r: AlarmRow) {
    if (r.state === "acknowledged") {
      return (
        <span className="almAckedBy" title={r.note ? `Note: ${r.note}` : undefined}>
          <Icon name="check" size={12} />
          {r.acked_by ? r.acked_by : "acked"} · {fmtTime(r.acked_at)}
        </span>
      );
    }
    return (
      <button className="btn sm" type="button" onClick={() => setAckTarget(r.id)} disabled={busy !== null}>
        <Icon name="check" size={12} />
        <span>Acknowledge</span>
      </button>
    );
  }

  return (
    <div className="almRoot">
      {/* Header */}
      <div className="pageHead" style={{ marginBottom: 16 }}>
        <div>
          <h1 tabIndex={-1} ref={headRef} style={{ outline: "none" }}>
            {title}
          </h1>
          <p>{purpose}</p>
        </div>
        <div className="almHeadActions">
          <span className="badge badge-online">
            <span className="statusDot pulse" />
            Live
          </span>
          <button className="btn sm" type="button" onClick={exportCsv} disabled={!filtered.length} title="Export filtered rows as CSV">
            <Icon name="download" size={13} />
            <span>Export</span>
          </button>
          <button className="btn sm" type="button" onClick={() => void load()} disabled={loading} title="Refresh from data sources">
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="almSummary" aria-label="Alarm summary">
        <div className="almChip sevCritical">
          <strong>{counts.critical}</strong>
          <span>Critical</span>
        </div>
        <div className="almChip sevWarning">
          <strong>{counts.warning}</strong>
          <span>Warning</span>
        </div>
        <div className="almChip sevInfo">
          <strong>{counts.info}</strong>
          <span>Info</span>
        </div>
        <div className="almChip">
          <strong>{counts.open}</strong>
          <span>Open</span>
        </div>
        <div className="almChip">
          <strong>{counts.acked}</strong>
          <span>Acknowledged</span>
        </div>
        <div className="almSource">
          <span>
            Source: <strong>{source || "postgres + vos"}</strong>
          </span>
          <span>{updatedAt ? `Refreshed ${updatedAt.toLocaleTimeString()}` : "—"}</span>
        </div>
      </div>

      {warnings.map((w, i) => (
        <div className="notice" role="status" style={{ marginBottom: 12 }} key={i}>
          <Icon name="pulse" size={13} />
          <span>{w}</span>
        </div>
      ))}

      {err && (
        <div className="error" role="alert" style={{ marginBottom: 12 }}>
          <strong>Alarm Center degraded.</strong> {err.message}
          {err.requestId && (
            <div className="mono" style={{ marginTop: 6 }}>
              Request ID: {err.requestId}
            </div>
          )}
        </div>
      )}

      {justAcked && (
        <div className="notice" role="status" style={{ marginBottom: 12 }}>
          <Icon name="check" size={13} />
          <span>Acknowledged — alarm state refreshed from the platform.</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="almToolbar">
        <div className="almTabs" role="tablist" aria-label="Alarm scope">
          {(
            [
              ["current", `Current (${counts.open})`],
              ["history", `History (${counts.acked})`],
              ["all", `All (${rows.length})`],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={tab === k}
              className={`almTab ${tab === k ? "active" : ""}`}
              onClick={() => {
                setTab(k);
                setSelected(new Set());
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="almFilters">
          <div className="almSearch">
            <Icon name="search" size={13} />
            <input
              aria-label="Search alarms"
              placeholder="Search message, gateway, account…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="select" aria-label="Severity filter" value={sevFilter} onChange={(e) => setSevFilter(e.target.value as any)}>
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select className="select" aria-label="State filter" value={stateFilter} onChange={(e) => setStateFilter(e.target.value as any)}>
            <option value="all">All states</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
          {(search || sevFilter !== "all" || stateFilter !== "all") && (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setSearch("");
                setSevFilter("all");
                setStateFilter("all");
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="almBulk">
          <span>
            {selected.size} alarm{selected.size > 1 ? "s" : ""} selected
          </span>
          <button className="btn primary sm" type="button" onClick={() => void ackSelected()} disabled={busy !== null}>
            <Icon name="check" size={13} />
            <span>Acknowledge selected</span>
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="card">
          <div className="cardBody">
            <div className="almLoading">
              <Icon name="refresh" size={16} className="spin" />
              <span>Verifying engine state…</span>
            </div>
          </div>
        </div>
      )}

      {/* Empty / error-free states */}
      {!loading && !err && rows.length === 0 && (
        <div className="card">
          <div className="cardBody" style={{ textAlign: "center", padding: "44px 20px" }}>
            <span className="almEmptyIcon">
              <Icon name="check" size={22} />
            </span>
            <h3 style={{ fontSize: 15, marginBottom: 6 }}>No alarms — all monitored systems nominal</h3>
            <p style={{ fontSize: 12.5, color: "var(--muted)", maxWidth: 420, margin: "0 auto" }}>
              Gateways, balances and account policies are verified against the live engine on every
              refresh. New conditions appear here the moment they are detected.
            </p>
          </div>
        </div>
      )}

      {!loading && !err && rows.length > 0 && filtered.length === 0 && (
        <div className="card">
          <div className="cardBody" style={{ textAlign: "center", padding: "32px 20px" }}>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>
              No alarms match the current filters.{" "}
              <button
                type="button"
                className="linkBtn"
                onClick={() => {
                  setSearch("");
                  setSevFilter("all");
                  setStateFilter("all");
                }}
              >
                Clear filters
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Table (desktop) */}
      {!loading && !err && filtered.length > 0 && (
        <div className="card almTableCard">
          <div className="tableWrap">
            <table className="almTable">
              <thead>
                <tr>
                  <th className="almSelCol" aria-label="Select row" />
                  <th>Severity</th>
                  <th>Message</th>
                  <th>Gateway / Customer</th>
                  <th>Source</th>
                  <th>First seen</th>
                  <th>State</th>
                  <th className="almActionsCol">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = SEV_META[r.severity];
                  return (
                    <tr key={r.id} className={r.state === "acknowledged" ? "almAckedRow" : ""}>
                      <td className="almSelCol">
                        {r.state === "open" && (
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.id}`}
                            checked={selected.has(r.id)}
                            onChange={() => toggleSelect(r.id)}
                          />
                        )}
                      </td>
                      <td>
                        <span className={`almSev ${meta.cls}`}>
                          <span className="almSevDot" />
                          {meta.label}
                        </span>
                      </td>
                      <td>
                        <div className="almMsg">
                          <strong>{r.message}</strong>
                          <span className="mono almType">{r.type}</span>
                        </div>
                      </td>
                      <td>
                        <div className="almEntity">
                          {r.gateway && (
                            <Link href="/admin/gateways/mapping" title="Open gateway directory">
                              {r.gateway}
                            </Link>
                          )}
                          {r.customer && (
                            <Link href="/admin/customers" title="Open customer directory">
                              {r.customer}
                            </Link>
                          )}
                          {r.account && <span className="mono almAccount">{r.account}</span>}
                          {!r.gateway && !r.customer && <span style={{ color: "var(--muted)" }}>—</span>}
                        </div>
                      </td>
                      <td>
                        <span className="badge">{r.source}</span>
                      </td>
                      <td>
                        <span className="almTime">{fmtTime(r.first_seen)}</span>
                        {r.expires_at && <span className="almSub">exp {r.expires_at.slice(0, 10)}</span>}
                      </td>
                      <td>
                        {r.state === "open" ? (
                          <span className="almState open">
                            <span className="almStateDot" />
                            Open
                          </span>
                        ) : (
                          <span className="almState acked">Acknowledged</span>
                        )}
                      </td>
                      <td className="almActionsCol">{renderRowActions(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="cardFoot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {filtered.length} of {rows.length} alarms · severity, gateway and state filters apply
            </span>
            <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
              Ack {`>`} persists in the platform audit trail with request ID
            </span>
          </div>
        </div>
      )}

      {/* Mobile cards */}
      {!loading && !err && filtered.length > 0 && (
        <div className="almCards">
          {filtered.map((r) => {
            const meta = SEV_META[r.severity];
            return (
              <div className={`almCard ${r.state === "acknowledged" ? "almAckedRow" : ""}`} key={r.id}>
                <div className={`almCardStrip ${meta.cls}`} aria-hidden="true" />
                <div className="almCardBody">
                  <div className="almCardTop">
                    <span className={`almSev ${meta.cls}`}>
                      <span className="almSevDot" />
                      {meta.label}
                    </span>
                    <span className={`almState ${r.state}`}>{r.state === "open" ? "Open" : "Acknowledged"}</span>
                  </div>
                  <strong className="almCardMsg">{r.message}</strong>
                  <div className="almCardMeta">
                    {(r.gateway || r.customer) && (
                      <span>
                        {r.gateway && (
                          <Link href="/admin/gateways/mapping">
                            <Icon name="gateway" size={12} /> {r.gateway}
                          </Link>
                        )}
                        {r.customer && (
                          <Link href="/admin/customers">
                            <Icon name="users" size={12} /> {r.customer}
                          </Link>
                        )}
                      </span>
                    )}
                    <span className="mono" style={{ fontSize: 11 }}>
                      {r.type}
                    </span>
                    <span>{fmtTime(r.first_seen)}</span>
                  </div>
                  <div className="almCardActions">{renderRowActions(r)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ack confirmation with optional note */}
      {ackTarget && (
        <div className="cmdBackdrop" onClick={() => !busy && setAckTarget(null)}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="cardHead">
              <div>Acknowledge Alarm</div>
            </div>
            <div className="cardBody">
              <p style={{ fontSize: 13, marginBottom: 14 }}>
                Mark this alarm as handled. It remains visible in the history scope while the
                underlying condition is present. The action is recorded in the audit trail.
              </p>
              <div className="field">
                <label htmlFor="ack-note">Operator note (optional)</label>
                <textarea
                  id="ack-note"
                  className="input"
                  rows={3}
                  placeholder="e.g. Maintenance window 23:00–23:30, expected to clear"
                  value={ackNote}
                  onChange={(e) => setAckNote(e.target.value)}
                />
              </div>
              <div className="savebar" style={{ justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => setAckTarget(null)} disabled={busy !== null}>
                  Cancel
                </button>
                <button className="btn primary" type="button" onClick={() => void ack(ackTarget, ackNote)} disabled={busy !== null}>
                  {busy === ackTarget ? (
                    <>
                      <Icon name="refresh" size={13} className="spin" />
                      <span>Acknowledging…</span>
                    </>
                  ) : (
                    "Acknowledge Alarm"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}