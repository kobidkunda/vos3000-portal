import "reflect-metadata";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

function loadEnvFile() {
  const possiblePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../.env"),
  ];
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (process.env[key] === undefined || process.env[key] === "") {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}
loadEnvFile();

import { AppModule } from "./app.module.js";
import { AuthService } from "./auth.service.js";
import { PlatformService } from "./platform.service.js";
import { DataSourcesService } from "./data-sources.service.js";
import { productApis, type ProductApiDefinition } from "@vos/shared";
import { authorizeProductApi, validateBrowserOrigin } from "./access-policy.js";

const normalize=(p:string)=>p.replace(/\{([^}]+)\}/g,":$1");
function validateConfig(){
  if(process.env.NODE_ENV!=="production")return;
  const secret=process.env.SESSION_SECRET??"";if(secret.length<32)throw new Error("SESSION_SECRET must be at least 32 characters in production");
  if((process.env.AUTH_MODE??"demo")!=="database")throw new Error("AUTH_MODE=database is required in production");
  if((process.env.DATA_MODE??"demo")!=="external")throw new Error("DATA_MODE=external is required in production");
  if(!process.env.ENCRYPTION_KEY||Buffer.from(process.env.ENCRYPTION_KEY,"base64").length!==32)throw new Error("ENCRYPTION_KEY must be a 32-byte base64 value in production");
  if(!process.env.CDR_INGEST_TOKEN||process.env.CDR_INGEST_TOKEN==="change-me-cdr-ingest-token")throw new Error("CDR_INGEST_TOKEN must be changed in production");
  if(!process.env.PAYMENT_CONFIRMATION_TOKEN||process.env.PAYMENT_CONFIRMATION_TOKEN==="change-me-payment-confirmation-token")throw new Error("PAYMENT_CONFIRMATION_TOKEN must be changed in production");
}

async function bootstrap(){
  validateConfig();
  const app=await NestFactory.create<NestFastifyApplication>(AppModule,new FastifyAdapter({logger:true,bodyLimit:Number(process.env.API_BODY_LIMIT_BYTES??2_000_000),trustProxy:process.env.TRUST_PROXY==="true"}));
  const allowedOrigins=(process.env.WEB_URL??"http://localhost:3000").split(",").map(x=>x.trim()).filter(Boolean);
  app.enableCors({origin:allowedOrigins,credentials:true,methods:["GET","HEAD","POST","PUT","PATCH","DELETE","OPTIONS"]});
  const platform=app.get(PlatformService);await platform.init();const auth=app.get(AuthService);const sources=app.get(DataSourcesService);
  const fastify=app.getHttpAdapter().getInstance();
  fastify.addHook("onRequest",async(req:any,reply:any)=>{
    if(String(req.url).startsWith("/api/v1/health")||String(req.url).startsWith("/docs"))return;
    const limit=Number(process.env.API_IP_RATE_LIMIT_PER_MINUTE??600);
    if(!(await sources.allowRateLimit(`ip:${req.ip}`,limit,60)))return reply.status(429).send({ok:false,request_id:crypto.randomUUID(),error:{code:"RATE_LIMITED",message:"Request rate limit exceeded"}});
  });

  const reserved=new Set([
    "POST /api/v1/admin/auth/login","POST /api/v1/auth/login","POST /api/v1/admin/auth/mfa/verify","POST /api/v1/auth/mfa/verify",
    "POST /api/v1/admin/auth/password/request","POST /api/v1/admin/auth/password/reset","POST /api/v1/auth/password/request","POST /api/v1/auth/password/reset","POST /api/v1/me/mfa",
    "GET /api/v1/admin/me/sessions","DELETE /api/v1/admin/me/sessions/{id}","GET /api/v1/me/sessions","DELETE /api/v1/me/sessions/{id}",
    "POST /api/v1/deposits","GET /api/v1/deposits/{id}",
    "PATCH /api/v1/report-schedules/{id}","PATCH /api/v1/admin/report-schedules/{id}","GET /api/v1/downloads/{id}/file","GET /api/v1/admin/downloads/{id}/file",
    "GET /api/v1/admin/calls/live/stream","GET /api/v1/admin/noc/stream","GET /api/v1/calls/live/stream",
    "GET /api/v1/organizations","GET /api/v1/admin/organizations","POST /api/v1/organizations","POST /api/v1/admin/organizations",
    "GET /api/v1/vos-instances","GET /api/v1/admin/vos-instances",
    "GET /api/v1/admin/customers/{id}/gateways","GET /api/v1/admin/customers/{id}/users","POST /api/v1/admin/customers/{id}/password",
    "GET /api/v1/admin/customers/{id}/metrics","POST /api/v1/admin/customers/{id}/adjustments","GET /api/v1/admin/customers/{id}/ledger",
    "GET /api/v1/admin/customers/{id}/cdr","POST /api/v1/admin/customers/{id}/gateways",
    "PATCH /api/v1/admin/customers/{id}/gateways/{gatewayId}","POST /api/v1/admin/customers/{id}/gateways/{gatewayId}/ips","POST /api/v1/admin/customers/{id}/gateways/{gatewayId}/sip-auth",
    "PATCH /api/v1/admin/gateways/mapping/{id}","POST /api/v1/admin/gateways/mapping/{id}/ips","POST /api/v1/admin/gateways/mapping/{id}/sip-auth",
    "POST /api/v1/admin/gateways/mapping","POST /api/v1/internal/cdr",
    "GET /api/v1/admin/customers/{id}/rates","POST /api/v1/admin/customers/{id}/rates","PATCH /api/v1/admin/customers/{id}/rates/{rateId}","DELETE /api/v1/admin/customers/{id}/rates/{rateId}",
    "PATCH /api/v1/admin/customers/{id}/rate-group","GET /api/v1/admin/rate-groups","POST /api/v1/admin/rate-groups","POST /api/v1/admin/rates","DELETE /api/v1/admin/rates/{rateId}",
    "GET /api/v1/admin/rates/groups","POST /api/v1/admin/rates/groups","GET /api/v1/admin/rates/groups/{id}","PATCH /api/v1/admin/rates/groups/{id}","DELETE /api/v1/admin/rates/groups/{id}","POST /api/v1/admin/rates/groups/{id}/duplicate",
    "GET /api/v1/admin/rates/groups/{id}/rates","POST /api/v1/admin/rates/groups/{id}/rates","PATCH /api/v1/admin/rates/groups/{id}/rates/{rateId}","DELETE /api/v1/admin/rates/groups/{id}/rates/{rateId}","POST /api/v1/admin/rates/groups/{id}/bulk-adjust",
    "POST /api/v1/admin/rates/imports/preview","POST /api/v1/admin/rates/imports/process","GET /api/v1/admin/rates/imports/history","POST /api/v1/admin/rates/lookup","POST /api/v1/admin/rates/snapshots/{id}/rollback",
    "GET /api/v1/rates","GET /api/v1/rates/lookup","POST /api/v1/rates/lookup",
    "GET /api/v1/admin/diagnostics/call-analysis","GET /api/v1/admin/diagnostics/call-analysis/{serial}","GET /api/v1/admin/diagnostics/call-analysis/recent","GET /api/v1/admin/diagnostics/registration-analysis",
    "GET /api/v1/cdr","GET /api/v1/cdr/recent","GET /api/v1/cdr/{id}",
    "GET /api/v1/admin/cdr","GET /api/v1/admin/cdr/recent","GET /api/v1/admin/cdr/{id}",
    "GET /api/v1/cdr/exports","POST /api/v1/cdr/exports","POST /api/v1/cdr/exports/estimate","DELETE /api/v1/cdr/exports/{id}","POST /api/v1/cdr/exports/{id}/cancel","GET /api/v1/cdr/exports/{id}/download",
    "GET /api/v1/admin/cdr/exports","POST /api/v1/admin/cdr/exports","POST /api/v1/admin/cdr/exports/estimate","DELETE /api/v1/admin/cdr/exports/{id}",
    "GET /api/v1/devices/setup/devices","GET /api/v1/devices/setup/instructions","POST /api/v1/devices/setup/verify","POST /api/v1/devices/setup/copy-event",
    "GET /api/v1/admin/devices/setup/devices","GET /api/v1/admin/devices/setup/instructions","POST /api/v1/admin/devices/setup/verify"
  ]);

  for(const d of productApis as readonly ProductApiDefinition[]){
    if(reserved.has(`${d.method} ${d.path}`))continue;
    const url=normalize(d.path);
    if((fastify as any).hasRoute?.({method:d.method,url}))continue;
    fastify.route({method:d.method as any,url,handler:async(req:any,reply:any)=>{
      const started=Date.now(),request_id=crypto.randomUUID(),found=auth.tokenFromHeaders(req.headers),ctx=await auth.resolveContext(req.headers,req.ip);
      const log=async(status:number)=>sources.logApiRequest(ctx,request_id,d.method,d.path,status,Date.now()-started,req.ip);
      const decision=authorizeProductApi(ctx,d);if(!decision.ok){reply.status(decision.statusCode!);await log(decision.statusCode!);return {ok:false,request_id,error:{code:decision.code,message:decision.message}}}
      if(ctx?.authType==="api_key"&&!(await sources.allowRateLimit(`api-key:${ctx.userId}`,Number(process.env.API_KEY_RATE_LIMIT_PER_MINUTE??120),60))){reply.status(429);await log(429);return {ok:false,request_id,error:{code:"RATE_LIMITED",message:"API key rate limit exceeded"}}}
      if(!validateBrowserOrigin(req.headers,d.method,found?.source)){reply.status(403);await log(403);return {ok:false,request_id,error:{code:"INVALID_ORIGIN",message:"Browser origin rejected"}}}
      try{const data=await platform.genericApi(d,ctx,req.body,req.params,req.query,request_id,req.ip);await log(200);return {ok:true,request_id,data}}
      catch(e:any){const status=e.statusCode??500;reply.status(status);await log(status);return {ok:false,request_id,error:{code:e.code??"OPERATION_FAILED",message:e.message,details:e.details}}}
    }});
  }

  const registerStream=(url:string,productPath:string)=>fastify.get(url,async(req:any,reply:any)=>{
    const ctx=await auth.resolveContext(req.headers,req.ip);if(!ctx){reply.status(401).send({ok:false,error:{code:"UNAUTHENTICATED",message:"Authentication required"}});return}
    const def=productApis.find(d=>d.method==="GET"&&d.path===productPath);if(!def){reply.status(500).send({ok:false,error:{code:"PRODUCT_API_DEFINITION_MISSING",message:"Realtime endpoint is not registered in the product API"}});return}const decision=authorizeProductApi(ctx,def);if(!decision.ok){reply.status(decision.statusCode!).send({ok:false,error:{code:decision.code,message:decision.message}});return}
    const origin=String(req.headers.origin??"");if(origin&&!allowedOrigins.includes(origin)){reply.status(403).send({ok:false,error:{code:"INVALID_ORIGIN",message:"Origin rejected"}});return}
    reply.hijack();const raw=reply.raw;raw.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform","Connection":"keep-alive","X-Accel-Buffering":"no",...(origin?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Credentials":"true"}:{})});
    let closed=false;const send=async()=>{if(closed)return;let payload:any;try{payload=await platform.realtimeMetrics(ctx)}catch{payload={timestamp:new Date().toISOString(),state:"degraded",activeCalls:null,cps:null,asr:null,source:"unavailable"}}raw.write(`event: metric\ndata: ${JSON.stringify(payload)}\n\n`)};
    await send();const timer=setInterval(()=>void send(),2000),heartbeat=setInterval(()=>{if(!closed)raw.write(`: heartbeat ${Date.now()}\n\n`)},15000);req.raw.on("close",()=>{closed=true;clearInterval(timer);clearInterval(heartbeat)});
  });
  registerStream("/api/v1/admin/calls/live/stream","/api/v1/admin/calls/live/stream");
  registerStream("/api/v1/admin/noc/stream","/api/v1/admin/noc/stream");
  registerStream("/api/v1/calls/live/stream","/api/v1/calls/live/stream");

  const doc:any=SwaggerModule.createDocument(app,new DocumentBuilder().setTitle("CallWork Portal API").setDescription("CallWork portal API surface on callwork.com — derived from the Admin and Customer specifications. Softswitch operations remain capability-gated until verified against the deployed VOS build.").setVersion("1.2").addBearerAuth().build());
  for(const d of productApis){doc.paths[d.path]=doc.paths[d.path]??{};doc.paths[d.path][d.method.toLowerCase()]={summary:`${d.method} ${d.path}`,responses:{200:{description:"Successful portal response"},400:{description:"Validation error"},401:{description:"Authentication required"},403:{description:"Forbidden"},503:{description:"Dependency/capability unavailable"}}}}
  SwaggerModule.setup("docs",app,doc);
  await app.listen({port:Number(process.env.PORT??4000),host:"0.0.0.0"});
}
bootstrap().catch(e=>{console.error(e);process.exit(1)});
