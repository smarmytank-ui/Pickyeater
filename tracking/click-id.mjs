// Local conservative input contract, NOT a documented TikTok maximum length.
// This is an advertising identifier, not proof that a click or sale is genuine.
export const validClickId=value=>typeof value==='string'&&/^[A-Za-z0-9._-]{1,1024}$/.test(value);
export const PENDING_CLICK_KEY='fmw-ad-pending-click-v1',PENDING_CLICK_MS=15*60000;
// Native expiry also applies when the tab is closed. No raw click localStorage.
// Values are scoped to this document path, under the cookie size bound.
export function pendingCookieStorage(doc){
 const name='fmw_ad_pending_v1',prefix=name+'=';
 const remove=()=>{doc.cookie=prefix+'; Path=/ad-measurement; Max-Age=0; SameSite=Lax; Secure';};
 return {getItem(key){if(key!==PENDING_CLICK_KEY)return null;const matches=String(doc.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(prefix));if(matches.length!==1){if(matches.length>1)remove();return null;}try{return decodeURIComponent(matches[0].slice(prefix.length));}catch{remove();return null;}},
 setItem(key,value){if(key!==PENDING_CLICK_KEY||typeof value!=='string'||encodeURIComponent(value).length>3000)throw Error('Invalid pending cookie');doc.cookie=prefix+encodeURIComponent(value)+'; Path=/ad-measurement; Max-Age=900; SameSite=Lax; Secure';if(this.getItem(key)!==value){remove();throw Error('Pending cookie unavailable');}},
 removeItem(key){if(key===PENDING_CLICK_KEY)remove();}};
}
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/.test(value);
function captureReferrerSafe(referrer){if(!referrer)return true;try{const u=new URL(referrer);return ['https://www.tiktok.com','https://m.tiktok.com','https://tiktok.com'].includes(u.origin)&&!u.username&&!u.password;}catch{return false;}}
// Called only from an explicit Allow action. No read/storage/network at import.
export function consentedLanding({url,referrer='',gpc=false,dnt=false,permitted=false,replace}){
 if(!permitted||gpc||dnt||!captureReferrerSafe(referrer))return null;
 try{const u=new URL(url);if(u.origin!=='https://foodmyway.app'||u.pathname!=='/ad-measurement'||u.hash||u.username||u.password)return null;
  const keys=[...u.searchParams.keys()];if(keys.length!==1||keys[0]!=='ttclid')return null;
  const ttclid=u.searchParams.get('ttclid');if(!validClickId(ttclid)||typeof replace!=='function')return null;
  replace('/ad-measurement');return {ttclid,cleanUrl:'https://foodmyway.app/ad-measurement'};
 }catch{return null;}
}
// Pending permission is NOT an authenticated grant. It cannot validate/load SDK,
// reserve Purchase, or backdate consent. No storage access until called by UI.
export function readPendingClick(storage,now=Date.now()){
 const raw=storage.getItem(PENDING_CLICK_KEY);if(!raw)return null;
 try{const p=JSON.parse(raw);if(Object.keys(p).sort().join(',')==='expiresAt,offer,requestId,ttclid,version'&&p.version===1&&validClickId(p.ttclid)&&['survival_kit','founding'].includes(p.offer)&&uuid(p.requestId)&&Number.isSafeInteger(p.expiresAt)&&p.expiresAt>now&&p.expiresAt<=now+PENDING_CLICK_MS)return p;}catch{}
 storage.removeItem(PENDING_CLICK_KEY);return null;
}
export function stagePendingClick({storage,ttclid,offer,requestId,now=Date.now()}){
 if(!validClickId(ttclid)||!['survival_kit','founding'].includes(offer)||!uuid(requestId)||!Number.isSafeInteger(now))throw Error('Invalid pending click');
 const old=readPendingClick(storage,now);if(old)throw Error('Pending handoff already exists; confirm or decline it first');
 const p={version:1,ttclid,offer,requestId,expiresAt:now+PENDING_CLICK_MS};storage.setItem(PENDING_CLICK_KEY,JSON.stringify(p));return p;
}
// First-party cookie is scoped to the clean document, not app/recipe/auth paths.
// The authenticated preflight, never localStorage or a query, supplies its value.
export function setClickCookie(doc,value,expiresAt,now=Date.now()){
 if(value!==null&&value!==undefined&&!validClickId(value))throw Error('Invalid click binding');
 const age=value?Math.floor(Math.min(3600000,expiresAt-now)/1000):0;
 if(value&&(!Number.isFinite(age)||age<=0))throw Error('Expired click binding');
 doc.cookie='ttclid='+(value||'')+'; Path=/ad-measurement; Max-Age='+age+'; SameSite=Lax; Secure';
}
