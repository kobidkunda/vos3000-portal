"use client";

import React, { useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
import { Icon } from "../../lib/icons";
import { parseFormError, type ParsedFormError, resolveFieldLabel } from "../../lib/form-error";
import { getScrollParent } from "../../lib/use-form-error";

export interface FormErrorAlertProps {
  /**
   * The parsed form error object or raw unknown error (Error, Response, string, object).
   * If not already parsed, FormErrorAlert will parse it internally using parseFormError.
   */
  error?: ParsedFormError | unknown;

  /**
   * Custom headline title for the banner.
   * If omitted, a contextual default title is derived:
   * - "Validation Error" (if field errors exist)
   * - "System Error" (if status >= 500)
   * - "Network Request Failed" (if network disconnect)
   * - "Authorization Required" (if 401/403)
   * - "Submission Failed" (generic fallback)
   */
  title?: string;

  /**
   * Callback invoked when the user dismisses the error alert.
   * If provided, an accessible close button is rendered in the top right.
   */
  onDismiss?: () => void;

  /**
   * Callback invoked when the user clicks the retry button.
   * Can be synchronous or asynchronous.
   */
  onRetry?: () => void | Promise<void>;

  /**
   * Whether a retry action is actively processing.
   * Disables the retry button and renders a rotating spinner.
   */
  isRetrying?: boolean;

  /**
   * DOM id for the alert element (default: "form-error-alert").
   */
  id?: string;

  /**
   * Additional CSS class name(s) for the container.
   */
  className?: string;

  /**
   * Inline CSS style overrides.
   */
  style?: React.CSSProperties;

  /**
   * Whether to automatically scroll the alert into view when an error is set or updated (default: true).
   */
  autoScroll?: boolean;

  /**
   * Whether to automatically focus the alert container on error (default: true).
   */
  autoFocus?: boolean;

  /**
   * Whether to render itemized field errors as clickable jump links (default: true).
   */
  showFieldLinks?: boolean;

  /**
   * Prefix used to resolve input element IDs for field links (e.g. "field-", "auth-", "funds-", "").
   */
  fieldIdPrefix?: string;

  /**
   * Explicit mapping of field names to input element DOM IDs.
   * e.g. { email: "auth-email", confirmPassword: "auth-confirm-pass" }
   */
  fieldMap?: Record<string, string>;

  /**
   * Human-readable label overrides or transformer function for field error display.
   * e.g. { ip_address: "IP Address", user_id: "Account Username" } or (f) => label
   */
  fieldLabels?: Record<string, string> | ((field: string) => string);

  /**
   * Fallback error message if raw error contains no extractable message.
   */
  fallbackMessage?: string;
}

export const FormErrorAlert = React.forwardRef<HTMLDivElement, FormErrorAlertProps>(
  function FormErrorAlert(
    {
      error,
      title,
      onDismiss,
      onRetry,
      isRetrying = false,
      id = "form-error-alert",
      className = "",
      style,
      autoScroll = true,
      autoFocus = true,
      showFieldLinks = true,
      fieldIdPrefix = "",
      fieldMap,
      fieldLabels,
      fallbackMessage = "Submission failed. Please check the inputs and try again.",
    },
    forwardedRef
  ) {
    const internalRef = useRef<HTMLDivElement>(null);
    const [copiedId, setCopiedId] = useState(false);

    // Forward internal ref to parent ref
    useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(
      forwardedRef,
      () => internalRef.current
    );

    // Normalize error using parseFormError
    const parsed: ParsedFormError = useMemo(() => {
      if (!error) {
        return {
          hasError: false,
          message: "",
          fieldErrors: [],
          fieldErrorMap: {},
          timestamp: new Date().toISOString(),
        };
      }
      if (typeof error === "object" && error !== null && "hasError" in error && "fieldErrorMap" in error) {
        return error as ParsedFormError;
      }
      return parseFormError(error, { fallbackMessage, fieldMap, fieldLabels });
    }, [error, fallbackMessage, fieldMap, fieldLabels]);

    // Container-aware auto-scroll and focus management
    useEffect(() => {
      if (!parsed.hasError || !internalRef.current) return;

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (autoScroll) {
        const scrollParent = getScrollParent(internalRef.current);
        if (scrollParent) {
          const targetRect = internalRef.current.getBoundingClientRect();
          const parentRect = scrollParent.getBoundingClientRect();
          const relativeTop = targetRect.top - parentRect.top + scrollParent.scrollTop;
          scrollParent.scrollTo({
            top: Math.max(0, relativeTop - 16),
            behavior: prefersReducedMotion ? "auto" : "smooth",
          });
        } else if (typeof internalRef.current.scrollIntoView === "function") {
          internalRef.current.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "nearest",
          });
        }
      }

      if (autoFocus && typeof internalRef.current.focus === "function") {
        internalRef.current.focus({ preventScroll: true });
      }
    }, [parsed.hasError, parsed.timestamp, autoScroll, autoFocus]);

    if (!parsed.hasError) return null;

    // Clipboard copy handler for Request ID
    async function copyRequestId() {
      if (!parsed.requestId) return;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(parsed.requestId);
        } else if (typeof document !== "undefined") {
          // Fallback for non-secure / legacy contexts
          const textArea = document.createElement("textarea");
          textArea.value = parsed.requestId;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        }
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
      } catch {
        // Graceful copy failure
      }
    }

    // Interactive field anchor navigation
    function handleFieldClick(fieldName: string) {
      if (typeof document === "undefined") return;

      let targetEl: HTMLElement | null = null;

      // 1. Explicit fieldMap
      if (fieldMap && fieldMap[fieldName]) {
        targetEl = document.getElementById(fieldMap[fieldName]);
      }

      // 2. Prefixed ID
      if (!targetEl && fieldIdPrefix) {
        targetEl = document.getElementById(`${fieldIdPrefix}${fieldName}`);
      }

      // 3. Direct ID
      if (!targetEl) {
        targetEl = document.getElementById(fieldName);
      }

      // 4. Default "field-" prefix
      if (!targetEl) {
        targetEl = document.getElementById(`field-${fieldName}`);
      }

      // 5. Name attribute
      if (!targetEl) {
        targetEl = document.querySelector(`[name="${fieldName}"]`) as HTMLElement | null;
      }

      // 6. Data-field attribute
      if (!targetEl) {
        targetEl = document.querySelector(`[data-field="${fieldName}"]`) as HTMLElement | null;
      }

      if (targetEl) {
        const prefersReducedMotion =
          typeof window !== "undefined" &&
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (typeof targetEl.scrollIntoView === "function") {
          targetEl.scrollIntoView({
            behavior: prefersReducedMotion ? "auto" : "smooth",
            block: "center",
          });
        }
        if (typeof targetEl.focus === "function") {
          targetEl.focus({ preventScroll: true });
        }
      }
    }

    function getLabel(fieldName: string): string {
      return resolveFieldLabel(fieldName, fieldLabels);
    }

    // Contextual default title
    const defaultTitle =
      parsed.fieldErrors.length > 0
        ? "Validation Error"
        : parsed.status && parsed.status >= 500
        ? "System Error"
        : parsed.code === "NETWORK_ERROR"
        ? "Network Request Failed"
        : parsed.status === 401 || parsed.status === 403
        ? "Authorization Required"
        : "Submission Failed";

    return (
      <div
        id={id}
        ref={internalRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        tabIndex={-1}
        className={`formErrorAlert ${className}`.trim()}
        style={{
          margin: "0 0 16px 0",
          padding: "12px 14px",
          borderRadius: "var(--radius, 8px)",
          background: "var(--error-bg)",
          border: "1px solid var(--error-border)",
          borderLeft: "3.5px solid var(--danger)",
          color: "var(--error-text)",
          fontSize: "13px",
          lineHeight: 1.5,
          outline: "none",
          position: "relative",
          boxShadow: "var(--shadow-sm)",
          ...style,
        }}
      >
        {/* Top Header Row: Icon + Title + Badges + Header Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "var(--danger)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="alert" size={16} />
            </div>
            <strong
              style={{
                fontWeight: 700,
                fontSize: "13px",
                color: "var(--text)",
              }}
            >
              {title ?? defaultTitle}
            </strong>

            {/* Technical Error Code Badge */}
            {parsed.code && (
              <span
                className="mono"
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "rgba(220, 38, 38, 0.12)",
                  color: "var(--danger)",
                  fontWeight: 600,
                  border: "1px solid var(--danger-border)",
                  lineHeight: 1.4,
                }}
              >
                {parsed.code}
              </span>
            )}

            {/* HTTP Status Code Badge */}
            {parsed.status && (
              <span
                className="mono"
                style={{
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  background: "var(--surface2)",
                  color: "var(--muted)",
                  fontWeight: 600,
                  border: "1px solid var(--border)",
                  lineHeight: 1.4,
                }}
              >
                HTTP {parsed.status}
              </span>
            )}
          </div>

          {/* Action Controls: Retry & Dismiss */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
            }}
          >
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                aria-label="Retry submission"
                aria-busy={isRetrying}
                className="btn sm"
                style={{
                  height: 26,
                  padding: "0 8px",
                  fontSize: "11.5px",
                  background: "var(--surface)",
                  border: "1px solid var(--error-border)",
                  color: "var(--text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon name="refresh" size={12} className={isRetrying ? "spin" : ""} />
                <span>{isRetrying ? "Retrying…" : "Retry"}</span>
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                aria-label="Dismiss error banner"
                className="iconBtn"
                style={{
                  width: 24,
                  height: 24,
                  border: "none",
                  background: "transparent",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: 0,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Primary Human-Readable Message */}
        {parsed.message && (
          <div
            style={{
              marginTop: 6,
              color: "var(--text2)",
              fontSize: "13px",
              lineHeight: 1.45,
            }}
          >
            {parsed.message}
          </div>
        )}

        {/* Itemized Field Issues List */}
        {parsed.fieldErrors.length > 0 && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid rgba(220, 38, 38, 0.15)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: 4,
              }}
            >
              Please correct the following {parsed.fieldErrors.length} issue
              {parsed.fieldErrors.length > 1 ? "s" : ""}:
            </div>
            <ul
              role="list"
              style={{
                margin: 0,
                paddingLeft: 18,
                listStyleType: "disc",
              }}
            >
              {parsed.fieldErrors.map((f, idx) => (
                <li
                  key={`${f.field}-${idx}`}
                  style={{
                    margin: "3px 0",
                    fontSize: "12.5px",
                    lineHeight: 1.4,
                  }}
                >
                  {showFieldLinks ? (
                    <button
                      type="button"
                      onClick={() => handleFieldClick(f.field)}
                      aria-label={`Jump to ${getLabel(f.field)} field`}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "var(--danger)",
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                        cursor: "pointer",
                        font: "inherit",
                        textAlign: "left",
                      }}
                    >
                      <strong>{getLabel(f.field)}</strong>: {f.message}
                    </button>
                  ) : (
                    <span>
                      <strong>{getLabel(f.field)}</strong>: {f.message}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Telecom Audit Trace: Request ID */}
        {parsed.requestId && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 6,
              borderTop: "1px solid rgba(220, 38, 38, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "11.5px",
              color: "var(--muted)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>Request ID:</span>
              <code
                className="mono"
                style={{
                  color: "var(--text)",
                  fontWeight: 600,
                }}
              >
                {parsed.requestId}
              </code>
            </span>

            <button
              type="button"
              onClick={copyRequestId}
              aria-label="Copy Request ID to clipboard"
              className="btn sm"
              style={{
                height: 22,
                padding: "0 6px",
                fontSize: "10.5px",
                gap: 4,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: copiedId ? "var(--success)" : "var(--text2)",
              }}
            >
              <Icon name={copiedId ? "check" : "copy"} size={11} />
              <span>{copiedId ? "Copied!" : "Copy ID"}</span>
            </button>
          </div>
        )}
      </div>
    );
  }
);

export const FormErrorHeader = FormErrorAlert;
export default FormErrorAlert;
