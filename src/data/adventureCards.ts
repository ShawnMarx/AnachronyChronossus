// adventureCards.ts — the 36 Pioneers of New Earth Adventure cards.
//
// 18 per deck, every card unique (verified against the physical reference card's
// quantity table, Classic Expansion p.8). `success` is the VERBATIM Success box from
// the Classic Expansion Appendix (pp.13-14).
//
// The Failure box is deliberately NOT transcribed: the Chronossus only ever takes a
// card whose Power requirement it MEETS — if it meets neither drawn card it simply
// gains 1 VP (Solo Opponents p.15). It can never resolve a Failure.
//
// `bot` is what the Chronossus actually receives, after the four special-case
// conversions on p.15:
//   - W                                   -> 1 VP per 2 W, rounded up
//   - each Morale increase                -> 2 VP
//   - a choice of Research/Recruit/Construct -> always Research
//   - an ongoing (purple) benefit         -> discard it, gain 3 VP and 1 Energy Core
//
// The purple/ongoing cards were confirmed off the card art, not inferred from wording:
// the marker is a PURPLE thumbs-up circle on the Success box instead of a green one.
// Nine cards carry it (7 in the 5+ deck, 2 in the 10+).

import type { BuildingType, Resource, Worker } from '../engine/types';

export type AdventureDeck = '5+' | '10+';

/**
 * What the Chronossus gets from a card, already converted. Anything the app tracks is
 * applied automatically; anything that lives on the physical board (constructing a
 * specific building, taking a Research/Recruit Action) becomes a player instruction,
 * exactly as those Actions work elsewhere in the app.
 */
export interface AdventureBotOutcome {
  vp?: number;
  energyCores?: number;
  resources?: Partial<Record<Resource, number>>;
  workers?: Partial<Record<Worker, number>>;
  /**
   * "1 T/U/G" — the card lets it pick. The rulebook gives no preference, so the app
   * reuses the Mine priority (lacking-first, then Neutronium > Uranium > Gold >
   * Titanium) restricted to the offered Resources.
   */
  resourceChoice?: { count: number; from: Resource[] };
  /** Steps to advance on the Time Travel track. */
  timeTravel?: number;
  /** Anomalies it may remove. */
  removeAnomaly?: number;
  /** Warp tiles it may return from a Timeline tile to its supply. */
  returnWarpTile?: number;
  /** Research Actions to take (each rolls the shape die). */
  research?: number;
  /** Recruit Actions to take. */
  recruit?: number;
  /** A building to construct for free, or a Superproject. */
  construct?: BuildingType | 'superproject';
  /** How the conversion was derived — shown in the dialog so the player can check it. */
  conversion?: string;
  /** Anything else the player needs told. */
  note?: string;
}

export interface AdventureCard {
  /** Stable id, e.g. '5+/00'. Used in saved state, so never renumber. */
  id: string;
  deck: AdventureDeck;
  /** Position in the deck's art sheet — also the asset filename. */
  index: number;
  name: string;
  /** The Power requirement the Chronossus must meet or exceed. */
  power: number;
  /** VERBATIM Success box (Classic Expansion Appendix pp.13-14). */
  success: string;
  /** Purple Success box — an ongoing or repeatable benefit. */
  ongoing: boolean;
  bot: AdventureBotOutcome;
}

/** What every ongoing (purple) card resolves to for the Chronossus. */
const ONGOING: AdventureBotOutcome = {
  vp: 3,
  energyCores: 1,
  conversion:
    'Ongoing (purple) benefit — the Chronossus discards it and gains 3 VP and 1 Energy Core instead.',
};

/** Art path for a card. */
export function adventureCardArt(card: AdventureCard): string {
  const slug = card.deck === '5+' ? '5plus' : '10plus';
  return `/assets/solo/chronossus/adventures/${slug}-${String(card.index).padStart(2, '0')}.jpg`;
}

const DECK_5: AdventureCard[] = [
  {
    id: '5+/00',
    deck: '5+',
    index: 0,
    name: 'Exosuit Malfunction',
    power: 5,
    success: 'Receive 1 Energy Core and 3 W.',
    ongoing: false,
    bot: { energyCores: 1, vp: 2, conversion: '3 W → 2 VP (1 VP per 2 W, rounded up).' },
  },
  {
    id: '5+/01',
    deck: '5+',
    index: 1,
    name: 'Mystical Teachings',
    power: 5,
    success: 'Receive 1 Genius and 3 W.',
    ongoing: false,
    bot: {
      workers: { genius: 1 },
      vp: 2,
      conversion: '3 W → 2 VP (1 VP per 2 W, rounded up).',
    },
  },
  {
    id: '5+/02',
    deck: '5+',
    index: 2,
    name: 'Raid on Nomad Village',
    power: 5,
    success: 'Receive 1 T/U/G and 1 Administrator.',
    ongoing: false,
    bot: {
      resourceChoice: { count: 1, from: ['titanium', 'uranium', 'gold'] },
      workers: { administrator: 1 },
    },
  },
  {
    id: '5+/03',
    deck: '5+',
    index: 3,
    name: 'Nuclear Winter',
    power: 6,
    success: 'Receive 6 W and 1 VP.',
    ongoing: false,
    bot: { vp: 4, conversion: '6 W → 3 VP, plus the card’s own 1 VP.' },
  },
  {
    id: '5+/04',
    deck: '5+',
    index: 4,
    name: 'Data Archives',
    power: 6,
    success:
      'Take 1 Research Action. You may set 1 additional Research die. Receive 1 VP.',
    ongoing: false,
    bot: { research: 1, vp: 1 },
  },
  {
    id: '5+/05',
    deck: '5+',
    index: 5,
    name: 'Journey through the Rift',
    power: 6,
    success: 'You can receive 1 additional Paradox before you receive an Anomaly.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '5+/06',
    deck: '5+',
    index: 6,
    name: 'Irradiated Vermin Tide',
    power: 7,
    success: 'Receive 2 U and 2 VP.',
    ongoing: false,
    bot: { resources: { uranium: 2 }, vp: 2 },
  },
  {
    id: '5+/07',
    deck: '5+',
    index: 7,
    name: 'Ancient Gold Mine',
    power: 7,
    success: 'Receive 2 G and 2 VP.',
    ongoing: false,
    bot: { resources: { gold: 2 }, vp: 2 },
  },
  {
    id: '5+/08',
    deck: '5+',
    index: 8,
    name: 'Forgotten Time Capsule',
    power: 7,
    success:
      'At the end of the game, you qualify for 1 additional Endgame Condition card of your choice (even if you do not meet its condition).',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '5+/09',
    deck: '5+',
    index: 9,
    name: 'Passage of the Five Beasts',
    power: 7,
    success:
      'At the end of the game, the highest space on the Morale track is worth 4 additional VPs for you.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '5+/10',
    deck: '5+',
    index: 10,
    name: 'Temporal Crack',
    power: 8,
    success:
      'You may return one of your Warp tiles from a Timeline tile to your supply. Receive 2 VPs.',
    ongoing: false,
    bot: { returnWarpTile: 1, vp: 2 },
  },
  {
    id: '5+/11',
    deck: '5+',
    index: 11,
    name: 'Electromagnetic Hurricane',
    power: 8,
    success: 'Receive 2 Energy Cores and 1 VP.',
    ongoing: false,
    bot: { energyCores: 2, vp: 1 },
  },
  {
    id: '5+/12',
    deck: '5+',
    index: 12,
    name: 'Tribes of the Outback',
    power: 8,
    success:
      'Receive the following Action for the remainder of the game: Free Action: Trade with Nomads.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '5+/13',
    deck: '5+',
    index: 13,
    name: 'Secret Tunnels',
    power: 8,
    success:
      'You may take a Construct, Recruit or Research Action, then you may take another Construct, Recruit or Research Action.',
    ongoing: false,
    bot: {
      research: 2,
      conversion:
        'Given the choice of Research / Recruit / Construct, the Chronossus always chooses Research — so both Actions are Research.',
    },
  },
  {
    id: '5+/14',
    deck: '5+',
    index: 14,
    name: 'Old Sewers',
    power: 9,
    success:
      'For the remainder of the game, you receive 2 additional W when you take the Purify Water Action.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '5+/15',
    deck: '5+',
    index: 15,
    name: 'Giant Sandworm',
    power: 9,
    success: 'Permanently receive +4 to your Power value.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '5+/16',
    deck: '5+',
    index: 16,
    name: 'Hidden Resource Storage',
    power: 9,
    success:
      'Receive the following Action for the remainder of the game: Free Action: Exchange 1 W to 1 T/U/G.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '5+/17',
    deck: '5+',
    index: 17,
    name: 'Cargo Ship Wreckage',
    power: 9,
    success: 'Receive 1 T, 1 U, 1 G and 1 VP.',
    ongoing: false,
    bot: { resources: { titanium: 1, uranium: 1, gold: 1 }, vp: 1 },
  },
];

const DECK_10: AdventureCard[] = [
  {
    id: '10+/00',
    deck: '10+',
    index: 0,
    name: 'Neutronium Cave',
    power: 10,
    success: 'Receive 2 N and 1 VP.',
    ongoing: false,
    bot: { resources: { neutronium: 2 }, vp: 1 },
  },
  {
    id: '10+/01',
    deck: '10+',
    index: 1,
    name: 'Hostile Nomads',
    power: 10,
    success:
      'Receive 6 W, then take up to 2 Trade with Nomads Actions. Receive 2 VPs.',
    ongoing: false,
    bot: {
      vp: 5,
      conversion: '6 W → 3 VP, plus the card’s own 2 VP.',
      note: 'The Chronossus never collects or spends Water, so it skips the Trade with Nomads Actions.',
    },
  },
  {
    id: '10+/02',
    deck: '10+',
    index: 2,
    name: 'The Time Maker',
    power: 10,
    success: 'Advance 2 steps on the Time Travel track.',
    ongoing: false,
    bot: { timeTravel: 2 },
  },
  {
    id: '10+/03',
    deck: '10+',
    index: 3,
    name: 'Fountain of Life',
    power: 11,
    success: 'Receive 8 W and 2 VPs.',
    ongoing: false,
    bot: { vp: 6, conversion: '8 W → 4 VP, plus the card’s own 2 VP.' },
  },
  {
    id: '10+/04',
    deck: '10+',
    index: 4,
    name: 'Broadcast from the Past',
    power: 11,
    success: 'Gain 2 Morale.',
    ongoing: false,
    bot: { vp: 4, conversion: '2 Morale → 4 VP (2 VP per Morale increase).' },
  },
  {
    id: '10+/05',
    deck: '10+',
    index: 5,
    name: 'Abandoned Factory',
    power: 12,
    success: 'Construct 1 Factory building for free.',
    ongoing: false,
    bot: { construct: 'factory' },
  },
  {
    id: '10+/06',
    deck: '10+',
    index: 6,
    name: 'Uncontaminated Reservoir',
    power: 12,
    success: 'Construct 1 Life Support building for free. Receive 1 VP.',
    ongoing: false,
    bot: { construct: 'support', vp: 1 },
  },
  {
    id: '10+/07',
    deck: '10+',
    index: 7,
    name: 'Underground Laboratory',
    power: 12,
    success: 'Construct 1 Lab building for free.',
    ongoing: false,
    bot: { construct: 'lab' },
  },
  {
    id: '10+/08',
    deck: '10+',
    index: 8,
    name: 'Deserted Carrier',
    power: 13,
    success:
      'Receive the following Action for the remainder of the game: Free Action: Receive a powered-up Exosuit.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '10+/09',
    deck: '10+',
    index: 9,
    name: 'Ancient Temple Ruins',
    power: 13,
    success: 'Receive 4 G and 2 VPs.',
    ongoing: false,
    bot: { resources: { gold: 4 }, vp: 2 },
  },
  {
    id: '10+/10',
    deck: '10+',
    index: 10,
    name: 'Ice-bound Cryochamber',
    power: 13,
    success: 'You may take a Recruit Action, then receive 1 Genius and 2 VPs.',
    ongoing: false,
    bot: { recruit: 1, workers: { genius: 1 }, vp: 2 },
  },
  {
    id: '10+/11',
    deck: '10+',
    index: 11,
    name: 'Rogue AI',
    power: 14,
    success:
      'You may take up to 2 Research Actions. For each Action, you may set 1 additional Research die.',
    ongoing: false,
    bot: { research: 2 },
  },
  {
    id: '10+/12',
    deck: '10+',
    index: 12,
    name: 'Adrenaline Shots',
    power: 14,
    success: 'Receive 3 W, then you may take up to 2 Adventure Actions.',
    ongoing: false,
    bot: {
      vp: 2,
      conversion: '3 W → 2 VP (1 VP per 2 W, rounded up).',
      note: 'The extra Adventure Actions are not taken — the Chronossus takes exactly the one Action its Command marker landed on.',
    },
  },
  {
    id: '10+/13',
    deck: '10+',
    index: 13,
    name: 'Asteroid Debris',
    power: 15,
    success: 'Receive 1 N, 1 T, 1 U, 1 G and 1 VP.',
    ongoing: false,
    bot: {
      resources: { neutronium: 1, titanium: 1, uranium: 1, gold: 1 },
      vp: 1,
    },
  },
  {
    id: '10+/14',
    deck: '10+',
    index: 14,
    name: 'Trails to the Lost City',
    power: 15,
    success:
      'Receive the following Action for the remainder of the game: Free Action: Spend 1 W and gain 1 Morale.',
    ongoing: true,
    bot: ONGOING,
  },
  {
    id: '10+/15',
    deck: '10+',
    index: 15,
    name: 'Secret Military Facility',
    power: 16,
    success: 'Receive 3 Energy Cores and 3 VPs.',
    ongoing: false,
    bot: { energyCores: 3, vp: 3 },
  },
  {
    id: '10+/16',
    deck: '10+',
    index: 16,
    name: 'Unstable Neutronium Core',
    power: 16,
    success:
      'Construct 1 Power Plant building for free. Then, you may remove an Anomaly from your Player board.',
    ongoing: false,
    bot: { construct: 'powerplant', removeAnomaly: 1 },
  },
  {
    id: '10+/17',
    deck: '10+',
    index: 17,
    name: 'Metropolis Ruins',
    power: 18,
    success:
      'Construct any 1 Superproject from the Timeline (from any Era) or any 2 buildings for free.',
    ongoing: false,
    bot: {
      construct: 'superproject',
      note: 'Offered a Superproject or 2 buildings, the Chronossus takes the Superproject.',
    },
  },
];

export const ADVENTURE_CARDS: AdventureCard[] = [...DECK_5, ...DECK_10];

const BY_ID = new Map(ADVENTURE_CARDS.map((c) => [c.id, c]));

export function adventureCard(id: string): AdventureCard | undefined {
  return BY_ID.get(id);
}

/** Every card id in a deck, in printed order (the unshuffled deck). */
export function adventureDeckIds(deck: AdventureDeck): string[] {
  return ADVENTURE_CARDS.filter((c) => c.deck === deck).map((c) => c.id);
}

/** The cards of a deck, for the shared-deck mode's "which did you draw?" picker. */
export function adventureDeckCards(deck: AdventureDeck): AdventureCard[] {
  return ADVENTURE_CARDS.filter((c) => c.deck === deck);
}
