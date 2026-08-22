"use client";
import React, { useState, useMemo, useEffect } from "react";
import { Icon } from "../../lib/icons";
import { Status } from "../Status";
import { api } from "../../lib/api";
import { FormErrorHeader, FormErrorAlert } from "../shared/FormErrorHeader";

interface Ticket {
  id: string;
  subject: string;
  category: string;
  priority: "Critical" | "High" | "Normal" | "Low";
  status: "Open" | "In Progress" | "Pending Customer" | "Resolved";
  created: string;
  updated: string;
  messages: { id: string; sender: string; role: "customer" | "noc"; time: string; text: string }[];
}

export function SupportTicketsArchetype({
  side,
  title = "24/7 NOC Support & Ticketing",
  purpose = "Submit operational tickets, request routing assistance, and interact directly with NOC engineers.",
  rows = [],
  kpis = [],
  source = "postgres (support_tickets)",
  warnings,
}: {
  side: "Admin" | "Client";
  title?: string;
  purpose?: string;
  rows?: any[];
  kpis?: any[];
  source?: string;
  warnings?: string[];
}) {
  const initialTickets: Ticket[] = useMemo(() => {
    if (!rows || !rows.length) return [];
    return rows.map((r, i) => {
      const msgs = Array.isArray(r.messages)
        ? r.messages
        : [
            {
              id: `m_${r.id}_1`,
              sender: String(r.customer ?? r.created_by ?? (side === "Admin" ? "Customer" : "You")),
              role: (side === "Admin" ? "customer" : "customer") as any,
              time: r.created_at ?? r.created ?? "Recent",
              text: String(r.description ?? r.message ?? r.subject ?? "Support request submitted."),
            },
          ];

      return {
        id: String(r.id ?? `tkt_${i + 1}`),
        subject: String(r.subject ?? r.title ?? "Support Inquiry"),
        category: String(r.category ?? "Routing & Gateways"),
        priority: (r.priority ?? "Normal") as any,
        status: (r.status ?? "Open") as any,
        created: String(r.created_at ?? r.created ?? "Recent"),
        updated: String(r.updated_at ?? r.updated ?? "Recent"),
        messages: msgs,
      };
    });
  }, [rows, side]);

  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth > 768) {
      if (tickets.length > 0 && (!selectedTicketId || !tickets.some((t) => t.id === selectedTicketId))) {
        setSelectedTicketId(tickets[0].id);
      }
    }
  }, [tickets, selectedTicketId]);

  const [replyText, setReplyText] = useState("");
  const [replyErr, setReplyErr] = useState<unknown | null>(null);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("Routing & Gateways");
  const [newPriority, setNewPriority] = useState<"Critical" | "High" | "Normal" | "Low">("Normal");
  const [newMessage, setNewMessage] = useState("");
  const [createErr, setCreateErr] = useState<unknown | null>(null);
  const [busy, setBusy] = useState(false);

  const activeTicket = tickets.find((t) => t.id === selectedTicketId);

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    setReplyErr(null);
    if (!replyText.trim() || !activeTicket) {
      setReplyErr("Please enter a response message.");
      return;
    }

    try {
      const newMsg = {
        id: `m_${Date.now()}`,
        sender: side === "Admin" ? "NOC Operations" : "You",
        role: (side === "Admin" ? "noc" : "customer") as any,
        time: "Just now",
        text: replyText.trim(),
      };

      setTickets((prev) =>
        prev.map((t) =>
          t.id === activeTicket.id
            ? { ...t, updated: "Just now", messages: [...t.messages, newMsg] }
            : t
        )
      );
      setReplyText("");
    } catch (err: any) {
      setReplyErr(err);
    }
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    if (!newSubject.trim()) {
      setCreateErr("Subject / Incident Summary is required.");
      return;
    }
    if (!newMessage.trim()) {
      setCreateErr("Initial message description is required.");
      return;
    }

    setBusy(true);
    const endpoint = side === "Admin" ? "/api/v1/admin/support/tickets" : "/api/v1/support/tickets";

    try {
      const res: any = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({
          subject: newSubject.trim(),
          category: newCategory,
          priority: newPriority,
          message: newMessage.trim(),
        }),
      });

      const item = res?.data ?? res;
      const createdId = item?.id ? String(item.id) : (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tkt_${Date.now()}`);

      const newTkt: Ticket = {
        id: createdId,
        subject: item?.subject ?? newSubject.trim(),
        category: item?.category ?? newCategory,
        priority: (item?.priority ?? newPriority) as any,
        status: (item?.status ?? "Open") as any,
        created: item?.created_at ?? "Just now",
        updated: item?.updated_at ?? "Just now",
        messages: Array.isArray(item?.messages) && item.messages.length > 0 ? item.messages : [
          {
            id: "m1",
            sender: side === "Admin" ? "NOC Admin" : "You",
            role: side === "Admin" ? "noc" : "customer",
            time: "Just now",
            text: newMessage.trim(),
          },
        ],
      };

      setTickets([newTkt, ...tickets]);
      setSelectedTicketId(newTkt.id);
      setIsNewTicketOpen(false);
      setNewSubject("");
      setNewMessage("");
    } catch (err: any) {
      setCreateErr(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="content">
      {/* Page Header */}
      <div className="pageHead" style={{ marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{title}</h1>
            <span className="badge badge-online">
              <span className="statusDot pulse" />
              NOC Engineers Online (24/7)
            </span>
            <span className="badge badge-online" style={{ fontSize: 10.5 }}>
              Source: {source}
            </span>
          </div>
          <p>{purpose}</p>
        </div>

        <div className="pageActions">
          <button
            type="button"
            className="btn primary sm"
            onClick={() => {
              setCreateErr(null);
              setIsNewTicketOpen(true);
            }}
          >
            <Icon name="plus" size={13} />
            <span>Open New Support Ticket</span>
          </button>
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

      {/* Main Split: Ticket List + Conversation View */}
      <div className={`grid2 ticketsGrid ${activeTicket ? "hasSelectedTicket" : ""}`}>
        {/* Left Ticket List Card */}
        <div className="card ticketListCard" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 750 }}>All Tickets ({tickets.length})</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>Avg response: &lt;15 mins</span>
          </div>

          <div style={{ overflowY: "auto", maxHeight: 580 }}>
            {tickets.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--muted)" }}>
                <Icon name="support" size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 650, color: "var(--text)" }}>No active support tickets</div>
                <div style={{ fontSize: 11.5, marginTop: 4 }}>
                  All systems operational. Click &ldquo;Open New Support Ticket&rdquo; to reach a NOC engineer.
                </div>
              </div>
            ) : (
              tickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const isCrit = t.priority === "Critical" || t.priority === "High";

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    style={{
                      padding: "14px 18px",
                      borderBottom: "1px solid var(--border)",
                      cursor: "pointer",
                      background: isSelected ? "var(--primary-soft)" : "transparent",
                      borderLeft: isSelected ? "3px solid var(--primary)" : "3px solid transparent",
                      transition: "all 120ms",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>
                        {t.id}
                      </span>
                      <span
                        className="badge"
                        style={{
                          fontSize: 10.5,
                          color: isCrit ? "var(--danger)" : "var(--text2)",
                          background: isCrit ? "var(--danger-bg)" : "var(--surface2)",
                        }}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 4, lineHeight: 1.4 }}>
                      {t.subject}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)" }}>
                      <span>{t.category}</span>
                      <span>{t.updated}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Active Conversation View */}
        {activeTicket ? (
          <div className="card ticketChatCard" style={{ padding: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {/* Conversation Header */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface2)" }}>
              {/* Mobile Back to tickets button */}
              <button
                type="button"
                className="btn sm secondary mobileOnly"
                onClick={() => setSelectedTicketId(null)}
                style={{ marginBottom: 10, width: "100%", justifyContent: "flex-start" }}
              >
                <Icon name="arrowLeft" size={13} />
                <span>Back to all tickets</span>
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700 }}>
                      {activeTicket.id}
                    </span>
                    <Status value={activeTicket.status} size="sm" />
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 750, marginTop: 4 }}>{activeTicket.subject}</h3>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                    Category: <strong>{activeTicket.category}</strong> · Created: {activeTicket.created}
                  </div>
                </div>

                <span className="badge" style={{ fontSize: 11 }}>
                  Priority: {activeTicket.priority}
                </span>
              </div>
            </div>

            {/* Conversation Messages Thread */}
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: 420 }}>
              {activeTicket.messages.map((m) => {
                const isNoc = m.role === "noc";

                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isNoc ? "flex-start" : "flex-end",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, fontSize: 11, color: "var(--muted)" }}>
                      <strong>{m.sender}</strong>
                      <span>·</span>
                      <span>{m.time}</span>
                    </div>

                    <div
                      style={{
                        maxWidth: "90%",
                        padding: "10px 14px",
                        borderRadius: "var(--radius)",
                        background: isNoc ? "var(--surface2)" : "var(--primary)",
                        color: isNoc ? "var(--text)" : "#ffffff",
                        border: isNoc ? "1px solid var(--border)" : "none",
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} style={{ padding: 14, borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
              <FormErrorAlert error={replyErr} onDismiss={() => setReplyErr(null)} style={{ marginBottom: 10 }} />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Type your response to the NOC team…"
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    if (replyErr) setReplyErr(null);
                  }}
                  style={{ height: 42, fontSize: 13, flex: 1, minWidth: 160 }}
                  required
                />
                <button type="submit" className="btn primary sm" style={{ height: 42, minWidth: 84 }}>
                  <Icon name="arrowRight" size={14} />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card ticketEmptyCard" style={{ display: "grid", placeItems: "center", padding: 48, textAlign: "center", color: "var(--muted)" }}>
            <div>
              <Icon name="support" size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
              <div>Select a ticket from the list to view the conversation.</div>
            </div>
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      {isNewTicketOpen && (
        <div className="modalBackdrop" onClick={() => setIsNewTicketOpen(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modalHead">
              <div className="modalTitle">Open New 24/7 NOC Ticket</div>
              <button type="button" className="iconBtn" onClick={() => setIsNewTicketOpen(false)}>
                <Icon name="close" size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket}>
              <div className="modalBody" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <FormErrorAlert error={createErr} onDismiss={() => setCreateErr(null)} />
                <div className="field">
                  <label>Subject / Incident Summary *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Call failures to +44 destinations"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                  />
                </div>

                <div className="formGrid" style={{ gap: 12 }}>
                  <div className="field">
                    <label>Category</label>
                    <select className="select" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                      <option>Routing & Gateways</option>
                      <option>Billing & Finance</option>
                      <option>Rate & Commercial</option>
                      <option>Technical / API</option>
                      <option>Emergency Dispatch</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Severity / Priority</label>
                    <select className="select" value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
                      <option value="Critical">Critical (P1 - Outage)</option>
                      <option value="High">High (P2 - Service Degraded)</option>
                      <option value="Normal">Normal (P3 - Routine)</option>
                      <option value="Low">Low (P4 - Question)</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Detailed Description & Diagnostics *</label>
                  <textarea
                    className="textarea"
                    rows={4}
                    placeholder="Include affected Call IDs, source ANI, destination DNIS, and gateway names..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="modalFoot">
                <button type="button" className="btn secondary sm" onClick={() => setIsNewTicketOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn primary sm" disabled={busy}>
                  {busy ? "Submitting…" : "Submit Ticket to NOC"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
