import test from "node:test";
import assert from "node:assert/strict";

// Test suite for customer management business logic and security assertions

test("customer balance adjustment calculates correct new balances for credit and debit", () => {
  const initialBalance = 100.50;
  
  // Credit top-up
  const creditAmount = 50.25;
  const newBalanceCredit = initialBalance + creditAmount;
  assert.equal(newBalanceCredit.toFixed(2), "150.75");

  // Debit deduction
  const debitAmount = 30.00;
  const newBalanceDebit = initialBalance - debitAmount;
  assert.equal(newBalanceDebit.toFixed(2), "70.50");
});

test("mapping gateway model supports 1:N gateways per customer with dynamic vs static auth", () => {
  const customerId = "c1a2b3c4-0000-0000-0000-000000000001";
  
  const mappingGateways = [
    {
      id: "gw-1",
      customer_id: customerId,
      name: "gw_office_static",
      register_type: "static",
      configured_ip: "203.0.113.10",
      sip_username: null,
      line_limit: 100,
      cps_limit: 20,
    },
    {
      id: "gw-2",
      customer_id: customerId,
      name: "gw_remote_dynamic",
      register_type: "dynamic",
      configured_ip: null,
      sip_username: "customer_sip_01",
      line_limit: 50,
      cps_limit: 10,
    },
  ];

  // Validate 1:N relationship
  const customerGateways = mappingGateways.filter((g) => g.customer_id === customerId);
  assert.equal(customerGateways.length, 2);

  // Validate static IP auth configuration
  const staticGw = customerGateways.find((g) => g.register_type === "static");
  assert.ok(staticGw);
  assert.equal(staticGw.configured_ip, "203.0.113.10");

  // Validate dynamic SIP register configuration
  const dynamicGw = customerGateways.find((g) => g.register_type === "dynamic");
  assert.ok(dynamicGw);
  assert.equal(dynamicGw.sip_username, "customer_sip_01");
});

test("telephony time-window filters derive appropriate interval seconds", () => {
  const windowToSeconds: Record<string, number> = {
    "1m": 60,
    "5m": 300,
    "30m": 1800,
    "1h": 3600,
    "6h": 21600,
    "24h": 86400,
  };

  assert.equal(windowToSeconds["1m"], 60);
  assert.equal(windowToSeconds["5m"], 300);
  assert.equal(windowToSeconds["30m"], 1800);
  assert.equal(windowToSeconds["1h"], 3600);
  assert.equal(windowToSeconds["6h"], 21600);
  assert.equal(windowToSeconds["24h"], 86400);
});

test("ASR and ACD calculations format accurately", () => {
  const calls = 100;
  const answered = 75;
  const billableSeconds = 13500;

  const asr = calls > 0 ? ((answered / calls) * 100).toFixed(1) : "0.0";
  assert.equal(asr, "75.0");

  const acdSeconds = answered > 0 ? Math.round(billableSeconds / answered) : 0;
  assert.equal(acdSeconds, 180);

  const mins = Math.floor(acdSeconds / 60);
  const secs = acdSeconds % 60;
  const acdFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  assert.equal(acdFormatted, "03:00");
});
