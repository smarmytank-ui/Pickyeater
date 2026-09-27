import { buildInstacartListPayload } from '../_shared/instacart.mjs';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestPost({request,env}){
  if(!env.INSTACART_API_KEY) return json({error:'Grocery checkout is not enabled yet.'},503);
  const length=Number(request.headers.get('content-length') || 0);
  if(length>50000) return json({error:'Shopping list is too large.'},413);
  let input;
  try{ input=await request.json(); }catch{ return json({error:'Invalid JSON request.'},400); }
  let payload;
  try{ payload=buildInstacartListPayload(input); }catch(error){ return json({error:error.message},400); }
  const base=env.INSTACART_ENV==='production' ? 'https://connect.instacart.com' : 'https://connect.dev.instacart.tools';
  const response=await fetch(`${base}/idp/v1/products/products_link`,{
    method:'POST',
    headers:{'accept':'application/json','authorization':`Bearer ${env.INSTACART_API_KEY}`,'content-type':'application/json'},
    body:JSON.stringify(payload)
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok) return json({error:'The grocery service could not create this list.'},502);
  const url=result.products_link_url;
  if(typeof url!=='string' || !url.startsWith('https://www.instacart.')) return json({error:'The grocery service returned an invalid link.'},502);
  return json({url});
}

export async function onRequestGet(){
  return json({enabled:false,message:'Use POST after grocery checkout is enabled.'},405);
}
