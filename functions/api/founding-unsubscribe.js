function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[char]);
}

function page(title,message,{formAction='',email=''}={}){
  const form=formAction
    ? `<form method="post" action="${escapeHtml(formAction)}"><button type="submit">Unsubscribe ${escapeHtml(email)}</button></form>`
    : '';
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} — Food My Way</title><link rel="stylesheet" href="/legal.css"></head><body><div class="legal-shell"><nav class="legal-nav"><a href="/">← Food My Way</a></nav><main class="legal-card"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p>${form}</main></div></body></html>`,{
    headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}
  });
}

function error(message,status=400){
  const response=page('Unsubscribe link unavailable',message);
  return new Response(response.body,{status,headers:response.headers});
}

function tokenFrom(request){
  const url=new URL(request.url);
  return url.searchParams.get('token') || '';
}

async function validCredentials(request,env){
  if(!env.LEADS) return {error:'Email preferences are temporarily unavailable.',status:503};
  const token=tokenFrom(request);
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return {error:'This unsubscribe link is invalid or expired.',status:400};
  try{
    const lead=await env.LEADS.prepare("SELECT email FROM founding_leads WHERE unsubscribe_token=?1 AND status='active' LIMIT 1")
      .bind(token).first();
    if(!lead?.email) return {error:'This unsubscribe link is invalid or expired.',status:400};
    return {email:String(lead.email),token};
  }catch{return {error:'Email preferences are temporarily unavailable.',status:503};}
}

export async function onRequestGet({request,env}){
  const result=await validCredentials(request,env);
  if(result.error) return error(result.error,result.status);
  const action=`/api/founding-unsubscribe?token=${encodeURIComponent(result.token)}`;
  return page('Confirm unsubscribe','Use the button below to stop founding-access and product-update emails.',{formAction:action,email:result.email});
}

export async function onRequestPost({request,env}){
  const result=await validCredentials(request,env);
  if(result.error) return error(result.error,result.status);
  try{
    await env.LEADS.prepare("UPDATE founding_leads SET consent=0,status='unsubscribed',updated_at=?1 WHERE email=?2")
      .bind(new Date().toISOString(),result.email).run();
  }catch{return error('Email preferences are temporarily unavailable.',503);}
  return page('You are unsubscribed','Food My Way will not send further founding-access or product-update emails to this address.');
}
