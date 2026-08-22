"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { Status } from "../Status";
import { FormErrorAlert } from "../shared/FormErrorAlert";

export interface RateGroupItem {
  id: string;
  name: string;
  side: "customer" | "carrier" | "shared";
  status: "active" | "inactive";
  rate_count: number;
  attached_accounts_count: number;
  memo?: string;
  created_at: string;
  updated_at: string;
}

export function RateGroupsArchetype({
  title = "Rate Groups & Carrier Tariffs",
  purpose = "Manage reusable customer and carrier rate matrices, assign pricing decks, and track attached accounts.",
  source = "postgres (rates) + vos",
  warnings,
}: {
  title?: string;
  purpose?: string;
  source?: string;
  warnings?: string[];
}) {
  const [groups, setGroups] = useState<RateGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSide, setSelectedSide] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSide, setCreateSide] = useState<"customer" | "carrier" | "shared">("customer");
  const [createMemo, setCreateMemo] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createErr, setCreateErr] = useState<unknown | null>(null);

  const [duplicateGroup, setDuplicateGroup] = useState<RateGroupItem | null>(null);
  const [duplicateName, setDuplicateName] = useState("");
  const [duplicateBusy, setDuplicateBusy] = useState(false);
  const [duplicateErr, setDuplicateErr] = useState<unknown | null>(null);

  const [editGroup, setEditGroup] = useState<RateGroupItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSide, setEditSide] = useState<"customer" | "carrier" | "shared">("customer");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editMemo, setEditMemo] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState<unknown | null>(null);

  const [deleteGroup, setDeleteGroup] = useState<RateGroupItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<unknown | null>(null);

  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res: any = await api("/api/v1/admin/rates/groups");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setGroups(list);
    } catch (e: any) {
      setErr(e.message || "Failed to load rate groups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGroups();
  }, [fetchGroups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        g.name.toLowerCase().includes(q) ||
        (g.memo && g.memo.toLowerCase().includes(q)) ||
        g.id.toLowerCase().includes(q);

      const matchSide = selectedSide === "all" || g.side === selectedSide;
      const matchStatus = selectedStatus === "all" || g.status === selectedStatus;
      return matchSearch && matchSide && matchStatus;
    });
  }, [groups, searchTerm, selectedSide, selectedStatus]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const totalRates = groups.reduce((acc, g) => acc + (Number(g.rate_count) || 0), 0);
    const totalAccounts = groups.reduce((acc, g) => acc + (Number(g.attached_accounts_count) || 0), 0);
    const customerGroups = groups.filter((g) => g.side === "customer").length;
    const carrierGroups = groups.filter((g) => g.side === "carrier").length;
    return { totalGroups, totalRates, totalAccounts, customerGroups, carrierGroups };
  }, [groups]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim() || createBusy) return;
    setCreateBusy(true);
    setCreateErr(null);
    try {
      await api("/api/v1/admin/rates/groups", {
        method: "POST",
        body: JSON.stringify({
          name: createName.trim(),
          side: createSide,
          memo: createMemo.trim() || undefined,
          status: "active",
        }),
      });
      setIsCreateOpen(false);
      setCreateName("");
      setCreateMemo("");
      setNotice({ type: "ok", text: `Rate Group "${createName.trim()}" created successfully.` });
      void fetchGroups();
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setCreateErr(e);
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleDuplicate(e: React.FormEvent) {
    e.preventDefault();
    if (!duplicateGroup || !duplicateName.trim() || duplicateBusy) return;
    setDuplicateBusy(true);
    setDuplicateErr(null);
    try {
      await api(`/api/v1/admin/rates/groups/${duplicateGroup.id}/duplicate`, {
        method: "POST",
        body: JSON.stringify({
          new_name: duplicateName.trim(),
        }),
      });
      setDuplicateGroup(null);
      setDuplicateName("");
      setNotice({ type: "ok", text: `Rate Group duplicated as "${duplicateName.trim()}" with all rate prefixes.` });
      void fetchGroups();
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setDuplicateErr(e);
    } finally {
      setDuplicateBusy(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editGroup || !editName.trim() || editBusy) return;
    setEditBusy(true);
    setEditErr(null);
    try {
      await api(`/api/v1/admin/rates/groups/${editGroup.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          side: editSide,
          status: editStatus,
          memo: editMemo.trim() || undefined,
        }),
      });
      setEditGroup(null);
      setNotice({ type: "ok", text: `Rate Group "${editName.trim()}" updated successfully.` });
      void fetchGroups();
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setEditErr(e);
    } finally {
      setEditBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteGroup || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      await api(`/api/v1/admin/rates/groups/${deleteGroup.id}`, {
        method: "DELETE",
      });
      setDeleteGroup(null);
      setNotice({ type: "ok", text: `Rate Group "${deleteGroup.name}" deleted.` });
      void fetchGroups();
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setDeleteErr(e);
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="content">
      {/* Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{title}</h1>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions">
          <Link href="/admin/rates/imports" className="btn secondary sm">
            <Icon name="upload" size={13} />
            <span>Import Rates (CSV)</span>
          </Link>
          <Link href="/admin/rates/lookup" className="btn secondary sm">
            <Icon name="search" size={13} />
            <span>Rate Lookup</span>
          </Link>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => {
              setCreateErr(null);
              setIsCreateOpen(true);
            }}
          >
            <Icon name="plus" size={13} />
            <span>New Rate Group</span>
          </button>
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

      {/* KPI Summary Grid */}
      <div className="kpiGrid" style={{ marginBottom: 24 }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Rate Groups</div>
          <div className="kpiValue">{stats.totalGroups}</div>
          <div className="kpiSub">{stats.customerGroups} customer · {stats.carrierGroups} carrier</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Prefix Rates</div>
          <div className="kpiValue" style={{ color: "var(--primary)" }}>
            {stats.totalRates.toLocaleString()}
          </div>
          <div className="kpiSub">Across all tariff catalogs</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Attached Accounts</div>
          <div className="kpiValue" style={{ color: stats.totalAccounts > 0 ? "var(--success)" : "var(--muted)" }}>
            {stats.totalAccounts}
          </div>
          <div className="kpiSub">Actively billed customers</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Longest-Prefix Engine</div>
          <div className="kpiValue" style={{ fontSize: 18, color: "var(--cyan, #06b6d4)" }}>
            Active
          </div>
          <div className="kpiSub">VOS Radix Trie & E.164 Engine</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
              <Icon name="search" size={14} />
            </span>
            <input
              type="text"
              className="input sm"
              style={{ paddingLeft: 34, width: "100%" }}
              placeholder="Search rate groups by name, memo, or ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Side:</label>
            <select
              className="select sm"
              value={selectedSide}
              onChange={(e) => setSelectedSide(e.target.value)}
            >
              <option value="all">All Sides</option>
              <option value="customer">Customer (Sell)</option>
              <option value="carrier">Carrier (Buy)</option>
              <option value="shared">Shared</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Status:</label>
            <select
              className="select sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void fetchGroups()}
            title="Refresh Rate Groups"
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Groups Table */}
      <div className="card">
        <div className="cardHead">
          <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
            Rate Groups Catalog
          </div>
          <span className="badge">
            {filteredGroups.length} of {groups.length} groups
          </span>
        </div>

        {loading && groups.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <Icon name="refresh" size={18} className="spin" style={{ marginBottom: 8 }} />
            <div>Loading rate groups & tariff metrics…</div>
          </div>
        ) : err && groups.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ color: "var(--danger)", marginBottom: 12 }}>{err}</div>
            <button type="button" className="btn secondary sm" onClick={() => void fetchGroups()}>
              Retry
            </button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              No Rate Groups Found
            </div>
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              {searchTerm || selectedSide !== "all" || selectedStatus !== "all"
                ? "No rate groups matched your current search filters."
                : "No rate groups have been created yet. Create a rate group to start managing dial codes and pricing."}
            </p>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => setIsCreateOpen(true)}
            >
              <Icon name="plus" size={13} />
              <span>Create First Rate Group</span>
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Group Name</th>
                  <th>Side / Purpose</th>
                  <th style={{ textAlign: "right" }}>Rate Prefixes</th>
                  <th style={{ textAlign: "right" }}>Attached Accounts</th>
                  <th>Status</th>
                  <th>Memo</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: "right", minWidth: 220 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                        <Link
                          href={`/admin/rates/groups/${g.id}`}
                          style={{ color: "var(--primary)", textDecoration: "none" }}
                          className="hoverUnderline"
                        >
                          {g.name}
                        </Link>
                      </div>
                      <div className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        {g.id}
                      </div>
                    </td>

                    <td>
                      <span
                        className="badge"
                        style={{
                          textTransform: "capitalize",
                          background:
                            g.side === "customer"
                              ? "rgba(37, 99, 235, 0.12)"
                              : g.side === "carrier"
                              ? "rgba(168, 85, 247, 0.12)"
                              : "rgba(100, 116, 139, 0.12)",
                          color:
                            g.side === "customer"
                              ? "var(--primary)"
                              : g.side === "carrier"
                              ? "#c084fc"
                              : "var(--muted)",
                        }}
                      >
                        {g.side}
                      </span>
                    </td>

                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      <Link
                        href={`/admin/rates/groups/${g.id}`}
                        className="badge badge-online"
                        style={{ textDecoration: "none", fontWeight: 700 }}
                        title="Click to view and edit rate prefixes"
                      >
                        {Number(g.rate_count || 0).toLocaleString()} rates
                      </Link>
                    </td>

                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {Number(g.attached_accounts_count || 0) > 0 ? (
                        <span className="badge" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--success)", fontWeight: 700 }}>
                          {g.attached_accounts_count} accounts
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>0</span>
                      )}
                    </td>

                    <td>
                      <Status value={g.status || "active"} />
                    </td>

                    <td style={{ maxWidth: 180, fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.memo || "—"}
                    </td>

                    <td style={{ fontSize: 12, color: "var(--muted)" }}>
                      {g.updated_at ? new Date(g.updated_at).toLocaleString() : "—"}
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <Link
                          href={`/admin/rates/groups/${g.id}`}
                          className="btn primary xs"
                          title="Open full rate editor for this group"
                        >
                          <Icon name="edit" size={12} />
                          <span>Rates</span>
                        </Link>

                        <Link
                          href={`/admin/rates/imports?groupId=${g.id}`}
                          className="btn secondary xs"
                          title="Upload CSV rate sheet to this group"
                        >
                          <Icon name="upload" size={12} />
                          <span>Import</span>
                        </Link>

                        <button
                          type="button"
                          className="btn secondary xs"
                          onClick={() => {
                            setDuplicateGroup(g);
                            setDuplicateName(`${g.name} (Copy)`);
                            setDuplicateErr(null);
                          }}
                          title="Clone this rate group with all prefix rates"
                        >
                          <Icon name="copy" size={12} />
                          <span>Clone</span>
                        </button>

                        <button
                          type="button"
                          className="btn secondary xs"
                          onClick={() => {
                            setEditGroup(g);
                            setEditName(g.name);
                            setEditSide(g.side);
                            setEditStatus(g.status || "active");
                            setEditMemo(g.memo || "");
                            setEditErr(null);
                          }}
                          title="Edit group name and properties"
                        >
                          <Icon name="settings" size={12} />
                        </button>

                        <button
                          type="button"
                          className="btn danger xs"
                          onClick={() => {
                            setDeleteGroup(g);
                            setDeleteErr(null);
                          }}
                          title="Delete or archive rate group"
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Rate Group */}
      {isCreateOpen && (
        <div className="modalOverlay" onClick={() => !createBusy && setIsCreateOpen(false)}>
          <div className="modalCard" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ fontSize: 16, fontWeight: 700 }}>Create New Rate Group</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setIsCreateOpen(false)}
                disabled={createBusy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormErrorAlert error={createErr} onDismiss={() => setCreateErr(null)} />
                <div className="field">
                  <label>Rate Group Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Standard Tier 1 Wholesale Rates"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="field">
                  <label>Side / Catalog Type</label>
                  <select
                    className="select"
                    value={createSide}
                    onChange={(e) => setCreateSide(e.target.value as any)}
                  >
                    <option value="customer">Customer (Sell Rate Deck)</option>
                    <option value="carrier">Carrier (Buy / Egress Cost Deck)</option>
                    <option value="shared">Shared / Internal Master</option>
                  </select>
                </div>

                <div className="field">
                  <label>Memo / Description</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="Optional operational notes or billing tier description…"
                    value={createMemo}
                    onChange={(e) => setCreateMemo(e.target.value)}
                  />
                </div>
              </div>

              <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={createBusy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary sm" disabled={createBusy}>
                  {createBusy ? "Creating Group…" : "Create Rate Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Duplicate Rate Group */}
      {duplicateGroup && (
        <div className="modalOverlay" onClick={() => !duplicateBusy && setDuplicateGroup(null)}>
          <div className="modalCard" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ fontSize: 16, fontWeight: 700 }}>Duplicate Rate Group</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setDuplicateGroup(null)}
                disabled={duplicateBusy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDuplicate}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormErrorAlert error={duplicateErr} onDismiss={() => setDuplicateErr(null)} />
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
                  Cloning <strong>{duplicateGroup.name}</strong> will copy all{" "}
                  <strong>{Number(duplicateGroup.rate_count || 0).toLocaleString()}</strong> active prefix rates into
                  a new independent rate group.
                </p>

                <div className="field">
                  <label>New Rate Group Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={duplicateName}
                    onChange={(e) => setDuplicateName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setDuplicateGroup(null)}
                  disabled={duplicateBusy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary sm" disabled={duplicateBusy}>
                  {duplicateBusy ? "Cloning Rates…" : "Duplicate Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Rate Group */}
      {editGroup && (
        <div className="modalOverlay" onClick={() => !editBusy && setEditGroup(null)}>
          <div className="modalCard" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Rate Group</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setEditGroup(null)}
                disabled={editBusy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEdit}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormErrorAlert error={editErr} onDismiss={() => setEditErr(null)} />
                <div className="field">
                  <label>Rate Group Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Side / Catalog Type</label>
                  <select
                    className="select"
                    value={editSide}
                    onChange={(e) => setEditSide(e.target.value as any)}
                  >
                    <option value="customer">Customer (Sell)</option>
                    <option value="carrier">Carrier (Buy)</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>

                <div className="field">
                  <label>Status</label>
                  <select
                    className="select"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="field">
                  <label>Memo</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                  />
                </div>
              </div>

              <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setEditGroup(null)}
                  disabled={editBusy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary sm" disabled={editBusy}>
                  {editBusy ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Rate Group */}
      {deleteGroup && (
        <div className="modalOverlay" onClick={() => !deleteBusy && setDeleteGroup(null)}>
          <div className="modalCard" style={{ maxWidth: 460, borderColor: "var(--danger)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead" style={{ borderBottomColor: "rgba(239, 68, 68, 0.2)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--danger)" }}>Delete Rate Group</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setDeleteGroup(null)}
                disabled={deleteBusy}
              >
                ✕
              </button>
            </div>

            <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormErrorAlert error={deleteErr} onDismiss={() => setDeleteErr(null)} />
              <p style={{ fontSize: 13, color: "var(--text)", margin: 0 }}>
                Are you sure you want to permanently delete rate group{" "}
                <strong>&quot;{deleteGroup.name}&quot;</strong>?
              </p>

              {Number(deleteGroup.attached_accounts_count || 0) > 0 && (
                <div
                  className="card"
                  style={{
                    padding: 12,
                    background: "rgba(239, 68, 68, 0.08)",
                    borderColor: "var(--danger)",
                    fontSize: 12.5,
                    color: "var(--danger)",
                  }}
                >
                  <strong>⚠️ Critical Impact:</strong> This group is currently assigned to{" "}
                  <strong>{deleteGroup.attached_accounts_count} active customer accounts</strong>. Deleting it will
                  unassign their rates and may halt billable call processing.
                </div>
              )}

              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                This action will delete all {Number(deleteGroup.rate_count || 0).toLocaleString()} prefix rates in this
                group and create an audit log entry.
              </p>
            </div>

            <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setDeleteGroup(null)}
                disabled={deleteBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger sm"
                onClick={() => void handleDelete()}
                disabled={deleteBusy}
              >
                {deleteBusy ? "Deleting…" : "Confirm Delete Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
