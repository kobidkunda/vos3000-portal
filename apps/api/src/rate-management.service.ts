import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { parseTelecomPhone, getCountryName, normalizeTelecomString, type AuthContext } from "@vos/shared";
import { DataSourcesService } from "./data-sources.service.js";

// ---------------------------------------------------------------------------
// 1. Decimal Precision Utility (8 decimal places scale)
// ---------------------------------------------------------------------------
export class DecimalUtil {
  private static readonly SCALE = 100_000_000n; // 10^8
  private static readonly DECIMALS = 8;

  static from(val: string | number | bigint): bigint {
    if (typeof val === "bigint") return val * DecimalUtil.SCALE;
    let str = String(val).trim();
    if (!str || isNaN(Number(str))) {
      str = "0";
    }
    // Clean potential currency symbols or spaces
    str = str.replace(/[^0-9.-]/g, "");
    if (!str || isNaN(Number(str))) str = "0";
    const sign = str.startsWith("-") ? -1n : 1n;
    if (str.startsWith("-") || str.startsWith("+")) str = str.slice(1);
    const [intPart = "0", fracPart = ""] = str.split(".");
    const absInt = BigInt(intPart || "0");
    const paddedFrac = (fracPart + "00000000").slice(0, DecimalUtil.DECIMALS);
    return sign * (absInt * DecimalUtil.SCALE + BigInt(paddedFrac));
  }

  static toString(scaled: bigint, precision: number = 8): string {
    const isNeg = scaled < 0n;
    const abs = isNeg ? -scaled : scaled;
    const intPart = abs / DecimalUtil.SCALE;
    const fracPart = (abs % DecimalUtil.SCALE).toString().padStart(DecimalUtil.DECIMALS, "0");
    const truncatedFrac = fracPart.slice(0, Math.min(8, Math.max(0, precision)));
    if (precision === 0) return `${isNeg ? "-" : ""}${intPart}`;
    return `${isNeg ? "-" : ""}${intPart}.${truncatedFrac}`;
  }

  static add(a: string | number, b: string | number, precision: number = 8): string {
    return DecimalUtil.toString(DecimalUtil.from(a) + DecimalUtil.from(b), precision);
  }

  static sub(a: string | number, b: string | number, precision: number = 8): string {
    return DecimalUtil.toString(DecimalUtil.from(a) - DecimalUtil.from(b), precision);
  }

  static mul(a: string | number, b: string | number, precision: number = 8): string {
    const product = (DecimalUtil.from(a) * DecimalUtil.from(b)) / DecimalUtil.SCALE;
    return DecimalUtil.toString(product, precision);
  }

  static div(a: string | number, b: string | number, precision: number = 8): string {
    const divisor = DecimalUtil.from(b);
    if (divisor === 0n) return "0.00000000";
    const quotient = (DecimalUtil.from(a) * DecimalUtil.SCALE) / divisor;
    return DecimalUtil.toString(quotient, precision);
  }

  static round(val: string | number, decimals: number = 8): string {
    return DecimalUtil.toString(DecimalUtil.from(val), decimals);
  }

  static applyMultiplier(rate: string | number, multiplierPct: number | string, decimals: number = 8): string {
    const factor = DecimalUtil.add("1.0", DecimalUtil.div(multiplierPct, "100", 8), 8);
    const res = DecimalUtil.mul(rate, factor, decimals);
    if (DecimalUtil.from(res) < 0n) return DecimalUtil.toString(0n, decimals);
    return res;
  }

  static applyFixedDelta(rate: string | number, fixedDelta: number | string, decimals: number = 8): string {
    const res = DecimalUtil.add(rate, fixedDelta, decimals);
    if (DecimalUtil.from(res) < 0n) return DecimalUtil.toString(0n, decimals);
    return res;
  }
}

// ---------------------------------------------------------------------------
// 2. Radix Trie for In-Memory Longest-Prefix Matching & Collision Analysis
// ---------------------------------------------------------------------------
export interface RateTrieNode<T> {
  digit: string;
  isEnd: boolean;
  prefix?: string;
  data?: T;
  children: Map<string, RateTrieNode<T>>;
}

export class RatePrefixTrie<T> {
  private root: RateTrieNode<T> = { digit: "", isEnd: false, children: new Map() };

  insert(prefix: string, data: T): void {
    const clean = String(prefix).replace(/\D/g, "");
    if (!clean) return;
    let curr = this.root;
    for (const char of clean) {
      let next = curr.children.get(char);
      if (!next) {
        next = { digit: char, isEnd: false, children: new Map() };
        curr.children.set(char, next);
      }
      curr = next;
    }
    curr.isEnd = true;
    curr.prefix = clean;
    curr.data = data;
  }

  longestPrefixMatch(dialString: string): { prefix: string; data: T } | null {
    const clean = String(dialString).replace(/\D/g, "");
    let curr = this.root;
    let bestMatch: { prefix: string; data: T } | null = null;

    for (const char of clean) {
      const next = curr.children.get(char);
      if (!next) break;
      curr = next;
      if (curr.isEnd && curr.data !== undefined) {
        bestMatch = { prefix: curr.prefix!, data: curr.data };
      }
    }
    return bestMatch;
  }

  getAllDescendants(prefix: string): Array<{ prefix: string; data: T }> {
    const clean = String(prefix).replace(/\D/g, "");
    let curr = this.root;
    for (const char of clean) {
      const next = curr.children.get(char);
      if (!next) return [];
      curr = next;
    }
    const results: Array<{ prefix: string; data: T }> = [];
    const dfs = (node: RateTrieNode<T>) => {
      if (node.isEnd && node.prefix && node.data !== undefined && node.prefix !== clean) {
        results.push({ prefix: node.prefix, data: node.data });
      }
      for (const child of node.children.values()) {
        dfs(child);
      }
    };
    dfs(curr);
    return results;
  }
}

// ---------------------------------------------------------------------------
// 3. Collision & Overlap Interfaces
// ---------------------------------------------------------------------------
export interface PrefixOverlapItem {
  prefix: string;
  rate_per_minute: string;
  area_name?: string;
  parent_prefixes: Array<{ prefix: string; rate_per_minute: string; area_name?: string }>;
  child_prefixes: Array<{ prefix: string; rate_per_minute: string; area_name?: string }>;
  is_rate_inversion: boolean;
}

export function detectGroupOverlaps<T extends { rate_per_minute: string | number; area_name?: string }>(
  rates: Array<{ prefix: string; data: T }>
): PrefixOverlapItem[] {
  const trie = new RatePrefixTrie<T>();
  for (const r of rates) {
    trie.insert(r.prefix, r.data);
  }

  const results: PrefixOverlapItem[] = [];

  for (const r of rates) {
    const clean = r.prefix.replace(/\D/g, "");
    const parents: PrefixOverlapItem["parent_prefixes"] = [];

    // Ancestor Traversal
    for (let len = 1; len < clean.length; len++) {
      const sub = clean.slice(0, len);
      const match = trie.longestPrefixMatch(sub);
      if (match && match.prefix === sub) {
        parents.push({
          prefix: match.prefix,
          rate_per_minute: String(match.data.rate_per_minute),
          area_name: match.data.area_name,
        });
      }
    }

    // Descendants Traversal
    const childNodes = trie.getAllDescendants(clean);
    const children = childNodes.map((c) => ({
      prefix: c.prefix,
      rate_per_minute: String(c.data.rate_per_minute),
      area_name: c.data.area_name,
    }));

    let isRateInversion = false;
    if (parents.length > 0) {
      const nearestParent = parents[parents.length - 1];
      const parentRate = parseFloat(nearestParent.rate_per_minute);
      const currentRate = parseFloat(String(r.data.rate_per_minute));
      if (parentRate > 0 && (currentRate > parentRate * 5 || currentRate < parentRate * 0.2)) {
        isRateInversion = true;
      }
    }

    if (parents.length > 0 || children.length > 0) {
      results.push({
        prefix: clean,
        rate_per_minute: String(r.data.rate_per_minute),
        area_name: r.data.area_name,
        parent_prefixes: parents,
        child_prefixes: children,
        is_rate_inversion: isRateInversion,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 4. Ingestion Engine Types & Header Aliases
// ---------------------------------------------------------------------------
export const HEADER_ALIASES: Record<string, string[]> = {
  prefix: ["prefix", "dial_code", "dial_prefix", "code", "destination_code", "dest_code", "digits", "country_code", "dialcode", "destcode"],
  area_name: ["destination", "dest", "area", "area_name", "country", "country_name", "description", "desc", "destination_name", "areaname", "name"],
  rate_per_minute: ["rate", "rate_per_min", "rate_per_minute", "price", "cost", "charge", "tariff", "tarifa", "preis", "rate_usd", "pricepermin", "rateperminute"],
  interval: ["interval", "cycle", "billing_cycle", "increment", "pulse", "billing_increment", "min_duration", "billing_cycle_seconds", "billingcycle"],
  initial_interval: ["initial_interval", "initial", "first_interval", "min_sec", "initial_sec"],
  increment_interval: ["increment_interval", "increment", "subsequent_interval", "next_interval", "step_sec"],
  rate_type: ["rate_type", "type", "tariff_type", "time_band", "peak_type", "ratetype"],
  effective_date: ["effective_date", "effective", "start_date", "valid_from", "date", "effectivedate"],
  status: ["status", "state", "enabled", "active"]
};

export interface ParsedRateRow {
  row_number: number;
  prefix: string;
  country_code?: string;
  country_name?: string;
  area_name: string;
  rate_per_minute: string;
  billing_cycle_seconds: number;
  initial_interval: number;
  increment_interval: number;
  rate_type: string;
  effective_date: string;
  status: string;
  error?: string;
}

export interface RateDiffSummary {
  total_rows: number;
  valid_rows: number;
  added: number;
  updated: number;
  unchanged: number;
  deleted: number;
  errors: number;
  collisions: number;
}

export interface RateImportPreviewResult {
  summary: RateDiffSummary;
  preview_rows: Array<{
    row_number: number;
    prefix: string;
    country_code?: string;
    country_name?: string;
    area_name: string;
    rate_per_minute: string;
    initial_interval: number;
    increment_interval: number;
    action: "added" | "updated" | "unchanged" | "deleted";
    old_rate?: string | null;
    new_rate?: string | null;
  }>;
  validation_errors: Array<{
    row_number: number;
    prefix?: string;
    error: string;
  }>;
}

// ---------------------------------------------------------------------------
// 5. RateManagementService
// ---------------------------------------------------------------------------
@Injectable()
export class RateManagementService {
  constructor(
    @Inject(forwardRef(() => DataSourcesService))
    private ds: DataSourcesService
  ) {}

  // -------------------------------------------------------------------------
  // Longest-Prefix Matching & Telecom Country Resolution
  // -------------------------------------------------------------------------
  parseDestination(destination: string) {
    const raw = String(destination || "").trim();
    const { normalized, isExitCode } = normalizeTelecomString(raw);
    const parsedPhone = parseTelecomPhone(raw);
    const cleanDigits = raw.replace(/\D/g, "");
    return {
      raw,
      normalized,
      isExitCode,
      digits: cleanDigits,
      country_code: parsedPhone.country || (parsedPhone.countryCallingCode ? "US" : undefined),
      country_name: parsedPhone.countryName,
      calling_code: parsedPhone.countryCallingCode,
    };
  }

  calculateBillableSeconds(
    durationSeconds: number,
    initialInterval: number = 60,
    incrementInterval: number = 1
  ): number {
    const dur = Math.max(0, Math.trunc(durationSeconds || 0));
    if (dur <= 0) return 0;
    const init = Math.max(1, Math.trunc(initialInterval || 60));
    const incr = Math.max(1, Math.trunc(incrementInterval || 1));
    if (dur <= init) return init;
    const extra = dur - init;
    const steps = Math.ceil(extra / incr);
    return init + steps * incr;
  }

  parseIntervalString(intervalStr?: string | number): { initial_interval: number; increment_interval: number; billing_cycle_seconds: number } {
    if (intervalStr === undefined || intervalStr === null || intervalStr === "") {
      return { initial_interval: 60, increment_interval: 1, billing_cycle_seconds: 60 };
    }
    const str = String(intervalStr).trim();
    if (str.includes("/")) {
      const [initPart, incrPart] = str.split("/");
      const init = Math.max(1, parseInt(initPart, 10) || 60);
      const incr = Math.max(1, parseInt(incrPart, 10) || 1);
      return { initial_interval: init, increment_interval: incr, billing_cycle_seconds: init };
    }
    const num = Math.max(1, parseInt(str, 10) || 60);
    return { initial_interval: num, increment_interval: 1, billing_cycle_seconds: num };
  }

  calculateCallCost(
    durationSeconds: number,
    ratePerMinute: string | number,
    initialInterval: number = 60,
    incrementInterval: number = 1
  ): { billable_seconds: number; total_cost: string; rate_per_minute: string } {
    const billable_seconds = this.calculateBillableSeconds(durationSeconds, initialInterval, incrementInterval);
    const rateStr = DecimalUtil.round(ratePerMinute, 8);
    // Cost = (billable_seconds / 60) * ratePerMinute
    const minuteFraction = DecimalUtil.div(billable_seconds, 60, 8);
    const total_cost = DecimalUtil.mul(minuteFraction, rateStr, 8);
    return {
      billable_seconds,
      total_cost,
      rate_per_minute: rateStr,
    };
  }

  calculateMargin(
    customerRate: string | number,
    carrierRate: string | number,
    customerCost?: string | number,
    carrierCost?: string | number
  ): {
    rate_spread: string;
    cost_spread: string;
    margin_percentage: number;
    is_profitable: boolean;
  } {
    const custRateStr = DecimalUtil.round(customerRate, 8);
    const carrRateStr = DecimalUtil.round(carrierRate, 8);
    const rateSpread = DecimalUtil.sub(custRateStr, carrRateStr, 8);

    const custCostStr = customerCost !== undefined ? DecimalUtil.round(customerCost, 8) : custRateStr;
    const carrCostStr = carrierCost !== undefined ? DecimalUtil.round(carrierCost, 8) : carrRateStr;
    const costSpread = DecimalUtil.sub(custCostStr, carrCostStr, 8);

    const custRateNum = parseFloat(custRateStr);
    const carrRateNum = parseFloat(carrRateStr);

    let marginPct = 0;
    if (custRateNum > 0) {
      marginPct = Number((((custRateNum - carrRateNum) / custRateNum) * 100).toFixed(2));
    } else if (carrRateNum > 0) {
      marginPct = -100.0;
    }

    const isProfitable = DecimalUtil.from(costSpread) >= 0n && DecimalUtil.from(rateSpread) >= 0n;

    return {
      rate_spread: rateSpread,
      cost_spread: costSpread,
      margin_percentage: marginPct,
      is_profitable: isProfitable,
    };
  }

  // -------------------------------------------------------------------------
  // 4-Stage Ingestion Pipeline
  // -------------------------------------------------------------------------

  // Stage 1: Auto-Detect Delimiter
  detectDelimiter(fileContent: string): string {
    const lines = fileContent
      .replace(/\uFEFF/g, "")
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 15);

    if (lines.length === 0) return ",";

    const candidates = [",", ";", "\t", "|"];
    let bestDelimiter = ",";
    let maxScore = -1;

    for (const cand of candidates) {
      const counts = lines.map((line) => line.split(cand).length);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (avg <= 1) continue;
      // Variance
      const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
      // Higher column count and lower variance is better
      const score = avg * 10 - variance;
      if (score > maxScore) {
        maxScore = score;
        bestDelimiter = cand;
      }
    }
    return bestDelimiter;
  }

  // Stage 2: Dynamic Header Mapping & Row Sanitization
  parseCsvRows(
    fileContent: string,
    delimiter?: string,
    customMapping?: Record<string, string>
  ): { headers: string[]; rows: ParsedRateRow[]; rawCount: number } {
    const cleanContent = fileContent.replace(/\uFEFF/g, "").trim();
    if (!cleanContent) {
      return { headers: [], rows: [], rawCount: 0 };
    }

    const delim = delimiter || this.detectDelimiter(cleanContent);
    const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { headers: [], rows: [], rawCount: 0 };
    }

    // Parse header line
    const rawHeaders = this.splitCsvLine(lines[0], delim).map((h) => h.trim());
    const headerMapping: Record<string, number> = {};

    // Map aliases
    for (let i = 0; i < rawHeaders.length; i++) {
      const hNormalized = rawHeaders[i].toLowerCase().replace(/[\s\-_]+/g, "_").replace(/[^a-z0-9_]/g, "");
      for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
        if (customMapping && customMapping[key] === rawHeaders[i]) {
          headerMapping[key] = i;
          break;
        }
        if (aliases.includes(hNormalized) && headerMapping[key] === undefined) {
          headerMapping[key] = i;
        }
      }
    }

    const rows: ParsedRateRow[] = [];
    const seenPrefixes = new Set<string>();

    for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
      const lineStr = lines[lineIdx];
      const cols = this.splitCsvLine(lineStr, delim).map((c) => c.trim().replace(/^["']|["']$/g, ""));
      if (cols.length === 0 || cols.every((c) => c === "")) continue;

      const rawPrefix = headerMapping.prefix !== undefined ? cols[headerMapping.prefix] : cols[0];
      const rawRate = headerMapping.rate_per_minute !== undefined ? cols[headerMapping.rate_per_minute] : cols[1];
      const rawArea = headerMapping.area_name !== undefined ? cols[headerMapping.area_name] : cols[2];
      const rawInterval = headerMapping.interval !== undefined ? cols[headerMapping.interval] : cols[3];
      const rawInitial = headerMapping.initial_interval !== undefined ? cols[headerMapping.initial_interval] : undefined;
      const rawIncrement = headerMapping.increment_interval !== undefined ? cols[headerMapping.increment_interval] : undefined;
      const rawType = headerMapping.rate_type !== undefined ? cols[headerMapping.rate_type] : undefined;
      const rawEffective = headerMapping.effective_date !== undefined ? cols[headerMapping.effective_date] : undefined;
      const rawStatus = headerMapping.status !== undefined ? cols[headerMapping.status] : undefined;

      const rowNum = lineIdx + 1;
      let errorMsg: string | undefined;

      // Prefix Sanitization
      const cleanPrefix = String(rawPrefix || "").replace(/[^0-9]/g, "");
      if (!cleanPrefix) {
        errorMsg = "Prefix is empty or contains no numeric digits";
      } else if (/[^0-9+\s\-()]/.test(String(rawPrefix || ""))) {
        errorMsg = `Prefix '${rawPrefix}' contains invalid non-numeric characters`;
      } else if (cleanPrefix.length > 32) {
        errorMsg = "Prefix length exceeds maximum allowed digits (32)";
      }

      // Rate Sanitization
      const cleanRateStr = String(rawRate || "").replace(/[^0-9.-]/g, "");
      const rateNum = parseFloat(cleanRateStr);
      if (isNaN(rateNum) || cleanRateStr === "") {
        errorMsg = errorMsg || `Rate '${rawRate}' is not a valid number`;
      } else if (rateNum < 0) {
        errorMsg = errorMsg || `Rate '${rawRate}' is invalid: rate must be >= 0`;
      }

      // Interval Sanitization
      let initSec = 60;
      let incrSec = 1;
      if (rawInitial || rawIncrement) {
        initSec = Math.max(1, parseInt(rawInitial || "60", 10) || 60);
        incrSec = Math.max(1, parseInt(rawIncrement || "1", 10) || 1);
      } else if (rawInterval) {
        const parsedInt = this.parseIntervalString(rawInterval);
        initSec = parsedInt.initial_interval;
        incrSec = parsedInt.increment_interval;
      }

      // Country / Area Resolution
      const phoneInfo = this.parseDestination("+" + cleanPrefix);
      const resolvedArea = rawArea || (phoneInfo.country_name ? `${phoneInfo.country_name} Proper` : `Prefix +${cleanPrefix}`);
      const countryCode = phoneInfo.country_code || undefined;
      const countryName = phoneInfo.country_name || getCountryName(countryCode) || undefined;

      // Duplicate Check within file
      if (cleanPrefix) {
        if (seenPrefixes.has(cleanPrefix)) {
          // duplicate in sheet
        } else {
          seenPrefixes.add(cleanPrefix);
        }
      }

      rows.push({
        row_number: rowNum,
        prefix: cleanPrefix,
        country_code: countryCode,
        country_name: countryName,
        area_name: resolvedArea,
        rate_per_minute: isNaN(rateNum) ? "0.00000000" : DecimalUtil.round(cleanRateStr, 8),
        billing_cycle_seconds: initSec,
        initial_interval: initSec,
        increment_interval: incrSec,
        rate_type: String(rawType || "standard").trim(),
        effective_date: rawEffective ? new Date(rawEffective).toISOString() : new Date().toISOString(),
        status: rawStatus === "inactive" || rawStatus === "disabled" ? "inactive" : "active",
        error: errorMsg,
      });
    }

    return { headers: rawHeaders, rows, rawCount: lines.length - 1 };
  }

  private splitCsvLine(line: string, delimiter: string): string[] {
    const res: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        res.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    res.push(current);
    return res;
  }

  // Stage 3: Dry-Run Diff Calculation
  calculateDryRunDiff(
    existingRates: Array<{
      prefix: string;
      area_name?: string;
      rate_per_minute: string | number;
      billing_cycle_seconds?: number;
      initial_interval?: number;
      increment_interval?: number;
      rate_type?: string;
      country_code?: string;
      country_name?: string;
    }>,
    parsedRows: ParsedRateRow[],
    mode: "merge" | "replace" = "merge"
  ): RateImportPreviewResult {
    const existingMap = new Map<string, (typeof existingRates)[0]>();
    for (const r of existingRates) {
      existingMap.set(r.prefix, r);
    }

    const importedPrefixes = new Set<string>();
    let added = 0;
    let updated = 0;
    let unchanged = 0;
    let errorCount = 0;

    const preview_rows: RateImportPreviewResult["preview_rows"] = [];
    const validation_errors: RateImportPreviewResult["validation_errors"] = [];

    for (const row of parsedRows) {
      if (row.error) {
        errorCount++;
        validation_errors.push({
          row_number: row.row_number,
          prefix: row.prefix,
          error: row.error,
        });
        continue;
      }

      importedPrefixes.add(row.prefix);
      const existing = existingMap.get(row.prefix);

      if (!existing) {
        added++;
        if (preview_rows.length < 50) {
          preview_rows.push({
            row_number: row.row_number,
            prefix: row.prefix,
            country_code: row.country_code,
            country_name: row.country_name,
            area_name: row.area_name,
            rate_per_minute: row.rate_per_minute,
            initial_interval: row.initial_interval,
            increment_interval: row.increment_interval,
            action: "added",
            old_rate: null,
            new_rate: row.rate_per_minute,
          });
        }
      } else {
        const oldRateStr = DecimalUtil.round(existing.rate_per_minute, 8);
        const newRateStr = DecimalUtil.round(row.rate_per_minute, 8);
        const isRateDiff = oldRateStr !== newRateStr;
        const isAreaDiff = existing.area_name !== row.area_name;
        const isIntervalDiff =
          (existing.initial_interval && existing.initial_interval !== row.initial_interval) ||
          (existing.billing_cycle_seconds && existing.billing_cycle_seconds !== row.billing_cycle_seconds);

        if (isRateDiff || isAreaDiff || isIntervalDiff) {
          updated++;
          if (preview_rows.length < 50) {
            preview_rows.push({
              row_number: row.row_number,
              prefix: row.prefix,
              country_code: row.country_code,
              country_name: row.country_name,
              area_name: row.area_name,
              rate_per_minute: row.rate_per_minute,
              initial_interval: row.initial_interval,
              increment_interval: row.increment_interval,
              action: "updated",
              old_rate: oldRateStr,
              new_rate: newRateStr,
            });
          }
        } else {
          unchanged++;
        }
      }
    }

    let deleted = 0;
    if (mode === "replace") {
      for (const [prefix, r] of existingMap.entries()) {
        if (!importedPrefixes.has(prefix)) {
          deleted++;
          if (preview_rows.length < 50) {
            preview_rows.push({
              row_number: 0,
              prefix,
              country_code: r.country_code,
              country_name: r.country_name,
              area_name: r.area_name || `Prefix +${prefix}`,
              rate_per_minute: DecimalUtil.round(r.rate_per_minute, 8),
              initial_interval: r.initial_interval || 60,
              increment_interval: r.increment_interval || 1,
              action: "deleted",
              old_rate: DecimalUtil.round(r.rate_per_minute, 8),
              new_rate: null,
            });
          }
        }
      }
    }

    // Compute collisions within valid rows
    const validRowNodes = parsedRows
      .filter((r) => !r.error)
      .map((r) => ({ prefix: r.prefix, data: { rate_per_minute: r.rate_per_minute, area_name: r.area_name } }));
    const collisions = detectGroupOverlaps(validRowNodes);

    return {
      summary: {
        total_rows: parsedRows.length,
        valid_rows: parsedRows.length - errorCount,
        added,
        updated,
        unchanged,
        deleted,
        errors: errorCount,
        collisions: collisions.length,
      },
      preview_rows,
      validation_errors,
    };
  }
}
