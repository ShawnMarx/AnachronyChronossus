import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, emptyChronobotState, type GameState } from '../state';
import {
  actionRoundsCanEnd,
  advanceActiveToken,
  advanceToken,
  botPassDecision,
  CHRONOBOT_PATHS,
  chooseBreakthroughDiscard,
  chooseMineResources,
  chooseRecruitWorker,
  chooseRemoveAnomalyDiscards,
  chronobotMinActions,
  COMMAND_TOKENS,
  DIFFICULTY_BOT_EXTRA_TURN,
  DIFFICULTY_MIN_ACTIONS_6,
  endParadoxPhase,
  initialCommandTokens,
  nextTokenIndex,
  resolveBotPass,
  resolvePowerUp,
  resolveWarp,
  rollParadox,
  scoreChronobot,
  setup,
  takeActionTurn,
  TOKEN_START,
  tokenAction,
  tokensAtPosition,
} from './chronobot';
import { rollParadoxDie } from '../index';

function gameWith(mut: (s: GameState) => void): GameState {
  const s = setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
  mut(s);
  return s;
}

describe('Mine priority', () => {
  it('prioritises resources it lacks', () => {
    const bot = emptyChronobotState();
    bot.resources.gold = 2; // has gold
    // wants the two it lacks by priority: uranium > titanium (gold excluded as owned)
    expect(chooseMineResources(bot)).toEqual(['uranium', 'titanium']);
  });

  it('breaks ties by Uranium > Gold > Titanium when it has none', () => {
    const bot = emptyChronobotState();
    expect(chooseMineResources(bot)).toEqual(['uranium', 'gold']);
  });
});

describe('Command tokens & Action paths', () => {
  it('starts each token on its rulebook step', () => {
    expect(tokenAction(TOKEN_START[3])).toBe('construct-support'); // Short-1 Water
    expect(tokenAction(TOKEN_START[2])).toBe('construct-factory'); // Long-4
    expect(tokenAction(TOKEN_START[4])).toBe('construct-powerplant'); // Long-2
    expect(tokenAction(TOKEN_START[5])).toBe('research'); // Long-8
  });

  it('has 4 tokens matching the AI die numbers', () => {
    expect(COMMAND_TOKENS).toEqual([2, 3, 4, 5]);
  });

  it('advances along a path and loops back to the start', () => {
    // Short path has 4 steps; from the last step it wraps to index 0.
    expect(nextTokenIndex('short', 3)).toBe(0);
    expect(nextTokenIndex('long', 7)).toBe(0);
    const last = { path: 'long' as const, index: 7 };
    expect(advanceToken(last)).toEqual({ path: 'long', index: 0 });
  });

  it('token 3 walks the full Short loop of Actions', () => {
    let pos = TOKEN_START[3];
    const seen = CHRONOBOT_PATHS.short.map(() => {
      const a = tokenAction(pos);
      pos = advanceToken(pos);
      return a;
    });
    expect(seen).toEqual([
      'construct-support',
      'time-travel',
      'construct-superproject',
      'remove-anomaly',
    ]);
    // Back to the start after a full loop.
    expect(pos).toEqual(TOKEN_START[3]);
  });

  it('initialCommandTokens returns independent copies', () => {
    const a = initialCommandTokens();
    a.positions[2].index = 99;
    const b = initialCommandTokens();
    expect(b.positions[2]).toEqual(TOKEN_START[2]);
  });
});

describe('Command-token stacking rule (max 2 per position)', () => {
  it('advances the active token onto an empty destination', () => {
    const s = initialCommandTokens();
    // Token 4 starts at Long-2 (index 1) → advances to Long-3 (index 2), empty.
    const r = advanceActiveToken(s, 4);
    expect(r.positions[4]).toEqual({ path: 'long', index: 2 });
    expect(tokensAtPosition(r, 'long', 2)).toEqual([4]);
  });

  it('bumps the top token forward when the destination already holds two', () => {
    // Tokens 4 and 5 share Long index 2 (5 is on top); token 2 sits at index 1.
    const s = {
      positions: {
        2: { path: 'long' as const, index: 1 },
        3: { path: 'short' as const, index: 0 },
        4: { path: 'long' as const, index: 2 },
        5: { path: 'long' as const, index: 2 },
      },
      order: [3, 2, 4, 5] as (2 | 3 | 4 | 5)[],
    };
    const r = advanceActiveToken(s, 2);
    // Destination (index 2) had 2 tokens → top (5) bumped to index 3 first...
    expect(r.positions[5]).toEqual({ path: 'long', index: 3 });
    expect(r.positions[4]).toEqual({ path: 'long', index: 2 }); // bottom stays
    // ...then the active token 2 lands on index 2, on top of the remaining 4.
    expect(r.positions[2]).toEqual({ path: 'long', index: 2 });
    expect(tokensAtPosition(r, 'long', 2)).toEqual([4, 2]);
    // No position ever holds more than two tokens.
    for (let i = 0; i < CHRONOBOT_PATHS.long.length; i++) {
      expect(tokensAtPosition(r, 'long', i).length).toBeLessThanOrEqual(2);
    }
  });

  it('loops the bump across the end of the path', () => {
    // Two tokens on the last Long step (index 7); active token advances into them.
    const s = {
      positions: {
        2: { path: 'long' as const, index: 6 },
        3: { path: 'short' as const, index: 0 },
        4: { path: 'long' as const, index: 7 },
        5: { path: 'long' as const, index: 7 },
      },
      order: [3, 2, 4, 5] as (2 | 3 | 4 | 5)[],
    };
    const r = advanceActiveToken(s, 2);
    expect(r.positions[5]).toEqual({ path: 'long', index: 0 }); // top bumped, wraps
    expect(r.positions[2]).toEqual({ path: 'long', index: 7 });
    expect(tokensAtPosition(r, 'long', 7)).toEqual([4, 2]);
  });
});

describe('Constructed tile VP tracking', () => {
  function actionsReady(): GameState {
    const s = setup({ ...DEFAULT_CONFIG, bot: 'chronobot' });
    return { ...s, chronobot: { ...s.chronobot, exosuitsAvailable: 6 } };
  }

  it('records each constructed building VP under its type', () => {
    const r1 = takeActionTurn(actionsReady(), {
      dieRoll: 4,
      actionId: 'construct-factory',
      buildingVP: 3,
    });
    const r2 = takeActionTurn(r1.state, {
      dieRoll: 4,
      actionId: 'construct-factory',
      buildingVP: 5,
    });
    expect(r2.state.chronobot.buildingVps.factory).toEqual([3, 5]);
    expect(r2.state.chronobot.buildingVps.lab).toEqual([]);
    // Aggregate still tracks the total.
    expect(r2.state.chronobot.buildingVp).toBe(8);
  });

  it('records constructed Superproject VPs and does not mutate prior state', () => {
    const s = actionsReady();
    s.chronobot = { ...s.chronobot, breakthroughs: { circle: 1, triangle: 0, square: 0 } };
    const r = takeActionTurn(s, {
      dieRoll: 2,
      actionId: 'construct-superproject',
      buildingVP: 7,
    });
    expect(r.state.chronobot.superprojectVps).toEqual([7]);
    // The original state's list is untouched (no shared array reference).
    expect(s.chronobot.superprojectVps).toEqual([]);
  });
});

describe('Recruit priority', () => {
  it('targets the highest-priority worker it lacks', () => {
    const bot = emptyChronobotState();
    bot.workers.genius = 1;
    expect(chooseRecruitWorker(bot)).toBe('administrator');
  });
  it('returns null when it has all four', () => {
    const bot = emptyChronobotState();
    bot.workers = { genius: 1, administrator: 1, engineer: 1, scientist: 1 };
    expect(chooseRecruitWorker(bot)).toBeNull();
  });
});

describe('Remove Anomaly discards', () => {
  it('spends the resources it has most of, tie to Titanium first', () => {
    const bot = emptyChronobotState();
    bot.resources = { water: 0, gold: 2, titanium: 2, uranium: 0, neutronium: 0 };
    // Step-wise "most of": tie gold(2)/titanium(2) -> titanium (priority); then
    // gold(2) > titanium(1) -> gold.
    expect(chooseRemoveAnomalyDiscards(bot)).toEqual(['titanium', 'gold']);

    const single = emptyChronobotState();
    single.resources = { water: 0, gold: 0, titanium: 3, uranium: 0, neutronium: 0 };
    // only titanium available -> two titanium
    expect(chooseRemoveAnomalyDiscards(single)).toEqual(['titanium', 'titanium']);
  });
  it('treats one Neutronium as two cubes', () => {
    const bot = emptyChronobotState();
    bot.resources.neutronium = 1;
    expect(chooseRemoveAnomalyDiscards(bot)).toEqual(['neutronium']);
  });
  it('returns null when it cannot spend two cube-value', () => {
    const bot = emptyChronobotState();
    bot.resources.gold = 1;
    expect(chooseRemoveAnomalyDiscards(bot)).toBeNull();
  });
});

describe('Breakthrough discard', () => {
  it('discards the shape it has most of', () => {
    const bot = emptyChronobotState();
    bot.breakthroughs = { circle: 1, triangle: 3, square: 2 };
    expect(chooseBreakthroughDiscard(bot)).toBe('triangle');
  });
});

describe('Power Up', () => {
  it('powers up 6 in Eras 1–4 and 4 in Eras 5–7', () => {
    const early = resolvePowerUp(gameWith((s) => (s.phase = 'powerup')));
    expect(early.chronobot.exosuitsAvailable).toBe(6);
    const late = resolvePowerUp(
      gameWith((s) => {
        s.phase = 'powerup';
        s.era = 5;
      }),
    );
    expect(late.chronobot.exosuitsAvailable).toBe(4);
  });
});

describe('Warp', () => {
  it('adds warp tiles equal to the paradox roll', () => {
    const s = resolveWarp(gameWith((g) => (g.phase = 'warp')), 3);
    expect(s.chronobot.warpTilesOnTimeline).toBe(3);
    expect(s.phase).toBe('actions');
  });
});


describe('Action turns', () => {
  it('Reboot does nothing and costs no exosuit', () => {
    const base = resolvePowerUp(gameWith((g) => (g.phase = 'powerup')));
    const { state } = takeActionTurn(base, { dieRoll: 1, actionId: 'reboot' });
    expect(state.chronobot.exosuitsAvailable).toBe(6);
    expect(state.chronobot.actionsThisEra).toBe(1);
    expect(state.chronobot.vp).toBe(0);
  });

  it('Recruit places an exosuit and grants +1 VP', () => {
    const base = resolvePowerUp(gameWith((g) => (g.phase = 'powerup')));
    const { state } = takeActionTurn(base, { dieRoll: 3, actionId: 'recruit' });
    expect(state.chronobot.exosuitsAvailable).toBe(5);
    expect(state.chronobot.vp).toBe(1);
    expect(state.chronobot.workers.genius).toBe(1);
  });

  it('Time Travel fails (no exosuit) when no warp tiles remain', () => {
    const base = resolvePowerUp(gameWith((g) => (g.phase = 'powerup')));
    const { state } = takeActionTurn(base, { dieRoll: 4, actionId: 'time-travel' });
    expect(state.chronobot.vp).toBe(1);
    expect(state.chronobot.exosuitsAvailable).toBe(6); // no exosuit placed
  });

  it('Construct fails (still places exosuit) at 3 of a type', () => {
    const base = resolvePowerUp(
      gameWith((g) => {
        g.phase = 'powerup';
        g.chronobot.buildings.lab = 3;
      }),
    );
    const { state } = takeActionTurn(base, { dieRoll: 2, actionId: 'construct-lab' });
    expect(state.chronobot.vp).toBe(1);
    expect(state.chronobot.exosuitsAvailable).toBe(5);
    expect(state.chronobot.buildings.lab).toBe(3);
  });
});

describe('Pass logic', () => {
  it('bot keeps going while it has exosuits', () => {
    const s = resolvePowerUp(gameWith((g) => (g.phase = 'powerup')));
    expect(botPassDecision(s)).toBe('continue');
  });
  it('bot must continue to reach 3 actions when out of exosuits', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.chronobot.exosuitsAvailable = 0;
      g.chronobot.actionsThisEra = 1;
    });
    expect(botPassDecision(s)).toBe('must-continue-min3');
  });
  it('action rounds can end only when both passed and >=3 actions', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.playerPassed = true;
      g.chronobot.passed = true;
      g.chronobot.actionsThisEra = 3;
    });
    expect(actionRoundsCanEnd(s)).toBe(true);
  });

  it('ends immediately when you pass first and the bot has met its minimum, even with Exosuits left', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.playerPassed = true;
      g.chronobot.exosuitsAvailable = 4; // still has Exosuits
      g.chronobot.actionsThisEra = 3;
    });
    expect(botPassDecision(s)).toBe('pass');
  });

  it('a player pass preempts the out-of-Exosuits final Time Travel once the minimum is met', () => {
    // Rule 2's "ends immediately" wins over rule 1's owed Time Travel.
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.playerPassed = true;
      g.chronobot.exosuitsAvailable = 0; // out of Exosuits → would normally Time Travel
      g.chronobot.actionsThisEra = 4;
    });
    expect(botPassDecision(s)).toBe('pass');
  });

  it('still owes a final Time Travel when out of Exosuits and you have NOT passed', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.playerPassed = false;
      g.chronobot.exosuitsAvailable = 0;
      g.chronobot.actionsThisEra = 5;
    });
    expect(botPassDecision(s)).toBe('time-travel-then-pass');
  });

  it('keeps taking turns to reach the minimum even after you pass', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.playerPassed = true;
      g.chronobot.exosuitsAvailable = 2;
      g.chronobot.actionsThisEra = 1; // below the minimum
    });
    expect(botPassDecision(s)).toBe('continue');
  });

  it('honours the "minimum 6 Actions" difficulty flag', () => {
    const s = setup({ ...DEFAULT_CONFIG, bot: 'chronobot', difficulty: [DIFFICULTY_MIN_ACTIONS_6] });
    s.phase = 'actions';
    s.playerPassed = true;
    s.chronobot.exosuitsAvailable = 3;
    s.chronobot.actionsThisEra = 3; // meets the base 3 but not 6
    expect(chronobotMinActions(s)).toBe(6);
    expect(botPassDecision(s)).toBe('continue');
    s.chronobot.actionsThisEra = 6;
    expect(botPassDecision(s)).toBe('pass');
  });
});

describe('resolveBotPass', () => {
  it('takes a final Time Travel then passes when out of Exosuits (has Warp tiles)', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.chronobot.exosuitsAvailable = 0;
      g.chronobot.actionsThisEra = 4;
      g.chronobot.warpTilesOnTimeline = 2;
    });
    const { state } = resolveBotPass(s);
    expect(state.chronobot.passed).toBe(true);
    expect(state.chronobot.warpTilesOnTimeline).toBe(1); // removed one
    expect(state.chronobot.timeTravelTrack).toBe(1); // advanced
    expect(state.chronobot.actionsThisEra).toBe(5); // the Time Travel counted as a turn
  });

  it('marks passed without a turn on a plain pass', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.playerPassed = true;
      g.chronobot.exosuitsAvailable = 3;
      g.chronobot.actionsThisEra = 3;
    });
    const { state } = resolveBotPass(s);
    expect(state.chronobot.passed).toBe(true);
    expect(state.chronobot.actionsThisEra).toBe(3); // no extra turn taken
  });

  it('leaves state unchanged (not passed) while it must keep going', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.chronobot.exosuitsAvailable = 2;
      g.chronobot.actionsThisEra = 1;
    });
    const { state } = resolveBotPass(s);
    expect(state.chronobot.passed).toBe(false);
    expect(state.currentInstructions.length).toBeGreaterThan(0);
  });
});

describe('Scoring', () => {
  it('scores 1 VP per breakthrough plus 2 per complete shape set', () => {
    const bot = emptyChronobotState();
    bot.vp = 10;
    bot.breakthroughs = { circle: 2, triangle: 2, square: 1 };
    // 5 breakthroughs = 5, complete sets = min(2,2,1)=1 -> +2
    const score = scoreChronobot(bot);
    expect(score.breakthroughVP).toBe(5);
    expect(score.shapeSetBonus).toBe(2);
    expect(score.total).toBe(17);
  });

  it('subtracts 3 VP per remaining Anomaly', () => {
    const bot = emptyChronobotState();
    bot.vp = 12;
    bot.anomalies = 2;
    const score = scoreChronobot(bot);
    expect(score.anomalyVP).toBe(-6);
    expect(score.total).toBe(6);
  });

  it('includes Time Travel track VP in the total', () => {
    const bot = emptyChronobotState();
    bot.vp = 5;
    bot.timeTravelTrack = 2; // TIME_TRAVEL_VP[2] = 4
    const score = scoreChronobot(bot);
    expect(score.timeTravelVP).toBe(4);
    expect(score.total).toBe(9);
  });

  it('splits during-game VP into token vs building', () => {
    const bot = emptyChronobotState();
    bot.vp = 8;
    bot.buildingVp = 3;
    const score = scoreChronobot(bot);
    expect(score.tokenVP).toBe(5);
    expect(score.buildingVP).toBe(3);
    expect(score.duringGameVP).toBe(8);
    expect(score.total).toBe(8); // no breakthroughs/time-travel/anomalies
  });

  it('sums every avenue into the total', () => {
    const bot = emptyChronobotState();
    bot.vp = 10; // token
    bot.buildingVp = 4; // subset of vp
    bot.timeTravelTrack = 3; // 6 VP
    bot.breakthroughs = { circle: 1, triangle: 1, square: 1 }; // 3 + 1 set (+2)
    bot.anomalies = 1; // -3
    const s = scoreChronobot(bot);
    // 10 + 6 + 3 + 2 - 3 = 18
    expect(s.total).toBe(18);
    expect(s.tokenVP + s.buildingVP).toBe(s.duringGameVP);
    expect(
      s.duringGameVP + s.timeTravelVP + s.breakthroughVP + s.shapeSetBonus + s.anomalyVP,
    ).toBe(s.total);
  });
});

describe('Paradox die', () => {
  it('yields only 0, 1, or 2, with 1 most common (faces 0,1,1,1,1,2)', () => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    for (let i = 0; i < 6000; i++) counts[rollParadoxDie()] += 1;
    expect(Object.keys(counts).map(Number).sort()).toEqual([0, 1, 2]);
    // 1 (4/6) should clearly beat 0 and 2 (1/6 each).
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(counts[1]).toBeGreaterThan(counts[2]);
  });
});

describe('Paradox phase (rollParadox tracker)', () => {
  it('accumulates on the tracker without an anomaly below 3', () => {
    const s = gameWith((g) => {
      g.phase = 'paradox';
      g.chronobot.paradoxes = 1;
    });
    const r = rollParadox(s, 1);
    expect(r.paradoxes).toBe(2);
    expect(r.gainedAnomaly).toBe(false);
    expect(r.stop).toBe(false);
  });

  it('gains an anomaly, resets the tracker, and removes a warp tile at 3', () => {
    const s = gameWith((g) => {
      g.phase = 'paradox';
      g.chronobot.paradoxes = 2;
      g.chronobot.warpTilesOnTimeline = 2;
    });
    const r = rollParadox(s, 1); // 2 + 1 = 3
    expect(r.gainedAnomaly).toBe(true);
    expect(r.stop).toBe(true);
    expect(r.state.chronobot.anomalies).toBe(1);
    expect(r.state.chronobot.paradoxes).toBe(0);
    expect(r.state.chronobot.warpTilesOnTimeline).toBe(1);
  });

  it('carries the overflow when a double roll overshoots 3', () => {
    const s = gameWith((g) => {
      g.phase = 'paradox';
      g.chronobot.paradoxes = 2;
    });
    const r = rollParadox(s, 2); // 2 + 2 = 4 → anomaly, tracker resets to 1
    expect(r.gainedAnomaly).toBe(true);
    expect(r.state.chronobot.paradoxes).toBe(1);
  });

  it('gains no anomaly and removes no warp when already at 3 anomalies', () => {
    const s = gameWith((g) => {
      g.phase = 'paradox';
      g.chronobot.paradoxes = 2;
      g.chronobot.anomalies = 3;
      g.chronobot.warpTilesOnTimeline = 2;
    });
    const r = rollParadox(s, 1);
    expect(r.stop).toBe(true);
    expect(r.state.chronobot.anomalies).toBe(3);
    expect(r.state.chronobot.warpTilesOnTimeline).toBe(2);
  });

  it('endParadoxPhase advances to Power Up', () => {
    const s = gameWith((g) => (g.phase = 'paradox'));
    expect(endParadoxPhase(s).phase).toBe('powerup');
  });
});

describe('Difficulty: reboot-advance', () => {
  it('skips off Reboot so the token lands on a real Action', () => {
    // Token 2 at Long-4 (index 3). Advancing normally: 4→Reboot(index 4).
    let tokens = initialCommandTokens();
    tokens = { positions: { ...tokens.positions, 2: { path: 'long', index: 3 } }, order: [2, 3, 4, 5] };
    const normal = advanceActiveToken(tokens, 2);
    expect(tokenAction(normal.positions[2])).toBe('reboot');
    const skipped = advanceActiveToken(tokens, 2, true);
    expect(tokenAction(skipped.positions[2])).not.toBe('reboot');
  });
});

describe('Difficulty: bot takes one extra turn after you pass', () => {
  const hardConfig = { ...DEFAULT_CONFIG, bot: 'chronobot' as const, difficulty: [DIFFICULTY_BOT_EXTRA_TURN] };

  it('grants one additional turn, then passes', () => {
    const s = gameWith((g) => {
      g.config = hardConfig;
      g.phase = 'actions';
      g.playerPassed = true;
      g.chronobot.exosuitsAvailable = 3;
      g.chronobot.actionsThisEra = 3; // at minimum
    });
    expect(botPassDecision(s)).toBe('continue-extra');
    const { state: after } = resolveBotPass(s);
    expect(after.extraTurnAfterPassUsed).toBe(true);
    // With the extra spent, it now passes.
    expect(botPassDecision(after)).toBe('pass');
  });

  it('does not grant an extra turn without the difficulty', () => {
    const s = gameWith((g) => {
      g.phase = 'actions';
      g.playerPassed = true;
      g.chronobot.exosuitsAvailable = 3;
      g.chronobot.actionsThisEra = 3;
    });
    expect(botPassDecision(s)).toBe('pass');
  });
});
