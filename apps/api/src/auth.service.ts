import { Inject, Injectable } from "@nestjs/common";
import crypto from "node:crypto";
import type { AuthContext } from "@vos/shared";
export type { AuthContext } from "@vos/shared";
import { DataSourcesService } from "./data-sources.service.js";

const b64=(x:Buffer|string)=>Buffer.from(x).toString("base64url");
const sha256=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const scrypt=(password:string,salt:Buffer)=>new Promise<Buffer>((resolve,reject)=>crypto.scrypt(password,salt,64,(e,k)=>e?reject(e):resolve(k as Buffer)));

function base32Encode(buf:Buffer){const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits="",out="";for(const b of buf)bits+=b.toString(2).padStart(8,"0");for(let i=0;i<bits.length;i+=5){const c=bits.slice(i,i+5).padEnd(5,"0");out+=alphabet[parseInt(c,2)]}return out}
function base32Decode(s:string){const alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let bits="";for(const ch of s.toUpperCase().replace(/=|\s/g,"")){const i=alphabet.indexOf(ch);if(i<0)throw new Error("Invalid base32");bits+=i.toString(2).padStart(5,"0")}const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(bytes)}
function hotp(secret:string,counter:number){const key=base32Decode(secret);const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac("sha1",key).update(b).digest();const o=h[h.length-1]&15;const n=(h.readUInt32BE(o)&0x7fffffff)%1_000_000;return String(n).padStart(6,"0")}
function verifyTotp(secret:string,code:string){if(!/^\d{6}$/.test(code))return false;const t=Math.floor(Date.now()/1000/30);const supplied=Buffer.from(code);return [-1,0,1].some(d=>{const expected=Buffer.from(hotp(secret,t+d));return expected.length===supplied.length&&crypto.timingSafeEqual(expected,supplied)})}

@Injectable()
export class AuthService {
  private secret=process.env.SESSION_SECRET ?? "dev-secret-change-me";
  private authMode=process.env.AUTH_MODE??"demo";
  private mfaTickets=new Map<string,any>();
  private pendingMfa=new Map<string,any>();
  private demoMfa=new Map<string,string>();
  private demoRecovery=new Map<string,Set<string>>();
  constructor(@Inject(DataSourcesService) private sources:DataSourcesService){}

  private signBody(payload:AuthContext){
    const encoded=b64(JSON.stringify(payload));
    const sig=crypto.createHmac("sha256",this.secret).update(encoded).digest("base64url");
    return `${encoded}.${sig}`;
  }
  private verifySignature(token:string):AuthContext|undefined{
    const [body,sig,extra]=token.split(".");if(!body||!sig||extra)return;
    const expected=crypto.createHmac("sha256",this.secret).update(body).digest("base64url");
    try{if(!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return}catch{return}
    try{const p=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as AuthContext;if(!p.exp||p.exp<Math.floor(Date.now()/1000))return;return p}catch{return}
  }
  tokenFromHeaders(headers:Record<string,unknown>){
    const auth=String(headers.authorization??"");if(auth.startsWith("Bearer "))return {token:auth.slice(7),source:"bearer" as const};
    const cookie=String(headers.cookie??"");const name=process.env.NODE_ENV==="production"?"__Host-vos_session":"vos_session";const token=cookie.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1);return token?{token,source:"cookie" as const}:undefined;
  }
  async resolveContext(headers:Record<string,unknown>,ip?:string):Promise<AuthContext|undefined>{
    const found=this.tokenFromHeaders(headers);if(!found)return;
    if(found.source==="bearer"&&found.token.startsWith("vos_")){
      const key=await this.sources.findApiKey(found.token,ip);if(!key)return;
      const now=Math.floor(Date.now()/1000);return {userId:`api:${key.id}`,email:"api-key",role:"api_manager",tenantId:key.customer_id??undefined,organizationId:key.organization_id,side:"client",authType:"api_key",scopes:key.scopes??[],exp:now+300};
    }
    const p=this.verifySignature(found.token);if(!p||!p.sessionId)return;
    if(!(await this.sources.sessionActive(p.sessionId,p.userId,sha256(found.token))))return;
    // Re-resolve database role permission constraints on each request so a security
    // change takes effect immediately instead of waiting for session expiry.
    const permissions=this.authMode==="database"?await this.sources.permissionsForUser(p.userId):(p.permissions??[]);
    return {...p,permissions,authType:"session"};
  }

  async hashPassword(password:string){if(password.length<10)throw new Error("Password must be at least 10 characters");const salt=crypto.randomBytes(16);const key=await scrypt(password,salt);return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`}
  async verifyPassword(password:string,encoded:string|undefined|null){if(!encoded)return false;const [alg,saltB64,hashB64]=encoded.split("$");if(alg!=="scrypt"||!saltB64||!hashB64)return false;const key=await scrypt(password,Buffer.from(saltB64,"base64url"));const expected=Buffer.from(hashB64,"base64url");return key.length===expected.length&&crypto.timingSafeEqual(key,expected)}

  private demoUser(email:string,password:string,side:"admin"|"client"){
    const adminOk=email===(process.env.DEMO_ADMIN_EMAIL??"admin@example.com")&&password===(process.env.DEMO_ADMIN_PASSWORD??"Admin123!");
    const clientOk=email===(process.env.DEMO_CLIENT_EMAIL??"client@example.com")&&password===(process.env.DEMO_CLIENT_PASSWORD??"Client123!");
    if(side==="admin"&&adminOk)return {id:"usr_admin",email,display_name:"Demo Admin",roles:["super_admin"],organization_id:null,customer_id:null,mfa_enabled:false,mfa_secret_ciphertext:null};
    if(side==="client"&&clientOk)return {id:"usr_client",email,display_name:"Demo Client",roles:["owner"],organization_id:"org_demo",customer_id:"cus_acme",mfa_enabled:false,mfa_secret_ciphertext:null};
    return undefined;
  }
  private async consumeRateLimit(key:string,limit:number,windowSeconds:number){
    return this.sources.allowRateLimit(`auth:${key}`,limit,windowSeconds);
  }


  async login(email:string,password:string,side:"admin"|"client",meta:{ip?:string;userAgent?:string}){
    email=email.trim().toLowerCase();
    const rateKey=`login:${side}:${meta.ip??"unknown"}:${email}`;
    if(!(await this.consumeRateLimit(rateKey,Number(process.env.LOGIN_RATE_LIMIT??10),Number(process.env.LOGIN_RATE_WINDOW_SECONDS??900)))){
      await sleep(250);throw Object.assign(new Error("Too many sign-in attempts. Try again later."),{statusCode:429,code:"RATE_LIMITED"});
    }
    let user:any;
    if(this.authMode==="database") user=await this.sources.findDatabaseUser(email,side); else user=this.demoUser(email,password,side);
    const ok=this.authMode==="database"?!!user&&await this.verifyPassword(password,user.password_hash):!!user;
    if(!ok||user?.status&&user.status!=="active"||user?.invalid_after&&new Date(user.invalid_after)<=new Date()){await sleep(120);return undefined}
    const roleOrder=side==="admin"?["super_admin","security_admin","noc","billing","commercial","support","read_only_admin"]:["owner","technical","billing_client","api_manager","read_only"];const userRoles=Array.isArray(user.roles)?user.roles:[];const role=roleOrder.find(r=>userRoles.includes(r))??(side==="admin"?"read_only_admin":"read_only");
    const permissions=this.authMode==="database"?await this.sources.permissionsForUser(String(user.id)):[];
    const base={userId:String(user.id),email:String(user.email),role,tenantId:user.customer_id?String(user.customer_id):undefined,organizationId:user.organization_id?String(user.organization_id):undefined,permissions,side};
    if(user.mfa_enabled){const ticket=await this.createMfaTicket({...base,mfaSecretCiphertext:user.mfa_secret_ciphertext??null});return {mfaRequired:true as const,ticket}}
    const session=await this.createSession(base,meta);if(this.authMode==="database")await this.sources.updateLastLogin(String(user.id));return {mfaRequired:false as const,...session};
  }

  private encryptionKey(){const configured=process.env.ENCRYPTION_KEY;if(configured){const b=Buffer.from(configured,"base64");if(b.length!==32)throw new Error("ENCRYPTION_KEY must be 32 bytes encoded as base64");return b}return crypto.createHash("sha256").update(this.secret).digest()}
  private encrypt(v:string){const key=this.encryptionKey(),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key,iv);const enc=Buffer.concat([cipher.update(v,"utf8"),cipher.final()]),tag=cipher.getAuthTag();return [iv,tag,enc].map(x=>x.toString("base64url")).join(".")}
  private decrypt(v:string){const [ivb,tagb,encb]=v.split(".");const decipher=crypto.createDecipheriv("aes-256-gcm",this.encryptionKey(),Buffer.from(ivb,"base64url"));decipher.setAuthTag(Buffer.from(tagb,"base64url"));return Buffer.concat([decipher.update(Buffer.from(encb,"base64url")),decipher.final()]).toString("utf8")}

  private async createMfaTicket(data:any){const ticket=crypto.randomBytes(32).toString("base64url"),hash=sha256(ticket),payload={...data,expires:Date.now()+5*60_000};if(this.sources.redis){await this.sources.redis.set(`mfa:ticket:${hash}`,JSON.stringify(payload),{EX:300})}else this.mfaTickets.set(hash,payload);return ticket}
  private async takeMfaTicket(ticket:string){const hash=sha256(ticket);let raw:any;if(this.sources.redis){const s=await this.sources.redis.getDel(`mfa:ticket:${hash}`);raw=s?JSON.parse(s):undefined}else{raw=this.mfaTickets.get(hash);this.mfaTickets.delete(hash)}if(!raw||raw.expires<Date.now())return undefined;return raw}
  async verifyLoginMfa(ticket:string,code:string,meta:{ip?:string;userAgent?:string},expectedSide?:"admin"|"client"){
    const t=await this.takeMfaTicket(ticket);if(!t)return undefined;if(expectedSide&&t.side!==expectedSide)return undefined;let secret:string|undefined;
    if(this.authMode==="database"&&t.mfaSecretCiphertext)secret=this.decrypt(t.mfaSecretCiphertext);else secret=this.demoMfa.get(t.userId);
    let ok=!!secret&&/^\d{6}$/.test(code)&&verifyTotp(secret,code);
    if(!ok)ok=await this.consumeRecoveryCode(t.userId,code);
    if(!ok)return undefined;
    const permissions=this.authMode==="database"?await this.sources.permissionsForUser(String(t.userId)):(t.permissions??[]);
    const base={userId:t.userId,email:t.email,role:t.role,tenantId:t.tenantId,organizationId:t.organizationId,permissions,side:t.side as "admin"|"client"};const session=await this.createSession(base,meta);if(this.authMode==="database")await this.sources.updateLastLogin(String(t.userId));return session;
  }

  private async createSession(base:Omit<AuthContext,"exp"|"sessionId"|"authType">,meta:{ip?:string;userAgent?:string}){
    const ttl=Number(process.env.SESSION_TTL_SECONDS??43200);const exp=Math.floor(Date.now()/1000)+ttl;const sessionId=crypto.randomUUID();const payload:AuthContext={...base,sessionId,authType:"session",exp};const token=this.signBody(payload);await this.sources.createSession(sessionId,base.userId,sha256(token),meta,new Date(exp*1000));return {token,user:payload};
  }

  async listSessions(ctx:AuthContext){return this.sources.listSessions(ctx.userId)}
  async revokeSession(ctx:AuthContext,id:string){return this.sources.revokeSession(id,ctx.userId)}

  private async storePendingMfa(id:string,payload:any){if(this.sources.redis)await this.sources.redis.set(`mfa:enroll:${id}`,JSON.stringify(payload),{EX:600});else this.pendingMfa.set(id,payload)}
  private async getPendingMfa(id:string){if(this.sources.redis){const x=await this.sources.redis.get(`mfa:enroll:${id}`);return x?JSON.parse(x):undefined}return this.pendingMfa.get(id)}
  private async deletePendingMfa(id:string){if(this.sources.redis)await this.sources.redis.del(`mfa:enroll:${id}`);else this.pendingMfa.delete(id)}
  async configureMfa(ctx:AuthContext,input:any){
    if(ctx.authType==="api_key")throw Object.assign(new Error("MFA requires an interactive user session"),{statusCode:403,code:"SESSION_REQUIRED"});
    const action=String(input.action??"");
    if(action==="enroll"){
      const secret=base32Encode(crypto.randomBytes(20)),enrollmentId=crypto.randomUUID();await this.storePendingMfa(enrollmentId,{userId:ctx.userId,secret,expires:Date.now()+600_000});const label=encodeURIComponent(ctx.email);const issuer=encodeURIComponent(process.env.APP_NAME??"CallWork");return {enrollmentId,secret,otpauthUrl:`otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&digits=6&period=30`};
    }
    if(action==="verify"){
      const pending=await this.getPendingMfa(String(input.enrollmentId??""));if(!pending||pending.userId!==ctx.userId||pending.expires<Date.now())throw Object.assign(new Error("MFA enrollment expired"),{statusCode:400,code:"MFA_ENROLLMENT_EXPIRED"});if(!verifyTotp(pending.secret,String(input.code??"")))throw Object.assign(new Error("Invalid verification code"),{statusCode:400,code:"INVALID_MFA_CODE"});
      const recovery=Array.from({length:8},()=>crypto.randomBytes(5).toString("hex"));
      if(this.sources.pg){const enc=this.encrypt(pending.secret);const client=await this.sources.pg.connect();try{await client.query("BEGIN");await client.query("UPDATE users SET mfa_enabled=true,mfa_secret_ciphertext=$2,updated_at=now() WHERE id=$1",[ctx.userId,enc]);await client.query("DELETE FROM mfa_recovery_codes WHERE user_id=$1",[ctx.userId]);for(const c of recovery)await client.query("INSERT INTO mfa_recovery_codes(user_id,code_hash) VALUES($1,$2)",[ctx.userId,sha256(c)]);await client.query("COMMIT")}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}}else{this.demoMfa.set(ctx.userId,pending.secret);this.demoRecovery.set(ctx.userId,new Set(recovery.map(sha256)))}await this.deletePendingMfa(String(input.enrollmentId));return {enabled:true,recoveryCodes:recovery};
    }
    if(action==="disable"){
      const code=String(input.code??"");let secret:string|undefined;if(this.sources.pg){const r=await this.sources.pg.query("SELECT mfa_secret_ciphertext FROM users WHERE id=$1",[ctx.userId]);if(r.rows[0]?.mfa_secret_ciphertext)secret=this.decrypt(r.rows[0].mfa_secret_ciphertext)}else secret=this.demoMfa.get(ctx.userId);const ok=(!!secret&&verifyTotp(secret,code))||(await this.consumeRecoveryCode(ctx.userId,code));if(!ok)throw Object.assign(new Error("Invalid MFA code"),{statusCode:400,code:"INVALID_MFA_CODE"});if(this.sources.pg){await this.sources.pg.query("UPDATE users SET mfa_enabled=false,mfa_secret_ciphertext=NULL,updated_at=now() WHERE id=$1",[ctx.userId]);await this.sources.pg.query("DELETE FROM mfa_recovery_codes WHERE user_id=$1",[ctx.userId])}else{this.demoMfa.delete(ctx.userId);this.demoRecovery.delete(ctx.userId)}return {enabled:false};
    }
    throw Object.assign(new Error("Unsupported MFA action"),{statusCode:400,code:"INVALID_MFA_ACTION"});
  }
  private async consumeRecoveryCode(userId:string,code:string){const h=sha256(code.trim());if(this.sources.pg){const r=await this.sources.pg.query("UPDATE mfa_recovery_codes SET used_at=now() WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL RETURNING 1",[userId,h]);return r.rowCount===1}const set=this.demoRecovery.get(userId);if(set?.has(h)){set.delete(h);return true}return false}

  async requestPasswordReset(email:string,side:"admin"|"client"){
    const normalized=email.trim().toLowerCase();
    if(!(await this.consumeRateLimit(`reset:${side}:${normalized}`,Number(process.env.RESET_RATE_LIMIT??5),Number(process.env.RESET_RATE_WINDOW_SECONDS??3600))))return {accepted:true};
    if(this.authMode!=="database")return {accepted:true,demo:true};
    const user=await this.sources.findDatabaseUser(normalized,side);if(!user)return {accepted:true};
    const token=crypto.randomBytes(32).toString("base64url");
    await this.sources.pg!.query("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '30 minutes')",[user.id,sha256(token)]);
    // Never reveal account existence through a delivery-provider failure. The failure is logged
    // server-side while the public response remains the same as for an unknown address.
    try{await this.deliverPasswordReset(String(user.email),token,side)}catch(e){console.error("password reset delivery failed",e)}
    return {accepted:true};
  }
  private async deliverPasswordReset(email:string,token:string,side:string){const url=process.env.PASSWORD_RESET_DELIVERY_WEBHOOK;if(!url){if(process.env.NODE_ENV!=="production")console.log(`[dev password reset] ${email} token=${token}`);return}const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json","authorization":process.env.PASSWORD_RESET_DELIVERY_TOKEN?`Bearer ${process.env.PASSWORD_RESET_DELIVERY_TOKEN}`:""},body:JSON.stringify({email,token,side})});if(!r.ok)throw new Error(`Password reset delivery failed: HTTP ${r.status}`)}
  async resetPassword(token:string,password:string){if(this.authMode!=="database")throw Object.assign(new Error("Password reset is available in database auth mode"),{statusCode:400,code:"DATABASE_AUTH_REQUIRED"});const hash=sha256(token);const client=await this.sources.pg!.connect();try{await client.query("BEGIN");const r=await client.query("SELECT * FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE",[hash]);if(!r.rowCount)throw Object.assign(new Error("Invalid or expired reset token"),{statusCode:400,code:"INVALID_RESET_TOKEN"});const passwordHash=await this.hashPassword(password);await client.query("UPDATE users SET password_hash=$2,last_password_change_at=now(),updated_at=now() WHERE id=$1",[r.rows[0].user_id,passwordHash]);await client.query("UPDATE password_reset_tokens SET used_at=now() WHERE id=$1",[r.rows[0].id]);await client.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",[r.rows[0].user_id]);await client.query("COMMIT");return {reset:true}}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}}

  async createDatabaseUser(input:any,side:"admin"|"client"="admin",actor?:AuthContext){
    if(!this.sources.pg)throw Object.assign(new Error("Database is required"),{statusCode:503,code:"DATABASE_REQUIRED"});
    const roleCode=String(input.role??"");
    if(side==="admin"&&roleCode==="super_admin"&&actor?.role!=="super_admin")throw Object.assign(new Error("Only a Super Admin may create another Super Admin"),{statusCode:403,code:"FORBIDDEN"});
    if(actor?.organizationId&&input.organizationId&&String(input.organizationId)!==actor.organizationId)throw Object.assign(new Error("Cannot create a user outside your organization scope"),{statusCode:403,code:"FORBIDDEN"});
    const organizationId=actor?.organizationId??input.organizationId??null;
    const passwordHash=await this.hashPassword(String(input.temporaryPassword));const client=await this.sources.pg.connect();try{await client.query("BEGIN");const role=await client.query("SELECT id FROM roles WHERE code=$1 AND scope=$2",[roleCode,side]);if(!role.rowCount)throw Object.assign(new Error("Unknown role"),{statusCode:400,code:"INVALID_ROLE"});const u=await client.query("INSERT INTO users(organization_id,email,password_hash,display_name,user_type,invalid_after) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,email,display_name,user_type,status,created_at",[organizationId,String(input.email).trim().toLowerCase(),passwordHash,String(input.displayName),side,input.expiresAt??null]);await client.query("INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)",[u.rows[0].id,role.rows[0].id]);await client.query("COMMIT");return {...u.rows[0],role:roleCode}}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}}

  async registerSelfServiceCustomer(rawInput:any,meta:{ip?:string;userAgent?:string}){
    if(this.authMode!=="database") throw Object.assign(new Error("Self-registration requires database authentication"),{statusCode:503,code:"DATABASE_AUTH_REQUIRED"});
    if(!this.sources.pg) throw Object.assign(new Error("Database is required"),{statusCode:503,code:"DATABASE_REQUIRED"});
    const email=String(rawInput?.email??"").trim().toLowerCase();
    const organizationName=String(rawInput?.organizationName??"").trim().replace(/\s+/g," ");
    const phone=String(rawInput?.phone??"").trim();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.length>320) throw Object.assign(new Error("Enter a valid email address"),{statusCode:400,code:"VALIDATION_ERROR",field:"email"});
    if(organizationName.length<2||organizationName.length>120) throw Object.assign(new Error("Organization name must be 2-120 characters"),{statusCode:400,code:"VALIDATION_ERROR",field:"organizationName"});
    if(phone.length<7||phone.length>32||!/^\+[0-9 ()-]+$/.test(phone)) throw Object.assign(new Error("Enter a valid phone number"),{statusCode:400,code:"VALIDATION_ERROR",field:"phone"});
    if(!(await this.consumeRateLimit(`register:ip:${meta.ip??"unknown"}`,Number(process.env.REGISTER_IP_RATE_LIMIT??10),Number(process.env.REGISTER_RATE_WINDOW_SECONDS??900)))||
       !(await this.consumeRateLimit(`register:email:${email}`,Number(process.env.REGISTER_EMAIL_RATE_LIMIT??5),Number(process.env.REGISTER_RATE_WINDOW_SECONDS??900))))
      throw Object.assign(new Error("Too many registration attempts. Try again later."),{statusCode:429,code:"RATE_LIMITED"});

    const passwordHash=await this.hashPassword(String(rawInput?.password??""));
    const client=await this.sources.pg.connect();
    let created:any;
    try{
      await client.query("BEGIN");
      let settings:any;
      try{settings=await client.query("SELECT default_rate_group_id FROM registration_settings WHERE singleton=true")}
      catch(e){throw Object.assign(new Error("Registration is temporarily unavailable because settings cannot be read"),{statusCode:503})}
      const configuredGroupId=settings.rows[0]?.default_rate_group_id ?? null;
      let rateGroupId:string|null=null,rateGroupName:string|null=null;
      if(configuredGroupId){
        const group=await client.query("SELECT id,name FROM rate_groups WHERE id=$1 AND status='active' AND side IN ('customer','shared')",[configuredGroupId]);
        if(group.rowCount){rateGroupId=group.rows[0].id;rateGroupName=group.rows[0].name}
      }
      if((await client.query("SELECT 1 FROM users WHERE email=$1",[email])).rowCount)
        throw Object.assign(new Error("An account with this email already exists"),{statusCode:409,code:"DUPLICATE_EMAIL",field:"email"});
      const organizationId=(await client.query("INSERT INTO organizations(name,status) VALUES($1,'active') RETURNING id",[organizationName])).rows[0].id;
      const role=await client.query("SELECT id FROM roles WHERE code='owner' AND scope='client'");
      if(!role.rowCount) throw Object.assign(new Error("Client role configuration is missing"),{statusCode:503});
      const userId=(await client.query(
        `INSERT INTO users(organization_id,email,password_hash,display_name,user_type) VALUES($1,$2,$3,$4,'client') RETURNING id`,
        [organizationId,email,passwordHash,email.split("@")[0]]
      )).rows[0].id;
      const customerId=(await client.query(
        `INSERT INTO customers(organization_id,account_name,currency,rate_group_id) VALUES($1,$2,'USD',$3) RETURNING id`,
        [organizationId,organizationName,rateGroupId]
      )).rows[0].id;
      await client.query("INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)",[userId,role.rows[0].id]);
      await client.query(
        `INSERT INTO ledger_entries(customer_id,direction,amount,currency,reason,idempotency_key) VALUES($1,'credit',0,'USD','Account created',$2)`,
        [customerId,`self-registration:${customerId}`]
      );
      await client.query("COMMIT");
      created={organizationId,userId,email,customerId,rateGroupId,rateGroupName};
    }catch(e:any){
      await client.query("ROLLBACK");
      if(e?.code==="23505") throw Object.assign(new Error("An account with this email already exists"),{statusCode:409,code:"DUPLICATE_EMAIL",field:"email"});
      throw e;
    }finally{client.release()}

    const actor={userId:created.userId,email,role:"owner",tenantId:created.customerId,organizationId:created.organizationId,permissions:[],side:"client" as const,authType:"session" as const,sessionId:"registration",exp:Math.floor(Date.now()/1000)};
    const request_id=crypto.randomUUID();
    try{
      await this.sources.audit(actor,request_id,"POST /api/v1/auth/register","customer",created.customerId,undefined,{account_name:organizationName,rate_group_id:created.rateGroupId},meta.ip);
      await this.sources.audit(actor,request_id,"customer.rate_group_assigned","customer",created.customerId,{rate_group_id:null},{rate_group_id:created.rateGroupId,rate_group_name:created.rateGroupName},meta.ip);
      await this.sources.publish("portal.events",{id:request_id,type:"portal.customer.created",organization_id:created.organizationId,customer_id:created.customerId,user_id:created.userId,actor:created.userId,created_at:new Date().toISOString()},request_id);
    }catch{/* transactional signup remains authoritative; observability failures are separately observable */}
    const permissions=await this.sources.permissionsForUser(created.userId);
    const session=await this.createSession({userId:created.userId,email,role:"owner",tenantId:created.customerId,organizationId:created.organizationId,permissions,side:"client"},meta);
    return {...session,rate_group_id:created.rateGroupId,rate_group_name:created.rateGroupName};
  }

  async adminResetCustomerPassword(customerId:string,input:any,actor?:AuthContext){
    const newPassword=String(input?.newPassword??input?.password??"");
    const targetUserId=input?.userId?String(input.userId):undefined;
    const targetEmail=input?.email?String(input.email):undefined;
    if(!newPassword||newPassword.length<10)throw Object.assign(new Error("New password must be at least 10 characters"),{statusCode:400,code:"VALIDATION_ERROR"});
    if(newPassword.length>128)throw Object.assign(new Error("Password must be at most 128 characters"),{statusCode:400,code:"VALIDATION_ERROR"});
    const hash=await this.hashPassword(newPassword);
    return this.sources.adminResetCustomerUserPassword(customerId,targetUserId,targetEmail,hash,actor!);
  }
}
