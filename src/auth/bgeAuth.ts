// bgeAuth.ts — framework-free client for the shared BoardGameEdge auth service.
//
// Login is fully OPTIONAL in this app. The `bge_session` cookie is scoped to
// `.boardgameedge.com`, so `anachrony.boardgameedge.com` is same-site with
// `auth.boardgameedge.com` and the cookie rides credentialed fetches. We learn
// "who am I" via GET /api/me and log in/out by redirecting the browser.

/** Auth service base URL, detected from the current hostname (mirrors Bullet). */
export const AUTH_BASE = (() => {
  const h = window.location.hostname;
  if (h === 'localhost' || h.startsWith('127.')) return 'http://localhost:8000';
  if (h.includes('staging')) return 'https://auth.staging.boardgameedge.com';
  return 'https://auth.boardgameedge.com';
})();

export interface BgeUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

/**
 * Ask the auth service who the current user is. Returns null when logged out
 * (401), when CORS/network fails, or on any non-OK response — never throws, so
 * callers can treat "not logged in" and "auth unavailable" the same way.
 */
export async function fetchMe(): Promise<BgeUser | null> {
  try {
    const res = await fetch(`${AUTH_BASE}/api/me`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      username: data.username,
      // The auth service may expose admin status under a few names; be lenient.
      isAdmin: Boolean(data.isAdmin ?? data.is_admin ?? data.admin ?? false),
    };
  } catch {
    return null;
  }
}

/** URL that logs in, then returns the browser to where it is now. */
export function loginUrl(): string {
  const ret = encodeURIComponent(window.location.href);
  return `${AUTH_BASE}/login?return=${ret}`;
}

/** URL that logs out, then returns the browser to where it is now. */
export function logoutUrl(): string {
  const ret = encodeURIComponent(window.location.href);
  return `${AUTH_BASE}/logout?return=${ret}`;
}
