import { createClient } from "@clickhouse/client";
import pg from "pg";
import crypto from "crypto";

const ch = createClient({
  url: process.env.CLICKHOUSE_URL ?? "http://localhost:8123",
  username: process.env.CLICKHOUSE_USER ?? "default",
  password: process.env.CLICKHOUSE_PASSWORD ?? "",
  database: process.env.CLICKHOUSE_DATABASE ?? "vos",
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://vos:vos@localhost:5432/vos_portal",
});

async function main() {
  console.log("Reconciling and seeding 100% exact billing payments, ledger entries, and ClickHouse CDRs...");

  // 1. Get all customers
  const custRes = await pool.query("SELECT id, account_name, vos_account_id, balance FROM customers");
  const customers = custRes.rows;
  console.log(`Found ${customers.length} customers.`);

  // 2. Fetch gateways for CDR generation
  const gwRes = await pool.query("SELECT id, name, kind, configured_ip FROM gateways");
  const gateways = gwRes.rows;
  const mapGws = gateways.filter(g => g.kind === "mapping");
  const routGws = gateways.filter(g => g.kind === "routing");

  const defaultMapGw = mapGws[0] || { name: "GW-INGRESS-01", configured_ip: "198.51.100.42" };
  const defaultRoutGw = routGws[0] || { name: "uk 6007 8861 a", configured_ip: "104.243.37.23" };

  const callerPrefixes = ["+1415555", "+1212555", "+1312555", "+44207183", "+44161850", "+6129000", "+3317000", "+49302000"];
  const calleePrefixes = ["+44207183", "+44146379", "+44172337", "+1800555", "+1415888", "+4989200", "+8135555", "+656700"];

  function getAreaName(callee) {
    if (callee.startsWith("+4420")) return "United Kingdom - London";
    if (callee.startsWith("+4414")) return "United Kingdom - Inverness";
    if (callee.startsWith("+4417")) return "United Kingdom - Scarborough";
    if (callee.startsWith("+1415")) return "United States - San Francisco";
    if (callee.startsWith("+1212")) return "United States - New York";
    if (callee.startsWith("+1800")) return "United States - Toll Free";
    if (callee.startsWith("+49")) return "Germany - Munich / Berlin";
    if (callee.startsWith("+61")) return "Australia - Sydney";
    if (callee.startsWith("+33")) return "France - Paris";
    return "International Destination";
  }

  // Clear existing payments and ledger entries
  await pool.query("DELETE FROM ledger_entries");
  await pool.query("DELETE FROM payments");

  // Re-create CDR table to clear duplicate test batches cleanly
  await ch.query({
    query: "ALTER TABLE vos.cdr_events DELETE WHERE serial_number LIKE 'CDR-202605%' OR serial_number LIKE 'CDR-202606%' OR serial_number LIKE 'CDR-202607%'"
  });

  const allCdrRows = [];

  for (const cust of customers) {
    const isVeejay = cust.account_name === "veejay singh" || cust.vos_account_id === "veejay singh";
    
    // Historical reconciled periods: May 2026, June 2026, July 2026
    const periods = [
      {
        monthStr: "2026-05",
        depositAmount: isVeejay ? "100.000000" : "500.000000",
        depositDate: new Date("2026-05-02T10:15:00Z"),
        targetCharge: isVeejay ? 48.20 : 120.50,
        callCount: 60,
        answeredCount: 50
      },
      {
        monthStr: "2026-06",
        depositAmount: isVeejay ? "100.000000" : "800.000000",
        depositDate: new Date("2026-06-03T14:20:00Z"),
        targetCharge: isVeejay ? 84.40 : 210.30,
        callCount: 85,
        answeredCount: 72
      },
      {
        monthStr: "2026-07",
        depositAmount: isVeejay ? "50.000000" : "600.000000",
        depositDate: new Date("2026-07-04T09:45:00Z"),
        targetCharge: isVeejay ? 90.60 : 180.20,
        callCount: 110,
        answeredCount: 95
      }
    ];

    for (const p of periods) {
      // 1. Insert completed payment
      const paymentId = crypto.randomUUID();
      const extRef = `PAY-${p.monthStr.replace("-", "")}-${Math.floor(1000 + Math.random() * 9000)}`;
      const idempKey = `dep_${paymentId}`;

      await pool.query(`
        INSERT INTO payments (id, customer_id, external_reference, idempotency_key, amount, currency, type, status, provider, vos_serial, created_at, state_updated_at, completed_at)
        VALUES ($1, $2, $3, $4, $5, 'USD', 'deposit', 'completed', 'card', $6, $7, $7, $7)
      `, [paymentId, cust.id, extRef, idempKey, p.depositAmount, `VOS-${extRef}`, p.depositDate]);

      // 2. Insert corresponding ledger entry
      await pool.query(`
        INSERT INTO ledger_entries (id, customer_id, payment_id, direction, amount, currency, reason, idempotency_key, created_at)
        VALUES ($1, $2, $3, 'credit', $4, 'USD', 'Prepaid wallet deposit via Stripe Card', $5, $6)
      `, [crypto.randomUUID(), cust.id, paymentId, p.depositAmount, `led_${paymentId}`, p.depositDate]);

      // 3. Generate CDRs with exact charge distribution
      const chargePerAnsweredCall = (p.targetCharge / p.answeredCount);
      const daysInMonth = 28;

      let answeredCountSoFar = 0;
      for (let cIdx = 0; cIdx < p.callCount; cIdx++) {
        const dayOffset = (cIdx % daysInMonth) + 1;
        const hourOffset = 8 + (cIdx % 12);
        const minOffset = (cIdx * 7) % 60;
        const callTime = new Date(`${p.monthStr}-${String(dayOffset).padStart(2, "0")}T${String(hourOffset).padStart(2, "0")}:${String(minOffset).padStart(2, "0")}:00Z`);

        const isAnswered = (answeredCountSoFar < p.answeredCount && (cIdx % 5 !== 0 || (p.callCount - cIdx) <= (p.answeredCount - answeredCountSoFar))) ? 1 : 0;
        if (isAnswered) answeredCountSoFar++;

        const durationSec = isAnswered ? Math.floor(75 + (cIdx % 160)) : 0;
        const chargedSec = Math.ceil(durationSec / 6) * 6;
        const custCharge = isAnswered ? chargePerAnsweredCall.toFixed(6) : "0.000000";
        const carrCost = isAnswered ? (chargePerAnsweredCall * 0.65).toFixed(6) : "0.000000";

        const caller = `${callerPrefixes[cIdx % callerPrefixes.length]}${1000 + (cIdx * 19) % 9000}`;
        const callee = `${calleePrefixes[cIdx % calleePrefixes.length]}${2000 + (cIdx * 23) % 8000}`;
        const serial = `CDR-${callTime.toISOString().slice(0, 10).replace(/-/g, "")}-${String(200000 + allCdrRows.length).padStart(8, "0")}`;

        allCdrRows.push({
          serial_number: serial,
          vos_instance_id: "62.84.182.223",
          customer_id: String(cust.id),
          account_id: String(cust.vos_account_id ?? cust.account_name),
          agent_id: "",
          caller,
          callee,
          incoming_caller: caller,
          incoming_callee: callee,
          outbound_caller: caller,
          outbound_callee: callee,
          mapping_gateway_id: String(defaultMapGw.name),
          routing_gateway_id: String(defaultRoutGw.name),
          caller_ip: String(defaultMapGw.configured_ip || "198.51.100.42"),
          callee_ip: String(defaultRoutGw.configured_ip || "104.243.37.23"),
          begin_time: callTime.toISOString().replace("T", " ").replace("Z", ""),
          end_time: new Date(callTime.getTime() + (durationSec + 5) * 1000).toISOString().replace("T", " ").replace("Z", ""),
          answered: isAnswered,
          duration: durationSec,
          charged_duration: chargedSec,
          customer_charge: custCharge,
          customer_tax: "0.000000",
          carrier_cost: carrCost,
          carrier_tax: "0.000000",
          call_type: "SIP-TO-SIP",
          area_prefix: callee.slice(0, 5),
          area_name: getAreaName(callee),
          billing_method: "STANDARD_RATE",
          billing_mode: "POSTPAID",
          pdd_ms: 180 + (cIdx % 100),
          connect_delay_ms: 950 + (cIdx % 200),
          calling_call_id: `call-${serial}@client`,
          called_call_id: `call-${serial}@vos`,
          termination_reason: isAnswered ? "NORMAL_CLEARING (Q.850 Cause 16)" : "USER_BUSY (Q.850 Cause 17 / SIP 486)",
          hangup_side: isAnswered ? "Caller" : "Callee",
          raw_json: JSON.stringify({
            serial_number: serial,
            caller,
            callee,
            duration: durationSec,
            mos_score: isAnswered ? 4.35 : 0
          }),
          ingested_at: callTime.toISOString().replace("T", " ").replace("Z", "")
        });
      }
    }
  }

  console.log(`Inserting ${allCdrRows.length} historical CDR rows into ClickHouse...`);
  if (allCdrRows.length > 0) {
    await ch.insert({
      table: "cdr_events",
      values: allCdrRows,
      format: "JSONEachRow"
    });
  }

  console.log("Seeding completed successfully!");
  await pool.end();
  await ch.close();
}

main().catch(e => {
  console.error("Error seeding billing statements:", e);
  process.exit(1);
});
