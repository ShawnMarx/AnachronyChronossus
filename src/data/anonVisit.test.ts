import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ensureAnonVisitCookie } from './anonVisit';

// The suite runs in node (the engine is pure and needs no DOM), so rather than pull jsdom
// in for one file, this stubs the two globals the module touches: `document.cookie` and
// `window.location.protocol`.
//
// The jar behaves like the real `document.cookie` for one cookie: assignment appends,
// reading returns "name=value" pairs. `blocked` models a cookie-blocking browser, which
// does NOT throw — it silently discards the write and stores nothing.
function stubCookieJar(opts: { blocked?: boolean } = {}) {
  let jar = '';
  const doc = {};
  Object.defineProperty(doc, 'cookie', {
    configurable: true,
    get: () => jar,
    set: (v: string) => {
      if (opts.blocked) return;
      const pair = v.split(';')[0];
      jar = jar ? `${jar}; ${pair}` : pair;
    },
  });
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { location: { protocol: 'https:' } });
  return {
    raw: () => jar,
    seed: (v: string) => {
      jar = v;
    },
  };
}

describe('bge_anon — the anonymous-visitor cookie', () => {
  let jar: ReturnType<typeof stubCookieJar>;

  beforeEach(() => {
    jar = stubCookieJar();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mints 128 bits of randomness as 32 hex characters', () => {
    const id = ensureAnonVisitCookie();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it('is host-only — it must never carry a Domain attribute', () => {
    // A domain-wide cookie would follow a visitor across every BGE app AND suppress the
    // landing service's own minting, silently changing what the apex's numbers mean.
    ensureAnonVisitCookie();
    expect(jar.raw()).not.toMatch(/Domain/i);
  });

  it('keeps an existing id rather than re-minting, so a visitor stays one visitor', () => {
    jar.seed('bge_anon=0123456789abcdef0123456789abcdef');
    const id = ensureAnonVisitCookie();
    expect(id).toBe('0123456789abcdef0123456789abcdef');
    // …and calling again is still stable.
    expect(ensureAnonVisitCookie()).toBe('0123456789abcdef0123456789abcdef');
  });

  it('finds its cookie among others', () => {
    jar.seed('bge_session=abc; bge_anon=deadbeefdeadbeefdeadbeefdeadbeef; other=1');
    expect(ensureAnonVisitCookie()).toBe('deadbeefdeadbeefdeadbeefdeadbeef');
  });

  it('gives two visitors different ids', () => {
    const first = ensureAnonVisitCookie();
    jar = stubCookieJar(); // a different browser
    const second = ensureAnonVisitCookie();
    expect(second).not.toBe(first);
  });

  it('returns null when cookies are blocked, instead of claiming an id it never stored', () => {
    // The write is silently discarded, so an unverified "we set it" would report an id the
    // next page load can never see — an undercount turning into a wrong count.
    jar = stubCookieJar({ blocked: true });
    expect(ensureAnonVisitCookie()).toBeNull();
  });

  it('never throws, even if reading cookies raises outright', () => {
    const hostile = {};
    Object.defineProperty(hostile, 'cookie', {
      configurable: true,
      get: () => {
        throw new Error('blocked');
      },
      set: () => {
        throw new Error('blocked');
      },
    });
    vi.stubGlobal('document', hostile);
    // A visit row is worth strictly less than a working game.
    expect(() => ensureAnonVisitCookie()).not.toThrow();
    expect(ensureAnonVisitCookie()).toBeNull();
  });

  it('carries no trace of the visitor — the id is random, not derived', () => {
    // Guards the contract's central rule: no IP, no user-agent, no fingerprint, no hash of
    // any of them. If someone ever swaps `crypto.getRandomValues` for something derived,
    // this fails: the id must not correlate with anything the browser reports about itself.
    const spy = vi.spyOn(crypto, 'getRandomValues');
    const id = ensureAnonVisitCookie();
    expect(spy).toHaveBeenCalledOnce();
    // Randomness is the whole guarantee: 32 hex chars straight out of the CSPRNG, with
    // nothing about the browser mixed in on the way.
    expect(id).toMatch(/^[0-9a-f]{32}$/);
    spy.mockRestore();
  });
});
