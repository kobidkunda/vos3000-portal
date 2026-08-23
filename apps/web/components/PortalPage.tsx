"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "../lib/api";
import { Shell } from "./Shell";
import { Icon } from "../lib/icons";
import { DashboardArchetype } from "./archetypes/DashboardArchetype";
import { LiveMonitorArchetype } from "./archetypes/LiveMonitorArchetype";
import { ListTableArchetype } from "./archetypes/ListTableArchetype";
import { DetailArchetype } from "./archetypes/DetailArchetype";
import { FinanceActionArchetype } from "./archetypes/FinanceActionArchetype";
import { AnalyticsReportArchetype } from "./archetypes/AnalyticsReportArchetype";
import { EditorFormArchetype } from "./archetypes/EditorFormArchetype";
import { SettingsArchetype } from "./archetypes/SettingsArchetype";
import { WizardArchetype } from "./archetypes/WizardArchetype";
import { SystemHealthArchetype } from "./archetypes/SystemHealthArchetype";
import { RateLookupArchetype } from "./archetypes/RateLookupArchetype";
import { SupportTicketsArchetype } from "./archetypes/SupportTicketsArchetype";
import { AlarmCenterArchetype } from "./archetypes/AlarmCenterArchetype";
import { OnlineGatewaysArchetype } from "./archetypes/OnlineGatewaysArchetype";
import { SoftswitchesArchetype } from "./archetypes/SoftswitchesArchetype";
import { LiveCallsArchetype } from "./archetypes/LiveCallsArchetype";
import { RoutingGatewaysArchetype } from "./archetypes/RoutingGatewaysArchetype";
import { RoutingGatewayDetailArchetype } from "./archetypes/RoutingGatewayDetailArchetype";
import { MappingGatewaysArchetype } from "./archetypes/MappingGatewaysArchetype";
import { MappingGatewayDetailArchetype } from "./archetypes/MappingGatewayDetailArchetype";
import { CallAnalysisArchetype } from "./archetypes/CallAnalysisArchetype";
import { RegistrationAnalysisArchetype } from "./archetypes/RegistrationAnalysisArchetype";
import { PaymentSettingsArchetype } from "./archetypes/PaymentSettingsArchetype";
import { SupportSettingsArchetype } from "./archetypes/SupportSettingsArchetype";
import { RegistrationSettingsArchetype } from "./archetypes/RegistrationSettingsArchetype";
import { PaymentsArchetype } from "./archetypes/PaymentsArchetype";
import { StatementsArchetype } from "./archetypes/StatementsArchetype";
import { RecentCallsArchetype } from "./archetypes/RecentCallsArchetype";
import { CdrExplorerArchetype } from "./archetypes/CdrExplorerArchetype";
import { RateGroupsArchetype } from "./archetypes/RateGroupsArchetype";
import { RateEditorArchetype } from "./archetypes/RateEditorArchetype";
import { RateImportsArchetype } from "./archetypes/RateImportsArchetype";
import { CdrExportsArchetype } from "./archetypes/CdrExportsArchetype";
import { DeviceSetupHubArchetype } from "./archetypes/DeviceSetupHubArchetype";
import { DeviceSetupWizardArchetype } from "./archetypes/DeviceSetupWizardArchetype";

export function PortalPage({
  side,
  route,
  title,
  archetype,
  features,
}: {
  side: "Admin" | "Client";
  route: string;
  title: string;
  archetype: string;
  features: string[];
}) {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const searchParams=useSearchParams();

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const r: any = await api(`/api/v1/ui/page?route=${encodeURIComponent(route)}`);
      setData(r.data);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [route]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: any[] = useMemo(() => (Array.isArray(data?.rows) ? data.rows : []), [data?.rows]);

  const isAuthError = err && (
    err === "AUTH_REQUIRED" ||
    /sign in required|unauthenticated|authentication required|http 401/i.test(err)
  );

  const isForbiddenError = err && (
    /forbidden|mismatch|permission|http 403/i.test(err)
  );

  if (loading && !data) {
    return (
      <Shell side={side}>
        <div className="content">
          <div className="pageHead" style={{ marginBottom: 20 }}>
            <div>
              <h1>{title}</h1>
              <p>{features?.[0] || "Loading operational data…"}</p>
            </div>
          </div>
          <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "var(--muted)", fontSize: 13.5 }}>
              <Icon name="refresh" size={18} className="spin" />
              <span>Loading {title} records & operational state…</span>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (isAuthError) {
    const loginHref = side === "Admin" ? "/admin/login" : "/app/login";
    return (
      <Shell side={side}>
        <div className="content">
          <div className="pageHead" style={{ marginBottom: 20 }}>
            <div>
              <h1>{title}</h1>
              <p>{features?.[0] || "Authentication Required"}</p>
            </div>
          </div>
          <div className="card" style={{ padding: "48px 24px", textAlign: "center", maxWidth: 520, margin: "40px auto" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(37,99,235,0.12)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "var(--primary)" }}>
              <Icon name="security" size={24} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Authentication Required</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
              You must be signed in to the {side} Portal to access this operational workspace and carrier records.
            </p>
            <a href={loginHref} className="btn primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px" }}>
              <Icon name="security" size={14} />
              <span>Sign In to {side} Portal →</span>
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  if (isForbiddenError && !data) {
    return (
      <Shell side={side}>
        <div className="content">
          <div className="pageHead" style={{ marginBottom: 20 }}>
            <div>
              <h1>{title}</h1>
              <p>Permission Denied</p>
            </div>
          </div>
          <div className="card" style={{ padding: "48px 24px", textAlign: "center", maxWidth: 520, margin: "40px auto", borderColor: "var(--warning)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--warning-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "var(--warning)" }}>
              <Icon name="alert" size={24} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--warning)" }}>Access Restricted</h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
              {err || "Your authenticated role does not have permission to view this resource."}
            </p>
            <a href={side === "Admin" ? "/admin" : "/app"} className="btn secondary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon name="dashboard" size={14} />
              <span>Return to Dashboard</span>
            </a>
          </div>
        </div>
      </Shell>
    );
  }

  if (err && !data) {
    const isRateLimited = /rate limit/i.test(err);
    return (
      <Shell side={side}>
        <div className="content">
          <div className="pageHead" style={{ marginBottom: 20 }}>
            <div>
              <h1>{title}</h1>
              <p>{isRateLimited ? "Rate Limit Active" : "Operational Error"}</p>
            </div>
          </div>
          <div className="card" style={{ padding: "40px 24px", textAlign: "center", maxWidth: 560, margin: "40px auto", borderColor: isRateLimited ? "var(--warning)" : "var(--danger)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: isRateLimited ? "var(--warning-bg)" : "var(--danger-bg)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: isRateLimited ? "var(--warning)" : "var(--danger)" }}>
              <Icon name="alert" size={24} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: isRateLimited ? "var(--warning)" : "var(--danger)" }}>
              Unable to Load {title}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>
              {isRateLimited ? "Request rate limit was exceeded. The rate window refreshes automatically every minute. Click retry below to reload." : err}
            </p>
            <button type="button" className="btn primary" onClick={() => void load()} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Icon name="refresh" size={14} />
              <span>Retry Request</span>
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const pageTitle = data?.title ?? title;
  const pagePurpose = data?.purpose ?? features?.[0] ?? "";
  const effectiveArchetype = (data?.archetype ?? archetype ?? "").toUpperCase();
  const kpis = data?.kpis ?? [];
  const columns: string[] = data?.columns ?? [];
  const chart: number[] = data?.chart ?? [];

  // Dedicated Route & Archetype Dispatcher
  function renderArchetype() {
    // Device Setup Hub (Client & Admin)
    if (route === "/app/devices/setup" || route === "/admin/devices/setup") {
      return (
        <DeviceSetupHubArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
        />
      );
    }

    // Device Configuration Wizard (per-device)
    if (route.startsWith("/app/devices/setup/") || route.startsWith("/admin/devices/setup/")) {
      // Extract deviceKey from route suffix
      const key = route.split("/").pop() ?? "";
      return (
        <DeviceSetupWizardArchetype
          side={side}
          deviceKeyProp={decodeURIComponent(key)}
        />
      );
    }

    // 1. Dashboard (Executive / NOC / Client Overview)
    if (
      effectiveArchetype === "DASHBOARD" ||
      route === "/admin" ||
      route === "/admin/noc" ||
      route === "/app"
    ) {
      return (
        <DashboardArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          route={route}
          kpis={kpis}
          rows={rows}
          chart={chart}
          source={data?.source}
          warnings={data?.warnings}
          customPlanState={data?.custom_plan}
          stale={Boolean(data?.stale)}
        />
      );
    }

    // 2. System Health & Infrastructure Telemetry
    if (
      route.includes("/system/health") ||
      route.includes("/integration-health")
    ) {
      return (
        <SystemHealthArchetype
          title={pageTitle}
          purpose={pagePurpose}
        />
      );
    }

    // 3a. Live Calls Operations Center
    if (route === "/admin/calls/live" || route === "/app/calls/live" || (route.includes("/calls/live") && !route.includes("/{callId}"))) {
      return (
        <LiveCallsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // 3b. Online Gateways Presence Monitor
    if (route === "/admin/gateways/online" || route.includes("/online-gateways")) {
      return (
        <OnlineGatewaysArchetype
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // 3b1. Mapping Gateways (Ingress mapping gateways, IP whitelist, CPS, customer ownership)
    if (route === "/admin/gateways/mapping") {
      return (
        <MappingGatewaysArchetype
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // 3b1-detail. Mapping Gateway Details Page (/admin/gateways/mapping/{gatewayId})
    if (route.startsWith("/admin/gateways/mapping/") && route !== "/admin/gateways/mapping") {
      return (
        <MappingGatewayDetailArchetype
          title={pageTitle}
          purpose={pagePurpose}
          route={route}
          rows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 3b2-detail. Routing Gateway Details Dedicated Page (/admin/gateways/routing/{gatewayId})
    if (route.startsWith("/admin/gateways/routing/") && route !== "/admin/gateways/routing") {
      const parts = route.split("/");
      const gwId = decodeURIComponent(parts[parts.length - 1] || "");
      return (
        <RoutingGatewayDetailArchetype
          gatewayId={gwId}
          title={pageTitle}
          purpose={pagePurpose}
          initialData={rows?.[0]}
          source={data?.source}
        />
      );
    }

    // 3b2. Routing Gateways (Egress routing tables, prefixes, rewrite rules)
    if (route === "/admin/gateways/routing" || route.includes("/gateways/routing")) {
      return (
        <RoutingGatewaysArchetype
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // 3c. Softswitch Node & Cluster Infrastructure
    if (route === "/admin/softswitches") {
      return (
        <SoftswitchesArchetype
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // 3d. Call Analysis & SIP Ladder Diagnostics
    if (route.includes("/diagnostics/call-analysis")) {
      return (
        <CallAnalysisArchetype
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // 3e. Registration Analysis & Nonce Security Diagnostics
    if (route.includes("/diagnostics/registration-analysis")) {
      return (
        <RegistrationAnalysisArchetype
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // 3f. Generic Live Monitoring Fallback
    if (effectiveArchetype === "LIVE_MONITOR") {
      return (
        <LiveMonitorArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
        />
      );
    }

    // Payment Providers Settings (NOWPayments & Webhooks)
    if (route === "/admin/settings/payments" || route.includes("/settings/payments")) {
      return (
        <PaymentSettingsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          source={data?.source}
        />
      );
    }

    // Payments & Billing Ledger (Payment History & Receipts)
    if (
      route === "/app/billing/payments" ||
      route.startsWith("/app/billing/payments/") ||
      route === "/admin/payments" ||
      (route.startsWith("/admin/payments/") && route !== "/admin/payments/new")
    ) {
      return (
        <PaymentsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          route={route}
          rows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // CDR Explorer & Recent Calls (100% Real ClickHouse Data - No Mockup/Demo Data)
    if (
      route === "/app/cdr" ||
      route === "/admin/cdr" ||
      route === "/app/cdr/recent" ||
      route === "/admin/cdr/recent" ||
      route.includes("/cdr/recent") ||
      (route.includes("/cdr") && !route.includes("/exports") && !route.includes("/{"))
    ) {
      return (
        <CdrExplorerArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          route={route}
          initialRows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // CDR Export Jobs (100% Real ClickHouse + PostgreSQL Data)
    if (
      route === "/app/cdr/exports" ||
      route === "/admin/cdr/exports" ||
      route.includes("/cdr/exports") ||
      (route.includes("/exports") && pageTitle.toLowerCase().includes("cdr"))
    ) {
      return (
        <CdrExportsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          initialRows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 4. Finance & Add Funds (Add Funds / Wallet / Deposit / Balance Adjustments)
    if (
      effectiveArchetype === "FINANCE_ACTION" ||
      route.includes("/deposit") ||
      route.includes("/add-funds") ||
      route.includes("/manual-payment-credit")
    ) {
      return (
        <FinanceActionArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 4b. Statements & Billing Summary
    if (
      route === "/app/billing/statements" ||
      route.includes("/billing/statements") ||
      route.includes("/statements")
    ) {
      return (
        <StatementsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          chart={chart}
          source={data?.source}
          warnings={data?.warnings}
          detailData={data?.detailData}
        />
      );
    }

    // Rate Management Suite (R1: Rate Groups)
    if (route === "/admin/rates/groups") {
      return (
        <RateGroupsArchetype
          title={pageTitle}
          purpose={pagePurpose}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // Rate Management Suite (R2: Dedicated Rate Editor)
    if (route.startsWith("/admin/rates/groups/") && route !== "/admin/rates/groups") {
      const parts = route.split("/");
      const gId = decodeURIComponent(parts[parts.length - 1] || "");
      return (
        <RateEditorArchetype
          groupId={gId}
          title={pageTitle}
          purpose={pagePurpose}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // Rate Management Suite (R3: 4-Stage Ingestion Wizard)
    if (route === "/admin/rates/imports" || route.includes("/rates/imports") || route.includes("/rate-import")) {
      return (
        <RateImportsArchetype
          title={pageTitle}
          purpose={pagePurpose}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 5. Wizard (Create Customer / Provisioning)
    if (
      effectiveArchetype === "WIZARD" ||
      route === "/admin/customers/new" ||
      route === "/admin/customers/create"
    ) {
      return (
        <WizardArchetype
          title={pageTitle}
          purpose={pagePurpose}
        />
      );
    }

    // 6. Rate Lookup & Prefix Cost Estimator — route-specific match MUST precede
    //    the generic DETAIL archetype catch-all below.
    if (route.includes("/rates/lookup") || route.includes("/rate-lookup")) {
      return (
        <RateLookupArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 7. Detail Views (Gateway Details, Customer Details, CDR Details)
    if (
      effectiveArchetype === "DETAIL" ||
      route.includes("/detail") ||
      route.includes("/network-quality") ||
      route.includes("/authorizations")
    ) {
      return (
        <DetailArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          route={route}
          rows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 7. Analytics & Reports (Traffic, Failure, Connect, Margin, Distribution)
    if (
      effectiveArchetype === "ANALYTICS_REPORT" ||
      route.includes("/analytics") ||
      route.includes("/reports") ||
      route.includes("/margin-monitor")
    ) {
      return (
        <AnalyticsReportArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          chart={chart}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 8. Editor Form (Rate Editor, Routing Policies, Parameters)
    if (
      effectiveArchetype === "EDITOR_FORM" ||
      route.includes("/editor") ||
      route.includes("/system-parameters")
    ) {
      return (
        <EditorFormArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          route={route}
        />
      );
    }

    // 8b. Support Settings (global support contacts -> client FAB)
    if (route === "/admin/settings/registration") {
      return (
        <RegistrationSettingsArchetype
          title={pageTitle}
          purpose={pagePurpose}
        />
      );
    }

    if (route === "/admin/settings/support") {
      return (
        <SupportSettingsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 9. Settings & Security (Sessions, 2FA MFA, API Keys, Webhooks, Roles)
    if (
      effectiveArchetype === "SETTINGS" ||
      route.includes("/settings") ||
      route.includes("/security") ||
      route.includes("/api-keys") ||
      route.includes("/webhooks")
    ) {
      return (
        <SettingsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          route={route}
        />
      );
    }

    // 11. Support & Ticketing Center
    if (route.includes("/support/tickets") || route.includes("/support")) {
      return (
        <SupportTicketsArchetype
          side={side}
          title={pageTitle}
          purpose={pagePurpose}
          rows={rows}
          kpis={kpis}
          source={data?.source}
          warnings={data?.warnings}
          prefill={route.endsWith("/support/new")?{
            open:true,
            category:searchParams.get("category")==="custom_plan_request"?"Custom Plan Request":searchParams.get("category")||undefined,
            subject:searchParams.get("subject")||(searchParams.get("template")==="custom_plan"?"Request: Custom rate plan":undefined),
            description:searchParams.get("template")==="custom_plan"?"Destinations:\nExpected minutes/month:\nBilling preference:\nNotes:":undefined
          }:null}
        />
      );
    }

    if (route === "/admin/alarms") {
      return (
        <AlarmCenterArchetype
          title={pageTitle}
          purpose={pagePurpose}
          initialRows={rows}
          source={data?.source}
          warnings={data?.warnings}
        />
      );
    }

    // 12. Universal List Table (Customer Directory, Gateways, CDR Explorer, Rates, Packages, Payments, etc.)
    return (
      <ListTableArchetype
        side={side}
        title={pageTitle}
        purpose={pagePurpose}
        route={route}
        columns={columns}
        rows={rows}
        kpis={kpis}
        source={data?.source}
        warnings={data?.warnings}
      />
    );
  }

  return (
    <Shell side={side}>
      {renderArchetype()}
    </Shell>
  );
}
