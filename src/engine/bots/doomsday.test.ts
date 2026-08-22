import { describe, it, expect } from 'vitest';
import type { ChronossusState, Instruction } from '../state';
import type { GameState } from '../state';
import { Chronossus, createInitialState, emptyChronossusState, DEFAULT_CONFIG } from '../index';
import {
  botTrackerFor,
  botVpAt,
  DOOMSDAY_BOTTOM_SLOT,
  DOOMSDAY_START_SLOT,
  DOOMSDAY_TOP_SLOT,
  DOOMSDAY_TRACK,
  isDoomsdayMode,
  isFinalSlot,
  nextSlot,
  answerCheckForImpact,
  botTrackerLocked,
  needsImpactCheck,
  resolveDoomsdayAction,
  tracksLocked,
  type DoomsdayTracker,
  type ExperimentInput,
  type PlayerPath,
} from './doomsday';

describe('Doomsday — the track', () => {
  it('is one continuous 10-slot ladder, numbered top to bottom', () => {
    expect(DOOMSDAY_TRACK.map((s) => s.slot)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(DOOMSDAY_TOP_SLOT).toBe(1);
    expect(DOOMSDAY_BOTTOM_SLOT).toBe(10);
    expect(DOOMSDAY_START_SLOT).toBe(6);
  });

  it('matches the printed VP columns', () => {
    const printed = DOOMSDAY_TRACK.map((s) => [s.left, s.right]);
    expect(printed).toEqual([
      [0, 3],
      [2, 2],
      [1, 0],
      [1, 0],
      [1, 0],
      [0, 0],
      [1, 0],
      [1, 0],
      [2, 2],
      [0, 2],
    ]);
  });

  it('pays the bot BOTH columns combined, unlike a human who takes only their own side', () => {
    for (const slot of DOOMSDAY_TRACK) {
      expect(slot.botVp).toBe(slot.left + slot.right);
    }
    // The two slots that print a value on each side are the ones this actually changes.
    expect(botVpAt(2)).toBe(4);
    expect(botVpAt(9)).toBe(4);
    // The final slots print on one side only, so combining is a no-op there.
    expect(botVpAt(1)).toBe(3);
    expect(botVpAt(10)).toBe(2);
    // The start slot pays nothing (nobody lands on it by moving).
    expect(botVpAt(DOOMSDAY_START_SLOT)).toBe(0);
  });
});

describe('Doomsday — the bot takes the opposing tracker', () => {
  const cases: [PlayerPath, DoomsdayTracker][] = [
    ['harmony', 'seal-fate'],
    ['dominance', 'seal-fate'],
    ['salvation', 'save-earth'],
    ['progress', 'save-earth'],
  ];
  it.each(cases)('player on %s -> bot moves %s', (path, tracker) => {
    expect(botTrackerFor(path)).toBe(tracker);
  });
});

describe('Doomsday — tracker movement', () => {
  it('moves Save Earth up the ladder and Seal Fate down it', () => {
    expect(nextSlot('save-earth', DOOMSDAY_START_SLOT)).toBe(5);
    expect(nextSlot('seal-fate', DOOMSDAY_START_SLOT)).toBe(7);
  });

  it('clamps at each trackers own end of the ladder', () => {
    expect(nextSlot('save-earth', DOOMSDAY_TOP_SLOT)).toBe(DOOMSDAY_TOP_SLOT);
    expect(nextSlot('seal-fate', DOOMSDAY_BOTTOM_SLOT)).toBe(DOOMSDAY_BOTTOM_SLOT);
  });

  it('only calls a slot final for the tracker that ends there', () => {
    expect(isFinalSlot('save-earth', 1)).toBe(true);
    expect(isFinalSlot('save-earth', 10)).toBe(false);
    expect(isFinalSlot('seal-fate', 10)).toBe(true);
    expect(isFinalSlot('seal-fate', 1)).toBe(false);
  });
});

describe('Doomsday — the tracks lock', () => {
  const open = {
    impactOccurred: false,
    botTracker: 'seal-fate' as DoomsdayTracker,
    botSlot: DOOMSDAY_START_SLOT,
    playerTrackerFinal: false,
  };

  it('stays open mid-track before the Impact', () => {
    expect(tracksLocked(open)).toBe(false);
  });

  it('locks once the Impact has occurred', () => {
    expect(tracksLocked({ ...open, impactOccurred: true })).toBe(true);
  });

  it('locks when the bot reaches its own final slot', () => {
    expect(tracksLocked({ ...open, botSlot: DOOMSDAY_BOTTOM_SLOT })).toBe(true);
    // ...but the other end of the ladder is not the bot's end.
    expect(tracksLocked({ ...open, botSlot: DOOMSDAY_TOP_SLOT })).toBe(false);
  });

  it('locks when the player reports their own tracker is final', () => {
    expect(tracksLocked({ ...open, playerTrackerFinal: true })).toBe(true);
  });
});

describe('Doomsday — mode matching', () => {
  it('matches only the doomsday mode (it combines with nothing)', () => {
    expect(isDoomsdayMode('doomsday')).toBe(true);
    expect(isDoomsdayMode('base')).toBe(false);
    expect(isDoomsdayMode(undefined)).toBe(false);
  });
});

// --- the Experiment Action ---------------------------------------------------------------

function bot(over: Partial<ChronossusState> = {}): ChronossusState {
  return {
    exosuitsTotal: 6,
    exosuitsAvailable: 6,
    vp: 0,
    buildingVp: 0,
    resources: { titanium: 0, uranium: 0, gold: 0, neutronium: 0, water: 0 },
    workers: { scientist: 0, engineer: 0, administrator: 0, genius: 0 },
    breakthroughs: { circle: 0, triangle: 0, square: 0 },
    buildings: { factory: 0, lab: 0, powerplant: 0, support: 0 },
    buildingVps: { factory: [], lab: [], powerplant: [], support: [] },
    superprojects: 0,
    superprojectVps: [],
    paradoxes: 0,
    anomalies: 0,
    warpTilesOnTimeline: 0,
    warpTilesTotal: 8,
    timeTravelTrack: 0,
    actionsThisEra: 0,
    totalActions: 0,
    passed: false,
    energyPool: { energized: 0, exhausted: 0 },
    hypersyncTiles: [],
    doomsday: {
      botTracker: 'seal-fate',
      botSlot: DOOMSDAY_START_SLOT,
      experimentsCompleted: 0,
      experimentVp: 0,
      experimentActionRun: false,
      impactEra: null,
      playerTrackerFinal: false,
      checkedEra: null,
      earthSaved: false,
    },
    ...over,
  };
}

/** Run an Experiment, returning the mutated bot alongside the result. */
function run(b: ChronossusState, level: 1 | 2, input: ExperimentInput, failVp = 1) {
  const instr: Instruction[] = [];
  const res = resolveDoomsdayAction(b, instr, 1, level, input, failVp);
  return { res, instr, text: instr.map((i) => i.text).join('\n') };
}

describe('Experiment — Step 1 (execute)', () => {
  it('takes the Experiment, scores its printed VP, and moves the tracker', () => {
    const b = bot();
    const { res } = run(b, 1, { markedAvailable: true, experimentVp: 2, canPrepare: true });
    expect(res.executed).toBe(true);
    expect(res.experimentVp).toBe(2);
    expect(res.trackerMoved).toBe(true);
    expect(res.fromSlot).toBe(6);
    expect(res.toSlot).toBe(7); // Seal Fate travels DOWN the ladder
    expect(res.trackVp).toBe(1);
    expect(b.doomsday!.botSlot).toBe(7);
    expect(b.doomsday!.experimentsCompleted).toBe(1);
    // Card VP + track VP both land on the bot.
    expect(b.vp).toBe(3);
  });

  it('takes BOTH Path columns on a slot that prints a value for each', () => {
    // One step above slot 9, which prints 2 for Progress and 2 for Salvation.
    const b = bot({
      doomsday: { ...bot().doomsday!, botSlot: 8 },
    });
    const { res } = run(b, 2, { markedAvailable: true, experimentVp: 3, canPrepare: true });
    expect(res.toSlot).toBe(9);
    expect(res.trackVp).toBe(4);
    expect(b.vp).toBe(7); // 3 from the card + 4 from the track
  });

  it('skips the step, scoring nothing, when no Experiment carries its marker', () => {
    const b = bot();
    const { res, text } = run(b, 1, { markedAvailable: false, canPrepare: true });
    expect(res.executed).toBe(false);
    expect(res.trackerMoved).toBe(false);
    expect(b.vp).toBe(0);
    expect(b.doomsday!.botSlot).toBe(DOOMSDAY_START_SLOT);
    expect(b.doomsday!.experimentsCompleted).toBe(0);
    expect(text).toMatch(/skip this step/);
  });
});

describe('Experiment — the tracks lock', () => {
  const lockedCases: [string, Partial<NonNullable<ChronossusState['doomsday']>>][] = [
    ['the Impact has occurred', { impactEra: 5 }],
    ["the player's tracker is final", { playerTrackerFinal: true }],
    ['its own tracker is final', { botSlot: 10 }],
  ];

  it.each(lockedCases)('still scores the card but moves nothing when %s', (_why, over) => {
    const b = bot({ doomsday: { ...bot().doomsday!, ...over } });
    const before = b.doomsday!.botSlot;
    const { res, text } = run(b, 1, { markedAvailable: true, experimentVp: 2, canPrepare: true });
    expect(res.executed).toBe(true);
    expect(res.locked).toBe(true);
    expect(res.trackerMoved).toBe(false);
    expect(b.doomsday!.botSlot).toBe(before);
    expect(b.vp).toBe(2); // the card only — no track VP
    expect(text).toMatch(/tracks are locked/);
  });
});

describe('Experiment — the two hard stops', () => {
  it('ends the game when its Save Earth marker reaches the topmost slot', () => {
    const b = bot({
      doomsday: { ...bot().doomsday!, botTracker: 'save-earth', botSlot: 2 },
    });
    const { res, text } = run(b, 1, { markedAvailable: true, experimentVp: 2, canPrepare: true });
    expect(res.toSlot).toBe(1);
    expect(res.endsGame).toBe(true);
    expect(res.impactNow).toBe(false);
    expect(text).toMatch(/completely mitigated and the game is over/);
  });

  it('resolves the Impact at once when its Seal Fate marker reaches the bottom', () => {
    const b = bot({ doomsday: { ...bot().doomsday!, botSlot: 9 } });
    const { res, text } = run(b, 2, { markedAvailable: true, experimentVp: 3, canPrepare: true });
    expect(res.toSlot).toBe(10);
    expect(res.impactNow).toBe(true);
    expect(res.endsGame).toBe(false);
    expect(text).toMatch(/resolve the Impact immediately/);
  });

  it('fires neither mid-ladder', () => {
    const { res } = run(bot(), 1, { markedAvailable: true, experimentVp: 2, canPrepare: true });
    expect(res.endsGame).toBe(false);
    expect(res.impactNow).toBe(false);
  });
});

describe('Experiment — Step 2 (prepare), and the steps failing independently', () => {
  it('instructs the Path-marker placement with its priority rule', () => {
    const { res, text } = run(bot(), 1, {
      markedAvailable: true,
      experimentVp: 2,
      canPrepare: true,
    });
    expect(res.prepared).toBe(true);
    expect(text).toMatch(/Level 1 before a Level 2/);
    expect(text).toMatch(/furthest in the past/);
  });

  it('still runs Step 2 when Step 1 failed', () => {
    const { res } = run(bot(), 1, { markedAvailable: false, canPrepare: true });
    expect(res.executed).toBe(false);
    expect(res.prepared).toBe(true);
  });

  it('still runs Step 1 when Step 2 fails', () => {
    const b = bot();
    const { res, text } = run(b, 1, {
      markedAvailable: true,
      experimentVp: 2,
      canPrepare: false,
    });
    expect(res.executed).toBe(true);
    expect(res.prepared).toBe(false);
    expect(b.vp).toBe(3);
    expect(text).toMatch(/already carries a Path marker/);
  });

  it('counts as a Failed Action when BOTH steps fail, paying VP instead', () => {
    // The Exosuit was placed and the Action produced nothing: "an Action [that] can be
    // taken but cannot be performed" pays VP in place of its normal effect
    // (Solo Opponents p.10).
    const b = bot();
    const { res, text } = run(b, 2, { markedAvailable: false, canPrepare: false });
    expect(res.executed).toBe(false);
    expect(res.prepared).toBe(false);
    expect(res.failedAction).toBe(true);
    expect(res.failedActionVp).toBe(1);
    expect(b.vp).toBe(1);
    expect(text).toMatch(/Failed Action/);
    expect(b.doomsday!.experimentActionRun).toBe(true);
  });

  it('pays 2 VP for that Failed Action with the difficulty option', () => {
    const b = bot();
    const { res } = run(b, 2, { markedAvailable: false, canPrepare: false }, 2);
    expect(res.failedActionVp).toBe(2);
    expect(b.vp).toBe(2);
  });

  it('is NOT a Failed Action when either step succeeds', () => {
    // Step 2 alone still marks an Experiment for a later turn, so the Action did something.
    const onlyPrepare = bot();
    const a = run(onlyPrepare, 2, { markedAvailable: false, canPrepare: true });
    expect(a.res.failedAction).toBe(false);
    expect(onlyPrepare.vp).toBe(0);

    // Step 1 alone scored the card's VP, so it is plainly not failed either.
    const onlyExecute = bot();
    const c = run(onlyExecute, 2, {
      markedAvailable: true,
      experimentVp: 2,
      canPrepare: false,
    });
    expect(c.res.failedAction).toBe(false);
  });
});

// --- the whole turn, through the real engine ---------------------------------------------

const doomsdayState = (over: Partial<NonNullable<ChronossusState['doomsday']>> = {}): GameState => {
  const st = createInitialState({ ...DEFAULT_CONFIG, chronossusMode: 'doomsday' });
  st.phase = 'actions';
  st.chronossus = {
    ...emptyChronossusState(),
    exosuitsAvailable: 3,
    doomsday: {
      botTracker: 'seal-fate',
      botSlot: DOOMSDAY_START_SLOT,
      experimentsCompleted: 0,
      experimentVp: 0,
      experimentActionRun: false,
      impactEra: null,
      playerTrackerFinal: false,
      checkedEra: null,
      earthSaved: false,
      ...over,
    },
  };
  return st;
};

describe('Experiment — resolved through takeActionTurn', () => {
  const input = {
    actionId: 'tile-experiment-1' as const,
    experiment: { markedAvailable: true, experimentVp: 2, canPrepare: true },
  };

  it('never writes through to the caller’s pre-turn state', () => {
    // The Pioneers bug: the module slice was only shallow-copied, so the resolver mutated
    // the pre-turn object too. History diffs pre against post, so every one of that
    // module's lines silently vanished — with no error and no failing unit test.
    const state = doomsdayState();
    const pre = state.chronossus!;
    const preSlice = { ...pre.doomsday! };
    const { state: next } = Chronossus.resolveAction(state, input);

    expect(pre.doomsday).toEqual(preSlice);
    expect(pre.doomsday).not.toBe(next.chronossus!.doomsday);
    // ...and the post-turn state really did move, so the comparison above means something.
    expect(next.chronossus!.doomsday!.botSlot).toBe(7);
    expect(next.chronossus!.doomsday!.experimentsCompleted).toBe(1);
  });

  it('places a figure on the hex pool — no Energy Core, which is a Fractures-only marker', () => {
    const state = doomsdayState();
    const { state: next, instructions } = Chronossus.resolveAction(state, input);
    expect(next.chronossus!.exosuitsAvailable).toBe(2);
    const text = instructions.map((i) => i.text).join('\n');
    expect(text).toMatch(/Experiment hex pool space\./);
    expect(text).not.toMatch(/Energy Core/);
    // Nothing is recorded as Blink-able: Doomsday never coexists with Fractures.
    expect(next.chronossus!.placedExosuits).toBeUndefined();
  });

  it('scores the B side’s printed bonus on top of the Action', () => {
    // C08B: "gains 1 VP and 1 Energy Core" on top of the Level 2 Experiment itself.
    const state = createInitialState({
      ...DEFAULT_CONFIG,
      chronossusMode: 'doomsday',
      tileSides: { C08: 'B' },
    });
    state.phase = 'actions';
    state.chronossus = { ...doomsdayState().chronossus! };
    const energizedBefore = state.chronossus.energyPool.energized;
    const { state: next } = Chronossus.resolveAction(state, {
      actionId: 'tile-experiment-2',
      tileSide: 'B',
      experiment: { markedAvailable: true, experimentVp: 3, canPrepare: true },
    });
    // 1 VP (tile) + 3 VP (card) + 1 VP (slot 7 of the track).
    expect(next.chronossus!.vp).toBe(5);
    expect(next.chronossus!.energyPool.energized).toBe(energizedBefore + 1);
  });

  it('passes instead of acting when no figure is left', () => {
    const state = doomsdayState();
    state.chronossus!.exosuitsAvailable = 0;
    expect(Chronossus.passesInsteadOfAction(state.chronossus!, 'tile-experiment-1')).toBe(true);
  });
});

// --- the Impact Era is an answer, not a calculation ---------------------------------------

describe('postImpactEraFor — Doomsday', () => {
  const cfg = { chronossusMode: 'doomsday' };
  const slice = (impactEra: number | null) => ({
    doomsday: { ...bot().doomsday!, impactEra },
  });

  it('starts an Era later than the base game, before any answer', () => {
    // The Impact tile starts between the 5th and 6th Timeline tile (Classic p.3), so the
    // Impact would resolve in Era 5's Clean Up and Era 6 is the first post-Impact Era.
    expect(Chronossus.postImpactEraFor(cfg, slice(null))).toBe(6);
    expect(Chronossus.isPostImpact(5, cfg, slice(null))).toBe(false);
    expect(Chronossus.isPostImpact(6, cfg, slice(null))).toBe(true);
  });

  it('follows the player’s answer once the Impact has been reported', () => {
    // The Trajectory dice moved the Impact tile earlier: reported in Era 3's Clean Up.
    expect(Chronossus.postImpactEraFor(cfg, slice(3))).toBe(4);
    expect(Chronossus.isPostImpact(3, cfg, slice(3))).toBe(false);
    expect(Chronossus.isPostImpact(4, cfg, slice(3))).toBe(true);
    // ...or later.
    expect(Chronossus.postImpactEraFor(cfg, slice(6))).toBe(7);
    expect(Chronossus.isPostImpact(6, cfg, slice(6))).toBe(false);
  });

  it('falls back to the default when no bot is passed', () => {
    expect(Chronossus.postImpactEraFor(cfg)).toBe(6);
  });

  it('leaves the other modes exactly as they were', () => {
    expect(Chronossus.postImpactEraFor({ chronossusMode: 'base' })).toBe(5);
    expect(Chronossus.postImpactEraFor({ chronossusMode: 'fractures' })).toBe(4);
    // ...and a Doomsday slice cannot leak into them, since no other mode has one.
    expect(Chronossus.postImpactEraFor({ chronossusMode: 'base' }, slice(3))).toBe(5);
  });

  it('still ends at Era 7 — only the Impact moves, not the game length', () => {
    expect(Chronossus.maxEraFor(cfg)).toBe(7);
  });
});

// --- Check for Impact (Clean Up) -----------------------------------------------------------

describe('Check for Impact', () => {
  it('is due once per Era, and not again once answered', () => {
    const b = bot();
    expect(needsImpactCheck(b, 3)).toBe(true);
    const after = answerCheckForImpact(b, 3, 'not-yet');
    expect(needsImpactCheck(after, 3)).toBe(false);
    // ...but the next Era asks again, since the tile can move every Era.
    expect(needsImpactCheck(after, 4)).toBe(true);
  });

  it('stops being due once the Impact has happened — the tile cannot move after that', () => {
    const after = answerCheckForImpact(bot(), 5, 'impact-occurred');
    expect(after.doomsday!.impactEra).toBe(5);
    expect(needsImpactCheck(after, 6)).toBe(false);
  });

  it('"impact now" records the Era, so the very next Era is post-Impact', () => {
    const after = answerCheckForImpact(bot(), 2, 'impact-now');
    expect(after.doomsday!.impactEra).toBe(2);
    expect(Chronossus.isPostImpact(3, { chronossusMode: 'doomsday' }, after)).toBe(true);
  });

  it('"earth saved" never records an Impact Era — the Impact never happens', () => {
    const after = answerCheckForImpact(bot(), 4, 'earth-saved');
    expect(after.doomsday!.impactEra).toBeNull();
    expect(after.doomsday!.playerTrackerFinal).toBe(true);
    // No Era of the game is post-Impact, so no Evacuation and no 2+X Power Up.
    expect(Chronossus.isPostImpact(7, { chronossusMode: 'doomsday' }, after)).toBe(false);
  });

  it('does not blame the player’s tracker when the bot’s own is the locked one', () => {
    const b = bot({ doomsday: { ...bot().doomsday!, botSlot: 10 } }); // Seal Fate, bottom
    expect(botTrackerLocked(b)).toBe(true);
    const after = answerCheckForImpact(b, 4, 'impact-now');
    expect(after.doomsday!.impactEra).toBe(4);
    // The lock is already implied by botSlot; saying the player's marker is final too
    // would misreport whose marker ended it.
    expect(after.doomsday!.playerTrackerFinal).toBe(false);
  });

  it('is pure — the caller’s state is untouched', () => {
    const b = bot();
    const before = { ...b.doomsday! };
    answerCheckForImpact(b, 3, 'impact-occurred');
    expect(b.doomsday).toEqual(before);
  });
});

// --- setup ---------------------------------------------------------------------------------

describe('Setup — the bot takes the tracker opposing the player’s Path', () => {
  const seed = (path?: 'harmony' | 'dominance' | 'salvation' | 'progress') =>
    Chronossus.applyDifficultySetup(emptyChronossusState(), {
      ...DEFAULT_CONFIG,
      chronossusMode: 'doomsday',
      ...(path ? { doomsdayPlayerPath: path } : {}),
    }).doomsday!;

  it('seeds the slice at the middle of the ladder with nothing answered', () => {
    const d = seed('harmony');
    expect(d.botSlot).toBe(DOOMSDAY_START_SLOT);
    expect(d.experimentsCompleted).toBe(0);
    expect(d.experimentActionRun).toBe(false);
    expect(d.impactEra).toBeNull();
    expect(d.checkedEra).toBeNull();
    expect(d.earthSaved).toBe(false);
  });

  it('gives the bot Seal Fate against Harmony/Dominance and Save Earth against the rest', () => {
    expect(seed('harmony').botTracker).toBe('seal-fate');
    expect(seed('dominance').botTracker).toBe('seal-fate');
    expect(seed('salvation').botTracker).toBe('save-earth');
    expect(seed('progress').botTracker).toBe('save-earth');
  });

  it('defaults to the player on Harmony when no Path was chosen', () => {
    expect(seed().botTracker).toBe('seal-fate');
  });

  it('seeds nothing at all in a non-Doomsday game', () => {
    const bot = Chronossus.applyDifficultySetup(emptyChronossusState(), {
      ...DEFAULT_CONFIG,
      chronossusMode: 'base',
    });
    expect(bot.doomsday).toBeUndefined();
  });
});

// --- scoring ------------------------------------------------------------------------------

describe('Scoring — Experiment VP is broken out, not added on top', () => {
  const played = () => {
    const b = bot();
    // Two Experiments: a 2 VP card onto slot 7 (+1), then a 3 VP card onto slot 8 (+1).
    run(b, 1, { markedAvailable: true, experimentVp: 2, canPrepare: true });
    run(b, 2, { markedAvailable: true, experimentVp: 3, canPrepare: true });
    return b;
  };

  it('records only the card VP — the track pays ordinary VP', () => {
    const b = played();
    expect(b.doomsday!.experimentVp).toBe(5); // 2 + 3 from the cards
    expect(b.vp).toBe(7); // ...plus 1 + 1 from the track slots, as plain VP
  });

  it('splits the card VP OUT of Token VP so the total is unchanged', () => {
    const b = played();
    const score = Chronossus.scoreChronossus(b);
    expect(score.experimentVP).toBe(5);
    // The two during-game lines still add up to `bot.vp` — nothing double-counted, and the
    // 2 VP the track paid is in `tokenVP` like any other scoring.
    expect(score.tokenVP).toBe(2);
    expect(score.tokenVP + score.experimentVP).toBe(b.vp);
    expect(score.total).toBe(
      b.vp +
        score.timeTravelVP +
        score.breakthroughVP +
        score.shapeSetBonus +
        score.anomalyVP,
    );
  });

  it('reports 0 in a game with no Doomsday slice', () => {
    expect(Chronossus.scoreChronossus(emptyChronossusState()).experimentVP).toBe(0);
  });
});
