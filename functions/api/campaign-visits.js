const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
export async function onRequestPost({request,env}){
 const secret=env.VEYZLO_VISITS_READ_TOKEN,started=Date.parse(env.VEYZLO_VISITS_STARTED_AT||'');
 if(typeof secret!=='string'||secret.length<32||!Number.isFinite(started)||!env.TELEMETRY)return json({error:'Visit reporting is not configured'},503);
 const supplied=request.headers.get('authorization')||'';
 const hash=async text=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
 const [left,right]=await Promise.all([hash(supplied),hash('Bearer '+secret)]);let difference=0;for(let i=0;i<left.length;i++)difference|=left[i]^right[i];
 if(difference)return json({error:'Unauthorized'},401);
 let input;try{const text=await request.text();if(text.length>10000)return json({error:'Request too large'},413);input=JSON.parse(text);}catch{return json({error:'Invalid request'},400);}
 const refs=input?.references,from=Date.parse(input?.from),to=Date.parse(input?.to),now=Date.now();
 if(!Array.isArray(refs)||!refs.length||refs.length>100||new Set(refs).size!==refs.length||refs.some(r=>typeof r!=='string'||!/^vz_[a-f0-9]{48}$/.test(r))||!Number.isFinite(from)||!Number.isFinite(to)||from>=to||to>now||from<started||from<now-89*86400000)return json({error:'Valid references and a fully retained reporting interval are required'},400);
 try{
  const placeholders=refs.map(()=>'?').join(',');
  const result=await env.TELEMETRY.prepare("SELECT json_extract(details,'$.veyzlo_reference') AS reference, COUNT(DISTINCT session_id) AS pageLoads FROM product_events WHERE event_name='kit_page_viewed' AND path IN ('/survival-kit','/survival-kit.html') AND created_at >= ? AND created_at < ? AND json_extract(details,'$.veyzlo_reference') IN ("+placeholders+") GROUP BY json_extract(details,'$.veyzlo_reference')").bind(new Date(from).toISOString(),new Date(to).toISOString(),...refs).all();
  if(!Array.isArray(result.results))throw Error('Incomplete database response');
  const counts=new Map();for(const row of result.results){if(!refs.includes(row.reference)||counts.has(row.reference)||!Number.isSafeInteger(row.pageLoads)||row.pageLoads<0)throw Error('Invalid aggregate');counts.set(row.reference,row.pageLoads);}
  return json({source:'FoodMyWay recorded kit page loads',from:new Date(from).toISOString(),to:new Date(to).toISOString(),receivedAt:new Date().toISOString(),collectionStartedAt:new Date(started).toISOString(),complete:true,scope:'Recorded page loads only; not unique people. Bots and blocked telemetry affect coverage.',references:refs.map(reference=>({reference,pageLoads:counts.get(reference)||0}))});
 }catch{return json({error:'Visit reporting unavailable'},503);}
}
export function onRequestGet(){return json({error:'Method not allowed'},405);}
