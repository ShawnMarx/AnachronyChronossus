// Every descriptor the engine emits must be renderable — the check types cannot make.
//
// The refactor's two invisible failures (plan D7): a key with no catalog entry, which
// renders on screen as `instr.chronossus.mine.gained` as if it were a sentence, and a
// renamed param, which leaves `{n}` sitting in the middle of the text. Both compile, both
// pass every unit test that asserts a key, and neither is visible until someone plays.
//
// So this drives the Chronossus through a full Era — every phase and a spread of Actions —
// collects each `Msg` it emits (nested params included) and asserts both properties.

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type GameState } from './state';
import { isMsg, type Msg, type Text } from './message';
import { Chronossus, createInitialState } from './index';
import { emptyChronossusState, type Instruction } from './state';
import { resolveDoomsdayAction, type ExperimentInput } from './bots/doomsday';
import { resolveAdventure } from './bots/pioneers';
import { adventureDeckIds } from '../data/adventureCards';
import { englishMessages } from '../i18n/surface';

const CATALOG = englishMessages();

/** Every descriptor inside a value — the message itself and any nested param. */
function collect(value: Text | undefined, out: Msg[] = []): Msg[] {
  if (value == null || !isMsg(value)) return out;
  out.push(value);
  for (const param of Object.values(value.params ?? {})) {
    if (Array.isArray(param)) param.forEach((p) => collect(p, out));
    else if (typeof param === 'object' && param != null) {
      if ('list' in param) param.list.forEach((p) => collect(p, out));
      else collect(param, out);
    }
  }
  return out;
}

/**
 * Assert every descriptor in these instructions resolves — and return how many were
 * checked, because a walk that silently visited nothing would pass this test while
 * proving nothing.
 */
function checkAll(instructions: { text: Text; detail?: Text }[]): number {
  let checked = 0;
  for (const instr of instructions) {
    for (const m of [...collect(instr.text), ...collect(instr.detail)]) {
      checked += 1;
      const english = CATALOG[m.key];
      expect(english, `no catalog entry for ${m.key}`).toBeDefined();
      for (const [, name] of (english ?? '').matchAll(/\{(\w+)\}/g)) {
        expect(m.params?.[name], `${m.key} supplies no {${name}}`).toBeDefined();
      }
    }
  }
  return checked;
}

function chronossusState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialState({ ...DEFAULT_CONFIG, bot: 'chronossus' }),
    chronossus: emptyChronossusState(),
    ...overrides,
  };
}

describe('every message the Chronossus emits resolves', () => {
  it('through a full Era — phases and Actions alike', () => {
    let seen = 0;
    let s = chronossusState({ era: 2, phase: 'paradox' });

    const paradox = Chronossus.rollParadox(s, 2);
    seen += checkAll(paradox.instructions);
    s = Chronossus.endParadoxPhase(paradox.state);

    s = Chronossus.resolvePowerUp(s, { energized: 3, exhausted: 1 });
    seen += checkAll(s.currentInstructions);

    s = Chronossus.resolveWarp(s, 2);
    seen += checkAll(s.currentInstructions);

    const actions: Chronossus.ChronossusActionInput[] = [
      { actionId: 'mine-resource' },
      { actionId: 'recruit' },
      { actionId: 'research', shape: 'circle' },
      { actionId: 'construct-lab', buildingVP: 3 },
      { actionId: 'construct-superproject' },
      { actionId: 'remove-anomaly' },
      { actionId: 'time-travel' },
      { actionId: 'recruit-genius-research', geniusAvailable: true },
      { actionId: 'reboot' },
      { actionId: 'evacuation' },
      { actionId: 'mine-resource', noSpaceAvailable: true },
    ];
    for (const input of actions) {
      const res = Chronossus.resolveAction(s, input);
      seen += checkAll(res.instructions);
      s = res.state;
    }

    s = Chronossus.resolveCleanUp(s);
    seen += checkAll(s.currentInstructions);
    // The walk really did visit the engine, rather than passing on an empty list.
    expect(seen).toBeGreaterThan(40);
  });

  it('for the Doomsday Experiment — every branch of both steps', () => {
    const withDoomsday = (over: Record<string, unknown> = {}) => {
      const bot = emptyChronossusState();
      bot.doomsday = {
        botTracker: 'seal-fate',
        botSlot: 4,
        experimentsCompleted: 0,
        experimentVp: 0,
        experimentActionRun: false,
        impactEra: null,
        playerTrackerFinal: false,
        checkedEra: null,
        earthSaved: false,
        ...over,
      } as NonNullable<typeof bot.doomsday>;
      return bot;
    };
    const cases: [ReturnType<typeof withDoomsday>, ExperimentInput, boolean][] = [
      // Both steps run; the track moves and the spot may or may not print VP.
      [withDoomsday(), { markedAvailable: true, canPrepare: true }, false],
      // Locked (post-Impact): scores, moves nothing.
      [withDoomsday(), { markedAvailable: true, canPrepare: true }, true],
      // Neither step possible — the Failed Action.
      [withDoomsday(), { markedAvailable: false, canPrepare: false }, false],
      // The two hard stops: Earth saved, and fate sealed.
      [withDoomsday({ botTracker: 'save-earth', botSlot: 2 }), { markedAvailable: true, canPrepare: false }, false],
      [withDoomsday({ botSlot: 8 }), { markedAvailable: true, canPrepare: false }, false],
    ];
    let seen = 0;
    for (const [bot, input, postImpact] of cases) {
      const instr: Instruction[] = [];
      resolveDoomsdayAction(bot, instr, 0, 1, input, 1, postImpact);
      seen += checkAll(instr);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('for the Pioneers Adventure — the card it takes, and the one it cannot', () => {
    const withPioneers = () => {
      const bot = emptyChronossusState();
      bot.pioneers = {
        boardSide: 'A',
        upgraded: {},
        vpTokens: 0,
        adventures: 0,
        decks: {
          '5+': { draw: adventureDeckIds('5+'), discard: [] },
          '10+': { draw: adventureDeckIds('10+'), discard: [] },
        },
      };
      return bot;
    };
    let seen = 0;
    for (const input of [
      // Meets a card (and the Power Upgrade moves a Resource), meets neither, and the
      // no-free-slot penalty with the VP-token upgrade.
      { powerSlot: 4, die: 6, drawn: ['5+/13'] },
      { powerSlot: -1, die: 1, drawn: ['5+/17'] },
      { powerSlot: -3, die: 1, drawn: ['5+/15'] },
    ]) {
      const bot = withPioneers();
      bot.resources.titanium = 2;
      const instr: Instruction[] = [];
      resolveAdventure(bot, instr, 0, input);
      seen += checkAll(instr);
    }
    expect(seen).toBeGreaterThan(10);
  });

  it('for the modular tiles, both sides', () => {
    let s = chronossusState({ era: 2, phase: 'actions' });
    s.chronossus!.exosuitsAvailable = 6;
    let seen = 0;
    for (const actionId of ['tile-score', 'tile-energy-pack', 'tile-reboot'] as const) {
      for (const tileSide of ['A', 'B'] as const) {
        const res = Chronossus.resolveAction(s, { actionId, tileSide });
        seen += checkAll(res.instructions);
      }
    }
    expect(seen).toBeGreaterThan(5);
  });
});
