"use client";
import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Icon } from "../../lib/icons";

export function RegistrationSettingsArchetype({title,purpose}:{title:string;purpose:string}) {
  const [groups,setGroups]=useState<any[]>([]);
  const [selected,setSelected]=useState("");
  const [current,setCurrent]=useState<any>(null);
  const [state,setState]=useState<"loading"|"ready"|"error"|"degraded"|"forbidden">("loading");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [confirming,setConfirming]=useState(false);

  async function load(){setState("loading");try{
    const [settingsRes,groupsRes]:any[]=await Promise.all([api("/api/v1/admin/settings/registration"),api("/api/v1/admin/rate-groups?status=active")]);
    setCurrent(settingsRes.data);setSelected(settingsRes.data?.default_rate_group_id?? "");setGroups(groupsRes.data??[]);setState("ready");
  }catch(e:any){setState(e.status===403?"forbidden":e?.raw?.error?.degraded||e?.details?.degraded?"degraded":"error");setMessage(e.message||"Settings unavailable")}}
  useEffect(()=>{void load()},[]);

  async function save(){
    setBusy(true);try{await api("/api/v1/admin/settings/registration",{method:"PUT",body:JSON.stringify({default_rate_group_id:selected||null})});setMessage("Registration default saved.");setConfirming(false);await load()}catch(e:any){setMessage(e.message||"Save failed")}finally{setBusy(false)}}

  return (
    <div className="content">
      <div className="pageHead"><div><h1>{title}</h1><p>{purpose}</p></div></div>
      {state==="loading" && <div className="card">Loading registration settings…</div>}
      {state==="error" && <div className="card" style={{borderColor:"var(--danger)"}}><strong>Unable to load settings.</strong><p>{message}</p><button className="btn secondary sm" onClick={load}>Retry</button></div>}
      {state==="degraded" && <div className="card" style={{borderColor:"var(--warning)",background:"var(--warning-bg)"}}><strong>Settings are degraded.</strong><p>{message}</p><button className="btn secondary sm" onClick={load}>Retry</button></div>}
      {state==="forbidden" && <div className="card"><strong>Permission denied.</strong><p>This setting requires <code>settings:write</code>.</p></div>}
      {state==="ready" && (
        <div className="card" style={{maxWidth:720}}>
          <div className="cardHead"><div className="cardTitle">Self-Registration Default Rate Group</div>{current?.updated_at&&<span className="badge mono">Updated {new Date(current.updated_at).toLocaleString()} · Actor {current.updated_by||"system"}</span>}</div>
          <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Default rate group</label>
          {groups.length===0 ? (
            <div style={{padding:"24px 0",color:"var(--muted)",fontSize:13}}>No active rate groups. Create a “Custom / On Request” group first.</div>
          ):(
            <select className="input" value={selected} onChange={e=>setSelected(e.target.value)} disabled={busy} style={{width:"100%"}}>
              <option value="">None — new signups remain Custom / On Request</option>
              {groups.map(g=><option key={g.id} value={g.id}>{g.name} · {Number(g.prefix_count||0).toLocaleString()} prefixes · Active</option>)}
            </select>
          )}
          <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>Admin-created group auto-assigned to new portal signups. Change per-customer in Customer Detail after request.</p>
          {message && <div className="notice" style={{marginTop:12}}><Icon name="check" size={14}/><span>{message}</span></div>}
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><button className="btn primary" disabled={busy||groups.length===0} onClick={()=>setConfirming(true)}>Save changes</button></div>
        </div>
      )}
      <ConfirmDialog isOpen={confirming} busy={busy} title="Update signup default" message="New self-registrations will receive the selected rate group." confirmLabel="Save default" onConfirm={save} onCancel={()=>setConfirming(false)}/>
    </div>
  );
}
