// Render check: does a mode lay out its tiles (and its covering tile) on the board?
import { chromium } from 'playwright';

const SHOT = '/private/tmp/claude-501/-Users-shawnmarx-repos-AnachronyChronossus/354def5a-7518-4e2a-88cf-36b6e5553373/scratchpad';
const MODE = process.argv[2];
const SLUG = process.argv[3] ?? 'mode';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
const wait = (ms = 300) => page.waitForTimeout(ms);
const btn = (re) => page.getByRole('button', { name: re }).first();

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByText('Chronossus', { exact: false }).first().click(); await wait(400);
await btn(/Begin|Start|Continue/i).click(); await wait(350);
await page.getByText(MODE, { exact: true }).first().click(); await wait();
await btn(/Continue/i).click(); await wait(350);
await btn(/Continue/i).click(); await wait(350);
await btn(/Begin|Start Era|Continue/i).click(); await wait(600);
for (let i = 0; i < 12; i++) {
  const body = await page.locator('body').innerText();
  if (/Take Bot Action/i.test(body)) break;
  const b2 = page.getByRole('button', { name: /Continue|Roll|Begin|Next|Draw/i }).first();
  if (await b2.count()) { await b2.click(); await wait(320); } else break;
}
// Which tile images are on the board / in the Command view?
const tiles = await page.locator('img[src*="/tiles/"]').evaluateAll((els) =>
  [...new Set(els.map((e) => e.getAttribute('src').split('/').pop()))].sort(),
);
const broken = await page.locator('img').evaluateAll((els) =>
  els.filter((e) => e.complete && e.naturalWidth === 0).map((e) => e.getAttribute('src')),
);
console.log('MODE:', MODE);
console.log('TILES ON BOARD:', tiles.join(' '));
console.log('BROKEN IMAGES:', broken.length ? broken : 'none');
console.log('ERRORS:', errors);
await page.screenshot({ path: `${SHOT}/check-${SLUG}.png` });
await b.close();
