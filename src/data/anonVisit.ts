// anonVisit.ts — mint the `bge_anon` visitor cookie.
//
// Half of the platform's anonymous-usage counting (spec:
// `boardgameedge/docs/CONTRACT_anonymous_usage.md`). The problem it solves is that the
// central `login_events` table records one row per successful *authentication*, so anyone
// who uses an app without signing in is indistinguishable from someone who never came —
// and this app is the one where not signing in is the NORMAL case, not a new mode. Left
// alone, the dashboard would report usage falling as usage grew.
//
// This app is a static site with no server, so it cannot implement the contract's usual
// shape (request middleware + a DB insert) and deliberately holds no DB credential —
// anything shipped in `dist/` is public. Instead it uses the contract's third mode:
//
//   1. this file mints a random cookie in the browser  ← the only part that lives here
//   2. nginx logs that cookie plus a signed-in boolean  ← not built yet
//   3. a job on the droplet rolls the log into daily uniques and inserts them
//
// Steps 2 and 3 are pending the platform's nginx rate-limiting work (`TODO.md`), so today
// this cookie is INERT: nothing reads it, and no data leaves the browser. That is
// deliberate — it lets the cookie age into real browsers before anything counts it.
//
// Three properties matter, and each is a rule from the contract rather than a preference:
//
//   * **Random, never derived.** No IP, no user-agent, no fingerprint, and no hash of any
//     of them. `login_events` records none of those and this must not reintroduce them by
//     the back door. The value is a random 128-bit number whose only use is being compared
//     against itself, which is also why script access to it confers nothing.
//   * **Host-only.** No `Domain=` attribute, so the cookie is never sent to another host on
//     the suite. A domain-wide one would follow a visitor across every BGE app (stronger
//     tracking than "how many people looked" needs) and would break the apex outright: the
//     landing service mints its own host-only `bge_anon`, sees this one already present,
//     and stops minting — silently changing what its numbers mean. Host-only also means
//     staging and prod count separately, so testing can never contaminate the prod figure.
//   * **It cannot be `HttpOnly`.** Script mints it, and `document.cookie` can neither set
//     nor read an `HttpOnly` cookie. Its absence here is a consequence of the mode, not an
//     oversight — do not "fix" it, or the cookie can never be minted at all.

/** Cookie name, fixed by the contract and shared across every BGE app. */
const COOKIE = 'bge_anon';
/**
 * A visitor is the same visitor for 180 days, or until they clear cookies.
 *
 * **Normative, not a preference** — the contract fixes it so every app's visitor decays at
 * the same rate. This shipped at 365 while the contract named no value; landing and
 * `bge_shared.anon_usage` shipped 180, which made this app's visitor count incomparable
 * with the rest of the suite — the one thing a shared metric may not do. Fixed in the
 * contract and lowered here on 2026-09-05.
 */
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

/** Read a cookie by name, or null. Returns null rather than throwing on any oddity. */
function readCookie(name: string): string | null {
  try {
    const prefix = `${name}=`;
    for (const part of document.cookie.split('; ')) {
      if (part.startsWith(prefix)) return part.slice(prefix.length) || null;
    }
    return null;
  } catch {
    return null;
  }
}

/** 128 random bits as 32 hex characters. */
function newVisitId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Ensure this browser carries a `bge_anon` cookie, minting one if it has none.
 *
 * Safe to call on every load: an existing cookie is left exactly as it is, so a visitor's
 * id is stable and the daily-unique insert stays idempotent.
 *
 * **Never throws.** Cookies can be blocked outright, and the browsers that block them are
 * the same ones that make `localStorage` raise — where this app already degrades to
 * "plays fine, saves nothing". Going uncounted is the acceptable failure here; breaking a
 * game in progress is not. Returns the id when there is one, else null.
 */
export function ensureAnonVisitCookie(): string | null {
  try {
    const existing = readCookie(COOKIE);
    if (existing) return existing;

    // `Secure` needs HTTPS, which localhost is not — a dev server would silently drop the
    // cookie and this would mint a new one on every load.
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const id = newVisitId();
    // No `Domain=`: host-only, deliberately. See the header note.
    document.cookie = `${COOKIE}=${id}; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`;

    // Blocked cookies fail silently rather than throwing, so confirm it stuck instead of
    // assuming — an unverified "we set it" is how an undercount turns into a wrong count.
    return readCookie(COOKIE);
  } catch {
    return null;
  }
}
