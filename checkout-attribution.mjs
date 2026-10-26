const sources=new Set(['tiktok','instagram','facebook','meta','organic']);
const creatives=new Set(['four_safe_foods','taco_swap','picky_adults','link_in_bio']);
const opaque=/^vz_[a-f0-9]{48}$/;

// This is bounded, untrusted campaign context, never payment or identity proof.
export function campaignFromSearch(search=''){
  const query=new URLSearchParams(search);
  const raw=String(query.get('utm_source') || '').toLowerCase();
  const source=({ig:'instagram',fb:'facebook'})[raw] || raw;
  const creative=String(query.get('utm_content') || '').toLowerCase();
  const reference=query.get('veyzlo_ref') || '';
  return {source:sources.has(source)?source:'unknown',creative:creatives.has(creative)?creative:'unknown',reference:opaque.test(reference)?reference:null};
}

export function parseCheckoutReference(value){
  const unknown={source:'unknown',creative:'unknown',reference:null};
  if(typeof value!=='string' || value.length>200) return unknown;
  if(opaque.test(value)) return {...unknown,reference:value};
  const match=/^fmw1-([a-z]+)-([a-z_]+)(?:-(vz_[a-f0-9]{48}))?$/.exec(value);
  if(!match || (!sources.has(match[1]) && match[1]!=='unknown') || (!creatives.has(match[2]) && match[2]!=='unknown')) return unknown;
  return {source:match[1],creative:match[2],reference:match[3] || null};
}

export function checkoutWithAttribution(value,search=''){
  try{
    const url=new URL(value);
    if(url.protocol!=='https:' || !['buy.stripe.com','checkout.stripe.com'].includes(url.hostname) || url.username || url.password || url.port) return value;
    const campaign=campaignFromSearch(search);
    if(campaign.source==='unknown' && campaign.creative==='unknown'){
      if(campaign.reference) url.searchParams.set('client_reference_id',campaign.reference);
    }else{
      url.searchParams.set('client_reference_id',`fmw1-${campaign.source}-${campaign.creative}${campaign.reference?`-${campaign.reference}`:''}`);
    }
    return url.href;
  }catch{return value;}
}

export function attributedInternalUrl(value,search=''){
  try{
    const url=new URL(value,'https://foodmyway.app/');
    if(url.origin!=='https://foodmyway.app' || !['/','/index.html','/survival-kit','/survival-kit.html','/digital-kit','/digital-kit.html'].includes(url.pathname)) return value;
    const campaign=campaignFromSearch(search);
    // Copy no arbitrary parameters from the source page.
    if(campaign.source!=='unknown') url.searchParams.set('utm_source',campaign.source);
    if(campaign.creative!=='unknown') url.searchParams.set('utm_content',campaign.creative);
    if(campaign.reference) url.searchParams.set('veyzlo_ref',campaign.reference);
    return `${url.pathname}${url.search}${url.hash}`;
  }catch{return value;}
}
