"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API } from "../lib/api";
import { Icon } from "../lib/icons";
import { PhoneInput } from "./shared/PhonePill";
import { FormErrorAlert } from "./shared/FormErrorAlert";
import { useFormError } from "../lib/use-form-error";

async function post(path: string, body: any) {
  const r = await fetch(API + path, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({ ok: false, error: { message: "Invalid API response" } }));
  return { response: r, json: j };
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

const authFieldLabels: Record<string, string> = {
  orgName: "Organization Name",
  email: "Email Address",
  phone: "Contact Phone",
  password: "Password",
  confirmPassword: "Confirm Password",
  code: "Verification Code",
  resetToken: "Reset Token",
  ticket: "MFA Challenge Ticket",
};

export function AuthPage({
  side,
  title,
  route,
}: {
  side: "Admin" | "Client";
  title: string;
  route: string;
}) {
  const router = useRouter();
  const lower = title.toLowerCase();
  const setup = lower.includes("mfa setup");
  const challenge = lower.includes("mfa challenge");
  const resetPage = lower.includes("forgot") || lower.includes("reset password");
  const isDev = process.env.NODE_ENV !== "production";

  const [email, setEmail] = useState(isDev ? (side === "Admin" ? "admin@example.com" : "client@example.com") : "");
  const [password, setPassword] = useState(isDev ? (side === "Admin" ? "Admin123!" : "Client123!") : "");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"login" | "mfa" | "reset" | "setup" | "register">(
    challenge ? "mfa" : resetPage ? "reset" : setup ? "setup" : "login"
  );
  const [ticket, setTicket] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem("vos_mfa_ticket") ?? "" : ""));
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [enrollment, setEnrollment] = useState<any>(null);
  const [recovery, setRecovery] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);

  const {
    formError,
    fieldErrors,
    setError,
    clearFieldError,
    clearErrors,
    bannerRef,
  } = useFormError({
    autoScroll: true,
    autoFocus: true,
    fieldLabels: authFieldLabels,
  });

  // Theme Management on Auth Pages
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vos_theme") as "light" | "dark" | null;
      if (saved) {
        setTheme(saved);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        setTheme(prefersDark ? "dark" : "light");
      }
    } catch {}
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem("vos_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      if (next === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    } catch {}
  }

  function copyText(val: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  }

  function switchMode(nextMode: "login" | "mfa" | "reset" | "setup" | "register") {
    setMode(nextMode);
    clearErrors();
    setMessage("");
  }

  // 1. Submit Login Handler
  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    setMessage("");

    const fe: Array<{ field: string; message: string }> = [];
    if (!email.trim()) {
      fe.push({ field: "email", message: "Email is required" });
    } else if (!isEmail(email.trim())) {
      fe.push({ field: "email", message: "Enter a valid email address" });
    }
    if (!password) {
      fe.push({ field: "password", message: "Password is required" });
    }

    if (fe.length > 0) {
      setError({
        message: "Please correct the highlighted form errors.",
        code: "VALIDATION_ERROR",
        fieldErrors: fe,
      });
      return;
    }

    setBusy(true);
    try {
      const endpoint = side === "Admin" ? "/api/v1/admin/auth/login" : "/api/v1/auth/login";
      const { response, json } = await post(endpoint, { email: email.trim(), password });

      if (json?.error?.code === "MFA_REQUIRED") {
        const t = String(json.error.details?.ticket ?? "");
        sessionStorage.setItem("vos_mfa_ticket", t);
        setTicket(t);
        switchMode("mfa");
        return;
      }

      if (!response.ok || json?.ok === false) {
        const errCode = json?.error?.code;
        let errMsg = json?.error?.message;
        if (errCode === "INVALID_CREDENTIALS") {
          errMsg = "Invalid email or password. Check your credentials and try again.";
        } else if (errCode === "RATE_LIMITED") {
          errMsg = "Too many sign-in attempts. Please wait a few minutes and try again.";
        }

        setError({
          message: errMsg || "Login failed. Please try again.",
          code: errCode || (response.status >= 500 ? "SYSTEM_ERROR" : "AUTH_FAILED"),
          status: response.status,
          requestId: json?.error?.request_id || json?.request_id || json?.requestId,
          fieldErrors: json?.error?.details?.field
            ? [{ field: json.error.details.field, message: errMsg || "Invalid value" }]
            : json?.error?.details?.errors || [],
          raw: json,
        });
        return;
      }

      router.push(side === "Admin" ? "/admin" : "/app");
      router.refresh();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  // 2. Submit Register Handler
  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    setMessage("");

    if (side !== "Client") {
      setError({
        message: "Self-registration is available on the client portal only.",
        code: "UNAUTHORIZED",
      });
      return;
    }

    const fe: Array<{ field: string; message: string }> = [];
    if (!orgName.trim()) fe.push({ field: "orgName", message: "Organization name is required" });
    if (!email.trim()) {
      fe.push({ field: "email", message: "Email is required" });
    } else if (!isEmail(email.trim())) {
      fe.push({ field: "email", message: "Enter a valid email address" });
    }
    if (!phone.trim()) {
      fe.push({ field: "phone", message: "Phone is required" });
    } else if (phone.trim().length < 7) {
      fe.push({ field: "phone", message: "Enter a valid phone number" });
    }
    if (!password) {
      fe.push({ field: "password", message: "Password is required" });
    } else if (password.length < 10) {
      fe.push({ field: "password", message: "Password must be at least 10 characters" });
    }
    if (!confirmPassword) {
      fe.push({ field: "confirmPassword", message: "Please confirm your password" });
    } else if (password !== confirmPassword) {
      fe.push({ field: "confirmPassword", message: "Passwords do not match" });
    }

    if (fe.length > 0) {
      setError({
        message: "Please correct the highlighted form errors.",
        code: "VALIDATION_ERROR",
        fieldErrors: fe,
      });
      return;
    }

    setBusy(true);
    try {
      const { response, json } = await post("/api/v1/auth/register", {
        email: email.trim(),
        password,
        organizationName: orgName.trim(),
        phone: phone.trim(),
      });

      if (!response.ok || json?.ok === false) {
        const msg = json?.error?.message ?? "Registration failed";
        const errCode = json?.error?.code;
        const isDuplicate = /exists|already/i.test(msg) || errCode === "USER_EXISTS" || errCode === "DUPLICATE_EMAIL";
        const isNotFound = response.status === 404 || /404|not found|REGISTER/i.test(msg);

        if (isNotFound) {
          setError({
            message: "Self-registration is invite-only. Contact your administrator for an invitation.",
            code: "INVITE_ONLY",
            status: response.status,
          });
          return;
        }

        const fieldErrorsList = isDuplicate
          ? [{ field: "email", message: "An account with this email already exists" }]
          : json?.error?.details?.errors || (json?.error?.details?.field ? [{ field: json.error.details.field, message: msg }] : []);

        setError({
          message: msg,
          code: errCode || "REGISTRATION_FAILED",
          status: response.status,
          requestId: json?.error?.request_id || json?.request_id,
          fieldErrors: fieldErrorsList,
          raw: json,
        });
        return;
      }

      setMessage("Registration request received. Check your email for activation instructions.");
      switchMode("login");
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  // 3. Submit MFA Challenge Handler
  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    setMessage("");

    const fe: Array<{ field: string; message: string }> = [];
    if (!ticket) fe.push({ field: "ticket", message: "MFA challenge ticket is missing. Sign in again." });
    if (!code.trim()) {
      fe.push({ field: "code", message: "Verification code is required" });
    } else if (!/^\d{6}(-\d{4})?$/.test(code.trim()) && !/^[a-f0-9-]{8,}$/i.test(code.trim()) && code.trim().length < 6) {
      fe.push({ field: "code", message: "Enter a 6-digit authenticator code or a recovery code" });
    }

    if (fe.length > 0) {
      setError({
        message: !ticket ? "MFA challenge ticket is missing. Sign in again." : "Please correct the highlighted verification errors.",
        code: "VALIDATION_ERROR",
        fieldErrors: fe,
      });
      return;
    }

    setBusy(true);
    try {
      if (!ticket) {
        setError({
          message: "MFA challenge ticket is missing. Sign in again.",
          code: "TICKET_MISSING",
        });
        return;
      }
      const endpoint = side === "Admin" ? "/api/v1/admin/auth/mfa/verify" : "/api/v1/auth/mfa/verify";
      const { response, json } = await post(endpoint, { ticket, code: code.trim() });

      if (!response.ok || json?.ok === false) {
        const c = json?.error?.code;
        const isInvalidMfa = c === "INVALID_MFA" || c === "INVALID_MFA_CODE" || c === "INVALID_CODE";
        const fieldErrorsList = isInvalidMfa
          ? [{ field: "code", message: "Invalid or expired code. Try again or use a recovery code." }]
          : [];

        setError({
          message: json?.error?.message ?? "MFA verification failed",
          code: c || "MFA_FAILED",
          status: response.status,
          requestId: json?.error?.request_id || json?.request_id,
          fieldErrors: fieldErrorsList,
          raw: json,
        });
        return;
      }

      sessionStorage.removeItem("vos_mfa_ticket");
      router.push(side === "Admin" ? "/admin" : "/app");
      router.refresh();
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  // 4. Request Password Reset Handler
  async function requestReset() {
    clearErrors();
    setMessage("");

    const fe: Array<{ field: string; message: string }> = [];
    if (!email.trim()) {
      fe.push({ field: "email", message: "Email is required" });
    } else if (!isEmail(email.trim())) {
      fe.push({ field: "email", message: "Enter a valid email address" });
    }

    if (fe.length > 0) {
      setError({
        message: "Please enter a valid email address.",
        code: "VALIDATION_ERROR",
        fieldErrors: fe,
      });
      return;
    }

    setBusy(true);
    try {
      const endpoint = side === "Admin" ? "/api/v1/admin/auth/password/request" : "/api/v1/auth/password/request";
      const { response, json } = await post(endpoint, { email: email.trim() });

      if (!response.ok || json?.ok === false) {
        setError({
          message: json?.error?.message ?? "Reset request failed",
          code: json?.error?.code || "RESET_REQUEST_FAILED",
          status: response.status,
          requestId: json?.error?.request_id || json?.request_id,
          raw: json,
        });
        return;
      }

      setMessage("If an eligible account exists, reset instructions have been sent through the configured channel.");
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  // 5. Finish Reset with Token Handler
  async function finishReset(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    setMessage("");

    const fe: Array<{ field: string; message: string }> = [];
    if (!resetToken.trim()) fe.push({ field: "resetToken", message: "Reset token is required" });
    if (!password) {
      fe.push({ field: "password", message: "New password is required" });
    } else if (password.length < 10) {
      fe.push({ field: "password", message: "Password must be at least 10 characters" });
    }
    if (!confirmPassword) {
      fe.push({ field: "confirmPassword", message: "Please confirm your new password" });
    } else if (password !== confirmPassword) {
      fe.push({ field: "confirmPassword", message: "Passwords do not match" });
    }

    if (fe.length > 0) {
      setError({
        message: "Please correct the highlighted password reset errors.",
        code: "VALIDATION_ERROR",
        fieldErrors: fe,
      });
      return;
    }

    setBusy(true);
    try {
      const endpoint = side === "Admin" ? "/api/v1/admin/auth/password/reset" : "/api/v1/auth/password/reset";
      const { response, json } = await post(endpoint, { token: resetToken.trim(), password });

      if (!response.ok || json?.ok === false) {
        const c = json?.error?.code;
        const isInvalidToken = c === "INVALID_RESET_TOKEN" || c === "INVALID_TOKEN";
        const fieldErrorsList = isInvalidToken
          ? [{ field: "resetToken", message: "Invalid or expired token." }]
          : [];

        setError({
          message: json?.error?.message ?? "Password reset failed",
          code: c || "RESET_FAILED",
          status: response.status,
          requestId: json?.error?.request_id || json?.request_id,
          fieldErrors: fieldErrorsList,
          raw: json,
        });
        return;
      }

      setMessage("Password reset completed. Sign in with your new credentials.");
      switchMode("login");
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  // 6. MFA Enroll & Verify Handlers (Setup)
  async function mfaEnroll() {
    clearErrors();
    setMessage("");
    setBusy(true);
    try {
      const { response, json } = await post("/api/v1/me/mfa", { action: "enroll" });
      if (response.status === 401) {
        router.push("/app/login");
        return;
      }
      if (!response.ok || json?.ok === false) {
        setError({
          message: json?.error?.message ?? "MFA enrollment failed",
          code: json?.error?.code || "MFA_ENROLL_FAILED",
          status: response.status,
          requestId: json?.error?.request_id || json?.request_id,
          raw: json,
        });
        return;
      }
      setEnrollment(json.data);
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function mfaVerify(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();
    setMessage("");

    const fe: Array<{ field: string; message: string }> = [];
    if (!enrollment?.enrollmentId) fe.push({ field: "code", message: "Start enrollment first" });
    if (!code.trim()) {
      fe.push({ field: "code", message: "6-digit code is required" });
    } else if (!/^\d{6}$/.test(code.trim())) {
      fe.push({ field: "code", message: "Enter a 6-digit code from your authenticator" });
    }

    if (fe.length > 0) {
      setError({
        message: fe.some((f) => f.message.includes("Start")) ? "Start enrollment first" : "Please enter your 6-digit verification code.",
        code: "VALIDATION_ERROR",
        fieldErrors: fe,
      });
      return;
    }

    setBusy(true);
    try {
      if (!enrollment?.enrollmentId) {
        setError({
          message: "Start enrollment first",
          code: "ENROLLMENT_REQUIRED",
        });
        return;
      }
      const { response, json } = await post("/api/v1/me/mfa", {
        action: "verify",
        enrollmentId: enrollment.enrollmentId,
        code: code.trim(),
      });

      if (!response.ok || json?.ok === false) {
        setError({
          message: json?.error?.message ?? "MFA verification failed",
          code: json?.error?.code || "INVALID_CODE",
          status: response.status,
          requestId: json?.error?.request_id || json?.request_id,
          fieldErrors: [{ field: "code", message: "Invalid code. Check your authenticator and try again." }],
          raw: json,
        });
        return;
      }

      setRecovery(json.data?.recoveryCodes ?? []);
      setMessage("MFA enabled successfully. Store recovery codes securely in a password manager.");
    } catch (err: any) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const inputErr = (name: string) => (fieldErrors[name] ? " inputError" : "");

  return (
    <div className="authShell">
      {/* Left Brand Hero Section */}
      <section className="authHero">
        <div className="brand" style={{ padding: 0 }}>
          <img src="/callwork/hor/logo.svg" alt="CallWork" width="132" height="36" style={{ height: "36px", width: "auto", display: "block", filter: "brightness(0) invert(1)" }} />
          <div>
            <div className="brandSubtitle" style={{ color: "#93c5fd" }}>Carrier Telecom Platform</div>
          </div>
        </div>

        <div>
          <div style={{ color: "#60a5fa", fontWeight: 750, fontSize: 11.5, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Carrier-Grade Telephony & Operations
          </div>
          <h1>Carrier operations, routing, billing & client self-service in one unified platform.</h1>
          <p style={{ maxWidth: 640, color: "#cbd5e1", fontSize: 15, lineHeight: 1.6, marginTop: 12 }}>
            High-speed CDR analytics, real-time NOC streaming, gateway metrics, rate cards, balance settlements, and automated reporting.
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            <span className="badge badge-online">ClickHouse CDR</span>
            <span className="badge badge-online">Redpanda Pipelines</span>
            <span className="badge badge-online">VOS3000 Adapter</span>
            <span className="badge badge-online">PostgreSQL Ledger</span>
          </div>
        </div>

        <div style={{ color: "#7084a3", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
          <span>PostgreSQL · ClickHouse · Redis · Redpanda</span>
          <span>Version 1.0 Enterprise</span>
        </div>
      </section>

      {/* Right Form Panel */}
      <section className="authPanel">
        <div style={{ position: "absolute", top: 20, right: 24, zIndex: 10 }}>
          <button
            type="button"
            className="iconBtn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </button>
        </div>

        <div className="authCard">
          <div className="eyebrow">{side} Security</div>
          <h2>{title}</h2>

          <FormErrorAlert
            ref={bannerRef}
            error={formError}
            onDismiss={clearErrors}
            showFieldLinks={true}
          />

          {message && (
            <div className="notice" role="status">
              {message}
            </div>
          )}

          {/* Mode: Login */}
          {mode === "login" && (
            <form onSubmit={submitLogin} noValidate>
              <p>Enter your authorized credentials to access {side.toLowerCase()} telemetry.</p>
              <div className="authField">
                <label htmlFor="auth-email">Email or login identifier</label>
                <input
                  id="auth-email"
                  name="email"
                  className={"input" + inputErr("email")}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "auth-email-error" : undefined}
                  autoComplete="username"
                  placeholder="operator@telecom.net"
                />
                {fieldErrors.email && (
                  <div className="fieldError" id="auth-email-error">
                    {fieldErrors.email}
                  </div>
                )}
              </div>

              <div className="authField">
                <label htmlFor="auth-pass">Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="auth-pass"
                    name="password"
                    className={"input" + inputErr("password")}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError("password");
                    }}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "auth-pass-error" : undefined}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="iconBtn"
                    style={{ position: "absolute", right: 6, top: 4, width: 28, height: 28, border: "none" }}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={14} />
                  </button>
                </div>
                {fieldErrors.password && (
                  <div className="fieldError" id="auth-pass-error">
                    {fieldErrors.password}
                  </div>
                )}
              </div>

              <button
                className="btn primary"
                style={{ width: "100%", height: 42, marginTop: 10 }}
                disabled={busy}
                type="submit"
              >
                {busy ? "Authenticating…" : "Sign In"}
              </button>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  type="button"
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => switchMode("reset")}
                >
                  Forgot password?
                </button>
                {side === "Client" && (
                  <button
                    type="button"
                    className="btn"
                    style={{ flex: 1 }}
                    onClick={() => switchMode("register")}
                  >
                    Create account
                  </button>
                )}
              </div>

              {process.env.NODE_ENV !== "production" && (
                <div className="notice" style={{ marginTop: 18, fontSize: 11.5 }}>
                  <strong>Development Mode:</strong> Demo operator credentials have been pre-filled for local testing.
                </div>
              )}
            </form>
          )}

          {/* Mode: Register (Client Portal) */}
          {mode === "register" && (
            <form onSubmit={submitRegister} noValidate>
              <p>Create your client workspace. New accounts will be linked to VOS credentials.</p>
              <div className="authField">
                <label htmlFor="reg-org">Organization name</label>
                <input
                  id="reg-org"
                  name="orgName"
                  className={"input" + inputErr("orgName")}
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                    clearFieldError("orgName");
                  }}
                  aria-invalid={Boolean(fieldErrors.orgName)}
                  aria-describedby={fieldErrors.orgName ? "reg-org-error" : undefined}
                  placeholder="Acme Telecom Corp."
                />
                {fieldErrors.orgName && (
                  <div className="fieldError" id="reg-org-error">
                    {fieldErrors.orgName}
                  </div>
                )}
              </div>
              <div className="authField">
                <label htmlFor="reg-email">Work email</label>
                <input
                  id="reg-email"
                  name="email"
                  className={"input" + inputErr("email")}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
                  placeholder="admin@acmetelecom.com"
                />
                {fieldErrors.email && (
                  <div className="fieldError" id="reg-email-error">
                    {fieldErrors.email}
                  </div>
                )}
              </div>
              <div className="authField">
                <label htmlFor="reg-phone">Contact phone</label>
                <PhoneInput
                  id="reg-phone"
                  name="phone"
                  className={inputErr("phone")}
                  value={phone}
                  onChange={(val) => {
                    setPhone(val);
                    clearFieldError("phone");
                  }}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? "reg-phone-error" : undefined}
                  placeholder="+1 (555) 019-2831 or 447911123456"
                />
                {fieldErrors.phone && (
                  <div className="fieldError" id="reg-phone-error">
                    {fieldErrors.phone}
                  </div>
                )}
              </div>
              <div className="authField">
                <label htmlFor="reg-pass">Secure password</label>
                <input
                  id="reg-pass"
                  name="password"
                  className={"input" + inputErr("password")}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "reg-pass-error" : undefined}
                  placeholder="Min 10 characters"
                />
                {fieldErrors.password && (
                  <div className="fieldError" id="reg-pass-error">
                    {fieldErrors.password}
                  </div>
                )}
              </div>
              <div className="authField">
                <label htmlFor="reg-confirm">Confirm password</label>
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  className={"input" + inputErr("confirmPassword")}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? "reg-confirm-error" : undefined}
                />
                {fieldErrors.confirmPassword && (
                  <div className="fieldError" id="reg-confirm-error">
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>
              <button className="btn primary" style={{ width: "100%", height: 42, marginTop: 10 }} disabled={busy}>
                {busy ? "Submitting…" : "Register Workspace"}
              </button>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => switchMode("login")}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Mode: MFA Verification */}
          {mode === "mfa" && (
            <form onSubmit={submitMfa} noValidate>
              <p>Enter the 6-digit one-time code from your authenticator app.</p>
              <div className="authField">
                <label htmlFor="mfa-code">Authenticator code</label>
                <input
                  id="mfa-code"
                  name="code"
                  className={"input mono" + inputErr("code")}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    clearFieldError("code");
                  }}
                  aria-invalid={Boolean(fieldErrors.code)}
                  aria-describedby={fieldErrors.code ? "mfa-code-error" : undefined}
                  placeholder="123456"
                  maxLength={12}
                />
                {fieldErrors.code && (
                  <div className="fieldError" id="mfa-code-error">
                    {fieldErrors.code}
                  </div>
                )}
              </div>
              <button className="btn primary" style={{ width: "100%", height: 42, marginTop: 10 }} disabled={busy}>
                {busy ? "Verifying…" : "Verify and Continue"}
              </button>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => switchMode("login")}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Mode: Reset Password */}
          {mode === "reset" && (
            <form onSubmit={finishReset} noValidate>
              <p>Request password reset instructions or paste your recovery token below.</p>
              <div className="authField">
                <label htmlFor="reset-email">Registered work email</label>
                <input
                  id="reset-email"
                  name="email"
                  className={"input" + inputErr("email")}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "reset-email-error" : undefined}
                  placeholder="operator@telecom.net"
                />
                {fieldErrors.email && (
                  <div className="fieldError" id="reset-email-error">
                    {fieldErrors.email}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", height: 38 }}
                disabled={busy}
                onClick={requestReset}
              >
                Send Reset Link
              </button>

              <div className="authDivider">
                <span>or reset using token</span>
              </div>

              <div className="authField">
                <label htmlFor="reset-token">Reset token</label>
                <input
                  id="reset-token"
                  name="resetToken"
                  className={"input mono" + inputErr("resetToken")}
                  value={resetToken}
                  onChange={(e) => {
                    setResetToken(e.target.value);
                    clearFieldError("resetToken");
                  }}
                  aria-invalid={Boolean(fieldErrors.resetToken)}
                  aria-describedby={fieldErrors.resetToken ? "reset-token-error" : undefined}
                  placeholder="Paste token from email"
                />
                {fieldErrors.resetToken && (
                  <div className="fieldError" id="reset-token-error">
                    {fieldErrors.resetToken}
                  </div>
                )}
              </div>
              <div className="authField">
                <label htmlFor="reset-pass">New password</label>
                <input
                  id="reset-pass"
                  name="password"
                  className={"input" + inputErr("password")}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "reset-pass-error" : undefined}
                  placeholder="Min 10 characters"
                />
                {fieldErrors.password && (
                  <div className="fieldError" id="reset-pass-error">
                    {fieldErrors.password}
                  </div>
                )}
              </div>
              <div className="authField">
                <label htmlFor="reset-confirm">Confirm new password</label>
                <input
                  id="reset-confirm"
                  name="confirmPassword"
                  className={"input" + inputErr("confirmPassword")}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? "reset-confirm-error" : undefined}
                />
                {fieldErrors.confirmPassword && (
                  <div className="fieldError" id="reset-confirm-error">
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>
              <button className="btn primary" style={{ width: "100%", height: 42, marginTop: 10 }} disabled={busy}>
                {busy ? "Resetting…" : "Confirm New Password"}
              </button>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => switchMode("login")}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Mode: MFA Setup */}
          {mode === "setup" && (
            <form onSubmit={mfaVerify} noValidate>
              <p>Configure multi-factor authentication (TOTP) for privileged telecom operations.</p>
              {!enrollment ? (
                <button
                  type="button"
                  className="btn primary"
                  onClick={mfaEnroll}
                  disabled={busy}
                  style={{ width: "100%", height: 42 }}
                >
                  Generate MFA Secret
                </button>
              ) : (
                <>
                  <div className="notice" style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>Secret Key</strong>
                      <button
                        type="button"
                        onClick={() => copyText(enrollment.secret)}
                        className="btn sm"
                        style={{ height: 24, fontSize: 11 }}
                      >
                        {copiedKey ? "Copied" : "Copy"}
                      </button>
                    </div>
                    <div className="mono" style={{ wordBreak: "break-all", marginTop: 4 }}>
                      {enrollment.secret}
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <strong>Authenticator URI</strong>
                    </div>
                    <div className="mono" style={{ wordBreak: "break-all", fontSize: 11, color: "var(--muted)" }}>
                      {enrollment.otpauthUrl}
                    </div>
                  </div>

                  <div className="authField">
                    <label htmlFor="setup-code">Enter 6-digit confirmation code</label>
                    <input
                      id="setup-code"
                      name="code"
                      className={"input mono" + inputErr("code")}
                      value={code}
                      onChange={(e) => {
                        setCode(e.target.value);
                        clearFieldError("code");
                      }}
                      aria-invalid={Boolean(fieldErrors.code)}
                      aria-describedby={fieldErrors.code ? "setup-code-error" : undefined}
                      placeholder="123456"
                    />
                    {fieldErrors.code && (
                      <div className="fieldError" id="setup-code-error">
                        {fieldErrors.code}
                      </div>
                    )}
                  </div>

                  <button className="btn primary" style={{ width: "100%", height: 42 }} disabled={busy}>
                    {busy ? "Activating…" : "Verify and Enable MFA"}
                  </button>
                </>
              )}

              {recovery.length > 0 && (
                <div className="notice" style={{ marginTop: 16 }}>
                  <strong>Recovery Codes (Save these now)</strong>
                  <div className="authRecoveryGrid">
                    {recovery.map((x) => (
                      <div className="mono" key={x} style={{ fontSize: 11 }}>
                        {x}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 16, textAlign: "center" }}>
                <Link href="/app" style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>
                  Return to Portal Overview
                </Link>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
