import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipeHtml, validateRecipeUrl } from '../functions/_shared/recipe-import.mjs';

test('recipe URLs require a public HTTPS host',()=>{
  assert.equal(validateRecipeUrl('https://example.com/dinner#card').href,'https://example.com/dinner');
  for(const value of [
    'http://example.com/recipe','https://localhost/recipe','https://127.0.0.1/recipe',
    'https://10.0.0.2/recipe','https://172.20.0.2/recipe','https://192.168.1.2/recipe',
    'https://[::1]/recipe','https://user:secret@example.com/recipe'
  ]) assert.throws(()=>validateRecipeUrl(value));
});

test('extracts a schema.org recipe from an LD+JSON graph',()=>{
  const html=`<!doctype html><script type="application/ld+json">${JSON.stringify({
    '@context':'https://schema.org','@graph':[
      {'@type':'WebPage',name:'Dinner'},
      {'@type':['Thing','Recipe'],name:'Crispy Chicken',description:'A <b>simple</b> dinner',
        recipeIngredient:['1 lb chicken breast','2 cups broccoli'],recipeYield:'Serves 4',
        prepTime:'PT15M',cookTime:'PT1H5M',totalTime:'PT1H20M',
        recipeInstructions:[{'@type':'HowToSection',name:'Cook',itemListElement:[
          {'@type':'HowToStep',text:'Heat the oven.'},{'@type':'HowToStep',text:'Bake until done.'}
        ]}]
      }
    ]
  })}</script>`;
  const recipe=parseRecipeHtml(html,'https://www.example.com/chicken#recipe');
  assert.equal(recipe.title,'Crispy Chicken');
  assert.equal(recipe.description,'A simple dinner');
  assert.deepEqual(recipe.ingredients,['1 lb chicken breast','2 cups broccoli']);
  assert.deepEqual(recipe.instructions,['Heat the oven.','Bake until done.']);
  assert.deepEqual([recipe.prepMinutes,recipe.cookMinutes,recipe.totalMinutes],[15,65,80]);
  assert.deepEqual(recipe.source,{name:'example.com',url:'https://www.example.com/chicken'});
});

test('rejects pages without usable structured recipe data',()=>{
  assert.throws(()=>parseRecipeHtml('<html>No recipe</html>','https://example.com'),/No structured recipe/);
  const empty='<script type="application/ld+json">{"@type":"Recipe","name":"Empty"}</script>';
  assert.throws(()=>parseRecipeHtml(empty,'https://example.com'),/ingredient list/);
  assert.throws(()=>parseRecipeHtml('x'.repeat(1_000_001),'https://example.com'),/too large/);
});
