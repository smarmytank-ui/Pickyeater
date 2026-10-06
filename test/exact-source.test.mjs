import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRecipeHtml} from '../functions/_shared/recipe-import.mjs';
function html(overrides={}){return `<script type="application/ld+json">${JSON.stringify({'@type':'Recipe',name:'Synthetic source title',recipeYield:'12 bowls',recipeIngredient:Array.from({length:30},(_,index)=>`${index+1} g synthetic ingredient ${index}`),recipeInstructions:['First instruction.\n\nKeep this paragraph.','Second instruction.'],...overrides})}</script>`;}
test('source import retains more than twelve ingredients, original yield and instruction paragraphs',()=>{
  const recipe=parseRecipeHtml(html(),'https://example.com/synthetic');
  assert.equal(recipe.title,'Synthetic source title');assert.equal(recipe.servings,'12 bowls');
  assert.equal(recipe.ingredients.length,30);assert.equal(recipe.ingredients[29],'30 g synthetic ingredient 29');
  assert.equal(recipe.instructions[0],'First instruction.\n\nKeep this paragraph.');
});
test('source import rejects oversize content instead of silently dropping it',()=>{
  assert.throws(()=>parseRecipeHtml(html({recipeIngredient:Array(201).fill('synthetic ingredient')}),'https://example.com/synthetic'),/Too many ingredients/);
  assert.throws(()=>parseRecipeHtml(html({recipeInstructions:Array(201).fill('Synthetic step.')}),'https://example.com/synthetic'),/Too many instruction/);
  assert.throws(()=>parseRecipeHtml(html({recipeIngredient:['a'.repeat(2001)]}),'https://example.com/synthetic'),/exceeds/);
});
