// HistoryText — renders a History label/effect string, swapping icon tokens for the
// game's own component art.
//
// History entries are plain strings (they are persisted to localStorage and shared by both
// bots), so a line that wants a game icon writes a token instead: `{flux} Blink — …`.
// Only real in-game component art belongs here — never decorative emoji.

const ICONS: Record<string, { src: string; alt: string }> = {
  flux: { src: '/assets/solo/chronossus/flux-core.png', alt: 'Flux Core' },
};

const TOKEN = /\{(\w+)\}/g;

export default function HistoryText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const icon = ICONS[m[1]];
    if (!icon || m.index == null) continue;
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <img key={m.index} className="history-icon" src={icon.src} alt={icon.alt} title={icon.alt} />,
    );
    last = m.index + m[0].length;
  }
  if (last === 0) return <>{text}</>;
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}
