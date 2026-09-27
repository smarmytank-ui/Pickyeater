import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFile(path.join(root,name),'utf8');
const audiencePages=[
  'picky-adults.html',
  'picky-kids.html',
  'sensory-friendly-meals.html',
  'easy-weeknight-meals.html'
];

test('HTML references required local launch assets that exist',async()=>{
  const html=await read('index.html');
  const references=[...html.matchAll(/(?:href|src)="\.\/([^"?#]+)"/g)].map(match=>match[1]);
  assert.ok(references.includes('config.js'));
  assert.ok(references.includes('site.webmanifest'));
  for(const reference of new Set(references)) await access(path.join(root,reference));
});

test('HTML ids do not collide with global function declarations',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  const ids=new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]));
  const functionNames=[...script.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(match=>match[1]);
  const collisions=functionNames.filter(name=>ids.has(name));
  assert.deepEqual(collisions,[],'element ids must not shadow global functions');
});

test('manifest icons and offline shell assets exist',async()=>{
  const manifest=JSON.parse(await read('site.webmanifest'));
  assert.equal(manifest.name,'Food My Way — Picky Eater Recipes');
  for(const icon of manifest.icons) await access(path.join(root,icon.src));
  const worker=await read('service-worker.js');
  for(const asset of ['index.html','styles.css','app.js','config.js','privacy.html','terms.html','support.html']){
    assert.match(worker,new RegExp(asset.replace('.','\\.')));
  }
});

test('homepage release assets match the service-worker cache version',async()=>{
  const [html,worker,pkg]=await Promise.all([read('index.html'),read('service-worker.js'),read('package.json')]);
  const { version }=JSON.parse(pkg);
  assert.match(html,new RegExp(`styles\\.css\\?v=${version.replaceAll('.','\\.')}`));
  assert.match(html,new RegExp(`app\\.js\\?v=${version.replaceAll('.','\\.')}`));
  assert.match(worker,new RegExp(`food-my-way-v${version.replaceAll('.','-')}`));
  assert.match(worker,new RegExp(`app\\.js\\?v=${version.replaceAll('.','\\.')}`));
});

test('canonical launch files consistently use foodmyway.app',async()=>{
  const [html,sitemap,robots]=await Promise.all([read('index.html'),read('sitemap.xml'),read('robots.txt')]);
  assert.match(html,/https:\/\/foodmyway\.app\//);
  assert.match(sitemap,/https:\/\/foodmyway\.app\//);
  assert.match(robots,/https:\/\/foodmyway\.app\/sitemap\.xml/);
});

test('audience landing pages have unique search metadata and sitemap entries',async()=>{
  const sitemap=await read('sitemap.xml');
  const titles=new Set();
  const descriptions=new Set();
  for(const page of audiencePages){
    const html=await read(page);
    const title=html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description=html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
    const canonical=`https://foodmyway.app/${page}`;
    assert.ok(title,`${page} needs a title`);
    assert.ok(description,`${page} needs a description`);
    assert.ok(!titles.has(title),`${page} title must be unique`);
    assert.ok(!descriptions.has(description),`${page} description must be unique`);
    titles.add(title);
    descriptions.add(description);
    assert.match(html,new RegExp(`<link rel="canonical" href="${canonical.replaceAll('.','\\.')}"`));
    assert.match(html,/class="landing-brand" href="\.\/"/);
    assert.match(html,/privacy\.html/);
    assert.match(html,/terms\.html/);
    assert.match(html,/support\.html/);
    assert.match(sitemap,new RegExp(canonical.replaceAll('.','\\.')));
  }
});

test('Cloudflare headers protect dynamic and sensitive responses',async()=>{
  const [headers,html]=await Promise.all([read('_headers'),read('index.html')]);
  for(const directive of ['Strict-Transport-Security','X-Content-Type-Options','Content-Security-Policy','Permissions-Policy']){
    assert.match(headers,new RegExp(directive));
  }
  assert.doesNotMatch(headers,/script-src[^;]*'unsafe-inline'/);
  const structuredData=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(structuredData,'homepage needs structured data');
  const structuredDataHash=createHash('sha256').update(structuredData).digest('base64');
  assert.match(headers,new RegExp(`script-src 'self' 'sha256-${structuredDataHash.replaceAll('+','\\+')}'`));
  assert.match(headers,/\/api\/\*[\s\S]*Cache-Control: no-store/);
});

test('deployment verifier covers the complete public funnel',async()=>{
  const verifier=await read('scripts/verify-deployment.mjs');
  for(const page of audiencePages) assert.match(verifier,new RegExp(`/${page.replaceAll('.','\\.')}`));
  assert.match(verifier,/\/service-worker\.js/);
});

test('unverified paid and account integrations stay disabled by default',async()=>{
  const config=await read('config.js');
  assert.match(config,/commerceEnabled:\s*false/);
  assert.match(config,/accountsEnabled:\s*false/);
  assert.match(config,/premiumEnforced:\s*false/);
  assert.match(config,/telemetryEnabled:\s*false/);
});
