import test from 'node:test';import assert from 'node:assert/strict';
import {pendingCookieStorage,stagePendingClick,readPendingClick,PENDING_CLICK_KEY,PENDING_CLICK_MS} from '../tracking/click-id.mjs';
import {measurementView,cookieJar} from './helpers/measurement-dom.mjs';
// A standards-style native cookie-store model, NOT real-browser acceptance.
// Its clock expires cookies even with no page/readPendingClick alive.
function nativeJar(){let clock=Date.now();const records=new Map(),writes=[];const expire=()=>{for(const[k,v]of records)if(v.deadline<=clock)records.delete(k);};return {
 now:()=>clock,writes,advance(ms){clock+=ms;expire();},count(){expire();return records.size;},deadline(){return [...records.values()][0]?.deadline;},
 openDocument(){return {get cookie(){expire();return [...records].map(([k,v])=>k+'='+v.value).join('; ');},set cookie(line){writes.push(line);const [pair,...attributes]=line.split(';'),i=pair.indexOf('='),name=pair.slice(0,i),attrs=attributes.map(a=>a.trim());assert.ok(attrs.includes('Secure'));assert.ok(attrs.includes('SameSite=Lax'));assert.ok(attrs.includes('Path=/ad-measurement'));const age=Number(attrs.find(a=>a.startsWith('Max-Age=')).split('=')[1]);if(age===0)records.delete(name);else{assert.equal(age,900);records.set(name,{value:pair.slice(i+1),deadline:clock+age*1000});}}};}
 };}
const input=()=>({ttclid:'E.C.P.expiry_fixture-1',offer:'survival_kit',requestId:crypto.randomUUID()});
test('native Max-Age expires closed-page pending cookie without any app read and reopen cannot recover it',()=>{
 const jar=nativeJar();let storage=pendingCookieStorage(jar.openDocument());assert.equal(jar.writes.length,0);const p=stagePendingClick({storage,...input(),now:jar.now()});assert.equal(jar.deadline(),p.expiresAt);assert.equal(jar.count(),1);
 storage=null; // Page closed; no website cleanup callback is available.
 jar.advance(PENDING_CLICK_MS+1);assert.equal(jar.count(),0);assert.equal(jar.writes.length,1);
 storage=pendingCookieStorage(jar.openDocument());assert.equal(readPendingClick(storage,jar.now()),null);assert.equal(jar.writes.length,1);
});
test('read, reload and attempted duplicate staging never extend the original native or logical deadline',()=>{
 const jar=nativeJar(),first=pendingCookieStorage(jar.openDocument()),p=stagePendingClick({storage:first,...input(),now:jar.now()}),deadline=jar.deadline();
 for(let i=0;i<3;i++){jar.advance(60000);const reopened=pendingCookieStorage(jar.openDocument());assert.equal(readPendingClick(reopened,jar.now()).expiresAt,p.expiresAt);assert.throws(()=>stagePendingClick({storage:reopened,...input(),now:jar.now()}),/already exists/);assert.equal(jar.deadline(),deadline);assert.equal(jar.writes.length,1);}
 jar.advance(PENDING_CLICK_MS-180000);assert.equal(jar.now(),p.expiresAt);assert.equal(jar.count(),0);
});
test('withdrawn pending cookie stays deleted after close/reopen; malformed or expired payload is removed safely',()=>{
 const jar=nativeJar(),storage=pendingCookieStorage(jar.openDocument());stagePendingClick({storage,...input(),now:jar.now()});storage.removeItem(PENDING_CLICK_KEY);jar.advance(1);assert.equal(readPendingClick(pendingCookieStorage(jar.openDocument()),jar.now()),null);assert.equal(jar.count(),0);
 for(const value of ['%bad',encodeURIComponent('{invalid'),encodeURIComponent(JSON.stringify({...input(),version:1,expiresAt:jar.now()-1,email:'never-forward'}))]){let removed=false;const malformed=pendingCookieStorage({get cookie(){return removed?'':'fmw_ad_pending_v1='+value;},set cookie(line){assert.match(line,/Max-Age=0/);removed=true;}});assert.equal(readPendingClick(malformed,jar.now()),null);assert.equal(removed,true);}
});
test('actual reopened page cleans expired pending without grant, API, SDK, or refreshing the cookie',async()=>{
 const data=new Map(),p={...input(),version:1,expiresAt:Date.now()-1};cookieJar(data).set('fmw_ad_pending_v1',encodeURIComponent(JSON.stringify(p)));
 await measurementView({data},async v=>{assert.equal(v.requests.length,0);assert.equal(v.scripts.length,0);assert.equal(v.writes.length,0);assert.equal(cookieJar(data).has('fmw_ad_pending_v1'),false);assert.equal(v.cookies.length,1);assert.match(v.cookies[0],/Max-Age=0/);});
});
