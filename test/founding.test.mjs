import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFoundingLead } from '../functions/_shared/founding.mjs';

test('normalizes an explicitly consenting founding lead',()=>{
  assert.deepEqual(normalizeFoundingLead({email:'  TEST@Example.COM ',consent:true,source:'tiktok'}),{
    email:'test@example.com',consent:true,source:'tiktok'
  });
});

test('rejects malformed email and missing consent',()=>{
  assert.throws(()=>normalizeFoundingLead({email:'nope',consent:true}),/valid email/);
  assert.throws(()=>normalizeFoundingLead({email:'ok@example.com',consent:false}),/consent/);
});
