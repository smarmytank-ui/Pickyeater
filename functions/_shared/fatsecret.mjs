const API_URL='https://platform.fatsecret.com/rest/server.api';

function cleanText(value,max=160){
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
}

function finite(value){
  const number=Number(value);
  return Number.isFinite(number) && number>=0 ? number : 0;
}

export function normalizeSearchQuery(value){
  const query=cleanText(value,80).replace(/\s+/g,' ');
  if(query.length<2) throw new Error('Enter at least two characters.');
  return query;
}

export function normalizeBarcode(value){
  const barcode=String(value ?? '').replace(/[\s-]/g,'');
  if(!/^\d+$/.test(barcode) || ![8,12,13].includes(barcode.length)){
    throw new Error('Enter an 8, 12, or 13 digit barcode.');
  }
  return barcode.padStart(13,'0');
}

export function normalizeFoodSummary(food){
  return {
    id:cleanText(food?.food_id,40),
    name:cleanText(food?.food_name,120),
    brand:cleanText(food?.brand_name,100),
    type:cleanText(food?.food_type,30),
    description:cleanText(food?.food_description,260)
  };
}

export function normalizeFoodDetail(food){
  const raw=food?.servings?.serving;
  const servings=(Array.isArray(raw) ? raw : raw ? [raw] : []).map((serving,index)=>({
    id:cleanText(serving?.serving_id || index,40),
    label:cleanText(serving?.serving_description || serving?.measurement_description || '1 serving',100),
    calories:finite(serving?.calories),
    protein:finite(serving?.protein),
    carbs:finite(serving?.carbohydrate),
    fat:finite(serving?.fat)
  })).filter(serving=>serving.calories || serving.protein || serving.carbs || serving.fat).slice(0,30);
  return {
    id:cleanText(food?.food_id,40),
    name:cleanText(food?.food_name,120),
    brand:cleanText(food?.brand_name,100),
    type:cleanText(food?.food_type,30),
    servings
  };
}

function percent(value){
  return encodeURIComponent(String(value)).replace(/[!'()*]/g,char=>`%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function hmacSha1(key,value){
  const encoder=new TextEncoder();
  const cryptoKey=await crypto.subtle.importKey('raw',encoder.encode(key),{name:'HMAC',hash:'SHA-1'},false,['sign']);
  const signature=await crypto.subtle.sign('HMAC',cryptoKey,encoder.encode(value));
  let binary='';
  new Uint8Array(signature).forEach(byte=>binary+=String.fromCharCode(byte));
  return btoa(binary);
}

export async function fatSecretRequest(env,method,params={},fetchImpl=fetch){
  if(!env.FATSECRET_CONSUMER_KEY || !env.FATSECRET_CONSUMER_SECRET) throw new Error('Food search is not configured.');
  const all={
    method,
    format:'json',
    oauth_consumer_key:env.FATSECRET_CONSUMER_KEY,
    oauth_nonce:crypto.randomUUID().replaceAll('-',''),
    oauth_signature_method:'HMAC-SHA1',
    oauth_timestamp:Math.floor(Date.now()/1000),
    oauth_version:'1.0',
    ...params
  };
  const normalized=Object.entries(all).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>`${percent(key)}=${percent(value)}`).join('&');
  const base=`POST&${percent(API_URL)}&${percent(normalized)}`;
  all.oauth_signature=await hmacSha1(`${percent(env.FATSECRET_CONSUMER_SECRET)}&`,base);
  const response=await fetchImpl(API_URL,{
    method:'POST',
    headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams(Object.entries(all).map(([key,value])=>[key,String(value)])),
    signal:AbortSignal.timeout(12000)
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok || payload?.error){
    const code=cleanText(payload?.error?.code,20);
    const providerMessage=cleanText(payload?.error?.message,160);
    throw new Error(`FatSecret request failed${code ? ` (${code})` : ''}${providerMessage ? `: ${providerMessage}` : '.'}`);
  }
  return payload;
}
