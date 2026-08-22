"use client";

import { useState, useCallback, useRef } from "react";
import {
  parseFormError,
  type FormFieldError,
  type ParsedFormError,
  type ParseFormErrorOptions,
} from "./form-error";

export interface UseFormErrorOptions {
  /** Default fallback message when no specific error message can be extracted */
  fallbackMessage?: string;
  /** Mapping dictionary to translate backend DTO keys to frontend form keys (e.g. { "account_id": "accountId" }) */
  fieldMap?: Record<string, string>;
  /** Optional custom field label resolver for display in the banner */
  fieldLabels?: Record<string, string> | ((field: string) => string);
  /** Whether to automatically scroll the error banner into view on error (default: true) */
  autoScroll?: boolean;
  /** Whether to automatically focus the error banner on error (default: true) */
  autoFocus?: boolean;
  /** Whether to focus the first invalid field instead of the top banner (default: false) */
  focusFirstField?: boolean;
  /** DOM element ID prefix for field element lookup (default: "field-") */
  fieldIdPrefix?: string;
  /** Scroll behavior override ('smooth' | 'auto'). Defaults to 'smooth', respects prefers-reduced-motion */
  scrollBehavior?: ScrollBehavior;
  /** Optional callback fired whenever an error is set */
  onError?: (error: ParsedFormError) => void;
  /** Optional callback fired whenever all errors are cleared */
  onClear?: () => void;
}

export interface UseFormErrorReturn {
  /** The canonical parsed form error structure, or null if no error is active */
  formError: ParsedFormError | null;
  /** Primary human-readable error message string (empty if no error) */
  errorMessage: string;
  /** O(1) dictionary mapping field names to error messages for direct inline binding */
  fieldErrors: Record<string, string>;
  /** Ordered list of individual field errors for itemized rendering */
  fieldErrorList: FormFieldError[];
  /** Unique request / audit identifier if returned by the backend */
  requestId?: string;
  /** HTTP status code if originated from an HTTP response */
  status?: number;
  /** Machine-readable error code if available (e.g. "VALIDATION_ERROR", "INVALID_CREDENTIALS") */
  code?: string;
  /** Boolean flag indicating whether an active error condition exists */
  hasError: boolean;
  /** Boolean flag indicating whether an async form submission is currently executing */
  isSubmitting: boolean;
  /** Ref to attach to the FormErrorAlert banner element for programmatic scrolling and focus */
  bannerRef: React.RefObject<HTMLDivElement | null>;
  /** Ingest and normalize an error payload from any source (API response, Error, Zod, string, etc.) */
  setError: (rawError: unknown, options?: ParseFormErrorOptions) => ParsedFormError;
  /** Set or update a specific field error manually */
  setFieldError: (field: string, message: string, code?: string) => void;
  /** Clear an individual field error (called on field onChange/onInput) */
  clearFieldError: (field: string) => void;
  /** Clear all form and field errors (called on resubmission or banner dismissal) */
  clearErrors: () => void;
  /** Completely reset form error and submission state back to pristine */
  reset: () => void;
  /** Set isSubmitting state manually if needed */
  setIsSubmitting: (isSubmitting: boolean) => void;
  /** Higher-order submission wrapper that automatically handles error catching, focus, and submission state */
  handleSubmit: <T>(
    fn: () => Promise<T>,
    options?: { clearBefore?: boolean }
  ) => (e?: React.FormEvent) => Promise<T | undefined>;
  /** Programmatically trigger container-aware scroll to the error banner */
  scrollToBanner: (options?: { behavior?: ScrollBehavior }) => void;
  /** Programmatically trigger scroll and focus to a specific field element */
  scrollToField: (field: string, options?: { behavior?: ScrollBehavior; focus?: boolean }) => void;
  /** Accessibility and binding helper generating id, name, and aria-invalid attributes for an input */
  getFieldProps: (field: string) => {
    id: string;
    name: string;
    "aria-invalid": boolean;
    "aria-describedby"?: string;
  };
}

/**
 * Discovers the closest scrollable ancestor element.
 * Accounts for modals (.modalBody), drawers (.detailBody), and custom overflow containers.
 */
export function getScrollParent(node: HTMLElement | null): HTMLElement | null {
  if (typeof window === "undefined" || !node) return null;
  let current: HTMLElement | null = node.parentElement;
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const overflow = `${style.overflow}${style.overflowY}${style.overflowX}`;
    if (/(auto|scroll|overlay)/i.test(overflow) && current.scrollHeight > current.clientHeight) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Container-aware smooth scroll utility respecting WCAG prefers-reduced-motion.
 */
export function scrollToElement(
  target: HTMLElement | null,
  options: {
    offset?: number;
    behavior?: ScrollBehavior;
    focusAfterScroll?: boolean;
    preventScrollFocus?: boolean;
  } = {}
): void {
  if (typeof window === "undefined" || !target) return;

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const behavior: ScrollBehavior = prefersReducedMotion
    ? "auto"
    : options.behavior ?? "smooth";

  const offset = options.offset ?? 16;
  const scrollParent = getScrollParent(target);

  if (scrollParent && scrollParent !== document.body && scrollParent !== document.documentElement) {
    // Nested scroll container (.modalBody, .detailBody, etc.)
    const targetRect = target.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const relativeTop = targetRect.top - parentRect.top + scrollParent.scrollTop;

    scrollParent.scrollTo({
      top: Math.max(0, relativeTop - offset),
      behavior,
    });
  } else {
    // Window / Viewport scroll (accounting for sticky topbar)
    const targetRect = target.getBoundingClientRect();
    const stickyTopOffset = 80;
    const scrollTop = (window.scrollY || window.pageYOffset || 0) + targetRect.top - stickyTopOffset;

    window.scrollTo({
      top: Math.max(0, scrollTop),
      behavior,
    });
  }

  if (options.focusAfterScroll) {
    target.focus({ preventScroll: options.preventScrollFocus ?? true });
  }
}

/**
 * Unified React hook for form error management, dual-level validation,
 * and accessible scroll/focus synchronization.
 */
export function useFormError(options: UseFormErrorOptions = {}): UseFormErrorReturn {
  const {
    fallbackMessage,
    fieldMap,
    fieldLabels,
    autoScroll = true,
    autoFocus = true,
    focusFirstField = false,
    fieldIdPrefix = "field-",
    scrollBehavior,
    onError,
    onClear,
  } = options;

  const [formError, setFormError] = useState<ParsedFormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const bannerRef = useRef<HTMLDivElement | null>(null);

  // Derived state properties
  const errorMessage = formError?.message ?? "";
  const fieldErrors = formError?.fieldErrorMap ?? {};
  const fieldErrorList = formError?.fieldErrors ?? [];
  const requestId = formError?.requestId;
  const status = formError?.status;
  const code = formError?.code;
  const hasError = Boolean(formError?.hasError);

  const scrollToBanner = useCallback(
    (opts?: { behavior?: ScrollBehavior }) => {
      if (typeof window === "undefined" || !bannerRef.current) return;
      scrollToElement(bannerRef.current, {
        offset: 16,
        behavior: opts?.behavior ?? scrollBehavior,
        focusAfterScroll: autoFocus,
        preventScrollFocus: true,
      });
    },
    [autoFocus, scrollBehavior]
  );

  const scrollToField = useCallback(
    (field: string, opts?: { behavior?: ScrollBehavior; focus?: boolean }) => {
      if (typeof document === "undefined") return;
      const targetId = `${fieldIdPrefix}${field}`;
      const targetEl =
        document.getElementById(targetId) ||
        document.getElementById(field) ||
        document.getElementById(`field-${field}`) ||
        (document.querySelector(`[name="${field}"]`) as HTMLElement | null);

      if (targetEl) {
        scrollToElement(targetEl, {
          offset: 24,
          behavior: opts?.behavior ?? scrollBehavior,
          focusAfterScroll: opts?.focus ?? true,
          preventScrollFocus: true,
        });
      }
    },
    [fieldIdPrefix, scrollBehavior]
  );

  const setError = useCallback(
    (rawError: unknown, parseOpts?: ParseFormErrorOptions): ParsedFormError => {
      const mergedOpts: ParseFormErrorOptions = {
        fallbackMessage,
        fieldMap,
        fieldLabels,
        ...parseOpts,
      };

      const parsed = parseFormError(rawError, mergedOpts);
      setFormError(parsed);

      if (onError) {
        onError(parsed);
      }

      // Defer focus and scroll to next animation frame to ensure DOM layout has rendered
      if (typeof window !== "undefined") {
        requestAnimationFrame(() => {
          if (focusFirstField && parsed.fieldErrors.length > 0) {
            scrollToField(parsed.fieldErrors[0].field, { focus: true });
          } else if (autoScroll || autoFocus) {
            scrollToBanner();
          }
        });
      }

      return parsed;
    },
    [fallbackMessage, fieldMap, onError, focusFirstField, scrollToField, autoScroll, autoFocus, scrollToBanner]
  );

  const setFieldError = useCallback(
    (field: string, message: string, errCode?: string) => {
      setFormError((prev) => {
        const now = new Date().toISOString();
        const mappedField = fieldMap?.[field] ?? field;

        if (!prev || !prev.hasError) {
          return {
            hasError: true,
            message: "Please correct the highlighted fields.",
            code: "VALIDATION_ERROR",
            fieldErrors: [{ field: mappedField, message, code: errCode }],
            fieldErrorMap: { [mappedField]: message },
            timestamp: now,
          };
        }

        const filtered = prev.fieldErrors.filter((f) => f.field !== mappedField);
        const nextList: FormFieldError[] = [...filtered, { field: mappedField, message, code: errCode }];
        const nextMap: Record<string, string> = { ...prev.fieldErrorMap, [mappedField]: message };

        return {
          ...prev,
          hasError: true,
          fieldErrors: nextList,
          fieldErrorMap: nextMap,
          timestamp: now,
        };
      });
    },
    [fieldMap]
  );

  const clearFieldError = useCallback(
    (field: string) => {
      setFormError((prev) => {
        if (!prev) return null;
        const mappedField = fieldMap?.[field] ?? field;
        if (!prev.fieldErrorMap[mappedField]) return prev;

        const nextMap = { ...prev.fieldErrorMap };
        delete nextMap[mappedField];

        const nextList = prev.fieldErrors.filter((f) => f.field !== mappedField);

        // Synchronized Dual-Level Collapse:
        // If all field errors are cleared and the error was purely validation, collapse the banner
        if (nextList.length === 0 && (!prev.code || prev.code === "VALIDATION_ERROR")) {
          if (onClear) onClear();
          return null;
        }

        // If a server failure code exists, retain the macro error while clearing the field item
        return {
          ...prev,
          fieldErrors: nextList,
          fieldErrorMap: nextMap,
        };
      });
    },
    [fieldMap, onClear]
  );

  const clearErrors = useCallback(() => {
    setFormError(null);
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  const reset = useCallback(() => {
    setFormError(null);
    setIsSubmitting(false);
    if (onClear) {
      onClear();
    }
  }, [onClear]);

  const handleSubmit = useCallback(
    <T,>(fn: () => Promise<T>, submitOpts?: { clearBefore?: boolean }) => {
      return async (e?: React.FormEvent): Promise<T | undefined> => {
        if (e && typeof e.preventDefault === "function") {
          e.preventDefault();
        }

        if (submitOpts?.clearBefore !== false) {
          clearErrors();
        }

        setIsSubmitting(true);

        try {
          const result = await fn();
          setIsSubmitting(false);
          return result;
        } catch (err) {
          setIsSubmitting(false);
          setError(err);
          return undefined;
        }
      };
    },
    [clearErrors, setError]
  );

  const getFieldProps = useCallback(
    (field: string) => {
      const isInvalid = Boolean(fieldErrors[field]);
      const id = `${fieldIdPrefix}${field}`;
      return {
        id,
        name: field,
        "aria-invalid": isInvalid,
        ...(isInvalid ? { "aria-describedby": `${id}-error` } : {}),
      };
    },
    [fieldErrors, fieldIdPrefix]
  );

  return {
    formError,
    errorMessage,
    fieldErrors,
    fieldErrorList,
    requestId,
    status,
    code,
    hasError,
    isSubmitting,
    bannerRef,
    setError,
    setFieldError,
    clearFieldError,
    clearErrors,
    reset,
    setIsSubmitting,
    handleSubmit,
    scrollToBanner,
    scrollToField,
    getFieldProps,
  };
}
