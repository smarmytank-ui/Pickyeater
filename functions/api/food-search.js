import { fatSecretRequest, normalizeFoodDetail, normalizeFoodSummary, normalizeSearchQuery } from '../_shared/fatsecret.mjs';

function json(body,status=200){
  return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, max-age=60','x-content-type-options':'nosniff'}});
}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const foodId=String(url.searchParams.get('food_id') || '').trim();
  try{
    if(foodId){
      if(!/^\d{1,20}$/.test(foodId)) return json({error:'Invalid food selection.'},400);
      const payload=await fatSecretRequest(env,'food.get.v4',{food_id:foodId});
      const food=normalizeFoodDetail(payload.food);
      if(!food.id || !food.servings.length) return json({error:'Nutrition details are unavailable for this food.'},404);
      return json({food,attribution:'Powered by fatsecret'});
    }
    const query=normalizeSearchQuery(url.searchParams.get('q'));
    const payload=await fatSecretRequest(env,'foods.search.v5',{search_expression:query,max_results:12,page_number:0});
    const raw=payload?.foods?.food;
    const foods=(Array.isArray(raw) ? raw : raw ? [raw] : []).map(normalizeFoodSummary).filter(food=>food.id && food.name);
    return json({foods,attribution:'Powered by fatsecret'});
  }catch(error){
    const message=error?.message==='Enter at least two characters.' ? error.message : 'Food search is temporarily unavailable.';
    return json({error:message},message.startsWith('Enter') ? 400 : 503);
  }
}
