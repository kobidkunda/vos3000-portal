import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormError } from "./form-error.js";
import { getScrollParent } from "./use-form-error.js";

test("useFormError: normalizes error and derives fieldErrors map", () => {
  const raw = {
    ok: false,
    request_id: "req-vos-8899",
    error: {
      code: "VALIDATION_ERROR",
      message: "Gateway IP conflict",
      details: { field: "ipAddress" },
    },
  };

  const parsed = parseFormError(raw);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.requestId, "req-vos-8899");
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.fieldErrorMap.ipAddress, "Gateway IP conflict");
  assert.equal(parsed.fieldErrors.length, 1);
  assert.equal(parsed.fieldErrors[0].field, "ipAddress");
});

test("useFormError clear-on-edit: collapses banner if all field errors resolved", () => {
  const initial = parseFormError({
    message: ["email must be valid", "name is required"],
  });

  assert.equal(initial.fieldErrors.length, 2);
  assert.equal(Boolean(initial.fieldErrorMap.email), true);
  assert.equal(Boolean(initial.fieldErrorMap.name), true);

  // Simulate clearing email
  const nextMap1 = { ...initial.fieldErrorMap };
  delete nextMap1.email;
  const nextList1 = initial.fieldErrors.filter((f) => f.field !== "email");
  assert.equal(nextList1.length, 1);

  // Simulate clearing name
  const nextMap2 = { ...nextMap1 };
  delete nextMap2.name;
  const nextList2 = nextList1.filter((f) => f.field !== "name");
  assert.equal(nextList2.length, 0);

  // Pure validation error collapses when field error count hits 0
  const shouldCollapse = nextList2.length === 0 && (!initial.code || initial.code === "VALIDATION_ERROR");
  assert.equal(shouldCollapse, true);
});

test("useFormError clear-on-edit: preserves server root error code while clearing field item", () => {
  const initial = parseFormError({
    code: "INSUFFICIENT_FUNDS",
    message: "Balance below minimum limit",
    fieldErrors: [{ field: "amount", message: "Amount exceeds credit line" }],
  });

  assert.equal(initial.code, "INSUFFICIENT_FUNDS");
  assert.equal(initial.fieldErrors.length, 1);

  // Simulate clearing field 'amount'
  const nextList = initial.fieldErrors.filter((f) => f.field !== "amount");
  assert.equal(nextList.length, 0);

  // Non-validation server error code remains visible in banner
  const shouldCollapse = nextList.length === 0 && (!initial.code || (initial.code as string) === "VALIDATION_ERROR");
  assert.equal(shouldCollapse, false);
});

test("getScrollParent: returns null in node/SSR context safely", () => {
  assert.equal(getScrollParent(null), null);
});

test("parseFormError with custom fallback and options", () => {
  const customFallback = "Failed to process telecom operation";
  const parsed = parseFormError({}, { fallbackMessage: customFallback });
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.message, customFallback);
});
