import { normalizeFoundingLead } from '../_shared/founding.mjs';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestPost({request,env}){
  if(!env.LEADS) return json({error:'Founding signup is not connected yet.',code:'NOT_CONFIGURED'},503);
  const length=Number(request.headers.get('content-length') || 0);
  if(length>5000) return json({error:'Request is too large.'},413);
  let input;
  try{ input=await request.json(); }catch{ return json({error:'Invalid JSON request.'},400); }
  if(input?.company) return json({ok:true},201);
  let lead;
  try{ lead=normalizeFoundingLead(input); }catch(error){ return json({error:error.message},400); }
  const id=crypto.randomUUID();
  const createdAt=new Date().toISOString();
  try{
    await env.LEADS.prepare(`INSERT INTO founding_leads (id,email,source,consent,created_at,status) VALUES (?1,?2,?3,1,?4,'active') ON CONFLICT(email) DO UPDATE SET consent=1, source=excluded.source, updated_at=excluded.created_at, status='active'`)
      .bind(id,lead.email,lead.source,createdAt).run();
  }catch{
    return json({error:'Founding signup is temporarily unavailable.'},503);
  }
  return json({ok:true},201);
}

export function onRequestGet(){ return json({error:'Method not allowed.'},405); }
