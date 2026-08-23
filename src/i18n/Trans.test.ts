import { describe, expect, it } from 'vitest';
import { transSegments } from './Trans';

describe('Trans markup', () => {
  it('keeps a link inside the sentence, wherever the translator puts it', () => {
    const en = transSegments('Part of [BoardGameEdge](bge) — more play aids.', { bge: '/x' });
    const de = transSegments('Mehr Spielhilfen bei [BoardGameEdge](bge).', { bge: '/x' });
    expect(en.filter((s) => s.kind === 'link')).toEqual([
      { kind: 'link', value: 'BoardGameEdge', href: '/x' },
    ]);
    // Same link, different position — the whole point of not splitting the string.
    expect(de[0].kind).toBe('text');
    expect(de[1]).toEqual({ kind: 'link', value: 'BoardGameEdge', href: '/x' });
  });

  it('renders bold and italic runs', () => {
    expect(transSegments('a **b** c *d*')).toEqual([
      { kind: 'text', value: 'a ' },
      { kind: 'bold', value: 'b' },
      { kind: 'text', value: ' c ' },
      { kind: 'italic', value: 'd' },
    ]);
  });

  it('leaves an unknown link target literal rather than rendering a dead anchor', () => {
    expect(transSegments('see [here](nope)')).toEqual([{ kind: 'text', value: 'see [here](nope)' }]);
  });

  it('parses the link label too, so a bold link survives translation', () => {
    const [seg] = transSegments('see [**Anachrony**](store)', { store: '/s' }).filter(
      (x) => x.kind === 'link',
    );
    expect(seg).toEqual({ kind: 'link', value: '**Anachrony**', href: '/s' });
    // the label is re-parsed at render, so the ** becomes a <b> inside the <a>
    expect(transSegments('**Anachrony**')).toEqual([{ kind: 'bold', value: 'Anachrony' }]);
  });

  it('leaves plain text alone', () => {
    expect(transSegments('nothing to do')).toEqual([{ kind: 'text', value: 'nothing to do' }]);
  });
});
