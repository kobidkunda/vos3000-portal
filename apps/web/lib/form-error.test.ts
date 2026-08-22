import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormError, isParsedFormError, resolveFieldLabel } from "./form-error.js";

test("Shape 1: VOS ApiEnvelope with single field error", () => {
  const input = {
    ok: false,
    request_id: "req-vos-001",
    error: {
      code: "VALIDATION_ERROR",
      message: "Prefix rule is required",
      details: { field: "prefixRule" },
    },
  };

  const parsed = parseFormError(input);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.message, "Prefix rule is required");
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.requestId, "req-vos-001");
  assert.equal(parsed.fieldErrors.length, 1);
  assert.equal(parsed.fieldErrors[0].field, "prefixRule");
  assert.equal(parsed.fieldErrorMap.prefixRule, "Prefix rule is required");
});

test("Shape 1: VOS ApiEnvelope with multi-field errors list", () => {
  const input = {
    ok: false,
    request_id: "req-vos-002",
    error: {
      code: "VALIDATION_ERROR",
      message: "Gateway configuration invalid",
      details: {
        errors: [
          { field: "gwIp", message: "Invalid IPv4 address" },
          { field: "lineLimit", message: "Must be greater than 0" },
        ],
      },
    },
  };

  const parsed = parseFormError(input);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrors.length, 2);
  assert.equal(parsed.fieldErrorMap.gwIp, "Invalid IPv4 address");
  assert.equal(parsed.fieldErrorMap.lineLimit, "Must be greater than 0");
});

test("Shape 2: NestJS class-validator string array", () => {
  const input = {
    statusCode: 400,
    message: ["email must be an email", "password is too short"],
    error: "Bad Request",
  };

  const parsed = parseFormError(input);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 400);
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.fieldErrors.length, 2);
  assert.equal(parsed.fieldErrorMap.email, "email must be an email");
  assert.equal(parsed.fieldErrorMap.password, "password is too short");
});

test("Shape 2: NestJS class-validator object tree", () => {
  const input = {
    statusCode: 400,
    message: [
      { property: "email", constraints: { isEmail: "email must be an email" } },
      { property: "phone", constraints: { isNotEmpty: "phone should not be empty" } },
    ],
    error: "Bad Request",
  };

  const parsed = parseFormError(input);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 400);
  assert.equal(parsed.fieldErrorMap.email, "email must be an email");
  assert.equal(parsed.fieldErrorMap.phone, "phone should not be empty");
});

test("Shape 3: ZodError issues structure", () => {
  const zodLikeError = {
    name: "ZodError",
    issues: [
      { path: ["owner", "email"], message: "Invalid email address", code: "invalid_string" },
      { path: ["capacity"], message: "Capacity must be positive", code: "too_small" },
    ],
  };

  const parsed = parseFormError(zodLikeError);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.fieldErrors.length, 2);
  assert.equal(parsed.fieldErrorMap["owner.email"], "Invalid email address");
  assert.equal(parsed.fieldErrorMap.capacity, "Capacity must be positive");
});

test("Shape 4: Fastify Schema Validation (FST_ERR_VALIDATION)", () => {
  const fastifyError = {
    statusCode: 400,
    code: "FST_ERR_VALIDATION",
    error: "Bad Request",
    message: "body/email must match format \"email\"",
    validation: [
      { keyword: "format", instancePath: "/email", message: "must match format \"email\"" },
      { keyword: "required", instancePath: "", params: { missingProperty: "companyName" } },
    ],
  };

  const parsed = parseFormError(fastifyError);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 400);
  assert.equal(parsed.code, "FST_ERR_VALIDATION");
  assert.equal(parsed.fieldErrorMap.email, "must match format \"email\"");
  assert.equal(parsed.fieldErrorMap.companyName, "companyName is required");
});

test("Shape 5: RFC 7807 ProblemDetails", () => {
  const problem = {
    type: "https://api.vos3000.com/errors/conflict",
    title: "IP Conflict",
    status: 409,
    detail: "IP 1.2.3.4 is already assigned to GW-01",
    invalidParams: [{ name: "configuredIp", reason: "Already allocated" }],
  };

  const parsed = parseFormError(problem);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 409);
  assert.equal(parsed.message, "IP 1.2.3.4 is already assigned to GW-01");
  assert.equal(parsed.fieldErrorMap.configuredIp, "Already allocated");
});

test("Shape 6: VOS Transport and Capability Errors", () => {
  const transportErr = {
    name: "VosTransportError",
    code: "VOS_TRANSPORT_ERROR",
    statusCode: 502,
    message: "VOS getRates failed with HTTP 502",
    operation: "getRates",
  };

  const parsed = parseFormError(transportErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 502);
  assert.equal(parsed.code, "VOS_TRANSPORT_ERROR");
  assert.equal(parsed.message, "VOS getRates failed with HTTP 502");
});

test("Shape 7: Network disconnect and timeout exceptions", () => {
  const fetchErr = new TypeError("Failed to fetch");
  const parsedFetch = parseFormError(fetchErr);
  assert.equal(parsedFetch.code, "NETWORK_ERROR");
  assert.ok(parsedFetch.message.includes("Network connection lost"));

  const abortErr = new Error("The operation was aborted");
  const parsedAbort = parseFormError(abortErr);
  assert.equal(parsedAbort.code, "TIMEOUT");
  assert.ok(parsedAbort.message.includes("timed out"));
});

test("Shape 8: Raw string, null, undefined, and empty string", () => {
  const raw = parseFormError("Direct error message");
  assert.equal(raw.hasError, true);
  assert.equal(raw.message, "Direct error message");

  const nil = parseFormError(null);
  assert.equal(nil.hasError, false);
  assert.equal(nil.message, "");

  const undef = parseFormError(undefined);
  assert.equal(undef.hasError, false);

  const empty = parseFormError("");
  assert.equal(empty.hasError, false);
});

test("Options: Field Mapping translates backend keys to frontend keys", () => {
  const input = {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: {
        errors: [
          { field: "configured_ip", message: "Invalid IP" },
          { field: "account_id", message: "Account not found" },
        ],
      },
    },
  };

  const parsed = parseFormError(input, {
    fieldMap: {
      configured_ip: "gwIp",
      account_id: "accountId",
    },
  });

  assert.equal(parsed.fieldErrorMap.gwIp, "Invalid IP");
  assert.equal(parsed.fieldErrorMap.accountId, "Account not found");
  assert.equal(parsed.fieldErrorMap.configured_ip, undefined);
});

test("Helper: isParsedFormError identifies parsed structure accurately", () => {
  const parsed = parseFormError("Test Error");
  assert.equal(isParsedFormError(parsed), true);
  assert.equal(isParsedFormError(new Error("Test Error")), false);
  assert.equal(isParsedFormError({ message: "Test" }), false);
  assert.equal(isParsedFormError(null), false);
});

test("Helper: resolveFieldLabel transforms identifiers", () => {
  assert.equal(resolveFieldLabel("configuredIp"), "Configured Ip");
  assert.equal(resolveFieldLabel("owner_email"), "Owner Email");
  assert.equal(resolveFieldLabel("customField", { customField: "Custom Label" }), "Custom Label");
  assert.equal(resolveFieldLabel("fnField", (f) => `Resolved ${f}`), "Resolved fnField");
});
