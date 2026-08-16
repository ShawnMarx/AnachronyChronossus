// pw-pass.mjs — does the Chronossus PASS when a rolled marker lands on the Adventure with
// no figures left, and does Fractures' Blink exempt it?
//
//   SHOT_DIR=/tmp node pw-pass.mjs http://localhost:5173/ "Pioneers of New Earth"
//   SHOT_DIR=/tmp node pw-pass.mjs http://localhost:5173/ "Fractures of Time+Pioneers of New Earth"
//
// There is no debug control for "out of Exosuits", and a board TAP is the debug free-tap
// path (it moves no marker), so neither can answer this. Instead: set the mode up, then
// edit the persisted save to zero the bot's figures and park a Command marker on the C09
// Adventure slot, reload, and roll. The AI die decides which marker moves, so the loop
// re-patches and rolls again until the Adventure one comes up.
//
// With Fractures it also puts an Exosuit on the Main board and Flux Cores in the pool, so
// the expected answer flips: it must NOT pass, it must Blink onto the Adventure board.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '.';
const URL = process.argv[2] ?? 'http://localhost:5173/';
// The combos are their own single option ("Fractures of Time + Pioneers of New Earth").
const MODE = process.argv[3] ?? 'Pioneers of New Earth';
const BLINK = /Fractures/i.test(process.argv[3] ?? '');
// Where C09 sits: `pioneers` puts it on slot II (m3s3 = track 3, index 2);
// `fractures+pioneers` on slot III (m5s4 = track 5, index 3).
const ADV_MARKER = BLINK ? '5' : '3';
const ADV_STEP = BLINK ? 3 : 2;

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms = 320) => page.waitForTimeout(ms);

await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Chronossus', { exact: false }).first().click(); await wait(450);
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByText(MODE, { exact: true }).first().click(); await wait(300);
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(450);
for (let i = 0; i < 12; i++) {
  const t = await page.locator('body').innerText();
  if (/Take Bot Action/i.test(t)) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from|Roll for/i }).first();
  if (await c.count()) { await c.click(); await wait(400); } else break;
}

const patch = () =>
  page.evaluate(
    ({ blink, marker, step }) => {
      const key = 'anachrony:chronossus';
      const data = JSON.parse(localStorage.getItem(key));
      const bot = data.state.chronossus;
      bot.exosuitsAvailable = 0;
      if (bot.guardians) bot.guardians.powered = 0;
      bot.passed = false;
      if (blink) {
        bot.fluxPool = { cores: 2, casings: 2, setAside: 0 };
        bot.placedExosuits = [{ action: 'mine-resource', space: 'action', hasCore: true }];
      }
      data.debug = true;
      data.ui.markerSteps[marker] = step;
      localStorage.setItem(key, JSON.stringify(data));
      return { steps: data.ui.markerSteps, mode: data.state.config?.chronossusMode };
    },
    { blink: BLINK, marker: ADV_MARKER, step: ADV_STEP },
  );

let reached = false;
for (let attempt = 0; attempt < 20 && !reached; attempt++) {
  await patch();
  await page.reload({ waitUntil: 'networkidle' }); await wait(650);
  const modal = page.locator('.modal-overlay');
  const tba = (await modal.count())
    ? modal.getByRole('button', { name: /Take Bot Action/i }).first()
    : page.getByRole('button', { name: /Take Bot Action/i }).first();
  if (!(await tba.count())) { console.log('no Take Bot Action button'); break; }
  await tba.click(); await wait(700);

  const body = await page.locator('body').innerText();
  const panel = page.locator('.detail-panel').first();
  const dialog = (await panel.count()) ? (await panel.innerText()).split('\n')[0] : '(no dialog)';
  const passed = /Out of Exosuits/i.test(body);
  if (attempt === 0) console.log('mode:', (await patch()).mode);
  if (!/Adventure/i.test(dialog) && !/Rolled onto Adventure/i.test(body)) {
    console.log(`  attempt ${attempt}: dialog="${dialog}" passed=${passed}`);
    continue;
  }

  reached = true;
  console.log(`ADVENTURE reached: passed=${passed} dialog="${dialog}"`);
  console.log(
    BLINK
      ? `expected passed=false (it Blinks onto the Adventure board) -> ${passed ? 'FAIL' : 'OK'}`
      : `expected passed=true (out of figures) -> ${passed ? 'OK' : 'FAIL'}`,
  );
  await page.screenshot({ path: `${SHOT}/pass-${BLINK ? 'blink' : 'plain'}.png`, fullPage: true });
}
if (!reached) console.log('never rolled onto the Adventure');
console.log('ERRORS:', errors);
await b.close();
