"""Local source/PDF parity acceptance; requires generated review PDF, no network."""
from pathlib import Path
import ast,json,subprocess,sys
from pypdf import PdfReader
root=Path(__file__).resolve().parents[2]
node=sys.argv[1] if len(sys.argv)>1 else 'node'
content=json.loads(subprocess.check_output([node,'--input-type=module','-e',"import {SURVIVAL_KIT_CONTENT as c} from './functions/_shared/survival-kit-content.mjs';console.log(JSON.stringify(c))"],cwd=root))
tree=ast.parse((root/'functions/_shared/build_survival_kit.py').read_text(encoding='utf-8'))
rows=next(ast.literal_eval(n.value) for n in ast.walk(tree) if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='recipes' for t in n.targets))
assert len(rows)==len(content['recipes'])==16
for row,recipe in zip(rows,content['recipes']):
 assert list(row)==[recipe[k] for k in ['name','servings','time','ingredients','steps','plainOption','allergenReminder','lowEnergyOption']],recipe['id']
ids=['cheesy-taco-rice','build-your-own-baked-potatoes','separate-component-taco-night','build-your-own-pasta-night']
for recipe in content['recipes']:
 if recipe['id'] in ids:
  assert any('canned or fully cooked beans' in line for line in recipe['ingredients']),recipe['id']
  assert 'canned or fully cooked beans' in ' '.join(recipe['steps']),recipe['id']
  assert 'raw or dried beans' in ' '.join(recipe['steps']) or 'dried or raw beans' in ' '.join(recipe['steps'])
pdf=PdfReader(root/'output/pdf/FoodMyWay-Picky-Eater-Survival-Kit.pdf');assert len(pdf.pages)==36
text=' '.join(' '.join(p.extract_text().split()) for p in pdf.pages)
for recipe in content['recipes']:
 if recipe['id'] in ids:
  for line in recipe['ingredients']+recipe['steps']+[recipe['lowEnergyOption']]:
   assert ' '.join(line.split()) in text,(recipe['id'],line)
assert 'Rice + heated canned or fully cooked beans' in text
assert '1 lb drained canned or fully cooked beans' in text
print('PASS: all16 complete recipe records match; four bean recipes qualified; 36page PDF contains corrected ingredients/steps/options/planning/emergency copy')

