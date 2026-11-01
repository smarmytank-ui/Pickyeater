import {DISABLED_PIXEL} from '../../tracking/pixel-browser.mjs';
import {readPendingClick,pendingCookieStorage} from '../../tracking/click-id.mjs';
const jars=new WeakMap();
export function cookieJar(data){if(!jars.has(data))jars.set(data,new Map());return jars.get(data);}
export function pendingFor(data){const jar=cookieJar(data);return readPendingClick(pendingCookieStorage({get cookie(){return [...jar].map(([k,v])=>k+'='+v).join('; ');},set cookie(value){const [part,...attrs]=value.split(';'),i=part.indexOf('='),name=part.slice(0,i);if(attrs.some(a=>a.trim()==='Max-Age=0'))jar.delete(name);else jar.set(name,part.slice(i+1));}}));}
export const enabledPixel={...DISABLED_PIXEL,enabled:true,accountVerified:true,dataSharingApproved:true,sdkApproved:true,settingsVerified:true,safeScopeApproved:true};
let sequence=0;
// No browser or network: a NEW synthetic document for each navigation. Referrer
// must be supplied by the test; the harness never clears it in an old document.
export async function measurementView({url='https://foodmyway.app/ad-measurement',referrer='',data=new Map(),api=async()=>{throw Error('Unexpected request');},config=enabledPixel,navigator={}},run){
 const names=['window','document','location','localStorage','navigator','fetch'],old=Object.fromEntries(names.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)])),nodes=Object.fromEntries(['agree','decline','checkout','receipt','status','offer'].map(k=>[k,{value:k==='offer'?'survival_kit':''}])),requests=[],scripts=[],cookies=[],navigations=[],writes=[];
 const jar=cookieJar(data),storage={getItem:k=>data.get(k)||null,setItem(k,v){writes.push(k);data.set(k,v);},removeItem:k=>data.delete(k)},location={href:url,replace:path=>navigations.push({kind:'replace',path}),assign:path=>navigations.push({kind:'assign',path})},document={referrer,getElementById:k=>nodes[k],get cookie(){return [...jar].map(([k,v])=>k+'='+v).join('; ');},set cookie(v){cookies.push(v);const [part,...attrs]=v.split(';'),i=part.indexOf('='),name=part.slice(0,i);if(attrs.some(a=>a.trim()==='Max-Age=0'))jar.delete(name);else jar.set(name,part.slice(i+1));},createElement(){return {remove(){this.removed=true;}};},head:{appendChild(s){scripts.push(s);queueMicrotask(()=>s.onload?.());}}},window={FMW_CONFIG:{adPixel:config},location,navigator};
 try{for(const[k,value]of Object.entries({window,document,location,localStorage:storage,navigator,fetch:async(path,options)=>{if(path!=='/api/tracking/measurement')throw Error('Unexpected URL');if(options.referrerPolicy!=='no-referrer')throw Error('Unsafe API referrer');const input=JSON.parse(options.body);requests.push(input);return {json:()=>api(input)};}}))Object.defineProperty(globalThis,k,{configurable:true,value});
  await import('../../tracking/measurement-page.mjs?synthetic-view='+sequence++);
  // Auto receipt may need several promise turns; no timers/network are mocked
  // into success, only the explicit synthetic script callback above.
  await new Promise(r=>setImmediate(r));
  let prior;try{prior=JSON.parse(data.get('fmw-ad-consent-minimal-v1')||'null');}catch{}
  if(prior?.status==='granted'&&!jar.has('fmw_ad_pending_v1'))for(let i=0;i<100&&nodes.status.textContent===undefined;i++)await new Promise(r=>setTimeout(r,1));
  return await run({nodes,data,storage,pendingStorage:pendingCookieStorage(document),location,document,window,requests,scripts,cookies,navigations,writes});
 }finally{for(const[k,d]of Object.entries(old)){if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}}
}
