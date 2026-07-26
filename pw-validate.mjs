import { chromium } from 'playwright';

const url = 'http://localhost:5199/';
const shot = process.argv[2] || 'shot.png';
const browser = await chromium.launch({ executablePath: 'C:/Users/shawn/AppData/Local/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-win64/chrome-headless-shell.exe' });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('.board');
await page.waitForTimeout(300);

// Board image rect + each badge center, as % of the board image.
const data = await page.evaluate(() => {
  const board = document.querySelector('.board').getBoundingClientRect();
  const badges = [...document.querySelectorAll('.count-badge')].map((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return {
      title: el.getAttribute('title'),
      text: el.textContent,
      xPct: +(((cx - board.left) / board.width) * 100).toFixed(2),
      yPct: +(((cy - board.top) / board.height) * 100).toFixed(2),
    };
  });
  return { board: { w: Math.round(board.width), h: Math.round(board.height), aspect: +(board.width / board.height).toFixed(4) }, badges };
});

console.log('board', JSON.stringify(data.board));
for (const b of data.badges) console.log(`${String(b.text).padStart(2)}  ${String(b.xPct).padStart(6)}% ${String(b.yPct).padStart(6)}%  ${b.title}`);

await page.screenshot({ path: shot, fullPage: false });
await browser.close();
