"use client";
import React, { useState } from "react";
import { Icon } from "../../lib/icons";

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
  datePresets?: string[];
  selectedPreset?: string;
  onPresetChange?: (preset: string) => void;
  timezones?: string[];
  selectedTimezone?: string;
  onTimezoneChange?: (tz: string) => void;
  statusOptions?: string[];
  selectedStatus?: string;
  onStatusChange?: (status: string) => void;
  gatewayOptions?: string[];
  selectedGateway?: string;
  onGatewayChange?: (gw: string) => void;
  extraToggles?: { label: string; checked: boolean; onChange: (checked: boolean) => void }[];
  onReset?: () => void;
  onExportClick?: () => void;
  totalCount?: number;
}

export function FilterBar({
  searchPlaceholder = "Search records…",
  searchTerm = "",
  onSearchChange,
  datePresets = ["Today", "24h", "7d", "30d", "Custom"],
  selectedPreset = "24h",
  onPresetChange,
  timezones = ["(UTC+00:00) UTC", "(UTC+05:30) Asia/Kolkata", "(UTC-05:00) America/New_York", "(UTC+01:00) Europe/London", "(UTC+04:00) Asia/Dubai", "(UTC+08:00) Asia/Singapore"],
  selectedTimezone = "(UTC+05:30) Asia/Kolkata",
  onTimezoneChange,
  statusOptions = ["All Statuses", "Online", "Active", "Degraded", "Offline", "Answered", "Failed"],
  selectedStatus = "All Statuses",
  onStatusChange,
  gatewayOptions,
  selectedGateway,
  onGatewayChange,
  extraToggles,
  onReset,
  onExportClick,
  totalCount,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div className="filterBarModern">
      <div className="filterGroup mainFilters">
        {/* Search Box */}
        {onSearchChange && (
          <div className="filterInputWrap">
            <Icon name="search" size={14} />
            <input
              type="text"
              className="filterInput"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                style={{
                  position: "absolute",
                  right: 8,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
                aria-label="Clear search"
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </div>
        )}

        {/* Date Presets */}
        {datePresets.length > 0 && onPresetChange && (
          <div className="presetChips">
            {datePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`presetChip ${selectedPreset === preset ? "active" : ""}`}
                onClick={() => onPresetChange(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        )}

        {/* Status Dropdown */}
        {statusOptions.length > 0 && onStatusChange && (
          <select
            className="filterSelect"
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            aria-label="Filter by status"
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {/* Gateway Dropdown */}
        {gatewayOptions && gatewayOptions.length > 0 && onGatewayChange && (
          <select
            className="filterSelect"
            value={selectedGateway ?? "All Gateways"}
            onChange={(e) => onGatewayChange(e.target.value)}
            aria-label="Filter by gateway"
          >
            <option value="All Gateways">All Gateways</option>
            {gatewayOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )}

        {/* Timezone selector */}
        {timezones.length > 0 && onTimezoneChange && (
          <select
            className="filterSelect"
            value={selectedTimezone}
            onChange={(e) => onTimezoneChange(e.target.value)}
            aria-label="Timezone selection"
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        )}

        {/* Extra Toggles */}
        {extraToggles &&
          extraToggles.map((t) => (
            <label key={t.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, cursor: "pointer", color: "var(--text2)" }}>
              <input
                type="checkbox"
                checked={t.checked}
                onChange={(e) => t.onChange(e.target.checked)}
                style={{ accentColor: "var(--primary)", cursor: "pointer" }}
              />
              <span>{t.label}</span>
            </label>
          ))}
      </div>

      <div className="filterGroup actionFilters">
        {totalCount !== undefined && (
          <span style={{ fontSize: 12, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
            Total: <strong>{totalCount.toLocaleString()}</strong> records
          </span>
        )}

        {onReset && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={onReset}
            style={{ height: 34, fontSize: 12.5 }}
          >
            <Icon name="refresh" size={13} />
            <span>Reset</span>
          </button>
        )}

        {onExportClick && (
          <button
            type="button"
            className="btn secondary sm"
            onClick={onExportClick}
            style={{ height: 34, fontSize: 12.5 }}
          >
            <Icon name="download" size={13} />
            <span>Export</span>
          </button>
        )}
      </div>
    </div>
  );
}
