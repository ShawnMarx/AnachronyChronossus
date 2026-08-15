import { chromium } from 'playwright';
const SHOT = '/private/tmp/claude-501/-Users-shawnmarx-repos-AnachronyChronossus/354def5a-7518-4e2a-88cf-36b6e5553373/scratchpad';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 950 } });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
const wait = (ms = 280) => page.waitForTimeout(ms);
const btn = (re) => page.getByRole('button', { name: re }).first();
const tryClick = async (loc) => {
  if ((await loc.count()) === 0) return false;
  try { if (!(await loc.first().isEnabled())) return false;
        await loc.first().click({ timeout: 1200 }); await wait(260); return true; } catch { return false; }
};
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByText('Chronossus', { exact: false }).first().click(); await wait(400);
await btn(/Begin|Start|Continue/i).click(); await wait(350);
await page.getByText('Pioneers of New Earth', { exact: true }).first().click(); await wait();
await btn(/Continue/i).click(); await wait(350);
await btn(/Continue/i).click(); await wait(350);
await btn(/Begin|Start Era|Continue/i).click(); await wait(500);
for (let i = 0; i < 14; i++) {
  const body = await page.locator('body').innerText();
  if (/Take Bot Action/i.test(body)) break;
  if (await tryClick(page.locator('button', { hasText: /^(Continue|Next|Roll|Draw|Begin)/i }))) continue;
  break;
}
// seed a filled board so the Power reads large
await page.evaluate(() => {
  const raw = localStorage.getItem('anachrony:chronossus'); if (!raw) return;
  const save = JSON.parse(raw);
  const find = (o) => { if (!o || typeof o !== 'object') return null; if (o.pioneers) return o;
    for (const v of Object.values(o)) { const r = find(v); if (r) return r; } return null; };
  const bot = find(save); if (!bot) return;
  bot.pioneers.upgraded = { titanium: true, gold: true };
  bot.pioneers.vpTokens = 1;
  localStorage.setItem('anachrony:chronossus', JSON.stringify(save));
});
await page.reload({ waitUntil: 'networkidle' }); await wait(700);
await tryClick(page.locator('.modal-overlay button', { hasText: /Take Bot Action/i }));
await tryClick(page.locator('button', { hasText: /Start Your Turn/i }));
await wait(400);
// Close any open Action dialog so the board (and the badge area) is visible.
await tryClick(page.locator('.dp-close'));
await wait(300);
const onBoard = page.locator('.cx-upgrade-btn.on-board');
console.log('ON-BOARD BUTTON:', await onBoard.count(), (await onBoard.first().textContent().catch(()=>'')).trim());
console.log('BOX:', JSON.stringify(await onBoard.first().boundingBox().catch(()=>null)));
const badge = page.locator('.count-badge').nth(0);
await page.locator('.board-wrap').screenshot({ path: `${SHOT}/v-board-btn.png` });
await onBoard.first().click(); await wait(500);
console.log('POPOUT OPENED:', await page.locator('.cx-upgrade-modal').count());
console.log('ERRORS', errors);
await b.close();
