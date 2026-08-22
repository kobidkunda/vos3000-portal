"use client";
import React, { useState, useMemo } from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { parseTelecomPhone, ParsedTelecomPhone } from "@vos/shared";
import { Icon } from "../../lib/icons";

export interface CountryFlagProps {
  countryCode?: string;
  countryName?: string;
  callingCode?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export function CountryFlag({
  countryCode,
  countryName,
  callingCode,
  size = "md",
  showTooltip = true,
  className = "",
}: CountryFlagProps) {
  const [isHovered, setIsHovered] = useState(false);

  const FlagComponent = useMemo(() => {
    if (!countryCode) return null;
    const upper = countryCode.toUpperCase() as keyof typeof Flags;
    return Flags[upper] || null;
  }, [countryCode]);

  const dimensions = useMemo(() => {
    switch (size) {
      case "sm":
        return { width: 15, height: 10 };
      case "lg":
        return { width: 24, height: 16 };
      case "md":
      default:
        return { width: 18, height: 12 };
    }
  }, [size]);

  return (
    <span
      className={`phoneFlagContainer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
    >
      <span
        className="phoneFlagIconWrap"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 2,
          overflow: "hidden",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}
      >
        {FlagComponent ? (
          <FlagComponent style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span
            style={{
              width: "100%",
              height: "100%",
              background: "var(--surface2)",
              color: "var(--muted)",
              display: "grid",
              placeItems: "center",
              fontSize: 9,
            }}
            title="Local / Extension"
          >
            <Icon name="phone" size={9} />
          </span>
        )}
      </span>

      {/* Floating Hover Clip / Tooltip */}
      {showTooltip && isHovered && (countryName || countryCode) && (
        <span className="phoneHoverClip" role="tooltip" aria-hidden={!isHovered}>
          <span className="phoneHoverClipArrow" />
          <span className="phoneHoverClipContent">
            {FlagComponent && (
              <span className="phoneHoverClipFlag">
                <FlagComponent style={{ width: 16, height: 11, borderRadius: 1.5 }} />
              </span>
            )}
            <span className="phoneHoverClipName">{countryName || countryCode}</span>
            {countryCode && <span className="phoneHoverClipIso">{countryCode}</span>}
            {callingCode && <span className="phoneHoverClipCode">+{callingCode}</span>}
          </span>
        </span>
      )}
    </span>
  );
}

export interface PhonePillProps {
  value?: string | number | null;
  fullValue?: string | number | null;
  showCopy?: boolean;
  shorten?: boolean;
  fontSize?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function PhonePill({
  value,
  fullValue,
  showCopy = true,
  shorten = false,
  fontSize,
  className = "",
  style,
}: PhonePillProps) {
  const [copied, setCopied] = useState(false);
  const rawStr = value !== null && value !== undefined ? String(value).trim() : "";
  const targetVal = fullValue !== null && fullValue !== undefined ? String(fullValue).trim() : rawStr;

  const parsed: ParsedTelecomPhone = useMemo(() => {
    return parseTelecomPhone(rawStr);
  }, [rawStr]);

  const displayVal = useMemo(() => {
    if (!rawStr) return "—";
    if (shorten && rawStr.length > 16) {
      return `${rawStr.slice(0, 6)}…${rawStr.slice(-4)}`;
    }
    return rawStr;
  }, [rawStr, shorten]);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard && targetVal) {
      void navigator.clipboard.writeText(targetVal);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }

  if (!rawStr || rawStr === "—") {
    return <span style={{ color: "var(--muted)" }}>—</span>;
  }

  return (
    <span
      className={`phonePill ${className}`}
      style={{
        fontSize: fontSize ?? undefined,
        ...style,
      }}
      title={`Click to copy: ${targetVal}`}
      onClick={handleCopy}
    >
      {/* Country Flag with Hover Clip */}
      <CountryFlag
        countryCode={parsed.country}
        countryName={parsed.countryName}
        callingCode={parsed.countryCallingCode}
        size="md"
      />

      {/* Phone Number Display */}
      <span className="phonePillText mono">{displayVal}</span>

      {/* Copy Action Button */}
      {showCopy && (
        <button
          type="button"
          className={`phonePillBtn ${copied ? "copied" : ""}`}
          aria-label="Copy phone number"
          onClick={handleCopy}
        >
          <Icon name={copied ? "check" : "copy"} size={11} />
        </button>
      )}
    </span>
  );
}

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  style?: React.CSSProperties;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "e.g. +1 415 555 2671 or 919876543210",
  id,
  name,
  className = "",
  disabled = false,
  required = false,
  style,
}: PhoneInputProps) {
  const parsed = useMemo(() => parseTelecomPhone(value), [value]);

  return (
    <div className={`phoneInputWrap ${className}`} style={style}>
      <div className="phoneInputFlagAddon">
        <CountryFlag
          countryCode={parsed.country}
          countryName={parsed.countryName}
          callingCode={parsed.countryCallingCode}
          size="md"
        />
      </div>
      <input
        type="tel"
        id={id}
        name={name}
        className="phoneInputField input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
      />
    </div>
  );
}
