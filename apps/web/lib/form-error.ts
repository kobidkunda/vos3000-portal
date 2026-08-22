/**
 * apps/web/lib/form-error.ts
 *
 * Universal Error Normalization Engine for CallWork Telecom Platform (callwork.com).
 * Normalizes all 8 error shapes into a canonical ParsedFormError contract:
 * 1. VOS ApiEnvelope ({ ok: false, request_id, error: { code, message, details } })
 * 2. NestJS / class-validator validation arrays ({ statusCode: 400, message: string[] | object[] })
 * 3. Zod issues (ZodError or { issues: [...] })
 * 4. Fastify bad request ({ statusCode: 400, code: "FST_ERR_VALIDATION", validation: [...] })
 * 5. RFC 7807 ProblemDetails ({ type, title, status, detail, instance, invalidParams, errors })
 * 6. VOS capability & transport errors (VosCapabilityError, VosTransportError, 502/503)
 * 7. Axios / Fetch / Ky / DOM exceptions (TypeError: Failed to fetch, DOMException: AbortError)
 * 8. Raw strings, Error instances, and unknown/nil values.
 */

export interface FormFieldError {
  /** Field identifier matching form state (e.g. "email", "prefixRule", "configuredIp") */
  field: string;
  /** Human-readable explanation of the validation failure */
  message: string;
  /** Optional machine-readable constraint code (e.g. "REQUIRED", "INVALID_FORMAT") */
  code?: string;
}

export interface ParsedFormError {
  /** Whether an active error condition exists */
  hasError: boolean;
  /** Primary human-readable summary message */
  message: string;
  /** Machine-readable error code (e.g. "VALIDATION_ERROR", "INVALID_CREDENTIALS", "NETWORK_ERROR") */
  code?: string;
  /** HTTP status code if originated from an HTTP response */
  status?: number;
  /** Unique request / audit identifier for carrier support lookup */
  requestId?: string;
  /** Ordered list of specific field validation failures */
  fieldErrors: FormFieldError[];
  /** O(1) dictionary mapping field name to error message for inline field binding */
  fieldErrorMap: Record<string, string>;
  /** Optional raw diagnostics or metadata (e.g. upstream operation, ticket) */
  details?: Record<string, unknown>;
  /** ISO timestamp when the error was parsed */
  timestamp: string;
}

export interface ParseFormErrorOptions {
  /** Default fallback message if no specific message can be extracted */
  fallbackMessage?: string;
  /** Mapping dictionary to translate backend DTO keys to frontend form keys (e.g. { "account_id": "accountId" }) */
  fieldMap?: Record<string, string>;
  /** Optional custom field label resolver for display in the banner */
  fieldLabels?: Record<string, string> | ((field: string) => string);
}

/**
 * Determines whether an unknown object is already a ParsedFormError instance.
 */
export function isParsedFormError(err: unknown): err is ParsedFormError {
  return (
    typeof err === "object" &&
    err !== null &&
    "hasError" in err &&
    "fieldErrorMap" in err &&
    "fieldErrors" in err &&
    "message" in err
  );
}

/**
 * Detects Zod validation error structure.
 */
function isZodError(err: any): err is { issues: Array<{ path: (string | number)[]; message: string; code?: string }> } {
  return (
    typeof err === "object" &&
    err !== null &&
    Array.isArray(err.issues) &&
    err.issues.length > 0 &&
    typeof err.issues[0] === "object" &&
    "message" in err.issues[0]
  );
}

/**
 * Universal Error Normalization Function.
 */
export function parseFormError(
  rawError: unknown,
  options: ParseFormErrorOptions = {}
): ParsedFormError {
  const fallbackMessage = options.fallbackMessage ?? "An unexpected error occurred. Please try again.";
  const now = new Date().toISOString();

  // 1. Nil, undefined, false, or empty input -> Clean state
  if (rawError === null || rawError === undefined || rawError === false || rawError === "") {
    return {
      hasError: false,
      message: "",
      fieldErrors: [],
      fieldErrorMap: {},
      timestamp: now,
    };
  }

  // 2. Already normalized ParsedFormError instance -> Idempotent passthrough
  if (isParsedFormError(rawError)) {
    // If fieldMap options are provided on a previously parsed error, re-apply fieldMap
    if (options.fieldMap && rawError.fieldErrors.length > 0) {
      const mappedFieldErrors: FormFieldError[] = [];
      const mappedFieldErrorMap: Record<string, string> = {};
      for (const item of rawError.fieldErrors) {
        const fieldKey = options.fieldMap[item.field] ?? item.field;
        const mappedItem = { ...item, field: fieldKey };
        mappedFieldErrors.push(mappedItem);
        if (!mappedFieldErrorMap[fieldKey]) {
          mappedFieldErrorMap[fieldKey] = mappedItem.message;
        }
      }
      return {
        ...rawError,
        fieldErrors: mappedFieldErrors,
        fieldErrorMap: mappedFieldErrorMap,
      };
    }
    return rawError;
  }

  let message = "";
  let code: string | undefined;
  let status: number | undefined;
  let requestId: string | undefined;
  let rawFieldErrors: FormFieldError[] = [];
  let details: Record<string, unknown> | undefined;

  // 3. Raw String input
  if (typeof rawError === "string") {
    message = rawError.trim() || fallbackMessage;
  }

  // 4. ZodError instance or structure
  else if (isZodError(rawError)) {
    code = "VALIDATION_ERROR";
    rawFieldErrors = rawError.issues.map((issue) => {
      const fieldPath = issue.path.filter((p) => typeof p === "string" || typeof p === "number").join(".");
      return {
        field: fieldPath || "form",
        message: issue.message,
        code: issue.code,
      };
    });
    message =
      rawFieldErrors.length === 1
        ? rawFieldErrors[0].message
        : `Validation failed (${rawFieldErrors.length} issues)`;
  }

  // 5. Object / Error Instance / ApiEnvelope / Response Payload
  else if (typeof rawError === "object" && rawError !== null) {
    const err = rawError as Record<string, any>;

    // Unwrap nested Axios / Fetch response objects (e.g. err.response.data or err.raw)
    const payload = err.response?.data ?? err.data ?? err.raw ?? err;

    // Extract HTTP status code
    if (typeof err.status === "number") status = err.status;
    else if (typeof err.statusCode === "number") status = err.statusCode;
    else if (typeof err.response?.status === "number") status = err.response.status;
    else if (typeof payload.statusCode === "number") status = payload.statusCode;
    else if (typeof payload.status === "number") status = payload.status;

    // Extract Request ID
    if (typeof err.request_id === "string") requestId = err.request_id;
    else if (typeof err.requestId === "string") requestId = err.requestId;
    else if (typeof payload.request_id === "string") requestId = payload.request_id;
    else if (typeof payload.requestId === "string") requestId = payload.requestId;
    else if (typeof payload.error?.request_id === "string") requestId = payload.error.request_id;
    else if (typeof payload.error?.requestId === "string") requestId = payload.error.requestId;

    // Extract Error Code
    if (typeof err.code === "string") code = err.code;
    else if (typeof payload.code === "string") code = payload.code;
    else if (typeof payload.error?.code === "string") code = payload.error.code;

    // Extract Details
    if (err.details && typeof err.details === "object" && !Array.isArray(err.details)) {
      details = err.details;
    } else if (payload.details && typeof payload.details === "object" && !Array.isArray(payload.details)) {
      details = payload.details;
    } else if (payload.error?.details && typeof payload.error.details === "object" && !Array.isArray(payload.error.details)) {
      details = payload.error.details;
    }

    // A. VOS ApiEnvelope structure: { ok: false, error: { message, code, details } }
    const envelopeError = payload.error ?? (err.ok === false ? err.error : undefined);
    if (envelopeError && typeof envelopeError === "object") {
      message = envelopeError.message ?? err.message ?? payload.message ?? "";
      if (typeof envelopeError.code === "string") code = envelopeError.code;

      const envDetails = envelopeError.details ?? details;
      if (envDetails && typeof envDetails === "object") {
        // Single field error: details = { field: "email", message?: "..." }
        if (typeof envDetails.field === "string") {
          rawFieldErrors.push({
            field: envDetails.field,
            message: String(envDetails.message ?? envelopeError.message ?? "Invalid value"),
            code: envelopeError.code,
          });
        }
        // Multi-field error list: details = { errors: [{ field: "ip", message: "..." }] }
        if (Array.isArray(envDetails.errors)) {
          envDetails.errors.forEach((e: any) => {
            if (typeof e === "object" && e !== null && e.field) {
              rawFieldErrors.push({
                field: String(e.field),
                message: String(e.message ?? "Invalid value"),
                code: e.code ?? envelopeError.code,
              });
            }
          });
        }
      }
    }

    // B. Fastify Schema Validation: { statusCode: 400, code: "FST_ERR_VALIDATION", validation: [...] }
    else if (Array.isArray(payload.validation) || Array.isArray(err.validation)) {
      const valList: any[] = Array.isArray(payload.validation) ? payload.validation : err.validation;
      code = code ?? "FST_ERR_VALIDATION";
      message = payload.message ?? err.message ?? `Validation failed (${valList.length} issues)`;

      valList.forEach((v) => {
        if (typeof v === "object" && v !== null) {
          let fieldName = "form";
          if (typeof v.instancePath === "string" && v.instancePath.length > 0) {
            fieldName = v.instancePath.replace(/^\//, "").replace(/\//g, ".");
          } else if (v.params?.missingProperty) {
            fieldName = String(v.params.missingProperty);
          }

          let fieldMsg = "Invalid value";
          if (v.params?.missingProperty) {
            fieldMsg = `${v.params.missingProperty} is required`;
          } else if (v.message) {
            fieldMsg = v.message;
          }

          rawFieldErrors.push({ field: fieldName, message: fieldMsg, code: v.keyword });
        }
      });
    }

    // C. NestJS / class-validator format: { statusCode: 400, message: string[] | object[], error: "Bad Request" }
    else if (Array.isArray(payload.message) || Array.isArray(err.message)) {
      const messages: any[] = Array.isArray(payload.message) ? payload.message : err.message;
      code = code ?? "VALIDATION_ERROR";

      messages.forEach((item) => {
        if (typeof item === "string") {
          // Parse strings like "email must be an email" or "password is too short"
          const match = /^([a-zA-Z0-9_.]+)\s+(.+)$/.exec(item);
          if (match) {
            rawFieldErrors.push({ field: match[1], message: item });
          } else {
            rawFieldErrors.push({ field: "form", message: item });
          }
        } else if (typeof item === "object" && item !== null && item.property) {
          // Class validator ValidationError object
          const constraints = item.constraints ? Object.values(item.constraints) : [];
          const constraintMsg = constraints.length > 0 ? String(constraints[0]) : "Validation failed";
          rawFieldErrors.push({ field: String(item.property), message: constraintMsg });
        }
      });

      message =
        rawFieldErrors.length === 1
          ? rawFieldErrors[0].message
          : `Validation failed (${rawFieldErrors.length} issues)`;
    }

    // D. RFC 7807 ProblemDetails: { title, detail, invalidParams, errors }
    else if (payload.detail || payload.title || payload.invalidParams || (payload.errors && typeof payload.errors === "object" && !Array.isArray(payload.errors))) {
      message = payload.detail ?? payload.title ?? err.message ?? fallbackMessage;

      if (Array.isArray(payload.invalidParams)) {
        payload.invalidParams.forEach((ip: any) => {
          if (ip && typeof ip === "object" && ip.name) {
            rawFieldErrors.push({
              field: String(ip.name),
              message: String(ip.reason ?? ip.message ?? "Invalid value"),
            });
          }
        });
      }

      if (payload.errors && typeof payload.errors === "object" && !Array.isArray(payload.errors)) {
        Object.entries(payload.errors).forEach(([field, errList]) => {
          const msg = Array.isArray(errList) ? String(errList[0]) : String(errList);
          rawFieldErrors.push({ field, message: msg });
        });
      }
    }

    // E. Direct field error dictionary (e.g. wizard step errors: { errors: { email: "Required" } })
    else if (payload.errors && typeof payload.errors === "object" && !Array.isArray(payload.errors)) {
      Object.entries(payload.errors).forEach(([field, msg]) => {
        rawFieldErrors.push({ field, message: String(msg) });
      });
      message = payload.message ?? (rawFieldErrors.length === 1 ? rawFieldErrors[0].message : "Validation failed");
    }

    // F. Standard Error object or message property
    else if (typeof err.message === "string") {
      message = err.message;
    } else if (typeof payload.message === "string") {
      message = payload.message;
    }

    // G. Explicit fieldErrors property on err
    if (err.fieldErrors && typeof err.fieldErrors === "object") {
      if (Array.isArray(err.fieldErrors)) {
        err.fieldErrors.forEach((fe: any) => {
          if (fe && typeof fe === "object" && fe.field && fe.message) {
            rawFieldErrors.push({ field: String(fe.field), message: String(fe.message), code: fe.code });
          }
        });
      } else {
        Object.entries(err.fieldErrors).forEach(([field, msg]) => {
          rawFieldErrors.push({ field, message: String(msg) });
        });
      }
    }
  }

  // 6. Network & Abort / Timeout Sanitization
  if (/Failed to fetch|NetworkError|Network request failed|Load failed|ERR_CONNECTION|ERR_NETWORK/i.test(message)) {
    message = "Network connection lost or server is unreachable. Please verify your connection and try again.";
    code = code ?? "NETWORK_ERROR";
  } else if (/AbortError|The operation was aborted|timeout|timed out|ETIMEDOUT|ECONNABORTED/i.test(message)) {
    message = "The request timed out. VOS nodes may be experiencing high load. Please try again.";
    code = code ?? "TIMEOUT";
  }

  if (!message || message.trim() === "") {
    message = fallbackMessage;
  }

  // 7. Apply Field Key Mapping and construct O(1) fieldErrorMap
  const fieldErrors: FormFieldError[] = [];
  const fieldErrorMap: Record<string, string> = {};

  for (const item of rawFieldErrors) {
    const mappedField = options.fieldMap?.[item.field] ?? item.field;
    const finalItem: FormFieldError = { ...item, field: mappedField };
    fieldErrors.push(finalItem);
    if (!fieldErrorMap[mappedField]) {
      fieldErrorMap[mappedField] = finalItem.message;
    }
  }

  return {
    hasError: true,
    message: message.trim(),
    code,
    status,
    requestId,
    fieldErrors,
    fieldErrorMap,
    details,
    timestamp: now,
  };
}

/**
 * Resolves a human-readable display label for a form field.
 */
export function resolveFieldLabel(
  fieldName: string,
  fieldLabels?: Record<string, string> | ((field: string) => string)
): string {
  if (typeof fieldLabels === "function") return fieldLabels(fieldName);
  if (fieldLabels && fieldLabels[fieldName]) return fieldLabels[fieldName];
  // Convert camelCase or snake_case/kebab-case/dot.notation to Title Case (e.g. "configuredIp" -> "Configured Ip", "owner_email" -> "Owner Email")
  return fieldName
    .replace(/([A-Z])/g, " $1")
    .replace(/[._-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
