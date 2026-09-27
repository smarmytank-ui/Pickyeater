import { foundingEntitlementFromEvent, stripeSignatureIsValid } from '../_shared/stripe-webhook.mjs';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestPost({request,env}){
  if(!env.STRIPE_WEBHOOK_SECRET || !env.PURCHASES) return json({error:'Payment fulfillment is not configured.'},503);
  const length=Number(request.headers.get('content-length') || 0);
  if(length>1_000_000) return json({error:'Request is too large.'},413);
  const payload=await request.text();
  if(!await stripeSignatureIsValid(payload,request.headers.get('stripe-signature'),env.STRIPE_WEBHOOK_SECRET)){
    return json({error:'Invalid webhook signature.'},400);
  }
  let event;
  try{ event=JSON.parse(payload); }catch{ return json({error:'Invalid webhook payload.'},400); }
  if(!event?.id || !event?.type) return json({error:'Invalid Stripe event.'},400);

  let entitlement;
  try{ entitlement=foundingEntitlementFromEvent(event); }catch(error){ return json({error:error.message},422); }
  if(!entitlement) return json({received:true,handled:false});

  const now=new Date().toISOString();
  try{
    await env.PURCHASES.batch([
      env.PURCHASES.prepare('INSERT OR IGNORE INTO stripe_events (event_id,event_type,processed_at) VALUES (?1,?2,?3)')
        .bind(event.id,event.type,now),
      env.PURCHASES.prepare(`INSERT INTO entitlements (email,plan,status,stripe_customer_id,stripe_session_id,stripe_payment_intent_id,amount,currency,created_at,updated_at)
        VALUES (?1,'founding',?2,?3,?4,?5,?6,?7,?8,?8)
        ON CONFLICT(email,plan) DO UPDATE SET status=excluded.status, stripe_customer_id=excluded.stripe_customer_id,
        stripe_session_id=excluded.stripe_session_id, stripe_payment_intent_id=excluded.stripe_payment_intent_id,
        amount=excluded.amount, currency=excluded.currency, updated_at=excluded.updated_at`)
        .bind(entitlement.email,entitlement.status,entitlement.stripeCustomerId,entitlement.stripeSessionId,
          entitlement.stripePaymentIntentId,entitlement.amount,entitlement.currency,now)
    ]);
  }catch{ return json({error:'Payment was verified but fulfillment storage failed.'},503); }
  return json({received:true,handled:true});
}

export function onRequestGet(){ return json({error:'Method not allowed.'},405); }
