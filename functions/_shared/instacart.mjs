const UNIT_MAP = new Map([
  ['count','each'],['each','each'],['medium','medium'],['large','large'],['small','small'],
  ['cup','cup'],['cups','cup'],['c','cup'],['tbsp','tablespoon'],['tablespoon','tablespoon'],['tablespoons','tablespoon'],
  ['tsp','teaspoon'],['teaspoon','teaspoon'],['teaspoons','teaspoon'],['lb','pound'],['lbs','pound'],['pound','pound'],['pounds','pound'],
  ['oz','ounce'],['ounce','ounce'],['ounces','ounce'],['g','gram'],['gram','gram'],['grams','gram'],['kg','kilogram'],['kilogram','kilogram'],['kilograms','kilogram'],
  ['ml','milliliter'],['milliliter','milliliter'],['milliliters','milliliter'],['l','liter'],['liter','liter'],['liters','liter'],
  ['gal','gallon'],['gallon','gallon'],['gallons','gallon'],['pt','pint'],['pint','pint'],['pints','pint'],['qt','quart'],['quart','quart'],['quarts','quart'],
  ['can','can'],['cans','can'],['bunch','bunch'],['bunches','bunch'],['head','head'],['heads','head'],
  ['package','package'],['packages','package'],['packet','packet'],['packets','packet'],['ear','ears'],['ears','ears'],
  ['clove','each'],['cloves','each'],['egg','each'],['eggs','each'],['piece','each'],['pieces','each'],['slice','each'],['slices','each']
]);

export function normalizeCommerceItem(item){
  const name=String(item?.name || '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().toLowerCase().slice(0,120);
  if(!name || name==='skip it') return null;
  const rawQuantity=Number(item?.quantity);
  const quantity=Number.isFinite(rawQuantity) && rawQuantity>0 ? Math.max(0.01,Number(rawQuantity.toFixed(2))) : 1;
  const sourceUnit=String(item?.unit || 'count').trim().toLowerCase();
  return {
    name,
    display_text:String(item?.displayText || name).trim().slice(0,120),
    line_item_measurements:[{ quantity, unit:UNIT_MAP.get(sourceUnit) || 'each' }]
  };
}

export function buildInstacartListPayload(input){
  const title=String(input?.title || '').trim().slice(0,120) || 'Food My Way grocery list';
  const lineItems=(Array.isArray(input?.items) ? input.items : [])
    .map(normalizeCommerceItem)
    .filter(Boolean)
    .slice(0,75);
  if(!lineItems.length) throw new Error('At least one grocery item is required.');
  const payload={ title, link_type:'shopping_list', line_items:lineItems };
  const linkback=String(input?.linkbackUrl || '').trim();
  if(/^https:\/\//i.test(linkback)){
    payload.landing_page_configuration={ partner_linkback_url:linkback };
  }
  return payload;
}

export function isAllowedInstacartUrl(value){
  try{
    const url=new URL(String(value || ''));
    return url.protocol==='https:' && ['www.instacart.com','www.instacart.ca'].includes(url.hostname);
  }catch{ return false; }
}
