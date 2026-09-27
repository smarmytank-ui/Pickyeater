import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInstacartListPayload, isAllowedInstacartUrl, normalizeCommerceItem } from '../functions/_shared/instacart.mjs';
import { representativeGroceryLists } from '../fixtures/grocery-lists.mjs';

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
  assert.equal('enable_pantry_items' in payload.landing_page_configuration,false);
});

test('supports documented metric, volume, package, and produce units',()=>{
  const cases=[['grams','gram'],['kg','kilogram'],['ml','milliliter'],['liters','liter'],['packages','package'],['bunches','bunch'],['heads','head'],['large','large']];
  for(const [input,expected] of cases) assert.equal(normalizeCommerceItem({name:'test item',quantity:1,unit:input}).line_item_measurements[0].unit,expected);
});

test('keeps tiny positive quantities valid and bounds product names',()=>{
  const item=normalizeCommerceItem({name:`Milk\n${'x'.repeat(200)}`,quantity:0.001,unit:'ml'});
  assert.equal(item.line_item_measurements[0].quantity,0.01);
  assert.ok(item.name.length<=120);
  assert.equal(item.name.includes('\n'),false);
});

test('accepts only exact HTTPS Instacart marketplace hosts',()=>{
  assert.equal(isAllowedInstacartUrl('https://www.instacart.com/store/products/123'),true);
  assert.equal(isAllowedInstacartUrl('https://www.instacart.ca/store/products/123'),true);
  assert.equal(isAllowedInstacartUrl('https://www.instacart.com.evil.example/phish'),false);
  assert.equal(isAllowedInstacartUrl('http://www.instacart.com/store/products/123'),false);
});

test('rejects an empty grocery list',()=>{
  assert.throws(()=>buildInstacartListPayload({items:[]}),/At least one/);
});

test('builds valid payloads for 25 representative picky-eater grocery lists',()=>{
  const supported=new Set(['each','medium','large','small','cup','tablespoon','teaspoon','pound','ounce','gram','kilogram','milliliter','liter','gallon','pint','quart','can','bunch','head','package','packet','ears']);
  assert.equal(representativeGroceryLists.length,25);
  for(const fixture of representativeGroceryLists){
    const payload=buildInstacartListPayload({title:fixture.name,items:fixture.items,linkbackUrl:'https://foodmyway.app/'});
    assert.ok(payload.line_items.length>=3,fixture.name);
    for(const line of payload.line_items){
      assert.ok(line.name.length>0 && line.name.length<=120,fixture.name);
      assert.ok(line.line_item_measurements[0].quantity>0,fixture.name);
      assert.ok(supported.has(line.line_item_measurements[0].unit),`${fixture.name}: ${line.line_item_measurements[0].unit}`);
    }
  }
});
