import { randomToken, sessionCookie, sha256Hex } from '../../_shared/account.mjs';

export async function onRequestGet({request,env}){
  const home=new URL('/',request.url);
  if(!env.ACCOUNTS){ home.searchParams.set('login','unavailable'); return Response.redirect(home,302); }
  const token=new URL(request.url).searchParams.get('token') || '';
  const tokenHash=await sha256Hex(token);
  const now=Math.floor(Date.now()/1000);
  const challenge=await env.ACCOUNTS.prepare(`SELECT id,email FROM login_challenges
    WHERE token_hash=?1 AND used_epoch IS NULL AND expires_epoch>?2`).bind(tokenHash,now).first();
  if(!challenge){ home.searchParams.set('login','invalid'); return Response.redirect(home,302); }
  const user=await env.ACCOUNTS.prepare('SELECT id FROM users WHERE email=?1').bind(challenge.email).first();
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
  }catch{
    home.searchParams.set('login','invalid');
    return Response.redirect(home,302);
  }
  home.searchParams.set('login','success');
  return new Response(null,{status:302,headers:{location:home.href,'set-cookie':sessionCookie(sessionToken),'cache-control':'no-store'}});
}
