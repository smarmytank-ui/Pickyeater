// Storage operations captured unchanged from production baseline 6c38d387e93dc314df9e65711ec904068d0d14b4.
// Normalization is identity in this harness: protected originals are absent from every legacy key.
const TASTE_PROFILE_KEY = 'foodMyWayTasteProfile';
const WEEKLY_PLAN_KEY = 'foodMyWayWeeklyPlan';
const GROCERY_CHECKS_KEY = 'foodMyWayGroceryChecks';
const CLOUD_DATA_KEYS = ['pickyRecipesV2', WEEKLY_PLAN_KEY, GROCERY_CHECKS_KEY, TASTE_PROFILE_KEY, 'pickyDiaryMeals', 'pickyFavorites', 'picky_saved_recipes'];
const RECIPE_BOOK_KEY = 'pickyRecipesV2';
const normalizeSavedRecipe=recipe=>recipe;
function restoreCloudSnapshot(snapshot){
  const data=snapshot?.data && typeof snapshot.data==='object' ? snapshot.data : {};
  const previous=new Map();
  try{
    for(const key of CLOUD_DATA_KEYS) previous.set(key,localStorage.getItem(key));
    for(const key of CLOUD_DATA_KEYS){
      if(Object.prototype.hasOwnProperty.call(data,key)){
        if(!lsSet(key,data[key])) throw new Error('write failed');
      }else localStorage.removeItem(key);
    }
  }catch{
    for(const [key,value] of previous){
      try{
        if(value===null) localStorage.removeItem(key);
        else localStorage.setItem(key,value);
      }catch{}
    }
    throw new Error('This browser could not store the restored backup. Your previous local data was preserved when possible. Export the cloud data and free browser storage before trying again.');
  }
  return true;
}


function getRecipeBook(){
  const current = lsGet(RECIPE_BOOK_KEY, null);
  if(Array.isArray(current)) return current.map(normalizeSavedRecipe).filter(Boolean);

  const legacy = [
    ...lsGet('pickyFavorites', []),
    ...lsGet('picky_saved_recipes', [])
  ].map(normalizeSavedRecipe).filter(Boolean);
  if(legacy.length) lsSet(RECIPE_BOOK_KEY, legacy);
  return legacy;
}

function setRecipeBook(recipes){
  return lsSet(RECIPE_BOOK_KEY, recipes);
}


function betaDataSnapshot(){
  const keys = [RECIPE_BOOK_KEY, WEEKLY_PLAN_KEY, GROCERY_CHECKS_KEY, TASTE_PROFILE_KEY, 'pickyDiaryMeals', 'foodMyWayFounderInterest'];
  return {
    product:'Food My Way',
    exportedAt:new Date().toISOString(),
    version:2,
    data:Object.fromEntries(keys.map(key=>[key,lsGet(key,null)]).filter(([,value])=>value!==null))
  };
}


function lsGet(k, fallback){
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback; }
  catch(e){ return fallback; }
}
function lsSet(k,v){
  try{ localStorage.setItem(k,JSON.stringify(v)); return true; }
  catch{ return false; }
}


module.exports={getRecipeBook,setRecipeBook,restoreCloudSnapshot,betaDataSnapshot};
