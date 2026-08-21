// pw-quantum.mjs — drive the Quantum Loops Warp-Phase check in a real browser.
//
//   SHOT_DIR=/tmp node pw-quantum.mjs [url]
//
// The module is one die roll, but three things about it are invisible to the unit tests:
// whether the die and its outcome actually render on the Warp screen, whether the whole
// phase still commits as ONE screen (no chained prompt) when Alternate Timelines is also
// on, and whether Undo re-shows the SAME face instead of silently re-rolling into a 4.
//
// The roll is real, so the run patches the save to force the face under test rather than
// re-rolling until it comes up: `ui.quantumRoll` is the app's own field.
//
//   ROLL=n   — force that AI-die face (default 4, the removal).
//   ALT=1    — also enable Alternate Timelines, to prove the one-screen rule.
//   UNDO=1   — commit the Warp, then Undo, and check the same face comes back.
//   SETUP=1  — stop on the setup instructions and print the module's block.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '/tmp';
const URL = process.argv[2] ?? 'http://localhost:5173/';
const ROLL = Number(process.env.ROLL ?? 4);
const ALT = !!process.env.ALT;
const UNDO = !!process.env.UNDO;
const SETUP = !!process.env.SETUP;

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms = 320) => page.waitForTimeout(ms);
const bodyText = () => page.locator('body').innerText();
const ok = (label, cond) => console.log(`${label} = ${cond} -> ${cond ? 'OK' : 'FAIL'}`);

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Chronossus', { exact: false }).first().click(); await wait(450);
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();

// Base mode, then tick the add-on(s). Quantum Loops is an extra module (a checkbox), not
// a base mode — it combines with every one of them, Doomsday included.
await page.getByText('Base', { exact: true }).first().click(); await wait(250);
await page.getByText('Quantum Loops', { exact: true }).first().click(); await wait(250);
if (ALT) {
  await page.getByText('Alternate Timelines', { exact: true }).first().click(); await wait(250);
}
for (let i = 0; i < 6; i++) {
  if (/Setup Instructions/i.test(await bodyText())) break;
  const c = page.getByRole('button', { name: /Continue/i }).first();
  if (!(await c.count())) break;
  await c.click(); await wait(350);
}

if (SETUP) {
  const txt = await bodyText();
  const i = txt.indexOf('Quantum Loops setup');
  console.log('--- QUANTUM LOOPS SETUP BLOCK ---');
  console.log(txt.slice(i, i + 1100));
  await page.screenshot({ path: `${SHOT}/quantum-setup.png`, fullPage: true });
  console.log('ERRORS:', errors);
  await b.close();
  process.exit(0);
}

await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(450);

// Era 1 runs Preparation -> Power Up -> Warp (no Paradox phase in Era 1). Walk forward
// until the Warp screen's roll button is up.
for (let i = 0; i < 10; i++) {
  if (/Roll for the Chronossus's Warp/i.test(await bodyText())) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from|Roll for/i }).first();
  if (await c.count()) { await c.click(); await wait(400); } else break;
}
ok('reached the Warp screen', /Roll for the Chronossus's Warp/i.test(await bodyText()));

// Roll for real, then force the two faces so the run is deterministic: at least one Warp
// tile placed (the check is conditioned on it) and the AI-die face under test.
await page.getByRole('button', { name: /Roll for the Chronossus's Warp/i }).first().click();
await wait(450);
await page.evaluate((roll) => {
  const key = 'anachrony:chronossus';
  const data = JSON.parse(localStorage.getItem(key));
  data.ui.warpRoll = Math.max(1, data.ui.warpRoll ?? 1);
  data.ui.quantumRoll = roll;
  localStorage.setItem(key, JSON.stringify(data));
}, ROLL);
await page.reload({ waitUntil: 'networkidle' }); await wait(700);

const warpText = await bodyText();
console.log('--- WARP SCREEN ---');
console.log(warpText.split('\n').filter((l) => l.trim()).slice(0, 26).join('\n'));
await page.screenshot({ path: `${SHOT}/quantum-warp.png`, fullPage: true });

ok('Quantum Loops outcome on the Warp screen', /Quantum Loops:/i.test(warpText));
// A 5 only removes with the difficulty option, which this run never sets — so 4 is the
// only removing face here.
const removes = ROLL === 4;
ok(
  `reads as a ${removes ? 'removal' : 'miss'}`,
  removes ? /farthest from the draw deck/i.test(warpText) : /no card is removed/i.test(warpText),
);
ok('the AI die face is shown', (await page.locator('.quantum-check .bot-die').count()) === 1);
// The box renders collapsed, so assert on the collapsible itself rather than its text —
// and on its POSITION: the rulebook text sits under what the player has to act on.
const boxes = await page.locator('.rules-box, details').allInnerTexts();
ok('its verbatim rule box is present', boxes.some((t) => /Quantum Loops/i.test(t)));
ok(
  'and it is below the outcome',
  warpText.indexOf('Quantum Loops:') < warpText.lastIndexOf('Quantum Loops'),
);
if (ALT) {
  // The one-screen rule: both modules resolve on this screen, and the Alternate Timelines
  // question is here too rather than chained behind a second prompt.
  ok('Alternate Timelines shares the screen', /positive/i.test(warpText));
}

// Commit the phase. With Alternate Timelines on, the commit goes through its 0-N buttons;
// without it, the plain Continue.
if (ALT) {
  await page.locator('.vp-digit').first().click(); await wait(700);
} else {
  await page.getByRole('button', { name: /Continue/i }).first().click(); await wait(700);
}

const after = await page.evaluate(() => {
  const data = JSON.parse(localStorage.getItem('anachrony:chronossus'));
  const hist = (data.undoStack ?? []).flatMap((h) => h.effects ?? []);
  return { hist, vp: data.state.chronossus.vp, ui: data.ui.quantumRoll, phase: data.state.phase };
});
const line = after.hist.find((l) => /Quantum Loops/i.test(l));
console.log('HISTORY:', line ?? '(none)');
ok('History carries the Quantum Loops line', !!line);
ok('the roll is cleared after committing', after.ui == null);
ok('the phase moved on', after.phase === 'actions');

if (UNDO) {
  // Undo must re-show the SAME face. A re-roll here is the playtest's bug #10 shape: the
  // player undoes a miss and lands on a removal that never happened.
  // Undo back to the Warp phase, not just once: committing the Warp runs straight into
  // Action Rounds, and with the Chronossus as First Player its first bot turn commits on
  // top. One Undo would be measuring that turn, not the Warp.
  // `.undo-btn` rather than the role query — the phase screen and the board harness both
  // carry one, and the first match can be the one that is off-screen.
  const phaseNow = () =>
    page.evaluate(() => JSON.parse(localStorage.getItem('anachrony:chronossus')).state.phase);
  for (let i = 0; i < 5 && (await phaseNow()) !== 'warp'; i++) {
    await page.locator('.undo-btn').first().click({ force: true }); await wait(650);
  }
  const back = await page.evaluate(
    () => JSON.parse(localStorage.getItem('anachrony:chronossus')).ui.quantumRoll,
  );
  console.log(`after Undo, quantumRoll = ${back} (forced ${ROLL})`);
  ok('Undo re-shows the same face', back === ROLL);
  // The History pane also carries the phrase, so scope this to the phase body itself.
  const body = await page.locator('.phase-body, .warp-roll-result').allInnerTexts();
  ok('and the outcome is back on screen', body.some((t) => /Quantum Loops:/i.test(t)));
  await page.screenshot({ path: `${SHOT}/quantum-undo.png`, fullPage: true });
}

console.log('ERRORS:', errors);
await b.close();
