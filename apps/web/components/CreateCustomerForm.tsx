"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { Icon } from "../lib/icons";
import { PhoneInput } from "./shared/PhonePill";
import { FormErrorAlert } from "./shared/FormErrorAlert";
import { useFormError } from "../lib/use-form-error";
import {
  buildCustomerPayload,
  createCustomerWizardSteps,
  formatWizardValue,
  isStepComplete,
  validateStep,
  WIZARD_CURRENCIES,
  WIZARD_CURRENCY_META,
  WIZARD_DEFAULT_CURRENCY,
  type WizardFieldSpec,
  type WizardStepDef,
  type WizardValues,
} from "../lib/wizard";

/**
 * Create Customer Wizard — 7-step guided provisioning.
 *
 * The step definitions, validation rules and payload building live in
 * `lib/wizard.ts` (pure, unit-tested). This component is the presentation
 * layer: stepper rail, per-step fields, review & confirm, audited create.
 *
 * The server remains the validation authority (action-validation.ts);
 * client-side mirrors it so users get instant feedback.
 */
export function CreateCustomerForm({ onCreated }: { onCreated?: () => void }) {
  const steps = useMemo<readonly WizardStepDef[]>(() => createCustomerWizardSteps(), []);
  const max = steps.length;
  const [step, setStep] = useState(1);
  const safeStep = Math.min(Math.max(1, step), max);
  const current = steps[safeStep - 1];

  const [values, setValues] = useState<WizardValues>({ currency: WIZARD_DEFAULT_CURRENCY });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const headRef = useRef<HTMLHeadingElement>(null);

  const {
    formError,
    fieldErrors,
    setError,
    clearFieldError,
    clearErrors,
    bannerRef,
  } = useFormError({
    fieldIdPrefix: "wz-",
    fallbackMessage: "Failed to create customer.",
  });

  // Ensure USD is pre-selected even if steps recompute
  useEffect(() => {
    setValues((v) => (v.currency ? v : { ...v, currency: WIZARD_DEFAULT_CURRENCY }));
  }, []);

  useEffect(() => {
    clearErrors();
    headRef.current?.focus();
  }, [safeStep, clearErrors]);

  function update(name: string, value: string | number) {
    setValues((v) => ({ ...v, [name]: value }));
    clearFieldError(name);
  }

  function goTo(n: number) {
    if (n < 1 || n > max) return;
    if (n === safeStep + 1) {
      const res = validateStep(current, values);
      if (!res.ok) {
        const rawFieldErrors = Object.entries(res.errors).map(([field, message]) => ({
          field,
          message,
        }));
        setError({
          message: "Please fix the highlighted fields to continue to the next step.",
          code: "VALIDATION_ERROR",
          fieldErrors: rawFieldErrors,
          fieldErrorMap: res.errors,
        });
        const first = current.fields.find((f) => res.errors[f.name]);
        if (first) {
          const el = document.getElementById(`wz-${first.name}`);
          el?.focus();
        }
        return;
      }
    }
    setStep(n);
  }

  async function create() {
    setBusy(true);
    clearErrors();
    try {
      const body = buildCustomerPayload(steps, values);
      await api("/api/v1/admin/customers", { method: "POST", body: JSON.stringify(body) });
      onCreated?.();
    } catch (e: any) {
      setError(e, { fallbackMessage: "The create operation failed" });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (safeStep < max) goTo(safeStep + 1);
    else setConfirmOpen(true);
  }

  const doneCount = steps.filter(
    (s) => s.number < safeStep || (s.number === safeStep && isStepComplete(s, values))
  ).length;

  return (
    <div className="card wzCard">
      <div className="wzLayout">
        {/* Stepper rail */}
        <nav className="wzRail" aria-label="Provisioning steps">
          {steps.map((s) => {
            const state = s.number < safeStep ? "done" : s.number === safeStep ? "current" : "upcoming";
            const back = s.number < safeStep;
            return (
              <button
                key={s.number}
                type="button"
                className={`wzStep ${state} ${s.number > safeStep ? "locked" : ""}`}
                onClick={() => back && goTo(s.number)}
                disabled={s.number > safeStep}
                aria-current={state === "current" ? "step" : undefined}
                title={s.number > safeStep ? "Complete earlier steps first" : undefined}
              >
                <span className="wzStepDot" aria-hidden="true">
                  {state === "done" ? <Icon name="check" size={12} /> : s.number}
                </span>
                <span className="wzStepText">
                  <span className="wzStepTitle">{s.title}</span>
                  <span className="wzStepCaption">{s.caption}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Step body */}
        <div className="wzPanel">
          <div className="wzHead">
            <div>
              <div className="eyebrow">
                Step {safeStep} of {max}
              </div>
              <h3 tabIndex={-1} ref={headRef} style={{ outline: "none" }}>
                {current.title}
              </h3>
              <p className="wzDesc">{current.description}</p>
            </div>
            <span className="badge badge-online">
              {safeStep === max ? "Ready to create" : `${doneCount} of ${max} complete`}
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <FormErrorAlert
              ref={bannerRef}
              error={formError}
              onDismiss={clearErrors}
              fieldIdPrefix="wz-"
            />

            {current.fields.length > 0 ? (
              <div className="formGrid">
                {current.fields.map((f) => (
                  <WizardField
                    key={f.name}
                    spec={f}
                    value={values[f.name] as string | number | undefined}
                    error={fieldErrors[f.name]}
                    onChange={(v) => update(f.name, v)}
                  />
                ))}
              </div>
            ) : safeStep === max ? (
              <ReviewSummary steps={steps} values={values} onEdit={(n) => goTo(n)} />
            ) : (
              <div className="notice">This step is defined by product requirements. Continue to the next step.</div>
            )}

            <div className="savebar">
              {safeStep > 1 && (
                <button className="btn" type="button" onClick={() => goTo(safeStep - 1)} disabled={busy}>
                  <Icon name="chevronLeft" size={13} />
                  <span>Back</span>
                </button>
              )}
              <span className="wzProg">
                {safeStep < max ? `Next: ${steps[safeStep].title}` : "Executes the audited create operation"}
              </span>
              {safeStep < max ? (
                <button className="btn primary" type="submit">
                  <span>Continue</span>
                  <Icon name="chevronRight" size={13} />
                </button>
              ) : (
                <button className="btn primary" type="submit" disabled={busy}>
                  {busy ? (
                    <>
                      <Icon name="refresh" size={13} className="spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="sparkles" size={13} />
                      <span>Create Customer</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* High-risk confirmation (financial/config mutation — audited) */}
      {confirmOpen && (
        <div className="cmdBackdrop" onClick={() => !busy && setConfirmOpen(false)}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="cardHead" style={{ background: "var(--danger-bg)" }}>
              <div style={{ color: "var(--danger)", fontWeight: 700 }}>Confirm Customer Creation</div>
            </div>
            <div className="cardBody">
              <p style={{ marginBottom: 16 }}>
                You are about to provision a new customer and map it to VOS via{" "}
                <code>POST /api/v1/admin/customers</code>. This creates billing identity and may trigger
                downstream VOS account creation. The operation is audited with a request ID.
              </p>
              <ReviewSummary
                steps={steps}
                values={values}
                onEdit={(n) => {
                  setConfirmOpen(false);
                  goTo(n);
                }}
                compact
              />
              <div className="savebar" style={{ justifyContent: "flex-end" }}>
                <button className="btn" type="button" onClick={() => setConfirmOpen(false)} disabled={busy}>
                  Cancel
                </button>
                <button className="btn danger" type="button" onClick={() => void create()} disabled={busy}>
                  {busy ? (
                    <>
                      <Icon name="refresh" size={13} className="spin" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    "Create Customer"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WizardField({
  spec,
  value,
  error,
  onChange,
}: {
  spec: WizardFieldSpec;
  value: string | number | boolean | undefined;
  error?: string;
  onChange: (v: string | number) => void;
}) {
  const id = `wz-${spec.name}`;
  const inputValue = value == null ? "" : typeof value === "boolean" ? (value ? "true" : "false") : value;
  const hasError = !!error;

  // Beautiful dropdowns for currency & rate
  if (spec.type === "select") {
    if (spec.name === "currency") {
      return (
        <div className="field">
          <label htmlFor={id}>
            {spec.label} {spec.required && <span style={{ color: "var(--danger)" }}>*</span>}
          </label>
          <CurrencyDropdown
            id={id}
            value={String(inputValue || WIZARD_DEFAULT_CURRENCY)}
            onChange={(v) => onChange(v)}
            hasError={hasError}
            placeholder={spec.placeholder}
            errorId={error ? `${id}-err` : undefined}
          />
          {spec.help && <div className="help">{spec.help}</div>}
          {error && (
            <div className="fieldError" id={`${id}-err`} role="alert">
              {error}
            </div>
          )}
        </div>
      );
    }
    if (spec.name === "rateGroupId") {
      return (
        <div className="field">
          <label htmlFor={id}>
            {spec.label} {spec.required && <span style={{ color: "var(--danger)" }}>*</span>}
          </label>
          <RateGroupDropdown
            id={id}
            value={String(inputValue || "")}
            onChange={(v) => onChange(v)}
            hasError={hasError}
            placeholder={spec.placeholder}
            errorId={error ? `${id}-err` : undefined}
          />
          {spec.help && <div className="help">{spec.help}</div>}
          {error && (
            <div className="fieldError" id={`${id}-err`} role="alert">
              {error}
            </div>
          )}
        </div>
      );
    }
    // Fallback generic select
    const cls = `beautifulSelectTrigger ${hasError ? "inputError" : ""}`;
    return (
      <div className="field">
        <label htmlFor={id}>
          {spec.label} {spec.required && <span style={{ color: "var(--danger)" }}>*</span>}
        </label>
        <select
          id={id}
          className={cls}
          value={String(inputValue)}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError}
          aria-describedby={error ? `${id}-err` : undefined}
        >
          <option value="">{spec.placeholder ?? "Select…"}</option>
          {(spec.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {spec.help && <div className="help">{spec.help}</div>}
        {error && (
          <div className="fieldError" id={`${id}-err`} role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }

  const cls = `input ${spec.mono ? "mono" : ""} ${spec.type === "number" ? "numeric" : ""} ${
    error ? " inputError" : ""
  }`;
  return (
    <div className="field">
      <label htmlFor={id}>
        {spec.label} {spec.required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {spec.type === "date" ? (
        <input
          id={id}
          className={cls}
          type="date"
          value={String(inputValue)}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      ) : spec.type === "number" ? (
        <input
          id={id}
          className={cls}
          type="number"
          step={spec.integer ? "1" : "any"}
          min="0"
          placeholder={spec.placeholder}
          value={String(inputValue)}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      ) : spec.type === "tel" || spec.name.includes("phone") || spec.name.includes("mobile") ? (
        <PhoneInput
          id={id}
          className={cls}
          placeholder={spec.placeholder ?? "+1 (555) 019-2831"}
          value={String(inputValue)}
          onChange={(val) => onChange(val)}
        />
      ) : (
        <input
          id={id}
          className={cls}
          type={spec.type === "email" ? "email" : "text"}
          inputMode={spec.type === "email" ? "email" : undefined}
          placeholder={spec.placeholder}
          value={String(inputValue)}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      )}
      {spec.help && <div className="help">{spec.help}</div>}
      {error && (
        <div className="fieldError" id={`${id}-err`} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Currency: beautiful searchable dropdown — default USD ───────────────────── */

function CurrencyDropdown({
  id,
  value,
  onChange,
  hasError,
  placeholder,
  errorId,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
  placeholder?: string;
  errorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const normalized = value?.toUpperCase() || WIZARD_DEFAULT_CURRENCY;
  const meta = WIZARD_CURRENCY_META[normalized] ?? WIZARD_CURRENCY_META[WIZARD_DEFAULT_CURRENCY];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WIZARD_CURRENCIES as unknown as string[];
    return (WIZARD_CURRENCIES as unknown as string[]).filter((c) => {
      const m = WIZARD_CURRENCY_META[c];
      return (
        c.toLowerCase().includes(q) ||
        m?.name.toLowerCase().includes(q) ||
        m?.symbol.toLowerCase().includes(q)
      );
    });
  }, [query]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => searchRef.current?.focus(), 30);
    }
  }, [open]);

  return (
    <div ref={wrapRef} className="beautifulSelectWrap">
      <button
        id={id}
        type="button"
        className={`beautifulSelectTrigger currencyTrigger ${hasError ? "inputError" : ""} ${open ? "open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={hasError}
        aria-describedby={errorId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="beautifulSelectValue">
          <span className="currencyFlag" aria-hidden>{meta.flag}</span>
          <span className="currencyCode">{normalized}</span>
          <span className="currencySep">·</span>
          <span className="currencyName">{meta.name}</span>
          <span className="currencySymbol" aria-hidden>{meta.symbol}</span>
        </span>
        <span className={`beautifulSelectChevron ${open ? "rotated" : ""}`} aria-hidden>
          <Icon name="chevronDown" size={14} />
        </span>
      </button>

      {open && (
        <div className="beautifulSelectDropdown" role="listbox" aria-label="Select currency">
          <div className="beautifulSelectSearch">
            <Icon name="search" size={14} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search currency…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search currencies"
            />
          </div>
          <div className="beautifulSelectOptions">
            {filtered.length === 0 ? (
              <div className="beautifulSelectEmpty">No currencies match “{query}”</div>
            ) : (
              filtered.map((code) => {
                const m = WIZARD_CURRENCY_META[code];
                const active = code === normalized;
                return (
                  <button
                    key={code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`beautifulSelectOption ${active ? "active" : ""}`}
                    onClick={() => {
                      onChange(code);
                      setOpen(false);
                    }}
                  >
                    <span className="currencyFlag" aria-hidden>{m.flag}</span>
                    <span className="optionMain">
                      <strong className="currencyCode">{code}</strong>
                      <span className="currencyNameSm">{m.name}</span>
                    </span>
                    <span className="currencySymbolSm">{m.symbol}</span>
                    {active && (
                      <span className="optionCheck" aria-hidden>
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="beautifulSelectHint">Default is <strong>USD</strong> · ISO-4217 · Ledger currency</div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Rate group: live dropdown — empty defer allowed ───────────────────── */

type RateGroup = { id: string; name: string; description?: string; prefix_count?: number };

function RateGroupDropdown({
  id,
  value,
  onChange,
  hasError,
  placeholder,
  errorId,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
  placeholder?: string;
  errorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<RateGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = groups?.find((g) => g.id === value) ?? null;

  const filtered = useMemo(() => {
    if (!groups) return [];
    const qq = q.trim().toLowerCase();
    if (!qq) return groups;
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(qq) ||
        g.id.toLowerCase().includes(qq) ||
        (g.description ?? "").toLowerCase().includes(qq)
    );
  }, [groups, q]);

  async function load() {
    if (groups !== null || loading) return;
    setLoading(true);
    setErr(null);
    try {
      const res: any = await api("/api/v1/admin/rates/groups");
      const items: any[] =
        res?.items ?? res?.data ?? res?.groups ?? (Array.isArray(res) ? res : []);
      const mapped: RateGroup[] = items.map((r: any) => ({
        id: String(r.id ?? r.rate_group_id ?? r.group_id ?? ""),
        name: String(r.name ?? r.group_name ?? r.title ?? r.id ?? "Unnamed group"),
        description: r.description ?? r.note ?? undefined,
        prefix_count: r.prefix_count ?? r.rates_count ?? undefined,
      })).filter((g: RateGroup) => g.id);
      // Deduplicate by id
      const seen = new Set<string>();
      const dedup = mapped.filter((g) => (seen.has(g.id) ? false : (seen.add(g.id), true)));
      setGroups(dedup);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load rate groups");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      void load();
      setQ("");
      setTimeout(() => searchRef.current?.focus(), 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = selected ? selected.name : placeholder ?? "Select a rate group";

  return (
    <div ref={wrapRef} className="beautifulSelectWrap">
      <button
        id={id}
        type="button"
        className={`beautifulSelectTrigger ${hasError ? "inputError" : ""} ${open ? "open" : ""} ${!value ? "isPlaceholder" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={hasError}
        aria-describedby={errorId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="beautifulSelectValue">
          {value ? (
            <>
              <span className="rateIcon" aria-hidden>
                <Icon name="rates" size={14} />
              </span>
              <span className="rateName">{selected?.name ?? value}</span>
              <span className="rateId mono">{String(value).slice(0, 8)}…</span>
            </>
          ) : (
            <span className="placeholderText">{label}</span>
          )}
        </span>
        <span className={`beautifulSelectChevron ${open ? "rotated" : ""}`} aria-hidden>
          <Icon name="chevronDown" size={14} />
        </span>
      </button>

      {open && (
        <div className="beautifulSelectDropdown" role="listbox" aria-label="Select rate group">
          <div className="beautifulSelectSearch">
            <Icon name="search" size={14} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search rate groups…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search rate groups"
            />
          </div>

          <div className="beautifulSelectOptions">
            {/* Defer / none option — explicit empty */}
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={`beautifulSelectOption ${!value ? "active" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span className="rateIcon muted" aria-hidden>
                <Icon name="dash" size={14} />
              </span>
              <span className="optionMain">
                <strong>No rate group — defer</strong>
                <span className="currencyNameSm">Assign later; audit on change</span>
              </span>
              {!value && (
                <span className="optionCheck" aria-hidden>
                  <Icon name="check" size={12} />
                </span>
              )}
            </button>

            {loading ? (
              <div className="beautifulSelectLoading">
                <Icon name="refresh" size={14} className="spin" />
                <span>Loading rate groups…</span>
              </div>
            ) : err ? (
              <div className="beautifulSelectEmpty errorText">{err}</div>
            ) : filtered.length === 0 && groups?.length === 0 ? (
              <div className="beautifulSelectEmpty">
                No rate groups yet. Create one at{" "}
                <a href="/admin/rates/groups" onClick={(e) => e.stopPropagation()} style={{ color: "var(--primary)", fontWeight: 600 }}>
                  Rate Groups
                </a>
                .
              </div>
            ) : filtered.length === 0 ? (
              <div className="beautifulSelectEmpty">No groups match “{q}”</div>
            ) : (
              filtered.map((g) => {
                const active = g.id === value;
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`beautifulSelectOption ${active ? "active" : ""}`}
                    onClick={() => {
                      onChange(g.id);
                      setOpen(false);
                    }}
                  >
                    <span className="rateIcon" aria-hidden>
                      <Icon name="rates" size={14} />
                    </span>
                    <span className="optionMain">
                      <strong className="rateNameSm">{g.name}</strong>
                      <span className="mono" style={{ fontSize: 11, color: "var(--muted)" }}>
                        {g.id.slice(0, 12)}…{g.prefix_count != null ? ` · ${g.prefix_count} prefixes` : ""}
                      </span>
                      {g.description && (
                        <span className="currencyNameSm" style={{ display: "block" }}>
                          {g.description}
                        </span>
                      )}
                    </span>
                    {active && (
                      <span className="optionCheck" aria-hidden>
                        <Icon name="check" size={12} />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
          <div className="beautifulSelectHint">Changing rates later requires a rate-change audit event</div>
        </div>
      )}
    </div>
  );
}

function ReviewSummary({
  steps,
  values,
  onEdit,
  compact = false,
}: {
  steps: readonly WizardStepDef[];
  values: WizardValues;
  onEdit?: (step: number) => void;
  compact?: boolean;
}) {
  const groups = steps.filter((s) => s.fields.length > 0);
  return (
    <div className={`wzReview ${compact ? "compact" : ""}`}>
      {groups.map((s) => {
        const filled = s.fields.filter((f) => values[f.name] !== undefined && values[f.name] !== "").length;
        return (
          <section className="wzReviewGroup" key={s.number}>
            <div className="wzReviewHead">
              <span className="wzReviewStep">Step {s.number}</span>
              <strong>{s.title}</strong>
              <span className="wzReviewCount">
                {filled}/{s.fields.length}
              </span>
              {onEdit && (
                <button type="button" className="wzEditBtn" onClick={() => onEdit(s.number)}>
                  Edit
                </button>
              )}
            </div>
            <dl className="wzReviewGrid">
              {s.fields.map((f) => (
                <div className="wzReviewItem" key={f.name}>
                  <dt>{f.label}</dt>
                  <dd className={f.mono ? "mono" : f.type === "number" ? "numeric" : ""}>
                    {formatWizardValue(f, values[f.name])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
