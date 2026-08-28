// useUndoableGame — the shared turn-loop store for a solo-bot view.
//
// Owns the engine `state`, the transient per-view `ui` slice (Command-token/marker
// positions + shown AI die), the undo/history stack, and the debug flag, and
// persists the committed shape to localStorage (survives refresh). Both
// BoardExplorer (Chronobot) and ChronossusGame consume it, differing only in
// their `TUi` shape + `storageKey`.

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../engine';
import {
  UNDO_CAP,
  loadPersisted,
  savePersisted,
  type UndoEntry,
} from './undo';
import type { Text } from '../engine/message';

export interface UndoableGame<TUi> {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  ui: TUi;
  setUi: React.Dispatch<React.SetStateAction<TUi>>;
  entries: UndoEntry<TUi>[];
  canUndo: boolean;
  debug: boolean;
  setDebug: React.Dispatch<React.SetStateAction<boolean>>;
  /** Commit a turn: push the pre-commit snapshot, then apply next state + ui. */
  commit: (
    next: GameState,
    nextUi: TUi,
    label: string,
    effects?: Text[],
    die?: number | null,
  ) => void;
  /** Pop + restore the last snapshot; returns it (or null) so the view can sync refs. */
  undo: () => UndoEntry<TUi> | null;
  /** Discard the game (and its history), starting fresh from the given state/ui. */
  reset: (freshState: GameState, freshUi: TUi) => void;
}

export function useUndoableGame<TUi>(opts: {
  storageKey: string;
  version: number;
  initialState: () => GameState;
  initialUi: () => TUi;
  /** Debug flag for a brand-new game (no save). Defaults false. */
  initialDebug?: boolean;
}): UndoableGame<TUi> {
  const { storageKey, version, initialState, initialUi, initialDebug = false } = opts;
  // Load any persisted game once (lazy initializers below all read this).
  const persisted = useRef(loadPersisted<TUi>(storageKey, version)).current;

  const [state, setState] = useState<GameState>(() => persisted?.state ?? initialState());
  const [ui, setUi] = useState<TUi>(() => persisted?.ui ?? initialUi());
  const [entries, setEntries] = useState<UndoEntry<TUi>[]>(() => persisted?.undoStack ?? []);
  const [debug, setDebug] = useState<boolean>(() => persisted?.debug ?? initialDebug);

  // Persist the committed game whenever it changes (transient dialog UI excluded).
  useEffect(() => {
    savePersisted(storageKey, version, { state, ui, undoStack: entries, debug });
  }, [storageKey, version, state, ui, entries, debug]);

  const commit: UndoableGame<TUi>['commit'] = (next, nextUi, label, effects = [], die = null) => {
    setEntries((s) => [...s, { state, ui, label, die, effects }].slice(-UNDO_CAP));
    setState(next);
    setUi(nextUi);
  };

  const undo: UndoableGame<TUi>['undo'] = () => {
    if (entries.length === 0) return null;
    const last = entries[entries.length - 1];
    setState(last.state);
    setUi(last.ui);
    setEntries((s) => s.slice(0, -1));
    return last;
  };

  const reset: UndoableGame<TUi>['reset'] = (freshState, freshUi) => {
    setState(freshState);
    setUi(freshUi);
    setEntries([]);
  };

  return {
    state,
    setState,
    ui,
    setUi,
    entries,
    canUndo: entries.length > 0,
    debug,
    setDebug,
    commit,
    undo,
    reset,
  };
}
