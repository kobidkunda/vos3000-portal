import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormError } from "./form-error.js";
import { validateStep, createCustomerWizardSteps } from "./wizard.js";

/* ─────────────────────────────────────────────────────────────────────────────
 * 1. CreateCustomerForm — 7-Step Wizard Validation & Error Normalization
 * ───────────────────────────────────────────────────────────────────────────── */

test("CreateCustomerForm: Step 1 (Company/Profile) validation error normalization", () => {
  const steps = createCustomerWizardSteps();
  const step1 = steps[0];

  // Missing required organizationName
  const res = validateStep(step1, {});
  assert.equal(res.ok, false);
  assert.ok(res.errors.organizationName);

  const parsed = parseFormError({
    message: "Please fix the highlighted fields to continue to the next step.",
    code: "VALIDATION_ERROR",
    fieldErrors: Object.entries(res.errors).map(([field, message]) => ({ field, message })),
    fieldErrorMap: res.errors,
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.fieldErrors.length, 1);
  assert.equal(parsed.fieldErrorMap.organizationName, "Organization / customer name is required");
});

test("CreateCustomerForm: Step 2 (Portal Owner Email) validation error normalization", () => {
  const steps = createCustomerWizardSteps();
  const step2 = steps[1];

  // Invalid email format
  const res = validateStep(step2, { ownerEmail: "invalid-email-format" });
  assert.equal(res.ok, false);
  assert.ok(res.errors.ownerEmail);

  const parsed = parseFormError({
    message: "Please fix the highlighted fields to continue to the next step.",
    code: "VALIDATION_ERROR",
    fieldErrors: Object.entries(res.errors).map(([field, message]) => ({ field, message })),
    fieldErrorMap: res.errors,
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrorMap.ownerEmail, "Enter a valid email address");
});

test("CreateCustomerForm: POST /api/v1/admin/customers failure with VOS duplicate account error", () => {
  const apiErrorPayload = {
    ok: false,
    status: 409,
    request_id: "req-cust-create-409",
    error: {
      code: "VOS_ACCOUNT_EXISTS",
      message: "A VOS account with this identifier already exists in the partition.",
      details: {
        field: "vosAccountId",
        message: "Account ID 'VOS-9921' is already mapped to another tenant.",
      },
    },
  };

  const parsed = parseFormError(apiErrorPayload, {
    fallbackMessage: "Failed to create customer.",
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "VOS_ACCOUNT_EXISTS");
  assert.equal(parsed.status, 409);
  assert.equal(parsed.requestId, "req-cust-create-409");
  assert.equal(parsed.fieldErrorMap.vosAccountId, "Account ID 'VOS-9921' is already mapped to another tenant.");
});

test("CreateCustomerForm: Multi-field backend validation error list normalization", () => {
  const multiFieldError = {
    statusCode: 400,
    message: [
      "organizationName must be longer than 2 characters",
      "ownerEmail must be an email",
      "overdraftLimit must not be negative",
    ],
    error: "Bad Request",
    request_id: "req-cust-val-002",
  };

  const parsed = parseFormError(multiFieldError);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrors.length, 3);
  assert.equal(parsed.fieldErrorMap.organizationName, "organizationName must be longer than 2 characters");
  assert.equal(parsed.fieldErrorMap.ownerEmail, "ownerEmail must be an email");
  assert.equal(parsed.fieldErrorMap.overdraftLimit, "overdraftLimit must not be negative");
  assert.equal(parsed.requestId, "req-cust-val-002");
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 2. EditorFormArchetype — Configuration & Profile Editor Error Handling
 * ───────────────────────────────────────────────────────────────────────────── */

test("EditorFormArchetype: Validates required profile name and parses validation error", () => {
  const errs: Record<string, string> = {
    name: "Profile name is required",
  };

  const parsed = parseFormError({
    message: "Please complete all required fields before saving.",
    code: "VALIDATION_ERROR",
    fieldErrors: Object.entries(errs).map(([field, message]) => ({ field, message })),
    fieldErrorMap: errs,
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.message, "Please complete all required fields before saving.");
  assert.equal(parsed.fieldErrorMap.name, "Profile name is required");
});

test("EditorFormArchetype: Backend configuration conflict parsing with status 422", () => {
  const conflictPayload = {
    ok: false,
    status: 422,
    request_id: "req-editor-save-422",
    error: {
      code: "PREFIX_CONFLICT",
      message: "Prefix rule contains dial codes already claimed by another active routing profile.",
      details: {
        field: "prefixRule",
        message: "Prefix '1415' overlaps with Tier-1 US West Profile.",
      },
    },
  };

  const parsed = parseFormError(conflictPayload, {
    fallbackMessage: "Failed to save configuration profile.",
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "PREFIX_CONFLICT");
  assert.equal(parsed.status, 422);
  assert.equal(parsed.requestId, "req-editor-save-422");
  assert.equal(parsed.fieldErrorMap.prefixRule, "Prefix '1415' overlaps with Tier-1 US West Profile.");
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 3. FinanceActionArchetype — Crypto Deposit & Payment Validation
 * ───────────────────────────────────────────────────────────────────────────── */

test("FinanceActionArchetype: Minimum deposit amount validation error ($5.00 USD)", () => {
  const parsed = parseFormError({
    message: "Minimum crypto deposit amount is $5.00 USD.",
    code: "VALIDATION_ERROR",
    fieldErrors: [{ field: "amount", message: "Minimum crypto deposit amount is $5.00 USD." }],
    fieldErrorMap: { amount: "Minimum crypto deposit amount is $5.00 USD." },
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.message, "Minimum crypto deposit amount is $5.00 USD.");
  assert.equal(parsed.fieldErrorMap.amount, "Minimum crypto deposit amount is $5.00 USD.");
});

test("FinanceActionArchetype: NOWPayments API key / gateway timeout error normalization", () => {
  const timeoutErr = new Error("The operation was aborted due to timeout while contacting NOWPayments gateway.");
  const parsed = parseFormError(timeoutErr);

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "TIMEOUT");
  assert.ok(parsed.message.includes("timed out"));
});

test("FinanceActionArchetype: Simulation IPN webhook signature failure parsing", () => {
  const simErr = {
    ok: false,
    status: 400,
    error: {
      code: "INVALID_IPN_SIGNATURE",
      message: "HMAC-SHA512 signature verification failed for NOWPayments notification payload.",
    },
  };

  const parsed = parseFormError(simErr, { fallbackMessage: "Simulation failed." });
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "INVALID_IPN_SIGNATURE");
  assert.equal(parsed.message, "HMAC-SHA512 signature verification failed for NOWPayments notification payload.");
});

/* ─────────────────────────────────────────────────────────────────────────────
 * 4. ListTableArchetype — Admin Record Manual Payment Modal
 * ───────────────────────────────────────────────────────────────────────────── */

test("ListTableArchetype: Manual payment required field validation (customer, amount, memo)", () => {
  const errs: Record<string, string> = {
    customerId: "Please select a customer account.",
    amount: "Please enter a valid positive payment amount.",
    memo: "Internal memo / audit notes are required.",
  };

  const parsed = parseFormError({
    message: "Please correct the highlighted fields before proceeding.",
    code: "VALIDATION_ERROR",
    fieldErrors: Object.entries(errs).map(([field, message]) => ({ field, message })),
    fieldErrorMap: errs,
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "VALIDATION_ERROR");
  assert.equal(parsed.fieldErrors.length, 3);
  assert.equal(parsed.fieldErrorMap.customerId, "Please select a customer account.");
  assert.equal(parsed.fieldErrorMap.amount, "Please enter a valid positive payment amount.");
  assert.equal(parsed.fieldErrorMap.memo, "Internal memo / audit notes are required.");
});

test("ListTableArchetype: Manual payment idempotency or ledger conflict with status 409", () => {
  const manualPaymentErr = {
    ok: false,
    status: 409,
    request_id: "req-manual-pay-409",
    error: {
      code: "DUPLICATE_PAYMENT_REFERENCE",
      message: "External bank wire reference 'WIRE-2026-98124' was already recorded.",
      details: {
        field: "reference",
        message: "Duplicate reference string.",
      },
    },
  };

  const parsed = parseFormError(manualPaymentErr, {
    fallbackMessage: "Failed to record manual payment.",
  });

  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "DUPLICATE_PAYMENT_REFERENCE");
  assert.equal(parsed.requestId, "req-manual-pay-409");
  assert.equal(parsed.status, 409);
  assert.equal(parsed.fieldErrorMap.reference, "Duplicate reference string.");
});
