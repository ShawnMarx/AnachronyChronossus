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

/** True when the app is running locally (Vite dev build, or a localhost host). */
export function isLocalRun(): boolean {
  if (import.meta.env.DEV) return true;
  const h = window.location.hostname;
  return h === 'localhost' || h.startsWith('127.') || h === '[::1]';
}

/**
 * Ask the auth service who the current user is. Returns null when logged out
 * (401), when CORS/network fails, or on any non-OK response — never throws, so
 * callers can treat "not logged in" and "auth unavailable" the same way.
 */
export async function fetchMe(): Promise<BgeUser | null> {
  // Local run (dev server or a localhost host): treat everyone as an admin so all
  // features are testable without the shared auth service. Never fires in prod.
  if (isLocalRun()) {
    return { id: 0, username: 'local-admin', isAdmin: true };
  }
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

/** Navigate to the login page, returning here afterward. `/login` is a GET route. */
export function startLogin(): void {
  const ret = encodeURIComponent(window.location.href);
  window.location.href = `${AUTH_BASE}/login?return=${ret}`;
}

/**
 * Log out. The auth service's `/logout` is **POST-only** (a GET yields 405), so
 * we submit a top-level POST form — not blocked by CORS since it's a navigation.
 * After clearing the cookie it redirects to the login page with `return=` set.
 */
export function startLogout(): void {
  const ret = encodeURIComponent(window.location.href);
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `${AUTH_BASE}/logout?return=${ret}`;
  document.body.appendChild(form);
  form.submit();
}
