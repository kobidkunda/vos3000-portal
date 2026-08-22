import { Kafka } from "kafkajs";
import { createClient } from "@clickhouse/client";
import { Pool } from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns/promises";
import { isIP } from "node:net";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const brokers=(process.env.REDPANDA_BROKERS??"localhost:9092").split(",").map(x=>x.trim()).filter(Boolean);
const kafka=new Kafka({clientId:"vos-worker",brokers});
const cdrConsumer=kafka.consumer({groupId:"cdr-clickhouse-writer"});
const eventConsumer=kafka.consumer({groupId:"portal-event-dispatcher"});
const reportConsumer=kafka.consumer({groupId:"portal-report-worker"});
const producer=kafka.producer({allowAutoTopicCreation:false});
const ch=createClient({url:process.env.CLICKHOUSE_URL??"http://localhost:8123",username:process.env.CLICKHOUSE_USER??"default",password:process.env.CLICKHOUSE_PASSWORD??"",database:process.env.CLICKHOUSE_DATABASE??"vos"});
const pg=process.env.DATABASE_URL?new Pool({connectionString:process.env.DATABASE_URL,max:Number(process.env.WORKER_PG_POOL_MAX??10)}):undefined;
const exportDir=process.env.EXPORT_DIR??"/app/exports";
const maxExportRows=Number(process.env.MAX_EXPORT_ROWS??5_000_000);
const uuid=()=>crypto.randomUUID();
const int=(v:unknown)=>Math.max(0,Math.trunc(Number.isFinite(Number(v))?Number(v):0));
const decimal=(v:unknown)=>/^\d+(\.\d{1,6})?$/.test(String(v??""))?String(v):"0";
const iso=(v:unknown,required=false)=>{if(v===null||v===undefined||v==="")return required?undefined:null;const d=new Date(String(v));return Number.isNaN(d.getTime())?undefined:d.toISOString()};

function normalizeCdr(x:any){
  if(!x||typeof x!=="object")throw new Error("CDR must be an object");
  const serial=String(x.serial_number??"").trim(),customer=String(x.customer_id??"").trim(),account=String(x.account_id??"").trim(),begin=iso(x.begin_time,true);
  if(!serial)throw new Error("serial_number is required");if(!customer)throw new Error("customer_id is required");if(!account)throw new Error("account_id is required");if(!begin)throw new Error("begin_time is invalid");
  const ans=x.answered===true||x.answered===1||x.answered==="1"?1:x.answered===false||x.answered===0||x.answered==="0"?0:null;
  return {serial_number:serial,vos_instance_id:String(x.vos_instance_id??"default"),customer_id:customer,account_id:account,agent_id:String(x.agent_id??""),caller:String(x.caller??""),callee:String(x.callee??""),incoming_caller:String(x.incoming_caller??x.caller??""),incoming_callee:String(x.incoming_callee??x.callee??""),outbound_caller:String(x.outbound_caller??x.caller??""),outbound_callee:String(x.outbound_callee??x.callee??""),mapping_gateway_id:String(x.mapping_gateway_id??""),routing_gateway_id:String(x.routing_gateway_id??""),caller_ip:String(x.caller_ip??""),callee_ip:String(x.callee_ip??""),begin_time:begin,end_time:iso(x.end_time),answered:ans,duration:int(x.duration),charged_duration:int(x.charged_duration??x.duration),customer_charge:decimal(x.customer_charge),customer_tax:decimal(x.customer_tax),carrier_cost:decimal(x.carrier_cost),carrier_tax:decimal(x.carrier_tax),call_type:String(x.call_type??""),area_prefix:String(x.area_prefix??""),area_name:String(x.area_name??""),billing_method:String(x.billing_method??""),billing_mode:String(x.billing_mode??""),pdd_ms:int(x.pdd_ms),connect_delay_ms:int(x.connect_delay_ms),calling_call_id:String(x.calling_call_id??""),called_call_id:String(x.called_call_id??""),termination_reason:String(x.termination_reason??""),hangup_side:String(x.hangup_side??""),raw_json:JSON.stringify(x),ingested_at:new Date().toISOString()};
}

async function runCdr(){
  await cdrConsumer.connect();await cdrConsumer.subscribe({topic:"cdr.raw",fromBeginning:false});
  await cdrConsumer.run({eachBatchAutoResolve:false,eachBatch:async({batch,resolveOffset,heartbeat,commitOffsetsIfNecessary,isRunning,isStale})=>{
    if(!isRunning()||isStale())return;const rows:any[]=[],invalid:any[]=[],offsets:string[]=[];
    for(const m of batch.messages){try{rows.push(normalizeCdr(JSON.parse(m.value?.toString()??"{}")))}catch(e:any){invalid.push({id:uuid(),topic:batch.topic,partition:batch.partition,offset:m.offset,error:e?.message??"invalid CDR",raw:m.value?.toString()??"",created_at:new Date().toISOString()})}offsets.push(m.offset)}
    // Side effects complete before offsets are resolved. Replays are safe because the ClickHouse
    // table is a ReplacingMergeTree; replay safety relies on the stable tenant/VOS/serial sorting key.
    if(invalid.length)await producer.send({topic:"cdr.invalid",messages:invalid.map(x=>({key:x.id,value:JSON.stringify(x)}))});
    if(rows.length)await ch.insert({table:"cdr_events",values:rows,format:"JSONEachRow"});
    for(const offset of offsets)resolveOffset(offset);await commitOffsetsIfNecessary();await heartbeat();
  }});
}

function isBlockedIp(ip:string){
  const v=ip.toLowerCase();
  if(isIP(v)===6){if(v.startsWith("::ffff:"))return isBlockedIp(v.slice(7));return v==="::"||v==="::1"||v.startsWith("fe80:")||v.startsWith("fc")||v.startsWith("fd")||v.startsWith("ff")}
  const m=v.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);if(!m)return true;const [a,b]=[Number(m[1]),Number(m[2])];
  return a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19));
}
async function assertSafeWebhookUrl(raw:string){
  const u=new URL(raw);if(process.env.NODE_ENV==="production"&&u.protocol!=="https:")throw new Error("Production webhooks must use HTTPS");if(!["http:","https:"].includes(u.protocol))throw new Error("Unsupported webhook protocol");if(u.username||u.password)throw new Error("Webhook URL credentials are not allowed");if(u.hostname==="localhost"||u.hostname.endsWith(".localhost"))throw new Error("Local webhook targets are blocked");
  if(isIP(u.hostname)&&isBlockedIp(u.hostname))throw new Error("Private/link-local webhook targets are blocked");
  const addrs=await dns.lookup(u.hostname,{all:true});if(!addrs.length||addrs.some(a=>isBlockedIp(a.address)))throw new Error("Private/link-local webhook targets are blocked");return u;
}
function decryptSecret(v:string){const keyRaw=process.env.ENCRYPTION_KEY;if(!keyRaw)throw new Error("ENCRYPTION_KEY is required for webhook delivery");const key=Buffer.from(keyRaw,"base64");if(key.length!==32)throw new Error("ENCRYPTION_KEY must decode to 32 bytes");const [ivb,tagb,encb]=v.split(".");if(!ivb||!tagb||!encb)throw new Error("Webhook secret ciphertext is invalid");const d=crypto.createDecipheriv("aes-256-gcm",key,Buffer.from(ivb,"base64url"));d.setAuthTag(Buffer.from(tagb,"base64url"));return Buffer.concat([d.update(Buffer.from(encb,"base64url")),d.final()]).toString("utf8")}
async function deliverWebhook(endpoint:any,event:any,attempt=1){
  if(!pg)return;const eventId=String(event.id??"");if(!eventId)throw new Error("Webhook event id is required");
  // Claim this exact attempt before performing network I/O. A replay of the same Kafka event
  // therefore cannot deliver attempt N twice from this worker fleet.
  const claim=await pg.query(`INSERT INTO webhook_deliveries(id,endpoint_id,event_id,event_type,payload,attempt,next_retry_at,created_at) VALUES($1,$2,$3,$4,$5,$6,now()+interval '2 minutes',now()) ON CONFLICT(endpoint_id,event_id,attempt) DO NOTHING RETURNING id`,[uuid(),endpoint.id,eventId,String(event.type??"unknown"),event,attempt]);
  if(!claim.rowCount)return;const deliveryId=claim.rows[0].id;let status:number|undefined,responseExcerpt="",error:string|undefined;
  try{const u=await assertSafeWebhookUrl(endpoint.url),secret=decryptSecret(endpoint.secret_ciphertext),payload=JSON.stringify(event),signature=crypto.createHmac("sha256",secret).update(payload).digest("hex");const res=await fetch(u,{method:"POST",headers:{"content-type":"application/json","x-vos-event-id":eventId,"x-vos-signature":`sha256=${signature}`},body:payload,redirect:"error",signal:AbortSignal.timeout(Number(process.env.WEBHOOK_TIMEOUT_MS??10000))});status=res.status;responseExcerpt=(await res.text()).slice(0,1000);if(!res.ok)error=`HTTP ${res.status}`}catch(e:any){error=e?.message??"delivery failed"}
  const delivered=!error&&status!==undefined&&status>=200&&status<300,maxAttempts=Number(process.env.WEBHOOK_MAX_ATTEMPTS??8),next=delivered||attempt>=maxAttempts?null:new Date(Date.now()+Math.min(3600,Math.pow(2,Math.min(attempt,10))*30)*1000);
  await pg.query(`UPDATE webhook_deliveries SET http_status=$2,response_excerpt=$3,next_retry_at=$4,delivered_at=$5 WHERE id=$1`,[deliveryId,status??null,(error?`${error}: `:"")+responseExcerpt,next,delivered?new Date():null]);
}
async function dispatchEvent(event:any){if(!pg||!event?.organization_id||!event?.id)return;const r=await pg.query("SELECT * FROM webhook_endpoints WHERE organization_id=$1 AND status='active' AND ('*'=ANY(event_types) OR $2=ANY(event_types))",[event.organization_id,String(event.type??"")]);for(const e of r.rows)await deliverWebhook(e,event,1)}
async function retryWebhooks(){
  if(!pg)return;
  const r=await pg.query(`SELECT d.*,e.url,e.secret_ciphertext FROM webhook_deliveries d JOIN webhook_endpoints e ON e.id=d.endpoint_id WHERE d.delivered_at IS NULL AND d.next_retry_at<=now() AND d.attempt<$1 AND e.status='active' AND NOT EXISTS (SELECT 1 FROM webhook_deliveries newer WHERE newer.endpoint_id=d.endpoint_id AND newer.event_id=d.event_id AND newer.attempt>d.attempt) ORDER BY d.next_retry_at LIMIT 100`,[Number(process.env.WEBHOOK_MAX_ATTEMPTS??8)]);
  for(const d of r.rows)await deliverWebhook(d,{...d.payload,id:d.event_id,type:d.event_type},Number(d.attempt)+1);
}
async function runEvents(){await eventConsumer.connect();await eventConsumer.subscribe({topic:"portal.events",fromBeginning:false});await eventConsumer.run({eachMessage:async({message})=>{const event=JSON.parse(message.value?.toString()??"{}");await dispatchEvent(event)}})}

function sqlTime(v:unknown,end=false){const raw=String(v??"");const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(raw);const d=new Date(dateOnly?`${raw}T00:00:00.000Z`:raw);if(Number.isNaN(d.getTime()))throw new Error("A valid from/to date is required for CDR export");if(end&&dateOnly)d.setUTCDate(d.getUTCDate()+1);return {value:d.toISOString().replace("T"," ").replace("Z",""),exclusive:end&&dateOnly}}
async function clickhouseRaw(query:string){const u=new URL(process.env.CLICKHOUSE_URL??"http://localhost:8123");u.searchParams.set("database",process.env.CLICKHOUSE_DATABASE??"vos");const headers:Record<string,string>={"content-type":"text/plain"};if(process.env.CLICKHOUSE_USER)headers.authorization="Basic "+Buffer.from(`${process.env.CLICKHOUSE_USER}:${process.env.CLICKHOUSE_PASSWORD??""}`).toString("base64");const res=await fetch(u,{method:"POST",headers,body:query,signal:AbortSignal.timeout(Number(process.env.REPORT_QUERY_TIMEOUT_MS??300000))});if(!res.ok)throw new Error(`ClickHouse export HTTP ${res.status}: ${(await res.text()).slice(0,500)}`);return res}
async function deliverReport(job:any,objectPath:string,count:number){
  const recipients=Array.isArray(job.delivery_recipients)?job.delivery_recipients:[];if(!recipients.length)return;
  const payload={reportId:job.id,scheduleId:job.schedule_id??null,organizationId:job.organization_id??null,recipients,format:job.format,rowCount:count,downloadPath:`/api/v1/downloads/${job.id}/file`,objectPath};
  const url=process.env.REPORT_DELIVERY_WEBHOOK;if(!url){await pg?.query("UPDATE report_jobs SET delivery_status='not_configured',delivery_error='REPORT_DELIVERY_WEBHOOK is not configured' WHERE id=$1",[job.id]);return}
  try{const res=await fetch(url,{method:"POST",headers:{"content-type":"application/json",...(process.env.REPORT_DELIVERY_TOKEN?{"authorization":`Bearer ${process.env.REPORT_DELIVERY_TOKEN}`}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(Number(process.env.REPORT_DELIVERY_TIMEOUT_MS??15000)),redirect:"error"});if(!res.ok)throw new Error(`Delivery adapter HTTP ${res.status}`);await pg?.query("UPDATE report_jobs SET delivery_status='delivered',delivery_error=NULL WHERE id=$1",[job.id])}catch(e:any){await pg?.query("UPDATE report_jobs SET delivery_status='failed',delivery_error=$2 WHERE id=$1",[job.id,String(e?.message??e).slice(0,1000)])}
}
async function processReport(job:any){
  if(!pg)throw new Error("DATABASE_URL is required for report jobs");if(job.report_type!=="cdr_export")throw new Error(`Worker does not implement report_type ${job.report_type}; no fake report was generated`);
  const fromRange=sqlTime(job.filters?.from),toRange=sqlTime(job.filters?.to,true),from=fromRange.value,to=toRange.value;if(new Date(from)>new Date(to))throw new Error("Report from date must be <= to date");
  let customerClause="";if(job.organization_id){const r=await pg.query("SELECT id FROM customers WHERE organization_id=$1",[job.organization_id]);const ids=r.rows.map(x=>String(x.id)).filter(x=>/^[0-9a-f-]{36}$/i.test(x));if(!ids.length)throw new Error("No customer is mapped to the report organization");customerClause=` AND customer_id IN (${ids.map(x=>`'${x}'`).join(",")})`;}
  const where=`begin_time >= toDateTime64('${from}',3,'UTC') AND begin_time ${toRange.exclusive?"<":"<="} toDateTime64('${to}',3,'UTC')${customerClause}`;
  const countRes=await clickhouseRaw(`SELECT count() FROM vos.cdr_events FINAL WHERE ${where} FORMAT TabSeparated`),count=Number((await countRes.text()).trim());if(!Number.isFinite(count))throw new Error("Could not determine export row count");if(count>maxExportRows)throw new Error(`Export contains ${count} rows, above MAX_EXPORT_ROWS=${maxExportRows}; split the date range`);
  fs.mkdirSync(exportDir,{recursive:true});const requested=String(job.format??"csv").toLowerCase();if(!["csv","csv.gz","parquet"].includes(requested))throw new Error(`Unsupported export format ${requested}`);const format=requested==="parquet"?"Parquet":"CSVWithNames",ext=requested,dest=path.resolve(exportDir,`${job.id}.${ext}`);if(!dest.startsWith(path.resolve(exportDir)+path.sep))throw new Error("Unsafe export path");
  const columns="serial_number,vos_instance_id,customer_id,account_id,caller,callee,begin_time,end_time,answered,duration,charged_duration,customer_charge,mapping_gateway_id,routing_gateway_id,area_prefix,area_name,pdd_ms,termination_reason,hangup_side,calling_call_id,called_call_id";
  const res=await clickhouseRaw(`SELECT ${columns} FROM vos.cdr_events FINAL WHERE ${where} ORDER BY begin_time DESC FORMAT ${format}`);if(!res.body)throw new Error("ClickHouse returned no export body");const source=Readable.fromWeb(res.body as any),file=fs.createWriteStream(dest);if(requested==="csv.gz")await pipeline(source,zlib.createGzip(),file);else await pipeline(source,file);
  await pg.query("UPDATE report_jobs SET status='ready',object_path=$2,row_count=$3,expires_at=now()+($4::text||' hours')::interval,completed_at=now(),error=NULL WHERE id=$1",[job.id,dest,count,String(Number(process.env.EXPORT_TTL_HOURS??24))]);
  if(job.organization_id)await pg.query("INSERT INTO notifications(organization_id,type,severity,title,body) VALUES($1,'report.ready','info','Report ready',$2)",[job.organization_id,`Report ${job.id} is ready with ${count} rows.`]);
  await deliverReport(job,dest,count);
}
async function claimAndProcessReport(id:string){
  if(!pg)return;const claim=await pg.query("UPDATE report_jobs SET status='running',error=NULL WHERE id=$1 AND status='queued' RETURNING *",[id]);if(!claim.rowCount)return;const job=claim.rows[0];
  try{await processReport(job)}catch(e:any){console.error("report job failed",job.id,e);await pg.query("UPDATE report_jobs SET status='failed',error=$2,completed_at=now() WHERE id=$1",[job.id,String(e?.message??e).slice(0,2000)])}
}
async function runReports(){await reportConsumer.connect();await reportConsumer.subscribe({topic:"report.jobs",fromBeginning:false});await reportConsumer.run({eachMessage:async({message})=>{const payload=JSON.parse(message.value?.toString()??"{}");if(payload.id)await claimAndProcessReport(String(payload.id))}})}
async function pollQueuedReports(){if(!pg)return;const r=await pg.query("SELECT id FROM report_jobs WHERE status='queued' ORDER BY created_at LIMIT 20");for(const row of r.rows)await claimAndProcessReport(String(row.id))}
async function enqueueDueSchedules(){
  if(!pg)return;const client=await pg.connect(),jobs:any[]=[];
  try{await client.query("BEGIN");const r=await client.query("SELECT * FROM report_schedules WHERE enabled=true AND next_run_at<=now() ORDER BY next_run_at FOR UPDATE SKIP LOCKED LIMIT 50");for(const s of r.rows){const id=uuid(),job={id,organization_id:s.organization_id,report_type:s.report_type,filters:s.filters,format:s.format,schedule_id:s.id,delivery_recipients:s.recipients};await client.query("INSERT INTO report_jobs(id,organization_id,report_type,schedule_id,delivery_recipients,filters,format,status) VALUES($1,$2,$3,$4,$5,$6,$7,'queued')",[id,s.organization_id,s.report_type,s.id,s.recipients,s.filters,s.format]);const interval=s.frequency==="weekly"?"7 days":s.frequency==="monthly"?"1 month":"1 day";await client.query(`UPDATE report_schedules SET last_run_at=now(),next_run_at=now()+interval '${interval}',updated_at=now() WHERE id=$1`,[s.id]);jobs.push(job)}await client.query("COMMIT")}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
  for(const job of jobs)try{await producer.send({topic:"report.jobs",messages:[{key:job.id,value:JSON.stringify(job)}]})}catch(e){console.error("report enqueue publish failed; DB poller will recover",job.id,e)}
}


async function syncCustomerBalances(){
  if(!pg) return;
  const vosBase = process.env.VOS_HTTP_BASE_URL;
  const vosUser = process.env.VOS_HTTP_USERNAME;
  const vosPass = process.env.VOS_HTTP_PASSWORD;
  if(!vosBase || !vosUser || !vosPass){
    console.warn("VOS balance sync skipped: VOS_HTTP_* not configured (VERIFY-API)");
    return;
  }
  const customers = await pg.query("SELECT id, vos_account_id, balance FROM customers WHERE vos_account_id IS NOT NULL");
  for(const c of customers.rows){
    try{
      // VERIFY-API: GetCustomer.jsp payload requires verification. Current vos-capabilities maps getBalance->GetCustomer.jsp
      // Try the verified working payload shape first (userid/password + account identifier). Fallback shapes are attempted.
      const attempts = [
        {userid: vosUser, password: vosPass, account: c.vos_account_id},
        {userid: vosUser, password: vosPass, accountName: c.vos_account_id},
        {userid: vosUser, password: vosPass, customerName: c.vos_account_id},
        {userid: vosUser, password: vosPass, name: c.vos_account_id},
      ];
      let data=null, lastErr=null;
      for(const body of attempts){
        try{
          const res = await fetch(vosBase + "/external/server/GetCustomer.jsp", {
            method:"POST", headers:{"content-type":"application/json"}, body: JSON.stringify(body), signal: AbortSignal.timeout(8000)
          });
          if(!res.ok) throw new Error("HTTP "+res.status);
          const json = await res.json();
          // VOS returns retCode 0 on success; Miss parameters is -12103
          if(json.retCode !== undefined && json.retCode !== 0){
            // treat Miss parameters as retry with next shape
            if(json.retCode === -12103) { lastErr = json.exception; continue; }
            throw new Error("VOS retCode "+json.retCode+": "+json.exception);
          }
          data = json;
          break;
        }catch(e:any){ lastErr = e.message; }
      }
      if(!data){
        console.warn("VOS balance sync VERIFY-API for "+c.vos_account_id+": "+lastErr+" - keeping postgres value, mark degraded");
        continue;
      }
      // try to extract balance field - VOS may return infoCustomer / balance / currentBalance / accountBalance
      const balRaw = data.balance ?? data.currentBalance ?? data.accountBalance ?? data.infoCustomer?.balance ?? data.info?.balance ?? data.data?.balance;
      if(balRaw === undefined){
        console.warn("VOS balance sync: no balance field in response for "+c.vos_account_id+" keys="+Object.keys(data).join(","));
        continue;
      }
      const newBal = String(balRaw);
      if(!/^\d+(\.\d{1,6})?$/.test(newBal)) continue;
      if(newBal === String(c.balance)) continue;
      const before = String(c.balance);
      await pg.query("UPDATE customers SET balance=$2, updated_at=now() WHERE id=$1", [c.id, newBal]);
      await pg.query("INSERT INTO audit_logs(actor_user_id, organization_id, action, resource_type, resource_id, before_data, after_data) VALUES(NULL, (SELECT organization_id FROM customers WHERE id=$1), 'vos.balance_sync', 'customer', $1, $2::jsonb, $3::jsonb)", [c.id, JSON.stringify({balance: before}), JSON.stringify({balance: newBal})]);
      console.log("VOS balance sync updated "+c.vos_account_id+" "+before+" -> "+newBal);
    }catch(e:any){
      console.warn("VOS balance sync failed for "+c.vos_account_id+": "+e.message);
    }
  }
}

async function reconcileStalePaymentCredits(){
  if(!pg)return;const minutes=Math.max(2,Number(process.env.PAYMENT_CREDIT_STALE_MINUTES??5));
  const r=await pg.query(`UPDATE payments SET status='REQUIRES_RECONCILIATION',state_updated_at=now(),metadata=metadata||jsonb_build_object('reconciliation_reason','stale_crediting_claim','reconciliation_marked_at',now()) WHERE status='CREDITING_VOS' AND state_updated_at < now()-($1::text||' minutes')::interval RETURNING id,customer_id`,[String(minutes)]);
  if(r.rowCount)console.error(`Marked ${r.rowCount} stale payment credit claim(s) for reconciliation; automatic re-credit is intentionally disabled`);
}

let shutting=false;async function shutdown(){if(shutting)return;shutting=true;for(const c of [cdrConsumer,eventConsumer,reportConsumer])try{await c.disconnect()}catch{}try{await producer.disconnect()}catch{}try{await ch.close()}catch{}try{await pg?.end()}catch{}process.exit(0)}
async function run(){if(!pg&&process.env.NODE_ENV==="production")throw new Error("DATABASE_URL is required for production worker");fs.mkdirSync(exportDir,{recursive:true});await producer.connect();await Promise.all([runCdr(),runEvents(),runReports()])}
process.on("SIGTERM",()=>void shutdown());process.on("SIGINT",()=>void shutdown());
setInterval(()=>void retryWebhooks().catch(e=>console.error("webhook retry",e)),30_000);
setInterval(()=>void enqueueDueSchedules().catch(e=>console.error("report schedule",e)),60_000);
setInterval(()=>void pollQueuedReports().catch(e=>console.error("report queue recovery",e)),30_000);
setInterval(()=>void syncCustomerBalances().catch(e=>console.error("vos balance sync",e)), 5*60*1000);
setInterval(()=>void reconcileStalePaymentCredits().catch(e=>console.error("payment reconciliation sweep",e)),60_000);
run().catch(e=>{console.error(e);process.exit(1)});
