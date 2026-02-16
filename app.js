// v1.2.2 state transitions
const $ = id => document.getElementById(id);

$('modeGenerate').onclick = () => {
  $('generateMode').classList.remove('hidden');
  $('importMode').classList.add('hidden');
  $('inputTitle').textContent = 'Build from ingredients';
};

$('modeImport').onclick = () => {
  $('importMode').classList.remove('hidden');
  $('generateMode').classList.add('hidden');
  $('inputTitle').textContent = 'Bring a recipe';
};

$('generateBtn').onclick = () => {
  const ings = $('ingredientsInput').value.split('\n').filter(Boolean);
  showResult('Generated recipe', ings, ['Cook everything simply.']);
};

$('importBtn').onclick = () => {
  const title = $('importTitle').value || 'Imported recipe';
  const ings = $('importIngredients').value.split('\n').filter(Boolean);
  const instr = $('importInstructions').value.split('\n').filter(Boolean);
  showResult(title, ings, instr.length ? instr : ['Follow original instructions.']);
};

function showResult(title, ingredients, steps){
  $('inputCard').classList.add('hidden');
  $('resultCard').classList.remove('hidden');
  $('recipeTitle').textContent = title;

  const il = $('ingredientsList'); il.innerHTML = '';
  ingredients.forEach(i => {
    const li = document.createElement('li');
    li.textContent = i;
    il.appendChild(li);
  });

  const ol = $('instructionsList'); ol.innerHTML = '';
  steps.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    ol.appendChild(li);
  });
}

$('backBtn').onclick = () => {
  $('resultCard').classList.add('hidden');
  $('inputCard').classList.remove('hidden');
};
