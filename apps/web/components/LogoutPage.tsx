"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API } from "../lib/api";
import { Icon } from "../lib/icons";
import { FormErrorAlert } from "./shared/FormErrorAlert";
import { useFormError } from "../lib/use-form-error";

export function LogoutPage({ side }: { side: "Admin" | "Client" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const { formError, setError, clearErrors, bannerRef } = useFormError({
    autoScroll: true,
    autoFocus: true,
  });

  // Theme Management on Logout Page
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

  async function doLogout() {
    setBusy(true);
    clearErrors();
    try {
      const res = await fetch(`${API}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError({
          message: json?.error?.message || "Failed to terminate session on server.",
          code: json?.error?.code || "LOGOUT_FAILED",
          status: res.status,
          requestId: json?.error?.request_id || json?.request_id,
          raw: json,
        });
        return;
      }
      sessionStorage.removeItem("vos_mfa_ticket");
      setDone(true);
      setTimeout(() => {
        const loginUrl = side === "Admin" ? "/admin/login" : "/app/login";
        router.push(loginUrl);
        router.refresh();
        setTimeout(() => {
          window.location.href = loginUrl;
        }, 250);
      }, 700);
    } catch (e: any) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void doLogout();
  }, []);

  return (
    <div
      className="authPanel"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg)",
        position: "relative",
      }}
    >
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

      <div className="authCard" style={{ textAlign: "center", padding: "36px 28px", maxWidth: 440 }}>
        <div
          className="brandMark"
          style={{
            margin: "0 auto 16px",
            width: 48,
            height: 48,
            fontSize: 22,
            display: "grid",
            placeItems: "center",
          }}
        >
          V
        </div>

        <div className="eyebrow">{side} Security Session</div>
        <h2>{done ? "Session Terminated" : "Signing Out…"}</h2>

        <FormErrorAlert
          ref={bannerRef}
          error={formError}
          onDismiss={clearErrors}
          onRetry={doLogout}
          isRetrying={busy}
          style={{ marginTop: 14 }}
        />

        <div style={{ marginTop: 16 }}>
          {done ? (
            <div className="notice" role="status" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              <Icon name="check" size={16} style={{ color: "var(--success)" }} />
              <span>Session revoked successfully. Redirecting…</span>
            </div>
          ) : (
            <div className="notice" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
              <Icon name="refresh" size={16} className="spin" />
              <span>Revoking security tokens and clearing browser cookies…</span>
            </div>
          )}
        </div>

        {/* Animated Progress Bar */}
        <div
          style={{
            height: 4,
            width: "100%",
            background: "var(--surface2)",
            borderRadius: 2,
            margin: "20px 0 16px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: done ? "100%" : "40%",
              background: done ? "var(--success)" : "var(--primary)",
              borderRadius: 2,
              transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
          <Link
            className="btn primary"
            style={{ width: "100%", height: 38, justifyContent: "center" }}
            href={side === "Admin" ? "/admin/login" : "/app/login"}
          >
            Return to Sign In Now
          </Link>
        </div>

        <div className="help" style={{ marginTop: 14 }}>
          For shared or NOC workstation terminals, remember to close all open browser windows.
        </div>
      </div>
    </div>
  );
}
