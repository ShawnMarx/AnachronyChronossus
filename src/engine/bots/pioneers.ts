// pioneers.ts — the Pioneers of New Earth module for the Chronossus (Solo Opponents p.15).
//
// Pure and UI-agnostic like the rest of the engine: the die roll and the deck draw are
// performed at the engine boundary and passed in, so every function here is deterministic.
//
// The module adds one Action — Adventure (tiles C09 / C10) — and one piece of state, the
// Chronossus Exosuit Upgrade board. The Action is two ordered steps, and the rulebook is
// explicit that either may fail: "It is possible for one of these steps to fail. If this
// happens, ignore that step."

import type { ChronossusState, Instruction } from '../state';
import { msg, plural, type Msg } from '../message';
import { removeAnyWarpTile } from '../warpTiles';
import type { Resource } from '../types';
import { adventureCard, type AdventureCard, type AdventureDeck } from '../../data/adventureCards';

/** Its three "Increasing the Difficulty" bullets (the B-side tile flip is the shared one). */
export const DIFFICULTY_PIONEERS_BOARD_B = 'chronossus-pioneers-board-b';
export const DIFFICULTY_PIONEERS_VP_TOKENS_COUNT = 'chronossus-pioneers-vp-tokens-count';

/** Whether a mode id runs the Pioneers module (including its combos). */
export function isPioneersMode(modeId: string | undefined): boolean {
  return !!modeId && modeId.includes('pioneers');
}

/**
 * The Chronossus Exosuit Upgrade board's Resource slots, left to right as printed.
 * One slot per Resource, so a Resource can be upgraded at most once.
 *
 * NOTE this is NOT the tie-break order — that is Titanium > Gold > Uranium > Neutronium
 * (`POWER_UPGRADE_TIE_ORDER`). The two are independent and it is easy to conflate them.
 */
export const UPGRADE_SLOTS: { resource: Resource; power: number }[] = [
  { resource: 'titanium', power: 2 },
  { resource: 'uranium', power: 3 },
  { resource: 'gold', power: 3 },
  { resource: 'neutronium', power: 4 },
];

/** Step 2's tie-break when the bot has equal amounts of several placeable Resources. */
export const POWER_UPGRADE_TIE_ORDER: Resource[] = ['titanium', 'gold', 'uranium', 'neutronium'];

/** Base Power printed on each side of the Upgrade board. */
export const BASE_POWER = { A: 2, B: 3 } as const;
/** Power each VP token on the Upgrade board is worth, per side. */
export const VP_TOKEN_POWER = { A: 2, B: 3 } as const;

/**
 * The Adventure board's strength-bonus column, topmost first. The bot puts a Path marker
 * on the topmost FREE slot — but the column is shared with the player's markers, which the
 * app cannot see, so the player always tells it which one that is.
 *
 * `NO_SLOT_PENALTY` applies when every slot is taken ("If there are no free Power slots at
 * all, subtract 3 from your total Power value", Classic Expansion p.7).
 */
export const POWER_SLOTS = [2, 1, 0, -1] as const;
export const NO_SLOT_PENALTY = -3;

/** The Adventure die is a plain d6 (faces 1-6, marked with the Power icon). */
export const ADVENTURE_DIE_FACES = [1, 2, 3, 4, 5, 6];

/** Power at or above which the Chronossus draws from the 10+ deck instead of the 5+. */
export const BIG_DECK_THRESHOLD = 9;

/** The Upgrade board's contribution: base + filled Resource slots + VP tokens. */
export function boardPower(bot: ChronossusState): number {
  const p = bot.pioneers;
  if (!p) return 0;
  const slots = UPGRADE_SLOTS.filter((s) => p.upgraded[s.resource]).reduce(
    (sum, s) => sum + s.power,
    0,
  );
  return BASE_POWER[p.boardSide] + slots + p.vpTokens * VP_TOKEN_POWER[p.boardSide];
}

/** A readable breakdown of `boardPower`, for the dialog and the badge pop-out. */
/**
 * One line of the Power sum. The label is a locale KEY plus its params rather than a
 * finished sentence — the engine is UI-agnostic and must not decide what language the
 * board's Power breakdown reads in. The view renders it through `t()`.
 */
export interface PowerPart {
  key: string;
  params?: Record<string, string | number>;
  power: number;
}

export function powerBreakdown(bot: ChronossusState): PowerPart[] {
  const p = bot.pioneers;
  if (!p) return [];
  const parts: PowerPart[] = [
    { key: 'ui.cx.power.board', params: { side: p.boardSide }, power: BASE_POWER[p.boardSide] },
  ];
  for (const s of UPGRADE_SLOTS) {
    if (p.upgraded[s.resource]) {
      parts.push({ key: `piece.${s.resource}`, power: s.power });
    }
  }
  if (p.vpTokens > 0) {
    parts.push({
      key: p.vpTokens === 1 ? 'ui.cx.power.vpToken' : 'ui.cx.power.vpTokens',
      params: { n: p.vpTokens },
      power: p.vpTokens * VP_TOKEN_POWER[p.boardSide],
    });
  }
  return parts;
}

/**
 * Which deck the Chronossus draws from. Note this uses the Power BEFORE the die roll:
 * "Sum up the power on the Chronossus's Exosuit Upgrade board (including the strength
 * bonus from the Path marker): If 9 or higher, it draws 2 cards from 10+ deck; otherwise,
 * it draws 2 cards from the 5+ deck. THEN, it rolls the Adventure die" (p.15).
 */
export function deckFor(powerBeforeRoll: number): AdventureDeck {
  return powerBeforeRoll >= BIG_DECK_THRESHOLD ? '10+' : '5+';
}

/**
 * Step 2 — Power Upgrade. Which Resource moves from the Chronossus's board onto its
 * Upgrade board: it must have a free slot, then "whichever Resource it has the most of",
 * tie-broken Titanium > Gold > Uranium > Neutronium. Null when no Resource qualifies, in
 * which case a VP token goes on the board instead.
 */
export function powerUpgradeChoice(bot: ChronossusState): Resource | null {
  const p = bot.pioneers;
  if (!p) return null;
  const options = UPGRADE_SLOTS.filter((s) => !p.upgraded[s.resource] && bot.resources[s.resource] > 0).map(
    (s) => s.resource,
  );
  if (options.length === 0) return null;
  let best = options[0];
  for (const r of options) {
    const better =
      bot.resources[r] > bot.resources[best] ||
      (bot.resources[r] === bot.resources[best] &&
        POWER_UPGRADE_TIE_ORDER.indexOf(r) < POWER_UPGRADE_TIE_ORDER.indexOf(best));
    if (better) best = r;
  }
  return best;
}

/**
 * Step 1's card choice: "It takes the card with the highest power requirement it meets."
 * Null when it meets neither, which is worth 1 VP instead.
 */
export function chooseAdventureCard(cards: AdventureCard[], totalPower: number): AdventureCard | null {
  const met = cards.filter((c) => totalPower >= c.power);
  if (met.length === 0) return null;
  return met.reduce((best, c) => (c.power > best.power ? c : best));
}

/**
 * A Resource pick for cards that offer "1 T/U/G". The rulebook gives the bot no
 * preference, so the app reuses the Mine priority shape — lacking-first, then
 * Neutronium > Uranium > Gold > Titanium — restricted to what the card offers.
 */
export function chooseCardResource(bot: ChronossusState, from: Resource[]): Resource {
  const priority: Resource[] = ['neutronium', 'uranium', 'gold', 'titanium'];
  const ranked = [...from].sort((a, b) => {
    const lackA = bot.resources[a] === 0 ? 0 : 1;
    const lackB = bot.resources[b] === 0 ? 0 : 1;
    if (lackA !== lackB) return lackA - lackB;
    return priority.indexOf(a) - priority.indexOf(b);
  });
  return ranked[0];
}

export interface AdventureInput {
  /** The bonus the player put the bot's Path marker on, or -3 if no slot was free. */
  powerSlot: number;
  /** The Adventure die result (the app rolls it). */
  die: number;
  /**
   * The two cards drawn, as card ids. In virtual mode the app draws them; in shared mode
   * the player names them. Fewer than 2 only if a deck ran out.
   */
  drawn: string[];
}

export interface AdventureResult {
  /** Power before the die (board + slot) — what picked the deck. */
  powerBeforeRoll: number;
  /** Power after adding the die — what the card requirement is compared against. */
  totalPower: number;
  deck: AdventureDeck;
  drawn: AdventureCard[];
  /** The card it took, or null when it met neither (worth 1 VP). */
  taken: AdventureCard | null;
  /** Step 2: the Resource moved onto the Upgrade board, or null if a VP token went on. */
  upgraded: Resource | null;
  /**
   * What the taken card gives the CHRONOSSUS, already converted ("2 VP", "1 gold").
   * The card's printed Success box is the player's rule and is never shown — the bot's
   * four conversions (W, Morale, Research/Recruit/Construct choice, ongoing) mean the
   * printed text routinely describes something else entirely.
   */
  gains: Msg[];
  /** Things it does rather than gains ("removes 1 Anomaly") — each a full clause. */
  actions: Msg[];
  /** Follow-ups the app can't apply on the physical board (Research/Recruit/Construct). */
  followUps: Msg[];
}

/**
 * What a taken card did, as one descriptor: "gains 2 VP, 1 Gold, removes 1 Anomaly", or
 * null when the card did nothing the app can state. Exported because the Adventure result
 * panel builds the same line, and the two must not drift apart.
 */
export function adventureDid(gains: Msg[], actions: Msg[]): Msg | null {
  const parts: Msg[] = [
    ...(gains.length
      ? [
          msg('instr.pioneers.adventure.gains', {
            gains: {
              list: gains,
              sep: 'instr.pioneers.adventure.gainsSep',
              last: 'instr.pioneers.adventure.gainsSep',
            },
          }),
        ]
      : []),
    ...actions,
  ];
  if (parts.length === 0) return null;
  return {
    key: 'msg.join',
    params: {
      text: {
        list: parts,
        sep: 'instr.pioneers.adventure.didSep',
        last: 'instr.pioneers.adventure.didSep',
      },
    },
  };
}

/**
 * Resolve the whole Adventure Action against `bot` (mutated in place, as the other
 * resolvers here do), pushing player instructions onto `instr`.
 */
export function resolveAdventure(
  bot: ChronossusState,
  instr: Instruction[],
  n: number,
  input: AdventureInput,
): AdventureResult {
  const p = bot.pioneers;
  if (!p) throw new Error('resolveAdventure: no Pioneers state');

  const base = boardPower(bot);
  const powerBeforeRoll = base + input.powerSlot;
  const deck = deckFor(powerBeforeRoll);
  const totalPower = powerBeforeRoll + input.die;
  const drawn = input.drawn.map((id) => adventureCard(id)).filter((c): c is AdventureCard => !!c);

  // The deck is picked BEFORE the die: "sum up the power on the Upgrade board (including
  // the strength bonus from the Path marker) ... THEN, it rolls the Adventure die" (p.15).
  instr.push({
    id: `adv-power-${n}`,
    text: msg('instr.pioneers.adventure.power', {
      power: powerBeforeRoll,
      base,
      // A signed number, not an English word: the sign is punctuation, so it fills a
      // param rather than splitting the sentence in two.
      slot: `${input.powerSlot >= 0 ? '+' : ''}${input.powerSlot}`,
      deck,
      die: input.die,
      total: totalPower,
    }),
    detail:
      input.powerSlot === NO_SLOT_PENALTY
        ? msg('instr.pioneers.adventure.noSlot.detail')
        : undefined,
  });

  const taken = chooseAdventureCard(drawn, totalPower);
  let gains: Msg[] = [];
  let actions: Msg[] = [];
  let followUps: Msg[] = [];

  if (!taken) {
    bot.vp += 1;
    instr.push({
      id: `adv-none-${n}`,
      text: msg('instr.pioneers.adventure.neither'),
      effect: { vp: 1 },
    });
  } else {
    p.adventures += 1;
    ({ gains, actions, followUps } = applyCardToBot(bot, instr, n, taken));
    // Unselected cards go to the bottom of their deck; the taken card is discarded.
    for (const c of drawn) {
      const pile = p.decks[c.deck];
      if (c === taken) pile.discard = [...pile.discard, c.id];
      else pile.draw = [...pile.draw, c.id];
    }
  }

  const upgraded = resolvePowerUpgrade(bot, instr, n);
  return {
    powerBeforeRoll,
    totalPower,
    deck,
    drawn,
    taken,
    upgraded,
    gains,
    actions,
    followUps,
  };
}

/**
 * Apply a taken card's (already converted) benefit to the bot, and report what it got —
 * the dialog shows THAT, never the card's printed Success box, which is the player's rule.
 */
function applyCardToBot(
  bot: ChronossusState,
  instr: Instruction[],
  n: number,
  card: AdventureCard,
): { gains: Msg[]; actions: Msg[]; followUps: Msg[] } {
  const b = card.bot;
  /** Things it GAINS ("2 VP") — read as one list after "it gains …". */
  const gains: Msg[] = [];
  /** Things it DOES ("removes 1 Anomaly") — each already a full clause. */
  const actions: Msg[] = [];
  const followUps: Msg[] = [];

  if (b.vp) {
    bot.vp += b.vp;
    gains.push(msg('instr.pioneers.card.vp', { n: b.vp }));
  }
  if (b.energyCores) {
    bot.energyPool.energized += b.energyCores;
    gains.push(plural('instr.pioneers.card.energyCore', b.energyCores));
  }
  for (const [res, amount] of Object.entries(b.resources ?? {})) {
    bot.resources[res as Resource] += amount as number;
    gains.push(
      msg('instr.pioneers.card.piece', {
        n: amount as number,
        piece: msg(`ui.pieceInline.${res}`),
      }),
    );
  }
  for (const [w, amount] of Object.entries(b.workers ?? {})) {
    bot.workers[w as keyof typeof bot.workers] += amount as number;
    gains.push(
      msg('instr.pioneers.card.piece', { n: amount as number, piece: msg(`piece.${w}`) }),
    );
  }
  if (b.resourceChoice) {
    const picked = chooseCardResource(bot, b.resourceChoice.from);
    bot.resources[picked] += b.resourceChoice.count;
    gains.push(
      msg('instr.pioneers.card.piece', {
        n: b.resourceChoice.count,
        piece: msg(`ui.pieceInline.${picked}`),
      }),
    );
  }
  if (b.timeTravel) {
    bot.timeTravelTrack += b.timeTravel;
    actions.push(plural('instr.pioneers.card.timeTravel', b.timeTravel));
  }
  if (b.removeAnomaly && bot.anomalies > 0) {
    bot.anomalies -= 1;
    if (bot.anomalyVps && bot.anomalyVps.length > 0) bot.anomalyVps = bot.anomalyVps.slice(1);
    actions.push(msg('instr.pioneers.card.removeAnomaly'));
  }
  if (b.returnWarpTile && bot.warpTilesOnTimeline > 0) {
    bot.warpTilesOnTimeline -= 1;
    // Not Time Travel: the card just returns a tile, so no past-tile restriction — but the
    // per-Era map still has to lose the one it took.
    bot.warpTilesByEra = removeAnyWarpTile(bot.warpTilesByEra);
    actions.push(msg('instr.pioneers.card.returnWarpTile'));
  }

  const did = adventureDid(gains, actions);
  instr.push({
    id: `adv-card-${n}`,
    // Two keys, not one with a clause spliced in: a card that does nothing reads as a
    // different sentence (D2).
    text: did
      ? msg('instr.pioneers.adventure.takesDid', {
          card: card.name,
          power: card.power,
          did,
        })
      : msg('instr.pioneers.adventure.takes', { card: card.name, power: card.power }),
    // The card's own text is DATA — the card catalog is untranslated — so it stays a
    // plain string.
    detail: [card.bot.conversion, card.bot.note].filter(Boolean).join(' '),
    effect: b.vp ? { vp: b.vp } : undefined,
  });

  // Follow-ups the app cannot apply on the player's physical board.
  if (b.research) {
    followUps.push(plural('instr.pioneers.followUp.research', b.research));
    instr.push({
      id: `adv-research-${n}`,
      text: followUps[followUps.length - 1],
      requiresInput: true,
    });
  }
  if (b.recruit) {
    followUps.push(plural('instr.pioneers.followUp.recruit', b.recruit));
    instr.push({
      id: `adv-recruit-${n}`,
      text: followUps[followUps.length - 1],
      requiresInput: true,
    });
  }
  if (b.construct) {
    followUps.push(
      b.construct === 'superproject'
        ? msg('instr.pioneers.followUp.superproject')
        : msg('instr.pioneers.followUp.building', { building: msg(`piece.${b.construct}`) }),
    );
    instr.push({
      id: `adv-construct-${n}`,
      text: followUps[followUps.length - 1],
      detail: msg('instr.pioneers.followUp.construct.detail'),
      requiresInput: true,
    });
  }

  return { gains, actions, followUps };
}

/** Step 2 — Power Upgrade, on its own so the "ignore a failed step" rule is visible. */
export function resolvePowerUpgrade(
  bot: ChronossusState,
  instr: Instruction[],
  n: number,
): Resource | null {
  const p = bot.pioneers;
  if (!p) return null;
  const pick = powerUpgradeChoice(bot);

  if (pick) {
    bot.resources[pick] -= 1;
    p.upgraded = { ...p.upgraded, [pick]: true };
    instr.push({
      id: `adv-upgrade-${n}`,
      text: msg('instr.pioneers.upgrade.resource', { resource: msg(`ui.pieceInline.${pick}`) }),
      detail: msg('instr.pioneers.upgrade.resource.detail'),
    });
    return pick;
  }

  p.vpTokens += 1;
  instr.push({
    id: `adv-upgrade-vp-${n}`,
    text: msg('instr.pioneers.upgrade.vpToken'),
    detail: msg('instr.pioneers.upgrade.vpToken.detail'),
  });
  return null;
}

/** VP the Upgrade board's tokens are worth at scoring (only under the difficulty option). */
export function upgradeTokenVp(bot: ChronossusState, difficulty: string[]): number {
  if (!bot.pioneers) return 0;
  return difficulty.includes(DIFFICULTY_PIONEERS_VP_TOKENS_COUNT) ? bot.pioneers.vpTokens : 0;
}
