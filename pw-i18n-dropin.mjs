// Proves the drop-in mechanism: a locale file added to src/i18n/locales/ is picked up with
// no other change, its strings replace English, and — crucially — a file that does NOT
// claim an official rulebook transcription leaves the verbatim 📖 boxes in English.
//
// Runs against the dev server (Vite reloads on the new file), then removes the file again.
// Nothing is left behind, so this can run on a clean tree.
//
//   node pw-i18n-dropin.mjs http://localhost:5173/
import { chromium } from 'playwright';
import { writeFileSync, rmSync, readFileSync } from 'node:fs';

const URL = process.argv[2] ?? 'http://localhost:5173/';
const FILE = new globalThis.URL('./src/i18n/locales/zz.json', import.meta.url).pathname;

// Two app-voice strings, one rulebook string, and a placeholder that must survive.
const en = JSON.parse(readFileSync(new globalThis.URL('./src/i18n/locales/en.json', import.meta.url).pathname, 'utf8'));
const fixture = {
  $locale: { code: 'zz', name: 'Testish', credit: 'harness' },
  'ui.settings.resetGame': 'ZZ-RESET',
  'ui.rulesBox.label': 'ZZ-RULEBOOK',
  'ui.rulesBox.englishFallback': 'ZZ-FALLBACK for {language}',
  'tile.C01A.rule': 'ZZ-TILE-RULE-SHOULD-NOT-SHOW',
  'action.research.rule': 'ZZ-ACTION-RULE-SHOULD-NOT-SHOW',
};
if (!('tile.C01A.rule' in en)) throw new Error('fixture is stale: tile.C01A.rule is gone');

writeFileSync(FILE, JSON.stringify(fixture, null, 2) + '\n');
const fail = [];
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fail.push(msg); };

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByText('Chronobot', { exact: false }).first().click();
  await page.waitForTimeout(600);

  // The ⚙ menu lives on the play screens, not the landing/setup ones — walk in.
  const gear = page.locator('.gear-btn').first();
  for (let i = 0; i < 20 && !(await gear.count()); i++) {
    // The Ready-to-begin modal swallows clicks aimed at the page behind it.
    const modal = page.locator('.modal-overlay');
    if (await modal.count()) {
      await modal.getByRole('button').last().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }
    const next = page
      .getByRole('button', { name: /Continue|Roll|Begin|Next|Draw|Place|Start/i })
      .first();
    if (!(await next.count())) break;
    await next.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(350);
  }
  ok(await gear.count() > 0, 'reached a screen with the ⚙ menu');

  // The gear can render behind the Ready-to-begin modal; clear it before clicking.
  const clearModal = async () => {
    for (let i = 0; i < 4 && (await page.locator('.modal-overlay').count()); i++) {
      await page.locator('.modal-overlay').getByRole('button').last()
        .click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(200);
  };
  await clearModal();

  // The picker only exists once a second locale file does.
  await gear.click(); await page.waitForTimeout(300);
  const select = page.locator('.settings-item.lang select');
  ok(await select.count() === 1, 'language picker appears when a second locale exists');
  ok((await page.locator('.settings-item.lang option').allInnerTexts()).includes('Testish'),
     '$locale.name is what the picker shows');

  await select.selectOption('zz'); await page.waitForTimeout(400);
  const menu = await page.locator('.settings-menu').innerText();
  ok(/ZZ-RESET/.test(menu), 'an app-voice string is replaced');
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);

  // Rulebook boxes: label translated, rule text still English + the notice.
  // Most boxes pass an explicit label ("How the AI die moves the tokens"), which rightly
  // wins over the translated default — so the invariant is that the untranslated DEFAULT
  // never appears, not that every label changes.
  const labels = await page.locator('.rules-box-label').allInnerTexts();
  ok(!labels.includes('Rulebook text'), `no box shows the English default label (${labels.join(' / ') || 'none on screen'})`);

  const box = page.locator('.rules-box').first();
  if (await box.count()) {
    await box.locator('.rules-box-toggle').click(); await page.waitForTimeout(250);
    const body = await box.innerText();
    ok(/ZZ-FALLBACK for Testish/.test(body), 'the English-fallback notice interpolates {language}');
    ok(!/SHOULD-NOT-SHOW/.test(body), 'rule text stays English without officialRulebook');
  } else {
    fail.push('no rules box on screen to check');
  }

  // The choice survives a reload.
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(700);
  await clearModal();
  await page.locator('.gear-btn').first().click();
  await page.waitForTimeout(300);
  ok(/ZZ-RESET/.test(await page.locator('.settings-menu').innerText()),
     'the chosen language survives a reload');

  ok(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);
} finally {
  await b.close();
  rmSync(FILE, { force: true });
}
console.log(fail.length ? `\n${fail.length} FAILED` : '\nall checks passed');
process.exit(fail.length ? 1 : 0);
