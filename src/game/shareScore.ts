// shareScore.ts — render a final-score summary to a PNG and share/save it.
//
// Draws a self-contained score card (top line: Chronossus vs You, then the bot
// breakdown, then the modes + difficulty selections) on a canvas and hands it to the
// OS share sheet via the Web Share API (navigator.share with a File). On desktop /
// where file-sharing isn't supported it falls back to a download. No external libs.

export interface ScoreShareRow {
  label: string;
  you?: number | null;
  bot?: number | null;
  /** Section header (spans the row, no values). */
  header?: boolean;
}

export interface ScoreShareData {
  title: string;
  playerScore: number | null;
  botScore: number;
  result: 'win' | 'lose' | null;
  rows: ScoreShareRow[];
  /** Setup lines (mode, B-side, difficulty), one per entry. */
  setup: string[];
  footer: string;
}

const W = 720;
const PAD = 40;
const ACCENT = '#c8a24a';

/** Draw the score card and return the canvas (already sized to its content). */
function drawCard(d: ScoreShareData): HTMLCanvasElement {
  // Measure height: header block + rows + setup + footer.
  const rowH = 34;
  const headBlock = 210;
  const setupH = d.setup.length ? 30 + d.setup.length * 28 + 20 : 0;
  const height = headBlock + d.rows.length * rowH + setupH + 90;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Background.
  ctx.fillStyle = '#141019';
  ctx.fillRect(0, 0, W, height);
  ctx.fillStyle = '#1c1626';
  ctx.fillRect(0, 0, W, 96);

  // Title.
  ctx.fillStyle = '#efe9f5';
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(d.title, PAD, 48);

  // Value columns: the You / Chronossus numbers are right-aligned at these edges, and
  // the big totals sit directly above their own column (aligned to the same edge).
  const colBotRight = W - PAD;
  const colYouRight = W - PAD - 150;
  const vsX = (colYouRight + colBotRight) / 2;

  // Big scores, right-aligned over each column.
  const yBig = 160;
  ctx.fillStyle = '#efe9f5';
  ctx.font = '800 54px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(d.playerScore == null ? '—' : String(d.playerScore), colYouRight, yBig);
  ctx.fillText(String(d.botScore), colBotRight, yBig);
  ctx.fillStyle = ACCENT;
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('vs', vsX, yBig);
  ctx.fillStyle = '#a89bb8';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('YOU', colYouRight, yBig + 42);
  ctx.fillText('CHRONOSSUS', colBotRight, yBig + 42);

  // Result badge.
  if (d.result) {
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.fillStyle = d.result === 'win' ? '#7bdc8c' : '#ff8c8c';
    ctx.textAlign = 'center';
    ctx.fillText(d.result === 'win' ? 'YOU WIN' : 'YOU LOSE', W / 2, 116);
  }

  // Rows.
  let y = headBlock + rowH / 2;
  ctx.font = '400 16px system-ui, sans-serif';
  for (const r of d.rows) {
    if (r.header) {
      ctx.fillStyle = ACCENT;
      ctx.font = '700 14px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(r.label.toUpperCase(), PAD, y);
      ctx.font = '400 16px system-ui, sans-serif';
    } else {
      ctx.fillStyle = '#c7bdd6';
      ctx.textAlign = 'left';
      ctx.fillText(r.label, PAD, y);
      ctx.fillStyle = '#efe9f5';
      ctx.textAlign = 'right';
      ctx.fillText(r.you == null ? '—' : String(r.you), colYouRight, y);
      ctx.fillText(r.bot == null ? '—' : String(r.bot), colBotRight, y);
    }
    y += rowH;
  }

  // Setup section.
  if (d.setup.length) {
    y += 6;
    ctx.strokeStyle = 'rgba(200,162,74,0.3)';
    ctx.beginPath();
    ctx.moveTo(PAD, y - 14);
    ctx.lineTo(W - PAD, y - 14);
    ctx.stroke();
    ctx.fillStyle = ACCENT;
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SETUP', PAD, y + 8);
    y += 34;
    ctx.font = '400 15px system-ui, sans-serif';
    ctx.fillStyle = '#c7bdd6';
    for (const line of d.setup) {
      ctx.fillText(line, PAD, y);
      y += 28;
    }
  }

  // Footer.
  ctx.fillStyle = '#7a7088';
  ctx.font = '400 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(d.footer, PAD, height - 30);

  return canvas;
}

/** Render + share (or download) the score card. Returns how it was delivered. */
export async function shareScoreImage(d: ScoreShareData): Promise<'shared' | 'downloaded'> {
  const canvas = drawCard(d);
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'),
  );
  const file = new File([blob], 'anachrony-score.png', { type: 'image/png' });

  // Prefer the native share sheet when it can carry files (mobile).
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: d.title });
      return 'shared';
    } catch (e) {
      // AbortError = user dismissed the sheet; treat as handled, don't fall back.
      if (e instanceof DOMException && e.name === 'AbortError') return 'shared';
      // Otherwise fall through to download.
    }
  }

  // Desktop / no file-share: download the PNG.
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'anachrony-score.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
