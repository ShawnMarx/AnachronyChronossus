import { useCallback, useState } from 'react';
import {
  endTurn as engineEndTurn,
  newGame,
  planTurn,
  type GameConfig,
  type GameState,
} from './engine';

/**
 * Thin React binding over the pure engine. All rules live in the engine; this
 * hook only holds the current GameState and exposes transitions.
 */
export function useGame() {
  const [state, setState] = useState<GameState | null>(null);

  const start = useCallback((config: GameConfig) => {
    setState(planTurn(newGame(config)));
  }, []);

  const next = useCallback(() => {
    setState((s) => (s ? planTurn(engineEndTurn(s)) : s));
  }, []);

  const reset = useCallback(() => setState(null), []);

  return { state, start, next, reset };
}
