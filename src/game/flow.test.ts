import { describe, expect, it } from 'vitest';
import { Chronobot, DEFAULT_CONFIG } from '../engine';
import type { GameState } from '../engine';
import {
  advanceFromPreparation,
  finishEra,
  isFinalEra,
  paradoxSkipped,
  startFirstEra,
} from './flow';

function game(mut: (s: GameState) => void = () => {}): GameState {
  const s = Chronobot.setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
  mut(s);
  return s;
}

describe('flow: Era loop', () => {
  it('startFirstEra enters Preparation', () => {
    expect(startFirstEra(game()).phase).toBe('preparation');
  });

  it('skips Paradox in Era 1 (Preparation → Power Up)', () => {
    const s = game((g) => {
      g.era = 1;
      g.phase = 'preparation';
    });
    expect(paradoxSkipped(s)).toBe(true);
    expect(advanceFromPreparation(s).phase).toBe('powerup');
  });

  it('runs Paradox in later Eras (Preparation → Paradox)', () => {
    const s = game((g) => {
      g.era = 2;
      g.phase = 'preparation';
    });
    expect(paradoxSkipped(s)).toBe(false);
    expect(advanceFromPreparation(s).phase).toBe('paradox');
  });

  it('finishEra starts the next Era at Preparation mid-game', () => {
    const s = game((g) => {
      g.era = 2;
      g.phase = 'cleanup';
    });
    const next = finishEra(s);
    expect(next.era).toBe(3);
    expect(next.phase).toBe('preparation');
    expect(next.finished).toBe(false);
  });

  it('finishEra ends the game after a triggered End Game', () => {
    const s = game((g) => {
      g.era = 5;
      g.phase = 'cleanup';
      g.endgameTriggered = true;
    });
    const done = finishEra(s);
    expect(isFinalEra(s)).toBe(true);
    expect(done.phase).toBe('endgame');
    expect(done.finished).toBe(true);
  });

  it('finishEra ends the game after the final Era', () => {
    const s = game((g) => {
      g.era = Chronobot.MAX_ERA;
      g.phase = 'cleanup';
    });
    expect(finishEra(s).phase).toBe('endgame');
  });
});
