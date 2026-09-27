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

test('missing routes have a branded recovery page and deployment check',async()=>{
  const [notFound,verifier]=await Promise.all([read('404.html'),read('scripts/verify-deployment.mjs')]);
  assert.match(notFound,/<meta name="robots" content="noindex,follow">/);
  assert.match(notFound,/This page isn’t on the menu\./);
  assert.match(notFound,/href="\.\/#inputCard"/);
  assert.match(notFound,/support@foodmyway\.app/);
  assert.match(verifier,/food-my-way-verifier-missing-page/);
  assert.match(verifier,/statuses:\[404\],contains:'Food My Way'/);
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

test('service worker never caches account or API data',async()=>{
  const worker=await read('service-worker.js');
  assert.match(worker,/url\.pathname\.startsWith\('\/api\/'\)\) return/);
  assert.match(worker,/no-store\|private/);
  assert.match(worker,/networkFirst=url\.pathname\.endsWith\('\/config\.js'\)/);
  assert.doesNotMatch(worker,/cache\.put\(event\.request, copy\)/);
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

test('homepage structured data describes the app, offers, and visible FAQ',async()=>{
  const html=await read('index.html');
  const source=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source,'homepage needs JSON-LD');
  const data=JSON.parse(source);
  assert.equal(data['@context'],'https://schema.org');
  const app=data['@graph'].find(item=>item['@type']==='SoftwareApplication');
  const faq=data['@graph'].find(item=>item['@type']==='FAQPage');
  assert.equal(app.name,'Food My Way');
  assert.deepEqual(app.offers.map(offer=>offer.price),['0','29']);
  assert.equal(app.offers[1].availability,'https://schema.org/PreOrder');
  assert.equal(faq.mainEntity.length,5);
  for(const question of faq.mainEntity){
    assert.match(html,new RegExp(question.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    assert.ok(question.acceptedAnswer.text.length>40);
  }
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

test('modal dialogs trap keyboard focus and restore it when closed',async()=>{
  const script=await read('app.js');
  assert.match(script,/function openDialog\(dialog, preferredFocus\)/);
  assert.match(script,/dialogReturnFocus=document\.activeElement/);
  assert.match(script,/function trapDialogFocus\(event\)/);
  assert.match(script,/event\.key!=='Tab'/);
  assert.match(script,/returnTarget\?\.isConnected/);
  assert.match(script,/closeDialog\(\$\('accountOverlay'\)\)/);
});

test('diary meal tabs expose state and support arrow-key navigation',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  assert.match(html,/role="tab" aria-selected="true" aria-controls="diaryPane" tabindex="0"/);
  assert.match(html,/id="diaryPane"[^>]*role="tabpanel"/);
  assert.match(script,/function handleMealTabKeydown\(event\)/);
  assert.match(script,/\['ArrowLeft','ArrowRight','Home','End'\]/);
  assert.match(script,/setAttribute\('aria-selected',String\(selected\)\)/);
});

test('diary controls expose names, pressed state, and safe input hints',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  for(const label of ['Calories','Protein grams','Carbohydrate grams','Fat grams']) assert.match(html,new RegExp(`aria-label="${label}"`));
  assert.match(html,/id="qaName"[^>]*maxlength="80"/);
  assert.match(html,/id="viewToday"[^>]*aria-pressed="true"/);
  assert.match(script,/boundedDiaryNumber\(document\.getElementById\('qaCal'\)\?\.value,10000\)/);
  assert.match(script,/setAttribute\('aria-pressed',String\(offset===0\)\)/);
  assert.match(script,/Remove \$\{item\.title\} from \$\{activeMeal\}/);
});

test('deployment verifier covers the complete public funnel',async()=>{
  const verifier=await read('scripts/verify-deployment.mjs');
  for(const page of audiencePages) assert.match(verifier,new RegExp(`/${page.replaceAll('.','\\.')}`));
  assert.match(verifier,/\/service-worker\.js/);
  for(const endpoint of ['auth/session','auth/consume','auth/request','stripe-webhook','founding-interest','founding-unsubscribe','account/data','events','shop']){
    assert.match(verifier,new RegExp(`/api/${endpoint.replaceAll('/','\\/')}`));
  }
  assert.match(verifier,/process\.argv\.includes\('--launch'\)/);
  for(const setting of ['accountsEnabled','premiumEnforced','telemetryEnabled','founderCheckoutUrl']) assert.match(verifier,new RegExp(setting));
});

test('unverified paid and account integrations stay disabled by default',async()=>{
  const config=await read('config.js');
  assert.match(config,/commerceEnabled:\s*false/);
  assert.match(config,/accountsEnabled:\s*false/);
  assert.match(config,/premiumEnforced:\s*false/);
  assert.match(config,/telemetryEnabled:\s*false/);
});

test('pricing copy matches the enforced free save allowance',async()=>{
  const [html,script,plan]=await Promise.all([read('index.html'),read('app.js'),read('GO_TO_MARKET.md')]);
  assert.match(html,/Up to 3 saved recipes/);
  assert.match(html,/Unlimited saved recipes/);
  assert.match(html,/First 250 paid members/);
  assert.match(script,/const FREE_RECIPE_LIMIT = 3/);
  assert.match(script,/requirePremium\('unlimited_saves'\)/);
  assert.match(plan,/Free: unlimited recipe creation and ingredient swaps, with up to three saved recipes/);
  assert.doesNotMatch(plan,/Free: limited creations/);
});

test('editing a saved recipe replaces it without consuming another free slot',async()=>{
  const script=await read('app.js');
  assert.match(script,/let loadedRecipeId = null/);
  assert.match(script,/loadedRecipeId = normalized\.id/);
  assert.match(script,/saveRecipe\(snapshotCurrentRecipe\(\),\{replaceId:loadedRecipeId\}\)/);
  assert.match(script,/favorite:recipes\[existingIndex\]\.favorite, savedAt:recipes\[existingIndex\]\.savedAt/);
  assert.match(script,/replacing \? '✓ Changes saved' : '✓ Saved'/);
  assert.match(script,/loadedRecipeId \? 'Save changes' : '⭐ Save to Favorites'/);
  assert.match(script,/state\.steps=buildInstructions\(state\.ingredients,state\.preferences\);\s+setOwned\(\);/);
});

test('paid sensory preferences are visible and applied to recipe results',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  assert.match(html,/Texture and separate-plating preferences/);
  assert.match(html,/id="preferredTexture"/);
  assert.match(html,/id="servingStyle"/);
  assert.match(html,/id="preferencePill" class="pill hidden"/);
  assert.match(script,/Soft texture/);
  assert.match(script,/Foods separate/);
  assert.match(script,/state\.preferences=\{texture:profile\.texture,servingStyle:profile\.servingStyle\}/);
  assert.match(script,/state\.steps=buildInstructions\(state\.ingredients,state\.preferences\)/);
});

test('a denied premium action refreshes delayed Stripe entitlement state',async()=>{
  const script=await read('app.js');
  assert.match(script,/showAccountError\('Checking your Founding membership…'\)/);
  assert.match(script,/refreshAccountSession\(\)\.then\(session=>/);
  assert.match(script,/session\.entitlement\?\.plan==='founding' && session\.entitlement\?\.status==='active'/);
  assert.match(script,/are unlocked\. Try that action again\./);
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

test('recipe sharing has a branded non-blocking clipboard fallback',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  assert.match(html,/id="shareOverlay"[^>]*role="dialog"/);
  assert.match(html,/id="shareUrl"[^>]*readonly/);
  assert.match(html,/id="copyShareLink"/);
  assert.match(script,/showShareFallback\(url\)/);
  assert.doesNotMatch(script,/alert\('Share link copied/);
  assert.doesNotMatch(script,/prompt\('Copy this share link/);
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

test('locally saved founding consent is retried after a temporary outage',async()=>{
  const script=await read('app.js');
  assert.match(script,/async function submitFoundingInterest\(email,source='founding-modal'\)/);
  assert.match(script,/async function syncPendingFounderInterest\(\)/);
  assert.match(script,/pending\.consent!==true/);
  assert.match(script,/current\?\.email===email && current\?\.consent===true/);
  assert.match(script,/submitFoundingInterest\(email,'founding-retry'\)/);
  assert.match(script,/syncPendingFounderInterest\(\);/);
});

test('conversion email flows use submit-capable forms',async()=>{
  const [html,script]=await Promise.all([read('index.html'),read('app.js')]);
  assert.match(html,/<form id="founderForm" novalidate>/);
  assert.match(html,/id="founderSave"[^>]*type="submit"/);
  assert.match(html,/<form id="accountSignedOut" class="hidden" novalidate>/);
  assert.match(html,/id="accountRequestLink"[^>]*type="submit"/);
  assert.match(script,/\$\('founderForm'\)\?\.addEventListener\('submit'/);
  assert.match(script,/\$\('accountSignedOut'\)\?\.addEventListener\('submit'/);
});

test('customer-facing network actions have bounded wait times',async()=>{
  const [script,authRequest,shop]=await Promise.all([
    read('app.js'),read('functions/api/auth/request.js'),read('functions/api/shop.js')
  ]);
  assert.match(script,/async function fetchWithTimeout\(resource,options=\{\},timeoutMs=12000\)/);
  assert.match(script,/controller\.abort\(\)/);
  for(const path of ['founding-interest','shop']) assert.match(script,new RegExp(`fetchWithTimeout\\('./api/${path}`));
  assert.match(script,/response=await fetchWithTimeout\(path/);
  assert.match(authRequest,/signal:AbortSignal\.timeout\(12000\)/);
  assert.match(shop,/signal:AbortSignal\.timeout\(12000\)/);
});

test('privacy disclosures cover enabled processors, cloud controls, and retention',async()=>{
  const privacy=await read('privacy.html');
  for(const provider of ['Cloudflare','Resend','Stripe','Instacart']) assert.match(privacy,new RegExp(provider));
  assert.match(privacy,/export your cloud snapshot or delete the account/i);
  assert.match(privacy,/deleted after 90 days/i);
  assert.match(privacy,/Login challenges expire after 15 minutes/i);
  assert.doesNotMatch(privacy,/before their material data collection is enabled/i);
  assert.doesNotMatch(privacy,/Once cloud accounts are introduced/i);
});

test('paid terms draft matches the actual founding offer and launch gates',async()=>{
  const [draft,packet,verifier]=await Promise.all([
    read('PAID_TERMS_DRAFT.md'),read('LEGAL_LAUNCH_PACKET.md'),read('scripts/verify-deployment.mjs')
  ]);
  for(const phrase of ['USD $29','first 250 paid members','14 calendar days','Stripe','third-party grocery provider','commercial lifetime of the Food My Way premium product']){
    assert.match(draft,new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'));
  }
  for(const field of ['LEGAL_OPERATOR_NAME','MAILING_ADDRESS','JURISDICTION','EFFECTIVE_DATE','COUNSEL_APPROVED_DISPUTE_LANGUAGE']) assert.match(draft,new RegExp(`\\[\\[${field}\\]\\]`));
  assert.match(draft,/does not sell, prepare, deliver, or guarantee groceries/i);
  assert.match(draft,/does not mean the purchaser’s lifetime/i);
  assert.match(packet,/PAID_TERMS_DRAFT\.md/);
  assert.match(verifier,/14 calendar days/);
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

test('cloud backup accepts the current Recipe Book storage key',async()=>{
  const [script,account]=await Promise.all([read('app.js'),read('functions/_shared/account.mjs')]);
  assert.match(script,/const RECIPE_BOOK_KEY = 'pickyRecipesV2'/);
  assert.match(script,/CLOUD_DATA_KEYS = \['pickyRecipesV2'/);
  assert.match(account,/'pickyRecipesV2'/);
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

test('funnel measurement separates browser intent from authoritative purchases',async()=>{
  const [telemetry,script,docs]=await Promise.all([
    readFile(path.join(root,'functions/_shared/telemetry.mjs'),'utf8'),
    readFile(path.join(root,'app.js'),'utf8'),
    readFile(path.join(root,'TELEMETRY.md'),'utf8')
  ]);
  for(const event of ['account_sign_in_requested','account_signed_in','cloud_backup_completed']){
    assert.match(telemetry,new RegExp(event));
    assert.match(script,new RegExp(`track\\('${event}'`));
  }
  assert.match(telemetry,/unlimited_saves/);
  assert.match(docs,/signed Stripe webhook records and `PURCHASES` database/);
  assert.match(docs,/currently_active_sales_usd/);
});

test('customer-facing product chrome consistently uses Food My Way',async()=>{
  const [html,script,legacy]=await Promise.all([read('index.html'),read('app.js'),read('generator.html')]);
  assert.doesNotMatch(html,/Shared from Picky Eater|apple-mobile-web-app-title" content="Picky Eater"/);
  assert.doesNotMatch(script,/from Picky Eater/);
  assert.doesNotMatch(legacy,/Open Picky Eater|current Picky Eater experience/);
  assert.match(script,/aria-label',`Decrease \$\{pretty\(ing\.name\)\} amount`/);
  assert.match(script,/aria-label',`Swap \$\{pretty\(ing\.name\)\}`/);
});
