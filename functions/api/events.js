import { normalizeTelemetryEvent } from '../_shared/telemetry.mjs';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestPost({request,env}){
  if(!env.TELEMETRY) return json({error:'Telemetry is not configured.'},503);
  const length=Number(request.headers.get('content-length') || 0);
  if(length>4000) return json({error:'Request is too large.'},413);
  let input;
  try{ input=await request.json(); }catch{ return json({error:'Invalid JSON request.'},400); }
  let event;
  try{ event=normalizeTelemetryEvent(input); }catch(error){ return json({error:error.message},400); }
  try{
    const createdAt=new Date().toISOString();
    await env.TELEMETRY.batch([
      env.TELEMETRY.prepare("DELETE FROM product_events WHERE created_at < datetime('now','-90 days')"),
      env.TELEMETRY.prepare('INSERT INTO product_events (id,event_name,session_id,path,details,created_at) VALUES (?1,?2,?3,?4,?5,?6)')
        .bind(crypto.randomUUID(),event.event,event.sessionId,event.path,JSON.stringify(event.details),createdAt)
    ]);
  }catch{ return json({error:'Telemetry storage is unavailable.'},503); }
  return json({ok:true},201);
}

export function onRequestGet(){ return json({error:'Method not allowed.'},405); }
