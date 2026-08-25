// Shared undo / history / persistence plumbing for the solo-bot views.
//
// Both BoardExplorer (Chronobot) and ChronossusGame drive their turn loop through
// the same stack: every committed turn pushes a pre-commit snapshot + a history
// change-list, ↶ Undo restores the last snapshot, and the whole thing is persisted
// to localStorage so a game survives a refresh. The engine `state` is shared
// (GameState); the transient per-view UI slice (Command-token/marker positions +
// the shown AI die) is generic — `TUi`.

import type { GameState, Text } from '../engine';

/** Cap the undo/history depth so persisted state stays bounded. */
export const UNDO_CAP = 50;

/** The parts of an entry the History pane renders (bot-agnostic). */
export interface HistoryEntry {
  /**
   * One-line summary of the turn (e.g. "Era 2 · Construct — Factory · +3 VP").
   *
   * A message descriptor, so it is re-rendered in the reader's language on every read —
   * a saved sentence would freeze in whatever language wrote it. A bare string is a
   * LEGACY value from a save written before that change; those still render as written,
   * which is why `PersistedGame.version` was deliberately NOT bumped.
   */
  label: Text;
  /** The AI die rolled for a bot turn, shown as the die symbol in History. */
  die?: number | null;
  /** Concise per-turn change-list (Exosuit placed, cubes gained, +5 set, etc.). */
  effects: Text[];
}

/**
 * One entry on the undo/history stack: the pre-commit engine `state` + transient
 * `ui` slice to restore on undo, plus the History fields. `state.era` lets a view
 * scope "turns this Era" without a separate field.
 */
export interface UndoEntry<TUi> extends HistoryEntry {
  state: GameState;
  ui: TUi;
}

// --- Persistence (localStorage) ---------------------------------------------
// Only the committed game shape is saved (engine state, ui slice, undo/history,
// debug flag) — transient dialog UI (open panel, calibrate positions) is not. A
// version guards the schema; bumping invalidates older saves.

export interface PersistedGame<TUi> {
  version: number;
  state: GameState;
  ui: TUi;
  undoStack: UndoEntry<TUi>[];
  debug: boolean;
  /** Epoch ms of the last committed save — drives the "last played" prompt. */
  savedAt: number;
}

export function loadPersisted<TUi>(key: string, version: number): PersistedGame<TUi> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedGame<TUi>;
    if (data?.version !== version || !data.state || data.ui == null) return null;
    return data;
  } catch {
    return null;
  }
}

export function savePersisted<TUi>(
  key: string,
  version: number,
  p: Pick<PersistedGame<TUi>, 'state' | 'ui' | 'undoStack' | 'debug'>,
): void {
  try {
    localStorage.setItem(key, JSON.stringify({ version, savedAt: Date.now(), ...p }));
  } catch {
    /* quota / disabled storage — ignore */
  }
}

export function clearPersisted(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Peek a saved game's timestamp without loading it fully (Landing helper). */
export function peekSaved<TUi>(key: string, version: number): { savedAt: number } | null {
  const p = loadPersisted<TUi>(key, version);
  return p ? { savedAt: p.savedAt } : null;
}
