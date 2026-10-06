const MAX_HTML_CHARS=1_000_000;
const MAX_INGREDIENTS=200;
const MAX_STEPS=200;

function cleanText(value,max=500){
  const text=String(value ?? '')
    .replace(/<[^>]*>/g,' ')
    .replace(/&(?:nbsp|#160);/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#(?:39|x27);/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,' ')
    .replace(/ {2,}/g,' ')
    .trim();
  if(text.length>max) throw new Error('Recipe text exceeds the import limit. Copy the original recipe into the exact editor.');
  return text;
}

function isPrivateIpv4(hostname){
  const parts=hostname.split('.');
  if(parts.length!==4 || parts.some(part=>!/^(?:0|[1-9]\d{0,2})$/.test(part) || Number(part)>255)) return false;
  const [a,b]=parts.map(Number);
  return a===0 || a===10 || a===127 || (a===169 && b===254) || (a===172 && b>=16 && b<=31) || (a===192 && b===168) || a>=224;
}

export function validateRecipeUrl(value){
  let url;
  try{ url=new URL(String(value || '').trim()); }catch{ throw new Error('Enter a complete recipe link.'); }
  if(url.protocol!=='https:') throw new Error('Recipe links must use HTTPS.');
  if(url.username || url.password) throw new Error('Recipe links cannot contain sign-in information.');
  const hostname=url.hostname.toLowerCase().replace(/\.$/,'');
  if(!hostname || hostname==='localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal') || hostname.endsWith('.lan') || isPrivateIpv4(hostname) || hostname.includes(':')){
    throw new Error('That recipe host is not allowed.');
  }
  url.hash='';
  return url;
}

function includesRecipeType(value){
  const types=Array.isArray(value) ? value : [value];
  return types.some(type=>String(type || '').toLowerCase()==='recipe');
}

function findRecipeNode(value,seen=new Set()){
  if(!value || typeof value!=='object' || seen.has(value)) return null;
  seen.add(value);
  if(includesRecipeType(value['@type'])) return value;
  if(Array.isArray(value)){
    for(const item of value){ const found=findRecipeNode(item,seen); if(found) return found; }
    return null;
  }
  for(const child of Object.values(value)){
    const found=findRecipeNode(child,seen);
    if(found) return found;
  }
  return null;
}

function instructionTexts(value){
  const result=[];
  const visit=item=>{
    if(item==null) return;
    if(result.length>=MAX_STEPS) throw new Error('Too many instruction steps; import the original recipe manually.');
    if(typeof item==='string'){
      const text=cleanText(item,20000);
      if(text) result.push(text);
      return;
    }
    if(Array.isArray(item)){ item.forEach(visit); return; }
    if(typeof item==='object'){
      const type=String(item['@type'] || '').toLowerCase();
      if(type==='howtosection' && item.itemListElement) visit(item.itemListElement);
      else if(item.text || item.name) visit(item.text || item.name);
      else if(item.itemListElement) visit(item.itemListElement);
    }
  };
  visit(value);
  return result;
}

function minutesFromDuration(value){
  const match=String(value || '').match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i);
  if(!match) return null;
  const minutes=(Number(match[1] || 0)*1440)+(Number(match[2] || 0)*60)+Number(match[3] || 0);
  return minutes>0 && minutes<=10080 ? minutes : null;
}

export function parseRecipeHtml(html,sourceUrl){
  const document=String(html || '');
  if(!document || document.length>MAX_HTML_CHARS) throw new Error('The recipe page is too large to import.');
  const scripts=[...document.matchAll(/<script\b[^>]*type=["']application\/ld\+json(?:;[^"']*)?["'][^>]*>([\s\S]*?)<\/script>/gi)];
  let node=null;
  for(const match of scripts){
    const raw=match[1].replace(/^\s*<!--|-->\s*$/g,'').trim();
    try{ node=findRecipeNode(JSON.parse(raw)); }catch{ continue; }
    if(node) break;
  }
  if(!node) throw new Error('No structured recipe was found on that page. Try another link or enter the ingredients manually.');
  const ingredients=(Array.isArray(node.recipeIngredient) ? node.recipeIngredient : [])
    .map(item=>cleanText(item,2000)).filter(Boolean);
  if(ingredients.length>MAX_INGREDIENTS) throw new Error('Too many ingredients; import the original recipe manually.');
  if(!ingredients.length) throw new Error('That page did not provide an ingredient list.');
  const steps=instructionTexts(node.recipeInstructions);
  const source=validateRecipeUrl(sourceUrl);
  return {
    title:cleanText(node.name,1000) || 'Imported recipe',
    description:cleanText(node.description,500),
    ingredients,
    instructions:steps,
    servings:cleanText(node.recipeYield,1000),
    prepMinutes:minutesFromDuration(node.prepTime),
    cookMinutes:minutesFromDuration(node.cookTime),
    totalMinutes:minutesFromDuration(node.totalTime),
    source:{name:source.hostname.replace(/^www\./,''),url:source.href}
  };
}

export const recipeImportLimits=Object.freeze({MAX_HTML_CHARS,MAX_INGREDIENTS,MAX_STEPS});
