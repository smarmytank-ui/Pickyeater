const EXPECTED_TOKEN_HASH='cdf61d5ba1ed3eb64de6c5dce832038de19608af90f8893af136d78385955026';
const OBJECT_KEY='FoodMyWay-Picky-Eater-Survival-Kit.pdf';

const json=(body,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});

async function sha256(value){
  const bytes=new TextEncoder().encode(value);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function onRequestPost({request,env}){
  if(!env.KIT_FILES) return json({error:'Storage binding unavailable.'},503);
  const token=request.headers.get('x-kit-provision-token') || '';
  if(!token || await sha256(token)!==EXPECTED_TOKEN_HASH) return json({error:'Unauthorized.'},401);
  if((request.headers.get('content-type') || '').split(';')[0].trim()!=='application/pdf'){
    return json({error:'A PDF body is required.'},415);
  }
  const body=await request.arrayBuffer();
  if(body.byteLength<4 || body.byteLength>5_000_000 || new TextDecoder().decode(body.slice(0,4))!=='%PDF'){
    return json({error:'Invalid PDF.'},400);
  }
  await env.KIT_FILES.put(OBJECT_KEY,body,{httpMetadata:{contentType:'application/pdf'}});
  const object=await env.KIT_FILES.head(OBJECT_KEY);
  if(!object || object.size!==body.byteLength) return json({error:'Upload verification failed.'},503);
  return json({ok:true,key:OBJECT_KEY,size:object.size},201);
}

export function onRequestGet(){ return json({error:'Method not allowed.'},405); }
