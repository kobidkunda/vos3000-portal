"use client";
import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../lib/icons";
import { api } from "../lib/api";

interface FabConfig {
  enabled: boolean;
  label: string;
  telegram: { enabled: boolean; url: string };
  teams: { enabled: boolean; url: string };
}

export function SupportFab() {
  const [config, setConfig] = useState<FabConfig | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res: any = await api("/api/v1/support/config", { cache: "no-store" as any });
        if (alive && res?.data) setConfig(res.data as FabConfig);
      } catch {
        // Fail closed: any error (401/403/500/network) keeps the FAB hidden.
        if (alive) setConfig(null);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const cfg = config;
  if (!cfg?.enabled) return null;
  const tg = cfg.telegram?.enabled && cfg.telegram.url ? cfg.telegram : null;
  const tm = cfg.teams?.enabled && cfg.teams.url ? cfg.teams : null;
  if (!tg && !tm) return null;

  const label = (cfg.label || "Support").trim();

  // Single channel: the main button opens it directly.
  if ((tg && !tm) || (!tg && tm)) {
    const only = (tg ?? tm)!;
    return (
      <div className="supportFab" ref={rootRef}>
        <a
          className="supportFabBtn"
          href={only.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${label} via ${tg ? "Telegram" : "Microsoft Teams"}`}
        >
          <Icon name="support" size={20} />
          <span>{label}</span>
        </a>
      </div>
    );
  }

  return (
    <div className="supportFab" ref={rootRef}>
      {open && (
        <div className="supportFabMenu" role="menu" aria-label="Support channels">
          <a className="supportFabBtn sm" role="menuitem" href={tg!.url} target="_blank" rel="noopener noreferrer">
            <Icon name="external_link" size={16} />
            <span>Telegram</span>
          </a>
          <a className="supportFabBtn sm" role="menuitem" href={tm!.url} target="_blank" rel="noopener noreferrer">
            <Icon name="users" size={16} />
            <span>Microsoft Teams</span>
          </a>
        </div>
      )}
      <button
        type="button"
        ref={triggerRef}
        className="supportFabBtn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label} — choose a support channel`}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="support" size={20} />
        <span>{label}</span>
      </button>
    </div>
  );
}
