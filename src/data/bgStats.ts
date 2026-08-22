// bgStats.ts — build a Board Game Stats play file from the player's saved games.
//
// The shape is modelled on a REAL export out of BG Stats itself (an Anachrony solo play,
// 2026-08-22), not on the minimal file the data service used to emit. That matters: the
// service wrote four keys per play, and BG Stats' own file carries the location, the
// expansions used, the date in two formats, a per-play uuid and a `userInfo` block. A file
// missing those imports, but lands without a location, without the expansions ticked, and
// duplicates itself on every re-import.
//
// It moved out of the data service for two reasons the server could not solve:
//
//   * **Only the plays the player picked.** The history screen has checkboxes; the service
//     endpoint exports everything or nothing.
//   * **The mode.** The service wrote `board: "Solo - Chronobot"` on every play, so a
//     Chronossus game imported as a Chronobot one. The mode lives in the row's label and
//     payload, which this app writes and this app understands.
import type { GameRow } from './gameData';

/** BG Stats game entries, with the metadata its own export carries. */
interface BgsGame {
  bggId: number;
  bggName: string;
  bggYear: number;
  cooperative: boolean;
  designers: string;
  highestWins: boolean;
  id: number;
  isBaseGame: 0 | 1;
  isExpansion: 0 | 1;
  maxPlayerCount: number;
  maxPlayTime: number;
  minAge: number;
  minPlayerCount: number;
  minPlayTime: number;
  name: string;
  noPoints: boolean;
  usesTeams: boolean;
  urlImage?: string;
  urlThumb?: string;
}

const ANACHRONY: BgsGame = {
  bggId: 185343,
  bggName: 'Anachrony',
  bggYear: 2017,
  cooperative: false,
  designers: 'Dávid Turczi, Richard Amann, Viktor Peter',
  highestWins: true,
  id: 1,
  isBaseGame: 1,
  isExpansion: 1,
  maxPlayerCount: 4,
  maxPlayTime: 120,
  minAge: 15,
  minPlayerCount: 1,
  minPlayTime: 30,
  name: 'Anachrony',
  noPoints: false,
  usesTeams: false,
  urlImage:
    'https://cf.geekdo-images.com/31quLNzteInnevVRAABoow__original/img/3KfMPSj7jjhG0g5lQBsO-bn67D0=/0x0/filters:format(jpeg)/pic3499707.jpg',
  urlThumb:
    'https://cf.geekdo-images.com/31quLNzteInnevVRAABoow__thumb/img/a0G93aMOKp3_mmnCURYWuZd210U=/fit-in/200x150/filters:strip_icc()/pic3499707.jpg',
};

/** BG Stats separates the parts of a mode/role with a FULLWIDTH SOLIDUS, not a slash. */
const SEP = '／';

export interface BgStatsFile {
  about: string;
  games: BgsGame[];
  locations: { id: number; name: string }[];
  players: { id: number; name: string; isAnonymous: boolean }[];
  plays: BgsPlay[];
  userInfo: { meRefId: number };
}

interface BgsPlay {
  board: string;
  durationMin: number;
  entryDate: string;
  gameRefId: number;
  ignored: boolean;
  locationRefId: number;
  manualWinner: boolean;
  modificationDate: string;
  playDate: string;
  playDateYmd: number;
  /** Free text. Difficulty options only — the modules are in `board`, not repeated here. */
  comments: string;
  playerScores: {
    metaData: string;
    newPlayer: boolean;
    playerRefId: number;
    rank: number;
    /** BG Stats' per-seat role. The opponent's seat names the bot here. */
    role?: string;
    score: string;
    seatOrder?: number;
    startPlayer: boolean;
    winner: boolean;
  }[];
  rounds: number;
  scoringSetting: number;
  usesTeams: boolean;
  uuid: string;
}

/**
 * What a saved row says about the game it came from.
 *
 * Rows are written as `"<Bot> · <modules> · <options>"` with `payload.opponent` and
 * `payload.modes` alongside. Older rows predate that: some are just `"Chronossus"`, some
 * are a bare option list from the Chronobot, and imported rows can be anything at all. So
 * the payload is preferred, the label is the fallback, and neither is required.
 */
export function describeGame(row: GameRow): {
  opponent: string | null;
  modes: string[];
  difficulty: string;
} {
  const payload = (row.payload ?? {}) as { opponent?: string; modes?: string[] };
  const parts = (row.difficulty ?? '').split('·').map((s) => s.trim()).filter(Boolean);

  const labelled = parts[0] === 'Chronobot' || parts[0] === 'Chronossus' ? parts[0] : null;
  const opponent = payload.opponent ?? labelled;

  const modes = payload.modes?.length
    ? payload.modes
    : labelled && parts[1]
      ? parts[1].split('+').map((s) => s.trim()).filter(Boolean)
      : [];
  const difficulty = labelled ? parts.slice(2).join(' · ') : parts.join(' · ');

  return { opponent, modes, difficulty };
}

/**
 * The play's `board` — BG Stats' mode field: the opponent and its modules, separated the
 * way BG Stats does it. A bare "Base" is dropped; it is not a mode worth naming.
 */
export function boardLabel(row: GameRow): string {
  const { opponent, modes } = describeGame(row);
  const named = modes.filter((m) => m && m !== 'Base');
  const bot = opponent ?? 'Solo';
  return [`Solo - ${bot}`, ...named].join(SEP);
}

/**
 * A stable uuid per saved game, so re-exporting a play BG Stats already has updates it
 * instead of adding a duplicate. Derived from the row id rather than random for exactly
 * that reason.
 */
export function playUuid(id: number): string {
  // FNV-1a over a salted id, stretched to 32 hex digits. Not cryptographic — it only has
  // to be stable and collision-free across one player's game list.
  let h = 0x811c9dc5;
  const seed = `anachrony-play-${id}`;
  let hex = '';
  for (let round = 0; round < 4; round++) {
    for (const ch of `${seed}-${round}`) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    hex += h.toString(16).padStart(8, '0');
  }
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ]
    .join('-')
    .toUpperCase();
}

/** BG Stats wants `YYYY-MM-DD HH:MM:SS`; rows carry a plain date. */
function stamp(date: string): string {
  return `${date} 00:00:00`;
}

/**
 * Build the file. `rows` is already the selection — the caller decides whether that is
 * every game or only the ticked ones. `now` is passed in so the output is deterministic
 * and testable.
 */
export function buildBgStatsExport(
  rows: GameRow[],
  playerName: string,
  now = new Date().toISOString().slice(0, 19).replace('T', ' '),
): BgStatsFile {
  return {
    about:
      'This is a Play file that can be read by Board Game Stats. If you see this text, ' +
      'try to use a share, export or open-in function to open it with Board Game Stats.',
    // Just the base game. The modules are named in the play's `board`, which is where the
    // detail belongs — listing each expansion as its own game entry would need a BGG id per
    // expansion, and a wrong one attaches the play to the wrong game.
    games: [ANACHRONY],
    locations: [{ id: 1, name: 'Home' }],
    players: [
      { id: 1, name: playerName, isAnonymous: false },
      // The opponent stays the anonymous player, as in BG Stats' own export — naming it
      // "Chronossus" here would add a person to the player list who does not exist. Which
      // bot it was goes on the SEAT, as its role, and the seat is flagged `isNpc`.
      { id: 2, name: 'Anonymous player', isAnonymous: true },
    ],
    plays: rows.map((r) => {
      const { difficulty } = describeGame(r);
      const date = (r.played_at ?? '').slice(0, 10);
      return {
        board: boardLabel(r),
        comments: difficulty,
        // The app does not time games, and a 0 here reads as "not recorded" in BG Stats.
        durationMin: 0,
        entryDate: stamp(date),
        gameRefId: 1,
        ignored: false,
        locationRefId: 1,
        manualWinner: false,
        modificationDate: now,
        playDate: stamp(date),
        playDateYmd: Number(date.replace(/-/g, '')),
        playerScores: [
          {
            metaData: '{}',
            newPlayer: false,
            playerRefId: 1,
            rank: 0,
            score: String(r.player_score ?? ''),
            startPlayer: false,
            winner: !!r.won,
          },
          {
            // Marks the seat as a non-player character, so BG Stats does not count the bot
            // as a person who played.
            metaData: '{"isNpc":1}',
            newPlayer: false,
            playerRefId: 2,
            rank: 0,
            role: describeGame(r).opponent ?? 'Solo opponent',
            score: String(r.bot_score),
            seatOrder: 0,
            startPlayer: false,
            winner: !r.won,
          },
        ],
        // The Era reached. BG Stats calls it rounds and shows it on the play.
        rounds: r.era_reached ?? 0,
        scoringSetting: 1,
        usesTeams: false,
        uuid: playUuid(r.id),
      };
    }),
    userInfo: { meRefId: 1 },
  };
}

/** Filename for the download. `.bgsplay` is what BG Stats' own share produces. */
export function bgStatsFilename(today: string): string {
  return `Anachronyplay${today.replace(/-/g, '').slice(2)}.bgsplay`;
}
