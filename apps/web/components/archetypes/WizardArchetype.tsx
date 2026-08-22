"use client";
import React, { useState } from "react";
import Link from "next/link";
import { CreateCustomerForm } from "../CreateCustomerForm";
import { Icon } from "../../lib/icons";

export function WizardArchetype({
  title = "Create Customer Wizard",
  purpose = "Step-by-step customer onboarding with verified VOS engine binding.",
}: {
  title?: string;
  purpose?: string;
}) {
  const [created, setCreated] = useState(false);

  return (
    <div className="content">
      {/* Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{title}</h1>
            <span className="badge badge-online">
              <span className="statusDot pulse" />
              Live VOS Verified
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions">
          <Link href="/admin/customers" className="btn secondary sm">
            <Icon name="chevronLeft" size={13} />
            <span>Back to Customers</span>
          </Link>
        </div>
      </div>

      {created ? (
        <div className="card" style={{ textAlign: "center", padding: 48, maxWidth: 600, margin: "0 auto" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--success-bg)",
              color: "var(--success)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="check" size={28} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 750, marginBottom: 8 }}>Customer Provisioned Successfully</h2>
          <p style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 24 }}>
            The create operation was accepted and audited by the platform with a request ID. VOS
            activation depends on the verified adapter capability — check the customer directory for
            account status shortly.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button type="button" className="btn secondary sm" onClick={() => setCreated(false)}>
              Create Another
            </button>
            <Link href="/admin/customers" className="btn primary sm">
              View Customer Directory
            </Link>
          </div>
        </div>
      ) : (
        <CreateCustomerForm onCreated={() => setCreated(true)} />
      )}
    </div>
  );
}
