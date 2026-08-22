# Project: Comprehensive Frontend Form Error Handling

## Architecture
- **Framework & Stack**: Next.js 16.3.2 App Router, React 19.2.8, TypeScript 7.0.2, Node.js Native Test Runner (`node:test` + `tsx --test`).
- **Core Abstractions**:
  - `apps/web/lib/form-error.ts`: Universal normalization engine parsing NestJS, Fastify DTOs, VOS `ApiEnvelope`, RFC 7807 ProblemDetails, Zod issues, HTTP fallbacks, and network disconnects into `ParsedFormError`.
  - `apps/web/lib/use-form-error.ts`: Custom React hook providing dual-level validation synchronization, container-aware auto-scroll, focus management, and dynamic clear-on-edit state.
  - `apps/web/components/shared/FormErrorAlert.tsx`: Standardized, accessible (`role="alert"`, `aria-live="assertive"`) top-level alert banner matching `DESIGN.md` telecom specifications with primary message, itemized field links, retry/dismiss actions, and Request ID badge.
  - `apps/web/lib/api.ts`: Augmented client transport preserving full structured error details (`code`, `details`, `request_id`, `status`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Universal Error Normalization Engine | Parse 8 error shapes into canonical `ParsedFormError` with field map and fallback | M1 | Survey E2 |
| 2 | Standard Form Error Header Component | Accessible `FormErrorAlert` banner with dense 13px styling, mono Request ID, retry/dismiss, field links | M1 | Survey E2 |
| 3 | Dual-Level Validation & Hook Contract | `useFormError` hook with container-aware auto-scroll, focus management, clear-on-edit | M1 | Survey E2 |
| 4 | Client Transport Error Detail Preservation | Update `apps/web/lib/api.ts` to preserve error code, details, and request_id | M1 | Survey E2 |
| 5 | Sign In Form Error Handling | Standard error header, field error breakdown, and focus on `AuthPage.tsx` | M2 | Survey E1 |
| 6 | Registration Form Error Handling | Standard error header, field error breakdown, and auto-scroll on `AuthPage.tsx` | M2 | Survey E1 |
| 7 | TOTP MFA Challenge Form Error Handling | Standard error header, invalid code state on `AuthPage.tsx` | M2 | Survey E1 |
| 8 | Password Reset Request Form Error Handling | Standard error header, email validation on `AuthPage.tsx` | M2 | Survey E1 |
| 9 | Password Reset Confirmation Form Error Handling | Standard error header, token/password validation on `AuthPage.tsx` | M2 | Survey E1 |
| 10 | MFA Setup Form Error Handling | Standard error header, secret verification errors on `AuthPage.tsx` | M2 | Survey E1 |
| 11 | Logout & Session Revocation Error Handling | Standard error banner on `LogoutPage.tsx` | M2 | Survey E1 |
| 12 | Settings 2FA Verification Error Handling | Replace `msg` div with standard error banner on `SettingsArchetype.tsx` | M2 | Survey E1 |
| 13 | 7-Step Customer Provisioning Wizard | Standard error banner, step-level and field-level validation on `CreateCustomerForm.tsx` | M3 | Survey E1 |
| 14 | Config & Policy Editor Form | Replace `msg` notice with standard error banner on `EditorFormArchetype.tsx` | M3 | Survey E1 |
| 15 | NOWPayments Crypto Deposit Form | Replace `errorMsg` div with standard error banner on `FinanceActionArchetype.tsx` | M3 | Survey E1 |
| 16 | Admin Manual Payment Modal | Replace `manualError` div with standard error banner on `ListTableArchetype.tsx` | M3 | Survey E1 |
| 17 | Detail Modal: Add Funds | Standard error banner for balance adjustment modal on `DetailArchetype.tsx` | M4 | Survey E1 |
| 18 | Detail Modal: Create Mapping Gateway | Standard error banner for ingress gateway creation on `DetailArchetype.tsx` | M4 | Survey E1 |
| 19 | Detail Modal: Update Gateway IP | Standard error banner for IP authorization on `DetailArchetype.tsx` | M4 | Survey E1 |
| 20 | Detail Modal: Configure SIP Auth | Standard error banner for trunk credentials on `DetailArchetype.tsx` | M4 | Survey E1 |
| 21 | Detail Modal: Reset User Password | Standard error banner for password reset on `DetailArchetype.tsx` | M4 | Survey E1 |
| 22 | Detail Modal: Number Limit Rule | Standard error banner for prefix limit on `DetailArchetype.tsx` | M4 | Survey E1 |
| 23 | Detail Modal: Assign Rate Group | Standard error banner for rate group assignment on `DetailArchetype.tsx` | M4 | Survey E1 |
| 24 | Detail Modal: Create Rate Group | Standard error banner for rate group creation on `DetailArchetype.tsx` | M4 | Survey E1 |
| 25 | Detail Modal: Add Destination Rate Prefix | Standard error banner for prefix rate addition on `DetailArchetype.tsx` | M4 | Survey E1 |
| 26 | Detail Action Triggers: Rate Delete & Gateway Lock | Replace `alert()` and swallowed errors with form error handling on `DetailArchetype.tsx` | M4 | Survey E1 |
| 27 | Mapping Gateways Create/Edit Modal | Replace inline error div with standard banner on `MappingGatewaysArchetype.tsx` | M4 | Survey E1 |
| 28 | Mapping Gateway Dedicated Detail Modal | Standard error banner on `MappingGatewayDetailArchetype.tsx` | M4 | Survey E1 |
| 29 | Routing Gateways Quick Edit Modal | Replace `saveError` div with standard banner on `RoutingGatewaysArchetype.tsx` | M4 | Survey E1 |
| 30 | Routing Gateway Dedicated Detail Modal | Standard error banner on `RoutingGatewayDetailArchetype.tsx` | M4 | Survey E1 |
| 31 | Softswitch Node Registration Modal | Replace `addMsg` div with standard banner on `SoftswitchesArchetype.tsx` | M4 | Survey E1 |
| 32 | Payment Gateway Settings Form | Standard error banner on `PaymentSettingsArchetype.tsx` | M4 | Survey E1 |
| 33 | Rate Editor: Add Destination Rate Modal | Replace `addErr` div with standard banner on `RateEditorArchetype.tsx` | M5 | Survey E1 |
| 34 | Rate Editor: Edit Rate Prefix Modal | Replace `editErr` div with standard banner on `RateEditorArchetype.tsx` | M5 | Survey E1 |
| 35 | Rate Editor: Bulk Adjust Modal | Replace `bulkErr` div with standard banner on `RateEditorArchetype.tsx` | M5 | Survey E1 |
| 36 | Rate Editor: Table Actions & Delete | Replace `alert()` on delete/save with standard banner on `RateEditorArchetype.tsx` | M5 | Survey E1 |
| 37 | Rate Groups: Create, Duplicate, Edit, Delete Modals | Standard error banner across all modals on `RateGroupsArchetype.tsx` | M5 | Survey E1 |
| 38 | 4-Stage Rate Ingestion Wizard | Replace `alert()` and error divs with standard banner on `RateImportsArchetype.tsx` | M5 | Survey E1 |
| 39 | Support Tickets: Open Ticket Modal | Un-swallow `catch {}` and render standard banner on `SupportTicketsArchetype.tsx` | M5 | Survey E1 |
| 40 | Support Tickets: Ticket Reply Form | Standard error banner on `SupportTicketsArchetype.tsx` | M5 | Survey E1 |
| 41 | CDR Export Job Creation Modal | Standard error banner on `CdrExportsArchetype.tsx` | M5 | Survey E1 |
| 42 | CDR Export Job Actions & Data Export Dialog | Replace `alert()` with standard error feedback on `CdrExportsArchetype.tsx` & `ExportModal.tsx` | M5 | Survey E1 |
| 43 | NOC Diagnostics & Alarm Center Forms | Un-swallow `catch {}` and render standard banner on `CallAnalysisArchetype.tsx`, `RegistrationAnalysisArchetype.tsx`, `AlarmCenterArchetype.tsx` | M5 | Survey E1 |
| 44 | Tier 1 Unit Test Matrix | Comprehensive unit tests for `parseFormError` in `apps/web/lib/form-error.test.ts` | M6 | Survey E3 |
| 45 | Tier 2 State & Contract Tests | State machine and hook contract tests in `apps/web/lib/form-error-state.test.ts` | M6 | Survey E3 |
| 46 | Tier 3 Static Analysis Scanner | AST/static scanner enforcing 100% `<FormErrorAlert>` inclusion across all forms | M6 | Survey E3 |
| 47 | Tier 4 Build & Non-Regression Gate | Turbopack build, TypeScript strict mode, 110+ existing tests, and route validation | M6 | Survey E3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Core Error Alert Component & Parser | `FormErrorAlert.tsx`, `form-error.ts`, `use-form-error.ts`, `api.ts` enhancement | none | DONE |
| 2 | Auth & Identity Domain Forms | `AuthPage.tsx`, `LogoutPage.tsx`, `SettingsArchetype.tsx` | M1 | IN_PROGRESS |
| 3 | Customer Wizard & Core Archetypes | `CreateCustomerForm.tsx`, `EditorFormArchetype.tsx`, `FinanceActionArchetype.tsx`, `ListTableArchetype.tsx` | M1 | IN_PROGRESS |
| 4 | Telecom Routing & Gateway Forms | `DetailArchetype.tsx`, `MappingGatewaysArchetype.tsx`, `MappingGatewayDetailArchetype.tsx`, `RoutingGatewaysArchetype.tsx`, `RoutingGatewayDetailArchetype.tsx`, `SoftswitchesArchetype.tsx`, `PaymentSettingsArchetype.tsx` | M1 | IN_PROGRESS |
| 5 | Rate Management & Support Suite | `RateEditorArchetype.tsx`, `RateGroupsArchetype.tsx`, `RateImportsArchetype.tsx`, `SupportTicketsArchetype.tsx`, `CdrExportsArchetype.tsx`, `ExportModal.tsx`, `AlarmCenterArchetype.tsx`, `CallAnalysisArchetype.tsx`, `RegistrationAnalysisArchetype.tsx` | M1 | IN_PROGRESS |
| 6 | Automated Test Suite & Verification | `form-error.test.ts`, `form-error-state.test.ts`, `scripts/audit_forms.py` / scanner, full monorepo build & gate | M1, M2, M3, M4, M5 | PLANNED |

## Interface Contracts

### `ParsedFormError` Contract (`apps/web/lib/form-error.ts`)
```typescript
export interface FormFieldError {
  field: string;
  message: string;
  code?: string;
}

export interface ParsedFormError {
  hasError: boolean;
  message: string;
  code?: string;
  status?: number;
  requestId?: string;
  fieldErrors: FormFieldError[];
  fieldErrorMap: Record<string, string>;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ParseFormErrorOptions {
  fallbackMessage?: string;
  fieldMap?: Record<string, string>;
  fieldLabels?: Record<string, string> | ((field: string) => string);
}

export function parseFormError(rawError: unknown, options?: ParseFormErrorOptions): ParsedFormError;
```

### `FormErrorAlertProps` Contract (`apps/web/components/shared/FormErrorAlert.tsx`)
```typescript
export interface FormErrorAlertProps {
  error?: ParsedFormError | unknown;
  title?: string;
  onDismiss?: () => void;
  onRetry?: () => void | Promise<void>;
  isRetrying?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  autoScroll?: boolean;
  autoFocus?: boolean;
  showFieldLinks?: boolean;
  fieldIdPrefix?: string;
  fieldLabels?: Record<string, string> | ((field: string) => string);
}
```

## Code Layout
- `apps/web/lib/form-error.ts`: Universal error normalization parser.
- `apps/web/lib/use-form-error.ts`: Dual-level validation and focus/scroll synchronization hook.
- `apps/web/components/shared/FormErrorAlert.tsx`: Accessible top-level form error banner.
- `apps/web/lib/api.ts`: API client error envelope preservation.
- `apps/web/components/AuthPage.tsx`: Auth domain forms.
- `apps/web/components/LogoutPage.tsx`: Session revocation form.
- `apps/web/components/CreateCustomerForm.tsx`: 7-step customer provisioning wizard.
- `apps/web/components/archetypes/*`: Specialized form archetypes.
- `apps/web/lib/form-error.test.ts`: Tier 1 parser test suite.
- `apps/web/lib/form-error-state.test.ts`: Tier 2 hook & state test suite.
- `scripts/audit_forms.py` / `scripts/audit-form-error-handling.mjs`: Tier 3 static AST scanner.
