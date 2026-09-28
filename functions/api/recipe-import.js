import { parseRecipeHtml, recipeImportLimits, validateRecipeUrl } from '../_shared/recipe-import.mjs';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
}

export async function onRequestPost({request}){
  const length=Number(request.headers.get('content-length') || 0);
  if(length>4000) return json({error:'Recipe link request is too large.'},413);
  let input;
  try{ input=await request.json(); }catch{ return json({error:'Invalid JSON request.'},400); }
  let current;
  try{ current=validateRecipeUrl(input?.url); }catch(error){ return json({error:error.message},400); }
  if(current.hostname==='allrecipes.com' || current.hostname.endsWith('.allrecipes.com')){
    return json({error:'Allrecipes currently blocks automatic imports. Try a recipe link from another site, or copy its ingredients into the box above.'},422);
  }
  let response;
  try{
    for(let redirects=0;redirects<=3;redirects+=1){
      response=await fetch(current.href,{redirect:'manual',headers:{accept:'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(10000)});
      if([301,302,303,307,308].includes(response.status)){
        if(redirects===3) return json({error:'That recipe link redirects too many times.'},400);
        const location=response.headers.get('location');
        try{ current=validateRecipeUrl(new URL(location,current).href); }catch(error){ return json({error:error.message},400); }
        continue;
      }
      break;
    }
  }catch{ return json({error:'The recipe page could not be reached.'},502); }
  if(!response?.ok) return json({error:'The recipe page could not be opened.'},502);
  const type=String(response.headers.get('content-type') || '').toLowerCase();
  if(type && !type.includes('text/html') && !type.includes('application/xhtml+xml')) return json({error:'That link is not an HTML recipe page.'},415);
  const declared=Number(response.headers.get('content-length') || 0);
  if(declared>recipeImportLimits.MAX_HTML_CHARS) return json({error:'The recipe page is too large to import.'},413);
  let html;
  try{ html=await response.text(); }catch{ return json({error:'The recipe page could not be read.'},502); }
  try{ return json({recipe:parseRecipeHtml(html,current.href)}); }
  catch(error){ return json({error:error.message},422); }
}

export async function onRequestGet(){
  return json({error:'Use POST with a recipe URL.'},405);
}
