import { normalizeAccountEmail, randomToken, sha256Hex } from '../../_shared/account.mjs';

const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const EMAIL_REQUESTS_PER_HOUR=5;
const EMAIL_COOLDOWN_SECONDS=60;
const GLOBAL_REQUESTS_PER_HOUR=100;

export async function onRequestPost({request,env}){
  if(!env.ACCOUNTS || !env.RESEND_API_KEY || !env.AUTH_FROM_EMAIL || !env.AUTH_ORIGIN) return json({error:'Cloud accounts are not configured.'},503);
  const length=Number(request.headers.get('content-length') || 0);
  if(length>4000) return json({error:'Request is too large.'},413);
  let input;
  try{ input=await request.json(); }catch{ return json({error:'Invalid JSON request.'},400); }
  let email;
  try{ email=normalizeAccountEmail(input?.email); }catch(error){ return json({error:error.message},400); }
  const now=Math.floor(Date.now()/1000);
  try{
    await env.ACCOUNTS.batch([
      env.ACCOUNTS.prepare('DELETE FROM sessions WHERE expires_epoch<=?1').bind(now),
      env.ACCOUNTS.prepare(`DELETE FROM login_challenges WHERE expires_epoch<=?1
        AND NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.challenge_id=login_challenges.id)`).bind(now)
    ]);
  }catch{}
  let recent;
  let globalRecent;
  try{
    recent=await env.ACCOUNTS.prepare('SELECT count(*) AS count, max(created_epoch) AS latest FROM login_challenges WHERE email=?1 AND created_epoch>?2')
      .bind(email,now-3600).first();
    globalRecent=await env.ACCOUNTS.prepare('SELECT count(*) AS count FROM login_challenges WHERE created_epoch>?1')
      .bind(now-3600).first();
  }catch{ return json({error:'Cloud account storage is temporarily unavailable.'},503); }
  if(Number(recent?.count || 0)>=EMAIL_REQUESTS_PER_HOUR || now-Number(recent?.latest || 0)<EMAIL_COOLDOWN_SECONDS || Number(globalRecent?.count || 0)>=GLOBAL_REQUESTS_PER_HOUR){
    return json({error:'Too many sign-in requests. Try again later.'},429);
  }

  const token=randomToken();
  const tokenHash=await sha256Hex(token);
  const id=crypto.randomUUID();
  try{
    await env.ACCOUNTS.prepare('INSERT INTO login_challenges (id,email,token_hash,created_epoch,expires_epoch) VALUES (?1,?2,?3,?4,?5)')
      .bind(id,email,tokenHash,now,now+900).run();
  }catch{ return json({error:'Cloud account storage is temporarily unavailable.'},503); }
  let link;
  try{
    const origin=new URL(env.AUTH_ORIGIN);
    if(origin.protocol!=='https:') throw new Error('HTTPS required');
    link=new URL('/api/auth/consume',origin);
  }catch{
    await env.ACCOUNTS.prepare('DELETE FROM login_challenges WHERE id=?1').bind(id).run().catch(()=>{});
    return json({error:'Cloud account origin is invalid.'},503);
  }
  link.searchParams.set('token',token);
  let response;
  try{
    response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{
      authorization:`Bearer ${env.RESEND_API_KEY}`,'content-type':'application/json'
    },body:JSON.stringify({
      from:env.AUTH_FROM_EMAIL,to:[email],subject:'Sign in to Food My Way',
      text:`Use this secure link to sign in to Food My Way. It expires in 15 minutes and can be used once:\n\n${link.href}\n\nIf you did not request this, you can ignore this email.`,
      html:`<p>Use this secure link to sign in to Food My Way. It expires in 15 minutes and can be used once.</p><p><a href="${link.href}">Sign in to Food My Way</a></p><p>If you did not request this, you can ignore this email.</p>`
    }),signal:AbortSignal.timeout(12000)});
  }catch{
    await env.ACCOUNTS.prepare('DELETE FROM login_challenges WHERE id=?1').bind(id).run().catch(()=>{});
    return json({error:'Sign-in email could not be sent.'},503);
  }
  if(!response.ok){
    await env.ACCOUNTS.prepare('DELETE FROM login_challenges WHERE id=?1').bind(id).run().catch(()=>{});
    return json({error:'Sign-in email could not be sent.'},503);
  }
  await env.ACCOUNTS.prepare('UPDATE login_challenges SET expires_epoch=?1 WHERE email=?2 AND id<>?3 AND used_epoch IS NULL AND expires_epoch>?1')
    .bind(now,email,id).run().catch(()=>{});
  return json({ok:true,message:'Check your email for a secure sign-in link.'});
}
