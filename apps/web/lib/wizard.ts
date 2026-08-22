/**
 * Create Customer Wizard — pure, testable core.
 *
 * Maps the POST /api/v1/admin/customers action schema onto the 7-step
 * onboarding flow required by 04_ADMIN_PAGES/010_create-customer-wizard.md
 * (F01..F08). Validation mirrors the server-side rules in
 * apps/api/src/action-validation.ts; the server remains the authority.
 */

export interface WizardFieldSpec {
  /** Schema field name (must exist on the create-customer action schema). */
  name: string;
  /** Human label shown above the input. */
  label: string;
  /** Field type as declared by the action schema. */
  type: "text" | "email" | "number" | "date" | "select" | "tel";
  required: boolean;
  /** Input helper text. */
  help?: string;
  /** Placeholder for empty inputs. */
  placeholder?: string;
  /** Render the input in monospace (technical identifiers). */
  mono?: boolean;
  /** Number granularity: "int" enforces whole values. */
  integer?: boolean;
  /** Suggestions for text inputs (datalist) — deprecated for select fields, use options. */
  suggestions?: readonly string[];
  /** Options for select fields (value list). For currency / rate dropdowns. */
  options?: readonly string[];
}

export interface WizardStepDef {
  /** 1-based step number, matching the product spec. */
  number: number;
  /** Short rail label. */
  title: string;
  /** Rail caption. */
  caption: string;
  /** Page heading. */
  description: string;
  fields: WizardFieldSpec[];
}

export type WizardValues = Record<string, string | number | boolean | undefined>;

export interface WizardStepResult {
  ok: boolean;
  /** fieldName -> human-readable error */
  errors: Record<string, string>;
}

export const WIZARD_CURRENCIES = [
  "USD", "EUR", "GBP", "INR", "AED", "SAR", "SGD", "AUD", "CAD", "CNY", "JPY", "BRL",
] as const;

export const WIZARD_CURRENCY_META: Record<string, { flag: string; name: string; symbol: string }> = {
  USD: { flag: "🇺🇸", name: "US Dollar", symbol: "$" },
  EUR: { flag: "🇪🇺", name: "Euro", symbol: "€" },
  GBP: { flag: "🇬🇧", name: "British Pound", symbol: "£" },
  INR: { flag: "🇮🇳", name: "Indian Rupee", symbol: "₹" },
  AED: { flag: "🇦🇪", name: "UAE Dirham", symbol: "د.إ" },
  SAR: { flag: "🇸🇦", name: "Saudi Riyal", symbol: "﷼" },
  SGD: { flag: "🇸🇬", name: "Singapore Dollar", symbol: "S$" },
  AUD: { flag: "🇦🇺", name: "Australian Dollar", symbol: "A$" },
  CAD: { flag: "🇨🇦", name: "Canadian Dollar", symbol: "C$" },
  CNY: { flag: "🇨🇳", name: "Chinese Yuan", symbol: "¥" },
  JPY: { flag: "🇯🇵", name: "Japanese Yen", symbol: "¥" },
  BRL: { flag: "🇧🇷", name: "Brazilian Real", symbol: "R$" },
};

export const WIZARD_DEFAULT_CURRENCY = "USD" as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCY_RE = /^[A-Z]{3}$/;

/** Steps for the Create Customer Wizard (spec F01..F07 + review F08). */
export function createCustomerWizardSteps(): WizardStepDef[] {
  return [
    {
      number: 1,
      title: "Company / Profile",
      caption: "Legal name and organization identity",
      description: "Identify the organization being onboarded. This becomes the tenant display name in the portal.",
      fields: [
        {
          name: "organizationName",
          label: "Organization / customer name",
          type: "text",
          required: true,
          placeholder: "Acme Telecom Ltd.",
          help: "Used as the tenant identity across billing, gateways and reports.",
        },
      ],
    },
    {
      number: 2,
      title: "Portal Owner",
      caption: "Owner credentials contact",
      description: "The portal owner receives access credentials and account notifications through this address.",
      fields: [
        {
          name: "ownerEmail",
          label: "Portal owner email",
          type: "email",
          required: true,
          placeholder: "owner@acme.tel",
          help: "Credentials are provisioned through the portal identity flow — never sent over chat.",
        },
      ],
    },
    {
      number: 3,
      title: "VOS Account",
      caption: "Map or request a VOS account",
      description: "Attach an existing VOS account, or leave empty to request a new one during provisioning.",
      fields: [
        {
          name: "vosAccountId",
          label: "Existing VOS account ID",
          type: "text",
          required: false,
          mono: true,
          placeholder: "10001",
          help: "Leave empty to request VOS account creation. Creation API is VERIFY-API — the adapter fails closed when unverified.",
        },
      ],
    },
    {
      number: 4,
      title: "Billing",
      caption: "Currency, credit and expiry",
      description: "Billing is decimal-safe: currency defines the ledger, overdraft defines the credit ceiling, expiry revokes service.",
      fields: [
        {
          name: "currency",
          label: "Billing currency",
          type: "select",
          required: true,
          placeholder: "Select currency",
          options: WIZARD_CURRENCIES as unknown as readonly string[],
          help: "ISO-4217 code. The ledger and all financial previews use this currency.",
        },
        {
          name: "overdraftLimit",
          label: "Credit / overdraft limit",
          type: "number",
          required: false,
          placeholder: "0.00",
          help: "Maximum negative balance allowed. 0 disables overdraft.",
        },
        {
          name: "expiresAt",
          label: "Expiry date",
          type: "date",
          required: false,
          help: "Optional service expiry. Must be today or later.",
        },
      ],
    },
    {
      number: 5,
      title: "Rate Group",
      caption: "Billing rate group / private rates",
      description: "Choose which commercial rate group prices this customer's traffic. Private-rate policy is applied downstream.",
      fields: [
        {
          name: "rateGroupId",
          label: "Rate group",
          type: "select",
          required: false,
          placeholder: "Select a rate group — or leave empty to defer",
          options: [] as readonly string[],
          help: "Choose which commercial rate group prices this customer's traffic. Leave empty to defer; changing rates later requires a rate-change audit event.",
        },
      ],
    },
    {
      number: 6,
      title: "Capacity",
      caption: "Gateway / channel / CPS defaults",
      description: "Defaults applied to the customer's gateways. Hard limits protect switch stability and are enforced by VOS.",
      fields: [
        {
          name: "lineLimit",
          label: "Default channels",
          type: "number",
          required: false,
          integer: true,
          placeholder: "32",
          help: "Concurrent channel ceiling per gateway. Whole numbers only.",
        },
        {
          name: "cpsLimit",
          label: "Default CPS",
          type: "number",
          required: false,
          integer: true,
          placeholder: "10",
          help: "Call attempts per second ceiling. Whole numbers only.",
        },
      ],
    },
    {
      number: 7,
      title: "Review & Create",
      caption: "Verify and provision",
      description: "Review the provisioned configuration, then execute the create. The operation is audited and idempotent-safe.",
      fields: [],
    },
  ];
}

/** True when a step's required fields all carry non-empty values. */
export function isStepComplete(step: WizardStepDef, values: WizardValues): boolean {
  return step.fields.every((f) => {
    if (!f.required) return true;
    const v = values[f.name];
    return v !== undefined && v !== null && String(v).trim() !== "";
  });
}

/** Client-side validation mirroring action-validation.ts, plus product rules. */
export function validateStep(step: WizardStepDef, values: WizardValues): WizardStepResult {
  const errors: Record<string, string> = {};
  for (const f of step.fields) {
    const raw = values[f.name];
    const v = raw === undefined || raw === null ? "" : String(raw).trim();

    if (f.required && v === "") {
      errors[f.name] = `${f.label} is required`;
      continue;
    }
    if (v === "") continue; // optional and empty -> fine

    if (f.type === "email") {
      if (!EMAIL_RE.test(v)) errors[f.name] = "Enter a valid email address";
    } else if (f.type === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) {
        errors[f.name] = `${f.label} must be a valid number`;
      } else if (n < 0) {
        errors[f.name] = `${f.label} cannot be negative`;
      } else if (f.integer && !Number.isInteger(n)) {
        errors[f.name] = `${f.label} must be a whole number`;
      }
    } else if (f.type === "date") {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) {
        errors[f.name] = `${f.label} must be a valid date`;
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (d.getTime() < today.getTime()) {
          errors[f.name] = `${f.label} cannot be in the past`;
        }
      }
    } else if (f.name === "currency") {
      if (!CURRENCY_RE.test(v.toUpperCase())) {
        errors[f.name] = "Use a 3-letter ISO-4217 code (e.g. USD)";
      }
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/** Collect the fields belonging to a step into a partial payload. */
export function collectStepValues(step: WizardStepDef, values: WizardValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of step.fields) {
    const v = values[f.name];
    if (v === undefined || v === null || String(v).trim() === "") continue;
    out[f.name] = f.type === "number" ? String(v) : f.name === "currency" ? String(v).trim().toUpperCase() : String(v).trim();
  }
  return out;
}

/** Merge every step's values into the final POST body (server-authoritative). */
export function buildCustomerPayload(steps: readonly WizardStepDef[], values: WizardValues): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const step of steps) Object.assign(body, collectStepValues(step, values));
  return body;
}

/** Human-readable review rendering for a field value. */
export function formatWizardValue(field: WizardFieldSpec, value: unknown): string {
  if (value === undefined || value === null || String(value).trim() === "") return "—";
  const s = String(value).trim();
  if (field.type === "date") {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString();
  }
  if (field.name === "currency") return s.toUpperCase();
  if (field.type === "number") {
    const n = Number(s);
    if (Number.isFinite(n)) return field.integer ? String(Math.trunc(n)) : String(n);
  }
  return s;
}

/** When no POST action is declared, fall back to the route manifest feature text. */
export function featureFallbackSteps(features: readonly string[]): WizardStepDef[] {
  const numbered = features
    .map((f) => ({ f, m: f.match(/^Step\s+(\d+)\s*(.*)$/i) }))
    .filter((x): x is { f: string; m: RegExpMatchArray } => Boolean(x.m));
  if (!numbered.length) {
    return [{ number: 1, title: "Overview", caption: "Requirements", description: "Guided provisioning", fields: [] }];
  }
  const max = Math.max(...numbered.map((x) => Number(x.m[1])));
  return Array.from({ length: max }, (_, i) => {
    const match = numbered.find((x) => Number(x.m[1]) === i + 1);
    return {
      number: i + 1,
      title: match ? match.m[2] || `Step ${i + 1}` : `Step ${i + 1}`,
      caption: "Product requirement",
      description: match ? match.f : "",
      fields: [],
    };
  });
}