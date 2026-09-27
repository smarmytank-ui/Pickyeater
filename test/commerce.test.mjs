import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstacartListPayload, normalizeCommerceItem } from '../functions/_shared/instacart.mjs';

test('normalizes Food My Way quantities to Instacart measurements',()=>{
  assert.deepEqual(normalizeCommerceItem({name:'Chicken Breast',quantity:1,unit:'lb'}),{
    name:'chicken breast',display_text:'chicken breast',line_item_measurements:[{quantity:1,unit:'pound'}]
  });
  assert.equal(normalizeCommerceItem({name:'skip it',quantity:0,unit:''}),null);
});

test('builds a bounded shopping-list payload with a secure linkback',()=>{
  const payload=buildInstacartListPayload({
    title:'My week',linkbackUrl:'https://foodmyway.app/',
    items:[{name:'broccoli',quantity:2,unit:'cups'},{name:'eggs',quantity:4,unit:'eggs'}]
  });
  assert.equal(payload.link_type,'shopping_list');
  assert.equal(payload.line_items.length,2);
  assert.equal(payload.line_items[1].line_item_measurements[0].unit,'each');
  assert.equal(payload.landing_page_configuration.partner_linkback_url,'https://foodmyway.app/');
});

test('rejects an empty grocery list',()=>{
  assert.throws(()=>buildInstacartListPayload({items:[]}),/At least one/);
});
