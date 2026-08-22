"use client";
import React from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { Sparkline } from "../Chart";

export interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  subtext?: string;
  icon?: string;
  color?: "blue" | "cyan" | "green" | "amber" | "purple" | "red";
  sparkline?: number[];
  linkHref?: string;
  linkLabel?: string;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  trend,
  trendDirection = "up",
  subtext,
  icon = "pulse",
  color = "blue",
  sparkline,
  linkHref,
  linkLabel = "View Details",
  onClick,
}: KpiCardProps) {
  const iconColor =
    color === "green"
      ? "#16a34a"
      : color === "cyan"
      ? "#0891b2"
      : color === "amber"
      ? "#d97706"
      : color === "purple"
      ? "#7c3aed"
      : color === "red"
      ? "#dc2626"
      : "#2563eb";

  return (
    <div className="kpiCardModern">
      <div>
        <div className="kpiCardHead">
          <span className="kpiLabel">{label}</span>
          <div className={`kpiIconPill ${color}`}>
            <Icon name={icon} size={18} />
          </div>
        </div>

        <div className="kpiValue">{value}</div>

        {trend && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span className={`trendBadge ${trendDirection}`}>
              <Icon
                name={trendDirection === "up" ? "arrowUp" : trendDirection === "down" ? "arrowDown" : "minus"}
                size={11}
              />
              {trend}
            </span>
            {subtext && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{subtext}</span>}
          </div>
        )}
      </div>

      <div className="kpiFoot">
        {sparkline && sparkline.length > 1 ? (
          <Sparkline values={sparkline} color={iconColor} width={70} height={20} />
        ) : (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Live Telemetry</span>
        )}

        {linkHref ? (
          <Link href={linkHref} className="kpiLink">
            <span>{linkLabel}</span>
            <Icon name="arrowRight" size={11} />
          </Link>
        ) : onClick ? (
          <button type="button" onClick={onClick} className="kpiLink" style={{ background: "none", border: "none", cursor: "pointer" }}>
            <span>{linkLabel}</span>
            <Icon name="arrowRight" size={11} />
          </button>
        ) : (
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Real-time</span>
        )}
      </div>
    </div>
  );
}

export function KpiGrid({
  children,
  kpis,
  style,
}: {
  children?: React.ReactNode;
  kpis?: any[];
  style?: React.CSSProperties;
}) {
  if (kpis && Array.isArray(kpis)) {
    return (
      <div className="kpiGridModern" style={style}>
        {kpis.map((k, i) => (
          <KpiCard
            key={i}
            label={k.label || k.title || "Metric"}
            value={k.value ?? "—"}
            subtext={k.sub || k.change || k.subtext}
            icon={k.icon || "pulse"}
            color={k.color || (k.status === "warning" ? "amber" : k.status === "danger" ? "red" : "blue")}
          />
        ))}
      </div>
    );
  }
  return <div className="kpiGridModern" style={style}>{children}</div>;
}
