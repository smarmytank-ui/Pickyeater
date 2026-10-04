import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import { normalizeTelemetryEvent } from '../functions/_shared/telemetry.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sessionId='12345678-1234-4123-8123-123456789abc';

test('keeps only bounded non-content telemetry fields',()=>{
  const event=normalizeTelemetryEvent({
    event:'recipe_generated',sessionId:'12345678-1234-4123-8123-123456789abc',path:'/generator.html?private=1',
    details:{ingredient_count:4,recipe_title:'Private family recipe',email:'person@example.com',planned:true}
  });
  assert.deepEqual(event,{
    event:'recipe_generated',sessionId:'12345678-1234-4123-8123-123456789abc',path:'/generator.html',
    details:{ingredient_count:4,planned:true}
  });
});

test('rejects unknown events and malformed sessions',()=>{
  assert.throws(()=>normalizeTelemetryEvent({event:'ingredients_entered',sessionId:'12345678-1234-4123-8123-123456789abc'}),/Unknown/);
  assert.throws(()=>normalizeTelemetryEvent({event:'page_view',sessionId:'short'}),/session/);
});

test('allows only named premium-gate features',()=>{
  const event=normalizeTelemetryEvent({event:'premium_gate_viewed',sessionId:'12345678-1234-4123-8123-123456789abc',details:{feature:'weekly_planning'}});
  assert.deepEqual(event.details,{feature:'weekly_planning'});
  const filtered=normalizeTelemetryEvent({event:'premium_gate_viewed',sessionId:'12345678-1234-4123-8123-123456789abc',details:{feature:'secret_feature'}});
  assert.deepEqual(filtered.details,{});
  const saves=normalizeTelemetryEvent({event:'premium_gate_viewed',sessionId:'12345678-1234-4123-8123-123456789abc',details:{feature:'unlimited_saves'}});
  assert.deepEqual(saves.details,{feature:'unlimited_saves'});
});

test('measures paid activation without accepting identity or content',()=>{
  const event=normalizeTelemetryEvent({
    event:'account_signed_in',sessionId:'12345678-1234-4123-8123-123456789abc',
    details:{founding:true,email:'buyer@example.com',recipe:'private dinner'}
  });
  assert.deepEqual(event.details,{founding:true});
  assert.doesNotThrow(()=>normalizeTelemetryEvent({event:'cloud_backup_completed',sessionId:'12345678-1234-4123-8123-123456789abc'}));
});

test('keeps a bounded grocery item count without grocery content',()=>{
  const event=normalizeTelemetryEvent({event:'grocery_shop_started',sessionId:'12345678-1234-4123-8123-123456789abc',details:{item_count:12,items:['private food']}});
  assert.deepEqual(event.details,{item_count:12});
});

test('retains the approved social profile campaign dimensions',()=>{
  const event=normalizeTelemetryEvent({
    event:'kit_page_viewed',sessionId,path:'/survival-kit',
    details:{campaign_source:'instagram',campaign_creative:'link_in_bio'}
  });
  assert.deepEqual(event.details,{campaign_source:'instagram',campaign_creative:'link_in_bio'});
  const paidMeta=normalizeTelemetryEvent({
    event:'kit_page_viewed',sessionId,path:'/survival-kit',
    details:{campaign_source:'meta',campaign_creative:'four_safe_foods'}
  });
  assert.deepEqual(paidMeta.details,{campaign_source:'meta',campaign_creative:'four_safe_foods'});
});

test('accepts every approved paid-social source and creative combination',()=>{
  const sources=['meta','tiktok'];
  const creatives=['four_safe_foods','taco_swap','picky_adults'];
  for(const campaign_source of sources){
    for(const campaign_creative of creatives){
      const event=normalizeTelemetryEvent({
        event:'kit_page_viewed',sessionId,path:'/survival-kit',
        details:{campaign_source,campaign_creative}
      });
      assert.deepEqual(event.details,{campaign_source,campaign_creative});
    }
  }
});

test('drops unapproved paid-social attribution instead of retaining arbitrary query data',()=>{
  const event=normalizeTelemetryEvent({
    event:'kit_checkout_started',sessionId,path:'/survival-kit?utm_source=private',
    details:{
      campaign_source:'search_partner',campaign_creative:'customer_email',
      utm_campaign:'secret-campaign',email:'buyer@example.com',url:'https://example.com/private'
    }
  });
  assert.deepEqual(event,{event:'kit_checkout_started',sessionId,path:'/survival-kit',details:{}});
});

test('every literal browser event is accepted by the server contract',async()=>{
  const script=await readFile(path.join(root,'app.js'),'utf8');
  const events=[...new Set([...script.matchAll(/track\('([^']+)'/g)].map(match=>match[1]))];
  assert.ok(events.includes('storage_write_failed'));
  assert.ok(events.includes('shared_recipe_invalid'));
  for(const event of events){
    assert.doesNotThrow(()=>normalizeTelemetryEvent({event,sessionId,path:'/',details:{}}),`${event} is missing from the server allowlist`);
  }
});

 test('retains only opaque VEYZLO references on kit events',()=>{
  const ref='vz_'+'a'.repeat(48);
  for(const event of ['kit_page_viewed','kit_checkout_started','kit_app_clicked'])assert.deepEqual(normalizeTelemetryEvent({event,sessionId,details:{veyzlo_reference:ref,email:'private@example.test'}}).details,{veyzlo_reference:ref});
  for(const value of ['person@example.test','vz_short',ref+'a',123])assert.deepEqual(normalizeTelemetryEvent({event:'kit_page_viewed',sessionId,details:{veyzlo_reference:value}}).details,{});
  assert.deepEqual(normalizeTelemetryEvent({event:'recipe_generated',sessionId,details:{veyzlo_reference:ref}}).details,{});
 });
