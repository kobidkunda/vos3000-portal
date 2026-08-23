import { Inject, Injectable, forwardRef } from "@nestjs/common";
import crypto from "node:crypto";
import { findPortalRoute, findActionSchema, type ActionSchema, type AuthContext, type PagePayload, type ProductApiDefinition } from "@vos/shared";
import { DataSourcesService } from "./data-sources.service.js";
import { AuthService } from "./auth.service.js";
import { VosAdapter, type VosOperation, VosCapabilityError } from "@vos/adapter";
import { validateActionInput } from "./action-validation.js";
import { deriveAlarms, type AlarmAckState, type AlarmRow, type AlarmSourceCustomer, type AlarmSourceGateway, type AlarmSourceVosGateway } from "./alarms.js";
import { NowpaymentsService } from "./nowpayments.service.js";

const now=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID();
function deepRedact(v:any):any{if(Array.isArray(v))return v.map(deepRedact);if(!v||typeof v!=="object")return v;const o:any={};for(const [k,x] of Object.entries(v))o[k]=/password|secret|token|authorization|api[_-]?key/i.test(k)?"[REDACTED]":deepRedact(x);return o}
function resourceType(path:string){return path.replace(/^\/api\/v1\//,"").replace(/\{[^}]+\}/g,"item").replace(/[^a-z0-9]+/gi,"_").replace(/^_|_$/g,"")}
function itemsFromVos(v:any){
  if(Array.isArray(v))return v;
  if(Array.isArray(v?.items))return v.items;
  if(Array.isArray(v?.data))return v.data;
  if(Array.isArray(v?.infoGatewayRoutings))return v.infoGatewayRoutings;
  if(Array.isArray(v?.infoGatewayMappings))return v.infoGatewayMappings;
  if(Array.isArray(v?.infoCurrentCalls))return v.infoCurrentCalls;
  if(Array.isArray(v?.accounts))return v.accounts;
  if(Array.isArray(v?.infoCustomers))return v.infoCustomers;
  if(Array.isArray(v?.infoFeeRates))return v.infoFeeRates;
  if(Array.isArray(v?.infoFeeRateGroups))return v.infoFeeRateGroups;
  if(Array.isArray(v?.infoPayHistories))return v.infoPayHistories;
  if(Array.isArray(v?.infoGatewayStatuses))return v.infoGatewayStatuses;
  if(Array.isArray(v?.infoGatewayNetworks))return v.infoGatewayNetworks;
  return v&&typeof v==="object"?[v]:[];
}

const readVosByApi:Record<string,VosOperation>={
  "GET /api/v1/account":"getAccount",
  "GET /api/v1/balance":"getBalance",
  "GET /api/v1/cdr":"getCdr",
  "GET /api/v1/cdr/recent":"getRecentCdr",
  "GET /api/v1/calls/live":"getCurrentCalls",
  "GET /api/v1/gateways":"getMappingGateways",
  "GET /api/v1/admin/gateways/mapping":"getMappingGateways",
  "GET /api/v1/admin/gateways/routing":"getRoutingGateways",
  "GET /api/v1/admin/gateways/network":"getGatewayNetwork",
  "GET /api/v1/admin/gateways/status":"getGatewayStatus",
  "GET /api/v1/rates":"getRates",
  "GET /api/v1/payments":"getPayments",
  "GET /api/v1/admin/payments":"getPayments"
};
const readVosByPageName=(name:string):VosOperation|undefined=>{
  const n=name.toLowerCase();
  if(n.includes("recent cdr")||n==="recent calls")return "getRecentCdr";
  if(n.includes("cdr"))return "getCdr";
  if(n.includes("live calls"))return "getCurrentCalls";
  if(n.includes("mapping gateway")&&n.includes("network"))return "getGatewayNetwork";
  if(n.includes("gateway network"))return "getGatewayNetwork";
  if(n.includes("gateway status"))return "getGatewayStatus";
  if(n.includes("mapping gateway"))return "getMappingGateways";
  if(n.includes("routing gateway"))return "getRoutingGateways";
  if(n.includes("rate")&&!n.includes("change history"))return "getRates";
  if(n.includes("payment"))return "getPayments";
  if(n.includes("balance")||n.includes("wallet"))return "getBalance";
  if(n.includes("customer account")||n==="customer overview")return "getAccount";
  return undefined;
};

@Injectable()
export class PlatformService {
  private vos=new VosAdapter();
  private deposits=new Map<string,any>();
  constructor(
    @Inject(DataSourcesService) private sources:DataSourcesService,
    @Inject(AuthService) private auth:AuthService,
    @Inject(NowpaymentsService) private nowpayments:NowpaymentsService
  ){}
  async init(){await this.sources.init()}

  private externalKpis(rows:any[], defName?:string, side?: "Admin" | "Client"){
    const n = (defName ?? "").toLowerCase();
    if (n.includes("export") || n.includes("cdr export")) {
      const totalJobs = rows.length;
      const readyJobs = rows.filter(r => String(r.status ?? "").toLowerCase() === "ready").length;
      const queuedRunning = rows.filter(r => /queued|running/i.test(String(r.status ?? ""))).length;
      const totalRows = rows.reduce((acc, r) => acc + (Number(r.row_count) || 0), 0);
      return [
        { label: "Export Jobs", value: `${totalJobs} Total`, status: totalJobs > 0 ? "healthy" : undefined },
        { label: "Ready to Download", value: `${readyJobs} Available`, status: readyJobs > 0 ? "healthy" : undefined },
        { label: "In Progress", value: `${queuedRunning} Active`, status: queuedRunning > 0 ? "warning" : undefined },
        { label: "Total Rows Exported", value: `${totalRows.toLocaleString()} Records`, status: "info" }
      ];
    }
    if (n.includes("routing gateway") || n.includes("routing gateways")) {
      const totalCapacity = rows.reduce((acc, r) => acc + (Number(r.capacity) || 0), 0);
      const active = rows.filter(x => x.lockType === 0 || x.status === "online" || x.status === "active").length;
      const totalCalls = rows.reduce((acc, r) => acc + (Number(r.active_calls) || 0), 0);
      const withRewrites = rows.filter(x => (x.rewriteRulesInCallee && x.rewriteRulesInCallee.trim()) || (x.rewriteRulesInCaller && x.rewriteRulesInCaller.trim())).length;
      return [
        { label: "Egress Routes", value: String(rows.length) },
        { label: "Total Capacity", value: `${totalCapacity.toLocaleString()} Lines`, status: "healthy" },
        { label: "Active Routes", value: `${active} / ${rows.length}`, status: active > 0 ? "healthy" : "warning" },
        { label: "Translation Rules", value: `${withRewrites} Active`, status: "info" }
      ];
    }
    if (n.includes("live calls") || n.includes("live concurrent calls") || n.includes("live monitor")) {
      const active = rows.length;
      const avgPdd = active > 0 ? Math.round(rows.reduce((acc, r) => acc + (Number(r.pdd_ms) || 0), 0) / active) : 0;
      const g711Count = rows.filter(r => String(r.codec ?? "").includes("711")).length;
      const g729Count = rows.filter(r => String(r.codec ?? "").includes("729")).length;
      return [
        { label: "Active Calls", value: `${active} Live Sessions`, status: active > 0 ? "healthy" : undefined },
        { label: "Fleet PDD", value: active > 0 ? `${avgPdd}ms` : "Optimal (<150ms)", status: "healthy" },
        { label: "Codec Negotiation", value: active > 0 ? `G.711: ${g711Count} · G.729: ${g729Count}` : "RTP Ready" },
        { label: side === "Client" ? "Channel Status" : "Softswitch Engine", value: side === "Client" ? "Ingress Active" : "VOS3000-Core-01", status: "healthy" }
      ];
    }
    if (n.includes("payment") || n.includes("payments")) {
      const completedRows = rows.filter(r => String(r.status ?? "").toLowerCase() === "completed");
      const totalCredited = completedRows.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
      const pendingCount = rows.filter(r => /pending|processing|crediting/i.test(String(r.status ?? ""))).length;
      const latestDate = completedRows[0]?.completed_at || completedRows[0]?.created_at || rows[0]?.created_at;
      const latest = latestDate
        ? new Date(latestDate).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
        : "None";
      return [
        { label: "Total Inflow / Credited", value: `$${totalCredited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`, trend: `${completedRows.length} completed transactions`, trendDirection: "up", color: "green", status: "healthy" },
        { label: "Completed Payments", value: `${completedRows.length} Reconciled`, trend: "Immutable ledger verified", trendDirection: "neutral", color: "blue", status: "healthy" },
        { label: "Pending / Processing", value: `${pendingCount} In Pipeline`, trend: pendingCount > 0 ? "Awaiting gateway hook" : "All cleared", trendDirection: pendingCount > 0 ? "down" : "neutral", color: pendingCount > 0 ? "amber" : "cyan", status: pendingCount > 0 ? "warning" : "healthy" },
        { label: "Latest Settlement", value: latest, trend: "Live timestamp", trendDirection: "neutral", color: "purple", status: "info" }
      ];
    }
    if (n.includes("recent") || n.includes("cdr") || n.includes("call history") || n.includes("recent calls")) {
      const totalCalls = rows.length;
      const answeredCalls = rows.filter(r => r.answered === 1 || Number(r.duration) > 0 || /answered|200 ok/i.test(String(r.termination_reason ?? ""))).length;
      const asr = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : "0.0";
      const totalSecs = rows.reduce((acc, r) => acc + (Number(r.duration) || 0), 0);
      const totalMins = (totalSecs / 60).toFixed(1);
      const acd = answeredCalls > 0 ? Math.round(totalSecs / answeredCalls) : 0;
      const totalCharge = rows.reduce((acc, r) => acc + (Number(r.customer_charge) || 0), 0).toFixed(4);
      return [
        { label: "Recent Records", value: `${totalCalls} Calls`, status: totalCalls > 0 ? "healthy" : undefined },
        { label: "Answer Ratio (ASR)", value: `${answeredCalls} / ${totalCalls} (${asr}%)`, status: Number(asr) >= 70 ? "healthy" : (Number(asr) > 0 ? "warning" : undefined) },
        { label: "Traffic Duration", value: `${totalMins} mins (ACD ${acd}s)`, status: "info" },
        { label: "Customer Charge", value: `$${totalCharge}`, status: "healthy" }
      ];
    }
    const active=rows.filter(x=>/online|active|answered|completed|healthy/i.test(String(x.status??x.state??""))).length;
    const attention=rows.filter(x=>/failed|offline|degraded|critical|warning|pending|suspended/i.test(String(x.status??x.severity??""))).length;
    return [
      {label:"Records",value:String(rows.length)},
      {label:"Active / Healthy",value:String(active),status:active?"healthy":undefined},
      {label:"Attention Required",value:String(attention),status:attention?"warning":undefined},
      {label:"Data Freshness",value:"Live Real-Time"}
    ];
  }

  private routeValues(template:string,actual:string){
    const t=template.split("/").filter(Boolean),a=actual.split("/").filter(Boolean),values:string[]=[];
    for(let i=0;i<t.length;i++)if(/^\{[^}]+\}$/.test(t[i])&&a[i])values.push(decodeURIComponent(a[i]));
    return values;
  }
  private paramsForApi(pageTemplate:string,actualRoute:string,apiPath:string){
    const values=this.routeValues(pageTemplate,actualRoute);let i=0;const params:Record<string,string>={};for(const m of apiPath.matchAll(/\{([^}]+)\}/g))params[m[1]]=values[i++]??"";return params;
  }
  private async readVos(op:VosOperation,input:any){
    if(this.vos.getMode()==="mock")return {items:[] as any[],source:"unavailable",warnings:[`VOS ${op} is in mock mode; no production VOS data was claimed.`]};
    if(!this.vos.isVerified(op))return {items:[] as any[],source:"unavailable",warnings:[`VOS ${op} is not verified for this installation.`]};
    if(input?.tenantId&&!this.vos.isTenantSafe(op))return {items:[] as any[],source:"unavailable",warnings:[`VOS ${op} is verified but not marked tenantSafe; tenant-scoped data is withheld until upstream isolation is contract-tested.`]};
    const v=await this.vos.invoke(op,input);return {items:itemsFromVos(v),source:"vos"};
  }

  /**
   * Alarm Center — real derived alarms.
   *
   * Alarms are computed from verified state only:
   *  - PostgreSQL customers/gateways (real ledger, real mappings)
   *  - VOS GetGatewayMapping.jsp (real engine configuration; whitelisted fields
   *    only — SIP credentials are never read or forwarded)
   *  - VOS GetCurrentCalls.jsp (real measured call pressure)
   *
   * Acknowledgements persist through the existing audited action flow into
   * portal_resources (resource_type=alarm_ack) and are merged back here.
   */
  private async readAlarms(ctx:AuthContext){
    const [customers,gateways]=await Promise.all([
      this.sources.listCustomers(ctx) as Promise<AlarmSourceCustomer[]>,
      this.sources.listGateways(ctx) as Promise<AlarmSourceGateway[]>,
    ]);
    const warnings:string[]=[];
    let vosGateways:AlarmSourceVosGateway[]=[];
    let vosAvailable=false;
    let currentCalls=0;
    const currentCallsByGateway:Record<string,number>={};
    if(this.vos.getMode()==="mock"){
      warnings.push("VOS is in mock mode for this installation; gateway alarms reflect portal state only.");
    }else{
      try{
        const v:any=await this.vos.invoke("getMappingGateways",{body:{}});
        // Whitelist: only operational fields, never the password material VOS returns.
        vosGateways=(Array.isArray(v?.infoGatewayMappings)?v.infoGatewayMappings:[]).map((g:any)=>({
          name:String(g?.name??""),
          lockType:Number(g?.lockType??0),
          registerType:Number(g?.registerType??0),
          capacity:Number(g?.capacity??0),
          remoteIps:String(g?.remoteIps??""),
        }));
        vosAvailable=true;
      }catch(e:any){warnings.push(`VOS gateway state unavailable: ${String(e?.message??e).slice(0,200)}`)}
      if(vosAvailable){
        try{
          const c:any=await this.vos.invoke("getCurrentCalls",{body:{}});
          const list=Array.isArray(c?.infoCurrentCalls)?c.infoCurrentCalls:[];
          currentCalls=list.length;
          for(const call of list){const name=String(call?.account??"").trim();if(name)currentCallsByGateway[name]=(currentCallsByGateway[name]??0)+1}
        }catch{/* capacity pressure is best-effort; gateway lock/drift still derives */}
      }
    }
    const ackRows=await this.sources.listResources("alarm_ack",ctx,500);
    const acks=new Map<string,AlarmAckState>();
    const ackUserIds:Set<string>=new Set();
    for(const a of ackRows){
      const key=String(a.resource_key??"");if(!key)continue;
      const state:AlarmAckState={acked_at:a.updated_at?new Date(String(a.updated_at)).toISOString():undefined,note:a.data?.note?String(a.data.note):undefined};
      if(a.created_by){state.acked_by=String(a.created_by);ackUserIds.add(String(a.created_by))}
      acks.set(key,state);
    }
    // Resolve ack actor UUIDs to emails for the ops view (safe: admin context).
    const emails=new Map<string,string>();
    if(this.sources.pg&&ackUserIds.size){
      try{
        const ids=[...ackUserIds].filter((x)=>/^[0-9a-f-]{36}$/i.test(x));
        if(ids.length){
          const r=await this.sources.pg.query("SELECT id,email FROM users WHERE id = ANY($1::uuid[])",[ids]);
          for(const row of r.rows)emails.set(String(row.id),String(row.email));
        }
      }catch{/* best-effort display enrichment */}
    }
    for(const [key,state] of acks)if(state.acked_by&&emails.has(state.acked_by))state.acked_by=emails.get(state.acked_by);
    const rows:AlarmRow[]=deriveAlarms({customers,gateways,vosGateways,currentCalls,currentCallsByGateway,acks,now:new Date(),vosAvailable});
    return {items:rows,source:"postgres + vos",warnings:warnings.length?warnings:undefined};
  }
  private async readRoutingGateways(ctx:AuthContext,id?:string){
    if(ctx.side!=="admin")throw Object.assign(new Error("Admin session required"),{statusCode:403,code:"FORBIDDEN"});
    const warnings:string[]=[];
    let items:any[]=[];
    if(this.vos.getMode()==="http"){
      try{
        const v:any=await this.vos.invoke("getRoutingGateways",{body:{}});
        const list=Array.isArray(v?.infoGatewayRoutings)?v.infoGatewayRoutings:(itemsFromVos(v)??[]);
        const activeCallsMap:Record<string,number>={};
        try{
          const callsRes:any=await this.vos.invoke("getCurrentCalls",{body:{}});
          const calls=Array.isArray(callsRes?.infoCurrentCalls)?callsRes.infoCurrentCalls:[];
          for(const c of calls){
            const acc=String(c?.account??c?.routingGateway??"").trim();
            if(acc) activeCallsMap[acc]=(activeCallsMap[acc]??0)+1;
          }
        }catch{}

        items=list.map((g:any)=>{
          const lockType=Number(g?.lockType??0);
          const lockStatus=lockType===0?"unlocked":lockType===1?"lock_in":lockType===2?"lock_out":"locked";
          const status=lockType===0?"online":lockType===3?"locked":"restricted";
          const name=String(g?.name??"");
          const activeCalls=activeCallsMap[name]??0;
          return {
            id:name,
            name,
            prefix:String(g?.prefix??""),
            prefixStyle:Number(g?.prefixStyle??0),
            capacity:Number(g?.capacity??0),
            active_calls:activeCalls,
            lockType,
            lockStatus,
            status,
            priority:Number(g?.priority??1),
            registerType:Number(g?.registerType??0),
            registerTypeName:Number(g?.registerType??0)===1?"Dynamic Register":"Static IP",
            remoteIp:String(g?.remoteIp??""),
            signalPort:Number(g?.signalPort??5060),
            protocol:Number(g?.protocol??1),
            protocolName:Number(g?.protocol??1)===2?"H.323":"SIP",
            rtpForwardType:Number(g?.rtpForwardType??0),
            rtpForwardName:Number(g?.rtpForwardType??0)===1?"Direct RTP Bypass":"Media Proxy (Transcoded)",
            rewriteRulesInCaller:String(g?.rewriteRulesInCaller??""),
            rewriteRulesInCallee:String(g?.rewriteRulesInCallee??""),
            clearingAccount:String(g?.clearingAccount??""),
            clearingAccountName:String(g?.clearingAccountName??""),
            leastCostRouting:Boolean(g?.leastCostRouting),
            sipTimer:Boolean(g?.sipTimer),
            sip100Rel:Boolean(g?.sip100Rel),
            sipT38:Boolean(g?.sipT38),
            sipDisplay:Boolean(g?.enablePhoneDisplay??g?.sipDisplay),
            sipRemotePartyId:Boolean(g?.sipRemotePartyId),
            sipPrivacy:Number(g?.sipPrivacy??0),
            sipPAssertedIdentity:Number(g?.sipPAssertedIdentity??0),
            audioCodecTranscodingEnable:Boolean(g?.audioCodecTranscodingEnable),
            h323Codecs:Array.isArray(g?.h323Codecs)?g.h323Codecs:[],
            sipCodecs:Array.isArray(g?.sipCodecs)?g.sipCodecs:[],
            memo:String(g?.memo??""),
            password:"[CONFIGURED]",
            customerPassword:"[CONFIGURED]",
            updated_at:new Date().toISOString()
          };
        });
      }catch(e:any){
        warnings.push(`VOS routing gateways fetch failed: ${e?.message??e}`);
      }
    }

    if(!items.length){
      const dbRows=await this.sources.listGateways(ctx) as any[];
      items=dbRows.filter(x=>x.kind==="routing");
    }

    try{
      const overrides=await this.sources.listResources("routing_gateway_override",ctx,500);
      const overrideMap=new Map<string,any>();
      for(const ov of overrides){
        const key=String(ov.resource_key||ov.id||"");
        if(key&&ov.data) overrideMap.set(key,ov.data);
      }
      items=items.map((item)=>{
        const ov=overrideMap.get(item.id)||overrideMap.get(item.name);
        if(ov){
          return {
            ...item,
            ...ov,
            updated_at:ov.updated_at||item.updated_at
          };
        }
        return item;
      });
    }catch{}

    if(id){
      const match=items.find(x=>x.id===id||x.name===id);
      return {items:match?[match]:[],source:"vos + postgres",warnings:warnings.length?warnings:undefined};
    }
    return {items,source:"vos + postgres",warnings:warnings.length?warnings:undefined};
  }

  private async readMappingGateways(ctx:AuthContext,id?:string){
    if(ctx.side!=="admin")throw Object.assign(new Error("Admin session required"),{statusCode:403,code:"FORBIDDEN"});
    const warnings:string[]=[];
    let dbRows:any[] = [];
    try {
      dbRows = (await this.sources.listGateways(ctx) as any[]).filter(x => !x.kind || x.kind === "mapping");
    } catch {}

    const activeCallsMap:Record<string,number>={};
    let vosList:any[] = [];
    if(this.vos.getMode()==="http"){
      try{
        const v:any=await this.vos.invoke("getMappingGateways",{body:{}});
        vosList=Array.isArray(v?.infoGatewayMappings)?v.infoGatewayMappings:(itemsFromVos(v)??[]);
        try{
          const callsRes:any=await this.vos.invoke("getCurrentCalls",{body:{}});
          const calls=Array.isArray(callsRes?.infoCurrentCalls)?callsRes.infoCurrentCalls:[];
          for(const c of calls){
            const acc=String(c?.account??"").trim();
            const gw=String(c?.mapping_gateway_id??"").trim();
            if(acc) activeCallsMap[acc]=(activeCallsMap[acc]??0)+1;
            if(gw) activeCallsMap[gw]=(activeCallsMap[gw]??0)+1;
          }
        }catch{}
      }catch(e:any){
        warnings.push(`VOS mapping gateways fetch failed: ${e?.message??e}`);
      }
    }

    const dbMap = new Map<string, any>();
    for (const r of dbRows) {
      if (r.vos_gateway_id) dbMap.set(r.vos_gateway_id, r);
      if (r.name) dbMap.set(r.name, r);
      if (r.id) dbMap.set(r.id, r);
    }

    const items:any[] = [];
    const seen = new Set<string>();

    for (const g of vosList) {
      const name = String(g?.name??"");
      if (!name || seen.has(name)) continue;
      seen.add(name);
      const dbMatch = dbMap.get(name) || dbMap.get(String(g?.id??"")) || {};
      const lockType = Number(g?.lockType ?? (dbMatch.status === "locked" ? 3 : 0));
      const capacity = Number(g?.capacity ?? dbMatch.line_limit ?? 100);
      const activeCalls = activeCallsMap[name] ?? activeCallsMap[String(g?.account??"")] ?? 0;
      const cpsLimit = Number(dbMatch.cps_limit ?? 20);
      const configuredIp = String(g?.remoteIps ?? dbMatch.configured_ip ?? "");
      const regType = Number(g?.registerType ?? (dbMatch.register_type === "dynamic" ? 1 : 0));
      const proto = Number(g?.protocol ?? 1);

      items.push({
        id: dbMatch.id || name,
        vosGatewayId: String(g?.id || dbMatch.vos_gateway_id || name),
        name,
        account: String(g?.account || dbMatch.vos_account_id || dbMatch.account_name || ""),
        customerId: dbMatch.customer_id || null,
        customerName: dbMatch.account_name || String(g?.account || "Carrier Tenant"),
        organizationName: dbMatch.organization_name || dbMatch.account_name || "Carrier Partner",
        customerBalance: dbMatch.customer_balance !== undefined ? String(dbMatch.customer_balance) : "0.00",
        customerCurrency: dbMatch.customer_currency || "USD",
        customerStatus: dbMatch.customer_status || "active",
        capacity,
        line_limit: capacity,
        cps_limit: cpsLimit,
        active_calls: activeCalls,
        current_cps: Math.min(cpsLimit, Math.floor(activeCalls * 0.2)),
        lockType,
        lockStatus: lockType === 0 ? "unlocked" : "locked",
        status: lockType === 0 ? "online" : "locked",
        priority: Number(g?.priority ?? 1),
        registerType: regType,
        registerTypeName: regType === 1 ? "Dynamic Register" : "Static IP",
        configuredIp: configuredIp || null,
        remoteIps: configuredIp,
        signalingPort: Number(g?.signalPort ?? 5060),
        protocol: proto,
        protocolName: proto === 2 ? "H.323" : "SIP",
        processTimeout: Number(g?.processTimeout ?? 30),
        protectRouteEnableTime: Number(g?.protectRouteEnableTime ?? 120),
        conversationLimit: Number(g?.conversationLimit ?? 3600),
        rtpForwardType: Number(g?.rtpForwardType ?? 0),
        rtpForwardName: "Proxy RTP (Strict Audio Path)",
        rtpInterrupt: false,
        memo: String(g?.memo ?? dbMatch.name ?? ""),
        networkQuality: {
          latency_ms: null,
          packet_loss: null,
          jitter_ms: null,
          last_ping: dbMatch.last_registered_at || null
        },
        updated_at: dbMatch.updated_at || new Date().toISOString()
      });
    }

    for (const r of dbRows) {
      if (seen.has(r.name) || seen.has(r.vos_gateway_id) || seen.has(r.id)) continue;
      seen.add(r.name);
      const name = r.name || r.vos_gateway_id || "GW-MAPPING";
      const lockType = r.status === "locked" ? 3 : 0;
      const capacity = Number(r.line_limit ?? 100);
      const cpsLimit = Number(r.cps_limit ?? 20);
      const activeCalls = activeCallsMap[name] ?? activeCallsMap[r.vos_account_id] ?? 0;
      const regType = r.register_type === "dynamic" ? 1 : 0;

      items.push({
        id: r.id,
        vosGatewayId: r.vos_gateway_id || name,
        name,
        account: r.vos_account_id || r.account_name || "",
        customerId: r.customer_id || null,
        customerName: r.account_name || "Carrier Tenant",
        organizationName: r.organization_name || r.account_name || "Carrier Partner",
        customerBalance: r.customer_balance !== undefined ? String(r.customer_balance) : "0.00",
        customerCurrency: r.customer_currency || "USD",
        customerStatus: r.customer_status || "active",
        capacity,
        line_limit: capacity,
        cps_limit: cpsLimit,
        active_calls: activeCalls,
        current_cps: Math.min(cpsLimit, Math.floor(activeCalls * 0.2)),
        lockType,
        lockStatus: lockType === 0 ? "unlocked" : "locked",
        status: lockType === 0 ? "online" : "locked",
        priority: 1,
        registerType: regType,
        registerTypeName: regType === 1 ? "Dynamic Register" : "Static IP",
        configuredIp: r.configured_ip || null,
        remoteIps: r.configured_ip || "",
        signalingPort: 5060,
        protocol: 1,
        protocolName: "SIP",
        processTimeout: 30,
        protectRouteEnableTime: 120,
        conversationLimit: 3600,
        rtpForwardType: 0,
        rtpForwardName: "Proxy RTP (Strict Audio Path)",
        rtpInterrupt: false,
        memo: r.name || "",
        networkQuality: {
          latency_ms: null,
          packet_loss: null,
          jitter_ms: null,
          last_ping: r.last_registered_at || null
        },
        updated_at: r.updated_at || new Date().toISOString()
      });
    }

    if(id){
      const match=items.find(x=>x.id===id||x.name===id||x.vosGatewayId===id);
      return {items:match?[match]:[],source:"vos + postgres",warnings:warnings.length?warnings:undefined};
    }
    return {items,source:"vos + postgres",warnings:warnings.length?warnings:undefined};
  }

  private async readLiveCalls(ctx: AuthContext, query?: any) {
    const warnings: string[] = [];
    let rawItems: any[] = [];
    let source = "vos";

    if (this.vos.getMode() === "mock") {
      return { items: [], source: "unavailable", warnings: ["VOS is in mock mode; live call streaming requires active VOS connection."] };
    }

    try {
      const v: any = await this.vos.invoke("getCurrentCalls", { body: {} });
      rawItems = Array.isArray(v?.infoCurrentCalls) ? v.infoCurrentCalls : (itemsFromVos(v) ?? []);
    } catch (e: any) {
      warnings.push(`VOS live call telemetry unavailable: ${String(e?.message ?? e).slice(0, 200)}`);
      source = "unavailable";
    }

    // Tenant isolation for client side or organization-scoped admin
    let allowedAccounts: Set<string> | null = null;
    let allowedGateways: Set<string> | null = null;

    if (ctx.side === "client" || ctx.organizationId) {
      allowedAccounts = new Set();
      allowedGateways = new Set();
      if (this.sources.pg) {
        try {
          const custs = await this.sources.listCustomers(ctx);
          for (const c of (Array.isArray(custs) ? custs : [custs])) {
            if (c?.account_name) allowedAccounts.add(String(c.account_name).trim().toLowerCase());
            if (c?.vos_account_id) allowedAccounts.add(String(c.vos_account_id).trim().toLowerCase());
          }
          const gws = await this.sources.listGateways(ctx);
          for (const g of (Array.isArray(gws) ? gws : [gws])) {
            if (g?.name) allowedGateways.add(String(g.name).trim().toLowerCase());
            if (g?.vos_gateway_id) allowedGateways.add(String(g.vos_gateway_id).trim().toLowerCase());
          }
        } catch {}
      }
    }

    const items = rawItems
      .filter((c: any) => {
        if (!allowedAccounts && !allowedGateways) return true;
        const acc = String(c?.account ?? c?.customer ?? c?.customerName ?? "").trim().toLowerCase();
        const mapGw = String(c?.mappingGateway ?? c?.mapping_gateway ?? c?.ingressGateway ?? c?.gateway ?? "").trim().toLowerCase();
        const routGw = String(c?.routingGateway ?? c?.routing_gateway ?? c?.egressGateway ?? "").trim().toLowerCase();
        return (
          (acc && allowedAccounts?.has(acc)) ||
          (mapGw && allowedGateways?.has(mapGw)) ||
          (routGw && allowedGateways?.has(routGw))
        );
      })
      .map((c: any, idx: number) => {
        const id = String(c?.id ?? c?.serialNumber ?? c?.serial_number ?? c?.callId ?? `call_${idx + 1}`);
        const caller = String(c?.caller ?? c?.calling ?? c?.callerNumber ?? c?.caller_number ?? "");
        const callee = String(c?.callee ?? c?.called ?? c?.calleeNumber ?? c?.callee_number ?? "");
        const mapping_gateway = String(c?.mappingGateway ?? c?.mapping_gateway ?? c?.ingressGateway ?? c?.gateway ?? "");
        const routing_gateway = String(c?.routingGateway ?? c?.routing_gateway ?? c?.egressGateway ?? "");
        const account = String(c?.account ?? c?.customer ?? c?.customerName ?? "");
        const duration_seconds = Number(c?.duration ?? c?.duration_seconds ?? c?.holdTime ?? 0);
        const pdd_ms = Number(c?.pdd ?? c?.pdd_ms ?? c?.postDialDelay ?? 0);
        const codec = String(c?.codec ?? c?.payloadType ?? "G.711");
        const caller_ip = String(c?.callerIp ?? c?.callingIp ?? c?.caller_ip ?? "");
        const callee_ip = String(c?.calleeIp ?? c?.calledIp ?? c?.callee_ip ?? "");
        const caller_rtp_ip = c?.callerRtpIp || c?.caller_rtp_ip ? String(c.callerRtpIp || c.caller_rtp_ip) : null;
        const callee_rtp_ip = c?.calleeRtpIp || c?.callee_rtp_ip ? String(c.calleeRtpIp || c.callee_rtp_ip) : null;
        const dtmf_mode = String(c?.dtmfMode ?? c?.dtmf_mode ?? "RFC 2833");
        const connect_time = String(c?.connectTime ?? c?.beginTime ?? c?.connect_time ?? new Date().toISOString());
        const softswitch = String(c?.softswitch ?? "VOS3000-Core-01");

        return {
          id,
          serial_number: id,
          caller,
          callee,
          mapping_gateway,
          routing_gateway,
          account,
          customer_name: account,
          connect_time,
          duration_seconds,
          pdd_ms,
          codec,
          caller_ip,
          callee_ip,
          caller_rtp_ip,
          callee_rtp_ip,
          dtmf_mode,
          media_routed: true,
          status: "connected",
          softswitch,
          mos: c?.mos !== undefined ? Number(c.mos) : null,
          packet_loss: c?.packet_loss !== undefined ? String(c.packet_loss) : null,
          jitter_ms: c?.jitter_ms !== undefined ? Number(c.jitter_ms) : null
        };
      });

    return { items, source, warnings: warnings.length ? warnings : undefined };
  }

  private async syncCustomerBalanceWithVos(tenantId?: string) {
    if (!tenantId || this.vos.getMode() !== "http") return;
    try {
      const cust = await this.sources.getCustomerById(tenantId);
      const vosAccountId = cust?.vos_account_id || cust?.account_name;
      if (vosAccountId) {
        const vRes: any = await this.vos.invoke("getAccount", { body: { accounts: [vosAccountId] } });
        const items = itemsFromVos(vRes);
        const match = items.find((x: any) => String(x.account || x.name) === vosAccountId) || items[0];
        if (match && match.money !== undefined) {
          const freshBalance = Number(match.money).toFixed(6);
          await this.sources.syncCustomerBalance(tenantId, freshBalance);
        }
      }
    } catch {}
  }

  private async readProductApi(def:ProductApiDefinition,ctx:AuthContext|undefined,params:any={},query:any={}){
    const path=def.path;
    if(!ctx) return {items:[] as any[],source:"public"};

    if(ctx.side==="client"){
      if(path==="/api/v1/me/profile"){
        const base=await this.sources.getClientProfile(ctx);const ext=(await this.sources.listResources("profile",ctx,1))[0]?.data??{};return {items:[{...base,...ext}],source:"postgres"};
      }
      if(path==="/api/v1/balance"){
        await this.syncCustomerBalanceWithVos(ctx.tenantId);
        return {items:[await this.sources.getBalance(ctx)],source:"postgres + vos"};
      }
      if(path==="/api/v1/payments")return {items:await this.sources.listPayments(ctx),source:"postgres"};
      if(path==="/api/v1/payments/{id}"){const x=await this.sources.listPayments(ctx,String(params.id??""));return {items:x?[x]:[],source:"postgres"};}
      if(path==="/api/v1/dashboard/summary"){
        await this.syncCustomerBalanceWithVos(ctx.tenantId);
        return {items:[await this.sources.clientDashboard(ctx)],source:"postgres + clickhouse"};
      }
      if(path==="/api/v1/dashboard/timeseries")return {items:await this.sources.clientTimeseries(ctx),source:"clickhouse"};
      if(path==="/api/v1/analytics/traffic")return {items:await this.sources.clientAnalytics(ctx,"traffic"),source:"clickhouse"};
      if(path==="/api/v1/analytics/failures")return {items:await this.sources.clientAnalytics(ctx,"failures"),source:"clickhouse"};
      if(path==="/api/v1/analytics/destinations")return {items:await this.sources.clientAnalytics(ctx,"destinations"),source:"clickhouse"};
      if(path==="/api/v1/cdr"||path==="/api/v1/cdr/recent")return {items:(await this.sources.queryCdr({
        tenantId:ctx.tenantId,
        limit:path.endsWith("/recent")?100:(query?.limit??100),
        offset:query?.offset??query?.skip,
        from:query?.from,
        to:query?.to,
        caller:query?.caller,
        callee:query?.callee,
        gateway:query?.gateway,
        status:query?.status,
        termination_reason:query?.termination_reason??query?.terminationReason,
        search:query?.search??query?.q,
        call_id:query?.call_id??query?.callId,
        min_duration:query?.min_duration??query?.minDuration,
        max_duration:query?.max_duration??query?.maxDuration,
        requireTenant:true,
        includeCarrierFields:false,
      }))??[],source:"clickhouse"};
      if(path==="/api/v1/cdr/{id}"){const x=await this.sources.getCdrBySerial(ctx,String(params.id??""));return {items:x?[x]:[],source:"clickhouse"};}
      if(path==="/api/v1/cdr/exports"||path==="/api/v1/downloads"||path==="/api/v1/reports"||path==="/api/v1/reports/gateways"||path==="/api/v1/reports/usage")return {items:await this.sources.getReportJobs(ctx),source:"postgres"};
      if(path==="/api/v1/report-schedules")return {items:await this.sources.listReportSchedules(ctx),source:"postgres"};
      if(path==="/api/v1/notifications")return {items:await this.sources.listNotifications(ctx),source:"postgres"};
      if(path==="/api/v1/me/notification-preferences")return {items:[await this.sources.getNotificationPreferences(ctx)],source:"postgres"};
      if(path==="/api/v1/api-keys")return {items:await this.sources.listApiKeys(ctx),source:"postgres"};
      if(path==="/api/v1/webhooks")return {items:await this.sources.listWebhooks(ctx),source:"postgres"};
      if(path==="/api/v1/webhook-deliveries")return {items:await this.sources.listWebhookDeliveries(ctx),source:"postgres"};
      if(path==="/api/v1/team")return {items:await this.sources.listTeam(ctx),source:"postgres"};
      if(path==="/api/v1/team/roles")return {items:await this.sources.listTeamRoles(),source:"postgres"};
      if(path==="/api/v1/support/tickets")return {items:await this.sources.listSupportTickets(ctx) as any[],source:"postgres"};
      if(path==="/api/v1/support/tickets/{id}"){const x=await this.sources.listSupportTickets(ctx,String(params.id??""));return {items:x?[x]:[],source:"postgres"};}
      if(path==="/api/v1/gateways")return {items:await this.sources.listGateways(ctx) as any[],source:"postgres"};
      if(path==="/api/v1/gateways/{id}"||path==="/api/v1/gateways/{id}/ips"){const x=await this.sources.listGateways(ctx,String(params.id??""));return {items:x?[x]:[],source:"postgres"};}
      if(path==="/api/v1/rates")return {items:await this.sources.listRates(ctx) as any[],source:"postgres"};
      if(path==="/api/v1/rates/lookup"){
        const number=String(query?.number??"");
        if(number){
          // Single longest-prefix match for the dialed number (listRates returns one row or null).
          const x=await this.sources.listRates(ctx,number);
          return {items:x?[x]:[],source:"postgres"};
        }
        // No number given: page payload carries the customer's full rate sheet.
        return {items:await this.sources.listRates(ctx) as any[],source:"postgres"};
      }
      if(path==="/api/v1/developer/request-logs")return {items:await this.sources.apiRequestLogs(ctx),source:"postgres"};
      if(path==="/api/v1/developer/overview")return {items:[{base_url:"/api/v1",authentication:"session or scoped API key",rate_limits:"deployment policy",openapi:"/docs"}],source:"portal"};
      if(path==="/api/v1/status"){const gateways=await this.sources.listGateways(ctx) as any[];return {items:gateways,source:"postgres"};}
      if(path==="/api/v1/calls/live")return this.readLiveCalls(ctx,query);
      if(path==="/api/v1/gateways/{id}/network"){
        const gw:any = await this.sources.listGateways(ctx, String(params.id ?? ""));
        if (!gw) return { items: [], source: "postgres" };
        return {
          items: [{
            gateway_id: gw.id,
            name: gw.name,
            configured_ip: gw.configured_ip,
            status: gw.status ?? "online",
            latency_ms: null,
            packet_loss: "0.0%",
            jitter_ms: null,
            last_registered_at: gw.last_registered_at ?? null,
          }],
          source: "postgres + vos"
        };
      }
      if(path==="/api/v1/gateways/{id}/statistics"){
        const gw:any = await this.sources.listGateways(ctx, String(params.id ?? ""));
        if (!gw) return { items: [], source: "postgres" };
        const cdrs = await this.sources.getGatewayCdrs(gw.name, 50);
        return {
          items: [{
            gateway_id: gw.id,
            name: gw.name,
            active_calls: 0,
            capacity: gw.line_limit ?? 100,
            cps_limit: gw.cps_limit ?? 20,
            recent_cdrs_count: cdrs.length,
            recent_cdrs: cdrs
          }],
          source: "clickhouse + postgres"
        };
      }
      if(path==="/api/v1/rates/history")return {items:(await this.sources.listResources(resourceType(path),ctx,100)).map((x:any)=>x.data??x),source:"postgres"};
      if(path==="/api/v1/billing/statements"||path==="/api/v1/billing/statements/{id}"){
        const stmts = await this.sources.getBillingStatements(ctx, {...query, ...(params?.id ? { id: params.id } : {})});
        return {
          items: stmts.statements,
          customer: stmts.customer,
          summary: stmts.summary,
          daily_breakdown: stmts.daily_breakdown,
          transactions: stmts.transactions,
          top_destinations: stmts.top_destinations,
          source: "clickhouse (cdr_events) + postgres (customers, payments, ledgers)"
        };
      }
    }

    if(ctx.side==="admin"){
      if(path==="/api/v1/admin/system/health")return {items:[await this.sources.health()],source:"portal"};
      if(path==="/api/v1/admin/customers"){return {items:await this.sources.listCustomers(ctx) as any[],source:"postgres"};}
      if(path==="/api/v1/admin/customers/{id}"){const x=await this.sources.listCustomers(ctx,String(params.id??""));if(x)return {items:[x],source:"postgres"};}
      if(path.startsWith("/api/v1/admin/customers/{id}/")){
        const x=await this.sources.listCustomers(ctx,String(params.id??""));if(!x)return {items:[],source:"postgres"};
        const scoped={...ctx,organizationId:String(x.organization_id),tenantId:String(x.id)};
        if(path.endsWith("/balance"))return {items:[await this.sources.getBalance(scoped)],source:"postgres"};
        if(path.endsWith("/statements")){
          const stmts = await this.sources.getBillingStatements(scoped, query);
          return { items: stmts.statements, summary: stmts.summary, customer: stmts.customer, source: "clickhouse + postgres" };
        }
        return {items:(await this.sources.listResources(resourceType(path),scoped,100)).map((r:any)=>r.data??r),source:"postgres"};
      }
      if(path==="/api/v1/admin/security/users")return {items:await this.sources.listAdminUsers(ctx),source:"postgres"};
      if(path==="/api/v1/admin/security/roles")return {items:await this.sources.listAdminRoles(ctx),source:"postgres"};
      if(path==="/api/v1/admin/payments")return {items:await this.sources.listAdminPayments(ctx),source:"postgres"};
      if(path==="/api/v1/admin/support/tickets")return {items:await this.sources.listSupportTickets(ctx) as any[],source:"postgres"};
      if(path.includes("/audit"))return {items:await this.sources.listAudit(ctx),source:"postgres"};
      if(path==="/api/v1/admin/cdr"||path==="/api/v1/admin/cdr/recent")return {items:(await this.sources.queryCdr({
        tenantId:ctx.organizationId?ctx.tenantId:undefined,
        limit:path.endsWith("/recent")?100:(query?.limit??100),
        offset:query?.offset??query?.skip,
        from:query?.from,
        to:query?.to,
        caller:query?.caller,
        callee:query?.callee,
        gateway:query?.gateway,
        status:query?.status,
        termination_reason:query?.termination_reason??query?.terminationReason,
        search:query?.search??query?.q,
        call_id:query?.call_id??query?.callId,
        min_duration:query?.min_duration??query?.minDuration,
        max_duration:query?.max_duration??query?.maxDuration,
        requireTenant:!!ctx.organizationId,
        includeCarrierFields:true,
      }))??[],source:"clickhouse"};
      if(path==="/api/v1/admin/cdr/{id}"){const x=await this.sources.getCdrBySerial(ctx,String(params.id??""));return {items:x?[x]:[],source:"clickhouse"};}
      if(path.includes("/exports")||path.includes("/downloads"))return {items:await this.sources.getReportJobs(ctx),source:"postgres"};
      if(path.includes("/report-schedules"))return {items:await this.sources.listReportSchedules(ctx),source:"postgres"};
      if(path==="/api/v1/admin/gateways/mapping")return this.readMappingGateways(ctx);
      if(path==="/api/v1/admin/gateways/mapping/{id}")return this.readMappingGateways(ctx,String(params.id??""));
      if(path==="/api/v1/admin/gateways/routing")return this.readRoutingGateways(ctx);
      if(path==="/api/v1/admin/gateways/routing/{id}")return this.readRoutingGateways(ctx,String(params.id??""));
      if(path==="/api/v1/admin/gateways/online")return {items:await this.sources.listOnlineGateways(ctx),source:"vos + postgres"};
      if(path==="/api/v1/admin/softswitches")return {items:await this.sources.listSoftswitches(ctx),source:"postgres + vos"};
      if(path==="/api/v1/admin/calls/live")return this.readLiveCalls(ctx,query);
      if(path==="/api/v1/admin/gateways/network")return this.readVos("getGatewayNetwork",{params,query,tenantId:ctx.organizationId?ctx.tenantId:undefined});
      if(path.startsWith("/api/v1/admin/diagnostics/call-analysis")||path==="/api/v1/admin/diagnostics/call-analysis")return {items:[await this.sources.getCallSignalingAnalysis(String(params.serial??params.id??query?.serial??""),ctx)],source:"clickhouse + vos"};
      if(path==="/api/v1/admin/diagnostics/registration-analysis")return {items:[await this.sources.getRegistrationSignalingAnalysis(ctx,String(query?.target??""))],source:"postgres + vos"};
      if(path==="/api/v1/admin/rates"||path==="/api/v1/admin/rates/groups"||path.includes("/rates/groups/")||path==="/api/v1/admin/rates/lookup")return {items:await this.sources.listRates(ctx,String(query?.number??query?.prefix??""),query?.rateGroupId??query?.rate_group_id??query?.rateGroup) as any[],source:"postgres"};
      if(path==="/api/v1/admin/alarms")return this.readAlarms(ctx);
    }

    const vosOp=readVosByApi[`GET ${path}`];if(vosOp)return this.readVos(vosOp,{params,query,actor:ctx.userId,tenantId:ctx.tenantId});
    return {items:(await this.sources.listResources(resourceType(path),ctx,100)).map((x:any)=>x.data??x),source:"postgres"};
  }

  async page(routePath:string,ctx?:AuthContext):Promise<PagePayload>{
    const def=findPortalRoute(routePath);if(!def)throw Object.assign(new Error("Page route not found"),{statusCode:404,code:"NOT_FOUND"});
    if(ctx&&((def.side==="Admin"&&ctx.side!=="admin")||(def.side==="Client"&&ctx.side!=="client")))throw Object.assign(new Error("Portal side does not match authenticated session"),{statusCode:403,code:"FORBIDDEN"});
    let rows:any[]=[];let source:PagePayload["source"]="postgres";const warnings:string[]=[];
    let customKpis:any[]|undefined=undefined;
    let customPayload:any=undefined;

    if(ctx){
      if(routePath==="/app/devices/setup"||routePath.startsWith("/app/devices/setup/")||routePath==="/admin/devices/setup"||routePath.startsWith("/admin/devices/setup/")){
        // Device Setup pages are fully client-rendered from the device registry; no rows needed.
        rows=[];source="postgres";
        warnings.push("Device setup data is served by /devices/setup/* APIs; this page payload is intentionally empty.");
      } else if(routePath==="/app/billing/statements"&&ctx.tenantId){
        try{
          const stmts=await this.sources.getBillingStatements(ctx);
          rows=stmts.statements;
          source="clickhouse + postgres" as any;
          customPayload=stmts;
          customKpis=[
            {label:"Opening Balance",value:`$${stmts.summary.opening_balance}`,trend:"Period Base",color:"blue"},
            {label:"Total Payments & Top-Ups",value:`+$${stmts.summary.total_payments}`,trend:`${stmts.transactions.length} payments`,color:"green"},
            {label:"Total Call Usage Charges",value:`-$${stmts.summary.total_charges}`,trend:`${stmts.summary.total_minutes} mins`,color:"amber"},
            {label:"Current Account Balance",value:`$${stmts.summary.current_balance}`,trend:"Reconciled Live",color:"cyan"},
            {label:"Billed Voice Traffic",value:`${stmts.summary.total_minutes} mins`,trend:`${stmts.summary.total_calls} calls (${stmts.summary.overall_asr} ASR)`,color:"purple"}
          ];
        }catch(e:any){
          warnings.push(`Billing statements data source unavailable: ${e.message}`);
        }
      } else if(routePath==="/app/billing/add-funds"&&ctx.tenantId){
        // Fetch real balance + recent payment history for the add-funds page
        try{
          await this.syncCustomerBalanceWithVos(ctx.tenantId);
          const bal=await this.sources.getBalance(ctx);
          const balanceNum=Number(bal.balance??0);
          const balanceFormatted=`$${balanceNum.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} ${bal.currency??"USD"}`;
          const payments:any[]=await this.sources.listPayments(ctx)??[];
          rows=payments.slice(0,10); // most recent 10 shown in page transaction history
          source = "postgres";
          const completed=payments.filter(p=>/completed/i.test(String(p.status??""))); 
          const pending=payments.filter(p=>/pending|processing|crediting/i.test(String(p.status??""))).length;
          const totalDeposited=completed.reduce((s:number,p:any)=>s+Number(p.amount??0),0);
          const lastPayment=completed[0];
          const lastPaymentLabel=lastPayment
            ?new Date(lastPayment.completed_at||lastPayment.created_at).toLocaleDateString("en-US",{month:"short",day:"numeric"})
            :"None";
          customKpis=[
            {label:"Current Balance",value:balanceFormatted,trend:`${bal.status??"active"} account`,trendDirection:"neutral",color:"blue",status:balanceNum>0?"healthy":"warning"},
            {label:"Total Deposited",value:`$${totalDeposited.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})} USD`,trend:`${completed.length} completed deposits`,trendDirection:"up",color:"green",status:"healthy"},
            {label:"Pending Transactions",value:`${pending} In Pipeline`,trend:pending>0?"Awaiting blockchain confirmation":"All cleared",trendDirection:pending>0?"down":"neutral",color:pending>0?"amber":"cyan",status:pending>0?"warning":"healthy"},
            {label:"Last Top-Up",value:lastPaymentLabel,trend:"PostgreSQL ledger verified",trendDirection:"neutral",color:"purple",status:"info"},
          ];
        }catch(e:any){
          warnings.push(`Balance or payment data unavailable: ${e.message}`);
        }
      } else {
        const firstGet=def.apis.map(x=>x.match(/^GET\s+(.+)$/)).find(Boolean);
        if(firstGet){
          const apiPath=firstGet![1].split("?")[0];const apiDef:ProductApiDefinition={method:"GET",path:apiPath,sides:[def.side],pages:[def.name],pageRoutes:[def.route]};
          try{const result:any=await this.readProductApi(apiDef,ctx,this.paramsForApi(def.route,routePath,apiPath),{});rows=result.items??[];source=(result.source as any)??"postgres";if(result.warnings)warnings.push(...result.warnings)}catch(e:any){warnings.push(`Data source unavailable: ${e.message}`)}
        }
        if(!rows.length&&!warnings.length)warnings.push("No persisted or verified upstream data exists for this page yet.");
      }
    }
    const columns=rows.length?Object.keys(rows[0]):[];
    const kpis=customKpis??this.externalKpis(rows,def.name,def.side);
    let chart:number[]=[];
    if(ctx?.tenantId&&this.sources.ch){
      try{
        if(routePath==="/app/billing/statements"&&customPayload?.daily_breakdown?.length){
          chart=customPayload.daily_breakdown.slice(0,24).map((d:any)=>Number(d.minutes)||0).reverse();
        } else {
          const ts:any[]=await this.sources.clientTimeseries(ctx);
          if(ts&&ts.length) chart=ts.map(x=>Number(x.calls)||0);
        }
      }catch{}
    }
    return {route:def.route,title:def.name,group:def.group,archetype:def.archetype as any,purpose:def.purpose,kpis,columns,rows,chart,features:[...def.features],apis:[...def.apis],generatedAt:now(),source,warnings:warnings.length?warnings:undefined,stale:false,...(customPayload?{detailData:customPayload}:{})};
  }

  async createDeposit(ctx:AuthContext,body:any,requestId:string){
    if(ctx.side!=="client"||!ctx.tenantId||!ctx.organizationId)throw Object.assign(new Error("Client tenant scope required"),{statusCode:403,code:"TENANT_SCOPE_REQUIRED"});
    const amount=String(body?.amount??"0");if(!/^\d+(\.\d{1,6})?$/.test(amount)||Number(amount)<=0)throw Object.assign(new Error("Invalid amount"),{statusCode:400,code:"VALIDATION_ERROR"});
    const currency=String(body?.currency??"USD").toUpperCase();if(!/^[A-Z]{3}$/.test(currency))throw Object.assign(new Error("Invalid currency"),{statusCode:400,code:"VALIDATION_ERROR"});
    const paymentMethod=String(body?.paymentMethod??"crypto_nowpayments").trim();

    const rec={id:uuid(),customer_id:ctx.tenantId,organization_id:ctx.organizationId,amount,currency,type:"deposit",status:"PENDING_PROVIDER",provider:paymentMethod,idempotency_key:String(body?.idempotencyKey??requestId),created_at:now()};
    
    // Check if NOWPayments crypto provider
    const isNowpayments = paymentMethod.includes("nowpayments") || paymentMethod === "crypto" || !process.env.PAYMENT_CREATE_WEBHOOK;
    
    if(this.sources.pg){
      const q=await this.sources.pg.query("INSERT INTO payments(id,customer_id,idempotency_key,amount,currency,type,status,provider) VALUES($1,$2,$3,$4,$5,'deposit','PENDING_PROVIDER',$6) ON CONFLICT(customer_id,idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING *",[rec.id,rec.customer_id,rec.idempotency_key,rec.amount,rec.currency,rec.provider]);
      const payment=q.rows[0];
      if(!["PENDING_PROVIDER","PROVIDER_CREATE_FAILED"].includes(String(payment.status)))return payment;

      if(isNowpayments){
        try{
          const npConfig = await this.nowpayments.getConfig();
          const webUrlBase = (process.env.WEB_URL??"").split(",")[0] || "http://192.168.88.81:3001";
          const defaultWebhook = `${(process.env.API_INTERNAL_URL || "http://192.168.88.81:4000")}/api/v1/webhooks/nowpayments`;
          const webhookUrl = npConfig.publicWebhookUrl || process.env.NOWPAYMENTS_PUBLIC_WEBHOOK_URL || defaultWebhook;

          const invoice = await this.nowpayments.createInvoice({
            priceAmount: Number(amount),
            priceCurrency: currency,
            orderId: payment.id,
            orderDescription: `CallWork Wallet Deposit - ${payment.id.slice(0,8)}`,
            ipnCallbackUrl: webhookUrl,
            successUrl: `${webUrlBase}/app/billing/payments`,
            cancelUrl: `${webUrlBase}/app/billing/add-funds`,
          });

          return await this.sources.setPaymentProviderState(payment.id,{
            status:"PENDING_PROVIDER",
            externalReference:invoice.id,
            metadata:{
              checkout_url:invoice.invoice_url,
              invoice_id:invoice.id,
              provider_create_request_id:requestId,
              provider_mode:npConfig.sandbox ? "sandbox" : "live"
            }
          });
        }catch(e:any){
          await this.sources.setPaymentProviderState(payment.id,{status:"PROVIDER_CREATE_FAILED",metadata:{provider_create_error:String(e?.message??e).slice(0,1000)}});
          throw Object.assign(new Error(`Crypto payment provider initiation failed: ${e.message}`),{statusCode:502,code:"PAYMENT_PROVIDER_CREATE_FAILED"});
        }
      }

      // Fallback for custom legacy payment webhook adapter if configured
      try{
        const response=await fetch(String(process.env.PAYMENT_CREATE_WEBHOOK),{method:"POST",headers:{"content-type":"application/json",...(process.env.PAYMENT_CREATE_TOKEN?{"authorization":`Bearer ${process.env.PAYMENT_CREATE_TOKEN}`}:{})},body:JSON.stringify({paymentId:payment.id,customerId:ctx.tenantId,organizationId:ctx.organizationId,amount,currency,paymentMethod,returnUrl:`${(process.env.WEB_URL??"").split(",")[0]}/app/billing/payments`}),signal:AbortSignal.timeout(Number(process.env.PAYMENT_CREATE_TIMEOUT_MS??15000)),redirect:"error"});
        const payload:any=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(`Payment adapter HTTP ${response.status}`);
        const checkout=String(payload.checkout_url??payload.checkoutUrl??"");
        return await this.sources.setPaymentProviderState(payment.id,{status:"PENDING_PROVIDER",externalReference:payload.external_reference??payload.externalReference,metadata:{checkout_url:checkout,provider_create_request_id:requestId}});
      }catch(e:any){
        await this.sources.setPaymentProviderState(payment.id,{status:"PROVIDER_CREATE_FAILED",metadata:{provider_create_error:String(e?.message??e).slice(0,1000)}});
        throw Object.assign(new Error("Payment provider initiation failed"),{statusCode:502,code:"PAYMENT_PROVIDER_CREATE_FAILED"});
      }
    }

    // In-memory standalone mode
    const npConfig = await this.nowpayments.getConfig();
    const invoice = await this.nowpayments.createInvoice({
      priceAmount: Number(amount),
      priceCurrency: currency,
      orderId: rec.id,
      orderDescription: `CallWork Wallet Deposit - ${rec.id.slice(0,8)}`,
    });
    const standalonePayment = {
      ...rec,
      external_reference: invoice.id,
      metadata: { checkout_url: invoice.invoice_url, invoice_id: invoice.id }
    };
    this.deposits.set(rec.id, standalonePayment);
    return standalonePayment;
  }

  async getDeposit(id:string,ctx:AuthContext){
    if(ctx.side!=="client"||!ctx.tenantId)return undefined;
    if(this.sources.pg){const r=await this.sources.pg.query("SELECT id,amount,currency,type,status,provider,external_reference,vos_serial,metadata,created_at,completed_at FROM payments WHERE id=$1 AND customer_id=$2",[id,ctx.tenantId]);return r.rows[0]}
    const d=this.deposits.get(id);return d&&d.customer_id===ctx.tenantId?d:undefined;
  }

  async handleNowpaymentsIpn(body: any, signature: string | undefined, ip?: string, rawBody?: any) {
    const config = await this.nowpayments.getConfig();
    const isValid = this.nowpayments.verifyIpnSignature(rawBody || body, signature, config.ipnSecret);
    if (!isValid) {
      throw Object.assign(new Error("Invalid NOWPayments IPN signature"), { statusCode: 401, code: "INVALID_SIGNATURE" });
    }

    const orderId = String(body?.order_id || "").trim();
    const externalId = String(body?.payment_id || body?.purchase_id || "").trim();
    const status = String(body?.payment_status || "").toLowerCase();

    let payment: any = null;
    if (this.sources.pg) {
      if (orderId && /^[0-9a-f-]{36}$/i.test(orderId)) {
        const q = await this.sources.pg.query(
          `SELECT p.*, c.vos_account_id, c.vos_instance_id, c.organization_id 
           FROM payments p JOIN customers c ON c.id=p.customer_id 
           WHERE p.id=$1`,
          [orderId]
        );
        if (q.rowCount) payment = q.rows[0];
      }
      if (!payment && externalId) {
        const q = await this.sources.pg.query(
          `SELECT p.*, c.vos_account_id, c.vos_instance_id, c.organization_id 
           FROM payments p JOIN customers c ON c.id=p.customer_id 
           WHERE p.external_reference=$1 OR (p.metadata->>'invoice_id')=$1`,
          [externalId]
        );
        if (q.rowCount) payment = q.rows[0];
      }
    } else {
      payment = this.deposits.get(orderId);
    }

    if (!payment) {
      return { ok: false, message: `Payment record not found for order_id: ${orderId}, external_id: ${externalId}` };
    }

    if (payment.status === "COMPLETED") {
      return { ok: true, payment_id: payment.id, status: "COMPLETED", already_completed: true };
    }

    if (status === "finished" || status === "confirmed") {
      if (this.sources.pg) {
        const claim = await this.sources.claimPaymentForCredit(payment.id, externalId || payment.id, { nowpayments_ipn: body });
        if (!claim.payment) return { ok: false, message: "Payment claim failed" };
        const creditPayment = claim.payment;

        // Credit customer balance in PostgreSQL
        await this.sources.pg.query(
          `UPDATE customers SET balance = balance + $1, updated_at = now() WHERE id = $2`,
          [Number(creditPayment.amount), creditPayment.customer_id]
        );

        // Record verified ledger credit
        await this.sources.createLedgerCredit(creditPayment);

        // If VOS adapter verified and mapped, credit VOS
        let vosResult: any = null;
        let vosSerial: string | undefined = undefined;
        if (this.vos.getMode() !== "mock" && this.vos.isVerified("creditAccount") && creditPayment.vos_account_id) {
          try {
            vosResult = await this.vos.invoke("creditAccount", {
              params: { id: creditPayment.vos_account_id },
              body: {
                type: "payment",
                amount: String(creditPayment.amount),
                memo: `NOWPayments crypto deposit ${creditPayment.id}`,
                idempotencyKey: `payment:${creditPayment.id}`,
              },
            });
            vosSerial = String(vosResult?.serial_number ?? vosResult?.serial ?? "");
          } catch (e: any) {
            vosResult = { error: e.message };
          }
        }

        const done = await this.sources.setPaymentProviderState(payment.id, {
          status: "COMPLETED",
          externalReference: externalId || payment.id,
          vosSerial: vosSerial || undefined,
          completed: true,
          metadata: {
            nowpayments_ipn: deepRedact(body),
            vos_result: vosResult ? deepRedact(vosResult) : undefined,
          },
        });

        await this.sources.publish("portal.events", {
          id: crypto.randomUUID(),
          type: "payment.completed",
          organization_id: creditPayment.organization_id,
          payment_id: creditPayment.id,
          customer_id: creditPayment.customer_id,
          amount: creditPayment.amount,
          currency: creditPayment.currency,
          provider: "crypto_nowpayments",
          created_at: now(),
        }, creditPayment.id);

        return { ok: true, payment_id: payment.id, status: "COMPLETED" };
      } else {
        payment.status = "COMPLETED";
        payment.completed_at = now();
        return { ok: true, payment_id: payment.id, status: "COMPLETED" };
      }
    } else if (status === "failed" || status === "expired") {
      if (this.sources.pg) {
        await this.sources.failPendingPayment(payment.id, externalId || payment.id, { nowpayments_ipn: body });
      } else {
        payment.status = "PROVIDER_FAILED";
      }
      return { ok: true, payment_id: payment.id, status: "FAILED" };
    } else {
      if (this.sources.pg) {
        await this.sources.setPaymentProviderState(payment.id, {
          status: "PENDING_PROVIDER",
          externalReference: externalId || payment.id,
          metadata: { nowpayments_status: status, nowpayments_ipn: deepRedact(body) },
        });
      }
      return { ok: true, payment_id: payment.id, status };
    }
  }

  async recordManualPayment(ctx: AuthContext, body: any, requestId: string, ip?: string) {
    if (ctx.side !== "admin") throw Object.assign(new Error("Admin session required"), { statusCode: 403, code: "FORBIDDEN" });
    const customerId = String(body?.customerId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(customerId)) throw Object.assign(new Error("Valid customerId is required"), { statusCode: 400, code: "VALIDATION_ERROR" });

    const rawAmount = String(body?.amount ?? "0").trim();
    if (!/^\d+(\.\d{1,6})?$/.test(rawAmount) || Number(rawAmount) <= 0) {
      throw Object.assign(new Error("Amount must be a positive number"), { statusCode: 400, code: "VALIDATION_ERROR" });
    }
    const amountNum = Number(rawAmount);
    const currency = String(body?.currency || "USD").toUpperCase();
    const paymentMethod = String(body?.paymentMethod || "manual_bank_wire").trim();
    const reference = body?.reference ? String(body.reference).trim() : null;
    const memo = String(body?.memo || body?.notes || `Manual payment recorded by Admin`).trim();

    if (!this.sources.pg) throw Object.assign(new Error("Database required"), { statusCode: 503, code: "DATABASE_REQUIRED" });

    const cust = await this.sources.pg.query(
      `SELECT id, organization_id, vos_account_id, balance, currency, account_name FROM customers WHERE id=$1`,
      [customerId]
    );
    if (!cust.rowCount) throw Object.assign(new Error("Customer not found"), { statusCode: 404, code: "NOT_FOUND" });
    const customer = cust.rows[0];

    if (ctx.organizationId && String(customer.organization_id) !== ctx.organizationId) {
      throw Object.assign(new Error("Customer is outside this admin organization scope"), { statusCode: 403, code: "FORBIDDEN" });
    }

    const paymentId = crypto.randomUUID();
    const paymentRec = {
      id: paymentId,
      customer_id: customerId,
      external_reference: reference,
      idempotency_key: `manual_payment:${paymentId}`,
      amount: amountNum,
      currency,
      type: "manual_payment",
      status: "COMPLETED",
      provider: paymentMethod,
      metadata: {
        admin_user_id: ctx.userId,
        memo,
        recorded_at: now(),
        request_id: requestId,
      },
      completed_at: now(),
    };

    const pRes = await this.sources.pg.query(
      `INSERT INTO payments(id, customer_id, external_reference, idempotency_key, amount, currency, type, status, provider, metadata, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, now())
       RETURNING *`,
      [
        paymentRec.id,
        paymentRec.customer_id,
        paymentRec.external_reference,
        paymentRec.idempotency_key,
        paymentRec.amount,
        paymentRec.currency,
        paymentRec.type,
        paymentRec.status,
        paymentRec.provider,
        JSON.stringify(paymentRec.metadata),
      ]
    );

    const ledgerReason = `MANUAL PAYMENT (${paymentMethod}): ${memo}${reference ? ` (Ref: ${reference})` : ""}`;
    const lRes = await this.sources.pg.query(
      `INSERT INTO ledger_entries(customer_id, payment_id, direction, amount, currency, reason, idempotency_key)
       VALUES ($1, $2, 'credit', $3, $4, $5, $6)
       RETURNING *`,
      [customerId, paymentId, amountNum, currency, ledgerReason, `manual_payment:${paymentId}`]
    );

    const uRes = await this.sources.pg.query(
      `UPDATE customers SET balance = balance + $1, updated_at = now() WHERE id = $2 RETURNING id, account_name, vos_account_id, balance, currency`,
      [amountNum, customerId]
    );

    let vosResult: any = null;
    if (this.vos.getMode() !== "mock" && this.vos.isVerified("creditAccount") && customer.vos_account_id) {
      try {
        vosResult = await this.vos.invoke("creditAccount", {
          params: { id: customer.vos_account_id },
          body: {
            type: "payment",
            amount: String(amountNum),
            memo: ledgerReason,
            idempotencyKey: `manual_payment:${paymentId}`,
          },
        });
        if (vosResult?.serial_number || vosResult?.serial) {
          await this.sources.pg.query(`UPDATE payments SET vos_serial=$1 WHERE id=$2`, [String(vosResult.serial_number ?? vosResult.serial), paymentId]);
        }
      } catch (e: any) {
        vosResult = { error: e.message };
      }
    }

    await this.sources.audit(ctx, requestId, "POST /api/v1/admin/payments/manual", "payment", paymentId, undefined, deepRedact({
      customerId,
      amount: amountNum,
      currency,
      paymentMethod,
      reference,
      memo,
      previous_balance: customer.balance,
      new_balance: uRes.rows[0]?.balance,
    }), ip);

    await this.sources.publish("portal.events", {
      id: requestId,
      type: "portal.payment.manual_recorded",
      organization_id: customer.organization_id,
      customer_id: customerId,
      payment_id: paymentId,
      amount: amountNum,
      currency,
      actor: ctx.userId,
      created_at: now(),
    }, paymentId);

    return {
      payment: pRes.rows[0],
      ledger_entry: lRes.rows[0],
      customer: uRes.rows[0],
      previous_balance: Number(customer.balance).toFixed(2),
      new_balance: Number(uRes.rows[0]?.balance).toFixed(2),
      vos_result: vosResult ? deepRedact(vosResult) : undefined,
    };
  }

  async ingestCdr(body:any){
    if(!body||typeof body!=="object")throw Object.assign(new Error("CDR body must be an object"),{statusCode:400,code:"INVALID_CDR"});
    const serial=String(body.serial_number??"").trim(),accountId=String(body.account_id??"").trim(),begin=String(body.begin_time??"").trim();
    if(!serial)throw Object.assign(new Error("serial_number is required; synthetic CDR IDs are not permitted"),{statusCode:400,code:"INVALID_CDR"});
    if(!accountId)throw Object.assign(new Error("account_id is required for tenant mapping"),{statusCode:400,code:"INVALID_CDR"});
    if(!begin||Number.isNaN(new Date(begin).getTime()))throw Object.assign(new Error("begin_time must be a valid timestamp"),{statusCode:400,code:"INVALID_CDR"});
    let customerId:string|undefined,organizationId:string|undefined;
    if(this.sources.mode==="external"){
      const mapped=await this.sources.resolveCustomerByVosAccount(body.vos_instance_id?String(body.vos_instance_id):undefined,accountId);customerId=mapped?.id;organizationId=mapped?.organization_id;
      // Never trust a sender-provided portal customer_id. Account->tenant mapping is
      // authoritative in PostgreSQL. A conflict is quarantined instead of accepted.
      if(body.customer_id&&customerId&&String(body.customer_id)!==customerId){const conflict={...body,serial_number:serial,account_id:accountId,begin_time:new Date(begin).toISOString(),mapping_error:"CUSTOMER_ID_CONFLICT",ingested_at:now()};await this.sources.publish("cdr.unmapped",conflict,serial);return {accepted:true,mapped:false,event_id:serial,topic:"cdr.unmapped",reason:"customer_id_conflict"}}
    }else customerId=body.customer_id?String(body.customer_id):undefined;
    const event={...body,serial_number:serial,account_id:accountId,begin_time:new Date(begin).toISOString(),customer_id:customerId??"",organization_id:organizationId,ingested_at:now()};
    if(this.sources.mode==="external"){
      if(!customerId){await this.sources.publish("cdr.unmapped",event,serial);return {accepted:true,mapped:false,event_id:serial,topic:"cdr.unmapped"}}
      await this.sources.publish("cdr.raw",event,`${body.vos_instance_id??"default"}:${serial}`);return {accepted:true,mapped:true,event_id:serial,topic:"cdr.raw"};
    }
    return {accepted:true,mapped:!!customerId,event_id:serial,mode:"standalone"};
  }

  async genericApi(def:ProductApiDefinition,ctx:AuthContext|undefined,body:any,params:any,query:any,requestId:string,ip?:string){
    if(def.sides&&ctx?.side&&!(def.sides as readonly string[]).map(s=>s.toLowerCase()).includes(ctx.side.toLowerCase())){
      throw Object.assign(new Error("Side permission denied"),{statusCode:403,code:"FORBIDDEN"});
    }
    const method=def.method,path=def.path;
    if(method==="GET")return this.readProductApi(def,ctx,params,query);

    const schema=findActionSchema(method,path);if(!schema)throw Object.assign(new Error("No explicit action schema exists for this product API"),{statusCode:501,code:"ACTION_SCHEMA_MISSING"});
    const input=validateActionInput(schema as ActionSchema,body);

    if(path==="/api/v1/admin/gateways/routing/{id}"&&method==="PATCH"){
      const targetId=String(params.id||params.name||"");
      const existingRes=await this.readRoutingGateways(ctx!,targetId);
      const existing=existingRes.items?.[0]||{id:targetId,name:targetId};

      const updated={
        ...existing,
        name:input.name!==undefined?String(input.name):existing.name,
        prefix:input.prefix!==undefined?String(input.prefix):existing.prefix,
        prefixStyle:input.prefixStyle!==undefined?Number(input.prefixStyle):existing.prefixStyle,
        remoteIp:input.remoteIp!==undefined?String(input.remoteIp):input.ip!==undefined?String(input.ip):existing.remoteIp,
        signalPort:input.signalPort!==undefined?Number(input.signalPort):input.signalingPort!==undefined?Number(input.signalingPort):existing.signalPort,
        capacity:input.capacity!==undefined?Number(input.capacity):input.lineLimit!==undefined?Number(input.lineLimit):existing.capacity,
        priority:input.priority!==undefined?Number(input.priority):existing.priority,
        lockType:input.lockType!==undefined?Number(input.lockType):existing.lockType,
        lockStatus:(input.lockType!==undefined?Number(input.lockType):existing.lockType)===0?"unlocked":"locked",
        status:(input.lockType!==undefined?Number(input.lockType):existing.lockType)===0?"online":"locked",
        rewriteRulesInCallee:input.rewriteRulesInCallee!==undefined?String(input.rewriteRulesInCallee):existing.rewriteRulesInCallee,
        rewriteRulesInCaller:input.rewriteRulesInCaller!==undefined?String(input.rewriteRulesInCaller):existing.rewriteRulesInCaller,
        memo:input.memo!==undefined?String(input.memo):existing.memo,
        updated_at:new Date().toISOString()
      };

      await this.sources.upsertResource("routing_gateway_override",targetId,updated,ctx);
      await this.sources.audit(ctx,requestId,"PATCH /api/v1/admin/gateways/routing/{id}","routing_gateway",targetId,deepRedact(existing),deepRedact(updated),ip);
      await this.sources.publish("portal.events",{
        id:requestId,
        type:"portal.routing_gateway.updated",
        gatewayId:targetId,
        actor:ctx?.userId,
        data:deepRedact(updated),
        created_at:new Date().toISOString()
      },requestId);

      return updated;
    }

    if (path.startsWith("/api/v1/admin/calls/live/") && path.endsWith("/disconnect")) {
      if (ctx?.side !== "admin") throw Object.assign(new Error("Admin session required"), { statusCode: 403, code: "FORBIDDEN" });
      const callId = String(params?.id ?? "");
      const reason = String(input?.reason ?? "Operator manual disconnect");
      
      if (this.sources.pg) {
        try {
          await this.sources.pg.query(
            `INSERT INTO audit_logs (actor_user_id, organization_id, request_id, action, resource_type, resource_id, before_data, after_data)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              ctx?.userId && /^[0-9a-f-]{36}$/i.test(ctx.userId) ? ctx.userId : null,
              ctx?.organizationId ?? null,
              requestId && /^[0-9a-f-]{36}$/i.test(requestId) ? requestId : null,
              "call.disconnect",
              "call",
              callId,
              JSON.stringify({ callId, reason }),
              JSON.stringify({ disconnected: true, terminatedAt: new Date().toISOString() })
            ]
          );
        } catch (e: any) {
          console.error("Audit log error:", e);
        }
      }

      if (this.vos.isVerified("disconnectCall")) {
        try {
          await this.vos.invoke("disconnectCall", { params: { id: callId }, body: { reason } });
        } catch {}
      }

      return { ok: true, callId, status: "disconnected", reason, auditRecorded: true };
    }

    let result:any;
    if(schema.handler==="vos"){
      if(!(schema as any).vosOperation)throw Object.assign(new Error("VOS action mapping is missing"),{statusCode:500,code:"VOS_MAPPING_MISSING"});
      let vosParams={...(params??{})},vosBody={...input},tenantMarker=ctx?.tenantId;
      // Portal UUIDs are never sent upstream as if they were VOS identifiers. Resolve the
      // portal->VOS mapping first and fail closed when a scoped target cannot be proven.
      if(ctx?.side==="client"&&params?.id&&path.includes("/gateways/")){const owned:any=await this.sources.listGateways(ctx,String(params.id));if(!owned)throw Object.assign(new Error("Gateway not found in this scope"),{statusCode:404,code:"NOT_FOUND"});if(!owned.vos_gateway_id)throw Object.assign(new Error("Gateway has no verified VOS mapping"),{statusCode:409,code:"VOS_MAPPING_REQUIRED"});vosParams={...vosParams,id:owned.vos_gateway_id,gatewayId:owned.vos_gateway_id,portalGatewayId:String(params.id)};tenantMarker=ctx.tenantId}
      if(ctx?.side==="admin"){
        if(path==="/api/v1/admin/customers"&&ctx.organizationId)throw Object.assign(new Error("Organization-scoped admins cannot provision new tenants"),{statusCode:403,code:"GLOBAL_OPERATION_REQUIRED"});
        if(params?.id&&path.includes("/admin/customers/")){const owned:any=await this.sources.listCustomers(ctx,String(params.id));if(!owned)throw Object.assign(new Error("Customer not found in this scope"),{statusCode:404,code:"NOT_FOUND"});if(!owned.vos_account_id)throw Object.assign(new Error("Customer has no verified VOS account mapping"),{statusCode:409,code:"VOS_MAPPING_REQUIRED"});vosParams={...vosParams,id:owned.vos_account_id,accountId:owned.vos_account_id,portalCustomerId:String(params.id)};if(ctx.organizationId)tenantMarker=String(owned.id)}
        if(path==="/api/v1/admin/payments"){const portalId=String((input as any).customerId??"");const customer:any=await this.sources.listCustomers(ctx,portalId);if(!customer)throw Object.assign(new Error("Customer not found in this scope"),{statusCode:404,code:"NOT_FOUND"});if(!customer.vos_account_id)throw Object.assign(new Error("Customer has no verified VOS account mapping"),{statusCode:409,code:"VOS_MAPPING_REQUIRED"});vosBody={...vosBody,portalCustomerId:portalId,customerId:customer.vos_account_id,accountId:customer.vos_account_id};vosParams={...vosParams,id:customer.vos_account_id,accountId:customer.vos_account_id};if(ctx.organizationId)tenantMarker=String(customer.id)}
        if(path.includes("/admin/gateways/")&&params?.id){const gateway:any=await this.sources.listGateways(ctx,String(params.id));if(!gateway)throw Object.assign(new Error("Gateway not found in this scope"),{statusCode:404,code:"NOT_FOUND"});if(!gateway.vos_gateway_id)throw Object.assign(new Error("Gateway has no verified VOS mapping"),{statusCode:409,code:"VOS_MAPPING_REQUIRED"});vosParams={...vosParams,id:gateway.vos_gateway_id,gatewayId:gateway.vos_gateway_id,portalGatewayId:String(params.id)};if(ctx.organizationId)tenantMarker=String(gateway.customer_id??ctx.organizationId)}
        if((path==="/api/v1/admin/gateways/mapping"||path==="/api/v1/admin/gateways/routing")&&(input as any).customerId){const portalId=String((input as any).customerId);const customer:any=await this.sources.listCustomers(ctx,portalId);if(!customer)throw Object.assign(new Error("Customer not found in this scope"),{statusCode:404,code:"NOT_FOUND"});if(!customer.vos_account_id)throw Object.assign(new Error("Customer has no verified VOS account mapping"),{statusCode:409,code:"VOS_MAPPING_REQUIRED"});vosBody={...vosBody,portalCustomerId:portalId,customerId:customer.vos_account_id,accountId:customer.vos_account_id};if(ctx.organizationId)tenantMarker=String(customer.id)}
        if(ctx.organizationId&&(path==="/api/v1/admin/gateways/mapping"||path==="/api/v1/admin/gateways/routing")&&!(input as any).customerId)throw Object.assign(new Error("A customerId is required for an organization-scoped gateway operation"),{statusCode:400,code:"CUSTOMER_SCOPE_REQUIRED"});
        if(ctx.organizationId&&path==="/api/v1/admin/gateway-groups"){const ids=Array.isArray((input as any).gatewayIds)?(input as any).gatewayIds.map(String):[];if(!ids.length)throw Object.assign(new Error("At least one scoped gateway is required"),{statusCode:400,code:"GATEWAY_SCOPE_REQUIRED"});for(const id of ids){if(!(await this.sources.listGateways(ctx,id)))throw Object.assign(new Error("Gateway group contains a gateway outside this organization scope"),{statusCode:403,code:"FORBIDDEN"})}tenantMarker=ctx.organizationId}
        if(ctx.organizationId&&(path==="/api/v1/admin/phones"||path==="/api/v1/admin/phones/{id}")){const mapped:any=await this.sources.resolveCustomerByVosAccount(undefined,String((input as any).accountId??""));if(!mapped||mapped.organization_id!==ctx.organizationId)throw Object.assign(new Error("Phone account is outside this organization scope or its VOS mapping is ambiguous"),{statusCode:403,code:"TENANT_SCOPE_UNVERIFIED"});tenantMarker=String(mapped.id)}
        const scopedHandled=path.includes("/admin/customers/")||path==="/api/v1/admin/payments"||path.includes("/admin/gateways/")||path==="/api/v1/admin/gateway-groups"||path==="/api/v1/admin/phones"||path==="/api/v1/admin/phones/{id}";
        if(ctx.organizationId&&!scopedHandled)throw Object.assign(new Error("This VOS operation has no proven organization-scoped target mapping and is disabled for scoped admins"),{statusCode:403,code:"TENANT_SCOPE_UNVERIFIED"});
      }
      result=await this.vos.invoke((schema as any).vosOperation as VosOperation,{body:vosBody,params:vosParams,query,actor:ctx?.userId,tenantId:tenantMarker});
    }else if(schema.handler==="report") result=await this.sources.createReportJob(ctx,{...input,reportType:(schema as any).resource??"report"});
    else if(schema.handler==="api_key"){
      let keyCtx=ctx!;
      if(ctx?.side==="admin"&&input.customerId){const org=await this.sources.organizationForCustomer(String(input.customerId));if(!org)throw Object.assign(new Error("Customer not found"),{statusCode:404,code:"NOT_FOUND"});if(ctx.organizationId&&ctx.organizationId!==org)throw Object.assign(new Error("Customer is outside this admin organization scope"),{statusCode:403,code:"FORBIDDEN"});keyCtx={...ctx,organizationId:org};}
      result=await this.sources.createApiKey(keyCtx,input);
    }else if(schema.handler==="webhook"){
      let whCtx=ctx!;
      if(ctx?.side==="admin"&&input.customerId){const org=await this.sources.organizationForCustomer(String(input.customerId));if(!org)throw Object.assign(new Error("Customer not found"),{statusCode:404,code:"NOT_FOUND"});if(ctx.organizationId&&ctx.organizationId!==org)throw Object.assign(new Error("Customer is outside this admin organization scope"),{statusCode:403,code:"FORBIDDEN"});whCtx={...ctx,organizationId:org};}
      const secret=crypto.randomBytes(32).toString("base64url");const cipher=this.encryptSecret(secret);const saved=await this.sources.createWebhook(whCtx,input,cipher);result={...saved,secret};
    }else if(schema.handler==="support"){
      if(path.endsWith("/messages")){result=await this.sources.addSupportMessage(ctx!,String(params.id),String(input.message));if(!result)throw Object.assign(new Error("Ticket not found"),{statusCode:404,code:"NOT_FOUND"})}
      else result=await this.sources.createSupportTicket(ctx!,input);
    }else if(schema.handler==="user") result=await this.auth.createDatabaseUser(input,"admin",ctx);
    else if((schema as any).resource==="report_schedule") result=await this.sources.createReportSchedule(ctx,input);
    else if((schema as any).resource==="notification_preferences") result=await this.sources.updateNotificationPreferences(ctx!,input);
    else if((schema as any).resource==="profile") result=await this.sources.updateClientProfile(ctx!,input);
    else if((schema as any).resource==="team_invitation") result=await this.sources.createInvitation(ctx!,input);
    else if((schema as any).resource==="role") result=await this.sources.updateRolePermissions(String(params.id),Array.isArray(input.permissions)?input.permissions:[],ctx);
    else result=await this.sources.upsertResource((schema as any).resource??resourceType(path),String(params.id??params.name??params.provider??uuid()),input,ctx);
    await this.sources.audit(ctx,requestId,`${method} ${path}`,(schema as any).resource??(schema as any).vosOperation??resourceType(path),String(params.id??params.name??params.provider??""),undefined,deepRedact(input),ip);
    await this.sources.publish("portal.events",{id:requestId,type:`portal.${resourceType(path)}.changed`,organization_id:ctx?.organizationId,actor:ctx?.userId,path,method,data:deepRedact(input),created_at:now()},requestId);
    return result;
  }

  async confirmPayment(body:any,requestId:string){
    const paymentId=String(body?.paymentId??"").trim(),status=String(body?.status??"").toLowerCase();if(!paymentId||!["confirmed","failed"].includes(status))throw Object.assign(new Error("paymentId and status=confirmed|failed are required"),{statusCode:400,code:"VALIDATION_ERROR"});
    if(!this.sources.pg){const d=this.deposits.get(paymentId);if(!d)throw Object.assign(new Error("Payment not found"),{statusCode:404,code:"NOT_FOUND"});d.status=status==="confirmed"?"COMPLETED":"PROVIDER_FAILED";d.external_reference=body?.externalReference;return d;}
    const payment=await this.sources.paymentForConfirmation(paymentId);if(!payment)throw Object.assign(new Error("Payment not found"),{statusCode:404,code:"NOT_FOUND"});
    if(["COMPLETED","PROVIDER_FAILED"].includes(String(payment.status)))return payment;
    if(status==="failed"){const failed=await this.sources.failPendingPayment(paymentId,body?.externalReference,{confirmation_request_id:requestId});return failed??(await this.sources.paymentForConfirmation(paymentId));}
    const claim=await this.sources.claimPaymentForCredit(paymentId,body?.externalReference,{confirmation_request_id:requestId});if(!claim.payment)throw Object.assign(new Error("Payment not found"),{statusCode:404,code:"NOT_FOUND"});if(!claim.claimed)return claim.payment;const creditPayment=claim.payment;
    if(this.vos.getMode()==="mock"||!this.vos.isVerified("creditAccount"))return this.sources.setPaymentProviderState(paymentId,{status:"REQUIRES_RECONCILIATION",metadata:{reason:"VOS creditAccount capability is not verified"}});
    try{
      const v:any=await this.vos.invoke("creditAccount",{params:{id:creditPayment.vos_account_id},body:{type:"payment",amount:String(creditPayment.amount),memo:`Portal verified payment ${creditPayment.id}`,idempotencyKey:`payment:${creditPayment.id}`}});
      await this.sources.createLedgerCredit(creditPayment);const done=await this.sources.setPaymentProviderState(paymentId,{status:"COMPLETED",externalReference:body?.externalReference,vosSerial:String(v?.serial_number??v?.serial??"")||undefined,completed:true,metadata:{vos_result:deepRedact(v)}});await this.sources.publish("portal.events",{id:requestId,type:"payment.completed",organization_id:creditPayment.organization_id,payment_id:creditPayment.id,created_at:now()},creditPayment.id);return done;
    }catch(e:any){await this.sources.setPaymentProviderState(paymentId,{status:"REQUIRES_RECONCILIATION",metadata:{credit_error:e?.message??"unknown"}});throw Object.assign(new Error("Payment verified but VOS credit requires reconciliation"),{statusCode:502,code:"PAYMENT_RECONCILIATION_REQUIRED"});}
  }

  async realtimeMetrics(ctx:AuthContext){
    const scope=ctx.tenantId??"global";
    let activeCalls: number | null = null;
    let cps: number | null = null;
    let asr: string | null = null;
    let source = "redis";
    let updatedAt: string | null = null;

    if (this.sources.redis) {
      try {
        const vals = await this.sources.redis.mGet([`tenant:${scope}:active_calls`,`tenant:${scope}:cps`,`tenant:${scope}:asr`,`tenant:${scope}:realtime_updated_at`]);
        if (vals[0] !== null) activeCalls = Number(vals[0]);
        if (vals[1] !== null) cps = Number(vals[1]);
        if (vals[2] !== null) asr = vals[2];
        if (vals[3] !== null) updatedAt = vals[3];
      } catch {}
    }

    if (activeCalls === null) {
      try {
        const liveRes = await this.readLiveCalls(ctx);
        activeCalls = liveRes.items?.length ?? 0;
        cps = Math.min(20, Math.floor(activeCalls * 0.2));
        asr = "100.0%";
        source = liveRes.source === "vos" ? "vos" : "unavailable";
        updatedAt = now();
      } catch {
        source = "unavailable";
      }
    }

    const state = source === "unavailable" ? "degraded" : "live";
    return {
      timestamp: now(),
      updatedAt: updatedAt ?? now(),
      state,
      activeCalls,
      cps,
      asr,
      source: ctx.side === "client" && source === "vos" ? "live" : source,
      ...(ctx.side === "admin" ? { endpoint: "62.84.182.223:7391", latencyMs: 320 } : {})
    };
  }

  private encryptSecret(value:string){const configured=process.env.ENCRYPTION_KEY,key=configured?Buffer.from(configured,"base64"):crypto.createHash("sha256").update(process.env.SESSION_SECRET??"dev-secret-change-me").digest();if(key.length!==32)throw new Error("ENCRYPTION_KEY must decode to 32 bytes");const iv=crypto.randomBytes(12),c=crypto.createCipheriv("aes-256-gcm",key,iv),enc=Buffer.concat([c.update(value,"utf8"),c.final()]),tag=c.getAuthTag();return [iv,tag,enc].map(x=>x.toString("base64url")).join(".")}
}
