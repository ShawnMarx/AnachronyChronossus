// Localized views of the rule catalogs.
//
// The catalogs stay exactly as they are — English text, in the file the rules live in.
// These hooks return a COPY with any translated field swapped in, so a caller changes
// `CHRONOSSUS_TILES[code]` to `useTile(code)` and nothing else about it moves.
//
// Keys must match `surface.ts` exactly; `i18n.test.ts` asserts that every key these
// helpers ask for is one the surface actually publishes, so a typo is a failing test
// rather than a screen that quietly shows a raw `tile.C04B.rule`.

import { useMemo } from 'react';
import { useI18n } from './I18nProvider';
import { CHRONOSSUS_TILES, type ModularTile } from '../board/chronossusTiles';
import {
  CHRONOBOT_ACTIONS,
  type ChronobotActionDef,
  type ChronobotActionId,
} from '../engine/rules/chronobotActions';
import { PHASE_META, type PhaseMeta } from '../phases/phaseMeta';
import { CHRONOSSUS_PHASE_META } from '../phases/chronossusPhaseMeta';
import type { Phase } from '../engine';

type T = (key: string, params?: Record<string, string | number>) => string;

/** Swap a field only when the catalog has one — an absent `detail` must stay absent. */
function swap<O extends object, K extends keyof O>(
  out: O,
  field: K,
  original: O[K],
  t: T,
  key: string,
): void {
  if (original == null || original === '') return;
  out[field] = t(key) as O[K];
}

export function localizeTile(tile: ModularTile, t: T): ModularTile {
  const out = { ...tile };
  swap(out, 'name', tile.name, t, `tile.${tile.code}.name`);
  swap(out, 'rule', tile.rule, t, `tile.${tile.code}.rule`);
  swap(out, 'detail', tile.detail, t, `tile.${tile.code}.detail`);
  return out;
}

export function localizeAction(def: ChronobotActionDef, t: T): ChronobotActionDef {
  const out = { ...def };
  swap(out, 'label', def.label, t, `action.${def.id}.label`);
  swap(out, 'rule', def.rule, t, `action.${def.id}.rule`);
  // `summary` / `jit` are the unbuilt guided runner's copy — not published, not swapped.
  return out;
}

export function localizePhaseMeta(meta: PhaseMeta, phase: string, t: T, prefix = ''): PhaseMeta {
  const out = { ...meta };
  const base = `phase.${prefix}${phase}`;
  swap(out, 'name', meta.name, t, `${base}.name`);
  swap(out, 'overview', meta.overview, t, `${base}.overview`);
  swap(out, 'rules', meta.rules, t, `${base}.rules`);
  return out;
}

// --- Hooks ------------------------------------------------------------------

/**
 * One tile, translated. Typed exactly like `CHRONOSSUS_TILES[code]` so a call site swaps
 * the lookup for the hook and nothing downstream has to change its null handling.
 */
export function useTile(code: string): ModularTile {
  const { t } = useI18n();
  return useMemo(() => {
    const tile = CHRONOSSUS_TILES[code];
    return tile ? localizeTile(tile, t) : tile;
  }, [code, t]);
}

export function useTiles(): Record<string, ModularTile> {
  const { t } = useI18n();
  return useMemo(() => {
    const out: Record<string, ModularTile> = {};
    for (const [code, tile] of Object.entries(CHRONOSSUS_TILES)) out[code] = localizeTile(tile, t);
    return out;
  }, [t]);
}

export function useAction(id: ChronobotActionId): ChronobotActionDef {
  const { t } = useI18n();
  return useMemo(() => localizeAction(CHRONOBOT_ACTIONS[id], t), [id, t]);
}

export function useActions(): Record<ChronobotActionId, ChronobotActionDef> {
  const { t } = useI18n();
  return useMemo(() => {
    const out = {} as Record<ChronobotActionId, ChronobotActionDef>;
    for (const [id, def] of Object.entries(CHRONOBOT_ACTIONS)) {
      out[id as ChronobotActionId] = localizeAction(def, t);
    }
    return out;
  }, [t]);
}

/**
 * A standalone rulebook block (`rule.passing`, `rule.blink`, …). `fallback` is the
 * English constant, so a key that has not made it into the surface still renders the
 * real text rather than its own name.
 */
export function useRule(key: string, fallback: string): string {
  const { t } = useI18n();
  const text = t(key);
  return text === key ? fallback : text;
}

/** A rulebook block stored as lines (`rule.mechPlacement.0`, `.1`, …). */
export function useRuleLines(prefix: string, fallback: readonly string[]): string[] {
  const { t } = useI18n();
  return useMemo(
    () => fallback.map((line, i) => {
      const key = `${prefix}.${i}`;
      const text = t(key);
      return text === key ? line : text;
    }),
    [fallback, prefix, t],
  );
}

export function usePhaseMeta(chronossus = false): Partial<Record<Phase, PhaseMeta>> {
  const { t } = useI18n();
  return useMemo(() => {
    const src = chronossus ? CHRONOSSUS_PHASE_META : PHASE_META;
    const prefix = chronossus ? 'chronossus.' : '';
    const out: Partial<Record<Phase, PhaseMeta>> = {};
    for (const [phase, meta] of Object.entries(src)) {
      if (meta) out[phase as Phase] = localizePhaseMeta(meta, phase, t, prefix);
    }
    return out;
  }, [chronossus, t]);
}
