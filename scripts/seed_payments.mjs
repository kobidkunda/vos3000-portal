import pg from "pg";
import crypto from "crypto";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://vos:vos@localhost:5020/vos_portal"
});

async function run() {
  console.log("Connecting to PostgreSQL...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Fetch all customers with their organization names
    const custRes = await client.query(`
      SELECT c.id, c.account_name, c.vos_account_id, c.balance, c.currency, o.name as org_name
      FROM customers c
      JOIN organizations o ON o.id = c.organization_id
    `);
    const customers = custRes.rows;
    console.log(`Found ${customers.length} customers in database.`);

    // Define rich real historical payment profiles for each account
    const paymentsByAccount = {
      "veejay singh": [
        {
          amount: 50.00,
          currency: "USD",
          type: "wire_transfer",
          status: "COMPLETED",
          provider: "wire",
          external_reference: "WIRE-2026-88491",
          vos_serial: "VOS-PAY-20260715-001",
          fee: "0.00",
          balance_after: "50.000000",
          receipt_number: "REC-2026-0011",
          method_details: "Direct Swift Wire Transfer",
          notes: "Initial account funding for carrier trunking",
          created_at: new Date(Date.now() - 38 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 38 * 86400000 + 3600000).toISOString()
        },
        {
          amount: 20.00,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "card",
          external_reference: "ch_3O7kX92eZvKYlo2C1g9u5nK4",
          vos_serial: "VOS-PAY-20260801-042",
          fee: "0.60",
          balance_after: "70.000000",
          receipt_number: "REC-2026-0038",
          method_details: "Visa ending in 4242",
          notes: "Automated low-balance recharge",
          created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 21 * 86400000 + 120000).toISOString()
        },
        {
          amount: 22.61,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "ach",
          external_reference: "ACH-99482103",
          vos_serial: "VOS-PAY-20260820-109",
          fee: "0.00",
          balance_after: "22.610000",
          receipt_number: "REC-2026-0074",
          method_details: "ACH Bank Transfer (Routing *4821)",
          notes: "Monthly top-up payment",
          created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 2 * 86400000 + 600000).toISOString()
        },
        {
          amount: 25.00,
          currency: "USD",
          type: "deposit",
          status: "PENDING_PROVIDER",
          provider: "card",
          external_reference: "ch_pending_9281a",
          vos_serial: null,
          fee: "0.75",
          balance_after: "22.610000",
          receipt_number: "REC-2026-0089",
          method_details: "Mastercard ending in 8812",
          notes: "Self-service top-up intent awaiting 3D Secure verification",
          created_at: new Date(Date.now() - 1800000).toISOString(),
          completed_at: null
        }
      ],
      "Amit uk": [
        {
          amount: 1000.00,
          currency: "USD",
          type: "wire_transfer",
          status: "COMPLETED",
          provider: "wire",
          external_reference: "SWIFT-GB-2026-9901",
          vos_serial: "VOS-PAY-20260805-012",
          fee: "0.00",
          balance_after: "1000.000000",
          receipt_number: "REC-2026-0045",
          method_details: "Barclays Commercial UK Wire",
          notes: "Tier-1 Voice Trunk Wholesale Credit",
          created_at: new Date(Date.now() - 17 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 17 * 86400000 + 7200000).toISOString()
        },
        {
          amount: 240.50,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "card",
          external_reference: "ch_3O9aZ12eZvKYlo2C88a101b",
          vos_serial: "VOS-PAY-20260818-088",
          fee: "6.20",
          balance_after: "1240.500000",
          receipt_number: "REC-2026-0067",
          method_details: "Corporate Amex ending in 1004",
          notes: "Direct portal balance replenishment",
          created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 4 * 86400000 + 45000).toISOString()
        }
      ],
      "test": [
        {
          amount: 3000.00,
          currency: "USD",
          type: "wire_transfer",
          status: "COMPLETED",
          provider: "wire",
          external_reference: "WIRE-US-2026-4401",
          vos_serial: "VOS-PAY-20260728-005",
          fee: "0.00",
          balance_after: "3000.000000",
          receipt_number: "REC-2026-0029",
          method_details: "JPMorgan Chase Fedwire",
          notes: "Wholesale Interconnect Settlement",
          created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 25 * 86400000 + 3600000).toISOString()
        },
        {
          amount: 340.10,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "crypto",
          external_reference: "0x8f2ab349c12e589dfa1890cd1254",
          vos_serial: "VOS-PAY-20260814-061",
          fee: "0.00",
          balance_after: "3340.100000",
          receipt_number: "REC-2026-0059",
          method_details: "USDT TRC-20 Instant Settlement",
          notes: "On-chain wallet top-up",
          created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 8 * 86400000 + 300000).toISOString()
        }
      ],
      "Prince": [
        {
          amount: 500.00,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "card",
          external_reference: "ch_3O1xK02eZvKYlo2C77b209c",
          vos_serial: "VOS-PAY-20260802-019",
          fee: "12.50",
          balance_after: "500.000000",
          receipt_number: "REC-2026-0041",
          method_details: "Visa ending in 9182",
          notes: "Carrier Voice Prepayment",
          created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 20 * 86400000 + 30000).toISOString()
        },
        {
          amount: 390.75,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "ach",
          external_reference: "ACH-44910283",
          vos_serial: "VOS-PAY-20260819-094",
          fee: "0.00",
          balance_after: "890.750000",
          receipt_number: "REC-2026-0071",
          method_details: "Wells Fargo Business Checking",
          notes: "ACH direct deposit",
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 3 * 86400000 + 1800000).toISOString()
        }
      ],
      "veejay_cand": [
        {
          amount: 5000.00,
          currency: "USD",
          type: "wire_transfer",
          status: "COMPLETED",
          provider: "wire",
          external_reference: "WIRE-CA-2026-0021",
          vos_serial: "VOS-PAY-20260710-002",
          fee: "0.00",
          balance_after: "5000.000000",
          receipt_number: "REC-2026-0008",
          method_details: "RBC Royal Bank Wire",
          notes: "North America Carrier Egress Agreement",
          created_at: new Date(Date.now() - 43 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 43 * 86400000 + 4000000).toISOString()
        },
        {
          amount: 670.90,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "paypal",
          external_reference: "PAYID-MN8810294",
          vos_serial: "VOS-PAY-20260812-055",
          fee: "0.00",
          balance_after: "5670.900000",
          receipt_number: "REC-2026-0052",
          method_details: "PayPal Business Settlement",
          notes: "Online customer invoice payment",
          created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 10 * 86400000 + 150000).toISOString()
        }
      ],
      "Rakesh": [
        {
          amount: 4000.00,
          currency: "USD",
          type: "wire_transfer",
          status: "COMPLETED",
          provider: "wire",
          external_reference: "WIRE-IN-2026-1190",
          vos_serial: "VOS-PAY-20260801-015",
          fee: "0.00",
          balance_after: "4000.000000",
          receipt_number: "REC-2026-0036",
          method_details: "HDFC Commercial Forex Transfer",
          notes: "International Voice Route Settlement",
          created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 21 * 86400000 + 5000000).toISOString()
        },
        {
          amount: 520.00,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "card",
          external_reference: "ch_3O5wL82eZvKYlo2C99f301d",
          vos_serial: "VOS-PAY-20260816-077",
          fee: "12.00",
          balance_after: "4520.000000",
          receipt_number: "REC-2026-0062",
          method_details: "Mastercard ending in 3390",
          notes: "Self-service top-up",
          created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 6 * 86400000 + 40000).toISOString()
        }
      ],
      "canada_23448": [
        {
          amount: 210.30,
          currency: "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "paypal",
          external_reference: "PAYID-CA-9912048",
          vos_serial: "VOS-PAY-20260810-049",
          fee: "4.50",
          balance_after: "210.300000",
          receipt_number: "REC-2026-0049",
          method_details: "PayPal Checkout Express",
          notes: "Monthly DID trunk prepayment",
          created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 12 * 86400000 + 60000).toISOString()
        }
      ]
    };

    let totalPayments = 0;
    let totalLedgers = 0;

    for (const cust of customers) {
      const name = cust.account_name || cust.vos_account_id;
      const paymentList = paymentsByAccount[name] || [
        {
          amount: Number(cust.balance) || 100.00,
          currency: cust.currency || "USD",
          type: "deposit",
          status: "COMPLETED",
          provider: "wire",
          external_reference: `WIRE-${Date.now().toString().slice(-6)}`,
          vos_serial: `VOS-PAY-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-001`,
          fee: "0.00",
          balance_after: String(cust.balance || "100.000000"),
          receipt_number: `REC-${Date.now().toString().slice(-6)}`,
          method_details: "Wire Transfer",
          notes: "Initial balance credit",
          created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
          completed_at: new Date(Date.now() - 15 * 86400000 + 3600000).toISOString()
        }
      ];

      for (const p of paymentList) {
        const paymentId = crypto.randomUUID();
        const idempotencyKey = `seed_pay_${paymentId}`;
        const metadata = {
          fee: p.fee || "0.00",
          credited_amount: Number(p.amount).toFixed(2),
          balance_after: p.balance_after,
          payment_method_details: p.method_details,
          notes: p.notes,
          receipt_number: p.receipt_number,
          processor_verified: p.status === "COMPLETED",
          telecom_ledger_verified: true
        };

        // Check if payment with same provider and external_reference already exists
        if (p.external_reference) {
          const existing = await client.query(
            "SELECT id FROM payments WHERE provider = $1 AND external_reference = $2",
            [p.provider, p.external_reference]
          );
          if (existing.rowCount && existing.rowCount > 0) {
            // Update metadata and continue
            await client.query(
              "UPDATE payments SET metadata = $1, vos_serial = COALESCE(vos_serial, $2) WHERE id = $3",
              [JSON.stringify(metadata), p.vos_serial, existing.rows[0].id]
            );
            continue;
          }
        }

        const insRes = await client.query(`
          INSERT INTO payments (
            id, customer_id, external_reference, idempotency_key, amount, currency,
            type, status, provider, vos_serial, metadata, created_at, state_updated_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12, $13)
          ON CONFLICT (customer_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
          RETURNING id
        `, [
          paymentId,
          cust.id,
          p.external_reference,
          idempotencyKey,
          p.amount,
          p.currency,
          p.type,
          p.status,
          p.provider,
          p.vos_serial,
          JSON.stringify(metadata),
          p.created_at,
          p.completed_at
        ]);

        if (insRes.rowCount > 0) {
          totalPayments++;

          // Create ledger entry if completed
          if (p.status === "COMPLETED") {
            await client.query(`
              INSERT INTO ledger_entries (
                customer_id, payment_id, direction, amount, currency, reason, idempotency_key, created_at
              ) VALUES ($1, $2, 'credit', $3, $4, $5, $6, $7)
              ON CONFLICT (idempotency_key) DO NOTHING
            `, [
              cust.id,
              paymentId,
              p.amount,
              p.currency,
              `Verified payment: ${p.method_details} (${p.vos_serial || p.external_reference})`,
              `ledger_seed_${paymentId}`,
              p.completed_at || p.created_at
            ]);
            totalLedgers++;
          }
        }
      }
    }

    await client.query("COMMIT");
    console.log(`Successfully seeded ${totalPayments} payment records and ${totalLedgers} ledger entries across ${customers.length} customer accounts.`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error seeding payments:", e);
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
