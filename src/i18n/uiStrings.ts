// The app's own voice — chrome, buttons and labels that are NOT rulebook text.
//
// Unlike the rule catalogs, these have no natural home elsewhere, so this file IS their
// source of truth. Keys are grouped by where they appear. Add a string here and it lands
// in the generated `en.json` for translators automatically.
//
// A value may contain `{name}` placeholders, substituted by `t(key, params)`. It may also
// carry the inline markup History already uses (`**bold**`, `{flux}` icon tokens) wherever
// the consumer renders through `HistoryText`. Placeholders are checked against English by
// `i18n.test.ts`, so a locale file cannot silently drop one.

export const UI_STRINGS = {
  // --- Rulebook boxes -------------------------------------------------------
  'rulesBox.label': 'Rulebook text',
  'rulesBox.preamble':
    'When you see these boxes, they contain the exact rules as written in the rulebook.',
  'rulesBox.englishFallback':
    'Rulebook text shown in English — no {language} transcription has been supplied yet.',

  // --- Settings menu --------------------------------------------------------
  'settings.history': 'History',
  'settings.commandView': 'Command View',
  'settings.botAdventureDeck': 'Bot’s own Adventure deck',
  'settings.debugMode': 'Debug mode',
  'settings.tileOutlines': 'Tile outlines',
  'settings.calibrate': 'Calibrate positions',
  'settings.resetGame': 'Reset Game',
  'settings.myHistory': 'My history',
  'settings.language': 'Language',
  'settings.gear': 'Settings',
  'settings.adventureDeck.virtualTitle':
    'The app draws the bot’s Adventure cards from its own shuffled deck',
  'settings.adventureDeck.physicalTitle':
    'The bot draws from your physical Adventure decks; you name the cards',
  'settings.overallStats': 'Overall stats',
  'settings.signedInAs': 'Signed in as {name}',
  'settings.signOut': 'Sign out ({name})',
  'settings.logIn': 'Log in',
  'settings.on': 'ON',
  'settings.off': 'OFF',

  // --- The Action Rounds top bar --------------------------------------------
  // Decorative glyphs (↶ ▶ ✓) stay in the JSX, not in the string: a translator cannot
  // lose or mangle a glyph they never see, and the arrow means the same in every language.
  'common.takeBotAction': 'Take Bot Action',
  'common.botPassed': 'Bot Passed',
  'common.youPass': 'You Pass',
  'common.youPassed': 'You passed',
  'common.undo': 'Undo',

  // --- Home screen ----------------------------------------------------------
  'landing.title': 'Anachrony Solo Assistant',
  'landing.subtitle': "Play against the game's automated Solo opponents",
  'landing.intro':
    'An unofficial companion app for running the Solo opponents in [**Anachrony**](store), ' +
    "published by Mindclash Games. It runs the opponent's turns, rolls its dice, and tells " +
    'you where to move its pieces — and teaches you how to play against it along the way. ' +
    "You'll need the physical game to play, and you should already know (or be willing to " +
    'learn) the base game on your own.',
  'landing.partOfBge': 'Part of [BoardGameEdge](bge) — more play aids for the games on your table.',
  'landing.disclaimer':
    'Unofficial fan-made aid. Anachrony and its artwork are © Mindclash Games. This app ' +
    'requires owning the physical game.',
  'landing.comingSoon': 'Coming Soon',
  'landing.play': 'Play',
  'landing.playAgainst': 'Play against the {name}',
  'landing.soonAria': '{name} — coming soon',
  'landing.artworkAlt': '{name} artwork',
  'landing.chronobot.tagline': 'The base-game automa · easiest place to start',
  'landing.chronobot.description':
    'Supports the base game, with optional difficulty adjustments. A streamlined opponent ' +
    'driven by a handful of Command tokens.',
  'landing.chronossus.tagline': 'The advanced automa · more modes, more depth',
  'landing.chronossus.description':
    'A deeper opponent supporting every official module and their combinations. The app ' +
    'tracks its Energy Pool, modular Action tiles, and scoring, and explains each Action ' +
    'as it resolves.',
  'landing.savedAtUnknown': 'an earlier session',

  // --- Home screen: the login control ---------------------------------------
  'landing.auth.historyTitle': 'Your play history, and BG Stats export / import',
  'landing.auth.overallTitle': 'Overall stats across all players',
  'landing.auth.overall': 'Overall stats',
  'landing.auth.signOut': 'Sign out',
  'landing.auth.logIn': 'Log in',

  // --- Home screen: the continue / discard prompt ---------------------------
  'landing.resume.continueTitle': 'Continue your {bot} game?',
  'landing.resume.continueBody': 'You have a game in progress, last played on **{when}**.',
  'landing.resume.continueBtn': 'Continue game',
  'landing.resume.newBtn': 'Start a new game',
  'landing.resume.cancel': 'Cancel',
  'landing.resume.otherTitle': 'Start a {bot} game?',
  'landing.resume.otherBody':
    'You have a saved **{other}** game (last played **{when}**). Only one opponent can be ' +
    'active at a time — starting the {bot} will discard it.',
  'landing.resume.resumeOther': 'Resume {other}',
  'landing.resume.discardStart': 'Discard & start {bot}',

  // --- Chronobot setup flow -------------------------------------------------
  'setup.eyebrow.new': 'New Game',
  'setup.eyebrow.difficulty': 'Difficulty',
  'setup.eyebrow.setup': 'Setup',
  'setup.title.flavor': 'The Chronobot',
  'setup.title.difficulty': 'Increasing the Difficulty',
  'setup.title.setup': 'Setup Instructions',
  'setup.home': 'Back to the home screen',
  'setup.heroAlt': 'Chronobot',
  'setup.continue': 'Continue',
  'setup.back': 'Back',
  'setup.beginEra1': 'Begin Era 1',
  'setup.flavor':
    'The Chronobot was sent back from a devastated alternate future with the objective of ' +
    'finding and eliminating the cause of a war that destroyed everything. Though created ' +
    'with the best intentions, it has identified humanity as the real problem—the root of ' +
    'the destruction to come. Misinterpreting its original task, the Chronobot is now ' +
    'determined to take over the leadership of all humankind, even if it has to destroy ' +
    'the Paths, or the Capital itself, to achieve its goal.',
  'setup.difficultyNote':
    'Select one or more of these options to increase the difficulty of the solo game ' +
    'against the Chronobot. You can also play with none for the standard game.',
  'setup.diff.rebootAdvance.label': 'Advance off Reboot immediately',
  'setup.diff.rebootAdvance.detail':
    'Immediately advance the token when it moves onto the Reboot Action. This will ensure ' +
    'that it will perform an Action on every turn.',
  'setup.diff.noLeader.label': 'Play without your Leader power',
  'setup.diff.noLeader.detail': 'Play without using your Leader power.',
  'setup.diff.botExtraTurn.label': 'One extra Chronobot turn after you pass',
  'setup.diff.botExtraTurn.detail': 'The Chronobot takes one additional turn after you have passed.',
  'setup.diff.minActions6.label': 'Raise minimum Actions to 6',
  'setup.diff.minActions6.detail': "Increase the minimum number of Chronobot's Actions from 3 to 6.",
  'setup.diff.hexUnavailable.label': 'Cover the right World Council space',
  'setup.diff.hexUnavailable.detail':
    'Base-game variant: cover the right World Council space with a Hex Unavailable tile. ' +
    '(This constrains your own board — the app changes nothing.)',
  // Short forms of the same flags, shown on the Turn-overview difficulty chip. They are
  // deliberately worded as "what is in force" rather than "what to choose", so they are
  // their own keys and not a reuse of the setup labels above.
  'setup.diffChip.rebootAdvance': 'Advance off Reboot immediately',
  'setup.diffChip.noLeader': 'Play without your Leader power',
  'setup.diffChip.botExtraTurn': 'One extra Chronobot turn after you pass',
  'setup.diffChip.minActions6': 'Minimum Actions raised to 6',
  'setup.diffChip.hexUnavailable': 'Right World Council space covered (Hex Unavailable)',

  'setup.app.title': 'Setup for this app',
  'setup.app.intro':
    'Set up a 2-player game, with the Chronobot as one of the players. There’s no need for ' +
    'the Chronobot board.',
  'setup.app.bullets':
    'The Chronobot receives its 6 Exosuits and 8 Warp tiles; it does not receive any ' +
    'Starting Assets or Workers.\n' +
    'Leave all Endgame Condition cards in the box.\n' +
    'The Chronobot does not use a Focus marker.\n' +
    'Place the Chronobot’s Banner on the First Player spot; it is the First Player in the ' +
    '1st Era. You receive 1 additional Water (for being the second player).\n' +
    'You may still choose to use either the “A” or the “B” side of your Player board.\n' +
    'For a more challenging game, use the variant rule described in the base game rulebook: ' +
    'cover the right World Council space with a Hex Unavailable tile.',
  'setup.app.vpNote':
    'This app tracks **all** of the Chronobot’s VP for you and explains each Action’s rules ' +
    'as it takes them. Building VP is counted as tiles are discarded, rather than placed on ' +
    'the bot’s board.',
  'setup.rulesBoxLabel': 'Setup',

  // --- Chronossus setup: where the bot's Adventure cards come from ----------
  'cxSetup.adventureDeck.virtual.label': 'Its own deck (recommended)',
  'cxSetup.adventureDeck.virtual.detail':
    'The app keeps its own shuffled copy of both Adventure decks, draws for the Chronossus ' +
    'and shows you the card. Your physical decks are never touched, so the bot can’t ' +
    'deplete or reorder them.',
  'cxSetup.adventureDeck.shared.label': 'Your physical decks',
  'cxSetup.adventureDeck.shared.detail':
    'The Chronossus draws from the same decks you do. The app tells you its Power and which ' +
    'deck to draw 2 cards from, and you tell it which cards came up.',

  // --- Chronossus setup: difficulty options ---------------------------------
  'cxSetup.diff.altTimelines3vp.label': 'Alternate Timelines: 3 VP per positive effect',
  'cxSetup.diff.altTimelines3vp.detail': 'The Chronossus scores 3 VPs per positive effect instead of 2.',
  'cxSetup.diff.doomsdayNoPlanned.label': 'Doomsday: play without the Planned Experiments variant',
  'cxSetup.diff.doomsdayNoPlanned.detail':
    'By default the Level 2 Experiment stack sits face up and a claimed Experiment is ' +
    'replaced from it immediately. Without the variant the stack is face down and Level 2 ' +
    'Experiments are dealt under the Timeline in the Preparation phase instead — the ' +
    'rulebook suggests keeping the variant on for your first few games.',
  'cxSetup.diff.doomsdaySeedMarkers.label': 'Doomsday: it starts with Path markers on future Experiments',
  'cxSetup.diff.doomsdaySeedMarkers.detail':
    'Place 1/2/3 of the Chronossus’s Path markers on future Experiments during setup. ' +
    'They become available to it once they are in the present, so it can execute an ' +
    'Experiment on its very first Experiment Action.',
  'cxSetup.diff.extraEnergy.label': 'Extra starting Energy Cores',
  'cxSetup.diff.extraEnergy.detail':
    'Increase the number of Energy Cores by 1/2/3 in the Energy Pool at the beginning of ' +
    'the game.',
  'cxSetup.diff.extraPowerup.label': 'One extra powered Exosuit each Era',
  'cxSetup.diff.extraPowerup.detail':
    'The Chronossus powers up one additional Exosuit each Era for free. If this would ' +
    'exceed its maximum number of Exosuits, it gains 2 VPs instead for each excess Energy ' +
    'Core drawn (those Energy Cores are still removed from the game).',
  'cxSetup.diff.failedActionVp.label': 'Failed Actions score VP',
  'cxSetup.diff.failedActionVp.detail': 'The Chronossus gains 2 VPs for each Failed Action.',
  'cxSetup.diff.fewerObjectives.label': 'Fewer (or no) Solo Objectives',
  'cxSetup.diff.fewerObjectives.detail': 'Play with fewer (or no) Solo Objectives.',
  'cxSetup.diff.fracturesC14.label': 'Fractures: replace C04 with C14',
  'cxSetup.diff.fracturesC14.detail':
    'C14 is a more difficult tile — Assimilate, but it also gains 1 additional Flux Core.',
  'cxSetup.diff.fracturesExtraFlux.label': 'Fractures: extra starting Flux Cores',
  'cxSetup.diff.fracturesExtraFlux.detail':
    'Increase the number of Flux Cores in the Flux Pool by 1/2/3 at the beginning of the ' +
    'game — a fuller pool means it Blinks more often.',
  'cxSetup.diff.fracturesLeftoverFluxVp.label': 'Fractures: leftover Flux Cores score',
  'cxSetup.diff.fracturesLeftoverFluxVp.detail':
    'Each leftover Flux Core in the Flux Pool at the end of the game is worth 1 VP to the ' +
    'Chronossus.',
  'cxSetup.diff.fracturesPlayerGlitch.label': 'Fractures: roll a starting Glitch for yourself',
  'cxSetup.diff.fracturesPlayerGlitch.detail':
    'Roll the Glitch die after setup and place the rolled Glitch for yourself, in ' +
    'addition to the two starting Glitches from the Fractures of Time rules.',
  'cxSetup.diff.guardiansPostimpact2vp.label': 'Guardians: Acquire Guardian scores 2 VP post-Impact',
  'cxSetup.diff.guardiansPostimpact2vp.detail':
    'After the Impact the Chronossus can no longer acquire Guardians. Instead of the ' +
    'usual Failed Action, it scores 2 VPs when it resolves the Acquire Guardian Action.',
  'cxSetup.diff.guardiansStart1.label': 'Guardians: it starts the game with 1 Guardian',
  'cxSetup.diff.guardiansStart1.detail':
    'The Chronossus starts with 1 Guardian — place one of its Path markers on an empty ' +
    'Guardian board slot at setup, and give it a Guardian.',
  'cxSetup.diff.hypersyncTargeted.label': 'Hypersync: take your oldest tile’s space (no random roll)',
  'cxSetup.diff.hypersyncTargeted.detail':
    'Instead of randomly selecting a Hypersync Action space to take, the Chronossus takes ' +
    'the one corresponding to one of your pending Hypersync tiles. If you have more than ' +
    'one, it takes the one furthest in the past.',
  'cxSetup.diff.leftoverEnergyVp.label': 'Leftover Energy Cores score VP',
  'cxSetup.diff.leftoverEnergyVp.detail':
    'Each leftover (non-exhausted) Energy Core in the Energy Pool at the end of the game ' +
    'is worth 1 VP to the Chronossus.',
  'cxSetup.diff.pioneersBoardB.label': 'Pioneers: flip its Exosuit Upgrade board to the B side',
  'cxSetup.diff.pioneersBoardB.detail':
    'The Chronossus starts with a Power value of 3 instead of 2, and each VP token on its ' +
    'Upgrade board is worth 3 Power instead of 2.',
  'cxSetup.diff.pioneersVpTokensCount.label': 'Pioneers: VP tokens on the Upgrade board count as VP',
  'cxSetup.diff.pioneersVpTokensCount.detail':
    'By default the VP tokens it places when it cannot upgrade a Resource add Power but ' +
    'are not worth VP. With this on, each one also scores 1 VP at the end.',
  'cxSetup.diff.ql2vp.label': 'Quantum Loops: 2 VP per card removed',
  'cxSetup.diff.ql2vp.detail': 'When removing a Quantum Loop card, the Chronossus receives 2 VPs.',
  'cxSetup.diff.qlRemoveOn5.label': 'Quantum Loops: also remove a card on a roll of 5',
  'cxSetup.diff.qlRemoveOn5.detail':
    'The Warp Phase check removes a Quantum Loop card on a roll of 4 or 5, not just a 4.',
  'cxSetup.diff.researchNewShape.label': 'Research takes a new Breakthrough shape',
  'cxSetup.diff.researchNewShape.detail':
    'When taking a Research Action, the Chronossus takes a Breakthrough shape it does not ' +
    'already possess.',
  'cxSetup.diff.swapTiles.label': 'Swap Action tiles between spaces',
  'cxSetup.diff.swapTiles.detail': 'Swap the Action tiles between Slot I and Slot III (the two marked spaces).',
  'cxSetup.diff.tilesBSide.label': 'Flip Action tiles to their B side',
  'cxSetup.diff.tilesBSide.detail': 'Flip some or all of the Action tiles to their B side (pick which below).',
  'cxSetup.diff.worldCouncil.label': 'Cover the right World Council space',
  'cxSetup.diff.worldCouncil.detail':
    'For a more challenging game, cover the right World Council space with a Hex ' +
    'Unavailable tile. (This constrains your own board — the app changes nothing.)',

  // --- Rules reference frame ------------------------------------------------
  'rulesFrame.backToGame': 'Back to Game',
  'rulesFrame.backToGameTitle': 'Return to the game',
  'rulesFrame.viewGroup': 'Rules view',
  'rulesFrame.chat': 'Chat',
  'rulesFrame.resources': 'Resources',
  'rulesFrame.split': 'Split',
  'rulesFrame.splitTitle': 'Side-by-side chat + rules',
  'rulesFrame.home': 'Back to the home screen',
  'rulesFrame.frameTitle': 'Anachrony rules reference',
  'rulesFrame.open': 'Rules',
  'rulesFrame.openTitle': 'Open the rules reference',

  // --- The turn log ---------------------------------------------------------
  'history.title': 'History',
  'history.empty': 'No turns taken yet.',
  'history.close': 'Close history',
  'history.dieAria': 'AI die {n}',

  // --- The phase-screen frame -----------------------------------------------
  'phaseScreen.home': 'Back to the home screen',
  'phaseScreen.eyebrow': 'Era {era} · Phase {phase}',
  'phaseScreen.tabPhase': 'Phase',
  'phaseScreen.tabBoard': 'Board',

  // --- Saved-game history screen --------------------------------------------
  'gameHistory.title': 'Your game history',
  'gameHistory.close': 'Close',
  'gameHistory.loading': 'Loading…',
  'gameHistory.none': 'No games yet. Finish a game and choose **Save to my history** on the score screen.',
  'gameHistory.selectAll': 'Select all games',
  'gameHistory.result': 'Result',
  'gameHistory.difficulty': 'Difficulty',
  'gameHistory.delete': 'Delete this game',
  'gameHistory.exportSelected': '{n} selected',
  'gameHistory.exportAll': 'all',
  'gameHistory.export': 'Export {what} to BG Stats',
  'gameHistory.import': 'Import from BG Stats',
  'gameHistory.selectOne': 'Select the game played on {date}',
  'gameHistory.date': 'Date',
  'gameHistory.you': 'You',
  'gameHistory.bot': 'Bot',
  'gameHistory.era': 'Era',
  'gameHistory.win': 'Win',
  'gameHistory.loss': 'Loss',
  'gameHistory.imported': 'imported',
  'gameHistory.err.load': 'Could not load your history. Are you still signed in?',
  'gameHistory.err.delete': 'Delete failed — try again.',
  'gameHistory.err.notJson': 'That file is not valid JSON (expected a BG Stats export).',
  'gameHistory.err.noPlays': 'No plays found in that file.',
  'gameHistory.err.import': 'Import failed — try again.',
  'gameHistory.importedN': 'Imported {n} game.',
  'gameHistory.importedNPlural': 'Imported {n} games.',
  // --- Turn overview + phase header controls --------------------------------
  'turnBar.outsideActions':
    'Outside the Action Rounds — the counts and recent turns below are this Era so far.',
  'turnBar.undoTitle': 'Undo the last committed step',
  'turnBar.historyTitle': 'Turn history',
  'turnBar.turn': 'Turn',
  'turnBar.chipTitle': 'Turn tracker — pass status & recent bot turns',
  'turnBar.chipTitleActions': 'Turn tracker — pass status, minimum Actions & recent bot turns',

  // --- The Action Rounds top bar (titles + aria) ----------------------------
  'topBar.home': 'Back to the home screen',
  'topBar.botPassedTitle': 'The Chronobot has passed for this Era',
  'topBar.takeActionTitle': 'Roll the AI die (faces {faces}) and activate that Command token',
  'topBar.dieAria': 'AI die shows {n}',
  'topBar.passTitle': 'Pass for the Action Rounds phase',
  'topBar.undoTitle': 'Undo the last step (restores the same die roll)',

  // --- Non-Action phase bodies (Chronobot) ----------------------------------
  'phaseBody.endBanner': '✓ Everyone has passed — the Action Rounds Phase is complete.',
  'phaseBody.continueToCleanUp': 'Continue to Clean Up',
  'phaseBody.continue': 'Continue',
  'phaseBody.preparation':
    'No changes for the Chronobot this phase — set up the Era as normal, then continue.',
  'phaseBody.powerup':
    "Power up **{n}** of the Chronobot's Exosuits (Eras 1–4 → 6, Eras 5–7 → 4). Collect " +
    'those Exosuits to place when the app prompts you; it neither gains nor spends Energy ' +
    'Cores or Water.',
  'cleanUp.retrieve': "Retrieve the Chronobot's Exosuits along with your own.",
  'cleanUp.impact':
    '**The Impact occurs now** — resolve it using the usual procedure at the end of Era 4. ' +
    'From Era 5 on, the Chronobot powers up 4 Exosuits instead of 6.',
  'cleanUp.collapsing':
    'Flip using the usual procedure the Collapsing Capital tiles, then check for game end.',
  'cleanUp.finishAndScore': 'Finish & Score',
  'cleanUp.allFlippedQ': 'Flip the Collapsing Capital tiles. Are they now **all** flipped?',
  'cleanUp.endedYes': '✓ Yes — the game has ended, Finish & Score',
  'cleanUp.continuesNo': '✗ No — the game continues, start Era {era}',
  'cleanUp.endEra': 'End the Era — start Era {era}',

  // --- Paradox phase (shared by both bots) ----------------------------------
  'paradoxPhase.intro':
    'The {bot} rolls for Paradoxes on each past Timeline tile where it has the most (or ' +
    'tied-most) Warp tiles. It keeps checking until it gains an Anomaly.',
  'paradoxPhase.hypersyncNote':
    '**Hypersync:** a Hypersync tile counts as a Warp tile when deciding who has the most ' +
    'Warp tiles on a Timeline tile — but a tile with **zero** Warp tiles never rolls, even ' +
    'with a Hypersync tile present.',
  'paradoxPhase.paradoxAlt': 'Paradox',
  'paradoxPhase.ask':
    'Does the {bot} still have the most (or tied-most) Warp tiles on a past Timeline ' +
    'tile{hypersync}? Keep rolling for each such tile.',
  'paradoxPhase.hypersyncCount': ' (Hypersync tiles count)',
  'paradoxPhase.rollsUsed': '{asked} of up to {max} roll this phase.',
  'paradoxPhase.rollsUsedPlural': '{asked} of up to {max} rolls this phase.',
  'paradoxPhase.yes': 'Yes — it ties or leads (roll)',
  'paradoxPhase.no': 'No — done',
  'paradoxPhase.noShort': 'No',
  'paradoxPhase.hypersyncExtra':
    '**Hypersync — extra Paradox roll.** The player(s) with the most total Hypersync tiles ' +
    'in play make one more Paradox roll. Does the {bot} have the most (or tied-most) total ' +
    'Hypersync tiles in play (it has **{n}**)?',
  'paradoxPhase.noWarpHypersync':
    'The {bot} has no Warp tiles on the Timeline — its Warp-tile Paradox checks are skipped.',
  'paradoxPhase.noWarp':
    'The {bot} has no Warp tiles on the Timeline — it rolls no Paradoxes this phase.',
  'paradoxPhase.continueToPowerUp': 'Continue to Power Up',
  'paradoxPhase.paradoxes': 'Paradoxes',
  'paradoxPhase.anomalies': 'Anomalies',
  'paradoxPhase.warpTiles': 'Warp tiles',
  'paradoxPhase.hypersync': 'Hypersync',
  'paradoxPhase.hypersyncRulesLabel': 'Hypersync in the Paradox Phase',
  'paradoxPhase.hypersyncCite': 'Future Imperfect rulebook, p. 5',

  // --- Score screen (Chronobot) ---------------------------------------------
  'score.title': 'Final Score — Era {era}',
  'score.close': 'Close',
  'score.botVp': 'Chronobot VP',
  'score.yourScore': 'Your score',
  'score.modeNumber': 'Number',
  'score.modeTally': 'Tally sheet',
  'score.numberPlaceholder': 'Enter your total VP',
  'score.clearField': 'Clear {field}',
  'score.clear': 'Clear',
  'score.yourTotal': 'Your total:',
  'score.tallyDone': 'Done — use this total',
  'score.win': '🎉 You win! (more points than the Chronobot)',
  'score.lose': 'You lose — the Chronobot has at least as many points.',
  'score.loginToSave': 'Log in to save this game to your history.',
  'score.loginAndSave': 'Log in & save',
  'score.enterToSave': 'Enter your score above to save this game to your history.',
  'score.saving': 'Saving…',
  'score.saved': '✓ Saved to your history',
  'score.saveFailed': "Couldn't save automatically.",
  'score.logIn': 'Log in',
  'score.retry': 'Retry',
  'score.rulesLabel': 'End Game scoring',
  'score.newGame': 'New Game',
  'score.err.expired':
    'Your login session expired. This game is saved on this device and will upload once ' +
    'you log in.',
  'score.err.rejected':
    "You're still logged in, but the history service rejected the save. This game is " +
    "saved on this device and will upload once that's fixed.",
  'score.err.unreachable':
    "Couldn't reach your history service. This game is saved on this device and will " +
    'upload next time.',

  // --- Action dialogs (shared by both bots; {bot} is the opponent's name) ----
  // Every bold run marks a board location or component the player has to act on, so
  // these render through `<T>` and stay one key each.
  'dialog.close': 'Close',
  'figure.exosuit': 'Exosuit',
  'figure.guardian': 'Guardian',
  'dialog.startTurn': 'Start Your Turn',
  'dialog.advanceAutoleap': 'Advance to Autoleap Action',
  'dialog.space.construct': 'Construct',
  'dialog.space.research': 'Research',
  'dialog.rule.construct': 'Construct',
  'dialog.mechRulesCta': '📖 Placing the {bot}’s Exosuit',

  // Placement gate
  'dialog.mech.place':
    'Place the {bot}’s {figure} on the topmost available **{space}** Action space (or a ' +
    'World Council space if none are free).',
  'dialog.mech.askOpen': 'Is a **{space}** Action space open (not World Council)?',
  'dialog.mech.askOpenPlace':
    'Is a **{space}** Action space open (not World Council)? Place the {bot}’s {figure} ' +
    'on the topmost one.',
  'dialog.mech.blinkFirst':
    'Don’t place anything yet — the {bot} Blink-checks first, and a Blink moves an ' +
    'Exosuit it already has on the board instead.',
  'dialog.mech.coreNoBlink':
    'Put an Energy Core from the supply into that Exosuit. (No Blink is possible, so it ' +
    'places as usual.)',
  'dialog.mech.confirmPlaced': '✓ Confirm placed',
  'dialog.mech.yesCheckBlink': '✓ Yes — check for Blink',
  'dialog.mech.yesPlacedThere': '✓ Yes — placed there',
  'dialog.mech.noneOpen': '✗ No — none open',
  'dialog.mech.cannotPlace': '✗ Cannot place',

  // Guardians: the Guardian-board fallback
  'dialog.guardian.instruct':
    'No Action space was open, so the {bot} places a **Guardian** on the **Guardian ' +
    'board**, on an open space marked with one of its **Path markers** — and performs the ' +
    'Action from there.',
  'dialog.guardian.sub':
    'It doesn’t matter which of its marked spaces you use. This is **not** a Failed ' +
    'Action, so it takes no +1 VP.',
  'dialog.guardian.confirm': '✓ Placed on the Guardian board',

  // World Council overflow
  'dialog.wc.ask': 'No **{space}** space was open. Is the **World Council** space open?',
  'dialog.wc.askPlace':
    'No **{space}** space was open. Is the **World Council** space open? Place the ' +
    '{bot}’s {figure} there instead.',
  'dialog.wc.subBlink':
    'It still performs the Action from there. Nothing to place yet — the Blink check ' +
    'comes first.',
  'dialog.wc.subCore':
    'It still performs the Action from there. Put an Energy Core from the supply into ' +
    'that Exosuit.',
  'dialog.wc.yesBlink': '✓ Yes — check for Blink',
  'dialog.wc.yesPlaced': '✓ Yes — placed on World Council',
  'dialog.wc.no': '✗ No — nothing open',

  // Construct
  'dialog.construct.superproject':
    'Take the **highest-VP Superproject** (oldest if tied). Tap its printed VP (3–8).',
  'dialog.construct.building':
    'Take the higher-VP **{building}** (secondary stack if tied). Tap its printed VP ' +
    '(1–4) — then discard it.',

  // Mine
  'dialog.mine.ask': '**Is there one or more Mining Action space available?**',
  'dialog.mine.blinkSub':
    'Nothing to place yet — the Blink check comes first, and a Blink moves an Exosuit ' +
    'the {bot} already has on the board into that space instead.',
  'dialog.mine.yesBlink': '✓ Yes — check for Blink',
  'dialog.mine.yesOpen': '✓ Yes — a Mining space is open',
  'dialog.mine.no': '✗ No open Mining space',
  'dialog.mine.place':
    'Place the {bot}’s Exosuit in an open **Mine** space granting the best 2 Resources by ' +
    'priority order below, based on lacking-first. Give it those **2 Resources** ' +
    '(pre-selected; adjust to match the space — click a cube twice for **×2**), then ' +
    '**discard those 2 Resource cubes from the board**.',
  'dialog.mine.find':
    'Find the open **Mine** space granting the best 2 Resources by priority order below, ' +
    'based on lacking-first. Give it those **2 Resources** (pre-selected; adjust to match ' +
    'the space — click a cube twice for **×2**), then **discard those 2 Resource cubes ' +
    'from the board**.',

  // Recruit
  'dialog.recruit.instruct':
    'Recruit the highest-priority **Worker** the {bot} lacks by the priority order below ' +
    '(missing-first); if that type isn’t available, take the next available one. Pick the ' +
    'recruited Worker (+1 VP) — then discard its Worker tile from the board.',

  // Recruit Genius / Research
  'dialog.genius.ask':
    'Is a **Genius** available to recruit **and** an open Recruit Action space (or World ' +
    'Council space)? If so, the {bot} recruits a Genius. If not, it performs a Research ' +
    'action instead.',
  'dialog.genius.yes': '✓ Yes — recruit a Genius',
  'dialog.genius.no': '✗ No — Research instead',
  'dialog.genius.recruitPlaced':
    'The {bot} recruits a **Genius** from that Recruit space, removing it from the board. ' +
    'The bot gains 1 VP.',
  'dialog.genius.recruitPlace':
    'Place the {bot}’s Exosuit on the topmost available **Recruit** Action space (or a ' +
    'World Council space if full) and recruit a **Genius**, removing it from the board. ' +
    'The bot gains 1 VP.',

  // Research
  'dialog.research.rolled':
    'The shape die rolled **{shape}** — the {bot} keeps a **{shape}** Breakthrough.',
  'dialog.research.newShape':
    'Difficulty: the {bot} takes a Breakthrough shape it doesn\'t already have (or has ' +
    'the fewest of) — a **{shape}** Breakthrough.',

  // Reboot
  'dialog.reboot': 'Reboot: {bot} does nothing.',

  // Time Travel
  'dialog.timeTravel.fromEra':
    'Remove one of the {bot}’s **Warp tiles** from **{tile}** — the past tile where it ' +
    'has the most (oldest if tied).',
  'dialog.timeTravel.anyPast':
    'Remove one of the {bot}’s **Warp tiles** from the past Timeline tile where it has ' +
    'the most (oldest if tied).',
  'dialog.timeTravel.failCurrentEra':
    'Failed Action: the {bot}’s only Warp tiles are on the **current Era’s Timeline ' +
    'tile**, which Time Travel may not take from — it takes **+{vp} VP** instead (no ' +
    'Exosuit placed).',
  'dialog.timeTravel.failNone':
    'Failed Action: the {bot} has **no Warp tiles** on the Timeline, so it cannot Time ' +
    'Travel — it takes **+{vp} VP** instead (no Exosuit placed).',

  // Remove Anomaly
  'dialog.anomaly.instruct':
    'The {bot} discards **{discards}** and removes **1 Anomaly** from its board.',
  'dialog.anomaly.sub': 'Remove Anomaly places no Exosuit.',
  // The discard list reads mid-sentence ("discards **2 titanium + 1 gold**"), so these
  // are the piece names in running text rather than the capitalised `piece.*` labels.
  'dialog.anomaly.cubes': '{n} {resource}',
  'dialog.anomaly.cubeJoin': ' + ',
  'dialog.anomaly.reason.none': 'it has no Anomaly to remove',
  'dialog.anomaly.reason.cubes': 'it lacks 2 Resource cubes (or a Neutronium) to spend',
  'pieceInline.neutronium': 'neutronium',
  'pieceInline.titanium': 'titanium',
  'pieceInline.gold': 'gold',
  'pieceInline.uranium': 'uranium',
  'pieceInline.water': 'water',
  'dialog.anomaly.fail':
    'Failed Action: {reason} — the {bot} takes +{vp} VP instead (no Exosuit placed).',

  // --- Simple Command View --------------------------------------------------
  'scv.title': 'What Chronobot might do next',
  'scv.rowTitle': 'Show the {action} rules',
  'scv.dieLabel': 'AI die faces',
  'scv.rulesLabel': 'How the AI die moves the tokens',
  'scv.toggleHide': 'Simple Command View — click to hide',
  'scv.toggleShow': 'Simple Command View — click to show',
  'scv.hide': 'Hide',
  'scv.show': 'Show',

  // --- The Chronobot VP breakdown (pill popover + score screen) -------------
  'vp.tokenVP': 'Token VP',
  'vp.tokenVP.tip': 'Everything except Buildings, Time Travel & Breakthroughs',
  'vp.buildingVP': 'Building VP',
  'vp.buildingVP.tip': 'From Construct actions (Buildings & Superprojects)',
  'vp.timeTravel': 'Time Travel',
  'vp.timeTravel.tip': "From the Time Travel marker's track position (0/2/4/…/12)",
  'vp.breakthroughs': 'Breakthroughs (1 each)',
  'vp.breakthroughs.tip': '1 VP per Breakthrough',
  'vp.breakthroughSets': 'Breakthrough sets (+2 each)',
  'vp.breakthroughSets.tip': '+2 VP per complete shape set (one of each)',
  'vp.anomalies': 'Anomalies (−3 each)',
  'vp.anomalies.tip': '−3 VP per remaining Anomaly',
  'vp.total': 'Total',
  'vp.botTurns': 'Bot turns taken',
  'vp.pillTitle': 'Click for the full VP breakdown',
  'vp.pillUnit': 'VP',
  'vp.popoverTitle': 'Chronobot VP',

  // --- The player's own score tally -----------------------------------------
  'tally.buildings': 'Buildings',
  'tally.anomalies': 'Anomalies',
  'tally.superprojects': 'Superprojects',
  'tally.timeTravel': 'Time Travel',
  'tally.morale': 'Morale',
  'tally.vpTokens': 'Victory Point tokens',
  'tally.endgame': 'Endgame Conditions',
  'tally.breakthroughs': 'Breakthroughs (×1 each)',
  'tally.breakthroughSets': 'Breakthrough sets (×2 each)',
  'tally.timelinePenalties': 'Timeline penalties (−)',

  // --- The bot's pass decision, in words ------------------------------------
  'passDecision.continue':
    'The bot alternates turns with you and only passes once either you have passed and it ' +
    'has taken at least its minimum of {min} turns, or it has used all its Exosuits and ' +
    'taken one additional Time Travel action.',
  'passDecision.continueExtra':
    'Difficulty: the Chronobot takes one additional turn after you passed — roll the AI ' +
    'die for it.',
  'passDecision.mustContinueMin':
    'The Chronobot is out of Exosuits but has not taken {min} Actions yet — it keeps ' +
    'taking turns (Time Travel / Reboot) until it reaches {min}.',
  'passDecision.timeTravelThenPass':
    'The Chronobot is out of Exosuits — it takes a final Time Travel Action (if able), ' +
    'then passes.',
  'passDecision.pass': 'The Chronobot passes for this Era.',

  // --- Warp phase (shared by both bots; {bot} is the opponent's name) --------
  'warpPhase.tileLabel': 'the current Timeline tile',
  'warpPhase.orderBotFirst':
    'Warping occurs in player order. The {bot} is First Player this Era, so it Warps ' +
    'first — roll for it below, then place your own 0–2 Warp tiles as normal.',
  'warpPhase.orderYouFirst':
    'Warping occurs in player order. You are First Player this Era, so place your own ' +
    '0–2 Warp tiles first, then roll for the {bot}.',
  'warpPhase.roll': "Roll for the {bot}'s Warp",
  'warpPhase.tileAlt': '{bot} Warp tile',
  'warpPhase.none': 'The {bot} rolled no Paradoxes — it places no Warp tiles this phase.',
  'warpPhase.placed':
    'The {bot} rolled {n} Paradox — place {n} Warp tile for it on {tile}. Any tiles will ' +
    'do; the {bot} gains nothing from them.',
  'warpPhase.placedPlural':
    'The {bot} rolled {n} Paradoxes — place {n} Warp tiles for it on {tile}. Any tiles ' +
    'will do; the {bot} gains nothing from them.',

  // --- The Paradox die ------------------------------------------------------
  'paradoxDie.altBlank': 'Paradox die: blank',
  'paradoxDie.altOne': 'Paradox die: one Paradox',
  'paradoxDie.altDouble': 'Paradox die: double Paradox',
  'paradoxDie.rolled': 'Rolled {n} Paradox',
  'paradoxDie.rolledPlural': 'Rolled {n} Paradoxes',

  // --- Board markers (alt text + tooltips) ----------------------------------
  'board.timeTravelMarkerAlt': 'Time Travel marker',
  'board.commandTokenAlt': 'Command token {n}',
  'board.warpTileAlt': 'Chronobot Warp tile',
  'board.warpTitle':
    'Chronobot Warp tiles on the Timeline: {n} — tap for the past / current Era split',
  'board.soloBoardAlt': 'Chronobot solo board',

  // --- Reset ----------------------------------------------------------------
  'reset.confirm': 'Start a new game? This clears the current Chronobot game and its history.',

  // --- Board tracker tooltips -----------------------------------------------
  // `{label}` is the tracker's own name, itself translatable as `counter.<key>`.
  'counterTip.superproject': '{label} ×{count} — VP: {vps}',
  'counterTip.superprojectEmpty': '{label}: 0',
  'counterTip.building': '{label} ×{count} — VP: {vps} (max 3 of a type)',
  'counterTip.buildingEmpty': '{label}: 0 (max 3 of a type)',
  'counterTip.breakthrough': '{label}: {count} — click for per-shape counts',
  'counterTip.mech':
    '{label}: {count} powered Exosuit available · {deployed} deployed on board',
  'counterTip.mechPlural':
    '{label}: {count} powered Exosuits available · {deployed} deployed on board',
  'counterTip.anomaly': '{label}: {count} (max 3)',
  'counterTip.cubes': '{label}: {count} cube',
  'counterTip.cubesPlural': '{label}: {count} cubes',
  'counterTip.plain': '{label}: {count}',

  // --- Shared Action panels (both bots) -------------------------------------
  // The bold runs mark board locations the player has to act on, so these render
  // through `<T>` and stay ONE key each — a translator moves the location name to
  // wherever their grammar needs it.
  'panel.warp.total': '**{n}** Warp tile on the Timeline',
  'panel.warp.totalPlural': '**{n}** Warp tiles on the Timeline',
  'panel.warp.past': 'Past Timeline tiles',
  'panel.warp.current': 'Era {era} (current) tile',
  'panel.warp.tiles': '{n} tile',
  'panel.warp.tilesPlural': '{n} tiles',
  'panel.blink.fluxAlt': 'Flux Core drawn',
  'panel.blink.fluxDrawn': 'Drawn from the Flux Pool — Blink activated.',
  'panel.blink.instruct':
    'Move its Exosuit from **{from}** (bottom-most space) to **{to}**, and return that ' +
    'Exosuit’s Energy Core to the supply.',
  'panel.blink.confirm': '✓ Confirm moved',
  'panel.blink.rulesCta': '📖 Blink',
  'panel.place.casingAlt': 'Empty Flux Casing drawn',
  'panel.place.casingDrawn': 'Drawn from the Flux Pool — no Blink.',
  'panel.place.noFigures':
    'No Blink, and the bot has **no Exosuit left to place** — so it **passes** for the ' +
    'Era. Nothing goes on **{destination}**, and its Command token does not advance.',
  'panel.place.instruct':
    'Place one of its **available powered Exosuits** on **{destination}**, and put an ' +
    'Energy Core from the supply into it.',
  'panel.place.instructOffBoard':
    'Place one of its **available powered Exosuits** on **{destination}**.',
  'panel.place.continuePasses': '✓ Continue — it passes',
  'panel.place.confirm': '✓ Confirm placed',
} as const satisfies Record<string, string>;

export type UiKey = keyof typeof UI_STRINGS;
