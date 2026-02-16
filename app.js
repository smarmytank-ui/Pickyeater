// v1.3 — supports generate + import, swaps unchanged (simplified demo)
const qs=id=>document.getElementById(id);
const modeGenerate=qs('modeGenerate'),modeImport=qs('modeImport');
const genSec=qs('generateSection'),impSec=qs('importSection');
modeGenerate.onclick=()=>{modeGenerate.classList.add('active');modeImport.classList.remove('active');genSec.classList.remove('hidden');impSec.classList.add('hidden')}
modeImport.onclick=()=>{modeImport.classList.add('active');modeGenerate.classList.remove('active');impSec.classList.remove('hidden');genSec.classList.add('hidden')}

qs('startGenerate').onclick=()=>modeGenerate.onclick()
qs('startImport').onclick=()=>modeImport.onclick()

function showRecipe(title, ingredients, instructions){
  qs('resultCard').classList.remove('hidden');
  qs('recipeTitle').textContent=title||'Your Recipe';
  const il=qs('ingredientsList'); il.innerHTML='';
  ingredients.forEach(i=>{const li=document.createElement('li');li.textContent=i;il.appendChild(li)});
  const ol=qs('instructionsList'); ol.innerHTML='';
  instructions.forEach(s=>{const li=document.createElement('li');li.textContent=s;ol.appendChild(li)});
  qs('swapsWrap').classList.remove('hidden');
}

qs('generateBtn').onclick=()=>{
  const ings=qs('ingredientsInput').value.split('\n').filter(Boolean);
  showRecipe('Generated Recipe', ings, ['Cook everything simply.']);
}

qs('importBtn').onclick=()=>{
  const title=qs('importTitle').value;
  const ings=qs('importIngredients').value.split('\n').filter(Boolean);
  const instr=qs('importInstructions').value.split('\n').filter(Boolean);
  showRecipe(title||'Imported Recipe', ings, instr.length?instr:['Follow the original instructions.']);
}
