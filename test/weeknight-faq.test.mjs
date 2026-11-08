import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { FREE_RECIPE_LIMIT, canSaveRecipe } = require('../app.js');

test('weeknight account FAQ reflects the current free tier and purchase access', async () => {
  const html = await readFile(new URL('../easy-weeknight-meals.html', import.meta.url), 'utf8');
  const answer = html.match(/<summary>Do I need an account to try it\?<\/summary><p>([^<]+)<\/p>/)?.[1];
  assert.equal(answer, 'No. You can create and swap recipes without an account and save up to three recipes on this device. Sign-in is available for purchase access; cloud backup requires Founding membership.');
  assert.doesNotMatch(answer, /private beta|being prepared|paid release/i);
  assert.equal(FREE_RECIPE_LIMIT, 3);
  assert.equal(canSaveRecipe({ premiumEnforced: true, foundingAccess: false, savedCount: 2 }), true);
  assert.equal(canSaveRecipe({ premiumEnforced: true, foundingAccess: false, savedCount: 3 }), false);
});
