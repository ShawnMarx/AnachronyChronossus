// pw-shapedie.mjs — check the shape (Research) die's real face renders on a rolled turn.
//
//   SHOT_DIR=/tmp node pw-shapedie.mjs [url]
//
// Two different display rules, and getting them the wrong way round states something false:
//   * Research  — the die face AND the Breakthrough art beside it (the shape rolled and the
//                 Breakthrough kept are two statements).
//   * Assimilate (Fractures, C04) — the die ALONE, because that roll resolves to an
//                 Operator / Technology / fewer-of and never to a Breakthrough.
//
// ASSIM=1 drives the Fractures Assimilate case instead of Research.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '/tmp';
const URL = process.argv[2] ?? 'http://localhost:5173/';
const ASSIM = !!process.env.ASSIM;

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms = 350) => page.waitForTimeout(ms);
const body = () => page.locator('body').innerText();
const ok = (label, cond) => console.log(`${label} = ${cond} -> ${cond ? 'OK' : 'FAIL'}`);

/** The Action Rounds intro is a modal that swallows clicks on the top bar. */
const dismissModal = async () => {
  if (!(await page.locator('.modal-overlay').count())) return;
  const btn = page
    .locator('.modal-overlay')
    .getByRole('button', { name: /Take Bot Action|Begin|Continue|Start|Ready|OK/i })
    .first();
  if (await btn.count()) { await btn.click(); await wait(400); }
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Chronossus', { exact: false }).first().click(); await wait(450);
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByText(ASSIM ? 'Fractures of Time' : 'Base', { exact: true }).first().click();
await wait(250);
for (let i = 0; i < 6; i++) {
  if (/Setup Instructions/i.test(await body())) break;
  const c = page.getByRole('button', { name: /Continue/i }).first();
  if (!(await c.count())) break;
  await c.click(); await wait(350);
}
await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(450);
// Fractures runs an extra Era Zero Warp before Era 1 and does not skip Era 1's Paradox
// phase, so the walk is longer and passes prompts that answer with a digit, not Continue.
for (let i = 0; i < 30; i++) {
  if (/Take Bot Action/i.test(await body())) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from|Roll for|No — none|Begin Era/i }).first();
  if (await c.count()) { await c.click(); await wait(420); continue; }
  const digit = page.locator('.vp-digit, .pp-buttons button').first();
  if (await digit.count()) { await digit.click({ force: true }); await wait(420); continue; }
  break;
}
await dismissModal();

// Park marker 2 (Long path) on the step under test and roll until the AI die picks it.
// Long-8 = Research (index 7); Fractures' Assimilate is a Valley Action reached from the
// tile slot, so there the marker goes on slot I instead.
const step = ASSIM ? 2 : 7;
const marker = ASSIM ? '2' : '2';
let reached = false;
for (let attempt = 0; attempt < 30 && !reached; attempt++) {
  // Re-park the marker each round: a committed turn advances it off the step under test.
  await page.evaluate(
    ([m, st]) => {
      const key = 'anachrony:chronossus';
      const data = JSON.parse(localStorage.getItem(key));
      data.ui.markerSteps[m] = st;
      localStorage.setItem(key, JSON.stringify(data));
    },
    [marker, step],
  );
  await page.reload({ waitUntil: 'networkidle' }); await wait(550);

  // The Era's first turn is offered inside a modal; later ones from the top bar. Either
  // way the click IS the roll, so take whichever is on screen.
  const inModal = page
    .locator('.modal-overlay')
    .getByRole('button', { name: /Take Bot Action/i })
    .first();
  const roll = (await inModal.count())
    ? inModal
    : page.getByRole('button', { name: /Take Bot Action/i }).first();
  if (!(await roll.count())) {
    console.log('no roll button on screen — stopping');
    break;
  }
  await roll.click({ force: true }); await wait(800);

  // Research places an Exosuit, so its placement gate comes first.
  // Walk the dialog's gates: Assimilate asks about the Action space, then the Blink check,
  // before it rolls. Research just has its placement gate. Either way, keep answering the
  // affirmative option until the roll shows or the dialog runs out of questions.
  for (let step2 = 0; step2 < 5; step2++) {
    if (/shape die rolled/i.test(await body())) break;
    const gate = page
      .getByRole('button', { name: /Confirm placed|✓ Placed|✓ Yes|Yes —|Confirm|✓ Free/i })
      .first();
    if (!(await gate.count())) break;
    await gate.click({ force: true }); await wait(650);
  }

  reached = /shape die rolled/i.test(await body());
  if (!reached) {
    if (attempt === 0) {
      console.log(
        'FIRST DIALOG:',
        (await body()).split('\n').filter((l) => l.trim()).slice(6, 20).join(' | '),
      );
    }
    // Commit the wrong turn so the next roll is a fresh one.
    const start = page.getByRole('button', { name: /Start Your Turn/i }).first();
    if (await start.count()) { await start.click({ force: true }); await wait(600); }
    const close = page.locator('.dp-close').first();
    if (await close.count()) { await close.click({ force: true }); await wait(300); }
  }
}

ok('reached the roll', reached);
const dice = await page.locator('.shape-die-face').count();
const art = await page.locator('.shape-roll .shape-icon').count();
console.log(`shape-die-face = ${dice}, breakthrough art in the same row = ${art}`);
ok('the die face is shown', dice >= 1);
if (ASSIM) {
  ok('the die is ALONE — no Breakthrough art beside it', art === 0);
} else {
  ok('the Breakthrough art is kept beside it', art >= 1);
}
await page.screenshot({ path: `${SHOT}/${ASSIM ? 'assimilate' : 'research'}-die.png`, fullPage: true });
console.log('ERRORS:', errors);
await b.close();
