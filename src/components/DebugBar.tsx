// DebugBar — the unified debug surface, shared by both solo-bot views.
//
// When Debug is ON, this renders one bar: a **Debug dropdown** button on the left
// (holding every debug control — Era / Paradox / Warp-tile adjust, Impact toggle,
// End-Actions, and any bot-specific extras) followed by an always-open
// **jump-to-phase** bar. The top bars no longer carry scattered Era/Paradox/DEBUG
// controls; they all live here.

import { useEffect, useRef, useState } from 'react';
import type { Phase } from '../engine';

const PHASE_LABEL: Partial<Record<Phase, string>> = {
  setup: 'Setup',
  preparation: '1 Prep',
  paradox: '2 Paradox',
  powerup: '3 Power Up',
  warp: '4 Warp',
  actions: '5 Actions',
  cleanup: '6 Clean Up',
  endgame: 'End Game',
};

export interface DebugBarProps {
  /** Jump-to-phase bar. */
  phases: Phase[];
  currentPhase: Phase;
  onGoPhase: (p: Phase) => void;
  /** Era stepper. */
  era: number;
  maxEra: number;
  onEra: (delta: number) => void;
  /** Paradox (0–3) stepper. */
  paradoxes: number;
  onParadox: (delta: number) => void;
  /** Impact toggle (before/after). */
  impact: boolean;
  onToggleImpact: () => void;
  /** End the Action Rounds phase (debug jump to Clean Up). */
  onEndActions?: () => void;
  /** Optional Warp-tile stepper (views that seed Warp tiles). */
  warpTiles?: number;
  onWarpTiles?: (delta: number) => void;
  /** Optional Time Travel marker stepper (spot 0–6). */
  timeTravel?: number;
  maxTimeTravel?: number;
  onTimeTravel?: (delta: number) => void;
  /**
   * Optional Exosuit-supply stepper. Stepping it to 0 is the only quick way into the
   * out-of-figures state, where the bot passes instead of acting — the wording for that
   * (and for a Failed Action) was previously only reachable by hand-editing the saved
   * game, which is what `pw-pass.mjs` had to do.
   */
  exosuits?: number;
  maxExosuits?: number;
  onExosuits?: (delta: number) => void;
  /** Optional pending Solo Hypersync tile stepper (HFA modes only). */
  hypersyncTiles?: number;
  maxHypersyncTiles?: number;
  onHypersyncTiles?: (delta: number) => void;
  /** Any bot-specific debug controls, rendered at the bottom of the dropdown. */
  extra?: React.ReactNode;
}

export default function DebugBar(props: DebugBarProps) {
  const {
    phases,
    currentPhase,
    onGoPhase,
    era,
    maxEra,
    onEra,
    paradoxes,
    onParadox,
    impact,
    onToggleImpact,
    onEndActions,
    warpTiles,
    onWarpTiles,
    timeTravel,
    maxTimeTravel = 6,
    onTimeTravel,
    hypersyncTiles,
    maxHypersyncTiles = 3,
    onHypersyncTiles,
    exosuits,
    maxExosuits,
    onExosuits,
    extra,
  } = props;

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const stepper = (
    label: string,
    value: React.ReactNode,
    onStep: (d: number) => void,
    canDown: boolean,
    canUp: boolean,
  ) => (
    <div className="debug-row">
      <span className="debug-row-label">{label}</span>
      <div className="debug-stepper">
        <button onClick={() => onStep(-1)} disabled={!canDown} aria-label={`Decrease ${label}`}>−</button>
        <span className="debug-stepper-val">{value}</span>
        <button onClick={() => onStep(1)} disabled={!canUp} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  );

  return (
    <div className="debug-bar">
      <div className="debug-menu-wrap" ref={wrapRef}>
        <button
          className={`debug-btn ${open ? 'on' : ''}`}
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Debug controls"
        >
          🛠 Debug ▾
        </button>
        {open && (
          <div className="debug-dropdown" role="menu">
            {stepper('Era', era, onEra, era > 1, era < maxEra)}
            {stepper('Paradoxes', paradoxes, onParadox, paradoxes > 0, paradoxes < 3)}
            {onWarpTiles != null &&
              stepper('Warp tiles', warpTiles ?? 0, onWarpTiles, (warpTiles ?? 0) > 0, true)}
            {onExosuits != null &&
              stepper(
                'Exosuits',
                exosuits ?? 0,
                onExosuits,
                (exosuits ?? 0) > 0,
                (exosuits ?? 0) < (maxExosuits ?? 6),
              )}
            {onTimeTravel != null &&
              stepper(
                'Time Travel',
                timeTravel ?? 0,
                onTimeTravel,
                (timeTravel ?? 0) > 0,
                (timeTravel ?? 0) < maxTimeTravel,
              )}
            {onHypersyncTiles != null &&
              stepper(
                'Hypersync tiles',
                hypersyncTiles ?? 0,
                onHypersyncTiles,
                (hypersyncTiles ?? 0) > 0,
                (hypersyncTiles ?? 0) < maxHypersyncTiles,
              )}
            <div className="debug-row">
              <span className="debug-row-label">Impact</span>
              <button className="debug-flag" onClick={onToggleImpact}>
                {impact ? 'AFTER' : 'BEFORE'}
              </button>
            </div>
            {onEndActions && (
              <div className="debug-row">
                <button className="debug-action" onClick={onEndActions}>
                  End Actions ▶ Clean Up
                </button>
              </div>
            )}
            {extra}
          </div>
        )}
      </div>
      <div className="debug-phasejump">
        <span className="debug-jump-label">Phase:</span>
        {phases.map((p) => (
          <button
            key={p}
            className={currentPhase === p ? 'debug-jump on' : 'debug-jump'}
            onClick={() => onGoPhase(p)}
          >
            {PHASE_LABEL[p] ?? p}
          </button>
        ))}
      </div>
    </div>
  );
}
