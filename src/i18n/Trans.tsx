// Render one translated string that contains inline markup.
//
// A sentence with a link or a bold run in the middle of it must stay ONE key. Splitting it
// into `…before` / `…after` fragments looks tidy in the JSON and is unusable in practice:
// word order moves between languages, so the translator ends up unable to put the link
// where their grammar needs it. So the markup travels inside the string, the way brdgm's
// solo helpers do it, and the translator decides where it falls.
//
// Supported, deliberately small:
//   **bold**            -> <b>
//   *italic*            -> <i>
//   [label](name)       -> <a href={links[name]}> (target=_blank for http links)
//                          the label is parsed too, so [**Anachrony**](store) is a bold link
//   {param}             -> interpolated by `t()` before this ever sees the string
//   blank line          -> paragraph break (only when `paragraphs` is set)
//
// Anything unrecognised is left exactly as written — a stray `[foo]` on screen is a bug you
// can see, where a silently dropped word is not.

import { useI18n } from './I18nProvider';

const MARKUP = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([\w.-]+)\)/g;

export type TransSegment =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'link'; value: string; href: string };

/** Split a string into its plain text, bold/italic runs and links. Pure, so it is tested. */
export function transSegments(text: string, links: Record<string, string> = {}): TransSegment[] {
  const out: TransSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKUP)) {
    if (m.index == null) continue;
    // An unknown link target stays literal rather than rendering a dead anchor.
    if (m[3] != null && !(m[4] in links)) continue;
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    if (m[1] != null) out.push({ kind: 'bold', value: m[1] });
    else if (m[2] != null) out.push({ kind: 'italic', value: m[2] });
    else out.push({ kind: 'link', value: m[3], href: links[m[4]] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out;
}

function render(text: string, links: Record<string, string>) {
  return transSegments(text, links).map((seg, i) => {
    if (seg.kind === 'text') return seg.value;
    if (seg.kind === 'bold') return <b key={i}>{seg.value}</b>;
    if (seg.kind === 'italic') return <i key={i}>{seg.value}</i>;
    const external = /^https?:/.test(seg.href);
    return (
      <a key={i} href={seg.href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {render(seg.value, links)}
      </a>
    );
  });
}

/**
 * `<T k="ui.landing.intro" links={{ store: STORE_URL }} />`
 *
 * `paragraphs` wraps each blank-line-separated block in a `<p>` — for the rulebook and
 * intro copy that is written as prose rather than a single line.
 */
export default function T({
  k,
  params,
  links = {},
  paragraphs = false,
}: {
  k: string;
  params?: Record<string, string | number>;
  links?: Record<string, string>;
  paragraphs?: boolean;
}) {
  const { t } = useI18n();
  const text = t(k, params);
  if (!paragraphs) return <>{render(text, links)}</>;
  return (
    <>
      {text.split(/\n\s*\n/).map((para, i) => (
        <p key={i}>{render(para, links)}</p>
      ))}
    </>
  );
}
