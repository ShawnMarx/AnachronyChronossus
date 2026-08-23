// Compare two pw-i18n-snapshot.mjs captures.
//
//   node pw-i18n-diff.mjs /tmp/before /tmp/after
//
// Text and layout must match; pixels are allowed a small antialiasing budget, because
// moving a string into a locale file coalesces JSX text nodes and the browser reshapes the
// run by a hair. See the header of pw-i18n-snapshot.mjs.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const [A, B] = process.argv.slice(2);
const PIXEL_BUDGET = Number(process.env.PIXEL_BUDGET ?? 400); // per screen
const shots = readdirSync(A).filter((f) => f.endsWith('.png')).sort();
const fails = [];
let worstPx = 0;

for (const kind of ['txt', 'geom']) {
  for (const f of readdirSync(A).filter((x) => x.endsWith('.' + kind)).sort()) {
    let a, b;
    try { a = readFileSync(join(A, f), 'utf8'); b = readFileSync(join(B, f), 'utf8'); }
    catch { fails.push(`${f}: missing in one capture`); continue; }
    if (a !== b) {
      const al = a.split('\n'), bl = b.split('\n');
      const i = al.findIndex((l, k) => l !== bl[k]);
      fails.push(`${f}: ${kind.toUpperCase()} differs at line ${i + 1}\n    - ${al[i]}\n    + ${bl[i]}`);
    }
  }
}

const br = await chromium.launch();
const pg = await br.newPage();
for (const f of shots) {
  const n = await pg.evaluate(async ([x, y]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return -1;
    const g = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      c.getContext('2d').drawImage(im, 0, 0); return c.getContext('2d').getImageData(0, 0, im.width, im.height).data; };
    const da = g(ia), db = g(ib);
    let d = 0;
    for (let i = 0; i < da.length; i += 4) if (da[i] !== db[i] || da[i+1] !== db[i+1] || da[i+2] !== db[i+2]) d++;
    return d;
  }, [`data:image/png;base64,${readFileSync(join(A, f)).toString('base64')}`,
      `data:image/png;base64,${readFileSync(join(B, f)).toString('base64')}`]);
  if (n === -1) fails.push(`${f}: different dimensions`);
  else if (n > PIXEL_BUDGET) fails.push(`${f}: ${n} pixels differ (budget ${PIXEL_BUDGET})`);
  if (n > worstPx) worstPx = n;
}
await br.close();

console.log(`${shots.length} screens · text + layout compared · worst pixel delta ${worstPx} (budget ${PIXEL_BUDGET})`);
if (fails.length) { console.log('\nFAILURES:'); fails.forEach((f) => console.log('  ' + f)); process.exit(1); }
console.log('no regressions');
