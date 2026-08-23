"use client";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { routesForSide, routeMatches } from "@vos/shared";
import { API } from "../lib/api";
import { Icon, iconForGroup } from "../lib/icons";
import { SupportFab } from "./SupportFab";

type RouteDef = ReturnType<typeof routesForSide>[number];
type Health = { ok?: boolean; data_mode?: string; dependencies?: Record<string, string> };

export function Shell({
  side,
  children,
  dark: forceDark = false,
}: {
  side: "Admin" | "Client";
  children: React.ReactNode;
  dark?: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const routes = useMemo(() => routesForSide(side), [side]);
  const groups = useMemo(() => [...new Set(routes.map((r) => r.group))], [routes]);

  // Theme Management
  const [themePreference, setThemePreference] = useState<"light" | "dark" | "auto">("auto");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("vos_theme") as "light" | "dark" | "auto" | null;
      if (saved) {
        setThemePreference(saved);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        setThemePreference(prefersDark ? "dark" : "light");
      }
    } catch {}
  }, []);

  const isDarkMode = forceDark || themePreference === "dark";

  useEffect(() => {
    try {
      const effectiveTheme = isDarkMode ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", effectiveTheme);
      if (effectiveTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, [isDarkMode]);

  function toggleTheme() {
    const next = isDarkMode ? "light" : "dark";
    setThemePreference(next);
    try {
      localStorage.setItem("vos_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }

  // System Health
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState(false);
  useEffect(() => {
    let stop = false;
    async function check() {
      try {
        const res = await fetch(`${API}/api/v1/health`, { cache: "no-store" });
        const json = await res.json();
        if (!stop) {
          setHealth(json);
          setHealthError(!res.ok);
        }
      } catch {
        if (!stop) setHealthError(true);
      }
    }
    void check();
    const t = setInterval(() => void check(), 30000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);

  const system = healthError ? "Offline" : !health ? "Checking" : health.data_mode&&health.data_mode!=="external" ? "Demo" : health.ok ? "Online" : "Degraded";
  const systemClass = system === "Online" ? "online" : system === "Demo" || system === "Checking" ? "neutral" : "warning";

  // Navigation & Dropdown
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Command Palette (Cmd+K)
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [cmdIndex, setCmdIndex] = useState(0);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  // Find Current Route Title
  const currentRouteDef = useMemo(() => {
    return routes.find((r) => routeMatches(r.route, path));
  }, [routes, path]);

  // Keyboard Shortcuts (Cmd+K / Ctrl+K and Escape)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") {
        setCmdOpen(false);
        setMenuOpen(false);
        setMobileNavOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (cmdOpen) {
      setCmdQuery("");
      setCmdIndex(0);
      setTimeout(() => cmdInputRef.current?.focus(), 50);
    }
  }, [cmdOpen]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileNavOpen(false);
  }, [path]);

  // Click Outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  // Filtered Routes for Command Palette
  const filteredRoutes = useMemo(() => {
    const q = cmdQuery.toLowerCase().trim();
    if (!q) return routes.slice(0, 15);
    return routes
      .filter((r) => r.name.toLowerCase().includes(q) || r.route.toLowerCase().includes(q) || r.group.toLowerCase().includes(q) || r.archetype.toLowerCase().includes(q))
      .slice(0, 12);
  }, [routes, cmdQuery]);

  const selectCmdRoute = useCallback(
    (targetRoute: RouteDef) => {
      setCmdOpen(false);
      if (targetRoute.route.includes("{")) {
        router.push(targetRoute.route.replace(/\{[^}]+\}/g, "1"));
      } else {
        router.push(targetRoute.route);
      }
    },
    [router]
  );

  function handleCmdKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCmdIndex((i) => (i + 1) % Math.max(1, filteredRoutes.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCmdIndex((i) => (i - 1 + filteredRoutes.length) % Math.max(1, filteredRoutes.length));
    } else if (e.key === "Enter" && filteredRoutes[cmdIndex]) {
      e.preventDefault();
      selectCmdRoute(filteredRoutes[cmdIndex]);
    }
  }

  async function doLogout() {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await fetch(`${API}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
      }).catch(() => null);
      sessionStorage.removeItem("vos_mfa_ticket");
      router.push(side === "Admin" ? "/admin/login" : "/app/login");
      router.refresh();
      setTimeout(() => {
        window.location.href = side === "Admin" ? "/admin/login" : "/app/login";
      }, 300);
    } catch (e: any) {
      setLogoutError(e?.message ?? "Logout failed");
    } finally {
      setLoggingOut(false);
    }
  }

  // Lock body scroll when mobile navigation drawer is open
  useEffect(() => {
    if (typeof document !== "undefined") {
      if (mobileNavOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [mobileNavOpen]);

  const loginHref = side === "Admin" ? "/admin/login" : "/app/login";

  return (
    <div className={`shell ${isDarkMode ? "darkMode dark" : "light"}`} data-theme={isDarkMode ? "dark" : "light"}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {/* Mobile Drawer Backdrop */}
      {mobileNavOpen && <div className="drawerBackdrop" onClick={() => setMobileNavOpen(false)} />}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`} aria-label={`${side} portal navigation`}>
        <div className="brand">
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img src="/callwork/hor/logo.svg" alt="CallWork" width="112" height="32" style={{ height: "32px", width: "auto", display: "block" }} />
            <div style={{ minWidth: 0 }}>
              <span className="brandSubtitle">{side} operations</span>
            </div>
          </div>
          <button
            type="button"
            className="mobileDrawerCloseBtn"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation drawer"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="sideScroll">
          {groups.map((g) => {
            const groupRoutes = routes.filter(
              (r) =>
                r.group === g &&
                !r.route.includes("login") &&
                !r.route.includes("forgot") &&
                !r.route.includes("mfa") &&
                !r.route.includes("{")
            );
            if (!groupRoutes.length) return null;
            return (
              <div key={g}>
                <div className="navGroup">{g}</div>
                {groupRoutes.map((r) => {
                  const active = routeMatches(r.route, path);
                  return (
                    <Link
                      key={r.route}
                      className={`navLink ${active ? "active" : ""}`}
                      href={r.route}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <span className="navIcon">
                        <Icon name={iconForGroup(g)} size={15} />
                      </span>
                      <span>{r.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="sideFoot">
          {/* NOC Support Card */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.15), rgba(6,182,212,0.1))",
              border: "1px solid var(--nav-border)",
              borderRadius: "var(--radius)",
              padding: "12px 14px",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1", fontSize: 12, fontWeight: 700 }}>
              <Icon name="support" size={14} className="text-primary" />
              <span>24/7 NOC Support</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--nav-muted)", margin: "4px 0 8px" }}>
              Direct hotline & emergency dispatch
            </div>
            <Link
              href={side === "Admin" ? "/admin/support/tickets" : "/app/support/tickets"}
              className="btn sm"
              style={{
                width: "100%",
                height: 28,
                fontSize: 11.5,
                background: "var(--primary)",
                color: "#ffffff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                fontWeight: 650,
                textDecoration: "none",
              }}
            >
              <Icon name="pulse" size={12} />
              <span>Contact NOC</span>
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 650, color: "#cbd5e1", fontSize: 12 }}>VOS3000 Engine</div>
              <span className="badge badge-online" style={{ fontSize: 10, padding: "1px 6px" }}>
                {health?.data_mode ?? (health?.ok ? "Online" : "Checking")}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Link
                href={side === "Admin" ? "/admin/settings/sessions" : "/app/settings/security/mfa"}
                className="sideFootLink"
              >
                <Icon name="shield" size={13} />
                <span>{side === "Admin" ? "Sessions" : "Security"}</span>
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                className="sideFootLink"
                title={`Switch to ${isDarkMode ? "Light" : "Dark"} theme`}
                aria-label="Toggle theme"
              >
                <Icon name={isDarkMode ? "sun" : "moon"} size={13} />
                <span>{isDarkMode ? "Light" : "Dark"}</span>
              </button>
            </div>

            <button className="sideLogoutBtn" onClick={doLogout} disabled={loggingOut} aria-label="Sign out">
              <Icon name="close" size={13} />
              <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
            </button>
            {logoutError && <span className="sideFootError">{logoutError}</span>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="main" tabIndex={-1}>
        {/* Topbar */}
        <header className="topbar">
          <div className="topLeft">
            <button
              className="iconBtn"
              id="mobileMenuBtn"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation drawer"
            >
              <Icon name="menu" size={18} />
            </button>
            <div className="crumb">
              <span>{side}</span>
              <Icon name="chevronRight" size={12} />
              <span>{currentRouteDef?.group ?? "Operations"}</span>
              {currentRouteDef && (
                <>
                  <Icon name="chevronRight" size={12} />
                  <span className="crumbCurrent">{currentRouteDef.name}</span>
                </>
              )}
            </div>
            <span className={`environment ${systemClass}`}>
              <span className={`statusDot ${system === "Online" ? "pulse" : ""}`} />
              System {system}
            </span>
          </div>

          <div className="topRight">
            {/* Quick Search Spotlight Button */}
            <button className="searchTrigger" onClick={() => setCmdOpen(true)} title="Quick navigation (⌘K)">
              <Icon name="search" size={14} />
              <span>Search pages…</span>
              <kbd className="kbd">⌘K</kbd>
            </button>

            {/* Notification Bell */}
            <Link
              href={side === "Admin" ? "/admin/alarms" : "/app/notifications"}
              className="iconBtn"
              title="Notifications & Alarms"
              aria-label="Notifications"
              style={{ position: "relative" }}
            >
              <Icon name="bell" size={16} />
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--danger)",
                }}
              />
            </Link>

            {/* Dark / Light Toggle */}
            <button
              className="iconBtn"
              onClick={toggleTheme}
              title={`Switch to ${isDarkMode ? "Light" : "Dark"} mode`}
              aria-label="Toggle color theme"
            >
              <Icon name={isDarkMode ? "sun" : "moon"} size={16} />
            </button>

            {/* System Health Link (Admin Only) */}
            {side === "Admin" && (
              <Link
                href="/admin/system/health"
                className="iconBtn"
                title="System telemetry & health"
                aria-label="System health"
              >
                <Icon name="pulse" size={16} />
              </Link>
            )}

            {/* User Profile Menu */}
            <div className="userMenuWrap" ref={menuRef}>
              <button
                className="avatarBtn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={`${side} account menu`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <span className="avatar">{side[0]}</span>
                <span className="avatarLabel">{side} Portal</span>
                <span className="caret">
                  <Icon name="chevronDown" size={11} />
                </span>
              </button>

              {menuOpen && (
                <div className="userDropdown" role="menu">
                  <div className="dropdownHead">
                    <div className="dropdownTitle">{side} Operations</div>
                    <div className="dropdownSub">Signed in · {health?.data_mode ?? "active session"}</div>
                  </div>
                  {side === "Admin" ? (
                    <Link
                      role="menuitem"
                      className="dropdownItem"
                      href="/admin/settings/sessions"
                    >
                      <Icon name="shield" size={14} />
                      <span>Sessions & devices</span>
                    </Link>
                  ) : (
                    <Link
                      role="menuitem"
                      className="dropdownItem"
                      href="/app/settings/security/mfa"
                    >
                      <Icon name="shield" size={14} />
                      <span>2FA Security</span>
                    </Link>
                  )}
                  <Link
                    role="menuitem"
                    className="dropdownItem"
                    href={side === "Admin" ? "/admin/system/health" : "/app/settings/profile"}
                  >
                    <Icon name="settings" size={14} />
                    <span>Configuration</span>
                  </Link>
                  <div className="dropdownSep" />
                  <button role="menuitem" className="dropdownItem danger" onClick={doLogout} disabled={loggingOut}>
                    <Icon name="close" size={14} />
                    <span>{loggingOut ? "Signing out…" : "Sign out"}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        {children}
        {side === "Client" && <SupportFab />}
      </main>

      {/* Command Palette Modal (Cmd+K) */}
      {cmdOpen && (
        <div className="cmdBackdrop" onClick={() => setCmdOpen(false)}>
          <div className="cmdModal" onClick={(e) => e.stopPropagation()}>
            <div className="cmdInputWrap">
              <Icon name="search" size={18} className="text-muted" />
              <input
                ref={cmdInputRef}
                className="cmdInput"
                placeholder="Type a page name, route, or category…"
                value={cmdQuery}
                onChange={(e) => {
                  setCmdQuery(e.target.value);
                  setCmdIndex(0);
                }}
                onKeyDown={handleCmdKeyDown}
              />
              <kbd className="kbd">ESC</kbd>
            </div>
            <div className="cmdList">
              {filteredRoutes.length ? (
                filteredRoutes.map((r, i) => (
                  <div
                    key={r.route}
                    className={`cmdItem ${i === cmdIndex ? "selected" : ""}`}
                    onClick={() => selectCmdRoute(r)}
                    onMouseEnter={() => setCmdIndex(i)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Icon name={iconForGroup(r.group)} size={15} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <div className="mono" style={{ fontSize: 11, opacity: 0.8 }}>
                          {r.route}
                        </div>
                      </div>
                    </div>
                    <span className="cmdGroup">{r.group}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)" }}>
                  No pages found matching &ldquo;{cmdQuery}&rdquo;
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

