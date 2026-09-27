const UNIT_MAP = new Map([
  ['count','each'],['medium','each'],['large','each'],['small','each'],
  ['cups','cup'],['cup','cup'],['tbsp','tablespoon'],['tsp','teaspoon'],
  ['lb','pound'],['oz','ounce'],['cloves','each'],['eggs','each'],
  ['pieces','each'],['slices','each'],['cans','can']
]);

export function normalizeCommerceItem(item){
  const name=String(item?.name || '').trim().toLowerCase();
  if(!name || name==='skip it') return null;
  const rawQuantity=Number(item?.quantity);
  const quantity=Number.isFinite(rawQuantity) && rawQuantity>0 ? Number(rawQuantity.toFixed(2)) : 1;
  const sourceUnit=String(item?.unit || 'count').trim().toLowerCase();
  return {
    name,
    display_text:String(item?.displayText || name).trim().slice(0,120),
    line_item_measurements:[{ quantity, unit:UNIT_MAP.get(sourceUnit) || 'each' }]
  };
}

export function buildInstacartListPayload(input){
  const title=String(input?.title || 'Food My Way grocery list').trim().slice(0,120);
  const lineItems=(Array.isArray(input?.items) ? input.items : [])
    .map(normalizeCommerceItem)
    .filter(Boolean)
    .slice(0,75);
  if(!lineItems.length) throw new Error('At least one grocery item is required.');
  const payload={ title, link_type:'shopping_list', line_items:lineItems };
  const linkback=String(input?.linkbackUrl || '').trim();
  if(/^https:\/\//i.test(linkback)){
    payload.landing_page_configuration={ partner_linkback_url:linkback, enable_pantry_items:true };
  }
  return payload;
}
