// pw-chronobot-parity.mjs — the three Chronossus behaviours the Chronobot was missing.
//
//   SHOT_DIR=/tmp node pw-chronobot-parity.mjs [url]
//
// All three are invisible to the unit suite, which is why they survived so long:
//   1. Undo re-shows the SAME Warp roll instead of silently re-rolling (playtest #10).
//   2. Every phase advance is undoable (the phase screens had no Undo at all).
//   3. History is reachable from a phase screen, not just the Action Rounds board.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '/tmp';
const URL = process.argv[2] ?? 'http://localhost:5173/';

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms = 350) => page.waitForTimeout(ms);
const body = () => page.locator('body').innerText();
const ok = (label, cond) => console.log(`${label} = ${cond} -> ${cond ? 'OK' : 'FAIL'}`);
const save = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('anachrony:chronobot') ?? '{}'));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Chronobot', { exact: false }).first().click(); await wait(500);
for (let i = 0; i < 8; i++) {
  const t = await body();
  if (/Begin Era 1/i.test(t)) break;
  const c = page.getByRole('button', { name: /Continue|Start/i }).first();
  if (!(await c.count())) break;
  await c.click(); await wait(350);
}
await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(500);

// Walk to the Warp phase.
for (let i = 0; i < 12; i++) {
  if (/Roll for the Chronobot's Warp/i.test(await body())) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from/i }).first();
  if (await c.count()) { await c.click(); await wait(400); } else break;
}
const atWarp = /Roll for the Chronobot's Warp/i.test(await body());
ok('reached the Warp phase', atWarp);

// --- 3. History is reachable from a phase screen -----------------------------------
const histBtn = page.getByRole('button', { name: '🕑' }).first();
ok('the phase screen has a History button', (await histBtn.count()) > 0);
if (await histBtn.count()) {
  // It defaults open; toggle it closed and back so we know the button drives the pane.
  await histBtn.click(); await wait(300);
  const closed = await page.locator('.phase-history-dock').count();
  await histBtn.click(); await wait(300);
  const opened = await page.locator('.phase-history-dock').count();
  ok('it opens the History pane on a phase screen', closed === 0 && opened === 1);
}

// --- 2. Phase advances are undoable ------------------------------------------------
const undoBtn = page.locator('.undo-btn').first();
ok('the phase screen has an Undo button', (await undoBtn.count()) > 0);
const enabled = await undoBtn.isEnabled();
ok('and it is live — earlier phase moves are on the stack', enabled);
const beforeUndo = (await save()).state?.phase;
if (enabled) { await undoBtn.click({ force: true }); await wait(600); }
const afterUndo = (await save()).state?.phase;
console.log(`phase ${beforeUndo} -> ${afterUndo} after Undo`);
ok('undoing a phase advance moves the phase back', beforeUndo !== afterUndo);

// Walk forward to Warp again for the roll test.
for (let i = 0; i < 12; i++) {
  if (/Roll for the Chronobot's Warp/i.test(await body())) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from/i }).first();
  if (await c.count()) { await c.click(); await wait(400); } else break;
}

// --- 1. Roll persistence across Undo ------------------------------------------------
await page.getByRole('button', { name: /Roll for the Chronobot's Warp/i }).first().click();
await wait(500);
const rolled = (await save()).warpRoll;
const shown = await body();
console.log(`Warp roll shown: ${/rolled (\d+) Paradox|rolled no Paradoxes/i.exec(shown)?.[0]}`);
// Commit the Warp, then undo back to it and check the roll came back the same.
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait(700);
for (let i = 0; i < 4; i++) {
  const s = await save();
  if (s.state?.phase === 'warp') break;
  await page.locator('.undo-btn').first().click({ force: true }); await wait(600);
}
const back = (await save()).warpRoll;
console.log(`warpRoll before commit = ${rolled}, after undoing back = ${back}`);
ok('the Warp roll survives Undo instead of re-rolling', back != null && back === rolled);
ok('and the roll is on screen, not the Roll button', !/Roll for the Chronobot's Warp/i.test(await body()));

// --- 1b. The Paradox roll persists the same way -------------------------------------
// Era 1 has no Paradox phase, so jump the save to an Era 2 Paradox with Warp tiles on the
// Timeline for it to check (the same trick pw-pass.mjs uses to reach a deep rule).
await page.evaluate(() => {
  const key = 'anachrony:chronobot';
  const d = JSON.parse(localStorage.getItem(key));
  d.state.era = 2;
  d.state.phase = 'paradox';
  d.state.chronobot.warpTilesOnTimeline = 3;
  localStorage.setItem(key, JSON.stringify(d));
});
await page.reload({ waitUntil: 'networkidle' }); await wait(700);
const yes = page.getByRole('button', { name: /Yes|✓/i }).first();
if (await yes.count()) {
  await yes.click({ force: true }); await wait(700);
  const entry = (await save()).undoStack?.at(-1);
  console.log(`Paradox entry die = ${entry?.die}`);
  await page.locator('.undo-btn').first().click({ force: true }); await wait(700);
  const seeded = (await save()).paradoxRoll;
  console.log(`after Undo, paradoxRoll = ${seeded}`);
  ok('the Paradox roll is re-seeded from the undone entry', seeded === entry?.die);
} else {
  console.log('Paradox prompt not reachable — skipped');
}

await page.screenshot({ path: `${SHOT}/chronobot-parity.png`, fullPage: true });
console.log('ERRORS:', errors);
await b.close();
