// The History string markup: icon tokens and bold runs. History entries are persisted
// plain strings, so the markup — not JSX — is what carries them.

import { describe, it, expect } from 'vitest';
import { historySegments } from './HistoryText';

describe('historySegments', () => {
  it('leaves a plain line as one text segment', () => {
    expect(historySegments('Exosuit placed')).toEqual([{ kind: 'text', value: 'Exosuit placed' }]);
  });

  it('bolds the locations on a Blink line, around the icon token', () => {
    expect(historySegments('{flux} Blink — Exosuit moved from **Mine** to **Construct**')).toEqual([
      { kind: 'icon', value: 'flux' },
      { kind: 'text', value: ' Blink — Exosuit moved from ' },
      { kind: 'bold', value: 'Mine' },
      { kind: 'text', value: ' to ' },
      { kind: 'bold', value: 'Construct' },
    ]);
  });

  it('leaves an unknown token as written rather than dropping it', () => {
    expect(historySegments('a {nope} b')).toEqual([{ kind: 'text', value: 'a {nope} b' }]);
  });

  it('leaves an unpaired ** alone', () => {
    expect(historySegments('2 ** 3')).toEqual([{ kind: 'text', value: '2 ** 3' }]);
  });
});
