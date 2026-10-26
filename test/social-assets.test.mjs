import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { verifySocialAssets } from '../scripts/verify-social-assets.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

// Product CI runs from a clean checkout without ignored campaign video binaries.
// The real, locked assets remain an explicit gate: npm run verify:social-assets.
// Exercise verifier behavior here with disposable fixtures, never skip product tests.
test('social verifier accepts fixture bytes matching a locked manifest',async()=>{
  const fixture=await mkdtemp(path.join(tmpdir(),'food-my-way-social-'));
  const manifest=JSON.parse(await readFile(path.join(root,'SOCIAL_ASSET_MANIFEST.json'),'utf8'));
  manifest.assetRoot='output/video';
  await mkdir(path.join(fixture,manifest.assetRoot),{recursive:true});
  for(const asset of manifest.assets){
    const contents=Buffer.from(`synthetic verifier fixture: ${asset.file}`);
    asset.bytes=contents.length;
    asset.sha256=createHash('sha256').update(contents).digest('hex');
    await writeFile(path.join(fixture,manifest.assetRoot,asset.file),contents);
  }
  await writeFile(path.join(fixture,'SOCIAL_ASSET_MANIFEST.json'),JSON.stringify(manifest));
  assert.deepEqual(await verifySocialAssets({projectRoot:fixture}),{count:3,publicationAuthorized:false});
});

test('private review page exposes every narrated master and no silent source',async()=>{
  const manifest=JSON.parse(await readFile(path.join(root,'SOCIAL_ASSET_MANIFEST.json'),'utf8'));
  const review=await readFile(path.join(root,'SOCIAL_VIDEO_REVIEW.html'),'utf8');
  for(const asset of manifest.assets) assert.match(review,new RegExp(asset.file.replaceAll('.','\\.')));
  const videoSources=[...review.matchAll(/<video[^>]+src="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(videoSources.length,manifest.assets.length);
  assert.ok(videoSources.every(source=>source.endsWith('-voiced.mp4')));
});

test('verification fails closed when publication or an asset changes',async()=>{
  const fixture=await mkdtemp(path.join(tmpdir(),'food-my-way-social-'));
  const manifest=JSON.parse(await readFile(path.join(root,'SOCIAL_ASSET_MANIFEST.json'),'utf8'));
  manifest.assetRoot='output/video';
  manifest.publicationAuthorized=true;
  await mkdir(path.join(fixture,'output/video'),{recursive:true});
  await writeFile(path.join(fixture,'SOCIAL_ASSET_MANIFEST.json'),JSON.stringify(manifest));
  for(const asset of manifest.assets){
    await writeFile(path.join(fixture,'output/video',asset.file),'changed');
  }
  await assert.rejects(
    verifySocialAssets({projectRoot:fixture}),
    /publicationAuthorized must remain false[\s\S]*SHA-256 mismatch/
  );
});
