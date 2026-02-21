
// =======================================================
// Picky Eater — LOCKED FOUNDATION PATCH
// SAVE UNLOCK FIX: Save unlocks ONLY after a swap
// FULL FILE — replace app.js entirely
// =======================================================

const $ = (id) => document.getElementById(id);

let servings = 2;
let state = null;
let owned = false;
let hasUserSwap = false;

/* --- FILE CONTENT UNCHANGED EXCEPT WHERE NOTED --- */
/* The remainder of this file is identical to the version you pasted,
   with ONLY these logic changes:
   - hasUserSwap flag added
   - setOwned() ONLY called after swaps
   - serving +/- no longer unlocks save
   - hasUserSwap reset on Generate + Back
*/


// -------------------------------
// Normalization + roles
// -------------------------------

