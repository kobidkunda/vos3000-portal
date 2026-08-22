"use client";
import React, { useEffect, useRef } from "react";
import { Icon } from "../../lib/icons";

export interface FormErrorPayload {
  message?: string;
  error?: string | { message?: string; [key: string]: any };
  detail?: string | string[] | Record<string, any>;
  errors?: Record<string, string> | string[] | Array<{ field?: string; message?: string }>;
  [key: string]: any;
}

export type FormErrorInput = string | Error | FormErrorPayload | unknown | null | undefined;

export interface FormErrorHeaderProps {
  error?: FormErrorInput;
  fieldErrors?: Record<string, string> | null;
  title?: string;
  onDismiss?: () => void;
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  autoScroll?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function extractErrorMessage(err: FormErrorInput): {
  primary: string | null;
  details: string[];
} {
  if (!err) {
    return { primary: null, details: [] };
  }

  if (typeof err === "string") {
    const trimmed = err.trim();
    return { primary: trimmed || null, details: [] };
  }

  if (err instanceof Error) {
    return { primary: err.message || "An unexpected error occurred", details: [] };
  }

  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, any>;
    let primary: string | null = null;
    const details: string[] = [];

    // Extract primary message
    if (typeof obj.message === "string" && obj.message.trim()) {
      primary = obj.message.trim();
    } else if (typeof obj.error === "string" && obj.error.trim()) {
      primary = obj.error.trim();
    } else if (typeof obj.error === "object" && obj.error !== null) {
      if (typeof obj.error.message === "string") {
        primary = obj.error.message;
      }
    } else if (typeof obj.detail === "string" && obj.detail.trim()) {
      primary = obj.detail.trim();
    }

    // Extract details/sub-errors
    if (Array.isArray(obj.detail)) {
      for (const d of obj.detail) {
        if (typeof d === "string") details.push(d);
        else if (d && typeof d === "object" && d.message) details.push(String(d.message));
      }
    }

    if (Array.isArray(obj.errors)) {
      for (const e of obj.errors) {
        if (typeof e === "string") details.push(e);
        else if (e && typeof e === "object") {
          const msg = e.message || (e.field ? `${e.field}: invalid value` : JSON.stringify(e));
          details.push(String(msg));
        }
      }
    } else if (obj.errors && typeof obj.errors === "object") {
      for (const [k, v] of Object.entries(obj.errors)) {
        if (typeof v === "string" && v.trim()) {
          details.push(`${k}: ${v}`);
        }
      }
    }

    if (!primary && details.length > 0) {
      primary = details[0];
    } else if (!primary) {
      primary = "Request failed. Please verify your input and try again.";
    }

    return { primary, details };
  }

  return { primary: String(err), details: [] };
}

export function FormErrorHeader({
  error,
  fieldErrors,
  title,
  onDismiss,
  autoScroll = true,
  className = "",
  style = {},
}: FormErrorHeaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { primary, details } = extractErrorMessage(error);

  const fieldErrorList: string[] = [];
  if (fieldErrors) {
    for (const [field, msg] of Object.entries(fieldErrors)) {
      if (msg && typeof msg === "string") {
        const formattedField = field
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (s) => s.toUpperCase())
          .trim();
        fieldErrorList.push(`${formattedField}: ${msg}`);
      }
    }
  }

  const allDetails = Array.from(new Set([...details, ...fieldErrorList]));
  const hasContent = Boolean(primary || allDetails.length > 0);

  useEffect(() => {
    if (hasContent && autoScroll && containerRef.current) {
      try {
        containerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
        containerRef.current.focus({ preventScroll: true });
      } catch {}
    }
  }, [hasContent, primary, autoScroll]);

  if (!hasContent) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      role="alert"
      aria-live="assertive"
      tabIndex={-1}
      className={`formErrorHeader ${className}`.trim()}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "12px 16px",
        marginBottom: 16,
        borderRadius: "var(--radius, 6px)",
        background: "var(--danger-bg, rgba(239, 68, 68, 0.08))",
        border: "1px solid var(--danger-border, rgba(239, 68, 68, 0.28))",
        color: "var(--danger, #ef4444)",
        fontSize: 13,
        lineHeight: 1.45,
        outline: "none",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1 }}>
          <div style={{ marginTop: 1, flexShrink: 0 }}>
            <Icon name="alert" size={16} />
          </div>
          <div style={{ flex: 1 }}>
            {title ? (
              <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 2 }}>{title}</div>
            ) : null}
            <div style={{ fontWeight: title ? 500 : 600 }}>
              {primary || "Please correct the errors below and try again."}
            </div>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 2,
              color: "inherit",
              opacity: 0.7,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>

      {allDetails.length > 0 && (
        <ul
          style={{
            margin: "4px 0 0 26px",
            padding: 0,
            fontSize: 12,
            opacity: 0.95,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {allDetails.map((item, idx) => (
            <li key={idx} style={{ listStyleType: "disc" }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const FormErrorAlert = FormErrorHeader;
export default FormErrorHeader;
