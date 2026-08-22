"use client";
import React, { useState, useMemo } from "react";

// ============================================================================
// 1. Multi-Series & Single Series Trend Chart
// ============================================================================
export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
  unit?: string;
  yAxis?: "left" | "right";
}

export function MultiSeriesChart({
  series,
  height = 230,
  title = "Traffic Overview",
  intervals = ["1H", "6H", "24H", "7D", "30D"],
  selectedInterval = "24H",
  onIntervalChange,
  timestamps,
  xAxisLabels,
}: {
  series: ChartSeries[];
  height?: number;
  title?: string;
  intervals?: string[];
  selectedInterval?: string;
  onIntervalChange?: (interval: string) => void;
  timestamps?: string[];
  xAxisLabels?: string[];
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const w = 800;
  const h = height;
  const paddingY = 24;
  const paddingX = 16;

  const leftSeries = series.filter((s) => s.yAxis !== "right");
  const rightSeries = series.filter((s) => s.yAxis === "right");

  const leftStats = useMemo(() => {
    const allVals = leftSeries.flatMap((s) => s.values);
    if (!allVals.length) return { min: 0, max: 100, range: 100 };
    let min = Math.min(...allVals);
    let max = Math.max(...allVals);
    if (min === max) {
      min = Math.max(0, min - 10);
      max = max + 10;
    }
    return { min, max, range: max - min || 1 };
  }, [leftSeries]);

  const rightStats = useMemo(() => {
    const allVals = rightSeries.flatMap((s) => s.values);
    if (!allVals.length) return { min: 0, max: 100, range: 100 };
    let min = Math.min(...allVals);
    let max = Math.max(...allVals);
    if (min === max) {
      min = Math.max(0, min - 10);
      max = max + 10;
    }
    return { min, max, range: max - min || 1 };
  }, [rightSeries]);

  const maxPoints = Math.max(...series.map((s) => s.values.length), 1);

  const seriesPaths = useMemo(() => {
    return series.map((s, sIdx) => {
      const stats = s.yAxis === "right" ? rightStats : leftStats;
      const pts = s.values.map((val, i) => {
        const x = maxPoints > 1 ? paddingX + (i / (maxPoints - 1)) * (w - paddingX * 2) : w / 2;
        const normalized = (val - stats.min) / stats.range;
        const y = h - paddingY - normalized * (h - paddingY * 2);
        return { x, y, val, i };
      });

      const lineD = pts.reduce((acc, pt, i) => {
        if (i === 0) return `M ${pt.x},${pt.y}`;
        const prev = pts[i - 1];
        const cx = (prev.x + pt.x) / 2;
        return `${acc} C ${cx},${prev.y} ${cx},${pt.y} ${pt.x},${pt.y}`;
      }, "");

      const areaD = pts.length
        ? `${lineD} L ${pts[pts.length - 1].x},${h - 8} L ${pts[0].x},${h - 8} Z`
        : "";

      return { ...s, pts, lineD, areaD, sIdx };
    });
  }, [series, leftStats, rightStats, maxPoints, w, h]);

  const computedXAxisLabels = useMemo(() => {
    if (xAxisLabels && xAxisLabels.length > 0) return xAxisLabels;
    if (timestamps && timestamps.length > 0) {
      const count = timestamps.length;
      if (count <= 5) {
        return timestamps.map((t) => formatChartTime(t));
      }
      const indices = [
        0,
        Math.floor(count * 0.25),
        Math.floor(count * 0.5),
        Math.floor(count * 0.75),
        count - 1,
      ];
      return indices.map((idx) => formatChartTime(timestamps[idx]));
    }
    return [];
  }, [xAxisLabels, timestamps]);

  function formatChartTime(iso: string) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso.slice(11, 16);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return iso.slice(11, 16);
    }
  }

  function formatTooltipTime(iso: string) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    } catch {
      return iso;
    }
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (maxPoints <= 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * w;
    const normX = Math.max(0, Math.min(1, (mouseX - paddingX) / (w - paddingX * 2)));
    const closest = Math.round(normX * (maxPoints - 1));
    setHoverIndex(closest);
  }

  const allZero = useMemo(() => {
    return series.every((s) => s.values.every((v) => v === 0));
  }, [series]);

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="cardHead" style={{ flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
            {title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
            {series.map((s) => (
              <span key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text2)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>

        {intervals.length > 0 && (
          <div className="presetChips">
            {intervals.map((intv) => (
              <button
                key={intv}
                type="button"
                className={`presetChip ${selectedInterval === intv ? "active" : ""}`}
                onClick={() => onIntervalChange?.(intv)}
              >
                {intv}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", height, padding: "4px 0" }}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{ width: "100%", height: "100%", overflow: "visible" }}
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {series.map((s, idx) => (
              <linearGradient key={idx} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                <stop offset="80%" stopColor={s.color} stopOpacity="0.02" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {[0.15, 0.45, 0.75].map((ratio, idx) => (
            <line
              key={idx}
              x1={paddingX}
              y1={h * ratio}
              x2={w - paddingX}
              y2={h * ratio}
              stroke="var(--border)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          ))}

          {seriesPaths.map((s, idx) => (
            <path key={`fill-${idx}`} d={s.areaD} fill={`url(#grad-${idx})`} />
          ))}

          {seriesPaths.map((s, idx) => (
            <path
              key={`line-${idx}`}
              d={s.lineD}
              fill="none"
              stroke={s.color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {hoverIndex !== null && (
            <g>
              <line
                x1={paddingX + (hoverIndex / (maxPoints - 1)) * (w - paddingX * 2)}
                y1={paddingY}
                x2={paddingX + (hoverIndex / (maxPoints - 1)) * (w - paddingX * 2)}
                y2={h - 8}
                stroke="var(--border-strong)"
                strokeDasharray="2 2"
                strokeWidth="1.2"
              />
              {seriesPaths.map((s, idx) => {
                const pt = s.pts[hoverIndex];
                if (!pt) return null;
                return (
                  <g key={`pt-${idx}`}>
                    <circle cx={pt.x} cy={pt.y} r="6" fill={s.color} fillOpacity="0.2" />
                    <circle cx={pt.x} cy={pt.y} r="3.5" fill={s.color} stroke="#ffffff" strokeWidth="1.5" />
                  </g>
                );
              })}
            </g>
          )}
        </svg>

        {allZero && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              pointerEvents: "none",
              color: "var(--muted)",
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            <span>No telephony call activity recorded in this time window</span>
          </div>
        )}

        {hoverIndex !== null && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: `${Math.min(85, Math.max(15, (hoverIndex / (maxPoints - 1)) * 100))}%`,
              transform: "translateX(-50%)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "6px 12px",
              boxShadow: "var(--shadow-md)",
              pointerEvents: "none",
              fontSize: 11.5,
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {timestamps && timestamps[hoverIndex] && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)", borderBottom: "1px solid var(--border)", paddingBottom: 2 }}>
                {formatTooltipTime(timestamps[hoverIndex])}
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              {series.map((s) => {
                const val = s.values[hoverIndex];
                return (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                    <span style={{ color: "var(--muted)" }}>{s.name}:</span>
                    <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                      {typeof val === "number" ? (val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString()) : "—"} {s.unit ?? ""}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {computedXAxisLabels.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", padding: "4px 4px 0" }}>
          {computedXAxisLabels.map((lbl, i) => (
            <span key={i}>{lbl}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function MiniChart({
  values,
  height = 180,
  label = "Metric trend",
  unit = "",
}: {
  values: number[];
  height?: number;
  label?: string;
  unit?: string;
}) {
  const series: ChartSeries[] = [{ name: label, color: "#2563eb", values, unit }];
  return <MultiSeriesChart series={series} height={height} title={label} intervals={[]} />;
}

// ============================================================================
// 2. Alarms / Severity Donut Chart
// ============================================================================
export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  title = "Alarms by Severity",
  segments,
  size = 170,
}: {
  title?: string;
  segments: DonutSegment[];
  size?: number;
}) {
  const total = useMemo(() => segments.reduce((sum, s) => sum + s.value, 0), [segments]);
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeAngle = 0;
  const slices = useMemo(() => {
    return segments.map((seg) => {
      const percentage = total > 0 ? seg.value / total : 0;
      const strokeDasharray = `${percentage * circumference} ${circumference}`;
      const strokeDashoffset = -cumulativeAngle * circumference;
      cumulativeAngle += percentage;
      return { ...seg, strokeDasharray, strokeDashoffset, percentage };
    });
  }, [segments, total, circumference]);

  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="cardHead">
        <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
          {title}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "12px 0", flexWrap: "wrap", gap: 16 }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--surface2)"
              strokeWidth={strokeWidth}
            />
            {slices.map((slice, idx) => (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="butt"
                style={{ transition: "stroke-dashoffset 300ms ease, stroke-dasharray 300ms ease" }}
              />
            ))}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
              {total.toLocaleString()}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
              Total
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
          {segments.map((seg) => (
            <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontSize: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color }} />
                <span style={{ color: "var(--text2)" }}>{seg.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <strong style={{ color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                  {seg.value}
                </strong>
                <span style={{ color: "var(--muted)", fontSize: 11, width: 34, textAlign: "right" }}>
                  {total > 0 ? `${((seg.value / total) * 100).toFixed(0)}%` : "0%"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. Radial / Circular Channel Utilization Gauge
// ============================================================================
export function RadialGauge({
  value,
  max,
  label = "Channel Usage",
  size = 140,
}: {
  value: number;
  max: number;
  label?: string;
  size?: number;
}) {
  const percentage = Math.min(100, Math.max(0, max > 0 ? (value / max) * 100 : 0));
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color = percentage > 85 ? "#dc2626" : percentage > 70 ? "#d97706" : "#06b6d4";

  return (
    <div className="radialGaugeWrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
          {percentage.toFixed(0)}%
        </span>
        <span style={{ fontSize: 9.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
          {value.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// 4. Compact Inline Sparkline
// ============================================================================
export function Sparkline({
  values,
  width = 80,
  height = 24,
  color = "#2563eb",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pts = values.map((val, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 2 - ((val - min) / range) * (height - 4);
    return `${x},${y}`;
  });

  const pathD = `M ${pts.join(" L ")}`;

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================================
// 5. Quality / PDD / Latency Meter
// ============================================================================
export function QualityMeter({
  value,
  max = 100,
  unit = "ms",
  type = "latency",
}: {
  value: number;
  max?: number;
  unit?: string;
  type?: "latency" | "mos" | "packet_loss";
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  let fillClass = "good";

  if (type === "latency" || type === "packet_loss") {
    fillClass = percentage > 60 ? "bad" : percentage > 30 ? "warn" : "good";
  } else if (type === "mos") {
    fillClass = value >= 4.0 ? "good" : value >= 3.5 ? "warn" : "bad";
  }

  return (
    <div className="pddMeter">
      <div className="pddBarWrap">
        <div className={`pddBarFill ${fillClass}`} style={{ width: `${percentage}%` }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--text2)" }}>
        {value} {unit}
      </span>
    </div>
  );
}

