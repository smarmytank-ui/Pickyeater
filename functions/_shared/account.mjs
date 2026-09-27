const encoder=new TextEncoder();
const SYNC_KEYS=new Set([
  'pickyRecipesV2','pickyRecipeBook','foodMyWayWeeklyPlan','foodMyWayGroceryChecks','foodMyWayTasteProfile',
  'pickyDiaryMeals','pickyFavorites','picky_saved_recipes'
]);

export function normalizeAccountEmail(value){
  const email=String(value || '').trim().toLowerCase();
  if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}

export function randomToken(bytes=32){
  const values=new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return btoa(String.fromCharCode(...values)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

export async function sha256Hex(value){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(String(value)));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export function cookieValue(request,name){
  const prefix=`${name}=`;
  for(const part of String(request.headers.get('cookie') || '').split(';')){
    const candidate=part.trim();
    if(candidate.startsWith(prefix)) return decodeURIComponent(candidate.slice(prefix.length));
  }
  return '';
}

export function sessionCookie(token,maxAge=60*60*24*30){
  return `fmw_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(){
  return 'fmw_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export async function currentAccount(request,db){
  const token=cookieValue(request,'fmw_session');
  if(!token) return null;
  const hash=await sha256Hex(token);
  return db.prepare(`SELECT users.id AS user_id, users.email AS email, sessions.id AS session_id
    FROM sessions JOIN users ON users.id=sessions.user_id
    WHERE sessions.token_hash=?1 AND sessions.expires_epoch>?2`).bind(hash,Math.floor(Date.now()/1000)).first();
}

export function normalizeCloudSnapshot(input){
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Invalid sync data.');
  const source=input.data && typeof input.data==='object' && !Array.isArray(input.data) ? input.data : input;
  const data={};
  for(const [key,value] of Object.entries(source)) if(SYNC_KEYS.has(key)) data[key]=value;
  const snapshot={version:1,data};
  const serialized=JSON.stringify(snapshot);
  if(serialized.length>250_000) throw new Error('Sync data is too large.');
  return {snapshot,serialized};
}
