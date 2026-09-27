import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFile(path.join(root,name),'utf8');

test('HTML references required local launch assets that exist',async()=>{
  const html=await read('index.html');
  const references=[...html.matchAll(/(?:href|src)="\.\/([^"?#]+)"/g)].map(match=>match[1]);
  assert.ok(references.includes('config.js'));
  assert.ok(references.includes('site.webmanifest'));
  for(const reference of new Set(references)) await access(path.join(root,reference));
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

test('canonical launch files consistently use foodmyway.app',async()=>{
  const [html,sitemap,robots]=await Promise.all([read('index.html'),read('sitemap.xml'),read('robots.txt')]);
  assert.match(html,/https:\/\/foodmyway\.app\//);
  assert.match(sitemap,/https:\/\/foodmyway\.app\//);
  assert.match(robots,/https:\/\/foodmyway\.app\/sitemap\.xml/);
});

test('Cloudflare headers protect dynamic and sensitive responses',async()=>{
  const headers=await read('_headers');
  for(const directive of ['Strict-Transport-Security','X-Content-Type-Options','Content-Security-Policy','Permissions-Policy']){
    assert.match(headers,new RegExp(directive));
  }
  assert.match(headers,/\/api\/\*[\s\S]*Cache-Control: no-store/);
});
