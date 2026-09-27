export function normalizeFoundingEmail(value){
  const email=String(value || '').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254) throw new Error('Enter a valid email address.');
  return email;
}

export function normalizeFoundingLead(input){
  const email=normalizeFoundingEmail(input?.email);
  if(input?.consent!==true) throw new Error('Email consent is required.');
  const source=String(input?.source || 'founding-modal').trim().slice(0,80) || 'founding-modal';
  return {email,source,consent:true};
}

function base64Url(bytes){
  let binary='';
  bytes.forEach(byte=>binary+=String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function decodeBase64Url(value){
  const encoded=String(value || '').replace(/-/g,'+').replace(/_/g,'/');
  const padded=encoded+'='.repeat((4-encoded.length%4)%4);
  return Uint8Array.from(atob(padded),char=>char.charCodeAt(0));
}

async function unsubscribeKey(secret){
  if(typeof secret!=='string' || secret.length<32) throw new Error('Unsubscribe secret is not configured.');
  return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}

export async function createFoundingUnsubscribeToken(email,secret){
  const normalized=normalizeFoundingEmail(email);
  const signature=await crypto.subtle.sign('HMAC',await unsubscribeKey(secret),new TextEncoder().encode(normalized));
  return base64Url(new Uint8Array(signature));
}

export async function verifyFoundingUnsubscribeToken(email,token,secret){
  try{
    const normalized=normalizeFoundingEmail(email);
    const signature=decodeBase64Url(token);
    if(signature.length!==32) return false;
    return crypto.subtle.verify('HMAC',await unsubscribeKey(secret),signature,new TextEncoder().encode(normalized));
  }catch{return false;}
}
