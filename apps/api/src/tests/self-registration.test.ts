import test from "node:test";
import assert from "node:assert/strict";
import { AppController } from "../app.controller.js";
import { AuthService } from "../auth.service.js";

function fakeRes(){const r:any={code:0};r.status=(c:number)=>{r.code=c;return r};r.header=()=>r;return r}
function req(headers:any={}){return {headers,ip:"10.0.0.1",url:"/api/v1/x"} as any}

function registrationController(ctx:any,sourceOverrides:any={}){
  const calls={audit:[] as any[],publish:[] as any[]};
  const sources={
    audit:async(...a:any[])=>calls.audit.push(a),
    publish:async(...a:any[])=>calls.publish.push(a),
    getRegistrationSettings:async()=>({default_rate_group_id:null,updated_at:null,updated_by:null}),
    saveRegistrationSettings:async()=>({default_rate_group_id:"11111111-1111-4111-8111-111111111111",default_rate_group_name:"Custom / On Request",before_data:{default_rate_group_id:null}}),
    ...sourceOverrides
  };
  const auth={resolveContext:async()=>ctx,tokenFromHeaders:()=>({source:"bearer"})};
  const ctl=new AppController(auth as any,{} as any,sources as any,{} as any,{} as any);
  return {ctl,calls};
}

const admin={side:"admin",role:"super_admin",userId:"21111111-1111-4111-8111-111111111111",permissions:[],authType:"session"};
const client={side:"client",role:"owner",userId:"22222222-2222-4222-8222-222222222222",permissions:[],authType:"session"};

test("registration settings require an admin session", async()=>{
  const a=registrationController(undefined);const res=fakeRes();await a.ctl.getRegistrationSettings(req(),res);
  const b=registrationController(client);const rb=fakeRes();await b.ctl.getRegistrationSettings(req(),rb);
  assert.equal(res.code,401);assert.equal(rb.code,403);
});

test("non privileged admins cannot write registration settings", async()=>{
  const {ctl}=registrationController({...admin,role:"noc"});const res=fakeRes();
  const out:any=await ctl.putRegistrationSettings({default_rate_group_id:null},req(),res);
  assert.equal(res.code,403);assert.equal(out.error.code,"PERMISSION_DENIED");
});

test("invalid group UUID is rejected before mutation or audit", async()=>{
  const {ctl,calls}=registrationController(admin);const res=fakeRes();
  const out:any=await ctl.putRegistrationSettings({default_rate_group_id:"not-a-uuid"},req(),res);
  assert.equal(res.code,400);assert.equal(out.error.code,"VALIDATION_ERROR");assert.equal(calls.audit.length,0);
});

test("valid save audits before/after and publishes settings event", async()=>{
  const {ctl,calls}=registrationController(admin);const res=fakeRes();
  const out:any=await ctl.putRegistrationSettings({default_rate_group_id:"11111111-1111-4111-8111-111111111111"},req(),res);
  assert.equal(res.code,0);assert.equal(out.ok,true);assert.equal(calls.audit.length,1);
  assert.equal(calls.publish[0][1].type,"portal.settings.updated");
});

test("self-registration fails closed outside database auth mode", async()=>{
  const auth=new AuthService({pg:undefined} as any);
  await assert.rejects(()=>auth.registerSelfServiceCustomer({},{}),(e:any)=>e.statusCode===503);
});
