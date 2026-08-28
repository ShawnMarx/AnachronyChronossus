// pw-descriptors.mjs — the guard for the message-descriptor refactor.
//
//   SHOT_DIR=/tmp node pw-descriptors.mjs [url]        # the Chronobot
//   BOT=chronossus SHOT_DIR=/tmp node pw-descriptors.mjs  # the Chronossus (its own save)
//
// Two failures this catches that neither `tsc` nor the unit suite can:
//
//   1. A COERCED DESCRIPTOR. `${instr.text}` and `instrs.map(i => i.text).join(' ')` are
//      both legal on `string | Msg` and render "[object Object]". TypeScript cannot see
//      it, because a template literal accepts anything.
//   2. AN UNRESOLVED KEY. A descriptor whose key has no catalog entry falls back to the
//      key itself, so `instr.chronobot.mine.gained` appears on screen as if it were a
//      sentence. Only RENDERED text is scanned — the persisted save legitimately contains
//      keys, which is the whole point of the refactor.
//
// It also asserts the converse: that the save really does hold descriptors and not
// finished sentences, so a regression back to persisted prose is caught too.
//
// COVERAGE, stated plainly: this drives setup -> Preparation -> Paradox -> Power Up ->
// Warp and into the Action Rounds board, but it does NOT yet drive the guided Action
// dialogs (the intro modal and the per-Action flow need the hotspot-tapping route that
// `pw-i18n-review.mjs` uses: Debug on, then tap each tile). Until it does, the Action
// instructions are covered by that harness, not this one.
import { chromium } from 'playwright';
const SHOT = process.env.SHOT_DIR ?? '/tmp';
const URL = process.argv[2] ?? 'http://localhost:5199/';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms = 300) => page.waitForTimeout(ms);
const body = () => page.locator('body').innerText();
const bad = [];
const scan = (txt, where) => {
  if (txt.includes('[object Object]')) bad.push(`[object Object] in ${where}`);
  const k = txt.match(/\b(instr|hist|piece|board|msg)\.[a-zA-Z0-9.\-]+/g);
  if (k) bad.push(`raw key in ${where}: ${[...new Set(k)].slice(0, 5).join(', ')}`);
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.goto(URL, { waitUntil: 'networkidle' });
// Each bot has its own view, its own save key and its own undo stack, so each needs its
// own run — a descriptor coerced in one says nothing about the other.
const BOT = process.env.BOT === 'chronossus' ? 'Chronossus' : 'Chronobot';
const SAVE_KEY = BOT === 'Chronossus' ? 'anachrony:chronossus' : 'anachrony:chronobot';
await page.evaluate((k) => { window.__saveKey = k; }, SAVE_KEY);
await page.getByText(BOT, { exact: false }).first().click(); await wait(500);
if (BOT === 'Chronossus') {
  // Its setup asks for a mode before the phase flow starts.
  await page.getByRole('button', { name: /Continue/i }).first().click(); await wait(300);
  await page.getByText('Base', { exact: true }).first().click(); await wait(300);
}
// through setup + the phases into Action Rounds
for (let i = 0; i < 40; i++) {
  scan(await body(), `phase step ${i}`);
  const btn = page
    .getByRole('button', { name: /Begin Era|Continue|Roll for|Draw \d+ from|Start|Next|Begin/i })
    .first();
  if (!(await btn.count())) break;
  await btn.click({ timeout: 2500 }).catch(() => {});
  await wait(250);
  if (/Take Bot Action/i.test(await body())) break;
}
// The Action Rounds open on a modal intro ("Ready to begin"), which intercepts every
// click behind it — dismiss it by its own button, not by the board underneath.
for (let i = 0; i < 3; i++) {
  const modal = page.locator('.modal-overlay .fp-dialog button.phase-primary').first();
  if (!(await modal.count())) break;
  await modal.click({ timeout: 2500 }).catch(() => {});
  await wait(400);
}

// Action Rounds: take turns, clicking through each guided dialog.
for (let turn = 0; turn < 14; turn++) {
  const t = await body();
  scan(t, `turn ${turn}`);
  const modal = page.locator('.modal-overlay .fp-dialog button.phase-primary').first();
  if (await modal.count()) { await modal.click({ timeout: 2500 }).catch(() => {}); await wait(350); continue; }
  const take = page.locator('button.take-bot-action').first();
  const step = page
    .getByRole('button', { name: /Start Your Turn|Confirm placed|Cannot place|Continue|Roll|Yes|No/i })
    .first();
  if (await step.count()) { await step.click({ timeout: 2500 }).catch(() => {}); await wait(250); continue; }
  if (await take.count()) { await take.click({ timeout: 2500 }).catch(() => {}); await wait(350); continue; }
  break;
}
scan(await body(), 'final board');
{
  const phase = await page.evaluate(() =>
    JSON.parse(localStorage.getItem(window.__saveKey) ?? '{}')?.state?.phase,
  );
  const btns = await page.locator('button:visible').allInnerTexts();
  console.log('DIAG phase =', phase, '| buttons:', JSON.stringify(btns.slice(0, 14)));
}
// The persisted save is the real evidence: History labels/effects are written to
// localStorage, and after the refactor they must be DESCRIPTORS, not sentences.
const save = await page.evaluate(() => JSON.parse(localStorage.getItem(window.__saveKey) ?? '{}'));
// The Chronobot keeps its own stack; the Chronossus's lives in the shared undo hook.
const stack = save.undoStack ?? save.entries ?? [];
console.log(`--- persisted undo stack: ${stack.length} entries ---`);
for (const e of stack.slice(-8)) {
  console.log(JSON.stringify({ label: e.label, effects: e.effects }));
}
// The converse check: the engine's instructions must be persisted as DESCRIPTORS.
const instrs = save.state?.currentInstructions ?? [];
const keyed = instrs.filter((i) => i && typeof i.text === 'object' && i.text.key);
if (instrs.length && !keyed.length) {
  bad.push('persisted instructions are still finished sentences, not descriptors');
} else {
  console.log(`persisted instructions: ${keyed.length}/${instrs.length} are descriptors`);
}
// D3, the back-compat guarantee: a game already in progress when this shipped has FINISHED
// ENGLISH SENTENCES on its undo stack. Those must still render as written — bumping the save
// version would have discarded every in-progress game instead. Inject one and reload.
if (stack.length) {
  const LEGACY = 'Era 1 · Bot: a legacy saved sentence';
  await page.evaluate(
    ([key, legacy]) => {
      const data = JSON.parse(localStorage.getItem(key));
      const list = data.undoStack ?? data.entries;
      list[list.length - 1] = {
        ...list[list.length - 1],
        label: legacy,
        effects: ['A legacy saved effect line'],
      };
      localStorage.setItem(key, JSON.stringify(data));
    },
    [SAVE_KEY, LEGACY],
  );
  await page.reload({ waitUntil: 'networkidle' });
  await wait(600);
  // Only open it if it is not already docked — the same button TOGGLES, so clicking it on
  // the Chronossus's board (where the pane is open by default) would close it instead.
  if ((await page.locator('.history-pane').count()) === 0) {
    const openHistory = page
      .locator('button[title*="History" i], button[aria-label*="History" i]')
      .first();
    if (await openHistory.count()) {
      await openHistory.click({ force: true }).catch(() => {});
      await wait(400);
    }
  }
  const shown = await body();
  if (!shown.includes(LEGACY)) bad.push('a legacy saved sentence no longer renders (D3)');
  else console.log('legacy prose entry still renders:', LEGACY);
}

const pane = page.locator('.history-pane').first();
if (await pane.count()) {
  console.log('--- History pane (rendered) ---');
  console.log((await pane.innerText()).split('\n').filter(Boolean).slice(0, 24).join('\n'));
}
await page.screenshot({ path: `${SHOT}/objcheck.png`, fullPage: true });
console.log(bad.length ? '\nFAIL\n' + bad.join('\n') : '\nOK — no [object Object], no raw keys');
console.log('page errors:', errors);
await b.close();
