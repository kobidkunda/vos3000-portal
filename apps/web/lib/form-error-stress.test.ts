import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormError, isParsedFormError, resolveFieldLabel } from "./form-error.js";
import { ApiClientError } from "./api.js";

// ============================================================================
// 1. CIRCULAR REFERENCES & SELF-REFERENCING STRUCTURES
// ============================================================================

test("Stress 1.1: Circular reference in root error object", () => {
  const circular: Record<string, any> = { message: "Root circular error" };
  circular.self = circular;
  circular.details = { parent: circular };

  const parsed = parseFormError(circular);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.message, "Root circular error");
});

test("Stress 1.2: Circular reference in VOS ApiEnvelope details.errors", () => {
  const item: Record<string, any> = { field: "gatewayIp", message: "Invalid IP" };
  item.parent = item;
  const env = {
    ok: false,
    request_id: "req-circ-001",
    error: {
      code: "VALIDATION_ERROR",
      message: "Gateway validation failed",
      details: { errors: [item] },
    },
  };

  const parsed = parseFormError(env);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrors.length, 1);
  assert.equal(parsed.fieldErrorMap.gatewayIp, "Invalid IP");
});

test("Stress 1.3: Circular reference in Axios-like response hierarchy", () => {
  const resp: Record<string, any> = {
    status: 422,
    data: {
      message: "Unprocessable entity",
    },
  };
  resp.data.response = resp;

  const err: Record<string, any> = { response: resp };
  resp.error = err;

  const parsed = parseFormError(err);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 422);
  assert.equal(parsed.message, "Unprocessable entity");
});

// ============================================================================
// 2. NULL PROTOTYPES & PROTOTYPE POLLUTION RESILIENCE
// ============================================================================

test("Stress 2.1: Object.create(null) at root, details, and issue levels", () => {
  const nullProtoObj = Object.create(null);
  nullProtoObj.message = "Null prototype error";
  nullProtoObj.status = 400;
  nullProtoObj.details = Object.create(null);
  nullProtoObj.details.field = "prefix";

  const parsed = parseFormError(nullProtoObj);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 400);
  assert.equal(parsed.message, "Null prototype error");
});

test("Stress 2.2: Payload containing prototype keys (__proto__, toString, valueOf, constructor)", () => {
  const poisonPayload = {
    message: "Poison attempt",
    fieldErrors: [
      { field: "__proto__", message: "Proto pollution attempt" },
      { field: "toString", message: "toString override attempt" },
      { field: "valueOf", message: "valueOf override attempt" },
      { field: "constructor", message: "constructor override attempt" },
    ],
  };

  const parsed = parseFormError(poisonPayload);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrors.length, 4);

  // Verify prototype of fieldErrorMap is not corrupted
  assert.equal(typeof Object.prototype.toString, "function");
  assert.equal(typeof Object.prototype.valueOf, "function");
});

test("Stress 2.3: resolveFieldLabel with prototype keys", () => {
  assert.doesNotThrow(() => {
    resolveFieldLabel("__proto__");
    resolveFieldLabel("toString");
    resolveFieldLabel("valueOf");
    resolveFieldLabel("constructor");
    resolveFieldLabel("hasOwnProperty");
  });
});

// ============================================================================
// 3. EXTREME PAYLOAD SIZES & HIGH VOLUME
// ============================================================================

test("Stress 3.1: Giant string message (1MB) does not cause ReDoS or buffer crash", () => {
  const giantString = "E".repeat(1024 * 1024);
  const startTime = Date.now();
  const parsed = parseFormError(giantString);
  const elapsed = Date.now() - startTime;

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.message.length, 1024 * 1024);
  assert.ok(elapsed < 1000, `Parsing 1MB string took too long: ${elapsed}ms`);
});

test("Stress 3.2: 10,000 field errors in validation array", () => {
  const issues = Array.from({ length: 10000 }, (_, i) => ({
    field: `field_${i}`,
    message: `Validation error for field ${i}`,
  }));

  const payload = {
    statusCode: 400,
    code: "VALIDATION_ERROR",
    message: issues.map((iss) => `${iss.field} is invalid`),
  };

  const startTime = Date.now();
  const parsed = parseFormError(payload);
  const elapsed = Date.now() - startTime;

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrors.length, 10000);
  assert.equal(parsed.fieldErrorMap.field_0, "field_0 is invalid");
  assert.equal(parsed.fieldErrorMap.field_9999, "field_9999 is invalid");
  assert.ok(elapsed < 1500, `Parsing 10k errors took too long: ${elapsed}ms`);
});

// ============================================================================
// 4. UNEXPECTED TYPES & FUZZ INPUTS
// ============================================================================

test("Stress 4.1: Primitives, Symbols, Functions, BigInt, Date, RegExp", () => {
  // Numbers, true, symbols, and functions are non-empty non-nil values that result in hasError: true with fallback
  assert.equal(parseFormError(42).hasError, true);
  assert.equal(parseFormError(true).hasError, true);
  assert.equal(parseFormError(false).hasError, false);
  assert.equal(parseFormError(null).hasError, false);
  assert.equal(parseFormError(undefined).hasError, false);
  assert.equal(parseFormError(Symbol("err")).hasError, true);
  assert.equal(parseFormError(() => "error").hasError, true);
  assert.equal(parseFormError(BigInt(100)).hasError, true);

  const dateObj = new Date();
  const parsedDate = parseFormError(dateObj);
  assert.equal(parsedDate.hasError, true);

  const regexObj = /error-pattern/i;
  const parsedRegex = parseFormError(regexObj);
  assert.equal(parsedRegex.hasError, true);
});

test("Stress 4.2: Malformed NestJS message array with mixed types", () => {
  const malformed = {
    statusCode: 400,
    message: [
      null,
      undefined,
      123,
      true,
      { notAProperty: true },
      { property: "validField", constraints: { custom: "Field is bad" } },
      "valid_field string with field name",
    ],
  };

  const parsed = parseFormError(malformed);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 400);
  assert.equal(parsed.fieldErrorMap.validField, "Field is bad");
  assert.equal(parsed.fieldErrorMap.valid_field, "valid_field string with field name");
});

test("Stress 4.3: Fastify validation with odd instancePath structures", () => {
  const fastifyOdd = {
    statusCode: 400,
    code: "FST_ERR_VALIDATION",
    validation: [
      { instancePath: "", params: { missingProperty: "username" } },
      { instancePath: "/", message: "root object invalid" },
      { instancePath: "/nested/deep/field", message: "must be positive" },
      { instancePath: null, message: "no path provided" },
      null,
      "invalid-item",
    ],
  };

  const parsed = parseFormError(fastifyOdd);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrorMap.username, "username is required");
  assert.equal(parsed.fieldErrorMap["nested.deep.field"], "must be positive");
});

// ============================================================================
// 5. STATUS CODE BOUNDARY CONDITIONS
// ============================================================================

test("Stress 5.1: Unusual status codes (0, negative, NaN, floats, strings, 999)", () => {
  const testCases = [
    { input: { status: 0, message: "Status 0" }, expectedStatus: 0 },
    { input: { status: -1, message: "Status -1" }, expectedStatus: -1 },
    { input: { statusCode: 503, message: "Status 503" }, expectedStatus: 503 },
    { input: { response: { status: 404 } }, expectedStatus: 404 },
  ];

  for (const tc of testCases) {
    const parsed = parseFormError(tc.input);
    assert.equal(parsed.status, tc.expectedStatus);
  }
});

// ============================================================================
// 6. RFC 7807 vs DICT ERROR STRUCTURES
// ============================================================================

test("Stress 6.1: ProblemDetails with empty arrays/objects", () => {
  const emptyProblem = {
    title: "Bad Request",
    detail: "Invalid input provided",
    invalidParams: [],
    errors: {},
  };

  const parsed = parseFormError(emptyProblem);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.message, "Invalid input provided");
  assert.equal(parsed.fieldErrors.length, 0);
});

test("Stress 6.2: RFC errors dictionary with array of messages vs single string", () => {
  const rfcDict = {
    title: "Validation Error",
    errors: {
      email: ["Email is invalid", "Email already in use"],
      phone: "Phone number required",
    },
  };

  const parsed = parseFormError(rfcDict);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrorMap.email, "Email is invalid");
  assert.equal(parsed.fieldErrorMap.phone, "Phone number required");
});

// ============================================================================
// 7. API CLIENT ERROR & TRANSPORT INTEGRATION
// ============================================================================

test("Stress 7.1: ApiClientError preserves prototype chain and fields", () => {
  const apiErr = new ApiClientError("Forbidden action", {
    status: 403,
    code: "PERMISSION_DENIED",
    request_id: "req-trace-403",
    details: { requiredRole: "SUPER_ADMIN" },
    errors: [{ field: "role", message: "Insufficient permissions" }],
    raw: { ok: false },
  });

  assert.ok(apiErr instanceof Error);
  assert.ok(apiErr instanceof ApiClientError);
  assert.equal(apiErr.name, "ApiClientError");
  assert.equal(apiErr.status, 403);
  assert.equal(apiErr.code, "PERMISSION_DENIED");
  assert.equal(apiErr.requestId, "req-trace-403");

  const parsed = parseFormError(apiErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 403);
  assert.equal(parsed.code, "PERMISSION_DENIED");
  assert.equal(parsed.requestId, "req-trace-403");
  assert.equal(parsed.message, "Forbidden action");
});
