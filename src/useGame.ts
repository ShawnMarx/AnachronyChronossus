import { useCallback, useState } from 'react';
import {
  Chronobot,
  rollParadoxDie,
  type GameConfig,
  type GameState,
} from './engine';
import type { ActionTurnInput } from './engine/bots/chronobot';

/**
 * Thin React binding over the pure Chronobot engine. All rules live in the
 * engine; this hook holds the current GameState and exposes phase transitions.
 * The app performs all bot randomness here (dice) and feeds results into the
 * deterministic engine functions.
 */
export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [lastParadoxRoll, setLastParadoxRoll] = useState<number | null>(null);

  const start = useCallback((config: GameConfig) => {
    setState(Chronobot.setup(config));
  }, []);

  const reset = useCallback(() => {
    setState(null);
    setLastParadoxRoll(null);
  }, []);

  const beginEra = useCallback(() => {
    setState((s) => (s ? { ...s, phase: 'paradox', currentInstructions: [] } : s));
  }, []);

  const resolveParadox = useCallback((gainedAnomaly: boolean) => {
    setState((s) => (s ? Chronobot.resolveParadox(s, gainedAnomaly) : s));
  }, []);

  const powerUp = useCallback(() => {
    setState((s) => (s ? Chronobot.resolvePowerUp(s) : s));
  }, []);

  const rollWarp = useCallback(() => {
    const n = rollParadoxDie();
    setLastParadoxRoll(n);
    setState((s) => (s ? Chronobot.resolveWarp(s, n) : s));
  }, []);

  const takeActionTurn = useCallback((input: ActionTurnInput) => {
    setState((s) => (s ? Chronobot.takeActionTurn(s, input).state : s));
  }, []);

  const playerPass = useCallback(() => {
    setState((s) => (s ? Chronobot.markPlayerPassed(s) : s));
  }, []);

  const botPass = useCallback(() => {
    setState((s) => (s ? Chronobot.markBotPassed(s) : s));
  }, []);

  const cleanUp = useCallback(() => {
    setState((s) => (s ? Chronobot.resolveCleanUp(s) : s));
  }, []);

  const nextEra = useCallback(() => {
    setState((s) => (s ? Chronobot.startNextEra(s) : s));
  }, []);

  const setImpact = useCallback((impact: boolean) => {
    setState((s) => (s ? { ...s, impact } : s));
  }, []);

  const endGame = useCallback(() => {
    setState((s) => (s ? { ...s, phase: 'endgame', finished: true } : s));
  }, []);

  return {
    state,
    lastParadoxRoll,
    start,
    reset,
    beginEra,
    resolveParadox,
    powerUp,
    rollWarp,
    takeActionTurn,
    playerPass,
    botPass,
    cleanUp,
    nextEra,
    setImpact,
    endGame,
  };
}
