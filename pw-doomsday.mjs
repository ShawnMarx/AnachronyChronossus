// pw-doomsday.mjs — drive a real Doomsday Experiment turn in the browser.
//
//   SHOT_DIR=/tmp node pw-doomsday.mjs [url]
//
// Unit tests cover the resolver, but they cannot see the two things that actually broke
// for Pioneers: whether the dialog's steps appear at all, and whether the module's History
// lines survive the clone. So this rolls for real — patching the save to park a Command
// marker on the C07 slot (slot I = m2p3 = marker 2, step index 2) and re-rolling until the
// AI die picks marker 2 — then walks every step and reads History back.
//
// FIRST=1 checks the opposite case: on the very first Experiment of a game the "is one
// marked?" question must be SKIPPED, because no Path markers can be out yet.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '/tmp';
const URL = process.argv[2] ?? 'http://localhost:5173/';
const FIRST = !!process.env.FIRST;
// PASS=1  — no figures left: a rolled Experiment must PASS instead of resolving.
// STOP=1  — its tracker one step from the end: the hard stop must fire on the Action.
// NARROW=1 — shoot the dialog at a tablet width, where a module dialog used to go
//            full-screen while base-game Actions did not.
const PASS = !!process.env.PASS;
const STOP = !!process.env.STOP;
const NARROW = !!process.env.NARROW;
// CLEANUP=1 — jump to Clean Up and walk Doomsday's Check for Impact prompt.
const CLEANUP = !!process.env.CLEANUP;
// SETUP=1 — stop on the setup instructions and print them, to check the module block
// defers to the shared "set up a 2-player game" text instead of restating the base rules.
const SETUP = !!process.env.SETUP;
// L2=1 — drive C08 (slot II = m3s3 = marker 3, step index 2) instead of C07, to check
// Step 1 asks for a Level 2 Experiment rather than repeating Level 1.
const L2 = !!process.env.L2;

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: NARROW ? 1000 : 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms = 320) => page.waitForTimeout(ms);
const bodyText = () => page.locator('body').innerText();
let seenPath = false;

await page.goto(URL, { waitUntil: 'networkidle' });
await page.addInitScript(
  ([stop, pass, l2]) => {
    window.__DD_STOP = stop;
    window.__DD_PASS = pass;
    window.__DD_L2 = l2;
  },
  [STOP, PASS, L2],
);
await page.evaluate(() => localStorage.clear());
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Chronossus', { exact: false }).first().click(); await wait(450);
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByText('Doomsday', { exact: true }).first().click(); await wait(300);
// Modules -> Path (Doomsday only) -> Difficulty -> Setup. Walk Continue until the setup
// instructions are on screen rather than counting clicks, so an added step can't break this.
for (let i = 0; i < 6; i++) {
  const t = await bodyText();
  if (/Setup Instructions/i.test(t)) break;
  if (/Choose Your Path/i.test(t) && !seenPath) {
    seenPath = true;
    console.log('PATH STEP: shown as its own screen after module selection');
    console.log(t.split('\n').filter((l) => l.trim()).slice(2, 12).join('\n'));
    await page.screenshot({ path: `${SHOT}/doomsday-path-step.png`, fullPage: true });
  }
  const c = page.getByRole('button', { name: /Continue/i }).first();
  if (!(await c.count())) break;
  await c.click(); await wait(350);
}
if (SETUP) {
  const txt = await bodyText();
  const i = txt.indexOf('Doomsday setup');
  console.log('--- DOOMSDAY SETUP BLOCK ---');
  console.log(txt.slice(i, i + 1200));
  await page.screenshot({ path: `${SHOT}/doomsday-setup.png`, fullPage: true });
  console.log('ERRORS:', errors);
  await b.close();
  process.exit(0);
}
await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(450);
for (let i = 0; i < 12; i++) {
  if (/Take Bot Action/i.test(await bodyText())) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from|Roll for/i }).first();
  if (await c.count()) { await c.click(); await wait(400); } else break;
}

const patch = () =>
  page.evaluate(
    (first) => {
      const key = 'anachrony:chronossus';
      const data = JSON.parse(localStorage.getItem(key));
      const d = data.state.chronossus.doomsday;
      // Not the first Experiment of the game, unless we're testing that case — otherwise
      // the dialog rightly skips Step 1's question.
      if (d) d.experimentActionRun = !first;
      if (d && window.__DD_STOP) {
        // One step from the bottom of the ladder: the next successful Experiment locks
        // Seal Fate and the Impact must resolve immediately.
        d.botSlot = 9;
      }
      if (window.__DD_PASS) {
        data.state.chronossus.exosuitsAvailable = 0;
        data.state.chronossus.passed = false;
      }
      if (window.__DD_L2) data.ui.markerSteps['3'] = 2; // slot II (m3s3) — C08
      else data.ui.markerSteps['2'] = 2; // slot I (m2p3) — C07
      localStorage.setItem(key, JSON.stringify(data));
      return { doomsday: d, steps: data.ui.markerSteps };
    },
    FIRST,
  );

if (CLEANUP) {
  await page.evaluate(() => {
    const key = 'anachrony:chronossus';
    const data = JSON.parse(localStorage.getItem(key));
    data.state.phase = 'cleanup';
    data.state.era = 3;
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload({ waitUntil: 'networkidle' }); await wait(700);
  const t1 = await bodyText();
  console.log('--- CLEAN UP (check due) ---');
  console.log(t1.split('\n').filter((l) => l.trim()).slice(0, 24).join('\n'));
  await page.screenshot({ path: `${SHOT}/doomsday-cleanup-1.png`, fullPage: true });

  if (process.env.EARTH) {
    // "Save Earth" topmost ends the game on the spot — no Impact, no Evacuation.
    await page.getByRole('button', { name: /Earth is saved/i }).first().click(); await wait(800);
    const t = await bodyText();
    const ended = /Final Score|Score|End Game/i.test(t);
    const slice = await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('anachrony:chronossus'));
      return { d: d.state.chronossus.doomsday, phase: d.state.phase, fin: d.state.finished };
    });
    console.log('EARTH run:', JSON.stringify(slice));
    console.log(`game ended = ${slice.phase === 'endgame' && slice.fin === true} -> ` +
      `${slice.phase === 'endgame' && slice.fin ? 'OK' : 'FAIL'}; score screen visible = ${ended}`);
    console.log(`earthSaved flag = ${slice.d.earthSaved} -> ${slice.d.earthSaved ? 'OK' : 'FAIL'}`);
    console.log(`no Impact Era recorded = ${slice.d.impactEra === null} -> ${slice.d.impactEra === null ? 'OK' : 'FAIL'}`);
    await page.screenshot({ path: `${SHOT}/doomsday-earth-saved.png`, fullPage: true });
    console.log('ERRORS:', errors);
    await b.close();
    process.exit(0);
  }
  const neither = page.getByRole('button', { name: /^Neither$/ }).first();
  console.log(`"Is either tracker locked in?" asked = ${await neither.count() > 0}`);
  if (await neither.count()) { await neither.click(); await wait(600); }
  const t2 = await bodyText();
  const asked2 = /Did the Impact occur at the end of this Era/i.test(t2);
  console.log(`then "Did the Impact occur?" asked = ${asked2} -> ${asked2 ? 'OK' : 'FAIL'}`);
  await page.screenshot({ path: `${SHOT}/doomsday-cleanup-2.png`, fullPage: true });

  const yes = page.getByRole('button', { name: /Yes — the Impact resolved/i }).first();
  if (await yes.count()) { await yes.click(); await wait(700); }
  const after = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('anachrony:chronossus'));
    return d.state.chronossus.doomsday;
  });
  console.log('slice after answering:', JSON.stringify(after));
  console.log(`impactEra recorded = ${after.impactEra} -> ${after.impactEra === 3 ? 'OK' : 'FAIL'}`);
  await page.screenshot({ path: `${SHOT}/doomsday-cleanup-3.png`, fullPage: true });
  console.log('ERRORS:', errors);
  await b.close();
  process.exit(0);
}

let reached = false;
for (let attempt = 0; attempt < 25 && !reached; attempt++) {
  const st = await patch();
  if (attempt === 0) console.log('slice:', JSON.stringify(st.doomsday));
  await page.reload({ waitUntil: 'networkidle' }); await wait(650);
  const modal = page.locator('.modal-overlay');
  const tba = (await modal.count())
    ? modal.getByRole('button', { name: /Take Bot Action/i }).first()
    : page.getByRole('button', { name: /Take Bot Action/i }).first();
  if (!(await tba.count())) { console.log('no Take Bot Action button'); break; }
  await tba.click(); await wait(700);

  const panel = page.locator('.detail-panel').first();
  const dialog = (await panel.count()) ? await panel.innerText() : '';
  const passed = /Out of Exosuits/i.test(await bodyText());
  if (PASS) {
    if (!passed && !/Experiment/i.test(dialog)) continue;
    reached = true;
    console.log(`PASS run: rolled onto the Experiment with 0 figures — passed=${passed} -> ${passed ? 'OK' : 'FAIL'}`);
    await page.screenshot({ path: `${SHOT}/doomsday-pass.png`, fullPage: true });
    break;
  }
  if (!/Experiment/i.test(dialog)) continue;
  reached = true;

  if (NARROW) {
    await page.getByRole('button', { name: /Yes — it takes one/i }).first().click(); await wait(400);
    const box = await panel.boundingBox();
    console.log(`NARROW: viewport 1000px, dialog width ${Math.round(box?.width ?? 0)}px ` +
      `-> ${(box?.width ?? 0) < 990 ? 'OK (docked, not full-screen)' : 'FAIL (full-screen)'}`);
    await panel.screenshot({ path: `${SHOT}/doomsday-narrow.png` });
    break;
  }
  console.log('--- DIALOG (step 1) ---');
  console.log(dialog.split('\n').slice(0, 12).join('\n'));
  await page.screenshot({ path: `${SHOT}/doomsday-step1.png`, fullPage: true });

  if (FIRST) {
    const skipped = !/Path markers/i.test(dialog) || /Prepare for Experimentation/i.test(dialog);
    console.log(`FIRST run: step-1 question skipped = ${skipped} -> ${skipped ? 'OK' : 'FAIL'}`);
    break;
  }

  // Step 1 — yes, it takes one.
  await page.getByRole('button', { name: /Yes — it takes one/i }).first().click(); await wait(400);
  const vpStep = await panel.innerText();
  console.log('--- DIALOG (VP step) ---');
  console.log(vpStep.split('\n').slice(0, 12).join('\n'));
  await page.screenshot({ path: `${SHOT}/doomsday-vp.png`, fullPage: true });

  await page.getByRole('button', { name: /^3 VP$/ }).first().click(); await wait(400);
  const prep = await panel.innerText();
  console.log('--- DIALOG (prepare step) ---');
  console.log(prep.split('\n').slice(0, 14).join('\n'));
  await page.screenshot({ path: `${SHOT}/doomsday-prepare.png`, fullPage: true });

  // Commit.
  await page.getByRole('button', { name: /Start Your Turn/i }).first().click(); await wait(800);

  if (STOP) {
    const after = await bodyText();
    const fired = /Seal Fate is bottommost|resolve the Impact immediately/i.test(after);
    console.log(`STOP run: hard stop fired = ${fired} -> ${fired ? 'OK' : 'FAIL'}`);
    await page.screenshot({ path: `${SHOT}/doomsday-stop.png`, fullPage: true });
    break;
  }

  // History has to show the module's lines — the symptom of a shallow-copied slice is
  // that they silently never appear.
  let text = await bodyText();
  if (!/Executed an Experiment/i.test(text)) {
    // History pane not already docked — open it from the gear menu.
    const gear = page.locator('.gear-btn, [aria-label*="Settings" i]').first();
    if (await gear.count()) { await gear.click().catch(() => {}); await wait(300); }
    const hist = page.getByRole('menuitem', { name: /History/i }).first();
    if (await hist.count()) { await hist.click({ force: true }).catch(() => {}); await wait(500); }
    text = await bodyText();
  }
  const lines = [
    'Executed an Experiment',
    'Moved the Seal Fate tracker',
  ].map((l) => [l, text.includes(l)]);
  console.log('--- HISTORY ---');
  for (const [l, ok] of lines) console.log(`  ${ok ? 'OK  ' : 'MISS'} ${l}`);
  await page.screenshot({ path: `${SHOT}/doomsday-history.png`, fullPage: true });
}
if (!reached) console.log('never rolled onto the Experiment');
console.log('ERRORS:', errors);
await b.close();
