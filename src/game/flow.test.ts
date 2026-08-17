import { describe, expect, it } from 'vitest';
import { Chronobot, DEFAULT_CONFIG } from '../engine';
import type { GameState } from '../engine';
import {
  advanceFromPreparation,
  finishEra,
  hasEraZeroWarp,
  isFinalEra,
  paradoxSkipped,
  pastTimelineTiles,
  startFirstEra,
} from './flow';

function game(mut: (s: GameState) => void = () => {}): GameState {
  const s = Chronobot.setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
  mut(s);
  return s;
}

/** A Chronossus game in a Fractures mode (the only one with an Era Zero Warp). */
function fractures(mode = 'fractures', mut: (s: GameState) => void = () => {}): GameState {
  return game((g) => {
    g.config = { ...g.config, bot: 'chronossus', chronossusMode: mode };
    mut(g);
  });
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

// Fractures of Time, rulebook p.6: "At the beginning of the game, before starting the
// regular round sequence for Era 1, perform a Warp Phase (but no other Phases) …
// including performing … a Paradox Phase (which would usually be skipped in the first Era)."
describe('flow: the Era Zero Warp Phase (Fractures of Time)', () => {
  it('only Fractures modes play it', () => {
    expect(hasEraZeroWarp(game())).toBe(false);
    expect(hasEraZeroWarp(fractures('base'))).toBe(false);
    expect(hasEraZeroWarp(fractures())).toBe(true);
    expect(hasEraZeroWarp(fractures('fractures+hypersync'))).toBe(true);
    expect(hasEraZeroWarp(fractures('fractures+pioneers'))).toBe(true);
  });

  it('startFirstEra enters it instead of Preparation, still on Era 1', () => {
    const s = startFirstEra(fractures());
    expect(s.phase).toBe('era0warp');
    expect(s.era).toBe(1);
  });

  it('does not skip the Era 1 Paradox phase', () => {
    const s = fractures('fractures', (g) => {
      g.era = 1;
      g.phase = 'preparation';
    });
    expect(paradoxSkipped(s)).toBe(false);
    expect(advanceFromPreparation(s).phase).toBe('paradox');
  });

  // Fractures rulebook p.4 — three pre-Impact + two post-Impact Eras: the game ends
  // after Era 5, where a base game would still have two Eras to play.
  it('makes Era 5 the final Era', () => {
    expect(isFinalEra(fractures('fractures', (g) => (g.era = 4)))).toBe(false);
    expect(isFinalEra(fractures('fractures', (g) => (g.era = 5)))).toBe(true);
    expect(isFinalEra(fractures('base', (g) => (g.era = 5)))).toBe(false);
  });

  it('counts the Era Zero tile as a past Timeline tile', () => {
    expect(pastTimelineTiles(game((g) => (g.era = 1)))).toBe(0);
    expect(pastTimelineTiles(game((g) => (g.era = 3)))).toBe(2);
    expect(pastTimelineTiles(fractures('fractures', (g) => (g.era = 1)))).toBe(1);
    expect(pastTimelineTiles(fractures('fractures', (g) => (g.era = 3)))).toBe(3);
  });
});
