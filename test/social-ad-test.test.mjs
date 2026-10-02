import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifySocialAdTest } from '../scripts/verify-social-ad-test.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('controlled social ad test is bounded and approval gated',async()=>{
  assert.deepEqual(await verifySocialAdTest(),{
    platforms:2,
    creatives:3,
    combinedMaximumUsd:135,
    launchAuthorized:false
  });
});

test('controlled ad-test verification rejects spend and automation drift',async()=>{
  const fixture=await mkdtemp(path.join(tmpdir(),'food-my-way-ad-test-'));
  const [plan,assets]=await Promise.all([
    readFile(path.join(root,'SOCIAL_AD_TEST_MANIFEST.json'),'utf8').then(JSON.parse),
    readFile(path.join(root,'SOCIAL_ASSET_MANIFEST.json'),'utf8')
  ]);
  plan.launchAuthorized=true;
  plan.platforms.meta.dailyBudgetUsd=50;
  plan.tracking.metaPixel=true;
  await Promise.all([
    writeFile(path.join(fixture,'SOCIAL_AD_TEST_MANIFEST.json'),JSON.stringify(plan)),
    writeFile(path.join(fixture,'SOCIAL_ASSET_MANIFEST.json'),assets)
  ]);
  await assert.rejects(
    verifySocialAdTest({projectRoot:fixture}),
    /launchAuthorized must remain false[\s\S]*daily budget[\s\S]*tracking\.metaPixel/
  );
});
