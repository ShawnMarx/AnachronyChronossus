import { describe, it, expect } from 'vitest';
import type { ChronossusState, Instruction } from '../state';
import {
  BASE_POWER,
  BIG_DECK_THRESHOLD,
  boardPower,
  chooseAdventureCard,
  chooseCardResource,
  deckFor,
  isPioneersMode,
  NO_SLOT_PENALTY,
  powerUpgradeChoice,
  resolveAdventure,
  resolvePowerUpgrade,
  UPGRADE_SLOTS,
  upgradeTokenVp,
  VP_TOKEN_POWER,
  DIFFICULTY_PIONEERS_VP_TOKENS_COUNT,
} from './pioneers';
import { adventureCard, adventureDeckIds, ADVENTURE_CARDS } from '../../data/adventureCards';
import * as Chronossus from './chronossus';

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
    pioneers: {
      boardSide: 'A',
      upgraded: {},
      vpTokens: 0,
      adventures: 0,
      decks: {
        '5+': { draw: adventureDeckIds('5+'), discard: [] },
        '10+': { draw: adventureDeckIds('10+'), discard: [] },
      },
    },
    ...over,
  } as ChronossusState;
}

describe('the card database', () => {
  it('has 36 cards, 18 per deck, all unique', () => {
    expect(ADVENTURE_CARDS).toHaveLength(36);
    expect(adventureDeckIds('5+')).toHaveLength(18);
    expect(adventureDeckIds('10+')).toHaveLength(18);
    expect(new Set(ADVENTURE_CARDS.map((c) => c.id)).size).toBe(36);
    expect(new Set(ADVENTURE_CARDS.map((c) => c.name)).size).toBe(36);
  });

  it('matches the printed per-Power quantities on the reference card', () => {
    const count = (deck: '5+' | '10+', power: number) =>
      ADVENTURE_CARDS.filter((c) => c.deck === deck && c.power === power).length;
    // 5+: 3x5, 3x6, 4x7, 4x8, 4x9
    expect([5, 6, 7, 8, 9].map((p) => count('5+', p))).toEqual([3, 3, 4, 4, 4]);
    // 10+: 3x10, 2x11, 3x12, 3x13, 2x14, 2x15, 2x16, 1x18
    expect([10, 11, 12, 13, 14, 15, 16, 18].map((p) => count('10+', p))).toEqual([
      3, 2, 3, 3, 2, 2, 2, 1,
    ]);
  });

  it('gives every ongoing card the same 3 VP + 1 Energy Core conversion', () => {
    const ongoing = ADVENTURE_CARDS.filter((c) => c.ongoing);
    expect(ongoing).toHaveLength(9);
    for (const c of ongoing) {
      expect(c.bot.vp).toBe(3);
      expect(c.bot.energyCores).toBe(1);
    }
  });
});

describe('boardPower', () => {
  it('is the printed base with nothing upgraded', () => {
    expect(boardPower(bot())).toBe(BASE_POWER.A);
    expect(boardPower(bot({ pioneers: { ...bot().pioneers!, boardSide: 'B' } }))).toBe(BASE_POWER.B);
  });

  it('adds each filled Resource slot', () => {
    const b = bot();
    b.pioneers!.upgraded = { titanium: true, neutronium: true };
    expect(boardPower(b)).toBe(BASE_POWER.A + 2 + 4);
  });

  it('adds VP tokens at the side’s rate', () => {
    const a = bot();
    a.pioneers!.vpTokens = 2;
    expect(boardPower(a)).toBe(BASE_POWER.A + 2 * VP_TOKEN_POWER.A);
    const b = bot();
    b.pioneers!.boardSide = 'B';
    b.pioneers!.vpTokens = 2;
    expect(boardPower(b)).toBe(BASE_POWER.B + 2 * VP_TOKEN_POWER.B);
  });

  it('sums to the full board when every slot is filled', () => {
    const b = bot();
    b.pioneers!.upgraded = { titanium: true, uranium: true, gold: true, neutronium: true };
    const slots = UPGRADE_SLOTS.reduce((n, s) => n + s.power, 0);
    expect(boardPower(b)).toBe(BASE_POWER.A + slots);
    expect(slots).toBe(12);
  });
});

describe('deck choice', () => {
  it('switches to the 10+ deck at exactly 9', () => {
    expect(deckFor(BIG_DECK_THRESHOLD - 1)).toBe('5+');
    expect(deckFor(BIG_DECK_THRESHOLD)).toBe('10+');
    expect(deckFor(BIG_DECK_THRESHOLD + 1)).toBe('10+');
  });

  it('is decided before the die is added', () => {
    // Board 2 + slot 2 = 4 -> the 5+ deck, even though a 6 would push the total to 10.
    const b = bot();
    const instr: Instruction[] = [];
    const res = resolveAdventure(b, instr, 0, { powerSlot: 2, die: 6, drawn: ['5+/00', '5+/17'] });
    expect(res.powerBeforeRoll).toBe(4);
    expect(res.deck).toBe('5+');
    expect(res.totalPower).toBe(10);
  });
});

describe('powerUpgradeChoice', () => {
  it('picks whichever placeable Resource it has the most of', () => {
    const b = bot({ resources: { titanium: 1, uranium: 3, gold: 2, neutronium: 0, water: 0 } });
    expect(powerUpgradeChoice(b)).toBe('uranium');
  });

  it('breaks ties Titanium > Gold > Uranium > Neutronium', () => {
    const all = bot({ resources: { titanium: 2, uranium: 2, gold: 2, neutronium: 2, water: 0 } });
    expect(powerUpgradeChoice(all)).toBe('titanium');
    const noTi = bot({ resources: { titanium: 0, uranium: 2, gold: 2, neutronium: 2, water: 0 } });
    expect(powerUpgradeChoice(noTi)).toBe('gold');
    const noTiGold = bot({ resources: { titanium: 0, uranium: 2, gold: 0, neutronium: 2, water: 0 } });
    expect(powerUpgradeChoice(noTiGold)).toBe('uranium');
    const onlyN = bot({ resources: { titanium: 0, uranium: 0, gold: 0, neutronium: 2, water: 0 } });
    expect(powerUpgradeChoice(onlyN)).toBe('neutronium');
  });

  it('ignores a Resource whose slot is already filled', () => {
    const b = bot({ resources: { titanium: 5, uranium: 1, gold: 0, neutronium: 0, water: 0 } });
    b.pioneers!.upgraded = { titanium: true };
    expect(powerUpgradeChoice(b)).toBe('uranium');
  });

  it('is null with no Resources at all', () => {
    expect(powerUpgradeChoice(bot())).toBeNull();
  });

  it('places a VP token when nothing can be upgraded, and that adds Power not VP', () => {
    const b = bot();
    const instr: Instruction[] = [];
    expect(resolvePowerUpgrade(b, instr, 0)).toBeNull();
    expect(b.pioneers!.vpTokens).toBe(1);
    expect(b.vp).toBe(0);
    expect(boardPower(b)).toBe(BASE_POWER.A + VP_TOKEN_POWER.A);
  });

  it('spends the Resource it moves onto the board', () => {
    const b = bot({ resources: { titanium: 2, uranium: 0, gold: 0, neutronium: 0, water: 0 } });
    resolvePowerUpgrade(b, [], 0);
    expect(b.resources.titanium).toBe(1);
    expect(b.pioneers!.upgraded.titanium).toBe(true);
  });
});

describe('chooseAdventureCard', () => {
  const low = adventureCard('5+/00')!; // Power 5
  const high = adventureCard('5+/17')!; // Power 9

  it('takes the highest requirement it meets', () => {
    expect(chooseAdventureCard([low, high], 9)?.id).toBe(high.id);
    expect(chooseAdventureCard([high, low], 9)?.id).toBe(high.id);
  });

  it('falls back to the lower card when it cannot meet the higher', () => {
    expect(chooseAdventureCard([low, high], 8)?.id).toBe(low.id);
  });

  it('meets a card at exactly its Power', () => {
    expect(chooseAdventureCard([low], 5)?.id).toBe(low.id);
    expect(chooseAdventureCard([low], 4)).toBeNull();
  });

  it('is null when it meets neither', () => {
    expect(chooseAdventureCard([low, high], 3)).toBeNull();
  });
});

describe('resolveAdventure', () => {
  it('gains 1 VP and takes nothing when it meets neither card', () => {
    const b = bot();
    const instr: Instruction[] = [];
    const res = resolveAdventure(b, instr, 0, {
      powerSlot: -1,
      die: 1,
      drawn: ['5+/00', '5+/17'],
    });
    expect(res.taken).toBeNull();
    expect(b.vp).toBe(1);
    expect(b.pioneers!.adventures).toBe(0);
  });

  it('applies the W -> VP conversion (1 VP per 2 W, rounded up)', () => {
    const b = bot();
    // Exosuit Malfunction: 1 Energy Core and 3 W -> 1 core + 2 VP.
    resolveAdventure(b, [], 0, { powerSlot: 2, die: 1, drawn: ['5+/00'] });
    expect(b.vp).toBe(2);
    expect(b.energyPool.energized).toBe(1);
    expect(b.pioneers!.adventures).toBe(1);
  });

  it('applies the Morale -> 2 VP conversion', () => {
    const b = bot();
    b.pioneers!.upgraded = { titanium: true, uranium: true, gold: true, neutronium: true };
    // Broadcast from the Past (11): "Gain 2 Morale" -> 4 VP.
    const res = resolveAdventure(b, [], 0, { powerSlot: 0, die: 1, drawn: ['10+/04'] });
    expect(res.taken?.name).toBe('Broadcast from the Past');
    expect(b.vp).toBe(4);
  });

  it('discards an ongoing card for 3 VP and 1 Energy Core', () => {
    const b = bot();
    b.pioneers!.upgraded = { titanium: true, uranium: true, gold: true, neutronium: true };
    // Giant Sandworm (9) is purple: +4 Power ongoing -> 3 VP + 1 Energy Core instead.
    const res = resolveAdventure(b, [], 0, { powerSlot: 0, die: 1, drawn: ['5+/15'] });
    expect(res.taken?.ongoing).toBe(true);
    expect(b.vp).toBe(3);
    expect(b.energyPool.energized).toBe(1);
  });

  it('takes the Research branch when offered Research / Recruit / Construct', () => {
    const card = adventureCard('5+/13')!; // Secret Tunnels
    expect(card.bot.research).toBe(2);
    expect(card.bot.recruit).toBeUndefined();
    expect(card.bot.construct).toBeUndefined();
  });

  it('subtracts 3 when no Power slot was free', () => {
    const b = bot();
    const res = resolveAdventure(b, [], 0, {
      powerSlot: NO_SLOT_PENALTY,
      die: 6,
      drawn: ['5+/00'],
    });
    expect(res.powerBeforeRoll).toBe(BASE_POWER.A - 3);
    expect(res.totalPower).toBe(BASE_POWER.A - 3 + 6);
  });

  it('reports what the CHRONOSSUS got, so the dialog never needs the card’s Success box', () => {
    const b = bot();
    b.pioneers!.upgraded = { titanium: true, uranium: true, gold: true, neutronium: true };
    // Giant Sandworm is purple — its printed Success box grants ongoing Power, which the
    // bot never takes; it gets 3 VP + 1 Energy Core instead.
    const res = resolveAdventure(b, [], 0, { powerSlot: 0, die: 1, drawn: ['5+/15'] });
    expect(res.gains).toEqual(['3 VP', '1 Energy Core']);
    expect(res.actions).toEqual([]);
    expect(res.followUps).toEqual([]);
  });

  it('lists a card’s player-board follow-ups separately from its gains', () => {
    const b = bot();
    b.pioneers!.upgraded = { titanium: true, uranium: true, gold: true, neutronium: true };
    // Secret Tunnels: the Research/Recruit/Construct choice always resolves to Research.
    const res = resolveAdventure(b, [], 0, { powerSlot: 4, die: 6, drawn: ['5+/13'] });
    expect(res.taken?.name).toBe('Secret Tunnels');
    expect(res.followUps).toEqual(['Then it takes 2 Research Actions.']);
  });

  it('leaves gains and follow-ups empty when it meets neither card', () => {
    const b = bot();
    const res = resolveAdventure(b, [], 0, { powerSlot: -1, die: 1, drawn: ['5+/17'] });
    expect(res.taken).toBeNull();
    expect(res.gains).toEqual([]);
    expect(res.actions).toEqual([]);
    expect(res.followUps).toEqual([]);
  });

  it('discards the taken card and bottoms the rejected one', () => {
    const b = bot();
    const before = b.pioneers!.decks['5+'].draw.length;
    resolveAdventure(b, [], 0, { powerSlot: 2, die: 2, drawn: ['5+/00', '5+/17'] });
    const deck = b.pioneers!.decks['5+'];
    expect(deck.discard).toContain('5+/00');
    expect(deck.draw[deck.draw.length - 1]).toBe('5+/17');
    expect(deck.draw.length).toBe(before + 1);
  });

  it('always runs the Power Upgrade step after the card', () => {
    const b = bot({ resources: { titanium: 3, uranium: 0, gold: 0, neutronium: 0, water: 0 } });
    const res = resolveAdventure(b, [], 0, { powerSlot: 2, die: 1, drawn: ['5+/00'] });
    expect(res.upgraded).toBe('titanium');
    expect(b.pioneers!.upgraded.titanium).toBe(true);
  });

  it('still runs the Power Upgrade when the Adventure took no card', () => {
    const b = bot({ resources: { gold: 2, titanium: 0, uranium: 0, neutronium: 0, water: 0 } });
    const res = resolveAdventure(b, [], 0, { powerSlot: -1, die: 1, drawn: ['5+/17'] });
    expect(res.taken).toBeNull();
    expect(res.upgraded).toBe('gold');
  });
});

describe('chooseCardResource', () => {
  it('prefers a Resource it has none of', () => {
    const b = bot({ resources: { titanium: 4, uranium: 0, gold: 2, neutronium: 0, water: 0 } });
    expect(chooseCardResource(b, ['titanium', 'uranium', 'gold'])).toBe('uranium');
  });

  it('falls back to the Mine priority when it holds all of them', () => {
    const b = bot({ resources: { titanium: 1, uranium: 1, gold: 1, neutronium: 1, water: 0 } });
    expect(chooseCardResource(b, ['titanium', 'uranium', 'gold'])).toBe('uranium');
  });
});

describe('scoring and mode detection', () => {
  it('counts VP tokens only under the difficulty option', () => {
    const b = bot();
    b.pioneers!.vpTokens = 3;
    expect(upgradeTokenVp(b, [])).toBe(0);
    expect(upgradeTokenVp(b, [DIFFICULTY_PIONEERS_VP_TOKENS_COUNT])).toBe(3);
  });

  it('detects every Pioneers mode including the combos', () => {
    expect(isPioneersMode('pioneers')).toBe(true);
    expect(isPioneersMode('fractures+pioneers')).toBe(true);
    expect(isPioneersMode('guardians+pioneers')).toBe(true);
    expect(isPioneersMode('guardians')).toBe(false);
    expect(isPioneersMode(undefined)).toBe(false);
  });
});

describe('state isolation (the History-diff bug)', () => {
  it('does not write the Adventure through to the pre-turn state', () => {
    // resolveAdventure mutates its bot in place, so `resolveAction` must deep-copy the
    // `pioneers` slice. With a shallow copy, pre and post shared one object and every
    // Pioneers History line diffed to nothing.
    const before = bot({ resources: { titanium: 2, uranium: 0, gold: 0, neutronium: 0, water: 0 } });
    const snapshot = structuredClone(before.pioneers);
    const working = structuredClone(before);
    resolveAdventure(working, [], 0, { powerSlot: 2, die: 3, drawn: ['5+/00', '5+/17'] });
    // The untouched original still reads as it did before the turn.
    expect(before.pioneers).toEqual(snapshot);
    // ...and the working copy actually changed, so the diff is visible.
    expect(working.pioneers!.adventures).toBe(1);
    expect(working.pioneers!.upgraded.titanium).toBe(true);
    expect(working.pioneers).not.toEqual(snapshot);
  });
});

describe('Adventure as an Exosuit placement (Fractures + Guardians interplay)', () => {
  it('places an Exosuit, off the Main board', () => {
    // It takes a figure like any Capital Action, but the Adventure hex pool is on the
    // Adventure mini-board — so it is a Blink DESTINATION and never a Blink source.
    expect(Chronossus.placesExosuitFor('tile-adventure')).toBe(true);
    expect(Chronossus.isMainBoardPlacement('tile-adventure')).toBe(false);
    expect(Chronossus.OFF_MAIN_BOARD_ACTIONS).toContain('tile-adventure');
  });

  it('runs a Blink check when Fractures is in play and an Exosuit is Blink-ready', () => {
    const b = bot({
      fluxPool: { cores: 1, casings: 3, setAside: 0 },
      placedExosuits: [{ action: 'mine-resource', space: 'action', hasCore: true }],
    });
    expect(Chronossus.shouldCheckBlink(b, 'tile-adventure')).toBe(true);
    // No Flux Cores left in the pool -> nothing to draw, so no check.
    const dry = bot({
      fluxPool: { cores: 0, casings: 3, setAside: 0 },
      placedExosuits: [{ action: 'mine-resource', space: 'action', hasCore: true }],
    });
    expect(Chronossus.shouldCheckBlink(dry, 'tile-adventure')).toBe(false);
  });

  it('passes rather than Adventure when it is out of figures', () => {
    // The Adventure takes an Exosuit like any Capital Action, so the passing rule covers
    // it — on the C09/C10 tile slot AND on the printed space C10 covers.
    const empty = bot({ exosuitsAvailable: 0 });
    expect(Chronossus.wouldPassOn(empty, 'tile-adventure')).toBe(true);
    expect(Chronossus.passesInsteadOfAction(empty, 'tile-adventure')).toBe(true);
    expect(Chronossus.passesInsteadOfAction(bot(), 'tile-adventure')).toBe(false);
  });

  it('Blinks onto the Adventure board instead of passing (Fractures)', () => {
    // A Blink moves an Exosuit already on the Main board, so an empty supply doesn't stop
    // it — and the Adventure hex pool is a legal destination.
    const b = bot({
      exosuitsAvailable: 0,
      fluxPool: { cores: 1, casings: 3, setAside: 0 },
      placedExosuits: [{ action: 'mine-resource', space: 'action', hasCore: true }],
    });
    expect(Chronossus.wouldPassOn(b, 'tile-adventure')).toBe(true);
    expect(Chronossus.passesInsteadOfAction(b, 'tile-adventure', { fractures: true })).toBe(
      false,
    );
    // Same bot without Fractures, or with nothing left to Blink, still passes.
    expect(Chronossus.passesInsteadOfAction(b, 'tile-adventure')).toBe(true);
    const noSource = bot({
      exosuitsAvailable: 0,
      fluxPool: { cores: 1, casings: 3, setAside: 0 },
      placedExosuits: [{ action: 'tile-adventure', space: 'action', hasCore: true }],
    });
    expect(
      Chronossus.passesInsteadOfAction(noSource, 'tile-adventure', { fractures: true }),
    ).toBe(true);
  });

  it('is not a Blink source once the Exosuit sits on the Adventure board', () => {
    const b = bot({
      fluxPool: { cores: 1, casings: 3, setAside: 0 },
      placedExosuits: [{ action: 'tile-adventure', space: 'action', hasCore: true }],
    });
    // The only recorded Exosuit is on the Adventure board, so nothing can Blink from it.
    expect(Chronossus.selectBlinkExosuit(b, 'mine-resource', {})).toBeNull();
  });
});
