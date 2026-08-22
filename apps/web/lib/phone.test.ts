import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTelecomPhone, getCountryName, normalizeTelecomString } from "@vos/shared";
import * as Flags from "country-flag-icons/react/3x2";

test("parses diverse international telecom numbers correctly", () => {
  const cases: Array<{ input: string; expectedCountry: string; expectedPrefix: string }> = [
    { input: "+1 415 555 2671", expectedCountry: "US", expectedPrefix: "1" },
    { input: "+44 7911 123456", expectedCountry: "GG", expectedPrefix: "44" }, // or GB
    { input: "+91 98765 43210", expectedCountry: "IN", expectedPrefix: "91" },
    { input: "+86 138 0013 8000", expectedCountry: "CN", expectedPrefix: "86" },
    { input: "+971 50 123 4567", expectedCountry: "AE", expectedPrefix: "971" },
    { input: "+49 30 123456", expectedCountry: "DE", expectedPrefix: "49" },
    { input: "+33 1 42 68 53 00", expectedCountry: "FR", expectedPrefix: "33" },
    { input: "+81 3 1234 5678", expectedCountry: "JP", expectedPrefix: "81" },
    { input: "+65 6123 4567", expectedCountry: "SG", expectedPrefix: "65" },
    { input: "+61 2 9876 5432", expectedCountry: "AU", expectedPrefix: "61" },
  ];

  for (const c of cases) {
    const res = parseTelecomPhone(c.input);
    assert.ok(res.country, `Expected country for ${c.input}`);
    assert.equal(res.countryCallingCode, c.expectedPrefix);
    assert.ok(res.countryName, `Expected country name for ${c.input}`);
    // Check that SVG component exists in Flags
    const FlagComp = (Flags as Record<string, any>)[res.country!];
    assert.equal(typeof FlagComp, "function", `Flag SVG component should exist for ${res.country}`);
  }
});

test("handles raw digits without '+' prefix", () => {
  const us = parseTelecomPhone("14155552671");
  assert.equal(us.country, "US");
  assert.equal(us.countryCallingCode, "1");

  const ind = parseTelecomPhone("919876543210");
  assert.equal(ind.country, "IN");
  assert.equal(ind.countryCallingCode, "91");
});

test("handles international exit prefixes (00 / 011)", () => {
  const ae = parseTelecomPhone("00971501234567");
  assert.equal(ae.country, "AE");
  assert.equal(ae.countryCallingCode, "971");

  const uk = parseTelecomPhone("011447911123456");
  assert.equal(uk.countryCallingCode, "44");
});

test("safely handles PBX extensions, anonymous calls, and null values", () => {
  const ext = parseTelecomPhone("8001");
  assert.equal(ext.isExtensionOrInternal, true);
  assert.equal(ext.country, undefined);

  const anon = parseTelecomPhone("Anonymous");
  assert.equal(anon.isValid, false);
  assert.equal(anon.country, undefined);

  const empty = parseTelecomPhone("");
  assert.equal(empty.country, undefined);

  const nullVal = parseTelecomPhone(null);
  assert.equal(nullVal.country, undefined);
});
