param(
  [string]$Path = "app.js"
)

function Fail($msg){
  Write-Host ""
  Write-Host "ERROR: $msg" -ForegroundColor Red
  Write-Host ""
  exit 1
}

if(!(Test-Path $Path)){
  Fail "Couldn't find $Path in this folder. Put this patch next to your app.js and run again."
}

$js = Get-Content -Raw -LiteralPath $Path

# Safety check: ensure this looks like the Picky Eater build
if($js -notmatch "Picky Eater"){
  Fail "This doesn't look like the Picky Eater app.js file."
}

# Backup
$bak = "$Path.bak"
Copy-Item -LiteralPath $Path -Destination $bak -Force
Write-Host "Backup created: $bak"

$changed = 0

# 1) Add hasUserSwap flag (only if missing)
if($js -notmatch "let hasUserSwap\s*=\s*false;"){
  $js2 = $js -replace "let owned = false;\s*\r?\n", "let owned = false;`r`nlet hasUserSwap = false;`r`n"
  if($js2 -ne $js){ $js = $js2; $changed++ } else { Fail "Couldn't insert hasUserSwap flag (pattern not found: 'let owned = false;')." }
}else{
  Write-Host "hasUserSwap already present — skipping insert."
}

# 2) Remove setOwned() from serving +/- (do NOT unlock Save on servings change)
$before = $js
$js = [regex]::Replace($js,
  "incServ'\);\s*\r?\n\s*const dec = \$\('decServ'\);\s*\r?\n\s*const saveBtn = \$\('saveBtn'\);\s*\r?\n\s*const backBtn = \$\('backBtn'\);\s*",
  {
    param($m) $m.Value
  }, 'Singleline'
)

# Replace inc onclick block
$js2 = [regex]::Replace($js,
"inc\.onclick\s*=\s*\(\)\s*=>\s*\{\s*\r?\n\s*servings\s*=\s*Math\.min\(8,\s*servings\+1\);\s*\r?\n\s*setOwned\(\);\s*\r?\n\s*render\(\);\s*\r?\n\s*\};",
"inc.onclick = ()=>{`r`n      servings = Math.min(8, servings+1);`r`n      render();`r`n    };",
"Singleline"
)
if($js2 -ne $js){ $js = $js2; $changed++ } else { Write-Host "Warning: inc onclick pattern not found (maybe already fixed)." }

# Replace dec onclick block
$js2 = [regex]::Replace($js,
"dec\.onclick\s*=\s*\(\)\s*=>\s*\{\s*\r?\n\s*servings\s*=\s*Math\.max\(1,\s*servings-1\);\s*\r?\n\s*setOwned\(\);\s*\r?\n\s*render\(\);\s*\r?\n\s*\};",
"dec.onclick = ()=>{`r`n      servings = Math.max(1, servings-1);`r`n      render();`r`n    };",
"Singleline"
)
if($js2 -ne $js){ $js = $js2; $changed++ } else { Write-Host "Warning: dec onclick pattern not found (maybe already fixed)." }

# 3) Reset hasUserSwap on Generate + Back (start fresh each recipe)
$js2 = [regex]::Replace($js,
"owned\s*=\s*false;\s*\r?\n\s*const sr = \$\('saveRow'\);",
"owned = false;`r`n      hasUserSwap = false;`r`n      const sr = $('saveRow');",
"Singleline"
)
if($js2 -ne $js){ $js = $js2; $changed++ } else { Write-Host "Warning: generate reset insertion not found (pattern may differ)." }

$js2 = [regex]::Replace($js,
"owned\s*=\s*false;\s*\r?\n\s*\$\('resultCard'\)\?\.\s*classList\.add\('hidden'\);",
"owned = false;`r`n      hasUserSwap = false;`r`n      $('resultCard')?.classList.add('hidden');",
"Singleline"
)
if($js2 -ne $js){ $js = $js2; $changed++ } else { Write-Host "Warning: back reset insertion not found (pattern may differ)." }

# 4) Mark swap happened before unlocking Save (catalog swap)
$js2 = $js -replace "applySwap\(ing\.id, opt\);\s*\r?\n\s*sel\.value = '';\s*\r?\n\s*bump\(li\);\s*\r?\n\s*setOwned\(\);",
"applySwap(ing.id, opt);`r`n  hasUserSwap = true;`r`n  sel.value = '';`r`n  bump(li);`r`n  setOwned();"
if($js2 -ne $js){ $js = $js2; $changed++ } else { Write-Host "Warning: catalog swap insertion not found (pattern may differ)." }

# 5) Mark swap happened before unlocking Save (custom swap apply)
$js2 = $js -replace "applySwap\(ing\.id, \{ name: raw, instrPatchKey: null \}, \{ keepRole:true, keepQty:true \}\);\s*\r?\n\s*\r?\n\s*wrap\.remove\(\);\s*\r?\n\s*bump\(li\);\s*\r?\n\s*setOwned\(\);",
"applySwap(ing.id, { name: raw, instrPatchKey: null }, { keepRole:true, keepQty:true });`r`n`r`n      hasUserSwap = true;`r`n      wrap.remove();`r`n      bump(li);`r`n      setOwned();"
if($js2 -ne $js){ $js = $js2; $changed++ } else { Write-Host "Warning: custom swap insertion not found (pattern may differ)." }

# Final write
Set-Content -LiteralPath $Path -Value $js -Encoding UTF8

Write-Host ""
Write-Host "DONE. Patch applied." -ForegroundColor Green
Write-Host "Changes made: $changed"
Write-Host "Now refresh your site and test Generate + swaps."
Write-Host ""