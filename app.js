function generateRecipe(){
const r={
title:'Chicken Breast with Broccoli and White Rice',
ingredients:['150g chicken breast','3/4 cup white rice','1 tbsp olive oil','1 cup broccoli'],
instructions:['Cook rice.','Cook chicken.','Steam broccoli.','Assemble and serve.'],
nutrition:{Calories:520,Protein:'45g',Carbs:'48g',Fat:'16g'}
}
render(r)
}
function render(r){
document.getElementById('recipe').classList.remove('hidden')
document.getElementById('title').textContent=r.title
document.getElementById('meta').textContent='Calories: '+r.nutrition.Calories
const il=document.getElementById('ingredient-list');il.innerHTML=''
r.ingredients.forEach(i=>{const li=document.createElement('li');li.textContent=i;il.appendChild(li)})
const inst=document.getElementById('instructions');inst.innerHTML=''
r.instructions.forEach(s=>{const li=document.createElement('li');li.textContent=s;inst.appendChild(li)})
const n=document.getElementById('nutrition');n.innerHTML=''
Object.entries(r.nutrition).forEach(([k,v])=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${k}</td><td>${v}</td>`;n.appendChild(tr)})
}
function applySwap(type){generateRecipe()}