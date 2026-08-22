import { parsePhoneNumberFromString, CountryCode } from "libphonenumber-js";

export interface ParsedTelecomPhone {
  raw: string;
  normalized: string;
  country?: CountryCode;
  countryCallingCode?: string;
  countryName?: string;
  formattedInternational?: string;
  formattedNational?: string;
  nationalNumber?: string;
  isPossible: boolean;
  isValid: boolean;
  isExtensionOrInternal: boolean;
}

// Fallback lookup cache for region names
let displayNames: Intl.DisplayNames | null = null;
try {
  displayNames = new Intl.DisplayNames(["en"], { type: "region" });
} catch {
  displayNames = null;
}

/**
 * Returns localized full English country name for an ISO-2 code (e.g. 'US' -> 'United States')
 */
export function getCountryName(countryCode?: string): string | undefined {
  if (!countryCode) return undefined;
  const upper = countryCode.toUpperCase();
  if (displayNames) {
    try {
      const name = displayNames.of(upper);
      if (name) return name;
    } catch {
      // ignore
    }
  }
  // Standard fallback map for common telecom territories
  const territoryMap: Record<string, string> = {
    US: "United States",
    CA: "Canada",
    GB: "United Kingdom",
    IN: "India",
    CN: "China",
    AE: "United Arab Emirates",
    DE: "Germany",
    FR: "France",
    IT: "Italy",
    ES: "Spain",
    RU: "Russia",
    BR: "Brazil",
    AU: "Australia",
    JP: "Japan",
    SG: "Singapore",
    HK: "Hong Kong",
    MX: "Mexico",
    SA: "Saudi Arabia",
    ZA: "South Africa",
    NG: "Nigeria",
    PK: "Pakistan",
    BD: "Bangladesh",
    ID: "Indonesia",
    PH: "Philippines",
    VN: "Vietnam",
    TR: "Turkey",
    EG: "Egypt",
    NL: "Netherlands",
    SE: "Sweden",
    CH: "Switzerland",
  };
  return territoryMap[upper] || upper;
}

/**
 * Normalizes telecom phone strings by removing punctuation, exit codes (00, 011),
 * or prepending '+' if it's an un-prefixed international dial string.
 */
export function normalizeTelecomString(raw: string): { normalized: string; isExitCode: boolean } {
  let s = raw.trim();
  let isExitCode = false;

  // Remove trailing sip/domain suffixes if present (e.g. "14155552671@10.0.0.1")
  if (s.includes("@")) {
    s = s.split("@")[0].trim();
  }

  // Remove dashes, spaces, parentheses, dots
  const stripped = s.replace(/[\s\-\(\)\.]/g, "");

  // Check for international exit codes (00 or 011)
  if (/^00[1-9]\d{6,14}$/.test(stripped)) {
    isExitCode = true;
    return { normalized: "+" + stripped.slice(2), isExitCode };
  }
  if (/^011[1-9]\d{6,14}$/.test(stripped)) {
    isExitCode = true;
    return { normalized: "+" + stripped.slice(3), isExitCode };
  }

  // If already starts with '+'
  if (stripped.startsWith("+")) {
    return { normalized: stripped, isExitCode };
  }

  // Check if it's a raw un-prefixed international number (7 to 15 digits)
  if (/^[1-9]\d{6,14}$/.test(stripped)) {
    return { normalized: "+" + stripped, isExitCode };
  }

  return { normalized: stripped, isExitCode };
}

/**
 * Comprehensive phone number parser that inspects telecom strings, extracts ISO-2 country,
 * country name, calling code, formatted presentation, and detects extension numbers.
 */
export function parseTelecomPhone(rawPhone?: string | number | null): ParsedTelecomPhone {
  const rawStr = rawPhone !== null && rawPhone !== undefined ? String(rawPhone).trim() : "";
  if (!rawStr) {
    return {
      raw: "",
      normalized: "",
      isPossible: false,
      isValid: false,
      isExtensionOrInternal: false,
    };
  }

  // Check for non-numeric/anonymous caller IDs
  if (/^(anonymous|private|unknown|restricted|unavailable|none|null|—)$/i.test(rawStr)) {
    return {
      raw: rawStr,
      normalized: rawStr,
      isPossible: false,
      isValid: false,
      isExtensionOrInternal: false,
    };
  }

  // Check if short extension (e.g. 100-9999 or 3-5 digits)
  const isExtension = /^\d{2,5}$/.test(rawStr);

  const { normalized } = normalizeTelecomString(rawStr);

  // Try parsing with libphonenumber-js
  let parsed = parsePhoneNumberFromString(normalized);

  // If failed and didn't have '+', try prepending '+'
  if (!parsed && !normalized.startsWith("+") && /^\d{7,15}$/.test(normalized)) {
    parsed = parsePhoneNumberFromString("+" + normalized);
  }

  if (parsed && parsed.country) {
    const country = parsed.country;
    const countryCallingCode = String(parsed.countryCallingCode);
    const countryName = getCountryName(country);
    return {
      raw: rawStr,
      normalized,
      country,
      countryCallingCode,
      countryName,
      formattedInternational: parsed.formatInternational(),
      formattedNational: parsed.formatNational(),
      nationalNumber: parsed.nationalNumber,
      isPossible: parsed.isPossible(),
      isValid: parsed.isValid(),
      isExtensionOrInternal: false,
    };
  }

  // If country wasn't directly found, check known high-traffic country prefix matches
  const cleanedDigits = normalized.replace(/\D/g, "");
  if (cleanedDigits.length >= 1) {
    const prefixMap: Array<{ prefix: string; code: CountryCode; callingCode: string }> = [
      { prefix: "971", code: "AE", callingCode: "971" },
      { prefix: "966", code: "SA", callingCode: "966" },
      { prefix: "880", code: "BD", callingCode: "880" },
      { prefix: "852", code: "HK", callingCode: "852" },
      { prefix: "49", code: "DE", callingCode: "49" },
      { prefix: "44", code: "GB", callingCode: "44" },
      { prefix: "39", code: "IT", callingCode: "39" },
      { prefix: "34", code: "ES", callingCode: "34" },
      { prefix: "33", code: "FR", callingCode: "33" },
      { prefix: "92", code: "PK", callingCode: "92" },
      { prefix: "91", code: "IN", callingCode: "91" },
      { prefix: "90", code: "TR", callingCode: "90" },
      { prefix: "86", code: "CN", callingCode: "86" },
      { prefix: "84", code: "VN", callingCode: "84" },
      { prefix: "81", code: "JP", callingCode: "81" },
      { prefix: "65", code: "SG", callingCode: "65" },
      { prefix: "63", code: "PH", callingCode: "63" },
      { prefix: "62", code: "ID", callingCode: "62" },
      { prefix: "61", code: "AU", callingCode: "61" },
      { prefix: "55", code: "BR", callingCode: "55" },
      { prefix: "52", code: "MX", callingCode: "52" },
      { prefix: "27", code: "ZA", callingCode: "27" },
      { prefix: "20", code: "EG", callingCode: "20" },
      { prefix: "7", code: "RU", callingCode: "7" },
      { prefix: "1", code: "US", callingCode: "1" },
    ];

    for (const item of prefixMap) {
      if (cleanedDigits.startsWith(item.prefix)) {
        const countryName = getCountryName(item.code);
        return {
          raw: rawStr,
          normalized: "+" + cleanedDigits,
          country: item.code,
          countryCallingCode: item.callingCode,
          countryName,
          formattedInternational: `+${item.callingCode} ${cleanedDigits.slice(item.callingCode.length)}`,
          nationalNumber: cleanedDigits.slice(item.callingCode.length),
          isPossible: true,
          isValid: true,
          isExtensionOrInternal: false,
        };
      }
    }
  }

  return {
    raw: rawStr,
    normalized,
    isPossible: !isExtension,
    isValid: false,
    isExtensionOrInternal: isExtension,
  };
}
