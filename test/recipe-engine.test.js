const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canonName,
  parseInputIngredient,
  roleFor,
  normalize,
  buildInstructions,
  recipeDetails,
  titleFrom,
  recipeMacros,
  isActiveIngredient,
  FREE_RECIPE_LIMIT,
  canSaveRecipe,
  encodeSharedRecipe,
  decodeSharedRecipe
} = require('../app.js');

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
    name:'chicken breast', quantity:2, unit:'lb'
  });
  assert.deepEqual(parseInputIngredient('1/2 cup shredded cheddar'), {
    name:'cheddar cheese', quantity:0.5, unit:'cups'
  });
  const ingredients = normalize(['2 lbs chicken breasts', '1 cup bell peppers']);
  assert.deepEqual(ingredients.map(item=>item.base), [{v:2,u:'lb'}, {v:1,u:'cups'}]);
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
