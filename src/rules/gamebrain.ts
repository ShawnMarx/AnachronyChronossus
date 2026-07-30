// gamebrain.ts — locates the shared GameBrain rules host and builds the
// embedded-frame URL for Anachrony's in-app rules reference.
//
// The Anachrony page in GameBrain is a PUBLIC_ACCESS game, so the embedded
// frame renders for logged-out visitors too (no login prompt inside the frame).
// The `?embedded=true` flag hides GameBrain's own header; `tab=rules` opens the
// rulebook; `preset` pre-selects a chat context. See GameBrain's
// docs/concepts/INTEGRATING_RULES_REFERENCE.md.

/** GameBrain base URL, detected from hostname (mirrors bgeAuth's AUTH_BASE). */
export const GAMEBRAIN_URL = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h.startsWith('127.')) return 'http://localhost:8000';
  if (h.includes('staging')) return 'https://gamebrain.staging.boardgameedge.com';
  return 'https://gamebrain.boardgameedge.com';
})();

/** The embedded rules-frame URL for the Anachrony game page. */
export const RULES_FRAME_URL =
  `${GAMEBRAIN_URL}/games/anachrony/?embedded=true&tab=rules&preset=${encodeURIComponent('Solo Chronobot')}`;
