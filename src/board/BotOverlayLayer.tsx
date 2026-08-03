// Renders the bot-placement overlay images over a board (shared by the Chronobot
// and Chronossus boards). Outside calibrate mode an overlay shows only when the
// bot owns > 0 of that type and art exists for it. In calibrate mode every entry
// shows — as its image, or a labelled ghost box when art is still missing — so
// each can be positioned and sized.

import {
  OVERLAY_ART,
  OVERLAY_LABEL,
  overlayKey,
  type BotOverlay,
  type OverlayKey,
} from './botOverlays';

export function BotOverlayLayer({
  overlays,
  count,
  positions,
  widths,
  curves,
  calibrate,
  selected,
  onSelect,
}: {
  overlays: BotOverlay[];
  /** How many of this type the bot currently owns. */
  count: (key: OverlayKey) => number;
  /** Calibrated centre positions, keyed by `overlayKey(key)`. */
  positions: Record<string, [number, number]>;
  /** Calibrated per-type widths, keyed by the raw overlay key. */
  widths: Record<string, number>;
  /** Per-type corner rounding (border-radius %), keyed by the raw overlay key. */
  curves: Record<string, number>;
  calibrate: boolean;
  selected: string;
  onSelect: (k: string) => void;
}) {
  return (
    <>
      {overlays.map((o) => {
        const key = overlayKey(o.key);
        const art = o.art ?? OVERLAY_ART[o.key];
        const has = count(o.key) > 0;
        if (!calibrate && (!art || !has)) return null;
        const [x, y] = positions[key] ?? o.pos;
        const width = widths[o.key] ?? o.width;
        const curve = curves[o.key] ?? o.curve ?? 0;
        const sel = calibrate && selected === key;
        const style: React.CSSProperties = {
          left: `${x}%`,
          top: `${y}%`,
          width: `${width}%`,
          borderRadius: `${curve}%`,
        };
        if (art) {
          return (
            <img
              key={key}
              src={art}
              alt={OVERLAY_LABEL[o.key]}
              title={`${OVERLAY_LABEL[o.key]}: ${count(o.key)}`}
              className={`bot-overlay ${sel ? 'cal-selected' : ''} ${
                calibrate && !has ? 'cal-ghost' : ''
              }`}
              style={style}
              onClick={
                calibrate
                  ? (e) => {
                      e.stopPropagation();
                      onSelect(key);
                    }
                  : undefined
              }
            />
          );
        }
        // Calibrate-only placeholder for types whose art isn't made yet.
        return (
          <div
            key={key}
            className={`bot-overlay bot-overlay-ghost ${sel ? 'cal-selected' : ''}`}
            style={style}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(key);
            }}
          >
            {OVERLAY_LABEL[o.key]}
          </div>
        );
      })}
    </>
  );
}
