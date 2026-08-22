import test from "node:test";
import assert from "node:assert/strict";
import {
  RateManagementService,
  DecimalUtil,
  RatePrefixTrie,
  detectGroupOverlaps,
  HEADER_ALIASES,
} from "../rate-management.service.js";

// ============================================================================
// ADVERSARIAL CHALLENGER SUITE: Prefix Engine & Ingestion Stress
// ============================================================================

// ----------------------------------------------------------------------------
// SUITE 1: Deep Prefix Nesting, Radix Trie & Collision Engine Boundary Stress
// ----------------------------------------------------------------------------

test("ADV-TRIE-01: Deep Prefix Nesting (Depth 1 to 25)", () => {
  const trie = new RatePrefixTrie<{ depth: number; rate: string }>();
  let currentPrefix = "";
  const baseDigits = "1415555123456789012345"; // 22 digits

  // Build continuous nesting: 1, 14, 141, 1415, ..., 1415555123456789012345
  for (let i = 0; i < baseDigits.length; i++) {
    currentPrefix += baseDigits[i];
    trie.insert(currentPrefix, {
      depth: i + 1,
      rate: DecimalUtil.div(String(i + 1), "100", 8),
    });
  }

  // Exact matching at deepest level
  const fullDial = "+" + baseDigits + "9999";
  const matchFull = trie.longestPrefixMatch(fullDial);
  assert.ok(matchFull, "Should match deepest prefix");
  assert.equal(matchFull.prefix, baseDigits);
  assert.equal(matchFull.data.depth, baseDigits.length);

  // Partial match at intermediate depth 4 ("1415")
  const match4 = trie.longestPrefixMatch("+14150000000");
  assert.ok(match4);
  assert.equal(match4.prefix, "1415");
  assert.equal(match4.data.depth, 4);

  // Match at shallow depth 1 ("1")
  const match1 = trie.longestPrefixMatch("+19999999999");
  assert.ok(match1);
  assert.equal(match1.prefix, "1");
  assert.equal(match1.data.depth, 1);

  // No match for different country
  const matchNone = trie.longestPrefixMatch("+442071234567");
  assert.equal(matchNone, null);
});

test("ADV-TRIE-02: Duplicate Prefix Ingestion with Overwriting Semantics", () => {
  const trie = new RatePrefixTrie<{ rate: string; version: number }>();

  trie.insert("1415", { rate: "0.01000000", version: 1 });
  let match = trie.longestPrefixMatch("14155551234");
  assert.equal(match?.data.rate, "0.01000000");
  assert.equal(match?.data.version, 1);

  // Overwrite prefix with new rate
  trie.insert("1415", { rate: "0.02500000", version: 2 });
  match = trie.longestPrefixMatch("14155551234");
  assert.equal(match?.data.rate, "0.02500000");
  assert.equal(match?.data.version, 2);

  // Overwrite with third rate
  trie.insert("+1 (415)", { rate: "0.03000000", version: 3 });
  match = trie.longestPrefixMatch("+14155551234");
  assert.equal(match?.data.rate, "0.03000000");
  assert.equal(match?.data.version, 3);
});

test("ADV-TRIE-03: Invalid, Non-Numeric, and Empty Prefix Edge Cases", () => {
  const trie = new RatePrefixTrie<string>();

  // Empty or pure non-numeric insertions should be safely ignored
  trie.insert("", "empty");
  trie.insert("   ", "spaces");
  trie.insert("+++", "plus_only");
  trie.insert("abc", "alpha_only");
  trie.insert("@#$%^&*", "symbols");

  assert.equal(trie.longestPrefixMatch(""), null);
  assert.equal(trie.longestPrefixMatch("   "), null);
  assert.equal(trie.longestPrefixMatch("abc"), null);
  assert.equal(trie.longestPrefixMatch("1415"), null);

  // Insert valid and query with messy dial string
  trie.insert("1415", "San Francisco");
  assert.equal(trie.longestPrefixMatch("1-415-555-2671")?.data, "San Francisco");
  assert.equal(trie.longestPrefixMatch("+1 (415) 555-2671")?.data, "San Francisco");
  assert.equal(trie.longestPrefixMatch("sip:14155552671@proxy.com:5060")?.data, "San Francisco");
});

test("ADV-TRIE-04: getAllDescendants Boundary & Tree Traversal", () => {
  const trie = new RatePrefixTrie<string>();
  trie.insert("1", "US Root");
  trie.insert("14", "US Region 4");
  trie.insert("1415", "US SF");
  trie.insert("1415555", "US SF Local");
  trie.insert("1415556", "US SF Local 2");
  trie.insert("1212", "US NYC");
  trie.insert("44", "UK Root");

  // Descendants of "14" should be "1415", "1415555", "1415556"
  const d14 = trie.getAllDescendants("14");
  assert.equal(d14.length, 3);
  const d14Prefixes = d14.map((d) => d.prefix).sort();
  assert.deepEqual(d14Prefixes, ["1415", "1415555", "1415556"]);

  // Descendants of leaf node "1415555" should be empty
  const dLeaf = trie.getAllDescendants("1415555");
  assert.equal(dLeaf.length, 0);

  // Descendants of nonexistent prefix "99" should be empty
  const dNon = trie.getAllDescendants("99");
  assert.equal(dNon.length, 0);
});

test("ADV-COLLISION-01: Multi-Level Collision Hierarchy & Inversion Detection", () => {
  const rates = [
    { prefix: "1", data: { rate_per_minute: "0.01000000", area_name: "USA" } },
    { prefix: "14", data: { rate_per_minute: "0.01200000", area_name: "USA Zone 4" } },
    { prefix: "1415", data: { rate_per_minute: "0.01500000", area_name: "USA SF" } },
    { prefix: "1415555", data: { rate_per_minute: "0.08000000", area_name: "USA SF High Spike" } }, // 0.08 > 0.015 * 5 -> Inversion (5.33x)
    { prefix: "1415556", data: { rate_per_minute: "0.00200000", area_name: "USA SF Crash" } }, // 0.002 < 0.015 * 0.2 -> Inversion (0.133x)
    { prefix: "1415557", data: { rate_per_minute: "0.07000000", area_name: "USA SF Normal High" } }, // 0.07 <= 0.015 * 5 -> Not an inversion (4.66x)
  ];

  const overlaps = detectGroupOverlaps(rates);

  // Check SF High Spike (5.33x parent rate)
  const spike = overlaps.find((o) => o.prefix === "1415555");
  assert.ok(spike);
  assert.equal(spike.is_rate_inversion, true);
  assert.equal(spike.parent_prefixes.length, 3); // 1, 14, 1415

  // Check SF Crash (0.133x parent rate)
  const crash = overlaps.find((o) => o.prefix === "1415556");
  assert.ok(crash);
  assert.equal(crash.is_rate_inversion, true);

  // Check SF Normal High (4.66x parent rate)
  const normalHigh = overlaps.find((o) => o.prefix === "1415557");
  assert.ok(normalHigh);
  assert.equal(normalHigh.is_rate_inversion, false);

  // Check Root "1" has child prefixes
  const rootNode = overlaps.find((o) => o.prefix === "1");
  assert.ok(rootNode);
  assert.equal(rootNode.parent_prefixes.length, 0);
  assert.equal(rootNode.child_prefixes.length, 5);
});

// ----------------------------------------------------------------------------
// SUITE 2: CSV Parsing, Delimiters, Malformed Inputs & Dry-Run Diff Engine
// ----------------------------------------------------------------------------

test("ADV-CSV-01: Delimiter Stress Test (Comma, Semicolon, Tab, Pipe, and Mixed Content)", () => {
  const engine = new RateManagementService({} as any);

  // 1. Tab delimited with spaces and symbols in descriptions
  const tabContent = [
    "Prefix\tDestination\tRate\tBilling Increment",
    "1415\tUSA San Francisco, CA (Tier 1)\t0.01500000\t60/1",
    "4420\tUK London; Greater Area\t0.02000000\t60/1",
    "331\tFrance Paris | Metropolitan\t0.01800000\t60/1",
  ].join("\n");
  assert.equal(engine.detectDelimiter(tabContent), "\t");
  const parsedTab = engine.parseCsvRows(tabContent);
  assert.equal(parsedTab.rows.length, 3);
  assert.equal(parsedTab.rows[0].area_name, "USA San Francisco, CA (Tier 1)");
  assert.equal(parsedTab.rows[1].area_name, "UK London; Greater Area");
  assert.equal(parsedTab.rows[2].area_name, "France Paris | Metropolitan");

  // 2. Pipe delimited with commas inside
  const pipeContent = [
    "Prefix|Destination|Rate|Interval",
    "1212|New York, NY|0.01250000|60/1",
    "1312|Chicago, IL|0.01300000|60/1",
  ].join("\n");
  assert.equal(engine.detectDelimiter(pipeContent), "|");
  const parsedPipe = engine.parseCsvRows(pipeContent);
  assert.equal(parsedPipe.rows.length, 2);
  assert.equal(parsedPipe.rows[0].area_name, "New York, NY");

  // 3. Semicolon delimited
  const semiContent = [
    "Prefix;Destination;Rate;Interval",
    "49;Germany;0.01800000;60/1",
    "39;Italy;0.02200000;60/1",
  ].join("\n");
  assert.equal(engine.detectDelimiter(semiContent), ";");
  const parsedSemi = engine.parseCsvRows(semiContent);
  assert.equal(parsedSemi.rows.length, 2);
  assert.equal(parsedSemi.rows[0].prefix, "49");
});

test("ADV-CSV-02: Quoted Values with Embedded Delimiters and Quotes", () => {
  const engine = new RateManagementService({} as any);

  const quotedCsv = [
    'Prefix,Destination,Rate,Interval',
    '"1415","San Francisco, CA, USA","0.0150","60/1"',
    '"4420","London, "Central" Area","0.0220","60/1"',
    '"81","Tokyo, Japan","0.0350","1/1"',
  ].join('\n');

  const parsed = engine.parseCsvRows(quotedCsv);
  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0].prefix, "1415");
  assert.equal(parsed.rows[0].area_name, "San Francisco, CA, USA");
  assert.equal(parsed.rows[0].rate_per_minute, "0.01500000");
  assert.equal(parsed.rows[1].prefix, "4420");
  assert.equal(parsed.rows[2].initial_interval, 1);
  assert.equal(parsed.rows[2].increment_interval, 1);
});

test("ADV-CSV-03: Header Synonyms, Case Insensitivity, and Custom Mapping", () => {
  const engine = new RateManagementService({} as any);

  // Headers using various international and non-standard synonyms
  const exoticHeadersCsv = [
    "DIAL_PREFIX,COUNTRY_NAME,TARIFF,MIN_SEC,STEP_SEC,STATE",
    "34,Spain,0.01750000,30,6,active",
    "351,Portugal,0.02100000,60,1,disabled",
  ].join("\n");

  const parsed = engine.parseCsvRows(exoticHeadersCsv);
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].prefix, "34");
  assert.equal(parsed.rows[0].area_name, "Spain");
  assert.equal(parsed.rows[0].rate_per_minute, "0.01750000");
  assert.equal(parsed.rows[0].initial_interval, 30);
  assert.equal(parsed.rows[0].increment_interval, 6);
  assert.equal(parsed.rows[0].status, "active");

  assert.equal(parsed.rows[1].prefix, "351");
  assert.equal(parsed.rows[1].status, "inactive");
});

test("ADV-CSV-04: Malformed Rows, Negative Rates, Exceeded Length & Sanitization", () => {
  const engine = new RateManagementService({} as any);

  const dirtyCsv = [
    "Prefix,Destination,Rate,Interval",
    "1415,Valid SF,0.0150,60/1", // 1. Valid
    "14A5,Invalid Prefix Letters,0.0100,60/1", // 2. Error: non-numeric in prefix
    "44,Negative Rate,-0.0200,60/1", // 3. Error: negative rate
    ",Missing Prefix,0.0500,60/1", // 4. Error: empty prefix
    "86,Invalid Rate Text,FREE,60/1", // 5. Error: non-numeric rate
    "9999999999999999999999999999999999999,Prefix Over 32 Digits,0.0500,60/1", // 6. Error: > 32 digits
    "33,Valid France,$0.0180,60/1", // 7. Valid: currency symbol stripped
    "1212,Valid NYC,0.00000000,60/1", // 8. Valid: zero rate
  ].join("\n");

  const parsed = engine.parseCsvRows(dirtyCsv);
  assert.equal(parsed.rows.length, 8);

  const errors = parsed.rows.filter((r) => r.error);
  assert.equal(errors.length, 5);

  const valid = parsed.rows.filter((r) => !r.error);
  assert.equal(valid.length, 3);
  assert.equal(valid[0].prefix, "1415");
  assert.equal(valid[1].prefix, "33");
  assert.equal(valid[1].rate_per_minute, "0.01800000");
  assert.equal(valid[2].prefix, "1212");
  assert.equal(valid[2].rate_per_minute, "0.00000000");
});

test("ADV-DIFF-01: Comprehensive Dry-Run Diff in Merge vs Replace Modes", () => {
  const engine = new RateManagementService({} as any);

  const existingRates = [
    { prefix: "1", rate_per_minute: "0.01000000", area_name: "USA", initial_interval: 60, increment_interval: 1 },
    { prefix: "1415", rate_per_minute: "0.01500000", area_name: "USA SF", initial_interval: 60, increment_interval: 1 },
    { prefix: "44", rate_per_minute: "0.02000000", area_name: "UK", initial_interval: 60, increment_interval: 1 },
    { prefix: "4420", rate_per_minute: "0.02500000", area_name: "UK London", initial_interval: 60, increment_interval: 1 },
    { prefix: "86", rate_per_minute: "0.03000000", area_name: "China", initial_interval: 60, increment_interval: 1 },
  ];

  // Incoming sheet:
  // - "1": unchanged (0.01000000, USA)
  // - "1415": updated rate (0.01800000)
  // - "44": updated area name ("UK Proper")
  // - "4420": updated interval (30/6)
  // - "33": added (new prefix)
  // - "99A": error (invalid prefix)
  // - "86": omitted from sheet
  const newSheet = [
    "Prefix,Destination,Rate,Interval",
    "1,USA,0.01000000,60/1",
    "1415,USA SF,0.01800000,60/1",
    "44,UK Proper,0.02000000,60/1",
    "4420,UK London,0.02500000,30/6",
    "33,France,0.02200000,60/1",
    "99A,Bad Prefix,0.05000000,60/1",
  ].join("\n");

  const parsed = engine.parseCsvRows(newSheet);
  assert.equal(parsed.rows.length, 6);

  // 1. Test Merge Mode
  const diffMerge = engine.calculateDryRunDiff(existingRates, parsed.rows, "merge");
  assert.equal(diffMerge.summary.total_rows, 6);
  assert.equal(diffMerge.summary.valid_rows, 5);
  assert.equal(diffMerge.summary.unchanged, 1); // "1"
  assert.equal(diffMerge.summary.updated, 3); // "1415", "44", "4420"
  assert.equal(diffMerge.summary.added, 1); // "33"
  assert.equal(diffMerge.summary.deleted, 0); // merge never deletes
  assert.equal(diffMerge.summary.errors, 1); // "99A"

  // 2. Test Replace Mode
  const diffReplace = engine.calculateDryRunDiff(existingRates, parsed.rows, "replace");
  assert.equal(diffReplace.summary.total_rows, 6);
  assert.equal(diffReplace.summary.valid_rows, 5);
  assert.equal(diffReplace.summary.unchanged, 1);
  assert.equal(diffReplace.summary.updated, 3);
  assert.equal(diffReplace.summary.added, 1);
  assert.equal(diffReplace.summary.deleted, 1); // "86" omitted -> deleted
  assert.equal(diffReplace.summary.errors, 1);
});

// ----------------------------------------------------------------------------
// SUITE 3: DecimalUtil Fixed-Point Arithmetic (8 Decimals) Stress & Oracles
// ----------------------------------------------------------------------------

test("ADV-DEC-01: DecimalUtil Exact Arithmetic & Boundary Precision", () => {
  // 1. Sub-penny precision (8 decimals)
  const a = "0.00000001";
  const b = "0.00000002";
  assert.equal(DecimalUtil.add(a, b, 8), "0.00000003");
  assert.equal(DecimalUtil.sub(b, a, 8), "0.00000001");

  // 2. Multiplication scale reduction
  // 0.0001 * 0.0001 = 0.00000001
  assert.equal(DecimalUtil.mul("0.00010000", "0.00010000", 8), "0.00000001");

  // 3. Division repeating decimal truncation (1 / 3 = 0.33333333)
  assert.equal(DecimalUtil.div("1", "3", 8), "0.33333333");
  assert.equal(DecimalUtil.div("2", "3", 8), "0.66666666");

  // 4. Division by zero fail-safe
  assert.equal(DecimalUtil.div("1.50000000", "0", 8), "0.00000000");
  assert.equal(DecimalUtil.div("1.50000000", "0.00000000", 8), "0.00000000");

  // 5. Large value rating arithmetic: 10,000,000 min @ $0.01234567 = $123,456.70000000
  const largeMin = DecimalUtil.mul("10000000", "0.01234567", 8);
  assert.equal(largeMin, "123456.70000000");

  // 6. Negative values subtraction
  const negSub = DecimalUtil.sub("0.00500000", "0.01000000", 8);
  assert.equal(negSub, "-0.00500000");
});

test("ADV-DEC-02: Multipliers, Fixed Deltas and Underflow Clamping", () => {
  // 1. Multiplier +50%
  assert.equal(DecimalUtil.applyMultiplier("0.02000000", "50", 8), "0.03000000");

  // 2. Multiplier -20%
  assert.equal(DecimalUtil.applyMultiplier("0.02000000", "-20", 8), "0.01600000");

  // 3. Multiplier -100% -> zero
  assert.equal(DecimalUtil.applyMultiplier("0.02000000", "-100", 8), "0.00000000");

  // 4. Multiplier -150% -> clamped to zero (never negative rate)
  assert.equal(DecimalUtil.applyMultiplier("0.02000000", "-150", 8), "0.00000000");

  // 5. Fixed Delta +$0.005
  assert.equal(DecimalUtil.applyFixedDelta("0.02000000", "0.00500000", 8), "0.02500000");

  // 6. Fixed Delta -$0.030 on $0.020 rate -> clamped to zero
  assert.equal(DecimalUtil.applyFixedDelta("0.02000000", "-0.03000000", 8), "0.00000000");
});

test("ADV-DEC-03: Fuzzing Arithmetic Properties with BigInt Ground Truth (500 Random Iterations)", () => {
  // Test invariant: (A + B) - B == A for any 8-decimal numbers
  for (let i = 0; i < 500; i++) {
    const aNum = (Math.random() * 1000).toFixed(8);
    const bNum = (Math.random() * 1000).toFixed(8);

    const sum = DecimalUtil.add(aNum, bNum, 8);
    const backToA = DecimalUtil.sub(sum, bNum, 8);

    assert.equal(
      backToA,
      aNum,
      `Addition/subtraction invariant failed for A=${aNum}, B=${bNum}, sum=${sum}, result=${backToA}`
    );
  }
});

// ----------------------------------------------------------------------------
// SUITE 4: Rating Duration, Billable Seconds & Margin Calculations
// ----------------------------------------------------------------------------

test("ADV-RATE-01: Non-Standard Telephony Billing Increments (18/6, 30/6, 45/15, 60/60)", () => {
  const engine = new RateManagementService({} as any);

  // 18/6 cycle (18 sec minimum, 6 sec subsequent)
  assert.equal(engine.calculateBillableSeconds(0, 18, 6), 0);
  assert.equal(engine.calculateBillableSeconds(1, 18, 6), 18);
  assert.equal(engine.calculateBillableSeconds(18, 18, 6), 18);
  assert.equal(engine.calculateBillableSeconds(19, 18, 6), 24);
  assert.equal(engine.calculateBillableSeconds(24, 18, 6), 24);
  assert.equal(engine.calculateBillableSeconds(25, 18, 6), 30);

  // 45/15 cycle
  assert.equal(engine.calculateBillableSeconds(45, 45, 15), 45);
  assert.equal(engine.calculateBillableSeconds(46, 45, 15), 60);
  assert.equal(engine.calculateBillableSeconds(60, 45, 15), 60);
  assert.equal(engine.calculateBillableSeconds(61, 45, 15), 75);

  // Extreme call: 24 hours (86,400 seconds) @ 60/1
  assert.equal(engine.calculateBillableSeconds(86400, 60, 1), 86400);

  // Exact call cost for 24 hours @ $0.015/min: (86400 / 60) * 0.015 = 1440 * 0.015 = $21.60000000
  const cost24h = engine.calculateCallCost(86400, "0.01500000", 60, 1);
  assert.equal(cost24h.billable_seconds, 86400);
  assert.equal(cost24h.total_cost, "21.60000000");
});

test("ADV-RATE-02: Margin Edge Cases (Zero Customer Rate, Zero Carrier Rate, Negative Margins)", () => {
  const engine = new RateManagementService({} as any);

  // 1. Standard positive margin: Cust $0.02, Carr $0.01 -> 50% margin
  const m1 = engine.calculateMargin("0.02000000", "0.01000000");
  assert.equal(m1.margin_percentage, 50.0);
  assert.equal(m1.is_profitable, true);

  // 2. Free customer service (Cust $0.00, Carr $0.01) -> -100% margin, unprofitable
  const m2 = engine.calculateMargin("0.00000000", "0.01000000");
  assert.equal(m2.margin_percentage, -100.0);
  assert.equal(m2.is_profitable, false);

  // 3. Free carrier termination (Cust $0.02, Carr $0.00) -> 100% margin, profitable
  const m3 = engine.calculateMargin("0.02000000", "0.00000000");
  assert.equal(m3.margin_percentage, 100.0);
  assert.equal(m3.is_profitable, true);

  // 4. Equal rates (Cust $0.02, Carr $0.02) -> 0% margin, profitable (break-even)
  const m4 = engine.calculateMargin("0.02000000", "0.02000000");
  assert.equal(m4.margin_percentage, 0.0);
  assert.equal(m4.is_profitable, true);
});

// ----------------------------------------------------------------------------
// SUITE 5: Scale, Performance & Ingestion Stress (2,000 Rows In-Memory)
// ----------------------------------------------------------------------------

test("ADV-SCALE-01: High-Volume Ingestion Parsing & Trie Performance (2,000 Rows)", () => {
  const engine = new RateManagementService({} as any);

  // Generate 2,000 CSV rate lines
  const header = "Prefix,Destination,Rate,Interval\n";
  const lines: string[] = [];
  for (let i = 1; i <= 2000; i++) {
    const prefix = `${10000 + i}`;
    const rate = (0.001 + (i % 100) * 0.0005).toFixed(8);
    lines.push(`${prefix},Area ${prefix},${rate},60/1`);
  }
  const largeCsv = header + lines.join("\n");

  const startParse = performance.now();
  const parsed = engine.parseCsvRows(largeCsv);
  const parseTime = performance.now() - startParse;

  assert.equal(parsed.rows.length, 2000);
  assert.ok(parseTime < 500, `Parse time ${parseTime.toFixed(2)}ms should be < 500ms`);

  // Build trie and test 5,000 lookups
  const trie = new RatePrefixTrie<{ rate: string }>();
  for (const row of parsed.rows) {
    trie.insert(row.prefix, { rate: row.rate_per_minute });
  }

  const startLookup = performance.now();
  for (let j = 1; j <= 5000; j++) {
    const testDial = `+${10000 + ((j % 2000) + 1)}987654`;
    const matched = trie.longestPrefixMatch(testDial);
    assert.ok(matched, `Should match dial ${testDial}`);
  }
  const lookupTime = performance.now() - startLookup;

  assert.ok(lookupTime < 200, `5,000 Lookups time ${lookupTime.toFixed(2)}ms should be < 200ms`);
});

// ----------------------------------------------------------------------------
// SUITE 6: Conflicting Duplicate Prefixes & Messy CSV Formats
// ----------------------------------------------------------------------------

test("ADV-CSV-05: Conflicting Duplicate Prefixes in Single Rate Sheet", () => {
  const engine = new RateManagementService({} as any);

  // File contains 3 entries for same prefix "1415" with escalating rates
  const duplicateCsv = [
    "Prefix,Destination,Rate,Interval",
    "1415,SF Initial,0.01000000,60/1",
    "1415,SF Override 1,0.02000000,60/1",
    "1415,SF Override 2,0.03000000,30/6",
    "44,UK Proper,0.01500000,60/1",
  ].join("\n");

  const parsed = engine.parseCsvRows(duplicateCsv);
  assert.equal(parsed.rows.length, 4);

  // Verify trie insertion semantics (last write wins)
  const trie = new RatePrefixTrie<{ rate: string; name: string }>();
  for (const row of parsed.rows) {
    trie.insert(row.prefix, { rate: row.rate_per_minute, name: row.area_name });
  }

  const match = trie.longestPrefixMatch("+14155552671");
  assert.ok(match);
  assert.equal(match.prefix, "1415");
  assert.equal(match.data.rate, "0.03000000");
  assert.equal(match.data.name, "SF Override 2");
});

test("ADV-CSV-06: Messy CSV Formats (Trailing commas, Extra columns, Varied line endings, Currency symbols)", () => {
  const engine = new RateManagementService({} as any);

  // Mixed CRLF, trailing delimiters, currencies, extra columns
  const messyCsv =
    "Prefix,Destination,Rate,Billing Increment,Extra1,Extra2\r\n" +
    '1415,"San Francisco, CA",$0.0150,60/1,foo,bar\r\n' +
    '44,"London | Central",€0.0220,60/1,,\r\n' +
    '81,"Tokyo, Japan",¥0.0350,1/1\n' +
    '91,"India, Mumbai",₹0.0080,60/1,\r\n';

  const parsed = engine.parseCsvRows(messyCsv);
  assert.equal(parsed.rows.length, 4);

  assert.equal(parsed.rows[0].prefix, "1415");
  assert.equal(parsed.rows[0].area_name, "San Francisco, CA");
  assert.equal(parsed.rows[0].rate_per_minute, "0.01500000");

  assert.equal(parsed.rows[1].prefix, "44");
  assert.equal(parsed.rows[1].rate_per_minute, "0.02200000");

  assert.equal(parsed.rows[2].prefix, "81");
  assert.equal(parsed.rows[2].rate_per_minute, "0.03500000");

  assert.equal(parsed.rows[3].prefix, "91");
  assert.equal(parsed.rows[3].rate_per_minute, "0.00800000");
});

// ----------------------------------------------------------------------------
// SUITE 7: Wide Branching Overlap Trees & Telecom E.164 Resolution
// ----------------------------------------------------------------------------

test("ADV-OVERLAP-02: Wide Branching Overlap Tree (1,000 Sibling Prefixes under 1 Root)", () => {
  const rates: Array<{ prefix: string; data: { rate_per_minute: string; area_name: string } }> = [
    { prefix: "1", data: { rate_per_minute: "0.01000000", area_name: "USA Root" } },
  ];

  for (let i = 0; i < 1000; i++) {
    const p = `1${String(i).padStart(3, "0")}`; // 1000 to 1999
    rates.push({
      prefix: p,
      data: { rate_per_minute: "0.01500000", area_name: `USA NPA ${p}` },
    });
  }

  const start = performance.now();
  const overlaps = detectGroupOverlaps(rates);
  const duration = performance.now() - start;

  assert.equal(overlaps.length, 1001);

  const root = overlaps.find((o) => o.prefix === "1");
  assert.ok(root);
  assert.equal(root.child_prefixes.length, 1000);
  assert.equal(root.parent_prefixes.length, 0);

  const child500 = overlaps.find((o) => o.prefix === "1500");
  assert.ok(child500);
  assert.equal(child500.parent_prefixes.length, 1);
  assert.equal(child500.parent_prefixes[0].prefix, "1");

  assert.ok(duration < 500, `Overlap calculation time ${duration.toFixed(2)}ms should be < 500ms`);
});

test("ADV-TEL-01: International Dialing Formats, Exit Codes & Country Resolution", () => {
  const engine = new RateManagementService({} as any);

  // 1. UK with 00 exit code
  const uk = engine.parseDestination("0044 20 7123 4567");
  assert.equal(uk.country_code, "GB");
  assert.equal(uk.country_name, "United Kingdom");
  assert.equal(uk.digits, "00442071234567");

  // 2. Japan with 011 exit code
  const jp = engine.parseDestination("011 81 3 1234 5678");
  assert.equal(jp.country_code, "JP");
  assert.equal(jp.country_name, "Japan");

  // 3. USA formatted phone
  const us = engine.parseDestination("+1 (415) 555-2671");
  assert.equal(us.country_code, "US");
  assert.equal(us.country_name, "United States");

  // 4. China formatted phone
  const cn = engine.parseDestination("+86 10 1234 5678");
  assert.equal(cn.country_code, "CN");
  assert.equal(cn.country_name, "China");
});

