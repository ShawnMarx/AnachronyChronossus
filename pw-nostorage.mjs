// pw-nostorage.mjs — does the app still work when localStorage THROWS?
//
//   SHOT_DIR=/tmp node pw-nostorage.mjs [url]
//
// Safari Private Browsing (historically), blocked site data, and some embedded webviews do
// not make `localStorage` absent — they make every access raise a SecurityError. So the
// usual guard, `if (window.localStorage)`, passes and then the ACCESS throws, which for a
// SPA is a blank page rather than a degraded one. Nobody reports that: they just leave.
//
// Reading the try/catch blocks is not enough to know (that is how the same bug class hid in
// Bullet's /profile for four months), so this runs the real app against a localStorage whose
// every method throws, and checks the app still renders, still starts a game, and still
// plays a turn — just without saving anything.
import { chromium } from 'playwright';

const SHOT = process.env.SHOT_DIR ?? '/tmp';
const URL = process.argv[2] ?? 'http://localhost:5173/';

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const wait = (ms = 450) => page.waitForTimeout(ms);
const body = () => page.locator('body').innerText();
const ok = (label, cond) => console.log(`${label} = ${cond} -> ${cond ? 'OK' : 'FAIL'}`);

// Replace localStorage/sessionStorage with objects that throw on EVERY access, the way a
// privacy-restricted browser does. Installed before any app code runs.
await page.addInitScript(() => {
  const boom = () => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  };
  const hostile = {
    getItem: boom,
    setItem: boom,
    removeItem: boom,
    clear: boom,
    key: boom,
    get length() {
      return boom();
    },
  };
  for (const name of ['localStorage', 'sessionStorage']) {
    Object.defineProperty(window, name, { configurable: true, get: () => hostile });
  }
});

await page.goto(URL, { waitUntil: 'networkidle' });
await wait(600);

// 1. The home screen renders at all.
const home = await body();
ok('the home screen renders', /Anachrony Solo Assistant/i.test(home));
ok('both opponents are offered', /Chronobot/.test(home) && /Chronossus/.test(home));

// 2. A game can be started and set up.
// BOT=chronobot drives the other view, which has its own separate save/undo stack.
const BOT = process.env.BOT === 'chronobot' ? 'Chronobot' : 'Chronossus';
await page.getByText(BOT, { exact: false }).first().click(); await wait(600);
if (BOT === 'Chronossus') {
  await page.getByRole('button', { name: /Continue/i }).first().click(); await wait();
  await page.getByText('Base', { exact: true }).first().click(); await wait(300);
}
for (let i = 0; i < 8; i++) {
  if (/Begin Era 1/i.test(await body())) break;
  const c = page.getByRole('button', { name: /Continue|Start/i }).first();
  if (!(await c.count())) break;
  await c.click(); await wait(450);
}
ok('setup reaches Begin Era 1', /Begin Era 1/i.test(await body()));
await page.getByRole('button', { name: /Begin Era 1/i }).first().click(); await wait(700);
ok('Era 1 starts', /Preparation/i.test(await body()));

// 3. The guided loop still advances — including the phases that roll dice and commit.
for (let i = 0; i < 12; i++) {
  if (/Take Bot Action/i.test(await body())) break;
  const c = page.getByRole('button', { name: /Continue|Draw \d+ from|Roll for/i }).first();
  if (await c.count()) { await c.click(); await wait(450); } else break;
}
ok('play reaches the Action Rounds board', /Take Bot Action/i.test(await body()));

// 4. And a real bot turn resolves — the commit path is where a save is attempted.
const modalRoll = page
  .locator('.modal-overlay')
  .getByRole('button', { name: /Take Bot Action/i })
  .first();
const roll = (await modalRoll.count())
  ? modalRoll
  : page.getByRole('button', { name: /Take Bot Action/i }).first();
if (await roll.count()) { await roll.click({ force: true }); await wait(800); }
ok('a bot turn opens without crashing', (await page.locator('.detail-panel, .dp-body').count()) > 0);

await page.screenshot({ path: `${SHOT}/nostorage.png`, fullPage: true });
// A save that fails is expected and must be silent; a crash is not. Report any page error.
console.log('PAGE ERRORS:', errors.length ? errors : 'none');
ok('no uncaught page errors', errors.length === 0);
await b.close();
