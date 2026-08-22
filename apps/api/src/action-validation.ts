import type { ActionSchema } from "@vos/shared";

function bad(message:string,details?:unknown){return Object.assign(new Error(message),{statusCode:400,code:"VALIDATION_ERROR",details})}
export function validateActionInput(schema:ActionSchema,input:any){
  const src=input&&typeof input==="object"&&!Array.isArray(input)?input:{};
  const out:Record<string,unknown>={};
  for(const f of schema.fields){
    let v=src[f.name];
    if((v===undefined||v===null||v==="")&&f.required)throw bad(`${f.label} is required`,{field:f.name});
    if(v===undefined||v===null||v==="")continue;
    if(f.type==="number"){
      const n=Number(v);if(!Number.isFinite(n))throw bad(`${f.label} must be a valid number`,{field:f.name});out[f.name]=n;continue;
    }
    if(f.type==="boolean"){
      if(typeof v==="string")v=v==="true"||v==="1";out[f.name]=Boolean(v);continue;
    }
    if(f.type==="json"){
      if(typeof v==="string"){try{v=JSON.parse(v)}catch{throw bad(`${f.label} must be valid JSON`,{field:f.name})}}
      if(typeof v!=="object")throw bad(`${f.label} must be JSON`,{field:f.name});out[f.name]=v;continue;
    }
    if(f.type==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))throw bad(`${f.label} must be a valid email`,{field:f.name});
    if(f.type==="date"&&Number.isNaN(new Date(String(v)).getTime()))throw bad(`${f.label} must be a valid date`,{field:f.name});
    if(f.type==="select"&&f.options?.length&&!f.options.includes(String(v)))throw bad(`${f.label} has an invalid value`,{field:f.name});
    out[f.name]=String(v);
  }
  return out;
}
