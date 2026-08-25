// Where the bot's Warp tiles sit on the Timeline, Era by Era.
//
// `warpTilesOnTimeline` is only the total, and the rules keep asking a question the total
// can't answer: Time Travel "removes any one Warp tile from the **past** Timeline tile
// where the bot has the most Warp tiles (oldest if tied)" (Solo Opponents p.5). The Warp
// phase (4) comes before Action Rounds (5) in the same Era, so the tiles the bot placed
// this Era are on the CURRENT Timeline tile and are not eligible — with a bare total the
// app happily removed one, and told the player to take a tile the bot may not touch.
//
// Keys are the Era the tiles were placed in; 0 is Fractures' Era Zero tile. Pure, so
// every rule that reads it is unit-tested.

import { msg, type Msg } from './message';

/** Warp tiles on the Timeline, keyed by the Era whose tile they sit on (0 = Era Zero). */
export type WarpTilesByEra = Record<number, number>;

/**
 * A bot slice that may predate per-Era tracking. An old save has no map, so its tiles are
 * read as all-past — the behaviour before this existed, rather than a game that suddenly
 * can't Time Travel.
 */
interface WarpTileHolder {
  warpTilesOnTimeline: number;
  warpTilesByEra?: WarpTilesByEra;
}

/**
 * Tiles the map can't account for: a save written before per-Era tracking existed carries
 * a total and no map, and a game part-way through the change ends up with both — the map
 * filling from the next Warp phase on while the older tiles stay anonymous.
 *
 * Those are read as sitting on PAST tiles, which is what they are: everything already on
 * the Timeline when the map started was placed in an earlier Era. Treating them as
 * untracked-and-therefore-nothing would have taken Time Travel away from a game mid-Era.
 * A game tracked from its first Warp phase never has a remainder.
 */
function legacyPastTiles(bot: WarpTileHolder): number {
  const tracked = bot.warpTilesByEra
    ? Object.values(bot.warpTilesByEra).reduce((n, c) => n + c, 0)
    : 0;
  return Math.max(0, bot.warpTilesOnTimeline - tracked);
}

const eras = (byEra: WarpTilesByEra): number[] =>
  Object.keys(byEra)
    .map(Number)
    .filter((e) => byEra[e] > 0)
    .sort((a, b) => a - b);

/** Tiles on PAST Timeline tiles — everything placed before the Era now being played. */
export function pastWarpTiles(bot: WarpTileHolder, era: number): number {
  const tracked = bot.warpTilesByEra
    ? eras(bot.warpTilesByEra)
        .filter((e) => e < era)
        .reduce((n, e) => n + bot.warpTilesByEra![e], 0)
    : 0;
  return tracked + legacyPastTiles(bot);
}

/** Tiles on the CURRENT Era's Timeline tile — placed this Era's Warp phase. */
export function currentEraWarpTiles(bot: WarpTileHolder, era: number): number {
  return bot.warpTilesByEra?.[era] ?? 0;
}

/** Which past Timeline tile a removal takes from, and whether there is one at all. */
export interface WarpRemoval {
  /** The Era whose tile it comes from — null on a save written before per-Era tracking. */
  era: number | null;
  /** False when every tile it has is on the CURRENT Era's tile (or it has none). */
  eligible: boolean;
}

/**
 * The past Timeline tile a removal takes from: the one where the bot has the most tiles,
 * oldest (lowest Era) on a tie. Not eligible when it has none on a past tile — a Failed
 * Time Travel even while tiles it placed this Era sit on the current one.
 */
export function warpRemoval(bot: WarpTileHolder, era: number): WarpRemoval {
  // Anonymous tiles from before per-Era tracking go first: they are the oldest ones on the
  // board, and with no Era recorded there is nothing to compare them against. Taking them
  // in turn drains the pre-tracking pool, after which the map answers on its own.
  if (legacyPastTiles(bot) > 0) return { era: null, eligible: true };
  if (!bot.warpTilesByEra) return { era: null, eligible: false };
  const past = eras(bot.warpTilesByEra).filter((e) => e < era);
  if (past.length === 0) return { era: null, eligible: false };
  // `past` is ascending, so a strict > keeps the oldest of a tie.
  const pick = past.reduce((best, e) =>
    bot.warpTilesByEra![e] > bot.warpTilesByEra![best] ? e : best,
  );
  return { era: pick, eligible: true };
}

/**
 * How the app names that tile to the player. A descriptor, not a sentence — it is
 * interpolated into instructions that get persisted, and Era Zero is a separate KEY
 * rather than a param because "the Era Zero tile" is a name, not "Era 0".
 */
export function warpTileLabel(era: number): Msg {
  return era === 0 ? msg('board.timelineTile.eraZero') : msg('board.timelineTile.era', { era });
}

/** Place `n` tiles on `era`'s Timeline tile. */
export function placeWarpTiles(
  byEra: WarpTilesByEra | undefined,
  era: number,
  n: number,
): WarpTilesByEra {
  const next = { ...(byEra ?? {}) };
  if (n > 0) next[era] = (next[era] ?? 0) + n;
  return next;
}

/** Take one tile off `era`'s Timeline tile. */
export function removeWarpTile(
  byEra: WarpTilesByEra | undefined,
  era: number,
): WarpTilesByEra {
  const next = { ...(byEra ?? {}) };
  if (next[era] > 0) next[era] -= 1;
  if (next[era] === 0) delete next[era];
  return next;
}

/**
 * Take one tile off wherever the bot has the most (oldest on a tie), PAST tile or not —
 * for the effects that just "return a Warp tile" without Time Travel's past-tile rule
 * (Pioneers' Adventure cards). Returns the map unchanged when it has none.
 */
export function removeAnyWarpTile(byEra: WarpTilesByEra | undefined): WarpTilesByEra {
  if (!byEra) return {};
  const all = eras(byEra);
  if (all.length === 0) return { ...byEra };
  const pick = all.reduce((best, e) => (byEra[e] > byEra[best] ? e : best));
  return removeWarpTile(byEra, pick);
}
