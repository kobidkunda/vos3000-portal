import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFormError } from "./form-error.js";

test("Auth Forms - Login: parses INVALID_CREDENTIALS error payload and derives field error", () => {
  const loginErrPayload = {
    ok: false,
    request_id: "req-auth-login-001",
    error: {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password. Check your credentials and try again.",
      details: { field: "email" },
    },
  };

  const parsed = parseFormError(loginErrPayload);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "INVALID_CREDENTIALS");
  assert.equal(parsed.requestId, "req-auth-login-001");
  assert.equal(parsed.fieldErrorMap.email, "Invalid email or password. Check your credentials and try again.");
  assert.equal(parsed.fieldErrors.length, 1);
});

test("Auth Forms - Login: parses RATE_LIMITED error payload with status 429", () => {
  const rateLimitErr = {
    ok: false,
    status: 429,
    request_id: "req-auth-rate-limit",
    error: {
      code: "RATE_LIMITED",
      message: "Too many sign-in attempts. Please wait a few minutes and try again.",
    },
  };

  const parsed = parseFormError(rateLimitErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "RATE_LIMITED");
  assert.equal(parsed.status, 429);
  assert.equal(parsed.message, "Too many sign-in attempts. Please wait a few minutes and try again.");
});

test("Auth Forms - Registration: parses duplicate email error into email field highlight", () => {
  const regErr = {
    ok: false,
    status: 409,
    error: {
      code: "USER_EXISTS",
      message: "An account with this email already exists",
      details: { field: "email" },
    },
  };

  const parsed = parseFormError(regErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "USER_EXISTS");
  assert.equal(parsed.fieldErrorMap.email, "An account with this email already exists");
  assert.equal(parsed.fieldErrors.length, 1);
});

test("Auth Forms - Registration: parses multi-field validation error list", () => {
  const regValidationErr = {
    code: "VALIDATION_ERROR",
    message: "Please correct the highlighted form errors.",
    fieldErrors: [
      { field: "orgName", message: "Organization name is required" },
      { field: "email", message: "Enter a valid email address" },
      { field: "phone", message: "Enter a valid phone number" },
      { field: "password", message: "Password must be at least 10 characters" },
      { field: "confirmPassword", message: "Passwords do not match" },
    ],
  };

  const parsed = parseFormError(regValidationErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrors.length, 5);
  assert.equal(parsed.fieldErrorMap.orgName, "Organization name is required");
  assert.equal(parsed.fieldErrorMap.email, "Enter a valid email address");
  assert.equal(parsed.fieldErrorMap.phone, "Enter a valid phone number");
  assert.equal(parsed.fieldErrorMap.password, "Password must be at least 10 characters");
  assert.equal(parsed.fieldErrorMap.confirmPassword, "Passwords do not match");
});

test("Auth Forms - MFA Challenge: parses INVALID_MFA code error", () => {
  const mfaErr = {
    ok: false,
    status: 400,
    request_id: "req-mfa-verify-400",
    error: {
      code: "INVALID_MFA",
      message: "MFA verification failed",
      details: {
        field: "code",
        message: "Invalid or expired code. Try again or use a recovery code.",
      },
    },
  };

  const parsed = parseFormError(mfaErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "INVALID_MFA");
  assert.equal(parsed.requestId, "req-mfa-verify-400");
  assert.equal(parsed.fieldErrorMap.code, "Invalid or expired code. Try again or use a recovery code.");
});

test("Auth Forms - Password Reset: parses INVALID_RESET_TOKEN error", () => {
  const resetErr = {
    ok: false,
    status: 400,
    error: {
      code: "INVALID_RESET_TOKEN",
      message: "Password reset failed",
      details: {
        field: "resetToken",
        message: "Invalid or expired token.",
      },
    },
  };

  const parsed = parseFormError(resetErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "INVALID_RESET_TOKEN");
  assert.equal(parsed.fieldErrorMap.resetToken, "Invalid or expired token.");
});

test("Auth Forms - MFA Setup: parses setup code verification failure", () => {
  const setupErr = {
    ok: false,
    status: 400,
    error: {
      code: "INVALID_CODE",
      message: "MFA verification failed",
      details: {
        field: "code",
        message: "Invalid code. Check your authenticator and try again.",
      },
    },
  };

  const parsed = parseFormError(setupErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.code, "INVALID_CODE");
  assert.equal(parsed.fieldErrorMap.code, "Invalid code. Check your authenticator and try again.");
});

test("Logout Page - parses session termination failure and preserves requestId", () => {
  const logoutErr = {
    message: "Failed to terminate session on server.",
    code: "LOGOUT_FAILED",
    status: 500,
    requestId: "req-logout-500",
  };

  const parsed = parseFormError(logoutErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.status, 500);
  assert.equal(parsed.requestId, "req-logout-500");
  assert.equal(parsed.message, "Failed to terminate session on server.");
});

test("Settings Archetype - 2FA TOTP: derives field error for totpCode", () => {
  const settingsErr = {
    code: "VALIDATION_ERROR",
    message: "Please correct the highlighted fields.",
    fieldErrors: [
      { field: "totpCode", message: "Please enter a valid 6-digit TOTP code." },
    ],
  };

  const parsed = parseFormError(settingsErr);
  assert.equal(parsed.hasError, true);
  assert.equal(parsed.fieldErrorMap.totpCode, "Please enter a valid 6-digit TOTP code.");
});
