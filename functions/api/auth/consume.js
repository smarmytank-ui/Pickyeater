import { randomToken, sessionCookie, sha256Hex } from '../../_shared/account.mjs';

function redirectHome(request,result,headers={},returnTo=''){
  const home=new URL(/^\/(?:survival-kit\.html(?:\?download=1)?(?:#access)?|digital-kit\.html#digitalKit)$/.test(returnTo) ? returnTo : '/',request.url);
  home.searchParams.set('login',result);
  return new Response(null,{status:302,headers:{location:home.href,'cache-control':'no-store',...headers}});
}

function confirmationPage(token,returnTo=''){
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><title>Confirm sign-in — Food My Way</title><link rel="stylesheet" href="/legal.css"></head><body><div class="legal-shell"><nav class="legal-nav"><a href="/">← Food My Way</a></nav><main class="legal-card"><h1>Confirm sign-in</h1><p>Continue to sign in to your Food My Way account. This secure link can be used once.</p><form method="post" action="/api/auth/consume"><input type="hidden" name="token" value="${token}"><input type="hidden" name="returnTo" value="${returnTo}"><button type="submit">Sign in to Food My Way</button></form><p class="legal-note">If you did not request this email, close this page.</p></main></div></body></html>`,{
    headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex','referrer-policy':'no-referrer'}
  });
}

async function validChallenge(token,env){
  if(!env.ACCOUNTS || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const tokenHash=await sha256Hex(token);
  const now=Math.floor(Date.now()/1000);
  const challenge=await env.ACCOUNTS.prepare(`SELECT id,email FROM login_challenges
    WHERE token_hash=?1 AND used_epoch IS NULL AND expires_epoch>?2`).bind(tokenHash,now).first();
  return challenge ? {challenge,now} : null;
}

export async function onRequestGet({request,env}){
  if(!env.ACCOUNTS) return redirectHome(request,'unavailable');
  const token=new URL(request.url).searchParams.get('token') || '';
  const returnTo=new URL(request.url).searchParams.get('returnTo') || '';
  let valid;
  try{ valid=await validChallenge(token,env); }
  catch{ return redirectHome(request,'unavailable'); }
  return valid ? confirmationPage(token,/^\/(?:survival-kit\.html(?:\?download=1)?(?:#access)?|digital-kit\.html#digitalKit)$/.test(returnTo) ? returnTo : '') : redirectHome(request,'invalid');
}

export async function onRequestPost({request,env}){
  if(!env.ACCOUNTS) return redirectHome(request,'unavailable');
  let token='';
  let returnTo='';
  try{ const form=await request.formData(); token=String(form.get('token') || ''); returnTo=String(form.get('returnTo') || ''); }
  catch{ return redirectHome(request,'invalid'); }
  let valid;
  try{ valid=await validChallenge(token,env); }
  catch{ return redirectHome(request,'unavailable'); }
  if(!valid) return redirectHome(request,'invalid');
  const {challenge,now}=valid;
  let user;
  try{ user=await env.ACCOUNTS.prepare('SELECT id FROM users WHERE email=?1').bind(challenge.email).first(); }
  catch{ return redirectHome(request,'unavailable'); }
  const userId=user?.id || crypto.randomUUID();
  const sessionToken=randomToken();
  const sessionHash=await sha256Hex(sessionToken);
  try{
    await env.ACCOUNTS.batch([
      env.ACCOUNTS.prepare('INSERT OR IGNORE INTO users (id,email,created_epoch) VALUES (?1,?2,?3)').bind(userId,challenge.email,now),
      env.ACCOUNTS.prepare('UPDATE login_challenges SET used_epoch=?1 WHERE id=?2 AND used_epoch IS NULL').bind(now,challenge.id),
      env.ACCOUNTS.prepare('INSERT INTO sessions (id,user_id,challenge_id,token_hash,created_epoch,expires_epoch) VALUES (?1,?2,?3,?4,?5,?6)')
        .bind(crypto.randomUUID(),userId,challenge.id,sessionHash,now,now+(60*60*24*30))
    ]);
  }catch{ return redirectHome(request,'unavailable'); }
  return redirectHome(request,'success',{'set-cookie':sessionCookie(sessionToken)},returnTo);
}
