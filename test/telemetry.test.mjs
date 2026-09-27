import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTelemetryEvent } from '../functions/_shared/telemetry.mjs';

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
