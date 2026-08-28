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
import { emptyChronossusState } from './state';
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

function checkAll(instructions: { text: Text; detail?: Text }[]): void {
  for (const instr of instructions) {
    for (const m of [...collect(instr.text), ...collect(instr.detail)]) {
      const english = CATALOG[m.key];
      expect(english, `no catalog entry for ${m.key}`).toBeDefined();
      for (const [, name] of (english ?? '').matchAll(/\{(\w+)\}/g)) {
        expect(m.params?.[name], `${m.key} supplies no {${name}}`).toBeDefined();
      }
    }
  }
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
    let s = chronossusState({ era: 2, phase: 'paradox' });

    const paradox = Chronossus.rollParadox(s, 2);
    checkAll(paradox.instructions);
    s = Chronossus.endParadoxPhase(paradox.state);

    s = Chronossus.resolvePowerUp(s, { energized: 3, exhausted: 1 });
    checkAll(s.currentInstructions);

    s = Chronossus.resolveWarp(s, 2);
    checkAll(s.currentInstructions);

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
      checkAll(res.instructions);
      s = res.state;
    }

    s = Chronossus.resolveCleanUp(s);
    checkAll(s.currentInstructions);
  });

  it('for the modular tiles, both sides', () => {
    let s = chronossusState({ era: 2, phase: 'actions' });
    s.chronossus!.exosuitsAvailable = 6;
    for (const actionId of ['tile-score', 'tile-energy-pack', 'tile-reboot'] as const) {
      for (const tileSide of ['A', 'B'] as const) {
        const res = Chronossus.resolveAction(s, { actionId, tileSide });
        checkAll(res.instructions);
      }
    }
  });
});
