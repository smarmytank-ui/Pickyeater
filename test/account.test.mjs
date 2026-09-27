import test from 'node:test';
import assert from 'node:assert/strict';
import { clearSessionCookie, normalizeAccountEmail, normalizeCloudSnapshot, randomToken, sessionCookie, sha256Hex } from '../functions/_shared/account.mjs';

test('normalizes account email and rejects malformed input',()=>{
  assert.equal(normalizeAccountEmail(' Person@Example.COM '),'person@example.com');
  assert.throws(()=>normalizeAccountEmail('not-an-email'),/valid email/);
});

test('creates high-entropy tokens and stable hashes',async()=>{
  const first=randomToken(); const second=randomToken();
  assert.ok(first.length>=40); assert.notEqual(first,second);
  assert.equal(await sha256Hex(first),await sha256Hex(first));
  assert.notEqual(await sha256Hex(first),await sha256Hex(second));
});

test('cloud snapshots discard unknown local keys and reject oversized data',()=>{
  const normalized=normalizeCloudSnapshot({data:{pickyRecipesV2:[{id:'1'}],pickyRecipeBook:[{id:'legacy'}],pickyAuth:{email:'private@example.com'},unknown:'drop'}});
  assert.deepEqual(normalized.snapshot,{version:1,data:{pickyRecipesV2:[{id:'1'}],pickyRecipeBook:[{id:'legacy'}]}});
  assert.throws(()=>normalizeCloudSnapshot({data:{pickyRecipesV2:['x'.repeat(260_000)]}}),/too large/);
});

test('session cookies are secure, HttpOnly, and clearable',()=>{
  assert.match(sessionCookie('secret'),/HttpOnly; Secure; SameSite=Lax/);
  assert.match(clearSessionCookie(),/Max-Age=0/);
});
