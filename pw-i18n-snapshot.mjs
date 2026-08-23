// Before/after harness for the i18n refactor.
//
// The i18n layer is meant to be a pure indirection: every string the player sees must be
// byte-identical in English, and every screen pixel-identical. So this walks both bots
// through setup, every phase screen, the Action Rounds board, an Action dialog and the
// settings menu, and records innerText + a screenshot at each step. Run it on the base
// commit and again on the change; `diff -r` on the text and a pixel compare on the shots
// is the proof.
//
//   SHOT_DIR=/tmp/before node pw-i18n-snapshot.mjs http://localhost:5175/
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:5175/';
const LANG = process.env.LANG_CODE ?? '';
const OUT = process.env.SHOT_DIR ?? '/tmp/i18n-shot';
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const page = await b.newPage({
  viewport: { width: 1400, height: 1000 },
  // Freeze transitions/animations, or a shot caught mid-transition differs run to run
  // and every visual comparison drowns in false positives.
  reducedMotion: 'reduce',
});
await page.addStyleTag({
  content: '*,*::before,*::after{animation:none!important;transition:none!important}',
}).catch(() => {});
// The app performs the bot's randomness, so an unseeded run diverges between captures
// and every diff is noise. Pin Math.random to a fixed LCG before any app code runs.
await page.addInitScript((code) => {
  if (code) { try { localStorage.setItem('anachrony:lang', code); } catch { /* ignore */ } }
}, LANG);
await page.addInitScript(() => {
  let seed = 20260823;
  Math.random = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
});
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const wait = (ms = 320) => page.waitForTimeout(ms);
const btn = (re) => page.getByRole('button', { name: re }).first();
let n = 0;
async function expandRules() {
  const boxes = page.locator('.rules-box:not(.open) .rules-box-toggle');
  for (let i = await boxes.count(); i > 0; i = await boxes.count()) {
    await boxes.first().click({ timeout: 3000 }).catch(() => {});
    await wait(90);
    if ((await boxes.count()) >= i) break;
  }
}

async function snap(label) {
  await expandRules();
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important}',
  }).catch(() => {});
  const id = `${String(++n).padStart(2, '0')}-${label.replace(/\W+/g, '-')}`;
  const text = await page.locator('body').innerText();
  writeFileSync(`${OUT}/${id}.txt`, text);
  await page.screenshot({ path: `${OUT}/${id}.png`, fullPage: false });
}
async function clickIf(re, label) {
  const el = btn(re);
  if (!(await el.count())) return false;
  try { await el.click({ timeout: 4000 }); } catch { return false; }
  await wait();
  if (label) await snap(label);
  return true;
}

/** The Ready-to-begin / confirm modals sit over the board and swallow clicks. */
async function dismissModal(label) {
  for (let i = 0; i < 4; i++) {
    if (!(await page.locator('.modal-overlay').count())) return;
    if (label) await snap(label);
    const inModal = page.locator('.modal-overlay').getByRole('button').last();
    if (!(await inModal.count())) return;
    await inModal.click({ timeout: 4000 }).catch(() => {});
    await wait(400);
  }
}

async function playBot(name, pick, modeLabel) {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate((code) => {
    localStorage.clear();
    if (code) localStorage.setItem('anachrony:lang', code);
  }, LANG);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await wait(500);
  await snap(`${name}-landing`);
  await page.getByText(pick, { exact: false }).first().click(); await wait(450);
  await snap(`${name}-start`);
  // setup flow: flavor -> (mode) -> difficulty -> setup instructions
  for (let i = 0; i < 10; i++) {
    if (modeLabel) {
      const m = page.getByText(modeLabel, { exact: true }).first();
      if (await m.count()) { await m.click(); await wait(); modeLabel = null; }
    }
    await snap(`${name}-setup-${i}`);
    if (!(await clickIf(/^(Continue|Begin|Next|Start)/i))) break;
    const body = await page.locator('body').innerText();
    if (/Take Bot Action/i.test(body)) break;
  }
  // walk the Era: every phase screen up to the board
  for (let i = 0; i < 14; i++) {
    const body = await page.locator('body').innerText();
    await snap(`${name}-phase-${i}`);
    if (/Take Bot Action/i.test(body)) break;
    await dismissModal();
    if (!(await clickIf(/Continue|Roll|Begin|Next|Draw|Place/i))) break;
  }
  await dismissModal(`${name}-intro-modal`);
  await snap(`${name}-board`);
  // An Action dialog — the intro modal's own button may already have opened one.
  if (!(await page.locator('.detail-panel').count())) {
    await clickIf(/Take Bot Action/i);
  }
  await snap(`${name}-dialog`);
  // Walk the dialog to the end of the turn, snapping each step.
  for (let i = 0; i < 5; i++) {
    if (!(await page.locator('.detail-panel').count())) break;
    if (await clickIf(/Confirm placed|Start Your Turn|Continue|Roll/i, `${name}-dialog-step-${i}`)) continue;
    break;
  }
  await snap(`${name}-after-turn`);
  // settings menu
  const gear = page.getByRole('button', { name: /settings|⚙/i }).first();
  if (await gear.count()) { await gear.click(); await wait(); await snap(`${name}-settings`); }
}

await playBot('chronobot', 'Chronobot', null);
await playBot('chronossus', 'Chronossus', 'Base');

writeFileSync(`${OUT}/_errors.txt`, errors.join('\n') || '(none)');
console.log(`${n} snapshots -> ${OUT}`);
console.log('errors:', errors.length ? errors : '(none)');
await b.close();
