let servings=2,state=null;
const $=id=>document.getElementById(id);
const ROLE_MAP=[[/chicken|beef|turkey|pork|tofu|beans|eggs/i,'protein'],[/rice|pasta|potato|quinoa/i,'starch'],[/onion|garlic/i,'aromatic']];
const BASE={protein:{a:0.5,u:'lb'},veg:{a:1,u:'cup'},starch:{a:1,u:'cup'},aromatic:{a:0.5,u:'cup'}};
const roleFor=n=>{for(const [r,v] of ROLE_MAP)if(r.test(n))return v;return 'veg'};
const parse=s=>s.replace(/,+/g,'\n').split(/\n+/).map(t=>t.trim()).filter(Boolean);
const qty=r=>{const b=BASE[r]||BASE.veg;const v=b.a*servings;return `${v%1?v.toFixed(1):v} ${b.u}${v>1?'s':''}`};

$('generateBtn').onclick=()=>{
 const names=parse($('ingredientsInput').value);
 if(!names.length) return alert('Add ingredients');
 state={ingredients:names.map(n=>({name:n,role:roleFor(n)})),steps:[
  'Prep ingredients and season lightly.',
  'Cook protein until done; cook starch if included.',
  'Combine everything, adjust seasoning, and serve.'
 ]};
 $('recipeTitle').textContent=`Simple ${state.ingredients.find(i=>i.role==='protein')?.name||'Veggie'} Dinner`;
 $('inputCard').classList.add('hidden');$('resultCard').classList.remove('hidden');render();
};

function render(){
 $('servingsVal').textContent=servings;
 const il=$('ingredientsList');il.innerHTML='';
 state.ingredients.forEach(i=>{const li=document.createElement('li');li.textContent=`${qty(i.role)} ${i.name}`;il.appendChild(li);});
 const ol=$('instructionsList');ol.innerHTML='';state.steps.forEach(s=>{const li=document.createElement('li');li.textContent=s;ol.appendChild(li);});
}

$('incServ').onclick=()=>{servings=Math.min(8,servings+1);render()};
$('decServ').onclick=()=>{servings=Math.max(1,servings-1);render()};
$('backBtn').onclick=()=>{$('resultCard').classList.add('hidden');$('inputCard').classList.remove('hidden');servings=2};
