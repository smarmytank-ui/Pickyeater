import test from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet, onRequestPost } from '../functions/api/recipe-import.js';

const recipeHtml='<script type="application/ld+json">{"@type":"Recipe","name":"Soup","recipeIngredient":["broth","carrots"]}</script>';
const request=url=>new Request('https://foodmyway.app/api/recipe-import',{
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})
});

test('recipe import endpoint extracts a public HTML recipe',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async url=>{
    assert.equal(url,'https://recipes.example/soup');
    return new Response(recipeHtml,{headers:{'content-type':'text/html'}});
  };
  try{
    const response=await onRequestPost({request:request('https://recipes.example/soup')});
    assert.equal(response.status,200);
    assert.deepEqual((await response.json()).recipe.ingredients,['broth','carrots']);
    assert.match(response.headers.get('cache-control'),/no-store/);
  }finally{ globalThis.fetch=originalFetch; }
});

test('recipe import endpoint blocks private redirects and unsuitable content',async()=>{
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{
    calls+=1;
    return new Response('',{status:302,headers:{location:'https://127.0.0.1/private'}});
  };
  try{
    const blocked=await onRequestPost({request:request('https://example.com/start')});
    assert.equal(blocked.status,400);
    assert.equal(calls,1);
    const direct=await onRequestPost({request:request('https://10.0.0.1/private')});
    assert.equal(direct.status,400);
    assert.equal(calls,1);
  }finally{ globalThis.fetch=originalFetch; }

  globalThis.fetch=async()=>new Response('not html',{headers:{'content-type':'application/pdf'}});
  try{
    const response=await onRequestPost({request:request('https://example.com/menu.pdf')});
    assert.equal(response.status,415);
  }finally{ globalThis.fetch=originalFetch; }
});

test('recipe import endpoint has controlled method and network failures',async()=>{
  assert.equal((await onRequestGet()).status,405);
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{ throw new Error('offline'); };
  try{ assert.equal((await onRequestPost({request:request('https://example.com/recipe')})).status,502); }
  finally{ globalThis.fetch=originalFetch; }
});

test('recipe import explains when Allrecipes blocks automated access',async()=>{
  const originalFetch=globalThis.fetch;
  let called=false;
  globalThis.fetch=async()=>{ called=true; throw new Error('fetch should not run'); };
  try{
    const response=await onRequestPost({request:request('https://www.allrecipes.com/recipe/16330/stuffed-peppers/')});
    assert.equal(response.status,422);
    assert.match((await response.json()).error,/Allrecipes currently blocks automatic imports/);
    assert.equal(called,false);
  }finally{ globalThis.fetch=originalFetch; }
});
