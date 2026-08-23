import type { AuthContext, ProductApiDefinition } from "@vos/shared";

const write=(m:string)=>m!=="GET"&&m!=="HEAD";
const pathHas=(path:string,parts:string[])=>parts.some(x=>path.includes(x));

export function requiredApiScope(method:string,path:string){
  const action=write(method)?"write":"read";
  if(path.includes("/cdr"))return `cdr:${action}`;
  if(path.includes("/calls"))return `calls:${action}`;
  if(path.includes("/gateways"))return `gateways:${action}`;
  if(path.includes("/rates")||path.includes("/packages"))return `rates:${action}`;
  if(path.includes("/payments")||path.includes("/deposits")||path.includes("/billing"))return `billing:${action}`;
  if(path.includes("/reports")||path.includes("/downloads")||path.includes("/report-schedules"))return `reports:${action}`;
  if(path.includes("/webhooks"))return `webhooks:${action}`;
  if(path.includes("/api-keys")||path.includes("/developer"))return `api:${action}`;
  if(path.includes("/support"))return `support:${action}`;
  return `portal:${action}`;
}

function allowClientRole(role:string,method:string,path:string){
  const isWrite=write(method);
  if(role==="owner")return true;
  if(role==="read_only")return !isWrite;
  if(role==="billing_client"){
    const allowed=pathHas(path,["/dashboard","/balance","/billing","/payments","/deposits","/cdr","/reports","/report-schedules","/downloads","/rates","/devices","/notifications","/notification-preferences","/support","/me/profile"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/deposits","/reports","/report-schedules","/notification-preferences","/support","/me/profile"]);
  }
  if(role==="technical"){
    const allowed=pathHas(path,["/dashboard","/status","/calls","/cdr","/analytics","/gateways","/rates","/devices","/notifications","/support","/me/profile"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/gateways/","/support/","/notification-preferences","/me/profile"]);
  }
  if(role==="api_manager"){
    const allowed=pathHas(path,["/developer","/api-keys","/webhooks","/webhook-deliveries","/me/profile"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/api-keys","/webhooks"]);
  }
  return false;
}

function allowAdminRole(role:string,method:string,path:string){
  const isWrite=write(method);
  if(role==="super_admin")return true;
  if(role==="read_only_admin")return !isWrite;
  if(role==="noc"){
    const allowed=pathHas(path,["/noc","/system/health","/system/performance","/system/processes","/system/servers","/alarms","/gateways","/phones","/calls","/cdr","/analytics","/tools","/registration","/routing-analysis","/devices"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/alarms/","/calls/live/","/tools/"]);
  }
  if(role==="billing"){
    const allowed=pathHas(path,["/customers","/billing","/payments","/reports","/report-schedules","/rates","/packages","/cdr"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/payments","/adjustments","/report-schedules"]);
  }
  if(role==="commercial"){
    const allowed=pathHas(path,["/customers","/rates","/packages","/reports","/report-schedules","/billing/revenue","/analytics"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/customers","/rates","/packages","/report-schedules"]);
  }
  if(role==="support"){
    const allowed=pathHas(path,["/customers","/cdr","/gateways","/phones","/calls","/support","/devices"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/support/"]);
  }
  if(role==="security_admin"){
    const allowed=pathHas(path,["/security","/integrations","/audit","/system/logs","/system/information","/system/health"]);
    if(!allowed)return false;
    if(!isWrite)return true;
    return pathHas(path,["/security/","/integrations/"]);
  }
  return false;
}

export function authorizeProductApi(ctx:AuthContext|undefined,def:ProductApiDefinition){
  if(!ctx)return {ok:false,statusCode:401,code:"UNAUTHENTICATED",message:"Authentication required"};
  const expected=def.sides;
  if(expected.length===1 && expected[0]==="Admin" && ctx.side!=="admin")return {ok:false,statusCode:403,code:"FORBIDDEN",message:"Admin session required"};
  if(expected.length===1 && expected[0]==="Client" && ctx.side!=="client")return {ok:false,statusCode:403,code:"FORBIDDEN",message:"Client session required"};

  if(ctx.authType==="api_key"){
    if(ctx.side!=="client")return {ok:false,statusCode:403,code:"FORBIDDEN",message:"API keys cannot access admin endpoints"};
    const scope=requiredApiScope(def.method,def.path),scopes=ctx.scopes??[];
    if(!scopes.includes("*")&&!scopes.includes(scope))return {ok:false,statusCode:403,code:"INSUFFICIENT_SCOPE",message:`API key requires scope ${scope}`};
    // API keys are non-interactive credentials. Session, MFA, invitation and browser-profile
    // workflows must never be reachable with them even if a broad scope was created.
    if(pathHas(def.path,["/me/sessions","/me/mfa","/team","/invitations","/deposits"]))return {ok:false,statusCode:403,code:"INTERACTIVE_SESSION_REQUIRED",message:"This operation requires an interactive user session"};
    return {ok:true};
  }

  const allowed=ctx.side==="client"?allowClientRole(ctx.role,def.method,def.path):allowAdminRole(ctx.role,def.method,def.path);
  if(!allowed)return {ok:false,statusCode:403,code:"FORBIDDEN",message:"Role is not authorized for this resource/action"};
  // Database-configured permissions are a least-privilege constraint on top of the
  // built-in role boundary. They can remove access but never elevate a role beyond
  // its hard-coded safety boundary. Empty means use the built-in role policy.
  const permissions=ctx.permissions??[];
  if(permissions.length){
    const required=requiredApiScope(def.method,def.path);
    if(!permissions.includes("*")&&!permissions.includes(required))return {ok:false,statusCode:403,code:"DYNAMIC_PERMISSION_DENIED",message:`Role permission set requires ${required}`};
  }
  return {ok:true};
}

export function validateBrowserOrigin(headers:Record<string,unknown>,method:string,authSource:"cookie"|"bearer"|undefined){
  if(method==="GET"||method==="HEAD"||method==="OPTIONS"||authSource!=="cookie")return true;
  const origin=String(headers.origin??"");
  if(!origin)return false;
  const allowed=(process.env.WEB_URL??"http://localhost:5027").split(",").map(x=>x.trim()).filter(Boolean);
  return allowed.includes(origin);
}
