"use client";
import React from "react";
import { Icon } from "../../lib/icons";

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  actor?: string;
  details?: string;
  status?: "online" | "warning" | "danger" | "info";
  icon?: string;
}

export function ActivityTimeline({
  events,
  title = "Activity & Audit Timeline",
  onViewAll,
}: {
  events: TimelineEvent[];
  title?: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div className="cardHead">
        <div className="cardTitle" style={{ fontSize: 15, fontWeight: 700 }}>
          {title}
        </div>
        {onViewAll && (
          <button type="button" onClick={onViewAll} className="kpiLink" style={{ background: "none", border: "none", cursor: "pointer" }}>
            <span>View All</span>
            <Icon name="arrowRight" size={11} />
          </button>
        )}
      </div>

      <div className="timelineModern">
        {events.map((evt) => {
          const statusClass = evt.status ?? "info";
          const iconName =
            evt.icon ??
            (statusClass === "online"
              ? "check"
              : statusClass === "warning"
              ? "alert"
              : statusClass === "danger"
              ? "close"
              : "pulse");

          return (
            <div key={evt.id} className="timelineRow">
              <div className={`timelineIcon ${statusClass}`}>
                <Icon name={iconName} size={13} />
              </div>

              <div className="timelineCard">
                <div className="timelineCardHead">
                  <span className="timelineTitle">{evt.title}</span>
                  <span className="timelineTime">{evt.time}</span>
                </div>
                {evt.details && <div className="timelineDetails">{evt.details}</div>}
                {evt.actor && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                    Actor: <strong style={{ color: "var(--text2)" }}>{evt.actor}</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
