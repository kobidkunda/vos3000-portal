import fs from "node:fs";
import path from "node:path";

export type VosOperation =
  | "getAccount" | "getBalance" | "getCdr" | "getRecentCdr" | "getCurrentCalls"
  | "getMappingGateways" | "getRoutingGateways" | "getGatewayStatus" | "getGatewayNetwork"
  | "getRates" | "getPayments"
  | "createAccount" | "updateAccount" | "creditAccount" | "assignPackage"
  | "setAccountAuthorizations" | "setNumberLimits"
  | "createMappingGateway" | "updateMappingGateway" | "createRoutingGateway" | "updateRoutingGateway"
  | "createGatewayGroup" | "createRegistration" | "routingAnalysis" | "networkTest"
  | "createPhone" | "updatePhone" | "disconnectCall"
  | "createRateGroup" | "replaceRates" | "importRates" | "createPackage"
  | "updateSystemParameter" | "updateGatewayIps" | "rotateGatewayCredentials";

export interface VosCapability {
  verified: boolean;
  method?: "GET"|"POST"|"PUT"|"PATCH"|"DELETE";
  path?: string;
  timeoutMs?: number;
  /** Must be true only after contract tests prove the upstream mapping cannot return or mutate another tenant's data. */
  tenantSafe?: boolean;
  note?: string;
}
export type VosCapabilities = Record<VosOperation,VosCapability>;

export class VosCapabilityError extends Error {
  code="VOS_CAPABILITY_UNVERIFIED";
  statusCode=503;
  constructor(public operation:VosOperation){super(`VOS operation ${operation} is not verified for this installation`)}
}
export class VosTransportError extends Error {
  code="VOS_TRANSPORT_ERROR";
  statusCode=502;
  constructor(message:string, public operation:VosOperation, public upstreamStatus?:number){super(message)}
}

function interpolatePath(template:string, params:Record<string,unknown>={}, op:VosOperation){
  return template.replace(/\{([^}]+)\}/g,(_,k)=>{
    const v=params[k]; if(v===undefined||v===null||v==="") throw new VosTransportError(`Missing VOS path parameter ${k}`,op);
    return encodeURIComponent(String(v));
  });
}

export class VosAdapter {
  private mode = process.env.VOS_MODE ?? "mock";
  private capabilities: Partial<VosCapabilities> = {};
  constructor(){
    const candidates = [
      process.env.VOS_CAPABILITIES_FILE,
      path.join(process.cwd(), "config", "vos-capabilities.json"),
      path.resolve(process.cwd(), "..", "config", "vos-capabilities.json"),
      path.resolve(process.cwd(), "..", "..", "config", "vos-capabilities.json"),
      typeof __dirname !== "undefined" ? path.resolve(__dirname, "..", "..", "config", "vos-capabilities.json") : null,
      typeof __dirname !== "undefined" ? path.resolve(__dirname, "..", "..", "..", "config", "vos-capabilities.json") : null
    ].filter(Boolean) as string[];

    for (const file of candidates) {
      if (fs.existsSync(file)) {
        try {
          this.capabilities = JSON.parse(fs.readFileSync(file, "utf8"));
          break;
        } catch {}
      }
    }
  }
  isVerified(op:VosOperation){ return this.mode==="mock" || this.capabilities[op]?.verified===true; }
  isTenantSafe(op:VosOperation){ return this.mode==="mock" || this.capabilities[op]?.tenantSafe===true; }
  getMode(){ return this.mode; }
  async invoke(op:VosOperation, input:any={}) {
    if(this.mode==="mock") return {ok:true,operation:op,mock:true,input,at:new Date().toISOString()};
    const cap=this.capabilities[op];
    if(!cap?.verified || !cap.path) throw new VosCapabilityError(op);
    if(input?.tenantId && cap.tenantSafe!==true) throw new VosTransportError(`VOS ${op} is not marked tenantSafe for tenant-scoped execution`,op);
    const base=process.env.VOS_HTTP_BASE_URL;
    if(!base) throw new VosTransportError("VOS_HTTP_BASE_URL is not configured",op);
    const method=(cap.method ?? "GET").toUpperCase() as NonNullable<VosCapability["method"]>;
    const rawPath=interpolatePath(cap.path,input?.params??{},op);
    const url=new URL(rawPath,base);
    if(method==="GET" && input?.query && typeof input.query==="object"){
      for(const [k,v] of Object.entries(input.query)) if(v!==undefined&&v!==null&&v!=="") url.searchParams.set(k,String(v));
    }
    const headers:Record<string,string>={"accept":"application/json"};
    if(method!=="GET") headers["content-type"]="application/json";
    if(process.env.VOS_HTTP_USERNAME){
      headers.authorization="Basic "+Buffer.from(`${process.env.VOS_HTTP_USERNAME}:${process.env.VOS_HTTP_PASSWORD??""}`).toString("base64");
    }
    let res:Response;
    try{
      res=await fetch(url,{method,headers,body:method==="GET"?undefined:JSON.stringify(input?.body??input),signal:AbortSignal.timeout(cap.timeoutMs??Number(process.env.VOS_HTTP_TIMEOUT_MS??10000))});
    }catch(e:any){throw new VosTransportError(`VOS ${op} transport failed: ${e?.message??"unknown error"}`,op)}
    const text=await res.text();
    if(!res.ok) throw new VosTransportError(`VOS ${op} failed with HTTP ${res.status}`,op,res.status);
    if(!text) return {ok:true};
    try { return JSON.parse(text) } catch { return {raw:text} }
  }

  getAccount=(x?:unknown)=>this.invoke("getAccount",x); getBalance=(x?:unknown)=>this.invoke("getBalance",x);
  getCdr=(x?:unknown)=>this.invoke("getCdr",x); getRecentCdr=(x?:unknown)=>this.invoke("getRecentCdr",x);
  getCurrentCalls=(x?:unknown)=>this.invoke("getCurrentCalls",x); getMappingGateways=(x?:unknown)=>this.invoke("getMappingGateways",x);
  getRoutingGateways=(x?:unknown)=>this.invoke("getRoutingGateways",x); getGatewayStatus=(x?:unknown)=>this.invoke("getGatewayStatus",x);
  getGatewayNetwork=(x?:unknown)=>this.invoke("getGatewayNetwork",x); getRates=(x?:unknown)=>this.invoke("getRates",x);
  getPayments=(x?:unknown)=>this.invoke("getPayments",x);
}
