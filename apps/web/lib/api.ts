/**
 * apps/web/lib/api.ts
 *
 * Carrier-grade client API transport wrapper for Didflow (didflow.com).
 * Preserves complete structured error details (code, details, request_id, status, errors, raw)
 * while maintaining 100% backward compatibility with all existing callers.
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Structured API Client Error class extending native Error.
 */
export class ApiClientError extends Error {
  public readonly status: number;
  public readonly statusCode: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly request_id?: string;
  public readonly requestId?: string;
  public readonly errors?: unknown[];
  public readonly raw?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      details?: unknown;
      request_id?: string;
      errors?: unknown[];
      raw?: unknown;
    }
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = options.status;
    this.statusCode = options.status;
    this.code = options.code;
    this.details = options.details;
    this.request_id = options.request_id;
    this.requestId = options.request_id;
    this.errors = options.errors;
    this.raw = options.raw;

    // Preserve prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Executes an HTTP fetch request against the backend API.
 * Throws ApiClientError on non-2xx HTTP status codes.
 */
export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = API + path;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  // Extract Request ID from response headers if present
  const headerRequestId =
    res.headers.get("x-request-id") ??
    res.headers.get("x-correlation-id") ??
    undefined;

  // Safely read response text and attempt JSON parse
  let json: any = null;
  const text = await res.text().catch(() => "");
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response (e.g. HTML 502/504 error or raw string)
      json = {
        ok: false,
        error: {
          message: text.length < 250 ? text.trim() : `HTTP ${res.status} ${res.statusText || ""}`.trim(),
        },
      };
    }
  } else {
    // Empty body response (e.g. 204 No Content or empty 404)
    json = res.ok ? {} : { ok: false, error: { message: `HTTP ${res.status} ${res.statusText || ""}`.trim() } };
  }

  // If HTTP status is not 2xx, throw enriched ApiClientError
  if (!res.ok) {
    const errorObj = json?.error;
    const extractedMessage =
      (typeof errorObj === "object" && errorObj?.message ? errorObj.message : null) ??
      (typeof errorObj === "string" ? errorObj : null) ??
      json?.message ??
      json?.detail ??
      json?.title ??
      (res.statusText ? `HTTP ${res.status}: ${res.statusText}` : `HTTP ${res.status}`);

    const extractedRequestId =
      json?.request_id ??
      json?.requestId ??
      errorObj?.request_id ??
      errorObj?.requestId ??
      headerRequestId;

    const extractedCode =
      errorObj?.code ??
      json?.code ??
      (res.status >= 500 ? "SERVER_ERROR" : res.status === 404 ? "NOT_FOUND" : undefined);

    const extractedDetails =
      errorObj?.details ??
      json?.details ??
      undefined;

    const extractedErrors =
      errorObj?.details?.errors ??
      json?.errors ??
      json?.invalidParams ??
      (Array.isArray(json?.message) ? json.message : undefined);

    const apiError = new ApiClientError(String(extractedMessage), {
      status: res.status,
      code: extractedCode,
      details: extractedDetails,
      request_id: extractedRequestId,
      errors: extractedErrors,
      raw: json,
    });

    // Also assign properties directly for legacy untyped JS access
    Object.assign(apiError, {
      status: res.status,
      statusCode: res.status,
      request_id: extractedRequestId,
      requestId: extractedRequestId,
      code: extractedCode,
      details: extractedDetails,
      errors: extractedErrors,
      raw: json,
    });

    throw apiError;
  }

  return json as T;
}

export { API };
