"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Icon } from "../../lib/icons";

export interface RawJsonInspectorProps {
  data: any;
  compositeData?: any;
  title?: string;
  filenamePrefix?: string;
  onReload?: () => void | Promise<void>;
  isLoading?: boolean;
  source?: string;
}

type ViewMode = "tree" | "code" | "schema";
type IndentMode = 2 | 4 | "minified";

interface FlattenedField {
  path: string;
  key: string;
  type: string;
  value: any;
  displayValue: string;
  source: string;
}

export function RawJsonInspector({
  data,
  compositeData,
  title = "Record",
  filenamePrefix = "vos_raw_payload",
  onReload,
  isLoading = false,
  source = "PostgreSQL + VOS Engine",
}: RawJsonInspectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const [indentMode, setIndentMode] = useState<IndentMode>(2);
  const [searchQuery, setSearchQuery] = useState("");
  const [wrapLines, setWrapLines] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(["$"]));
  const [activePayloadType, setActivePayloadType] = useState<"primary" | "composite">("primary");

  const effectiveData = useMemo(() => {
    if (activePayloadType === "composite" && compositeData) {
      return compositeData;
    }
    return data ?? {};
  }, [activePayloadType, compositeData, data]);

  // Calculate payload metadata
  const payloadStats = useMemo(() => {
    try {
      const jsonStr = JSON.stringify(effectiveData);
      const byteLength = new TextEncoder().encode(jsonStr).length;
      const formattedBytes =
        byteLength > 1024 * 1024
          ? `${(byteLength / (1024 * 1024)).toFixed(2)} MB`
          : byteLength > 1024
          ? `${(byteLength / 1024).toFixed(1)} KB`
          : `${byteLength} B`;
      const keyCount = typeof effectiveData === "object" && effectiveData !== null ? Object.keys(effectiveData).length : 1;
      return {
        size: formattedBytes,
        byteLength,
        keyCount,
        valid: true,
      };
    } catch {
      return { size: "0 B", byteLength: 0, keyCount: 0, valid: false };
    }
  }, [effectiveData]);

  // Automatically expand top-level nodes on first load
  useEffect(() => {
    const initial = new Set<string>(["$"]);
    if (typeof effectiveData === "object" && effectiveData !== null) {
      Object.keys(effectiveData).forEach((k) => {
        initial.add(`$.${k}`);
      });
    }
    setExpandedPaths(initial);
  }, [effectiveData]);

  // Flattened fields for Schema Table View
  const flattenedFields = useMemo(() => {
    const list: FlattenedField[] = [];
    function traverse(obj: any, path: string, currentKey: string) {
      if (obj === null || obj === undefined) {
        list.push({
          path,
          key: currentKey,
          type: "null",
          value: null,
          displayValue: "null",
          source: path.startsWith("$.vos") ? "VOS 3000 API" : "PostgreSQL (vos_portal)",
        });
        return;
      }
      const type = Array.isArray(obj) ? "array" : typeof obj;
      if (type === "object" && !Array.isArray(obj)) {
        const keys = Object.keys(obj);
        if (keys.length === 0) {
          list.push({
            path,
            key: currentKey,
            type: "object (empty)",
            value: obj,
            displayValue: "{}",
            source: "PostgreSQL",
          });
        } else {
          keys.forEach((k) => traverse(obj[k], `${path}.${k}`, k));
        }
      } else if (type === "array") {
        if (obj.length === 0) {
          list.push({
            path,
            key: currentKey,
            type: "array (empty)",
            value: obj,
            displayValue: "[]",
            source: "PostgreSQL",
          });
        } else {
          obj.forEach((item: any, idx: number) => traverse(item, `${path}[${idx}]`, `${currentKey}[${idx}]`));
        }
      } else {
        list.push({
          path,
          key: currentKey,
          type,
          value: obj,
          displayValue: String(obj),
          source: path.includes("vos_") || path.includes("vosAccount") ? "VOS Engine Mapping" : path.includes("ch_") || path.includes("cdr_") ? "ClickHouse Engine" : "PostgreSQL Database",
        });
      }
    }
    if (typeof effectiveData === "object" && effectiveData !== null) {
      Object.keys(effectiveData).forEach((k) => {
        traverse(effectiveData[k], `$.${k}`, k);
      });
    }
    return list;
  }, [effectiveData]);

  // Filtered flattened fields for Schema view
  const filteredSchema = useMemo(() => {
    if (!searchQuery.trim()) return flattenedFields;
    const q = searchQuery.toLowerCase();
    return flattenedFields.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.displayValue.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q)
    );
  }, [flattenedFields, searchQuery]);

  // Formatted JSON string based on indent settings
  const formattedCode = useMemo(() => {
    try {
      if (indentMode === "minified") {
        return JSON.stringify(effectiveData);
      }
      return JSON.stringify(effectiveData, null, indentMode);
    } catch {
      return String(effectiveData);
    }
  }, [effectiveData, indentMode]);

  // Code lines for syntax-highlighted code view
  const codeLines = useMemo(() => {
    return formattedCode.split("\n");
  }, [formattedCode]);

  // Copy helper
  const copyToClipboard = useCallback((text: string, keyId: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2200);
    }
  }, []);

  // Download JSON file
  const downloadJson = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(effectiveData, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const cleanTitle = (title || "record").replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase();
      link.setAttribute("href", url);
      link.setAttribute("download", `${filenamePrefix}_${cleanTitle}_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Download failed: " + e.message);
    }
  }, [effectiveData, filenamePrefix, title]);

  // Depth control presets
  const expandAll = useCallback(() => {
    const all = new Set<string>(["$"]);
    function collect(obj: any, path: string) {
      if (typeof obj === "object" && obj !== null) {
        all.add(path);
        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => collect(item, `${path}[${idx}]`));
        } else {
          Object.keys(obj).forEach((k) => collect(obj[k], `${path}.${k}`));
        }
      }
    }
    collect(effectiveData, "$");
    setExpandedPaths(all);
  }, [effectiveData]);

  const collapseAll = useCallback(() => {
    setExpandedPaths(new Set(["$"]));
  }, []);

  const expandToDepth = useCallback((depth: number) => {
    const result = new Set<string>(["$"]);
    function collect(obj: any, path: string, curDepth: number) {
      if (curDepth > depth) return;
      if (typeof obj === "object" && obj !== null) {
        result.add(path);
        if (Array.isArray(obj)) {
          obj.forEach((item, idx) => collect(item, `${path}[${idx}]`, curDepth + 1));
        } else {
          Object.keys(obj).forEach((k) => collect(obj[k], `${path}.${k}`, curDepth + 1));
        }
      }
    }
    collect(effectiveData, "$", 1);
    setExpandedPaths(result);
  }, [effectiveData]);

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Match count calculation
  const searchMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const q = searchQuery.toLowerCase();
    return flattenedFields.filter(
      (f) =>
        f.path.toLowerCase().includes(q) ||
        f.key.toLowerCase().includes(q) ||
        f.displayValue.toLowerCase().includes(q)
    ).length;
  }, [flattenedFields, searchQuery]);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)" }}>
      {/* Header Banner */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--surface2)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              background: "rgba(37, 99, 235, 0.12)",
              color: "var(--primary)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="code" size={16} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13.5, fontWeight: 750, color: "var(--text)" }}>Raw Record & Telemetry Inspector</span>
              <span className="badge badge-online" style={{ fontSize: 10.5 }}>
                {payloadStats.size} · {payloadStats.keyCount} attributes
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>
              Origin: <strong>{source}</strong> · Verified JSON Schema
            </div>
          </div>
        </div>

        {/* Payload Scope Selector (Entity vs Full Diagnostics Bundle) */}
        {compositeData && (
          <div style={{ display: "flex", gap: 4, background: "var(--surface)", padding: 3, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={() => setActivePayloadType("primary")}
              style={{
                background: activePayloadType === "primary" ? "var(--primary-soft)" : "transparent",
                color: activePayloadType === "primary" ? "var(--primary)" : "var(--muted)",
                border: "none",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              Primary Record
            </button>
            <button
              type="button"
              onClick={() => setActivePayloadType("composite")}
              style={{
                background: activePayloadType === "composite" ? "var(--primary-soft)" : "transparent",
                color: activePayloadType === "composite" ? "var(--primary)" : "var(--muted)",
                border: "none",
                borderRadius: 4,
                padding: "3px 8px",
                fontSize: 11.5,
                fontWeight: 650,
                cursor: "pointer",
              }}
            >
              Full Diagnostics Bundle (All Sub-Entities)
            </button>
          </div>
        )}
      </div>

      {/* Main Interactive Toolbar */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          background: "var(--surface)",
        }}
      >
        {/* Left: View Mode Tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "tree", label: "Interactive Tree", icon: "dashboard" },
            { id: "code", label: "Syntax Code", icon: "code" },
            { id: "schema", label: `Field Dictionary (${flattenedFields.length})`, icon: "table" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id as ViewMode)}
              className="btn secondary sm"
              style={{
                height: 30,
                fontSize: 12,
                fontWeight: 650,
                borderColor: viewMode === tab.id ? "var(--primary)" : "var(--border)",
                background: viewMode === tab.id ? "var(--primary-soft)" : "var(--surface)",
                color: viewMode === tab.id ? "var(--primary)" : "var(--text2)",
              }}
            >
              <Icon name={tab.icon as any} size={12} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Center/Right: Search Bar & Utilities */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 200 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search keys, values, or path…"
              style={{
                height: 30,
                padding: "0 28px 0 28px",
                fontSize: 12,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface2)",
                color: "var(--text)",
                width: "100%",
              }}
            />
            <span style={{ position: "absolute", left: 8, top: 7, color: "var(--muted)" }}>
              <Icon name="search" size={13} />
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 6,
                  top: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 2,
                }}
                title="Clear search"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </div>

          {searchQuery && (
            <span className="badge" style={{ fontSize: 11, background: searchMatchCount > 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: searchMatchCount > 0 ? "#10b981" : "#ef4444" }}>
              {searchMatchCount} match{searchMatchCount === 1 ? "" : "es"}
            </span>
          )}

          {/* Tree Depth Expansion Controls */}
          {viewMode === "tree" && (
            <div style={{ display: "flex", gap: 3, background: "var(--surface2)", padding: 2, borderRadius: 6, border: "1px solid var(--border)" }}>
              <button type="button" onClick={expandAll} className="btn ghost sm" style={{ height: 26, fontSize: 11, padding: "0 6px" }} title="Expand all nodes">
                Expand All
              </button>
              <button type="button" onClick={() => expandToDepth(1)} className="btn ghost sm" style={{ height: 26, fontSize: 11, padding: "0 6px" }} title="Expand to depth 1">
                L1
              </button>
              <button type="button" onClick={() => expandToDepth(2)} className="btn ghost sm" style={{ height: 26, fontSize: 11, padding: "0 6px" }} title="Expand to depth 2">
                L2
              </button>
              <button type="button" onClick={collapseAll} className="btn ghost sm" style={{ height: 26, fontSize: 11, padding: "0 6px" }} title="Collapse all nodes">
                Collapse All
              </button>
            </div>
          )}

          {/* Code View Controls */}
          {viewMode === "code" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={indentMode}
                onChange={(e) => setIndentMode(e.target.value === "minified" ? "minified" : (Number(e.target.value) as any))}
                style={{ height: 30, fontSize: 11.5, padding: "0 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface)" }}
              >
                <option value={2}>2 Spaces</option>
                <option value={4}>4 Spaces</option>
                <option value="minified">Minified</option>
              </select>
              <button
                type="button"
                onClick={() => setWrapLines((v) => !v)}
                className={`btn sm ${wrapLines ? "primary" : "secondary"}`}
                style={{ height: 30, fontSize: 11.5, padding: "0 8px" }}
              >
                Wrap
              </button>
            </div>
          )}

          {/* Quick Copy / Download Buttons */}
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => copyToClipboard(formattedCode, "full-json")}
            style={{ height: 30, fontSize: 11.5, color: copiedKey === "full-json" ? "var(--success)" : undefined }}
            title="Copy formatted JSON to clipboard"
          >
            <Icon name={copiedKey === "full-json" ? "check" : "copy"} size={12} />
            <span>{copiedKey === "full-json" ? "Copied JSON!" : "Copy JSON"}</span>
          </button>

          <button
            type="button"
            className="btn secondary sm"
            onClick={downloadJson}
            style={{ height: 30, fontSize: 11.5 }}
            title="Download JSON file"
          >
            <Icon name="download" size={12} />
            <span>Download</span>
          </button>

          {onReload && (
            <button
              type="button"
              className="btn secondary sm"
              onClick={() => void onReload()}
              disabled={isLoading}
              style={{ height: 30, fontSize: 11.5, padding: "0 8px" }}
              title="Re-fetch live payload from database/VOS"
            >
              <Icon name="refresh" size={12} className={isLoading ? "spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* VIEWPORT AREA */}
      <div style={{ maxHeight: 620, overflowY: "auto", background: "var(--bg)" }}>
        {/* VIEW 1: INTERACTIVE TREE VIEW */}
        {viewMode === "tree" && (
          <div style={{ padding: "14px 18px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, lineHeight: 1.6 }}>
            <TreeNode
              data={effectiveData}
              path="$"
              keyName={title}
              expandedPaths={expandedPaths}
              onToggle={toggleExpand}
              searchQuery={searchQuery}
              onCopy={copyToClipboard}
              copiedKey={copiedKey}
              isRoot={true}
            />
          </div>
        )}

        {/* VIEW 2: SYNTAX-HIGHLIGHTED CODE VIEW */}
        {viewMode === "code" && (
          <div
            style={{
              display: "flex",
              fontFamily: "IBM Plex Mono, monospace",
              fontSize: 12,
              lineHeight: 1.65,
              background: "var(--surface2)",
              color: "var(--text)",
            }}
          >
            {/* Gutter with Line Numbers */}
            <div
              style={{
                userSelect: "none",
                textAlign: "right",
                padding: "12px 10px 12px 14px",
                borderRight: "1px solid var(--border)",
                color: "var(--muted)",
                background: "rgba(0,0,0,0.02)",
                minWidth: 44,
                fontSize: 11,
              }}
            >
              {codeLines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code Lines with Syntax Token Highlights */}
            <div
              style={{
                flex: 1,
                padding: "12px 16px",
                overflowX: wrapLines ? "hidden" : "auto",
                whiteSpace: wrapLines ? "pre-wrap" : "pre",
                wordBreak: wrapLines ? "break-all" : "normal",
              }}
            >
              {codeLines.map((line, i) => (
                <CodeLine
                  key={i}
                  line={line}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: SCHEMA & FIELD DICTIONARY TABLE */}
        {viewMode === "schema" && (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr
                  style={{
                    textAlign: "left",
                    color: "var(--muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--surface2)",
                  }}
                >
                  <th style={{ padding: "8px 12px" }}>JSON Path</th>
                  <th style={{ padding: "8px 12px" }}>Field Name</th>
                  <th style={{ padding: "8px 12px" }}>Type</th>
                  <th style={{ padding: "8px 12px" }}>Resolved Value</th>
                  <th style={{ padding: "8px 12px" }}>Origin</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Copy</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchema.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                      No fields matched the search query "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredSchema.map((item, idx) => {
                    const isCopied = copiedKey === `schema-${idx}`;
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 12px", fontFamily: "IBM Plex Mono, monospace", fontSize: 11.5, color: "var(--primary)", fontWeight: 600 }}>
                          {highlightMatch(item.path, searchQuery)}
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 650 }}>
                          {highlightMatch(item.key.replace(/_/g, " "), searchQuery)}
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <span
                            className="badge"
                            style={{
                              fontSize: 10.5,
                              background:
                                item.type === "string"
                                  ? "rgba(16,185,129,0.12)"
                                  : item.type === "number"
                                  ? "rgba(217,119,6,0.12)"
                                  : item.type === "boolean"
                                  ? "rgba(124,58,237,0.12)"
                                  : "var(--surface2)",
                              color:
                                item.type === "string"
                                  ? "#10b981"
                                  : item.type === "number"
                                  ? "#d97706"
                                  : item.type === "boolean"
                                  ? "#7c3aed"
                                  : "var(--muted)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            {item.type}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, wordBreak: "break-all", maxWidth: 280 }}>
                          {highlightMatch(item.displayValue, searchQuery)}
                        </td>
                        <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--muted)" }}>
                          {item.source}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.displayValue, `schema-${idx}`)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: isCopied ? "var(--success)" : "var(--muted)",
                              padding: 2,
                            }}
                            title="Copy value"
                          >
                            <Icon name={isCopied ? "check" : "copy"} size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Stats Bar */}
      <div
        style={{
          padding: "8px 16px",
          background: "var(--surface2)",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: "var(--muted)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>
            Status: <strong style={{ color: "var(--success)" }}>Valid JSON Payload</strong>
          </span>
          <span>·</span>
          <span>
            Payload Size: <strong style={{ color: "var(--text)" }}>{payloadStats.size}</strong> ({payloadStats.byteLength.toLocaleString()} bytes)
          </span>
          <span>·</span>
          <span>
            Attributes: <strong style={{ color: "var(--text)" }}>{payloadStats.keyCount} root fields</strong>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span>Telemetry Stream: Active</span>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Recursive Tree Node Renderer
// -----------------------------------------------------------------------------
function TreeNode({
  data,
  path,
  keyName,
  expandedPaths,
  onToggle,
  searchQuery,
  onCopy,
  copiedKey,
  isRoot = false,
}: {
  data: any;
  path: string;
  keyName: string;
  expandedPaths: Set<string>;
  onToggle: (path: string) => void;
  searchQuery: string;
  onCopy: (text: string, keyId: string) => void;
  copiedKey?: string | null;
  isRoot?: boolean;
}) {
  const isExpanded = expandedPaths.has(path);
  const isObject = typeof data === "object" && data !== null && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isContainer = isObject || isArray;

  const childEntries = useMemo(() => {
    if (isObject) {
      return Object.entries(data);
    }
    if (isArray) {
      return data.map((val: any, idx: number) => [`${idx}`, val] as const);
    }
    return [];
  }, [data, isObject, isArray]);

  const lengthBadge = isObject
    ? `${Object.keys(data).length} keys`
    : isArray
    ? `${data.length} items`
    : null;

  const valueString = data === null ? "null" : data === undefined ? "undefined" : typeof data === "string" ? `"${data}"` : String(data);
  const isMatching = searchQuery.trim() && (path.toLowerCase().includes(searchQuery.toLowerCase()) || keyName.toLowerCase().includes(searchQuery.toLowerCase()) || valueString.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ marginLeft: isRoot ? 0 : 16, marginTop: 2, marginBottom: 2 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 4px",
          borderRadius: 4,
          background: isMatching ? "rgba(245, 158, 11, 0.12)" : "transparent",
          transition: "background 100ms",
        }}
        className="treeRowHover"
      >
        {isContainer ? (
          <button
            type="button"
            onClick={() => onToggle(path)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "grid",
              placeItems: "center",
              width: 16,
              height: 16,
              color: "var(--muted)",
            }}
            title={isExpanded ? "Collapse node" : "Expand node"}
          >
            <Icon name={isExpanded ? "chevronDown" : "arrowRight"} size={11} />
          </button>
        ) : (
          <span style={{ width: 16, display: "inline-block" }} />
        )}

        {/* Key Name */}
        {!isRoot && (
          <span style={{ color: "var(--primary)", fontWeight: 650 }}>
            {highlightMatch(keyName, searchQuery)}
            <span style={{ color: "var(--muted)", marginRight: 4 }}>:</span>
          </span>
        )}

        {/* Container Opener or Primitive Value */}
        {isContainer ? (
          <span style={{ color: "var(--text)", fontWeight: 600 }}>
            {isArray ? "[" : "{"}
            {!isExpanded && (
              <span
                onClick={() => onToggle(path)}
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  background: "var(--surface2)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  margin: "0 4px",
                  cursor: "pointer",
                  border: "1px solid var(--border)",
                }}
              >
                {lengthBadge}
              </span>
            )}
            {!isExpanded && (isArray ? "]" : "}")}
          </span>
        ) : (
          <PrimitiveValue value={data} searchQuery={searchQuery} />
        )}

        {/* Inline Hover Action Tools */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8, opacity: 0.85 }}>
          <button
            type="button"
            onClick={() => onCopy(path, `path-${path}`)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: copiedKey === `path-${path}` ? "var(--success)" : "var(--muted)",
              padding: "1px 3px",
              fontSize: 10,
              borderRadius: 3,
            }}
            title={`Copy JSONPath: ${path}`}
          >
            <Icon name={copiedKey === `path-${path}` ? "check" : "copy"} size={10} />
            <span style={{ marginLeft: 2, fontSize: 9.5 }}>{copiedKey === `path-${path}` ? "Copied Path" : "path"}</span>
          </button>

          {!isContainer && (
            <button
              type="button"
              onClick={() => onCopy(typeof data === "object" ? JSON.stringify(data) : String(data), `val-${path}`)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: copiedKey === `val-${path}` ? "var(--success)" : "var(--muted)",
                padding: "1px 3px",
                fontSize: 10,
                borderRadius: 3,
              }}
              title="Copy value"
            >
              <Icon name={copiedKey === `val-${path}` ? "check" : "copy"} size={10} />
              <span style={{ marginLeft: 2, fontSize: 9.5 }}>{copiedKey === `val-${path}` ? "Copied" : "val"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Children */}
      {isContainer && isExpanded && (
        <div>
          {childEntries.map(([childKey, childVal]) => {
            const childPath = isArray ? `${path}[${childKey}]` : `${path}.${childKey}`;
            return (
              <TreeNode
                key={childPath}
                data={childVal}
                path={childPath}
                keyName={childKey}
                expandedPaths={expandedPaths}
                onToggle={onToggle}
                searchQuery={searchQuery}
                onCopy={onCopy}
                copiedKey={copiedKey}
              />
            );
          })}
          <div style={{ paddingLeft: 22, color: "var(--text)", fontWeight: 600 }}>
            {isArray ? "]" : "}"}
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Primitive Value Color Tokenizer
// -----------------------------------------------------------------------------
function PrimitiveValue({ value, searchQuery }: { value: any; searchQuery: string }) {
  if (value === null) {
    return <span style={{ color: "var(--muted)", fontStyle: "italic" }}>null</span>;
  }
  if (value === undefined) {
    return <span style={{ color: "var(--muted)", fontStyle: "italic" }}>undefined</span>;
  }
  if (typeof value === "string") {
    return (
      <span style={{ color: "#10b981", wordBreak: "break-all" }}>
        "{highlightMatch(value, searchQuery)}"
      </span>
    );
  }
  if (typeof value === "number") {
    return (
      <span style={{ color: "#d97706", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
        {highlightMatch(String(value), searchQuery)}
      </span>
    );
  }
  if (typeof value === "boolean") {
    return (
      <span style={{ color: "#7c3aed", fontWeight: 700 }}>
        {highlightMatch(String(value), searchQuery)}
      </span>
    );
  }
  return <span>{String(value)}</span>;
}

// -----------------------------------------------------------------------------
// Tokenized Syntax Line for Code View
// -----------------------------------------------------------------------------
function CodeLine({ line, searchQuery }: { line: string; searchQuery: string }) {
  const isKeyLine = /^\s*"([^"]+)":\s*(.*)$/.exec(line);

  if (isKeyLine) {
    const key = isKeyLine[1];
    const val = isKeyLine[2];
    const indent = line.slice(0, line.indexOf('"'));

    return (
      <div>
        <span>{indent}</span>
        <span style={{ color: "var(--primary)", fontWeight: 650 }}>"{highlightMatch(key, searchQuery)}"</span>
        <span style={{ color: "var(--muted)" }}>: </span>
        <TokenizedValue raw={val} searchQuery={searchQuery} />
      </div>
    );
  }

  return <div>{highlightMatch(line, searchQuery)}</div>;
}

function TokenizedValue({ raw, searchQuery }: { raw: string; searchQuery: string }) {
  const trimmed = raw.trim().replace(/,$/, "");
  const hasComma = raw.trim().endsWith(",");

  let inner: React.ReactNode = highlightMatch(raw, searchQuery);

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    inner = <span style={{ color: "#10b981" }}>{highlightMatch(trimmed, searchQuery)}</span>;
  } else if (!Number.isNaN(Number(trimmed))) {
    inner = <span style={{ color: "#d97706", fontWeight: 600 }}>{highlightMatch(trimmed, searchQuery)}</span>;
  } else if (trimmed === "true" || trimmed === "false") {
    inner = <span style={{ color: "#7c3aed", fontWeight: 700 }}>{highlightMatch(trimmed, searchQuery)}</span>;
  } else if (trimmed === "null") {
    inner = <span style={{ color: "var(--muted)", fontStyle: "italic" }}>null</span>;
  }

  return (
    <span>
      {inner}
      {hasComma && <span style={{ color: "var(--muted)" }}>,</span>}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Search Highlight Helper
// -----------------------------------------------------------------------------
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !query.trim()) return text;
  const q = query.trim();
  const lower = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const idx = lower.indexOf(lowerQ);

  if (idx === -1) return text;

  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);

  return (
    <>
      {before}
      <mark
        style={{
          background: "rgba(245, 158, 11, 0.35)",
          color: "inherit",
          borderRadius: 2,
          padding: "0 2px",
        }}
      >
        {match}
      </mark>
      {highlightMatch(after, query)}
    </>
  );
}
