// English defaults for every instruction the Pioneers module emits.
//
// Per-module, beside the rules it describes (the plan's D10). `src/engine/messages.ts`
// folds it in and `src/i18n/surface.ts` publishes it.
//
// An Adventure card's own text (its name, the conversion note) is DATA, not app voice —
// the card catalog is untranslated, so those stay raw strings filling a param here.

export const PIONEERS_MESSAGES: Record<string, string> = {
  // --- The Adventure --------------------------------------------------------------
  'instr.pioneers.adventure.power':
    'Power {power} before the roll — {base} on its Upgrade board, {slot} from the Path marker — so it draws 2 cards from the {deck} deck. The Adventure die adds {die}, for a total Power of {total}.',
  'instr.pioneers.adventure.noSlot.detail':
    'No free Power slot was left on the Adventure board, so it takes -3 instead.',
  'instr.pioneers.adventure.neither':
    'It does not meet either drawn card’s Power requirement — the Chronossus gains 1 VP and both cards go to the bottom of their decks.',
  // Whether the card did anything at all changes the sentence, so the two are separate
  // keys rather than one with a clause spliced in (D2).
  'instr.pioneers.adventure.takes': 'It takes "{card}" (Power {power}).',
  'instr.pioneers.adventure.takesDid': 'It takes "{card}" (Power {power}) — it {did}.',
  // How the card's effects join: "gains 2 VP, removes 1 Anomaly".
  'instr.pioneers.adventure.didSep': ', ',
  'instr.pioneers.adventure.gains': 'gains {gains}',
  'instr.pioneers.adventure.gainsSep': ', ',

  // What a card gave it — one clause each, joined by the two keys above.
  'instr.pioneers.card.vp': '{n} VP',
  'instr.pioneers.card.energyCore.one': '{n} Energy Core',
  'instr.pioneers.card.energyCore.other': '{n} Energy Cores',
  'instr.pioneers.card.piece': '{n} {piece}',
  'instr.pioneers.card.timeTravel.one': 'advances {n} step on the Time Travel track',
  'instr.pioneers.card.timeTravel.other': 'advances {n} steps on the Time Travel track',
  'instr.pioneers.card.removeAnomaly': 'removes 1 Anomaly',
  'instr.pioneers.card.returnWarpTile': 'returns 1 Warp tile from the Timeline to its supply',

  // --- Follow-ups the app cannot apply on the physical board ----------------------
  'instr.pioneers.followUp.research.one': 'Then it takes {n} Research Action.',
  'instr.pioneers.followUp.research.other': 'Then it takes {n} Research Actions.',
  'instr.pioneers.followUp.recruit.one': 'Then it takes {n} Recruit Action.',
  'instr.pioneers.followUp.recruit.other': 'Then it takes {n} Recruit Actions.',
  'instr.pioneers.followUp.superproject':
    'Then it constructs 1 Superproject from the Timeline for free.',
  'instr.pioneers.followUp.building': 'Then it constructs 1 {building} for free.',
  'instr.pioneers.followUp.construct.detail':
    'Tap the printed VP on the tile it took so the Chronossus scores it.',

  // --- Step 2: the Power Upgrade --------------------------------------------------
  'instr.pioneers.upgrade.resource':
    'Power Upgrade: the Chronossus moves 1 {resource} from its board onto its Exosuit Upgrade board.',
  'instr.pioneers.upgrade.resource.detail':
    'It takes whichever placeable Resource it has the most of; ties go Titanium > Gold > Uranium > Neutronium. That Resource is now spent, and its slot adds to the Chronossus’s Power permanently.',
  'instr.pioneers.upgrade.vpToken':
    'Power Upgrade: the Chronossus has no Resource with a free slot, so it places 1 VP token from the supply on its Exosuit Upgrade board instead.',
  'instr.pioneers.upgrade.vpToken.detail':
    'These VP tokens add Power but do NOT count as VP for the Chronossus, unless that difficulty option is on.',
};
