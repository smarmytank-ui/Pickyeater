const encoder = new TextEncoder();

function timingSafeEqual(left,right){
  if(left.length!==right.length) return false;
  let difference=0;
  for(let index=0;index<left.length;index+=1) difference|=left.charCodeAt(index)^right.charCodeAt(index);
  return difference===0;
}

export function parseStripeSignature(header){
  const values={timestamp:null,signatures:[]};
  for(const part of String(header || '').split(',')){
    const [key,value]=part.trim().split('=',2);
    if(key==='t' && /^\d+$/.test(value || '')) values.timestamp=Number(value);
    if(key==='v1' && /^[a-f0-9]{64}$/i.test(value || '')) values.signatures.push(value.toLowerCase());
  }
  return values;
}

export async function stripeSignatureIsValid(payload,header,secret,{now=Math.floor(Date.now()/1000),tolerance=300}={}){
  const {timestamp,signatures}=parseStripeSignature(header);
  if(!secret || !timestamp || !signatures.length || Math.abs(now-timestamp)>tolerance) return false;
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=await crypto.subtle.sign('HMAC',key,encoder.encode(`${timestamp}.${payload}`));
  const expected=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');
  return signatures.some(signature=>timingSafeEqual(signature,expected));
}

export function foundingEntitlementFromEvent(event){
  if(!event || !['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)) return null;
  const session=event.data?.object;
  if(session?.metadata?.offer!=='food_my_way_founding') return null;
  if(session.mode!=='payment' || session.payment_status!=='paid') return null;
  if(session.currency!=='usd' || session.amount_total!==2900) throw new Error('Founding payment amount does not match the configured offer.');
  const email=String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Paid checkout is missing a valid customer email.');
  const stripeSessionId=String(session.id || '').trim();
  const stripePaymentIntentId=String(session.payment_intent || '').trim();
  if(!stripeSessionId || !stripePaymentIntentId) throw new Error('Paid checkout is missing the Stripe references required for fulfillment.');
  return {
    email,
    stripeCustomerId:String(session.customer || ''),
    stripeSessionId,
    stripePaymentIntentId,
    amount:session.amount_total,
    currency:session.currency,
    status:'active'
  };
}

export function foundingRefundFromEvent(event){
  if(event?.type!=='charge.refunded') return null;
  const charge=event.data?.object;
  const fullyRefunded=charge?.refunded===true || (Number.isInteger(charge?.amount) && charge.amount>0 && charge.amount_refunded===charge.amount);
  if(!fullyRefunded || !charge?.payment_intent) return null;
  return {stripePaymentIntentId:String(charge.payment_intent),status:'refunded'};
}
