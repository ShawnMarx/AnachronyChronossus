// pw-warp.mjs — check the Warp phase shows one Warp tile per Paradox rolled.
//
//   SHOT_DIR=/tmp node pw-warp.mjs http://localhost:5173/ [runs]
//
// Each run starts a fresh Chronossus game, walks to the Warp phase, rolls, and compares
// the die face's alt text against the number of .warp-roll-tile images on screen.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '.';
const URL = process.argv[2] ?? 'http://localhost:5173/';
const RUNS = Number(process.argv[3] ?? 6);
const b = await chromium.launch();
const wait = (page, ms = 350) => page.waitForTimeout(ms);
const seen = new Map();

for (let run = 0; run < RUNS; run++) {
  const page = await b.newPage({ viewport: { width: 1100, height: 950 } });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByText('Chronossus', { exact: false }).first().click(); await wait(page, 450);
  await page.getByRole('button', { name: /Continue/i }).first().click(); await wait(page);
  await page.getByRole('button', { name: /Continue/i }).first().click(); await wait(page);
  await page.getByRole('button', { name: /Continue/i }).first().click(); await wait(page);
  await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(page, 450);
  for (let i = 0; i < 10; i++) {
    const t = await page.locator('body').innerText();
    if (/Roll for the .* Warp/i.test(t)) break;
    const c = page.getByRole('button', { name: /Continue|Draw \d+ from/i }).first();
    if (await c.count()) { await c.click(); await wait(page, 400); } else break;
  }
  const roll = page.getByRole('button', { name: /Roll for the .* Warp/i }).first();
  if (!(await roll.count())) { console.log('run', run, 'never reached the Warp roll'); await page.close(); continue; }
  await roll.click(); await wait(page, 500);

  const face = await page.locator('.paradox-die-face').first().getAttribute('alt');
  const rolled = /double/.test(face) ? 2 : /one Paradox/.test(face) ? 1 : 0;
  const tiles = await page.locator('.warp-roll-tile').count();
  const text = await page.locator('.warp-roll-result .phase-note').first().innerText();
  console.log(`run ${run}: die=${rolled} tiles=${tiles} ${rolled === tiles ? 'OK' : 'MISMATCH'} — ${text}`);
  if (!seen.has(rolled)) {
    seen.set(rolled, true);
    await page.locator('.warp-roll-result').first().screenshot({ path: `${SHOT}/warp-${rolled}.png` });
  }
  await page.close();
}
console.log('faces covered:', [...seen.keys()].sort().join(', '));
await b.close();
