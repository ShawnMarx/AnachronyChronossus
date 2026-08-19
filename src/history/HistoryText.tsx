// HistoryText — renders a History label/effect string, swapping icon tokens for the
// game's own component art and `**…**` for bold.
//
// History entries are plain strings (they are persisted to localStorage and shared by both
// bots), so a line that wants a game icon writes a token instead: `{flux} Blink — …`.
// Only real in-game component art belongs here — never decorative emoji.
//
// The same reason drives the bold markup: by convention every board location the player
// has to act on reads bold wherever the app shows it (see CLAUDE.md). Dialogs write a
// plain <b>; a persisted string can't, so it carries `**…**` instead.

const ICONS: Record<string, { src: string; alt: string }> = {
  flux: { src: '/assets/solo/chronossus/flux-core.png', alt: 'Flux Core' },
};

/** An icon token (`{flux}`) or a bold run (`**…**`), whichever comes first. */
const MARKUP = /\{(\w+)\}|\*\*([^*]+)\*\*/g;

export type HistorySegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'icon'; value: string };

/**
 * Split a History string into its plain text, bold runs and icon tokens. Pure, so the
 * markup is unit-tested without a DOM. An unrecognised `{token}` is left as written —
 * better a stray `{foo}` on screen than a silently dropped word.
 */
export function historySegments(text: string): HistorySegment[] {
  const parts: HistorySegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKUP)) {
    if (m.index == null) continue;
    if (m[1] != null && !ICONS[m[1]]) continue;
    if (m.index > last) parts.push({ kind: 'text', value: text.slice(last, m.index) });
    parts.push(m[1] != null ? { kind: 'icon', value: m[1] } : { kind: 'bold', value: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', value: text.slice(last) });
  return parts;
}

export default function HistoryText({ text }: { text: string }) {
  return (
    <>
      {historySegments(text).map((seg, i) => {
        if (seg.kind === 'text') return seg.value;
        if (seg.kind === 'bold') return <b key={i}>{seg.value}</b>;
        const icon = ICONS[seg.value];
        return (
          <img key={i} className="history-icon" src={icon.src} alt={icon.alt} title={icon.alt} />
        );
      })}
    </>
  );
}
