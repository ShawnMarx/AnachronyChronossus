import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from './state';
import {
  actionRoundsCanEnd,
  markBotPassed,
  markPlayerPassed,
  resolveCleanUp,
  resolveParadox,
  resolvePowerUp,
  resolveWarp,
  scoreChronobot,
  setup,
  startNextEra,
  takeActionTurn,
  type ActionTurnInput,
} from './bots/chronobot';
import type { GameState } from './state';

/**
 * Drives a full Era through the engine exactly as the UI would, to prove the
 * phase flow hangs together end to end.
 */
describe('Full-era playthrough', () => {
  it('runs setup → paradox → powerup → warp → actions → cleanup → next era', () => {
    let s: GameState = setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
    expect(s.phase).toBe('setup');
    expect(s.currentInstructions.length).toBeGreaterThan(0);

    // Begin Era 1
    s = { ...s, phase: 'paradox' };
    s = resolveParadox(s, false);
    expect(s.phase).toBe('powerup');

    s = resolvePowerUp(s);
    expect(s.phase).toBe('warp');
    expect(s.chronobot.exosuitsAvailable).toBe(6);

    s = resolveWarp(s, 2);
    expect(s.phase).toBe('actions');
    expect(s.chronobot.warpTilesOnTimeline).toBe(2);

    // Take a sequence of Chronobot action turns.
    const turns: ActionTurnInput[] = [
      { dieRoll: 2, actionId: 'mine-resource' },
      { dieRoll: 3, actionId: 'recruit' },
      { dieRoll: 4, actionId: 'research', shape: 'circle' },
      { dieRoll: 5, actionId: 'construct-lab' },
    ];
    for (const t of turns) {
      s = takeActionTurn(s, t).state;
    }
    expect(s.chronobot.actionsThisEra).toBe(4);
    // Mine + recruit + research + construct each place an exosuit → 6-4 = 2 left.
    expect(s.chronobot.exosuitsAvailable).toBe(2);
    // Recruit granted +1 VP.
    expect(s.chronobot.vp).toBe(1);
    // Research gave a circle breakthrough.
    expect(s.chronobot.breakthroughs.circle).toBe(1);

    // Both pass.
    s = markPlayerPassed(s);
    s = markBotPassed(s);
    expect(actionRoundsCanEnd(s)).toBe(true);

    s = resolveCleanUp(s);
    expect(s.phase).toBe('cleanup');
    expect(s.chronobot.exosuitsAvailable).toBe(0);

    s = startNextEra(s);
    expect(s.era).toBe(2);
    expect(s.phase).toBe('paradox');
    expect(s.chronobot.passed).toBe(false);

    const score = scoreChronobot(s.chronobot);
    expect(score.total).toBe(s.chronobot.vp + 1); // 1 breakthrough, no set bonus
  });
});
