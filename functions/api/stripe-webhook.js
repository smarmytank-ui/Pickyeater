import { foundingEntitlementFromEvent, foundingRefundFromEvent, stripeSignatureIsValid } from '../_shared/stripe-webhook.mjs';

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
  const eventCreated=Number(event.created);
  if(!Number.isInteger(eventCreated) || eventCreated<=0) return json({error:'Stripe event is missing its creation time.'},400);

  let entitlement;
  try{ entitlement=foundingEntitlementFromEvent(event); }catch(error){ return json({error:error.message},422); }
  const refund=foundingRefundFromEvent(event);
  if(!entitlement && !refund) return json({received:true,handled:false});

  const now=new Date().toISOString();
  try{
    const statements=[env.PURCHASES.prepare('INSERT OR IGNORE INTO stripe_events (event_id,event_type,processed_at) VALUES (?1,?2,?3)')
      .bind(event.id,event.type,now)];
    if(entitlement){
      statements.push(env.PURCHASES.prepare(`INSERT INTO entitlements (email,plan,status,stripe_customer_id,stripe_session_id,stripe_payment_intent_id,amount,currency,stripe_event_created,created_at,updated_at)
        SELECT ?1,'founding',?2,?3,?4,?5,?6,?7,?8,?9,?9
        WHERE NOT EXISTS (SELECT 1 FROM refunded_payments WHERE stripe_payment_intent_id=?5 AND stripe_event_created>=?8)
        ON CONFLICT(email,plan) DO UPDATE SET status=excluded.status, stripe_customer_id=excluded.stripe_customer_id,
        stripe_session_id=excluded.stripe_session_id, stripe_payment_intent_id=excluded.stripe_payment_intent_id,
        amount=excluded.amount, currency=excluded.currency, stripe_event_created=excluded.stripe_event_created, updated_at=excluded.updated_at
        WHERE entitlements.status!='refunded' AND excluded.stripe_event_created>=entitlements.stripe_event_created
          AND NOT EXISTS (SELECT 1 FROM refunded_payments WHERE stripe_payment_intent_id=excluded.stripe_payment_intent_id AND stripe_event_created>=excluded.stripe_event_created)`)
        .bind(entitlement.email,entitlement.status,entitlement.stripeCustomerId,entitlement.stripeSessionId,
          entitlement.stripePaymentIntentId,entitlement.amount,entitlement.currency,eventCreated,now));
    }else{
      statements.push(env.PURCHASES.prepare(`INSERT INTO refunded_payments (stripe_payment_intent_id,stripe_event_created,created_at,updated_at)
        VALUES (?3,?1,?2,?2)
        ON CONFLICT(stripe_payment_intent_id) DO UPDATE SET stripe_event_created=excluded.stripe_event_created,updated_at=excluded.updated_at
        WHERE excluded.stripe_event_created>=refunded_payments.stripe_event_created`)
        .bind(eventCreated,now,refund.stripePaymentIntentId));
      statements.push(env.PURCHASES.prepare("UPDATE entitlements SET status='refunded', stripe_event_created=?1, updated_at=?2 WHERE stripe_payment_intent_id=?3 AND ?1>=stripe_event_created")
        .bind(eventCreated,now,refund.stripePaymentIntentId));
    }
    await env.PURCHASES.batch(statements);
  }catch{ return json({error:'Payment was verified but fulfillment storage failed.'},503); }
  return json({received:true,handled:true});
}

export function onRequestGet(){ return json({error:'Method not allowed.'},405); }
