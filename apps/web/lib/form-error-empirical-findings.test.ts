import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormError, resolveFieldLabel } from "./form-error.js";
import { useFormError } from "./use-form-error.js";

test("Vulnerability 1: NestJS regex treats English words as form field names", () => {
  const nestErrors = {
    statusCode: 400,
    message: [
      "Please enter a valid date",
      "Invalid username or password",
      "Cannot connect to carrier gateway",
      "The customer profile is disabled",
    ],
  };

  const parsed = parseFormError(nestErrors);
  assert.equal(parsed.fieldErrors.length, 4);

  // Notice how the first English word of arbitrary sentences became field names:
  assert.equal(parsed.fieldErrors[0].field, "Please");
  assert.equal(parsed.fieldErrors[1].field, "Invalid");
  assert.equal(parsed.fieldErrors[2].field, "Cannot");
  assert.equal(parsed.fieldErrors[3].field, "The");

  // Consequently, field labels are rendered as "Please", "Invalid", "Cannot", "The"
  assert.equal(resolveFieldLabel(parsed.fieldErrors[0].field), "Please");
  assert.equal(resolveFieldLabel(parsed.fieldErrors[1].field), "Invalid");
});

test("Vulnerability 2: RFC 7807 dict errors masking branch E", () => {
  // Wizard-style or direct error dictionary without detail/title
  const directDictError = {
    errors: {
      ownerEmail: "Owner email is required",
      companyName: "Company name is required",
    },
  };

  const parsed = parseFormError(directDictError);
  // Expected behavior according to Branch E comment:
  // message should be "Validation failed (2 issues)" or "Validation failed"
  // But because Branch D matches payload.errors before Branch E, message falls back to fallbackMessage:
  assert.equal(parsed.message, "An unexpected error occurred. Please try again.");
  // Notice the disconnect: 2 field errors were extracted, but the header banner says "An unexpected error occurred. Please try again."
  assert.equal(parsed.fieldErrors.length, 2);
});

test("Vulnerability 3: Empty error array in RFC errors results in string 'undefined'", () => {
  const rfcWithEmptyArray = {
    title: "Bad Request",
    errors: {
      gatewayIp: [],
    },
  };

  const parsed = parseFormError(rfcWithEmptyArray);
  assert.equal(parsed.fieldErrors.length, 1);
  assert.equal(parsed.fieldErrors[0].message, "undefined");
  assert.equal(parsed.fieldErrorMap.gatewayIp, "undefined");
});

test("Vulnerability 4: Field error with empty message breaks clearFieldError and aria-invalid", () => {
  const envelopeWithEmptyMsg = {
    ok: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: {
        errors: [{ field: "amount", message: "" }],
      },
    },
  };

  const parsed = parseFormError(envelopeWithEmptyMsg);
  assert.equal(parsed.fieldErrorMap.amount, "");

  // Simulating useFormError's clearFieldError logic:
  // if (!prev.fieldErrorMap[mappedField]) return prev;
  // Because fieldErrorMap.amount is "", !fieldErrorMap.amount is true, causing early return without clearing!
  const prev = parsed;
  const isPresentInMap = Boolean(prev.fieldErrorMap.amount);
  assert.equal(isPresentInMap, false); // Falsy!
});

test("Vulnerability 5: Fastify FST_ERR_VALIDATION does not collapse banner when field errors resolved", () => {
  const fastifyError = {
    statusCode: 400,
    code: "FST_ERR_VALIDATION",
    validation: [
      { keyword: "required", instancePath: "", params: { missingProperty: "email" } },
    ],
  };

  const parsed = parseFormError(fastifyError);
  assert.equal(parsed.code, "FST_ERR_VALIDATION");
  assert.equal(parsed.fieldErrors.length, 1);

  // When user fixes 'email':
  const nextList = parsed.fieldErrors.filter((f) => f.field !== "email");
  assert.equal(nextList.length, 0);

  // useFormError check:
  // if (nextList.length === 0 && (!prev.code || prev.code === "VALIDATION_ERROR")) -> collapses
  const willCollapse = nextList.length === 0 && (!parsed.code || (parsed.code as string) === "VALIDATION_ERROR");
  // Because parsed.code === "FST_ERR_VALIDATION" !== "VALIDATION_ERROR", it will NOT collapse!
  assert.equal(willCollapse, false);
});
