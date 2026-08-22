"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";
import { FormErrorAlert } from "../shared/FormErrorAlert";
import { useFormError } from "../../lib/use-form-error";

export function FinanceActionArchetype({
  side,
  title,
  purpose,
  rows = [],
  kpis = [],
  source = "postgres (payments + ledgers)",
  warnings,
}: {
  side: "Admin" | "Client";
  title: string;
  purpose: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}) {
  const [amount, setAmount] = useState<string>("50.00");
  const [step, setStep] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activePayment, setActivePayment] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const {
    formError,
    fieldErrors,
    setError,
    clearFieldError,
    clearErrors,
    bannerRef,
  } = useFormError({
    fallbackMessage: "Failed to initiate crypto deposit.",
  });

  const presetAmounts = ["10", "25", "50", "100", "250", "500", "1000"];

  const supportedCoins = [
    { name: "USDT (TRC20)", badge: "Fastest / Low Fee", icon: "dollar" },
    { name: "USDT (ERC20)", badge: "Popular", icon: "dollar" },
    { name: "Bitcoin (BTC)", badge: "Crypto Core", icon: "shield" },
    { name: "Ethereum (ETH)", badge: "Smart Contracts", icon: "shield" },
    { name: "Litecoin (LTC)", badge: "Low Fee", icon: "dollar" },
    { name: "Solana (SOL)", badge: "Instant", icon: "zap" },
    { name: "TRON (TRX)", badge: "Instant", icon: "dollar" },
    { name: "Dogecoin (DOGE)", badge: "Community", icon: "dollar" },
    { name: "BNB", badge: "Binance Chain", icon: "shield" },
  ];

  const depositNum = Number(amount) || 0;
  const processingFee = 0.0;
  const totalAmount = depositNum;

  // Read real balance from kpis — KPI value from backend is "$1,234.56 USD"
  const balanceKpi = kpis?.find((k) => k.label?.toLowerCase().includes("balance"));
  const currentBalance = balanceKpi?.value ?? "$0.00 USD";
  // Strip trailing " USD" for the inline display if present (we add it ourselves)
  const balanceDisplay = currentBalance.replace(/\s+USD\s*$/i, "").trim();
  // Parse numeric for after-deposit preview
  const balanceNumeric = parseFloat(currentBalance.replace(/[^0-9.]/g, "")) || 0;

  // Format an ISO timestamp to a short local date+time string
  function fmtDate(iso: string | undefined | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  }


  useEffect(() => {
    if (!activePayment?.id || success) return;

    const interval = setInterval(async () => {
      try {
        const res: any = await api(`/api/v1/deposits/${activePayment.id}`);
        if (res?.data) {
          const st = String(res.data.status || "").toUpperCase();
          if (st === "COMPLETED") {
            setStep(4);
            setSuccess(true);
            clearInterval(interval);
          } else if (st === "PENDING_PROVIDER") {
            setStep(2);
          } else if (st === "CREDITING_VOS") {
            setStep(3);
          }
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [activePayment?.id, success]);

  async function handleSubmitPayment(e: React.FormEvent) {
    e.preventDefault();
    clearErrors();

    if (isNaN(depositNum) || depositNum < 5) {
      setError({
        message: "Minimum crypto deposit amount is $5.00 USD.",
        code: "VALIDATION_ERROR",
        fieldErrors: [{ field: "amount", message: "Minimum crypto deposit amount is $5.00 USD." }],
        fieldErrorMap: { amount: "Minimum crypto deposit amount is $5.00 USD." },
      });
      return;
    }

    setBusy(true);
    setStep(1);

    try {
      const payload = {
        amount: depositNum.toFixed(2),
        currency: "USD",
        paymentMethod: "crypto_nowpayments",
        idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? `dep_${crypto.randomUUID()}` : `dep_${Date.now()}`,
      };

      const res: any = await api("/api/v1/deposits", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res?.data || res?.ok) {
        const paymentData = res.data || res;
        setActivePayment(paymentData);
        setStep(2);
        setBusy(false);

        // Open checkout invoice in new window if available
        const checkoutUrl = paymentData.metadata?.checkout_url || paymentData.checkout_url;
        if (checkoutUrl && typeof window !== "undefined") {
          window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        setBusy(false);
        setError(res?.error || res || "Failed to initiate crypto invoice via NOWPayments.");
      }
    } catch (err: any) {
      setBusy(false);
      setError(err, { fallbackMessage: "Unable to contact payment processor." });
    }
  }

  async function handleSimulateWebhook() {
    if (!activePayment?.id) return;
    setSimulating(true);
    clearErrors();
    try {
      await api("/api/v1/webhooks/nowpayments", {
        method: "POST",
        body: JSON.stringify({
          payment_id: activePayment.id,
          order_id: activePayment.id,
          payment_status: "finished",
          pay_amount: depositNum,
          price_amount: depositNum,
          price_currency: "usd",
          pay_currency: "usdttrc20",
          actually_paid: depositNum,
        }),
      });
      setStep(4);
      setSuccess(true);
    } catch (err: any) {
      setError(err, { fallbackMessage: `Simulation error: ${err.message}` });
    } finally {
      setSimulating(false);
    }
  }

  function copyCheckoutUrl() {
    const url = activePayment?.metadata?.checkout_url || activePayment?.checkout_url;
    if (url && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  }

  return (
    <div className="content">
      {/* Breadcrumb & Header */}
      <div className="pageHead" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{title}</h1>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose || "Add funds to your wallet exclusively with cryptocurrency via NOWPayments for uninterrupted carrier voice routing."}</p>
        </div>

        <div className="pageActions">
          <Link href={side === "Admin" ? "/admin/payments" : "/app/billing/payments"} className="btn secondary sm">
            <Icon name="arrowLeft" size={13} />
            <span>Payment History</span>
          </Link>
        </div>
      </div>

      {/* Warnings Banner */}
      {warnings && warnings.length > 0 && (
        <div className="card" style={{ marginBottom: 20, borderColor: "var(--warning)", background: "var(--warning-bg)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--warning)", fontWeight: 650, fontSize: 13 }}>
            <Icon name="alert" size={16} />
            <span>{warnings.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Main 2-Column Checkout Layout */}
      <div className="grid2 financeGrid">
        {/* Left Form Area */}
        <div>
          {/* Current Balance Card */}
          <div
            className="card"
            style={{
              padding: "18px 22px",
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, rgba(37,99,235,0.06), rgba(6,182,212,0.04))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--primary)",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon name="wallet" size={22} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Current Wallet Balance</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
                  {balanceDisplay}
                </div>
                {depositNum > 0 && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    After deposit: <strong style={{ color: "var(--success)" }}>${(balanceNumeric + depositNum).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>
                  </div>
                )}
              </div>
            </div>

            <span className="badge badge-online">
              <span className="statusDot pulse" />
              PostgreSQL & VOS Synced
            </span>
          </div>

          <form onSubmit={handleSubmitPayment} noValidate>
            <FormErrorAlert
              ref={bannerRef}
              error={formError}
              onDismiss={clearErrors}
            />
            {/* Step 1: Deposit Amount */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="cardHead">
                <div className="cardTitle" style={{ fontSize: 14, fontWeight: 700 }}>
                  1. Enter Deposit Amount (USD)
                </div>
              </div>

              <div style={{ position: "relative", marginBottom: 12 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--muted)",
                  }}
                >
                  $
                </span>
                <input
                  id="field-amount"
                  type="number"
                  step="0.01"
                  min="5"
                  className={`input ${fieldErrors.amount ? "inputError" : ""}`}
                  style={{
                    paddingLeft: 30,
                    paddingRight: 60,
                    fontSize: 18,
                    fontWeight: 750,
                    fontVariantNumeric: "tabular-nums",
                    height: 46,
                  }}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    clearFieldError("amount");
                  }}
                  aria-invalid={Boolean(fieldErrors.amount)}
                  aria-describedby={fieldErrors.amount ? "field-amount-error" : undefined}
                  placeholder="50.00"
                  required
                />
                <span
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--muted)",
                  }}
                >
                  USD
                </span>
              </div>
              {fieldErrors.amount && (
                <div className="fieldError" id="field-amount-error" role="alert" style={{ marginTop: -6, marginBottom: 10 }}>
                  {fieldErrors.amount}
                </div>
              )}

              {/* Quick Select Preset Amount Chips */}
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                QUICK SELECT
              </div>
              <div className="amountChipsGrid">
                {presetAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`amountChipBtn ${amount === `${preset}.00` || amount === preset ? "active" : ""}`}
                    onClick={() => {
                      setAmount(`${preset}.00`);
                      clearFieldError("amount");
                    }}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Payment Method - Crypto Exclusive */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="cardHead">
                <div className="cardTitle" style={{ fontSize: 14, fontWeight: 700 }}>
                  2. Payment Method
                </div>
                <span className="badge badge-online">Crypto Powered by NOWPayments</span>
              </div>

              {/* Exclusive NOWPayments Gateway Card */}
              <div
                style={{
                  border: "2px solid var(--primary)",
                  borderRadius: "var(--radius-md)",
                  padding: "16px 20px",
                  background: "var(--surface)",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "rgba(37,99,235,0.1)",
                        color: "var(--primary)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon name="dollar" size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text)" }}>
                        Cryptocurrency (NOWPayments)
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        Direct deposit supporting 150+ cryptocurrencies & stablecoins
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-online" style={{ fontWeight: 700 }}>0% FEE</span>
                </div>

                {/* Supported Coins Badges Grid */}
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 8, textTransform: "uppercase" }}>
                    Popular Supported Cryptocurrencies
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {supportedCoins.map((coin) => (
                      <span
                        key={coin.name}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 11.5,
                          fontWeight: 650,
                          padding: "4px 10px",
                          borderRadius: 6,
                          background: "var(--surface2)",
                          border: "1px solid var(--border)",
                          color: "var(--text)",
                        }}
                      >
                        <span>{coin.name}</span>
                        <span style={{ fontSize: 9.5, color: "var(--muted)", background: "var(--bg)", padding: "1px 4px", borderRadius: 4 }}>
                          {coin.badge}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)" }}>
                <Icon name="shield" size={13} />
                <span>Instant blockchain confirmation via HMAC-SHA512 verified Instant Payment Notifications (IPN).</span>
              </div>
            </div>

            {/* Active Payment Details Panel (if invoice initiated) */}
            {activePayment && (
              <div
                className="card"
                style={{
                  marginBottom: 20,
                  borderColor: success ? "var(--success)" : "var(--primary)",
                  background: success ? "rgba(16,185,129,0.03)" : "rgba(37,99,235,0.02)",
                }}
              >
                <div className="cardHead">
                  <div className="cardTitle" style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon name={success ? "check" : "dollar"} size={16} />
                    <span>{success ? "Deposit Verified & Credited" : "Active Crypto Invoice"}</span>
                  </div>
                  <span className="badge" style={{ fontFamily: "IBM Plex Mono, monospace" }}>
                    ID: {activePayment.id?.slice(0, 13)}
                  </span>
                </div>

                <div style={{ padding: "8px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>Amount Due:</span>
                    <strong style={{ fontVariantNumeric: "tabular-nums" }}>${depositNum.toFixed(2)} USD</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
                    <span style={{ color: "var(--muted)" }}>Status:</span>
                    <Status value={success ? "Completed" : "Pending Confirmation"} size="sm" />
                  </div>

                  {activePayment.metadata?.checkout_url && !success && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <a
                        href={activePayment.metadata.checkout_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn primary sm"
                        style={{ flex: 1, textAlign: "center", justifyContent: "center" }}
                      >
                        <Icon name="externalLink" size={14} />
                        <span>Open NOWPayments Checkout</span>
                      </a>
                      <button
                        type="button"
                        onClick={copyCheckoutUrl}
                        className="btn secondary sm"
                      >
                        <Icon name={copiedLink ? "check" : "copy"} size={14} />
                        <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                      </button>
                    </div>
                  )}

                  {/* Dev mode simulation helper */}
                  {!success && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--muted)" }}>
                        Development / Sandbox Test:
                      </span>
                      <button
                        type="button"
                        onClick={handleSimulateWebhook}
                        disabled={simulating}
                        className="btn sm"
                        style={{ fontSize: 11, padding: "3px 8px" }}
                      >
                        {simulating ? "Processing…" : "Simulate Instant IPN Confirmation"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recent Billing History */}
            <div className="card">
              <div className="cardHead">
                <div className="cardTitle" style={{ fontSize: 14, fontWeight: 700 }}>
                  Recent Transactions
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge">{rows.length} records</span>
                  <Link href={side === "Admin" ? "/admin/payments" : "/app/billing/payments"} style={{ fontSize: 11.5, color: "var(--primary)" }}>
                    View All →
                  </Link>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                {rows.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 12.5 }}>
                    No prior payments recorded in PostgreSQL ledger for this tenant scope.
                  </div>
                ) : (
                  <table className="table" style={{ width: "100%", fontSize: 12.5 }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Receipt / ID</th>
                        <th>Provider</th>
                        <th style={{ textAlign: "right" }}>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 8).map((tx, idx) => (
                        <tr key={tx.id ?? idx}>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(tx.completed_at ?? tx.created_at)}</td>
                          <td style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>
                            <Link href={`${side === "Admin" ? "/admin" : "/app"}/billing/payments/${tx.id}`} style={{ color: "var(--primary)" }}>
                              {tx.receipt_number ?? (tx.id ? String(tx.id).slice(0, 8).toUpperCase() : "—")}
                            </Link>
                          </td>
                          <td style={{ fontSize: 11 }}>{tx.provider ?? tx.type ?? "Deposit"}</td>
                          <td style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, textAlign: "right" }}>
                            ${Number(tx.credited_amount ?? tx.amount ?? 0).toFixed(2)} {tx.currency ?? "USD"}
                          </td>
                          <td>
                            <Status value={tx.status ?? "Completed"} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </form>
        </div>


        {/* Right Sticky Order Summary Sidebar */}
        <div className="financeSummaryCol">
          <div className="card" style={{ padding: 22 }}>
            <div className="cardTitle" style={{ fontSize: 16, fontWeight: 750, marginBottom: 16 }}>
              Order Summary
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Deposit Amount</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>${depositNum.toFixed(2)} USD</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Gateway Fee (Crypto)</span>
                <span style={{ fontWeight: 600, color: "var(--success)" }}>$0.00 (0%)</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                <span>Total Due</span>
                <span style={{ color: "var(--primary)", fontVariantNumeric: "tabular-nums" }}>
                  ${totalAmount.toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* 4-Step Payment Flow Stepper */}
            <div style={{ margin: "24px 0 20px" }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginBottom: 10 }}>
                CRYPTO DEPOSIT PIPELINE
              </div>
              <div className="verticalStepper">
                <div className={`stepperItem ${step >= 1 ? (step > 1 ? "completed" : "current") : ""}`}>
                  <div className="stepperDot">{step > 1 ? "✓" : "1"}</div>
                  <div className="stepperContent">
                    <div className="stepperTitle">1. Invoice Initiated</div>
                    <div className="stepperSub">NOWPayments intent created</div>
                  </div>
                </div>

                <div className={`stepperItem ${step >= 2 ? (step > 2 ? "completed" : "current") : ""}`}>
                  <div className="stepperDot">{step > 2 ? "✓" : "2"}</div>
                  <div className="stepperContent">
                    <div className="stepperTitle">2. Awaiting Payment</div>
                    <div className="stepperSub">
                      {step >= 2 ? "Awaiting crypto transaction on blockchain" : "Pending invoice checkout"}
                    </div>
                  </div>
                </div>

                <div className={`stepperItem ${step >= 3 ? (step > 3 ? "completed" : "current") : ""}`}>
                  <div className="stepperDot">{step > 3 ? "✓" : "3"}</div>
                  <div className="stepperContent">
                    <div className="stepperTitle">3. Verified by IPN</div>
                    <div className="stepperSub">Cryptographic HMAC-SHA512 verified</div>
                  </div>
                </div>

                <div className={`stepperItem ${step === 4 ? "completed" : ""}`}>
                  <div className="stepperDot">{step === 4 ? "✓" : "4"}</div>
                  <div className="stepperContent">
                    <div className="stepperTitle">4. Credited & Synced</div>
                    <div className="stepperSub">PostgreSQL ledger locked & VOS credited</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Seal */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                background: "var(--surface2)",
                borderRadius: "var(--radius-sm)",
                fontSize: 11.5,
                color: "var(--text2)",
                marginBottom: 16,
              }}
            >
              <Icon name="shield" size={16} className="text-success" />
              <div>
                <strong>NOWPayments Verified</strong>
                <div style={{ color: "var(--muted)", fontSize: 11 }}>Non-custodial crypto processing with instant IPN sync</div>
              </div>
            </div>

            {/* Proceed to Pay CTA */}
            <button
              type="button"
              className="btn primary"
              style={{ width: "100%", height: 44, fontSize: 14, fontWeight: 700 }}
              onClick={handleSubmitPayment}
              disabled={busy || depositNum < 5 || success}
            >
              <Icon name={success ? "check" : "dollar"} size={16} />
              <span>
                {success
                  ? "Deposit Completed & Credited!"
                  : busy
                  ? "Creating Crypto Invoice…"
                  : `Pay $${totalAmount.toFixed(2)} with Crypto`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
