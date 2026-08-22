import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createCustomerWizardSteps,
  isStepComplete,
  validateStep,
  collectStepValues,
  buildCustomerPayload,
  formatWizardValue,
  featureFallbackSteps,
} from "./wizard.js";

const steps = createCustomerWizardSteps();

test("wizard defines the 7 spec steps F01..F08", () => {
  assert.equal(steps.length, 7);
  assert.deepEqual(
    steps.map((s) => s.title),
    ["Company / Profile", "Portal Owner", "VOS Account", "Billing", "Rate Group", "Capacity", "Review & Create"]
  );
  // Review step carries no fields
  assert.equal(steps[6].fields.length, 0);
});

test("step 1: company name is required", () => {
  const r = validateStep(steps[0], {});
  assert.equal(r.ok, false);
  assert.equal(r.errors.organizationName, "Organization / customer name is required");
  assert.equal(validateStep(steps[0], { organizationName: "  " }).ok, false);
  assert.equal(validateStep(steps[0], { organizationName: "Acme" }).ok, true);
});

test("step 2: owner email format is validated", () => {
  assert.equal(validateStep(steps[1], { ownerEmail: "not-an-email" }).ok, false);
  assert.equal(validateStep(steps[1], { ownerEmail: "owner@acme.tel" }).ok, true);
  assert.match(validateStep(steps[1], { ownerEmail: "bad" }).errors.ownerEmail, /valid email/);
});

test("step 3: VOS account id is optional and trimmed", () => {
  assert.equal(validateStep(steps[2], {}).ok, true);
  assert.equal(validateStep(steps[2], { vosAccountId: "10001" }).ok, true);
  const p = collectStepValues(steps[2], { vosAccountId: "  10001  " });
  assert.equal(p.vosAccountId, "10001");
});

test("step 4: billing rules — currency, non-negative overdraft, future expiry", () => {
  const billing = steps[3];
  // currency required
  assert.equal(validateStep(billing, { currency: "" }).ok, false);
  // currency must be 3 letters (lowercase is normalized to uppercase in the payload)
  assert.equal(validateStep(billing, { currency: "usd" }).ok, true);
  assert.equal(validateStep(billing, { currency: "US1" }).ok, false);
  assert.equal(validateStep(billing, { currency: "USDEUR" }).ok, false);
  assert.equal(validateStep(billing, { currency: "USD" }).ok, true);
  // negative overdraft rejected
  const neg = validateStep(billing, { currency: "USD", overdraftLimit: "-5" });
  assert.equal(neg.ok, false);
  assert.match(neg.errors.overdraftLimit, /negative/);
  // past expiry rejected
  const past = validateStep(billing, { currency: "USD", expiresAt: "2020-01-01" });
  assert.equal(past.ok, false);
  // future expiry accepted
  const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
  assert.equal(validateStep(billing, { currency: "USD", expiresAt: future }).ok, true);
});

test("step 5: rate group optional", () => {
  assert.equal(validateStep(steps[4], {}).ok, true);
  assert.equal(validateStep(steps[4], { rateGroupId: "RG-42" }).ok, true);
});

test("step 6: capacity limits must be whole non-negative numbers", () => {
  const cap = steps[5];
  assert.equal(validateStep(cap, {}).ok, true);
  const bad = validateStep(cap, { lineLimit: "12.5", cpsLimit: "-1" });
  assert.equal(bad.ok, false);
  assert.match(bad.errors.lineLimit, /whole number/);
  assert.match(bad.errors.cpsLimit, /negative/);
  assert.equal(validateStep(cap, { lineLimit: "32", cpsLimit: "10" }).ok, true);
});

test("step 7: review carries no fields and always validates", () => {
  assert.equal(validateStep(steps[6], {}).ok, true);
});

test("isStepComplete reflects required fields only", () => {
  assert.equal(isStepComplete(steps[0], {}), false);
  assert.equal(isStepComplete(steps[0], { organizationName: "X" }), true);
  // optional-only steps are complete
  assert.equal(isStepComplete(steps[2], {}), true);
});

test("buildCustomerPayload merges steps, uppercases currency, skips empties", () => {
  const values: Record<string, string> = {
    organizationName: "Acme Telecom",
    ownerEmail: "owner@acme.tel",
    vosAccountId: "",
    currency: "inr",
    overdraftLimit: "100.5",
    rateGroupId: "RG-1",
    lineLimit: "32",
    cpsLimit: undefined as unknown as string,
    expiresAt: "2030-01-01",
  };
  const body = buildCustomerPayload(steps, values);
  assert.deepEqual(body, {
    organizationName: "Acme Telecom",
    ownerEmail: "owner@acme.tel",
    currency: "INR",
    overdraftLimit: "100.5",
    rateGroupId: "RG-1",
    lineLimit: "32",
    expiresAt: "2030-01-01",
  });
});

test("formatWizardValue renders dates, numbers and placeholders", () => {
  const expiry = steps[3].fields.find((f) => f.name === "expiresAt")!;
  assert.equal(formatWizardValue(expiry, "2030-01-02"), new Date("2030-01-02").toLocaleDateString());
  assert.equal(formatWizardValue(expiry, ""), "—");
  const channels = steps[5].fields.find((f) => f.name === "lineLimit")!;
  assert.equal(formatWizardValue(channels, "32"), "32");
  assert.equal(formatWizardValue(channels, undefined), "—");
});

test("featureFallbackSteps parses manifest feature text", () => {
  const fb = featureFallbackSteps([
    "Step 1 company/profile",
    "Step 2 portal owner credentials",
    "Review-and-create screen",
  ]);
  assert.equal(fb.length, 2);
  assert.equal(fb[0].title, "company/profile");
  assert.equal(fb[1].title, "portal owner credentials");
  assert.equal(featureFallbackSteps([]).length, 1);
});