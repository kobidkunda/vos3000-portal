import test from "node:test";
import assert from "node:assert/strict";
import { parseTelecomPhone, getCountryName, normalizeTelecomString } from "../index.js";

test("parses standard US E.164 number", () => {
  const res = parseTelecomPhone("+14155552671");
  assert.equal(res.country, "US");
  assert.equal(res.countryCallingCode, "1");
  assert.equal(res.countryName, "United States");
  assert.equal(res.isPossible, true);
});

test("parses un-prefixed international dial strings", () => {
  const us = parseTelecomPhone("14155552671");
  assert.equal(us.country, "US");
  assert.equal(us.countryCallingCode, "1");

  const ind = parseTelecomPhone("919876543210");
  assert.equal(ind.country, "IN");
  assert.equal(ind.countryCallingCode, "91");
  assert.equal(ind.countryName, "India");

  const cn = parseTelecomPhone("8613800138000");
  assert.equal(cn.country, "CN");
  assert.equal(cn.countryCallingCode, "86");
  assert.equal(cn.countryName, "China");
});

test("parses international exit codes (00 and 011)", () => {
  const ae = parseTelecomPhone("00971501234567");
  assert.equal(ae.country, "AE");
  assert.equal(ae.countryCallingCode, "971");
  assert.equal(ae.countryName, "United Arab Emirates");

  const uk = parseTelecomPhone("011447911123456");
  assert.equal(uk.countryCallingCode, "44");
});

test("detects internal PBX extensions and non-E.164 strings", () => {
  const ext = parseTelecomPhone("8001");
  assert.equal(ext.isExtensionOrInternal, true);
  assert.equal(ext.country, undefined);

  const anon = parseTelecomPhone("Anonymous");
  assert.equal(anon.isValid, false);
  assert.equal(anon.country, undefined);

  const empty = parseTelecomPhone("");
  assert.equal(empty.country, undefined);
  assert.equal(empty.raw, "");
});

test("getCountryName fallback and ISO resolution", () => {
  assert.equal(getCountryName("US"), "United States");
  assert.equal(getCountryName("GB"), "United Kingdom");
  assert.equal(getCountryName("AE"), "United Arab Emirates");
  assert.equal(getCountryName("DE"), "Germany");
});
