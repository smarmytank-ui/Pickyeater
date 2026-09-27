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
  assert.doesNotMatch(headers,/style-src[^;]*'unsafe-inline'/);
  const structuredData=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(structuredData,'homepage needs structured data');
  const structuredDataHash=createHash('sha256').update(structuredData).digest('base64');
  assert.match(headers,new RegExp(`script-src 'self' 'sha256-${structuredDataHash.replaceAll('+','\\+')}'`));
  assert.match(headers,/\/api\/\*[\s\S]*Cache-Control: no-store/);
});

test('homepage uses no inline script handlers or presentation styles',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  assert.doesNotMatch(html,/\sonclick=/i);
  assert.doesNotMatch(html,/\sstyle=/i);
  assert.doesNotMatch(script,/\.style\./);
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

test('pricing copy matches the enforced free save allowance',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  assert.match(html,/Up to 3 saved recipes/);
  assert.match(html,/Unlimited saved recipes/);
  assert.match(script,/const FREE_RECIPE_LIMIT = 3/);
  assert.match(script,/requirePremium\('unlimited_saves'\)/);
});

test('a successful recipe save exposes a useful conversion next step',async()=>{
  const [html,script,styles]=await Promise.all([
    readFile(path.join(root,'index.html'),'utf8'),
    readFile(path.join(root,'app.js'),'utf8'),
    readFile(path.join(root,'styles.css'),'utf8')
  ]);
  assert.match(html,/id="savedNextStep"[^>]*class="saved-next-step hidden"/);
  assert.match(html,/id="savedOpenBook"/);
  assert.match(html,/id="savedFounderCta"/);
  assert.doesNotMatch(html,/secure signup connection is completed/i);
  assert.match(script,/\$\('savedNextStep'\)\?\.classList\.remove\('hidden'\)/);
  assert.match(script,/savedFounderCta\?\.addEventListener\('click', openFounderOffer\)/);
  assert.match(styles,/\.saved-next-step\.hidden\s*\{display:none\}/);
});

test('a successful checkout has a durable account-unlock path',async()=>{
  const [html,script,styles]=await Promise.all([
    readFile(path.join(root,'index.html'),'utf8'),
    readFile(path.join(root,'app.js'),'utf8'),
    readFile(path.join(root,'styles.css'),'utf8')
  ]);
  assert.match(html,/id="checkoutStatus"[^>]*class="checkout-status hidden"/);
  assert.match(html,/id="checkoutSignIn"/);
  assert.match(script,/foodMyWayCheckoutPending/);
  assert.match(script,/Founding access is active\./);
  assert.match(script,/\$\('checkoutSignIn'\)\?\.addEventListener\('click'/);
  assert.match(script,/Your payment is recorded; contact support if this continues\./);
  assert.match(script,/founderCta\.disabled=false/);
  assert.match(styles,/\.checkout-status\.hidden\s*\{display:none\}/);
});

test('founding-list consent includes a secure unsubscribe path',async()=>{
  const [privacy,support,pkg]=await Promise.all([read('privacy.html'),read('support.html'),read('package.json')]);
  await access(path.join(root,'functions/api/founding-unsubscribe.js'));
  await access(path.join(root,'migrations/0005_founding_unsubscribe.sql'));
  assert.match(privacy,/unsubscribe through a link/i);
  assert.match(support,/Email preferences/);
  assert.match(pkg,/founding-unsubscribe\.js/);
});

test('payment fulfillment preserves refunds delivered before checkout completion',async()=>{
  const [endpoint,migration,docs]=await Promise.all([
    readFile(path.join(root,'functions/api/stripe-webhook.js'),'utf8'),
    readFile(path.join(root,'migrations/0006_refund_tombstones.sql'),'utf8'),
    readFile(path.join(root,'PAYMENTS_AND_LEADS.md'),'utf8')
  ]);
  assert.match(endpoint,/INSERT INTO refunded_payments/);
  assert.match(endpoint,/NOT EXISTS \(SELECT 1 FROM refunded_payments/);
  assert.match(migration,/stripe_payment_intent_id TEXT PRIMARY KEY/);
  assert.match(docs,/0006_refund_tombstones\.sql/);
});

test('cloud backup writes are authorized on the server, not only hidden in the UI',async()=>{
  const [endpoint,script,docs]=await Promise.all([
    readFile(path.join(root,'functions/api/account/data.js'),'utf8'),
    readFile(path.join(root,'app.js'),'utf8'),
    readFile(path.join(root,'CLOUD_ACCOUNTS.md'),'utf8')
  ]);
  assert.match(endpoint,/plan='founding' AND status='active'/);
  assert.match(endpoint,/code:'PREMIUM_REQUIRED'/);
  assert.match(script,/accountBackup'\)\?\.classList\.toggle\('hidden',!founding\)/);
  assert.match(docs,/independently repeats that authorization server-side/);
});

test('magic-link GET is read-only and explicit POST creates the session',async()=>{
  const [endpoint,docs]=await Promise.all([
    readFile(path.join(root,'functions/api/auth/consume.js'),'utf8'),
    readFile(path.join(root,'CLOUD_ACCOUNTS.md'),'utf8')
  ]);
  assert.match(endpoint,/export async function onRequestGet/);
  assert.match(endpoint,/export async function onRequestPost/);
  assert.match(endpoint,/form method="post" action="\/api\/auth\/consume"/);
  assert.match(endpoint,/referrer-policy':'no-referrer'/);
  assert.match(docs,/email-security scanners do not consume access/);
});

test('customer-facing product chrome consistently uses Food My Way',async()=>{
  const [html,script,legacy]=await Promise.all([read('index.html'),read('app.js'),read('generator.html')]);
  assert.doesNotMatch(html,/Shared from Picky Eater|apple-mobile-web-app-title" content="Picky Eater"/);
  assert.doesNotMatch(script,/from Picky Eater/);
  assert.doesNotMatch(legacy,/Open Picky Eater|current Picky Eater experience/);
  assert.match(script,/aria-label',`Decrease \$\{pretty\(ing\.name\)\} amount`/);
  assert.match(script,/aria-label',`Swap \$\{pretty\(ing\.name\)\}`/);
});
