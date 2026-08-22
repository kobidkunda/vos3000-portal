"use client";
import React from "react";
import { Icon } from "../../lib/icons";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm Action",
  cancelLabel = "Cancel",
  isDanger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modalBackdrop" onClick={onCancel}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="modalHead">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: isDanger ? "var(--danger-bg)" : "var(--primary-soft)",
                color: isDanger ? "var(--danger)" : "var(--primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icon name={isDanger ? "alert" : "shield"} size={16} />
            </div>
            <div className="modalTitle">{title}</div>
          </div>
          <button
            type="button"
            className="iconBtn"
            onClick={onCancel}
            aria-label="Close dialog"
            style={{ width: 28, height: 28 }}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <div className="modalBody">
          <p style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.6 }}>{message}</p>
        </div>

        <div className="modalFoot">
          <button type="button" className="btn secondary sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn sm ${isDanger ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
