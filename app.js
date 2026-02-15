function generateRecipe(){
const recipe={
title:'Chicken Breast with Broccoli and White Rice',
servings:Number(document.getElementById('servings').value)||1,
ingredients:[
'150 g chicken breast',
'3/4 cup white rice',
'1 tbsp olive oil',
'1 cup broccoli',
'2 cloves garlic',
'salt, to taste',
'black pepper, to taste'
],
instructions:[
'Cook the rice according to package instructions.',
'Season the chicken with salt and pepper.',
'Heat olive oil in a pan over medium heat.',
'Cook the chicken 5–7 minutes per side until done.',
'Add garlic and cook briefly until fragrant.',
'Steam or sauté broccoli until tender.',
'Assemble the bowl and serve.'
],
nutrition:{
Calories:520,
Protein:'45 g',
Carbohydrates:'48 g',
Fat:'16 g',
Fiber:'7 g',
Sugar:'6 g',
Sodium:'700 mg'
}
};
render(recipe);
}

function render(recipe){
document.getElementById('recipe').classList.remove('hidden');
document.getElementById('title').textContent=recipe.title;
document.getElementById('meta-servings').textContent='Servings: '+recipe.servings;
document.getElementById('meta-calories').textContent='Calories/serving: '+Math.round(recipe.nutrition.Calories/recipe.servings);
document.getElementById('meta-protein').textContent='Protein/serving: 45 g';

const il=document.getElementById('ingredient-list');il.innerHTML='';
recipe.ingredients.forEach(i=>{const li=document.createElement('li');li.textContent=i;il.appendChild(li)});

const inst=document.getElementById('instructions');inst.innerHTML='';
recipe.instructions.forEach(s=>{const li=document.createElement('li');li.textContent=s;inst.appendChild(li)});

const nut=document.getElementById('nutrition');nut.innerHTML='';
Object.entries(recipe.nutrition).forEach(([k,v])=>{
const tr=document.createElement('tr');
tr.innerHTML='<td>'+k+'</td><td>'+v+'</td>';
nut.appendChild(tr);
});
}