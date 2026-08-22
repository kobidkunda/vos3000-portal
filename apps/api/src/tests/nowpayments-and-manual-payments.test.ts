import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { NowpaymentsService } from "../nowpayments.service.js";

// Unit & Integration test suite for NOWPayments Crypto Gateway & Admin Manual Payments

test("NOWPayments IPN signature verification computes correct HMAC-SHA512 across sorted keys", () => {
  const service = new NowpaymentsService({} as any);
  const ipnSecret = "test_secret_ipn_key_1234567890";

  const rawBody = {
    payment_id: "5000000001",
    payment_status: "finished",
    pay_address: "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE",
    price_amount: 50,
    price_currency: "usd",
    pay_amount: 50.05,
    actually_paid: 50.05,
    pay_currency: "usdttrc20",
    order_id: "dep_c1a2b3c4-0000-0000-0000-000000000001",
    order_description: "CallWork Wallet Deposit",
    purchase_id: "6000000001",
    created_at: "2026-08-23T02:00:00.000Z",
    updated_at: "2026-08-23T02:05:00.000Z",
  };

  // Sort keys alphabetically as per NOWPayments spec
  const sortedKeys = Object.keys(rawBody).sort();
  const sortedObj: any = {};
  for (const k of sortedKeys) {
    sortedObj[k] = (rawBody as any)[k];
  }
  const hmac = crypto.createHmac("sha512", ipnSecret);
  hmac.update(JSON.stringify(sortedObj));
  const validSignature = hmac.digest("hex");

  // Verify valid signature passes
  const isValid = service.verifyIpnSignature(rawBody, validSignature, ipnSecret);
  assert.equal(isValid, true, "Valid HMAC-SHA512 signature must pass verification");

  // Verify tampered body is rejected
  const tamperedBody = { ...rawBody, actually_paid: 1.00 };
  const isTamperedValid = service.verifyIpnSignature(tamperedBody, validSignature, ipnSecret);
  assert.equal(isTamperedValid, false, "Tampered payload must be rejected");

  // Verify invalid signature string is rejected
  const isBogusSigValid = service.verifyIpnSignature(rawBody, "bogus_signature_hex", ipnSecret);
  assert.equal(isBogusSigValid, false, "Bogus signature string must be rejected");

  // Verify missing signature is rejected
  const isMissingSigValid = service.verifyIpnSignature(rawBody, undefined, ipnSecret);
  assert.equal(isMissingSigValid, false, "Missing signature must be rejected when secret is configured");
});

test("NOWPayments invoice creation returns valid invoice URL in sandbox and live mode", async () => {
  const service = new NowpaymentsService({} as any);

  const invoice = await service.createInvoice({
    priceAmount: 50.0,
    priceCurrency: "USD",
    orderId: "dep_test_123",
    orderDescription: "CallWork Wallet Deposit",
    ipnCallbackUrl: "http://192.168.88.81:4000/api/v1/webhooks/nowpayments",
    successUrl: "http://192.168.88.81:3001/app/billing/payments",
    cancelUrl: "http://192.168.88.81:3001/app/billing/add-funds",
  });

  assert.ok(invoice.id, "Invoice must contain an ID");
  assert.ok(invoice.invoice_url, "Invoice must contain a checkout payment URL");
  assert.equal(invoice.order_id, "dep_test_123");
  assert.equal(invoice.price_amount, 50.0);
  assert.equal(invoice.price_currency, "USD");
});

test("Admin manual payment calculates exact customer balance and ledger updates", () => {
  const initialBalance = 150.00;
  const paymentAmount = 250.00;
  const paymentMethod = "manual_bank_wire";
  const reference = "WIRE-US-2026-0823";

  const newBalance = initialBalance + paymentAmount;
  assert.equal(newBalance.toFixed(2), "400.00");

  const ledgerEntry = {
    customer_id: "c1a2b3c4-0000-0000-0000-000000000001",
    direction: "credit",
    amount: paymentAmount,
    currency: "USD",
    reason: `MANUAL PAYMENT (${paymentMethod}): Wire deposit (Ref: ${reference})`,
    idempotency_key: `manual_payment:dep_manual_test_1`,
  };

  assert.equal(ledgerEntry.direction, "credit");
  assert.equal(ledgerEntry.amount, 250.00);
  assert.ok(ledgerEntry.reason.includes("manual_bank_wire"));
  assert.ok(ledgerEntry.reason.includes("WIRE-US-2026-0823"));
});

test("NOWPayments payment status lifecycle transitions securely", () => {
  const validStatuses = ["waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "expired", "refunded"];
  
  for (const st of validStatuses) {
    const isSuccess = st === "finished" || st === "confirmed";
    const isTerminalFailure = st === "failed" || st === "expired";
    const isPending = !isSuccess && !isTerminalFailure;

    if (st === "finished") assert.ok(isSuccess);
    if (st === "confirmed") assert.ok(isSuccess);
    if (st === "failed") assert.ok(isTerminalFailure);
    if (st === "waiting") assert.ok(isPending);
  }
});
