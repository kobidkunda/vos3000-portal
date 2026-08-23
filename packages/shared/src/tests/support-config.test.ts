import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidTelegramHandle,
  isValidTeamsId,
  buildTelegramUrl,
  buildTeamsUrl,
  normalizeSupportConfigPutBody,
  validateSupportConfigPutBody,
  buildSupportConfigData,
  defaultSupportConfig,
} from "../index.js";

// ---- isValidTelegramHandle ----
test("telegram handle my_support_bot is valid",()=>assert.equal(isValidTelegramHandle("my_support_bot"),true));
test("telegram handle @my_bot is valid (leading @ stripped)",()=>assert.equal(isValidTelegramHandle("@my_bot"),true));
test("telegram handle https://t.me/my_bot is valid",()=>assert.equal(isValidTelegramHandle("https://t.me/my_bot"),true));
test("telegram handle javascript:alert(1) is invalid",()=>assert.equal(isValidTelegramHandle("javascript:alert(1)"),false));
test("telegram handle data:text/html is invalid",()=>assert.equal(isValidTelegramHandle("data:text/html,<script>"),false));
test("telegram handle with backslash is invalid",()=>assert.equal(isValidTelegramHandle("my\\bot"),false));
test("empty telegram handle is invalid",()=>assert.equal(isValidTelegramHandle(""),false));
test("null telegram handle is invalid",()=>assert.equal(isValidTelegramHandle(null as any),false));
test("too-short telegram handle ab is invalid",()=>assert.equal(isValidTelegramHandle("ab"),false));
test("33-char telegram handle is invalid",()=>assert.equal(isValidTelegramHandle("a".repeat(33)),false));
test("32-char telegram handle is valid",()=>assert.equal(isValidTelegramHandle("a".repeat(32)),true));
test("telegram handle with spaces is invalid",()=>assert.equal(isValidTelegramHandle("my bot"),false));

// ---- isValidTeamsId ----
test("teams email support@example.com is valid",()=>assert.equal(isValidTeamsId("support@example.com"),true));
test("teams handle sales-team is valid",()=>assert.equal(isValidTeamsId("sales-team"),true));
test("teams id javascript:alert(1) is invalid",()=>assert.equal(isValidTeamsId("javascript:alert(1)"),false));
test("empty teams id is invalid",()=>assert.equal(isValidTeamsId(""),false));
test("321-char teams id is invalid",()=>assert.equal(isValidTeamsId("a".repeat(321)),false));
test("teams id with space is invalid",()=>assert.equal(isValidTeamsId("bad id"),false));
test("teams id with angle brackets is invalid",()=>assert.equal(isValidTeamsId("<script>"),false));

// ---- URL builders produce exact https strings ----
test("buildTelegramUrl returns exact https://t.me/my_bot123",()=>assert.equal(buildTelegramUrl("my_bot123"),"https://t.me/my_bot123"));
test("buildTelegramUrl strips leading @",()=>assert.equal(buildTelegramUrl("@my_bot"),"https://t.me/my_bot"));
test("buildTelegramUrl accepts t.me link input",()=>assert.equal(buildTelegramUrl("https://t.me/my_bot"),"https://t.me/my_bot"));
test("buildTeamsUrl encodes email",()=>assert.equal(buildTeamsUrl("support@example.com"),"https://teams.microsoft.com/l/chat/0/0?users=support%40example.com"));
test("buildTeamsUrl passes plain handle through",()=>assert.equal(buildTeamsUrl("sales-team"),"https://teams.microsoft.com/l/chat/0/0?users=sales-team"));

// ---- builders fail closed on invalid input ----
test("buildTelegramUrl throws VALIDATION_ERROR for javascript:evil",()=>assert.throws(()=>buildTelegramUrl("javascript:evil"),/VALIDATION_ERROR/));
test("buildTelegramUrl throws for empty input",()=>assert.throws(()=>buildTelegramUrl(""),/VALIDATION_ERROR/));
test("buildTeamsUrl throws VALIDATION_ERROR for bad id",()=>assert.throws(()=>buildTeamsUrl("bad id!"),/VALIDATION_ERROR/));

// ---- normalize + validate PutBody ----
test("normalize trims and coerces put body",()=>{
  const n=normalizeSupportConfigPutBody({enabled:true as any,label:"  Support  ",telegram:{enabled:true,handle:" @my_bot "},teams:{enabled:false,id:" x "}});
  assert.equal(n.enabled,true);
  assert.equal(n.label,"Support");
  assert.equal(n.telegram.handle,"@my_bot");
  assert.equal(n.teams.id,"x");
});
test("validate returns [] for fully valid body",()=>{
  const errs=validateSupportConfigPutBody({enabled:true,telegram:{enabled:true,handle:"my_bot"},teams:{enabled:true,id:"support@example.com"}});
  assert.deepEqual(errs,[]);
});
test("validate requires telegram.handle when telegram enabled",()=>{
  const errs=validateSupportConfigPutBody({enabled:true,telegram:{enabled:true,handle:""},teams:{enabled:false,id:""}});
  assert.equal(errs.length,1);
  assert.equal(errs[0].field,"telegram.handle");
  assert.equal(errs[0].code,"REQUIRED");
});
test("validate rejects bad telegram.handle when enabled",()=>{
  const errs=validateSupportConfigPutBody({enabled:true,telegram:{enabled:true,handle:"javascript:alert"},teams:{enabled:false,id:""}});
  assert.equal(errs.length,1);
  assert.equal(errs[0].field,"telegram.handle");
  assert.equal(errs[0].code,"VALIDATION_ERROR");
});
test("validate requires teams.id when teams enabled",()=>{
  const errs=validateSupportConfigPutBody({enabled:false,telegram:{enabled:false,handle:""},teams:{enabled:true,id:""}});
  assert.equal(errs.length,1);
  assert.equal(errs[0].field,"teams.id");
  assert.equal(errs[0].code,"REQUIRED");
});
test("validate rejects bad teams.id even when disabled",()=>{
  const errs=validateSupportConfigPutBody({enabled:false,telegram:{enabled:false,handle:""},teams:{enabled:false,id:"no spaces allowed"}});
  assert.equal(errs.length,1);
  assert.equal(errs[0].field,"teams.id");
});

// ---- buildSupportConfigData ----
test("buildSupportConfigData happy path builds urls and stamps actor",()=>{
  const prev=defaultSupportConfig();
  const data=buildSupportConfigData(
    {enabled:true,label:"Need help?",telegram:{enabled:true,handle:"https://t.me/MyBot_01"},teams:{enabled:true,id:"support@example.com"}},
    prev,
    "user-uuid-1"
  );
  assert.equal(data.enabled,true);
  assert.equal(data.label,"Need help?");
  assert.equal(data.telegram.handle,"MyBot_01");
  assert.equal(data.telegram.url,"https://t.me/MyBot_01");
  assert.equal(data.teams.url,"https://teams.microsoft.com/l/chat/0/0?users=support%40example.com");
  assert.equal(data.updatedBy,"user-uuid-1");
  assert.ok(!Number.isNaN(Date.parse(data.updatedAt)));
});
test("buildSupportConfigData falls back to previous updatedBy when actor empty",()=>{
  const prev=buildSupportConfigData({enabled:false,telegram:{enabled:false,handle:""},teams:{enabled:false,id:""}},null,"actor-a");
  const next=buildSupportConfigData({enabled:false,telegram:{enabled:false,handle:""},teams:{enabled:false,id:""}},prev,"");
  assert.equal(next.updatedBy,"actor-a");
});
test("buildSupportConfigData throws with details on invalid body",()=>{
  assert.throws(()=>buildSupportConfigData({enabled:true,telegram:{enabled:true,handle:"!!"},teams:{enabled:false,id:""}},null,"u"),(e:any)=>{
    assert.equal(e.code,"VALIDATION_ERROR");
    assert.ok(Array.isArray(e.details)&&e.details[0].field==="telegram.handle");
    return true;
  });
});

// ---- defaultSupportConfig ----
test("defaultSupportConfig is disabled with empty contacts",()=>{
  const d=defaultSupportConfig();
  assert.equal(d.enabled,false);
  assert.equal(d.telegram.enabled,false);
  assert.equal(d.telegram.url,"");
  assert.equal(d.teams.enabled,false);
  assert.equal(d.teams.url,"");
  assert.equal(d.updatedBy,"system");
});
