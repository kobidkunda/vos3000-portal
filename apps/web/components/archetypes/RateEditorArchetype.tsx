"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { api } from "../../lib/api";
import { parseTelecomPhone, getCountryName } from "@vos/shared";
import { FormErrorHeader, FormErrorAlert } from "../shared/FormErrorHeader";

export interface RateItem {
  id: string;
  rate_group_id: string;
  prefix: string;
  country_code?: string;
  country_name?: string;
  area_name?: string;
  rate_type?: string;
  rate_per_minute: string | number;
  billing_cycle_seconds: number;
  initial_interval?: number;
  increment_interval?: number;
  created_at: string;
  has_collision?: boolean;
}

export function RateEditorArchetype({
  groupId,
  title = "Rate Editor & Tariff Catalog",
  purpose = "Inspect, add, modify, and validate individual dial prefix rates and billing increments.",
  source = "postgres (rates) + vos",
  warnings,
}: {
  groupId: string;
  title?: string;
  purpose?: string;
  source?: string;
  warnings?: string[];
}) {
  const [group, setGroup] = useState<any>(null);
  const [rates, setRates] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Filters
  const [searchPrefix, setSearchPrefix] = useState("");
  const [searchArea, setSearchArea] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [selectedRateType, setSelectedRateType] = useState<string>("all");
  const [filterCollisionsOnly, setFilterCollisionsOnly] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // Inline Editing
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState("");
  const [inlineCycle, setInlineCycle] = useState("");
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineErr, setInlineErr] = useState<unknown | null>(null);

  // Add Rate Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addPrefix, setAddPrefix] = useState("");
  const [addArea, setAddArea] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addCadence, setAddCadence] = useState("60/1");
  const [addRateType, setAddRateType] = useState("standard");
  const [addBusy, setAddBusy] = useState(false);
  const [addErr, setAddErr] = useState<unknown | null>(null);

  // Edit Rate Modal
  const [editingItem, setEditingItem] = useState<RateItem | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editCadence, setEditCadence] = useState("60/1");
  const [editRateType, setEditRateType] = useState("standard");
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState<unknown | null>(null);

  // Bulk Adjust Modal
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState<"percentage" | "fixed">("percentage");
  const [bulkValue, setBulkValue] = useState("5.0");
  const [bulkPrefixFilter, setBulkPrefixFilter] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkErr, setBulkErr] = useState<unknown | null>(null);

  // Delete Modal
  const [deletingRate, setDeletingRate] = useState<RateItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState<unknown | null>(null);

  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Load Group Details
  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    try {
      const res: any = await api(`/api/v1/admin/rates/groups/${groupId}`);
      setGroup(res?.data || null);
    } catch {
      // ignore
    }
  }, [groupId]);

  // Load Rates with Query Filters
  const fetchRates = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(pageSize));
      if (searchPrefix.trim()) params.set("prefix", searchPrefix.trim().replace(/\D/g, ""));
      if (searchArea.trim()) params.set("area_name", searchArea.trim());
      if (selectedCountry !== "all") params.set("country", selectedCountry);
      if (selectedRateType !== "all") params.set("rate_type", selectedRateType);

      const res: any = await api(`/api/v1/admin/rates/groups/${groupId}/rates?${params.toString()}`);
      if (res?.data) {
        const list = Array.isArray(res.data.rates) ? res.data.rates : Array.isArray(res.data) ? res.data : [];
        setRates(list);
        setTotalCount(res.data.total ?? list.length);
      } else {
        setRates([]);
        setTotalCount(0);
      }
    } catch (e: any) {
      setErr(e.message || "Failed to load rates");
    } finally {
      setLoading(false);
    }
  }, [groupId, page, pageSize, searchPrefix, searchArea, selectedCountry, selectedRateType]);

  useEffect(() => {
    void fetchGroup();
  }, [fetchGroup]);

  useEffect(() => {
    void fetchRates();
  }, [fetchRates]);

  // Auto-detect country & destination info when adding prefix
  useEffect(() => {
    const clean = addPrefix.replace(/\D/g, "");
    if (clean.length >= 1 && !addArea) {
      const phoneInfo = parseTelecomPhone("+" + clean);
      if (phoneInfo?.countryName) {
        setAddArea(`${phoneInfo.countryName} Proper`);
      }
    }
  }, [addPrefix, addArea]);

  // Distinct countries available in current sheet
  const availableCountries = useMemo(() => {
    const map = new Map<string, string>();
    rates.forEach((r) => {
      if (r.country_code) {
        map.set(r.country_code, r.country_name || getCountryName(r.country_code) || r.country_code);
      } else {
        const phone = parseTelecomPhone("+" + r.prefix);
        if (phone.country) {
          map.set(phone.country, phone.countryName || phone.country);
        }
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rates]);

  // Handlers
  async function handleAddRate(e: React.FormEvent) {
    e.preventDefault();
    const cleanPrefix = addPrefix.replace(/\D/g, "");
    if (!cleanPrefix || !addPrice || addBusy) return;
    setAddBusy(true);
    setAddErr(null);
    try {
      const [initSec, incrSec] = addCadence.split("/").map((n) => parseInt(n, 10) || 60);
      await api(`/api/v1/admin/rates/groups/${groupId}/rates`, {
        method: "POST",
        body: JSON.stringify({
          prefix: cleanPrefix,
          area_name: addArea.trim() || undefined,
          rate_per_minute: parseFloat(addPrice),
          billing_cycle_seconds: initSec,
          initial_interval: initSec,
          increment_interval: incrSec || 1,
          rate_type: addRateType,
        }),
      });
      setIsAddOpen(false);
      setAddPrefix("");
      setAddArea("");
      setAddPrice("");
      setNotice({ type: "ok", text: `Rate for prefix +${cleanPrefix} created successfully.` });
      void fetchRates();
      void fetchGroup();
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setAddErr(e);
    } finally {
      setAddBusy(false);
    }
  }

  async function handleInlineSave(rate: RateItem) {
    if (!rate || inlineBusy) return;
    setInlineBusy(true);
    setInlineErr(null);
    try {
      const rpm = parseFloat(inlinePrice);
      const [initSec, incrSec] = inlineCycle.split("/").map((n) => parseInt(n, 10) || 60);
      await api(`/api/v1/admin/rates/groups/${groupId}/rates/${rate.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          rate_per_minute: !isNaN(rpm) ? rpm : rate.rate_per_minute,
          billing_cycle_seconds: initSec,
          initial_interval: initSec,
          increment_interval: incrSec || 1,
        }),
      });
      setEditingRateId(null);
      setNotice({ type: "ok", text: `Prefix +${rate.prefix} rate updated.` });
      void fetchRates();
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setInlineErr(e);
    } finally {
      setInlineBusy(false);
    }
  }

  async function handleEditModalSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || editBusy) return;
    setEditBusy(true);
    setEditErr(null);
    try {
      const [initSec, incrSec] = editCadence.split("/").map((n) => parseInt(n, 10) || 60);
      await api(`/api/v1/admin/rates/groups/${groupId}/rates/${editingItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          area_name: editArea.trim(),
          rate_per_minute: parseFloat(editPrice),
          billing_cycle_seconds: initSec,
          initial_interval: initSec,
          increment_interval: incrSec || 1,
          rate_type: editRateType,
        }),
      });
      setEditingItem(null);
      setNotice({ type: "ok", text: `Rate prefix +${editingItem.prefix} updated.` });
      void fetchRates();
      setTimeout(() => setNotice(null), 4000);
    } catch (e: any) {
      setEditErr(e);
    } finally {
      setEditBusy(false);
    }
  }

  async function handleBulkAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkValue || bulkBusy) return;
    setBulkBusy(true);
    setBulkErr(null);
    try {
      const res: any = await api(`/api/v1/admin/rates/groups/${groupId}/bulk-adjust`, {
        method: "POST",
        body: JSON.stringify({
          adjustment_type: bulkType,
          value: parseFloat(bulkValue),
          prefix_filter: bulkPrefixFilter.trim() || undefined,
        }),
      });
      setIsBulkOpen(false);
      setNotice({
        type: "ok",
        text: `Bulk adjustment applied to ${res?.data?.adjusted_count ?? 0} prefix rates.`,
      });
      void fetchRates();
      setTimeout(() => setNotice(null), 5000);
    } catch (e: any) {
      setBulkErr(e);
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleDelete() {
    if (!deletingRate || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteErr(null);
    try {
      await api(`/api/v1/admin/rates/groups/${groupId}/rates/${deletingRate.id}`, {
        method: "DELETE",
      });
      setDeletingRate(null);
      setNotice({ type: "ok", text: `Prefix +${deletingRate.prefix} deleted.` });
      void fetchRates();
      void fetchGroup();
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      setDeleteErr(e);
    } finally {
      setDeleteBusy(false);
    }
  }

  const groupName = group?.name || `Rate Group ${groupId?.slice(0, 8)}…`;
  const attachedAccounts = Number(group?.attached_accounts_count || 0);

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/admin/rates/groups"
              style={{ color: "var(--muted)", textDecoration: "none", fontSize: 13 }}
              className="hoverUnderline"
            >
              Rate Groups
            </Link>
            <span style={{ color: "var(--muted)" }}>/</span>
            <h1>{groupName}</h1>
            <span
              className="badge"
              style={{
                textTransform: "capitalize",
                background: "rgba(37, 99, 235, 0.12)",
                color: "var(--primary)",
                fontWeight: 700,
              }}
            >
              {group?.side || "customer"}
            </span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{group?.memo || purpose}</p>
        </div>

        <div className="pageActions">
          <Link href={`/admin/rates/imports?groupId=${groupId}`} className="btn secondary sm">
            <Icon name="upload" size={13} />
            <span>Upload CSV Sheet</span>
          </Link>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => {
              setBulkErr(null);
              setIsBulkOpen(true);
            }}
          >
            <Icon name="pulse" size={13} />
            <span>Bulk Rate Adjust (+/- %)</span>
          </button>
          <Link href="/admin/rates/lookup" className="btn secondary sm">
            <Icon name="search" size={13} />
            <span>Lookup Tool</span>
          </Link>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => {
              setAddErr(null);
              setAddPrefix("");
              setAddArea("");
              setAddPrice("");
              setIsAddOpen(true);
            }}
          >
            <Icon name="plus" size={13} />
            <span>Add Rate Prefix</span>
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

      {/* Attached Accounts Active Warning */}
      {attachedAccounts > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 20,
            background: "rgba(245, 158, 11, 0.08)",
            borderColor: "var(--warning)",
            padding: "14px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 700, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>Live Tariff Warning: This rate group is assigned to {attachedAccounts} active customer accounts.</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
            Rate changes made here directly affect customer CDR billing and routing calculations in real time.
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="kpiGrid" style={{ marginBottom: 20 }}>
        <div className="card kpiCard">
          <div className="kpiLabel">Total Rate Prefixes</div>
          <div className="kpiValue" style={{ color: "var(--primary)" }}>
            {totalCount.toLocaleString()}
          </div>
          <div className="kpiSub">Active dial destinations</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Attached Accounts</div>
          <div className="kpiValue" style={{ color: attachedAccounts > 0 ? "var(--success)" : "var(--muted)" }}>
            {attachedAccounts}
          </div>
          <div className="kpiSub">Subscribed customer organizations</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Longest-Prefix Algorithm</div>
          <div className="kpiValue" style={{ fontSize: 18, color: "var(--cyan, #06b6d4)" }}>
            E.164 Radix Trie
          </div>
          <div className="kpiSub">Automatic longest digit match</div>
        </div>
        <div className="card kpiCard">
          <div className="kpiLabel">Catalog Side</div>
          <div className="kpiValue" style={{ textTransform: "capitalize", fontSize: 18 }}>
            {group?.side || "Customer"}
          </div>
          <div className="kpiSub">{group?.status || "Active"} tier</div>
        </div>
      </div>

      {/* Filter & Country Search Bar */}
      <div className="card" style={{ marginBottom: 20, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Prefix Search */}
          <div style={{ minWidth: 160, flex: 1, position: "relative" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
              <Icon name="search" size={13} />
            </span>
            <input
              type="text"
              className="input sm mono"
              style={{ paddingLeft: 30, width: "100%" }}
              placeholder="Search prefix (e.g. 1415, 4420)…"
              value={searchPrefix}
              onChange={(e) => {
                setSearchPrefix(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Area Search */}
          <div style={{ minWidth: 160, flex: 1 }}>
            <input
              type="text"
              className="input sm"
              style={{ width: "100%" }}
              placeholder="Filter area / destination name…"
              value={searchArea}
              onChange={(e) => {
                setSearchArea(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Country Dropdown */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Country:</label>
            <select
              className="select sm"
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setPage(1);
              }}
              style={{ maxWidth: 180 }}
            >
              <option value="all">All Countries ({availableCountries.length})</option>
              {availableCountries.map(([code, name]) => (
                <option key={code} value={code}>
                  {code} - {name}
                </option>
              ))}
            </select>
          </div>

          {/* Rate Type */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Type:</label>
            <select
              className="select sm"
              value={selectedRateType}
              onChange={(e) => {
                setSelectedRateType(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Types</option>
              <option value="standard">Standard</option>
              <option value="peak">Peak</option>
              <option value="offpeak">Off-Peak</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => void fetchRates()}
            title="Refresh rates"
          >
            <Icon name="refresh" size={13} className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Rates Table */}
      <div className="card">
        <FormErrorAlert
          error={inlineErr}
          onDismiss={() => setInlineErr(null)}
          style={{ margin: "14px 18px 0" }}
        />
        <div className="cardHead">
          <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
            Prefix Rate Catalog
          </div>
          <span className="badge">
            Showing {rates.length} of {totalCount} records
          </span>
        </div>

        {loading && rates.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <Icon name="refresh" size={18} className="spin" style={{ marginBottom: 8 }} />
            <div>Loading destination rate prefixes…</div>
          </div>
        ) : err && rates.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ color: "var(--danger)", marginBottom: 12 }}>{err}</div>
            <button type="button" className="btn secondary sm" onClick={() => void fetchRates()}>
              Retry
            </button>
          </div>
        ) : rates.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginBottom: 6 }}>
              No Rate Prefixes Found
            </div>
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              {searchPrefix || searchArea || selectedCountry !== "all" || selectedRateType !== "all"
                ? "No rate prefixes matched your active search filters."
                : "This rate group has no rates yet. Add rates manually or import a CSV rate deck."}
            </p>
            <div style={{ display: "inline-flex", gap: 10 }}>
              <button type="button" className="btn primary sm" onClick={() => setIsAddOpen(true)}>
                <Icon name="plus" size={13} />
                <span>Add Rate Prefix</span>
              </button>
              <Link href={`/admin/rates/imports?groupId=${groupId}`} className="btn secondary sm">
                <Icon name="upload" size={13} />
                <span>Upload CSV Sheet</span>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Dial Prefix</th>
                  <th>Country & Destination Area</th>
                  <th style={{ textAlign: "right", width: 180 }}>Rate ($/min)</th>
                  <th style={{ textAlign: "center", width: 130 }}>Billing Interval</th>
                  <th>Rate Type</th>
                  <th style={{ textAlign: "right", width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => {
                  const isInlineEditing = editingRateId === r.id;
                  const phone = parseTelecomPhone("+" + r.prefix);
                  const countryName = r.country_name || phone.countryName || getCountryName(r.country_code) || "";
                  const countryCode = r.country_code || phone.country || "";
                  const intervalDisplay = `${r.initial_interval || r.billing_cycle_seconds || 60}s / ${r.increment_interval || 1}s`;

                  return (
                    <tr key={r.id}>
                      {/* Prefix */}
                      <td>
                        <span className="mono" style={{ fontWeight: 800, fontSize: 13.5, color: "var(--primary)" }}>
                          +{r.prefix}
                        </span>
                      </td>

                      {/* Country & Area */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {countryCode && (
                            <span
                              className="badge"
                              style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: "2px 6px",
                                background: "rgba(100, 116, 139, 0.12)",
                              }}
                            >
                              {countryCode}
                            </span>
                          )}
                          <div>
                            <div style={{ fontWeight: 650, fontSize: 13 }}>
                              {r.area_name || countryName || `Prefix +${r.prefix}`}
                            </div>
                            {countryName && countryName !== r.area_name && (
                              <div style={{ fontSize: 11, color: "var(--muted)" }}>{countryName}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rate per minute */}
                      <td style={{ textAlign: "right" }}>
                        {isInlineEditing ? (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>$</span>
                            <input
                              type="number"
                              step="0.000001"
                              min="0"
                              className="input xs mono"
                              style={{ width: 100, textAlign: "right", fontWeight: 700 }}
                              value={inlinePrice}
                              onChange={(e) => setInlinePrice(e.target.value)}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span
                            className="mono"
                            style={{
                              fontWeight: 750,
                              fontSize: 13.5,
                              color: "var(--text)",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            ${Number(r.rate_per_minute || 0).toFixed(6)}
                          </span>
                        )}
                      </td>

                      {/* Billing Cadence */}
                      <td style={{ textAlign: "center" }}>
                        {isInlineEditing ? (
                          <select
                            className="select xs"
                            value={inlineCycle}
                            onChange={(e) => setInlineCycle(e.target.value)}
                          >
                            <option value="60/1">60/1</option>
                            <option value="60/60">60/60</option>
                            <option value="1/1">1/1</option>
                            <option value="30/6">30/6</option>
                          </select>
                        ) : (
                          <span className="badge" style={{ fontSize: 11, fontWeight: 600 }}>
                            {intervalDisplay}
                          </span>
                        )}
                      </td>

                      {/* Rate Type */}
                      <td>
                        <span
                          className="badge"
                          style={{
                            fontSize: 11,
                            textTransform: "capitalize",
                            background:
                              r.rate_type === "peak"
                                ? "rgba(245, 158, 11, 0.12)"
                                : r.rate_type === "offpeak"
                                ? "rgba(16, 185, 129, 0.12)"
                                : "rgba(100, 116, 139, 0.12)",
                            color:
                              r.rate_type === "peak"
                                ? "var(--warning)"
                                : r.rate_type === "offpeak"
                                ? "var(--success)"
                                : "var(--muted)",
                          }}
                        >
                          {r.rate_type || "standard"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        {isInlineEditing ? (
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn primary xs"
                              onClick={() => void handleInlineSave(r)}
                              disabled={inlineBusy}
                            >
                              <Icon name="check" size={11} />
                              <span>Save</span>
                            </button>
                            <button
                              type="button"
                              className="btn secondary xs"
                              onClick={() => setEditingRateId(null)}
                              disabled={inlineBusy}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "inline-flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn secondary xs"
                              onClick={() => {
                                setInlineErr(null);
                                setEditingRateId(r.id);
                                setInlinePrice(String(r.rate_per_minute));
                                setInlineCycle(
                                  `${r.initial_interval || r.billing_cycle_seconds || 60}/${r.increment_interval || 1}`
                                );
                              }}
                              title="Quick edit rate & increment"
                            >
                              <Icon name="edit" size={11} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="btn secondary xs"
                              onClick={() => {
                                setEditingItem(r);
                                setEditPrice(String(r.rate_per_minute));
                                setEditArea(r.area_name || "");
                                setEditCadence(
                                  `${r.initial_interval || r.billing_cycle_seconds || 60}/${r.increment_interval || 1}`
                                );
                                setEditRateType(r.rate_type || "standard");
                                setEditErr(null);
                              }}
                              title="Edit all prefix properties"
                            >
                              <Icon name="settings" size={11} />
                            </button>

                            <button
                              type="button"
                              className="btn danger xs"
                              onClick={() => {
                                setDeleteErr(null);
                                setDeletingRate(r);
                              }}
                              title="Delete rate prefix"
                            >
                              <Icon name="trash" size={11} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalCount > pageSize && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 18px",
              borderTop: "1px solid var(--border)",
              fontSize: 12.5,
              color: "var(--muted)",
            }}
          >
            <div>
              Page {page} of {Math.ceil(totalCount / pageSize)} ({totalCount} total prefixes)
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn secondary xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn secondary xs"
                disabled={page >= Math.ceil(totalCount / pageSize)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Add Rate Prefix */}
      {isAddOpen && (
        <div className="modalOverlay" onClick={() => !addBusy && setIsAddOpen(false)}>
          <div className="modalCard" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ fontSize: 16, fontWeight: 700 }}>Add Rate Prefix</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setIsAddOpen(false)}
                disabled={addBusy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddRate}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormErrorHeader error={addErr} onDismiss={() => setAddErr("")} />
                <div className="field">
                  <label>Dial Prefix (Digits Only) *</label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontWeight: 700, color: "var(--muted)" }}>
                      +
                    </span>
                    <input
                      type="text"
                      className="input mono"
                      style={{ paddingLeft: 28 }}
                      placeholder="e.g. 1415, 4420, 91"
                      value={addPrefix}
                      onChange={(e) => setAddPrefix(e.target.value.replace(/\D/g, ""))}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Destination / Country Area Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. United States San Francisco, UK London"
                    value={addArea}
                    onChange={(e) => setAddArea(e.target.value)}
                  />
                </div>

                <div className="grid2" style={{ gap: 12 }}>
                  <div className="field">
                    <label>Rate ($ / Minute) *</label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      className="input mono"
                      placeholder="0.015000"
                      value={addPrice}
                      onChange={(e) => setAddPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Billing Cadence</label>
                    <select
                      className="select"
                      value={addCadence}
                      onChange={(e) => setAddCadence(e.target.value)}
                    >
                      <option value="60/1">60/1 (1 min initial, 1s increment)</option>
                      <option value="60/60">60/60 (Full minute increments)</option>
                      <option value="1/1">1/1 (Per-second billing)</option>
                      <option value="30/6">30/6 (30s initial, 6s increment)</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Rate Type</label>
                  <select
                    className="select"
                    value={addRateType}
                    onChange={(e) => setAddRateType(e.target.value)}
                  >
                    <option value="standard">Standard (24/7)</option>
                    <option value="peak">Peak Hours</option>
                    <option value="offpeak">Off-Peak / Weekend</option>
                    <option value="premium">Premium Tier</option>
                  </select>
                </div>
              </div>

              <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setIsAddOpen(false)}
                  disabled={addBusy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary sm" disabled={addBusy}>
                  {addBusy ? "Saving…" : "Save Rate Prefix"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Rate Prefix */}
      {editingItem && (
        <div className="modalOverlay" onClick={() => !editBusy && setEditingItem(null)}>
          <div className="modalCard" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Prefix +{editingItem.prefix}</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setEditingItem(null)}
                disabled={editBusy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditModalSave}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormErrorHeader error={editErr} onDismiss={() => setEditErr("")} />
                <div className="field">
                  <label>Destination / Area Name</label>
                  <input
                    type="text"
                    className="input"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                  />
                </div>

                <div className="grid2" style={{ gap: 12 }}>
                  <div className="field">
                    <label>Rate ($ / Minute) *</label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0"
                      className="input mono"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Billing Cadence</label>
                    <select
                      className="select"
                      value={editCadence}
                      onChange={(e) => setEditCadence(e.target.value)}
                    >
                      <option value="60/1">60/1 (1 min initial, 1s increment)</option>
                      <option value="60/60">60/60 (Full minute increments)</option>
                      <option value="1/1">1/1 (Per-second billing)</option>
                      <option value="30/6">30/6 (30s initial, 6s increment)</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Rate Type</label>
                  <select
                    className="select"
                    value={editRateType}
                    onChange={(e) => setEditRateType(e.target.value)}
                  >
                    <option value="standard">Standard (24/7)</option>
                    <option value="peak">Peak</option>
                    <option value="offpeak">Off-Peak</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>

              <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setEditingItem(null)}
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

      {/* Modal: Bulk Adjust */}
      {isBulkOpen && (
        <div className="modalOverlay" onClick={() => !bulkBusy && setIsBulkOpen(false)}>
          <div className="modalCard" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead">
              <div style={{ fontSize: 16, fontWeight: 700 }}>Bulk Rate Adjustment</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setIsBulkOpen(false)}
                disabled={bulkBusy}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkAdjust}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormErrorHeader error={bulkErr} onDismiss={() => setBulkErr("")} />
                <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
                  Adjust rates across prefixes in <strong>{groupName}</strong>. A snapshot of current rates will be saved
                  automatically for rollback safety.
                </p>

                <div className="field">
                  <label>Adjustment Type</label>
                  <select
                    className="select"
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value as any)}
                  >
                    <option value="percentage">Percentage Multiplier (e.g. +5% or -10%)</option>
                    <option value="fixed">Fixed Delta Amount (e.g. +$0.0050/min)</option>
                  </select>
                </div>

                <div className="field">
                  <label>Adjustment Value {bulkType === "percentage" ? "(%)" : "($/min)"} *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input mono"
                    placeholder={bulkType === "percentage" ? "5.0" : "0.005"}
                    value={bulkValue}
                    onChange={(e) => setBulkValue(e.target.value)}
                    required
                  />
                  <div className="help">
                    {bulkType === "percentage"
                      ? "Enter 5 to increase rates by 5%, or -5 to discount by 5%."
                      : "Enter 0.005 to add $0.0050/min, or -0.005 to subtract."}
                  </div>
                </div>

                <div className="field">
                  <label>Filter Prefix (Optional)</label>
                  <input
                    type="text"
                    className="input mono"
                    placeholder="e.g. 1 (all North America) or leave blank for entire group"
                    value={bulkPrefixFilter}
                    onChange={(e) => setBulkPrefixFilter(e.target.value)}
                  />
                </div>
              </div>

              <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setIsBulkOpen(false)}
                  disabled={bulkBusy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary sm" disabled={bulkBusy}>
                  {bulkBusy ? "Applying Adjustments…" : "Apply Bulk Adjustments"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Rate Prefix */}
      {deletingRate && (
        <div className="modalOverlay" onClick={() => !deleteBusy && setDeletingRate(null)}>
          <div className="modalCard" style={{ maxWidth: 440, borderColor: "var(--danger)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modalHead" style={{ borderBottomColor: "rgba(239, 68, 68, 0.2)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--danger)" }}>Delete Prefix +{deletingRate.prefix}</div>
              <button
                type="button"
                className="btn secondary sm"
                style={{ padding: "2px 8px" }}
                onClick={() => setDeletingRate(null)}
                disabled={deleteBusy}
              >
                ✕
              </button>
            </div>

            <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormErrorAlert error={deleteErr} onDismiss={() => setDeleteErr(null)} />
              <p style={{ fontSize: 13, margin: 0 }}>
                Are you sure you want to remove prefix <strong>+{deletingRate.prefix}</strong> ({deletingRate.area_name})
                from this rate group?
              </p>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Calls to numbers matching this prefix will fall back to broader parent prefixes (or fail if no match exists).
              </div>
            </div>

            <div className="modalFoot" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn secondary sm"
                onClick={() => setDeletingRate(null)}
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
                {deleteBusy ? "Deleting…" : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
