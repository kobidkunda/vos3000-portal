import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormErrorAlert } from "../components/shared/FormErrorAlert.js";
import { parseFormError } from "./form-error.js";

test("Component 1: FormErrorAlert returns null when error is null or hasError=false", () => {
  const htmlNull = renderToStaticMarkup(<FormErrorAlert error={null} />);
  assert.equal(htmlNull, "");

  const htmlClean = renderToStaticMarkup(
    <FormErrorAlert
      error={{
        hasError: false,
        message: "",
        fieldErrors: [],
        fieldErrorMap: {},
        timestamp: new Date().toISOString(),
      }}
    />
  );
  assert.equal(htmlClean, "");
});

test("Component 2: FormErrorAlert renders standard accessible attributes (role, aria-live, aria-atomic)", () => {
  const html = renderToStaticMarkup(
    <FormErrorAlert error="Invalid telecom credentials provided" />
  );

  assert.ok(html.includes('role="alert"'), "Must have role=alert");
  assert.ok(html.includes('aria-live="assertive"'), "Must have aria-live=assertive");
  assert.ok(html.includes('aria-atomic="true"'), "Must have aria-atomic=true");
  assert.ok(html.includes("Invalid telecom credentials provided"), "Must render error message");
});

test("Component 3: FormErrorAlert renders Request ID and HTTP status badges", () => {
  const parsed = parseFormError({
    status: 503,
    request_id: "req-vos-998877",
    code: "GATEWAY_TIMEOUT",
    message: "Softswitch node is unreachable",
  });

  const html = renderToStaticMarkup(<FormErrorAlert error={parsed} />);
  assert.ok(html.includes("HTTP 503"), "Must render HTTP status badge");
  assert.ok(html.includes("GATEWAY_TIMEOUT"), "Must render error code badge");
  assert.ok(html.includes("req-vos-998877"), "Must render request ID");
  assert.ok(html.includes("Request ID:"), "Must render Request ID label");
});

test("Component 4: FormErrorAlert renders itemized field errors with labels", () => {
  const parsed = parseFormError({
    statusCode: 400,
    message: [
      { property: "configuredIp", constraints: { isIp: "Must be a valid IPv4" } },
      { property: "sipPort", constraints: { isPort: "Port must be 1-65535" } },
    ],
  });

  const html = renderToStaticMarkup(
    <FormErrorAlert
      error={parsed}
      fieldLabels={{ configuredIp: "Ingress IP Address", sipPort: "Trunk SIP Port" }}
    />
  );

  assert.ok(html.includes("Ingress IP Address"), "Must render transformed field label 1");
  assert.ok(html.includes("Trunk SIP Port"), "Must render transformed field label 2");
  assert.ok(html.includes("Must be a valid IPv4"), "Must render error message 1");
  assert.ok(html.includes("Port must be 1-65535"), "Must render error message 2");
});

test("Component 5: FormErrorAlert renders retry button and dismiss button when provided", () => {
  const html = renderToStaticMarkup(
    <FormErrorAlert
      error="Rate limit exceeded"
      onRetry={() => {}}
      onDismiss={() => {}}
    />
  );

  assert.ok(html.includes('aria-label="Retry submission"'), "Must render retry button");
  assert.ok(html.includes('aria-label="Dismiss error banner"'), "Must render dismiss button");
});
