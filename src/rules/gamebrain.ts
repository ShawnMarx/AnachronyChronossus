// gamebrain.ts — locates the shared GameBrain rules host and builds the
// embedded-frame URL for Anachrony's in-app rules reference.
//
// The Anachrony page in GameBrain is a PUBLIC_ACCESS game, so the embedded
// frame renders for logged-out visitors too (no login prompt inside the frame).
// The `?embedded=true` flag hides GameBrain's own header; `tab=rules` opens the
// rulebook; `preset` pre-selects a chat context. See GameBrain's
// docs/concepts/INTEGRATING_RULES_REFERENCE.md.
//
// **PUBLIC_ACCESS is what carries this, and it is load-bearing.** Verified end to
// end on 2026-09-05: a signed-out browser on production opens the frame, gets 200,
// and renders all 28 rulebook pages. But GameBrain walls a stranger at `/games/<slug>/`
// by default — Anachrony is the ONLY one of its 27 games granted PUBLIC_ACCESS
// (each game's `config.py`; `core/game_deps.py`). `?embedded=true` is not an
// exemption and never was. If that flag is ever cleared on the GameBrain side, this
// frame 303s an anonymous visitor to auth cross-host and the rulebook breaks for
// exactly the players this app is built for — silently, since a logged-in test
// session sees nothing wrong.

/** GameBrain base URL, detected from hostname (mirrors bgeAuth's AUTH_BASE). */
export const GAMEBRAIN_URL = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h.startsWith('127.')) return 'http://localhost:8000';
  if (h.includes('staging')) return 'https://gamebrain.staging.boardgameedge.com';
  return 'https://gamebrain.boardgameedge.com';
})();

/** Build the embedded rules-frame URL for the Anachrony page, opening on the
 *  rules tab with the given chat `preset` pre-selected (per solo opponent). */
export function rulesFrameUrl(preset: string): string {
  return `${GAMEBRAIN_URL}/games/anachrony/?embedded=true&tab=rules&preset=${encodeURIComponent(preset)}`;
}

/** The embedded rules-frame URL for the Chronobot (default). */
export const RULES_FRAME_URL = rulesFrameUrl('Solo Chronobot');
