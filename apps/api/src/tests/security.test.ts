import test from "node:test";
import assert from "node:assert/strict";
import { AuthService } from "../auth.service.js";
import { authorizeProductApi } from "../access-policy.js";

class FakeSources {
  sessions = new Map<string,{userId:string;hash:string;expiresAt:Date}>();
  redis = undefined;
  pg = undefined;
  async createSession(id:string,userId:string,tokenHash:string,_meta:any,expiresAt:Date){this.sessions.set(id,{userId,hash:tokenHash,expiresAt});return id;}
  async sessionActive(id:string,userId:string,tokenHash:string){const s=this.sessions.get(id);return !!s&&s.userId===userId&&s.hash===tokenHash&&s.expiresAt>new Date();}
  async allowRateLimit(){return true;}
  async permissionsForUser(){return [];}
  async findApiKey(){return undefined;}
  async updateLastLogin(){}
}

test("signed session rejects token tampering", async()=>{
  process.env.AUTH_MODE="demo";
  process.env.SESSION_SECRET="unit-test-session-secret-that-is-long-enough";
  const sources=new FakeSources();
  const auth=new AuthService(sources as any);
  const result=await auth.login("admin@example.com","Admin123!","admin",{});
  assert.ok(result && result.mfaRequired===false && "token" in result);
  if(!result || result.mfaRequired || !("token" in result))return;
  const good=await auth.resolveContext({authorization:`Bearer ${result.token}`});
  assert.equal(good?.side,"admin");
  const bad=await auth.resolveContext({authorization:`Bearer ${result.token}x`});
  assert.equal(bad,undefined);
});

test("client API key cannot cross into admin endpoint",()=>{
  const decision=authorizeProductApi({userId:"api:k",email:"api-key",role:"api_manager",organizationId:"org",tenantId:"cus",side:"client",authType:"api_key",scopes:["*"],exp:9999999999},{method:"GET",path:"/api/v1/admin/customers",sides:["Admin"],pages:["Customer Directory"],pageRoutes:["/admin/customers"]});
  assert.equal(decision.ok,false);
  assert.equal(decision.statusCode,403);
});

test("rate limiter enforces limits and resets after window", async () => {
  const { DataSourcesService } = await import("../data-sources.service.js");
  const ds = new DataSourcesService();
  const key = "test-ip-rate-limit";
  const limit = 3;
  const windowSec = 1;

  assert.equal(await ds.allowRateLimit(key, limit, windowSec), true);
  assert.equal(await ds.allowRateLimit(key, limit, windowSec), true);
  assert.equal(await ds.allowRateLimit(key, limit, windowSec), true);
  // 4th request exceeds limit
  assert.equal(await ds.allowRateLimit(key, limit, windowSec), false);

  // Wait for window expiration
  await new Promise((r) => setTimeout(r, 1100));
  assert.equal(await ds.allowRateLimit(key, limit, windowSec), true);
});
