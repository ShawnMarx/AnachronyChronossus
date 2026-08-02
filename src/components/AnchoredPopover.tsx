// AnchoredPopover — a popover portaled to <body> (so it escapes any transformed
// ancestor) and anchored to an on-screen rect: centred on it horizontally, opening
// just below (or above when there's no room), then measured and clamped to the
// viewport so it always stays on screen and never drifts from what was tapped.
//
// Shared by the board badge tooltips, the VP pill, and the Turn tracker.

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function AnchoredPopover({
  rect,
  className,
  children,
}: {
  rect: DOMRect | null;
  className: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!rect || !el) return;
    const m = 8; // viewport margin
    const gap = 8; // gap between anchor and popover
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pw = el.offsetWidth;
    const ph = el.offsetHeight;
    // Centre on the anchor, then clamp so neither edge runs off screen.
    const cx = rect.left + rect.width / 2;
    const left = Math.max(m, Math.min(cx - pw / 2, vw - pw - m));
    // Prefer below the anchor; flip above when it would overflow the bottom.
    const below = rect.bottom + gap + ph <= vh - m;
    const top = below ? rect.bottom + gap : Math.max(m, rect.top - gap - ph);
    setPos({ left, top });
  }, [rect, children]);

  if (!rect) return null;
  return createPortal(
    <div
      ref={ref}
      className={className}
      // Fixed-to-viewport; `right`/`bottom` cleared so a class that sets them
      // (e.g. .vp-popover) doesn't stretch the box. Hidden for the first paint
      // (pos not measured yet); useLayoutEffect sets it before paint, no flash.
      style={{
        position: 'fixed',
        right: 'auto',
        bottom: 'auto',
        left: pos?.left ?? 0,
        top: pos?.top ?? 0,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
