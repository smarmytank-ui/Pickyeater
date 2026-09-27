const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonName,
  parseInputIngredient,
  validateRecipeInput,
  MAX_RECIPE_INGREDIENTS,
  sanitizeTasteProfile,
  roleFor,
  normalize,
  buildInstructions,
  proteinSafetyGuidance,
  recipeDetails,
  titleFrom,
  recipeMacros,
  isActiveIngredient,
  FREE_RECIPE_LIMIT,
  canSaveRecipe,
  validCommerceUrl,
  encodeSharedRecipe,
  decodeSharedRecipe,
  normalizeSavedRecipe,
  MAX_SHARED_RECIPE_CHARS,
  lsSet,
  restoreCloudSnapshot,
  boundedDiaryNumber
} = require('../app.js');

test('quick diary nutrition accepts only bounded nonnegative numbers', () => {
  assert.equal(boundedDiaryNumber('-10',10000),0);
  assert.equal(boundedDiaryNumber('not a number',1000),0);
  assert.equal(boundedDiaryNumber('12.34',1000),12.3);
  assert.equal(boundedDiaryNumber('99999',10000),10000);
});

test('browser commerce navigation accepts only exact HTTPS Instacart hosts', () => {
  assert.equal(validCommerceUrl('https://www.instacart.com/store/products/123'),true);
  assert.equal(validCommerceUrl('https://www.instacart.ca/store/products/123'),true);
  assert.equal(validCommerceUrl('https://www.instacart.com.evil.example/phish'),false);
  assert.equal(validCommerceUrl('javascript:alert(1)'),false);
  assert.equal(validCommerceUrl('http://www.instacart.com/store'),false);
});

test('free plan has the advertised three-recipe save allowance', () => {
  assert.equal(FREE_RECIPE_LIMIT,3);
  assert.equal(canSaveRecipe({premiumEnforced:true,foundingAccess:false,savedCount:2}),true);
  assert.equal(canSaveRecipe({premiumEnforced:true,foundingAccess:false,savedCount:3}),false);
  assert.equal(canSaveRecipe({premiumEnforced:true,foundingAccess:true,savedCount:30}),true);
  assert.equal(canSaveRecipe({premiumEnforced:true,foundingAccess:false,savedCount:3,replacing:true}),true);
  assert.equal(canSaveRecipe({premiumEnforced:false,foundingAccess:false,savedCount:30}),true);
});

test('omits empty optional ingredient slots from customer-facing recipes', () => {
  assert.equal(isActiveIngredient({name:'skip it',base:{v:0,u:''}}),false);
  assert.equal(isActiveIngredient({name:'salt',base:{v:0,u:'tsp'}}),false);
  assert.equal(isActiveIngredient({name:'broccoli',base:{v:2,u:'cups'}}),true);
});

test('cleans common quantities, preparation words, and plurals', () => {
  assert.equal(canonName('2 lbs boneless skinless chicken breasts'), 'chicken breast');
  assert.equal(canonName('1 cup frozen chopped bell peppers'), 'bell pepper');
  assert.equal(canonName('1/2 cup shredded cheddar'), 'cheddar cheese');
});

test('preserves explicit quantities and normalizes units', () => {
  assert.deepEqual(parseInputIngredient('2 lbs boneless chicken breasts'), {
    name:'chicken breast', quantity:2, unit:'lb', preparation:null
  });
  assert.deepEqual(parseInputIngredient('1/2 cup shredded cheddar'), {
    name:'cheddar cheese', quantity:0.5, unit:'cups', preparation:null
  });
  assert.deepEqual(parseInputIngredient('2 packages tofu'), {
    name:'tofu',quantity:2,unit:'package',preparation:null
  });
  const ingredients = normalize(['2 lbs chicken breasts', '1 cup bell peppers']);
  assert.deepEqual(ingredients.map(item=>item.base), [{v:2,u:'lb'}, {v:1,u:'cups'}]);
});

test('understands natural counts for common safe foods', () => {
  const cases=[
    ['4 eggs','eggs',4,'eggs'],
    ['2 potatoes','potatoes',2,'medium'],
    ['8 tortillas','tortillas',8,'count'],
    ['6 frozen chicken nuggets','chicken nuggets',6,'count'],
    ['2 chicken breasts','chicken breast',2,'count'],
    ['4 bagels','bagels',4,'count']
  ];
  for(const [input,name,quantity,unit] of cases){
    const parsed=parseInputIngredient(input);
    assert.equal(parsed.name,name,input);
    assert.equal(parsed.quantity,quantity,input);
    assert.equal(parsed.unit,unit,input);
  }
  assert.equal(parseInputIngredient('6 frozen chicken nuggets').preparation,'frozen');
});

test('recipe input stays within a practical and recognizable boundary', () => {
  assert.equal(MAX_RECIPE_INGREDIENTS,12);
  assert.deepEqual(validateRecipeInput('chicken\nrice'),{ok:true,error:'',lines:['chicken','rice']});
  assert.match(validateRecipeInput('').error,/at least one ingredient/);
  assert.match(validateRecipeInput('---').error,/recognizable food/);
  assert.match(validateRecipeInput('x'.repeat(81)).error,/under 80 characters/);
  assert.match(validateRecipeInput(Array.from({length:13},(_,index)=>`food ${index}`).join('\n')).error,/12 ingredients or fewer/);
});

test('already-cooked and frozen proteins receive preparation-safe guidance', () => {
  assert.equal(parseInputIngredient('2 cups cooked chicken').preparation,'cooked');
  assert.equal(parseInputIngredient('frozen salmon').preparation,'frozen');
  const cooked=normalize(['cooked chicken','rice']);
  const cookedText=buildInstructions(cooked).map(step=>step.text).join(' ');
  assert.match(cookedText,/cooked Chicken Breast and heat to 165°F \(74°C\)/);
  assert.doesNotMatch(cookedText,/safely cooked through/);
  const frozen=normalize(['frozen salmon']);
  const frozenText=buildInstructions(frozen).map(step=>step.text).join(' ');
  assert.match(frozenText,/according to its package directions/);
  assert.match(frozenText,/145°F \(63°C\)/);
});

test('raw animal proteins use thermometer-based minimum temperatures', () => {
  assert.match(proteinSafetyGuidance('chicken breast'),/165°F \(74°C\)/);
  assert.match(proteinSafetyGuidance('ground beef'),/160°F \(71°C\)/);
  assert.match(proteinSafetyGuidance('steak'),/145°F \(63°C\).*rest for 3 minutes/);
  assert.match(proteinSafetyGuidance('salmon'),/145°F \(63°C\)/);
  const text=buildInstructions(normalize(['chicken','ground beef','steak','salmon'])).map(step=>step.text).join(' ');
  assert.doesNotMatch(text,/no pink|until browned and safely cooked/i);
  assert.match(text,/food thermometer/);
});

test('sensory preferences change recipe texture and plating instructions', () => {
  assert.deepEqual(sanitizeTasteProfile({
    name:'Alex',avoids:['Mushrooms','mushrooms'],texture:'soft',servingStyle:'separate'
  }),{
    name:'Alex',avoids:['mushrooms'],texture:'soft',servingStyle:'separate'
  });
  const ingredients=normalize(['potatoes','broccoli']);
  const softSeparate=buildInstructions(ingredients,{texture:'soft',servingStyle:'separate'}).map(step=>step.text).join(' ');
  assert.match(softSeparate,/very soft and easy to bite/);
  assert.match(softSeparate,/soft and easy to bite, about 7–10 minutes/);
  assert.match(softSeparate,/own section of the plate/);
  assert.match(softSeparate,/sauces and toppings on the side/);
  const crisp=buildInstructions(ingredients,{texture:'crisp'}).map(step=>step.text).join(' ');
  assert.match(crisp,/crisp outside and tender inside/);
  assert.match(crisp,/still crisp, about 3–4 minutes/);
});

test('classifies familiar proteins and vegetables', () => {
  assert.equal(roleFor('steak'), 'protein');
  assert.equal(roleFor('corn'), 'veg');
  assert.equal(roleFor('bell pepper'), 'veg');
});

test('unknown and prepared safe foods get neutral guidance instead of vegetable instructions', () => {
  assert.equal(roleFor('chicken nuggets'),'other');
  assert.equal(roleFor('cereal'),'other');
  assert.equal(roleFor('favorite crunchy bites'),'other');
  const ingredients=normalize(['cereal','favorite crunchy bites']);
  assert.deepEqual(ingredients.map(item=>item.base),[{v:1,u:'serving'},{v:1,u:'serving'}]);
  const instructions=buildInstructions(ingredients).map(step=>step.text).join(' ');
  assert.match(instructions,/package directions or the method and texture you prefer/);
  assert.doesNotMatch(instructions,/tender-crisp/);
  assert.equal(titleFrom(ingredients),'Simple Cereal Plate');
});

test('normalization removes duplicate ingredients after cleanup', () => {
  const ingredients = normalize(['chicken', 'chicken breasts', 'broccoli']);
  assert.deepEqual(ingredients.map(item => item.name), ['chicken breast', 'broccoli']);
});

test('instructions name every major ingredient and omit absent vegetable steps', () => {
  const ingredients = normalize(['steak', 'rice', 'cheddar cheese']);
  const text = buildInstructions(ingredients).map(step => step.text).join(' ');
  assert.match(text, /Steak/);
  assert.match(text, /Rice/);
  assert.match(text, /Cheddar Cheese/);
  assert.doesNotMatch(text, /tender-crisp/);
});

test('recipe details and title respond to the ingredient mix', () => {
  const ingredients = normalize(['salmon', 'potatoes', 'green beans']);
  assert.equal(titleFrom(ingredients), 'Simple Salmon Dinner');
  assert.deepEqual(recipeDetails(ingredients), {
    description: 'A straightforward Salmon, Potatoes, Green Beans recipe with familiar flavors and flexible swaps.',
    prepMinutes: 10,
    cookMinutes: 25
  });
});

test('nutrition is numeric and a share payload survives a round trip', () => {
  const ingredients = normalize(['chicken', 'potatoes', 'broccoli']);
  const state = { title: titleFrom(ingredients), ingredients, steps: buildInstructions(ingredients) };
  const nutrition = recipeMacros(state, 2);
  assert.ok(nutrition.calories > 0);
  assert.ok(nutrition.protein > 0);

  const recipe = {
    title: state.title,
    servings: 2,
    ingredients,
    steps: state.steps,
    nutrition
  };
  const decoded = decodeSharedRecipe(encodeSharedRecipe(recipe));
  assert.equal(decoded.title, recipe.title);
  assert.deepEqual(decoded.ingredients.map(item => item.name), ['chicken breast', 'potatoes', 'broccoli']);
});

test('shared recipes are bounded and recomputed before display or saving', () => {
  assert.equal(decodeSharedRecipe('a'.repeat(MAX_SHARED_RECIPE_CHARS+1)),null);
  const imported=normalizeSavedRecipe({
    id:'x'.repeat(200),
    title:'T'.repeat(200),
    description:'D'.repeat(500),
    servings:999,
    prepMinutes:999,
    cookMinutes:999,
    ingredients:Array.from({length:30},(_,index)=>({
      id:`item-${index}`,name:`food ${index}`,role:'other',base:{v:999999,u:'dangerous-unit'}
    })),
    steps:Array.from({length:50},(_,index)=>({key:`step-${index}`,text:'Do this '.repeat(100)})),
    nutrition:{calories:999999,protein:999999,carbs:999999,fat:999999}
  });
  assert.ok(imported);
  assert.equal(imported.id.length,80);
  assert.equal(imported.title.length,100);
  assert.equal(imported.description.length,240);
  assert.equal(imported.servings,8);
  assert.equal(imported.ingredients.filter(isActiveIngredient).length,MAX_RECIPE_INGREDIENTS);
  assert.ok(imported.ingredients.every(item=>item.base.v<=50 && item.base.u==='serving'));
  assert.equal(imported.steps.length,30);
  assert.ok(imported.steps.every(step=>step.text.length<=300));
  assert.notEqual(imported.prepMinutes,999);
  assert.notEqual(imported.cookMinutes,999);
  assert.notEqual(imported.nutrition.calories,999999);
  const unsafe={
    title:'Unsafe import',servings:2,
    ingredients:[{name:'chicken',role:'veg',base:{v:1,u:'lb'}}],
    preferences:{texture:'soft',servingStyle:'separate'},
    steps:[{text:'Serve the chicken raw.'}]
  };
  const json=JSON.stringify(unsafe);
  const encoded=Buffer.from(json,'utf8').toString('base64url');
  const decoded=decodeSharedRecipe(encoded);
  assert.equal(decoded.ingredients[0].role,'protein');
  assert.doesNotMatch(decoded.steps.map(step=>step.text).join(' '),/raw/i);
  assert.match(decoded.steps.map(step=>step.text).join(' '),/165°F \(74°C\)/);
  assert.match(decoded.steps.at(-1).text,/own section of the plate/);
});

test('local persistence reports restricted or full browser storage', () => {
  const previous=global.localStorage;
  try{
    global.localStorage={setItem(){ throw new Error('QuotaExceededError'); }};
    assert.equal(lsSet('test',{value:1}),false);
    let written='';
    global.localStorage={setItem(key,value){ written=`${key}:${value}`; }};
    assert.equal(lsSet('test',{value:1}),true);
    assert.equal(written,'test:{"value":1}');
  }finally{
    if(previous===undefined) delete global.localStorage;
    else global.localStorage=previous;
  }
});

test('cloud restore rolls local keys back when a browser write fails', () => {
  const previous=global.localStorage;
  const values=new Map([
    ['pickyRecipesV2','[{"id":"local"}]'],
    ['foodMyWayWeeklyPlan','["local"]']
  ]);
  let failNextPlanWrite=true;
  global.localStorage={
    getItem:key=>values.has(key) ? values.get(key) : null,
    setItem(key,value){
      if(key==='foodMyWayWeeklyPlan' && failNextPlanWrite){ failNextPlanWrite=false; throw new Error('quota'); }
      values.set(key,String(value));
    },
    removeItem:key=>values.delete(key)
  };
  try{
    assert.throws(()=>restoreCloudSnapshot({data:{
      pickyRecipesV2:[{id:'cloud'}],
      foodMyWayWeeklyPlan:['cloud']
    }}),/previous local data was preserved/);
    assert.equal(values.get('pickyRecipesV2'),'[{"id":"local"}]');
    assert.equal(values.get('foodMyWayWeeklyPlan'),'["local"]');
  }finally{
    if(previous===undefined) delete global.localStorage;
    else global.localStorage=previous;
  }
});
