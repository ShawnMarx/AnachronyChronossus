// Translation review harness: capture every reachable piece of wording, in English and in
// a chosen language, side by side, in one run.
//
//   LANG=de node pw-i18n-review.mjs                 # English vs de
//   LANG=zz COVERAGE=1 node pw-i18n-review.mjs      # marker run: report key coverage
//   SHOT_DIR=/tmp/review LANG=de node pw-i18n-review.mjs
//
// Why it works: with Debug ON, tapping a board Action hotspot sets the real `pending`
// flow (see `onTileClick` in BoardExplorer) — the FULL guided dialog opens exactly as if
// the AI die had sent a marker there. So the wording behind all 24 Action spaces is
// reachable by a loop instead of by playing until the dice cooperate. Modular tiles are
// reached the same way, once per mode that places them.
//
// Output in SHOT_DIR:
//   en/NN-slug.{txt,png}, <lang>/NN-slug.{txt,png}   one capture per screen, per language
//   report.html                                      side-by-side contact sheet
//   coverage.md                                      which keys were seen, which were not
//
// COVERAGE=1 expects a locale whose every value is a unique ⟦key⟧ marker (generate with
// `node pw-i18n-review.mjs --markers`), and reports exactly which keys a run never showed.
// A harness that silently misses a third of the strings is worse than none: the translator
// would believe they had reviewed everything.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const LOCALES = join(ROOT, 'src/i18n/locales');

// --- `--pseudo`: a locale you can judge without speaking the language ----------
//
// Pseudolocalization. Every English string is accented so it stays readable, padded ~40%
// longer, and wrapped in brackets. Nothing needs translating and no language knowledge is
// required — you just LOOK at the app and three classes of bug are obvious on sight:
//
//   * a string still in plain English  -> it is hard-coded and no locale file can reach it
//   * text overflowing or truncated    -> the layout cannot take a longer language
//   * a sentence broken across brackets-> it was concatenated in code, so word order is
//                                         frozen and a translator cannot fix it
//
// German runs 10-35% longer than English, so the padding is a realistic worst case rather
// than a stunt. This is the run to do BEFORE handing a file to a translator.
if (process.argv.includes('--pseudo')) {
  const en = JSON.parse(readFileSync(join(LOCALES, 'en.json'), 'utf8'));
  const MAP = {
    a: 'á', b: 'ƀ', c: 'ç', d: 'ð', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ',
    l: 'ĺ', m: 'ɱ', n: 'ñ', o: 'ó', p: 'ƥ', q: 'ʠ', r: 'ŕ', s: 'š', t: 'ŧ', u: 'ú', v: 'ṽ',
    w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
    A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ð', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ',
    L: 'Ĺ', M: 'Ϻ', N: 'Ñ', O: 'Ó', P: 'Ƥ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ŧ', U: 'Ú', V: 'Ṽ',
    W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
  };
  // Placeholders, markup and link targets must survive untouched or the app breaks for a
  // reason that has nothing to do with what we are testing.
  const KEEP = /(\{\w+\}|\*\*|\*|\[|\]\([\w.-]+\)|\n)/;
  const accent = (s) =>
    s.split(KEEP).map((part, i) => (i % 2 ? part : [...part].map((c) => MAP[c] ?? c).join('')))
      .join('');
  // The padding must be BREAKABLE. A solid run of one character is a single unwrappable
  // "word" wider than any container, so it manufactures overflow that no real language
  // would cause — it reported the landing page as scrolling sideways when nothing was
  // wrong. Short space-separated groups model a long language honestly.
  const PAD = 'ẋẋẋẋ ẋẋẋ ẋẋẋẋẋ ẋẋẋ ẋẋẋẋ ẋẋẋẋẋẋ ẋẋẋ ẋẋẋẋ ẋẋẋẋẋ ẋẋẋ ẋẋẋẋ ẋẋẋẋẋẋ ';
  const out = { $locale: { code: 'xx', name: 'Ƥšéúðó', officialRulebook: true } };
  for (const [k, v] of Object.entries(en)) {
    if (k === '$locale') continue;
    const grow = Number(process.env.PSEUDO_PAD ?? 0.4);
    const pad = PAD.repeat(8).slice(0, Math.max(1, Math.round(String(v).length * grow)));
    out[k] = `⟦${accent(String(v))} ${pad}⟧`;
  }
  writeFileSync(join(LOCALES, 'xx.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote src/i18n/locales/xx.json (${Object.keys(out).length - 1} strings, +40% length)`);
  console.log('now:  LANG_CODE=xx MODES=all node pw-i18n-review.mjs   (then delete xx.json)');
  process.exit(0);
}

// --- `--markers`: write a locale whose values are their own keys ---------------
if (process.argv.includes('--markers')) {
  const en = JSON.parse(readFileSync(join(LOCALES, 'en.json'), 'utf8'));
  const out = { $locale: { code: 'zz', name: 'Marker', officialRulebook: true } };
  for (const [k, v] of Object.entries(en)) {
    if (k === '$locale') continue;
    const ph = [...String(v).matchAll(/\{(\w+)\}/g)].map((m) => `{${m[1]}}`).join('');
    out[k] = `⟦${k}⟧${ph}`;
  }
  writeFileSync(join(LOCALES, 'zz.json'), JSON.stringify(out, null, 2) + '\n');
  console.log(`wrote src/i18n/locales/zz.json (${Object.keys(out).length - 1} markers)`);
  process.exit(0);
}

const URL_BASE = process.argv[2] ?? 'http://localhost:5173/';
const LANG = process.env.LANG_CODE ?? process.env.LANG2 ?? '';
const OUT = process.env.SHOT_DIR ?? '/tmp/i18n-review';
const COVERAGE = !!process.env.COVERAGE;
// Which Chronossus modules to walk. Each mode lays DIFFERENT modular tiles, and a tile's
// rule text is only reachable in a mode that places it — so coverage of `tile.*` is a
// direct function of this list. `all` walks every mode (slow, but it is the run a
// translator wants once).
const ALL_MODES = [
  'Base', 'Fractures of Time', 'Guardians of the Council', 'Pioneers of New Earth',
  'Doomsday', 'Hypersync Future Actions',
  'Fractures of Time + Hypersync Future Actions',
  'Guardians of the Council + Hypersync Future Actions',
  'Fractures of Time + Pioneers of New Earth',
  'Guardians of the Council + Pioneers of New Earth',
];
// SIDES=B turns on the setup's "Flip Action tiles to their B side" option, then flips
// every tile — the only route to the B-side rule text, which is half of `tile.*`.
const SIDE_B = (process.env.SIDES ?? 'A').toUpperCase() === 'B';
const MODES = (process.env.MODES ?? 'Base') === 'all'
  ? ALL_MODES
  : (process.env.MODES ?? 'Base').split(',').map((m) => m.trim()).filter(Boolean);
if (!LANG) {
  console.error('Set LANG_CODE=<code> (a file in src/i18n/locales/). Use --markers first for a coverage run.');
  process.exit(2);
}

// --- the walk -------------------------------------------------------------------

/** One capture: a screen worth showing a translator. */
async function capture(page, dir, n, label) {
  // Expand every collapsed rulebook box — that text is most of what needs reviewing.
  for (let i = 0; i < 12; i++) {
    const boxes = page.locator('.rules-box:not(.open) .rules-box-toggle');
    const before = await boxes.count();
    if (!before) break;
    await boxes.first().click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(70);
    if ((await boxes.count()) >= before) break;
  }
  // Also expand the 📖 mech/rule collapsibles that are not RulesBox.
  const extra = page.locator('.mech-cta');
  for (let i = 0; i < (await extra.count()); i++) {
    await extra.nth(i).click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(60);
  }
  await page
    .addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
    .catch(() => {});
  const id = `${String(n).padStart(3, '0')}-${label.replace(/\W+/g, '-').slice(0, 60)}`;
  writeFileSync(join(dir, `${id}.txt`), await page.locator('body').innerText());
  await page.screenshot({ path: join(dir, `${id}.png`) });

  // Layout faults a longer language causes. Reported rather than assumed: an overflowing
  // button or a clipped line is the commonest thing a translation breaks, and it is
  // invisible in the JSON. NOTE the evaluate is NOT wrapped in a silent catch — a detector
  // that returns [] when it throws reports "none" for every screen, which reads exactly
  // like a clean run.
  // FAULT_SELFTEST forces every button to nowrap, which MUST make the detector report
  // overflows. Without it, "layout faults: none" is indistinguishable from a detector
  // that silently does nothing — which is exactly what happened the first time this was
  // written (the code had failed to splice in at all, and every run said "none").
  if (process.env.FAULT_SELFTEST) {
    await page.addStyleTag({ content: 'button{white-space:nowrap!important;max-width:120px}' }).catch(() => {});
    await page.waitForTimeout(80);
  }
  const faults = await page.evaluate(() => {
    const out = [];
    const name = (el) => `${el.tagName}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
    for (const el of document.querySelectorAll('button, a, h1, h2, h3, th, td, label, span, p, li')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const txt = (el.textContent || '').trim();
      if (!txt || el.children.length > 2) continue;
      const overX = el.scrollWidth - el.clientWidth > 1;
      const overY = el.scrollHeight - el.clientHeight > 1;
      const hidden = cs.overflow !== 'visible' && cs.overflow !== 'auto' && cs.overflow !== 'scroll';
      if ((overX || overY) && hidden) out.push(`CLIPPED ${name(el)} — "${txt.slice(0, 60)}"`);
      else if (overX && cs.whiteSpace.startsWith('nowrap')) out.push(`OVERFLOW ${name(el)} — "${txt.slice(0, 60)}"`);
    }
    // Horizontal page scroll is a layout break outright (see CLAUDE.md's responsive rule).
    const sw = document.documentElement.scrollWidth;
    if (sw > window.innerWidth + 1) out.push(`PAGE SCROLLS SIDEWAYS (${sw}px > ${window.innerWidth}px)`);
    return [...new Set(out)];
  });
  if (faults.length) writeFileSync(join(dir, `${id}.faults`), faults.join('\n'));
  return id;
}

async function clearModals(page) {
  for (let i = 0; i < 5 && (await page.locator('.modal-overlay').count()); i++) {
    await page.locator('.modal-overlay').getByRole('button').last().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(350);
  }
}

async function closeDialog(page) {
  const x = page.locator('.detail-panel .dp-close, .detail-panel button[aria-label*="lose" i]').first();
  if (await x.count()) await x.click({ timeout: 2000 }).catch(() => {});
  else await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(150);
}

/**
 * The "go forward" control on whatever screen we are on, found STRUCTURALLY.
 *
 * The first version of this matched button text (`/Continue|Begin|Next/`) and therefore
 * only worked in English — it drove the pseudolocale run into a wall on the very first
 * screen. Classes do not change with language, so they are the selector of record and the
 * text regex is a last resort.
 */
function advanceControl(page) {
  return page
    .locator('.phase-primary, .setup-actions .phase-primary, button.take-bot-action')
    .first();
}

/** Walk one bot into the Action Rounds board, capturing every screen on the way. */
async function walkIn(page, dir, state, tag, name, mode) {
  await capture(page, dir, ++state.n, `${tag}-landing`);
  await page.getByText(name === 'chronobot' ? 'Chronobot' : 'Chronossus', { exact: false }).first().click();
  await page.waitForTimeout(500);
  for (let i = 0; i < 16; i++) {
    if (mode) {
      const m = page.getByText(mode, { exact: true }).first();
      if (await m.count()) { await m.click().catch(() => {}); await page.waitForTimeout(250); mode = null; }
    }
    await clearModals(page);
    if (await page.locator('.gear-btn').count()) break;
    if (SIDE_B) {
      const flip = page.getByText('Flip Action tiles to their B side', { exact: false }).first();
      if (await flip.count()) {
        await flip.click({ timeout: 3000 }).catch(() => {});
        await page.waitForTimeout(300);
        const toggles = page.locator('.tile-flip-toggle');
        for (let j = 0; j < (await toggles.count()); j++) {
          await toggles.nth(j).click({ timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(120);
        }
      }
    }
    await capture(page, dir, ++state.n, `${tag}-setup-${i}`);
    let next = advanceControl(page);
    if (!(await next.count())) {
      next = page.getByRole('button', { name: /Continue|Roll|Begin|Next|Draw|Place|Start/i }).first();
    }
    if (!(await next.count())) break;
    await next.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(320);
  }
  await clearModals(page);
  await closeDialog(page);
  await capture(page, dir, ++state.n, `${tag}-board`);
}

/** Turn Debug on so a hotspot tap opens the full guided dialog. */
async function enableDebug(page) {
  await page.locator('.gear-btn').first().click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  // The Debug row is the first menuitemcheckbox with a switch in it — matching its label
  // would be language-dependent, which is exactly what this harness must not be.
  const items = page.getByRole('menuitemcheckbox');
  for (let i = 0; i < (await items.count()); i++) {
    const item = items.nth(i);
    if (!(await item.locator('.sw').count())) continue;
    if ((await item.getAttribute('aria-checked')) !== 'true') await item.click().catch(() => {});
    break;
  }
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * Jump to every phase via the debug rail. Phase screens carry their own verbatim rules,
 * and the End Game jump is the only quick way to the score screens — which is where the
 * endgame and player-scoring rule text lives.
 */
async function sweepPhases(page, dir, state, name) {
  const rail = page.locator('.debug-phasejump button');
  const labels = await rail.allInnerTexts().catch(() => []);
  for (let i = 0; i < labels.length; i++) {
    await page.locator('.debug-phasejump button').nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
    await clearModals(page);
    await capture(page, dir, ++state.n, `${name}-phase-${labels[i]}`);
    // A phase screen can hide a second screenful behind its own Continue.
    const more = advanceControl(page);
    if (await more.count()) {
      await more.click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(350);
      await clearModals(page);
      await capture(page, dir, ++state.n, `${name}-phase-${labels[i]}-next`);
    }
  }
  return labels.length;
}

/**
 * The Command view lists every Action the bot can reach THIS mode, and a row backed by a
 * modular tile opens that tile's rules instead. It is the only place a mode's tile text is
 * reachable without waiting for a marker to land on the slot.
 */
async function sweepCommandView(page, dir, state, name) {
  const rows = page.locator('.scv-row');
  const total = await rows.count();
  for (let i = 0; i < total; i++) {
    const label = (await rows.nth(i).innerText().catch(() => '')).split('\n').pop() ?? `row-${i}`;
    await rows.nth(i).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(220);
    await capture(page, dir, ++state.n, `${name}-cmd-${label}`);
    await closeDialog(page);
  }
  return total;
}

/**
 * Tap every modular tile on the board. `.cx-tile-art` carries an onClick that opens the
 * tile's own dialog, so a mode's tile text is reachable without waiting for a marker to
 * land on the slot. Which tiles exist depends on the mode (and the A/B side), which is
 * why a full `tile.*` sweep needs MODES=all run twice, once with SIDES=B.
 */
async function sweepTiles(page, dir, state, name) {
  // The Command-view overlay floats over the board; a forced click would otherwise land
  // on IT rather than the tile underneath.
  await page.addStyleTag({ content: '.scv-overlay{display:none!important}' }).catch(() => {});
  const tiles = page.locator('.cx-tile-art');
  const total = await tiles.count();
  for (let i = 0; i < total; i++) {
    const code = (await tiles.nth(i).getAttribute('alt')) ?? `tile-${i}`;
    await tiles.nth(i).click({ timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(280);
    if (!(await page.locator('.detail-panel, .cx-tile-dialog').count())) continue;
    await capture(page, dir, ++state.n, `${name}-${code}`);
    for (let st = 0; st < 3; st++) {
      let step = page
        .locator('.detail-panel .start-turn, .detail-panel .gate-yes, .cx-tile-dialog .start-turn')
        .first();
      if (!(await step.count())) {
        step = page
          .locator('.detail-panel, .cx-tile-dialog')
          .getByRole('button', { name: /Confirm|Cannot|Continue|Roll|Yes|No/i })
          .first();
      }
      if (!(await step.count())) break;
      await step.click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(240);
      if (!(await page.locator('.detail-panel, .cx-tile-dialog').count())) break;
      await capture(page, dir, ++state.n, `${name}-${code}-step${st}`);
    }
    await closeDialog(page);
  }
  return total;
}

/** Tap every board Action space and step through the dialog it opens. */
async function sweepActions(page, dir, state, name) {
  // The Command-view overlay floats over the board and swallows taps.
  await page.addStyleTag({ content: '.scv-overlay{display:none!important}' }).catch(() => {});
  const spots = page.locator('button.hotspot');
  const total = await spots.count();
  for (let i = 0; i < total; i++) {
    const title = (await spots.nth(i).getAttribute('title')) ?? `spot-${i}`;
    await spots.nth(i).click({ timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(250);
    if (!(await page.locator('.detail-panel').count())) continue;
    await capture(page, dir, ++state.n, `${name}-action-${title}`);
    // Step the dialog forward a few times — each step is different wording.
    for (let s = 0; s < 4; s++) {
      let step = page.locator('.detail-panel .start-turn, .detail-panel .gate-yes, .detail-panel .phase-primary').first();
      if (!(await step.count())) {
        step = page
          .locator('.detail-panel')
          .getByRole('button', { name: /Confirm|Cannot|Continue|Roll|Yes|No|Open|Available/i })
          .first();
      }
      if (!(await step.count())) break;
      await step.click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(250);
      if (!(await page.locator('.detail-panel').count())) break;
      await capture(page, dir, ++state.n, `${name}-action-${title}-step${s}`);
    }
    await closeDialog(page);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  return total;
}

async function run(code) {
  const dir = join(OUT, code);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // The app rolls its own dice; pin them so the two language runs line up screen for screen.
  await page.addInitScript((c) => {
    try { localStorage.setItem('anachrony:lang', c); } catch { /* ignore */ }
    let seed = 20260823;
    Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  }, code);

  const state = { n: 0 };
  const passes = [['chronobot', null], ...MODES.map((m) => ['chronossus', m])];
  for (const [name, mode] of passes) {
    const tag = mode && mode !== 'Base' ? `${name}-${mode.replace(/\W+/g, '-').toLowerCase()}` : name;
    await page.goto(URL_BASE, { waitUntil: 'networkidle' });
    await page.evaluate((c) => { localStorage.clear(); localStorage.setItem('anachrony:lang', c); }, code);
    await page.goto(URL_BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await walkIn(page, dir, state, tag, name, mode);
    await enableDebug(page);
    const rows = await sweepCommandView(page, dir, state, tag);
    const tiles = await sweepTiles(page, dir, state, tag);
    const spots = await sweepActions(page, dir, state, tag);
    // Back to the Action Rounds phase, then walk the whole phase rail (incl. End Game).
    if (await page.locator('.gear-btn').count()) {
      await page.locator('.gear-btn').first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(300);
      await capture(page, dir, ++state.n, `${tag}-settings`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(200);
    }
    const phases = await sweepPhases(page, dir, state, tag);
    console.log(`  ${tag}: ${rows} cmd rows, ${tiles} tiles, ${spots} Actions, ${phases} phases`);
  }
  await browser.close();
  console.log(`${code}: ${state.n} captures -> ${dir}${errors.length ? `  (${errors.length} page errors)` : ''}`);
  if (errors.length) writeFileSync(join(dir, '_errors.txt'), errors.join('\n'));
  return { dir, count: state.n };
}

mkdirSync(OUT, { recursive: true });
console.log('capturing English…');
const en = await run('en');
console.log(`capturing ${LANG}…`);
const tr = await run(LANG);

// --- coverage --------------------------------------------------------------------
if (COVERAGE) {
  const all = JSON.parse(readFileSync(join(LOCALES, 'en.json'), 'utf8'));
  const keys = Object.keys(all).filter((k) => k !== '$locale');
  const seen = new Set();
  for (const f of readdirSync(tr.dir).filter((f) => f.endsWith('.txt'))) {
    for (const m of readFileSync(join(tr.dir, f), 'utf8').matchAll(/⟦([^⟧]+)⟧/g)) seen.add(m[1]);
  }
  const missing = keys.filter((k) => !seen.has(k));
  const byNs = (list) => list.reduce((a, k) => ((a[k.split('.')[0]] = (a[k.split('.')[0]] ?? 0) + 1), a), {});
  const cov = byNs([...seen]);
  const tot = byNs(keys);
  const lines = [
    `# Wording coverage`,
    ``,
    `**${seen.size} of ${keys.length} keys (${Math.round((100 * seen.size) / keys.length)}%) appeared on screen in this run.**`,
    ``,
    `| namespace | seen | total |`,
    `|---|---:|---:|`,
    ...Object.keys(tot).sort().map((n) => `| \`${n}.*\` | ${cov[n] ?? 0} | ${tot[n]} |`),
    ``,
    `## Not reached (${missing.length})`,
    ``,
    `These strings exist but no screen in this run displayed them — review them in`,
    `\`src/i18n/locales/${LANG}.json\` directly, without in-app context.`,
    ``,
    ...missing.map((k) => `- \`${k}\``),
  ];
  writeFileSync(join(OUT, 'coverage.md'), lines.join('\n') + '\n');
  console.log(`coverage: ${seen.size}/${keys.length} keys -> ${join(OUT, 'coverage.md')}`);
}

// --- text that never went through the locale file ---------------------------------
if (/^xx/.test(LANG)) {
  const seen = new Map();
  for (const f of readdirSync(tr.dir).filter((x) => x.endsWith('.txt'))) {
    const body = readFileSync(join(tr.dir, f), 'utf8');
    // Strip the pseudolocalized runs, then look at what English is left.
    for (const line of body.replace(/⟦[^⟧]*⟧/g, '').split('\n')) {
      const t = line.trim();
      if (!t || t.length < 4) continue;
      if (!/[A-Za-z]{3}/.test(t)) continue; // numbers, icons, dice faces
      if (!seen.has(t)) seen.set(t, f.replace('.txt', ''));
    }
  }
  const rows = [...seen].sort((a, b) => a[0].localeCompare(b[0]));
  writeFileSync(join(OUT, 'untranslated.md'),
    `# Text still in English under the pseudolocale\n\n` +
    `Every translated string renders wrapped in \`⟦ ⟧\`. These lines were NOT, so each is\n` +
    `either hard-coded in the JSX (no locale file can reach it) or genuine dynamic data\n` +
    `(a player name, a number, a tile code). Work down the list and move the real strings\n` +
    `into \`uiStrings.ts\`.\n\n` +
    `**${rows.length} distinct lines.**\n\n` +
    rows.map(([t, where]) => `- \`${t.replace(/`/g, "'").slice(0, 110)}\`  _(${where})_`).join('\n') + '\n');
  console.log(`untranslated text: ${rows.length} distinct lines -> ${join(OUT, 'untranslated.md')}`);
}

// --- layout faults ----------------------------------------------------------------
const faultFiles = readdirSync(tr.dir).filter((f) => f.endsWith('.faults'));
const faultLines = faultFiles.flatMap((f) =>
  readFileSync(join(tr.dir, f), 'utf8').split('\n').filter(Boolean).map((l) => `${f.replace('.faults','')}: ${l}`),
);
if (faultLines.length) {
  writeFileSync(join(OUT, 'layout-faults.md'),
    `# Layout faults in \`${LANG}\`\n\n` +
    `Text that overflows, is clipped, or scrolls the page sideways. Each is a place the\n` +
    `layout cannot take a longer language — fix the CSS, not the translation.\n\n` +
    faultLines.map((l) => `- ${l}`).join('\n') + '\n');
  console.log(`layout faults: ${faultLines.length} -> ${join(OUT, 'layout-faults.md')}`);
} else {
  console.log('layout faults: none');
}

// --- side-by-side report ----------------------------------------------------------
const shots = readdirSync(en.dir).filter((f) => f.endsWith('.png')).sort();
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// PAIR BY CAPTURE INDEX, NOT BY FILENAME. A screen is named after what is ON it, and in the
// target language that name is translated — `023-chronobot-action-Mine-Resource.png` on the
// English side is `023-chronobot-action-Extraer-Recurso.png` on the Spanish one. Matching on
// the full name therefore reported "not captured" for every Action and tile dialog, which is
// exactly the set a translator most needs to see side by side. Both runs walk the same route
// in the same order, so the numeric prefix is the reliable key.
const trByIndex = new Map(
  readdirSync(tr.dir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => [f.slice(0, f.indexOf('-')), f]),
);
const rows = shots
  .map((f) => {
    const base = f.replace(/\.png$/, '');
    const other = trByIndex.get(f.slice(0, f.indexOf('-'))) ?? null;
    const otherBase = other ? other.replace(/\.png$/, '') : null;
    const enTxt = existsSync(join(en.dir, `${base}.txt`)) ? readFileSync(join(en.dir, `${base}.txt`), 'utf8') : '';
    const trTxt =
      otherBase && existsSync(join(tr.dir, `${otherBase}.txt`))
        ? readFileSync(join(tr.dir, `${otherBase}.txt`), 'utf8')
        : '';
    let faults = '';
    try {
      faults = readFileSync(join(tr.dir, `${otherBase ?? base}.faults`), 'utf8').trim();
    } catch { /* no faults on this screen */ }
    return `<section><h2>${esc(base.replace(/^\d+-/, ''))}</h2>
  ${faults ? `<ul class="faults">${faults.split('\n').map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
  <div class="pair">
    <figure><figcaption>English</figcaption><img src="en/${f}" loading="lazy"><pre>${esc(enTxt)}</pre></figure>
    <figure><figcaption>${esc(LANG)}</figcaption>${other ? `<img src="${esc(LANG)}/${esc(other)}" loading="lazy">` : '<p class="missing">not captured</p>'}<pre>${esc(trTxt)}</pre></figure>
  </div></section>`;
  })
  .join('\n');
writeFileSync(
  join(OUT, 'report.html'),
  `<!doctype html><meta charset="utf-8"><title>Translation review — ${esc(LANG)}</title>
<style>
 :root{color-scheme:light dark}
 body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:1.5rem;max-width:1800px}
 h1{margin:0 0 .3rem} .sub{opacity:.7;margin:0 0 2rem}
 section{margin:0 0 2.5rem;border-top:1px solid #8884;padding-top:1rem}
 h2{font-size:1rem;font-family:ui-monospace,monospace;opacity:.8}
 .pair{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
 figure{margin:0;min-width:0} figcaption{font-weight:600;margin-bottom:.35rem}
 img{width:100%;border:1px solid #8884;border-radius:6px}
 pre{white-space:pre-wrap;font-size:12px;background:#8881;padding:.6rem;border-radius:6px;max-height:22em;overflow:auto}
 .missing{color:#c33}
 .faults{margin:.2rem 0 .8rem;padding:.5rem .5rem .5rem 1.6rem;background:#c3330f18;border-left:3px solid #c33;border-radius:4px}
 .faults li{color:#c33;font-size:12px;font-family:ui-monospace,monospace}
</style>
<h1>Translation review — ${esc(LANG)}</h1>
<p class="sub">${shots.length} screens, English vs ${esc(LANG)}. Screenshots show layout (watch for text that overflows its box); the text below each is what the app rendered.</p>
${rows}`,
);
console.log(`report -> ${join(OUT, 'report.html')}`);
