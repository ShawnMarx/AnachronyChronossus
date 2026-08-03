// Debug-only counters for the bot-placement overlays — one stepper per type so
// each overlay can be toggled on (count > 0) to check its calibration without
// playing through a game. Collapsed by default; rendered inside the DebugBar
// dropdown via its `extra` slot. Shared by both bot views.

import { OVERLAY_KEYS, OVERLAY_LABEL, type OverlayKey } from '../board/botOverlays';

export function OverlayDebugControls({
  count,
  onSet,
}: {
  /** Current count for a type. */
  count: (key: OverlayKey) => number;
  /** Set a type's count directly. */
  onSet: (key: OverlayKey, value: number) => void;
}) {
  return (
    <details className="debug-overlays">
      <summary>Overlays — set counts</summary>
      <div className="debug-overlays-list">
        {OVERLAY_KEYS.map((key) => {
          const v = count(key);
          return (
            <div className="debug-row" key={key}>
              <span className="debug-row-label">{OVERLAY_LABEL[key]}</span>
              <div className="debug-stepper">
                <button
                  onClick={() => onSet(key, v - 1)}
                  disabled={v <= 0}
                  aria-label={`Decrease ${OVERLAY_LABEL[key]}`}
                >
                  −
                </button>
                <span className="debug-stepper-val">{v}</span>
                <button
                  onClick={() => onSet(key, v + 1)}
                  aria-label={`Increase ${OVERLAY_LABEL[key]}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
