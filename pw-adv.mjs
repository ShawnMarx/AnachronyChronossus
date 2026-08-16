// pw-adv.mjs — drive Pioneers into the Adventure dialog and shoot both of its steps.
//
//   SHOT_DIR=/tmp node pw-adv.mjs http://localhost:5173/ 1000    (URL, viewport width)
//
// Sets up a Pioneers game, turns Debug on (a board tap then opens the interactive
// dialog), taps C09, picks a Power slot, and writes adv-1-slot-<W>.png and
// adv-2-result-<W>.png. It screenshots the dialog ELEMENT, so a narrow docked dialog is
// shown at its real width — how the Adventure header/Power-line wrapping was checked.
import { chromium } from 'playwright';
const SHOT = process.env.SHOT_DIR ?? '.';
const URL = process.argv[2] ?? 'http://localhost:5174/';
const W = Number(process.argv[3] ?? 900);
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: W, height: 1100 } });
const wait = (ms = 350) => page.waitForTimeout(ms);
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.getByText('Chronossus', { exact: false }).first().click(); await wait(500);
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByText('Pioneers of New Earth', { exact: true }).first().click(); await wait();
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(500);
for (let i = 0; i < 14; i++) {
  const t = await page.locator('body').innerText();
  if (/Take Bot Action/i.test(t)) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from|Roll|Begin|Start Era|Place|Ready/i }).first();
  if (await c.count()) { await c.click(); await wait(420); } else break;
}
// dismiss the "Ready to begin" modal without taking a turn
const modal = page.locator('.modal-overlay');
if (await modal.count()) { await page.keyboard.press('Escape'); await wait(300); }
if (await modal.count()) { await modal.click({ position: { x: 5, y: 5 } }).catch(() => {}); await wait(300); }
console.log('modal still up:', await modal.count());
// Debug mode -> free tap opens the interactive dialog
await page.getByRole('button', { name: '⚙' }).first().click(); await wait(300);
await page.getByText('Debug mode').first().click(); await wait(350);
await page.keyboard.press('Escape'); await wait(250);
await page.locator('body').click({ position: { x: 400, y: 900 } }).catch(() => {});
await wait(300);
const hx = page.locator('.history-pane button, .history-panel button').filter({ hasText: '✕' }).first();
if (await hx.count()) { await hx.click().catch(() => {}); await wait(300); }
const hide = page.getByRole('button', { name: /Hide/i }).first();
if (await hide.count()) { await hide.click(); await wait(300); }
const c09 = page.locator('.board-wrap img[src*="C09"]').first();
console.log('board C09:', await page.locator('.board-wrap img[src*="C09"]').count());
console.log('C09:', await page.locator('img[src*="C09"]').count());
await c09.click({ force: true }); await wait(600);
const panel = page.locator('.detail-panel').first();
console.log('--- SLOT ---\n' + (await panel.count() ? await panel.innerText() : '(no panel)'));
await panel.evaluate((e) => e.scrollTo(0, 0)).catch(() => {});
await panel.screenshot({ path: `${SHOT}/adv-1-slot-${W}.png` });
const slot = page.getByRole('button', { name: /^\+\d$/ }).first();
if (await slot.count()) { await slot.click(); await wait(800); }
console.log('--- RESULT ---\n' + (await panel.count() ? await panel.innerText() : '(no panel)'));
await panel.evaluate((e) => e.scrollTo(0, 0)).catch(() => {});
await panel.screenshot({ path: `${SHOT}/adv-2-result-${W}.png` });
await page.screenshot({ path: `${SHOT}/adv-2-full-${W}.png`, fullPage: true });
// Commit the turn (the first Adventure usually banks a VP token), then reopen the
// pop-out from the board so the VP-token chip is on the art.
const start = page.getByRole('button', { name: /Start Your Turn|Advance to/i }).first();
if (await start.count()) { await start.click(); await wait(700); }
const onBoard = page.locator('.cx-upgrade-btn.on-board').first();
if (await onBoard.count()) {
  await onBoard.click({ force: true }); await wait(500);
  await page.locator('.cx-upgrade-art').first().screenshot({ path: `${SHOT}/adv-4-vptoken-${W}.png` }).catch(() => {});
  console.log('VP chip on art:', await page.locator('.cx-upgrade-tokens').count());
  await page.keyboard.press('Escape'); await wait(300);
}
const chip = panel.locator('.cx-upgrade-btn').first();
if (await chip.count()) {
  await chip.click(); await wait(500);
  const pop = page.locator('.modal-overlay, .cx-upgrade-pop');
  console.log('upgrade pop-out opened:', await pop.count() > 0);
  await page.screenshot({ path: `${SHOT}/adv-3-popout-${W}.png` });
} else console.log('no upgrade chip');
console.log('ERRORS:', errors);
await b.close();
