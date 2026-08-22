import React from "react";

export function Status({ value, size = "md" }: { value: unknown; size?: "sm" | "md" | "lg" }) {
  if (value === null || value === undefined || value === "") {
    return <span className="statusDash">—</span>;
  }

  const str = String(value);
  const norm = str.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const isLive = [
    "online",
    "active",
    "answered",
    "healthy",
    "live",
    "in-progress",
    "running",
    "ready",
    "success",
  ].includes(norm);

  const isDegraded = [
    "degraded",
    "warning",
    "pending",
    "registering",
    "queued",
    "reconnecting",
    "low-balance",
  ].includes(norm);

  const isDanger = [
    "offline",
    "failed",
    "critical",
    "suspended",
    "locked",
    "error",
    "rejected",
    "expired",
  ].includes(norm);

  const badgeType = isLive
    ? "online"
    : isDegraded
    ? "degraded"
    : isDanger
    ? "failed"
    : "neutral";

  return (
    <span
      className={`badge badge-${badgeType} badge-${size} ${norm}`}
      role="status"
      aria-label={`Status: ${str}`}
    >
      <span className={`statusDot ${isLive ? "pulse" : ""}`} aria-hidden="true" />
      <span className="badgeText">{str}</span>
    </span>
  );
}
