# Anachrony Chronossus

A solo-play web app that guides a single player through a game of **Anachrony**
against an automated opponent. It walks you, step by step, through each of the
bot's turns so you don't have to track the automa procedure by hand.

Supported opponents (in progress):

- **Chronossus** — the Chronossus automa (primary target of this app), with
  planned support for a variety of expansions.
- **Chronobot** — the original base-game solo bot.

> This is an unofficial fan-made assistant. It requires you to own the physical
> game; it does not reproduce the rulebook or components.

## Architecture

The rules engine is deliberately separated from the UI:

```
src/
  engine/            Framework-agnostic TypeScript "automa engine" (no React)
    types.ts         Core domain types (resources, bot ids, expansions)
    state.ts         GameState + Instruction shapes
    bots/
      BotModule.ts   Contract + registry every solo opponent implements
      chronossus.ts  Chronossus automa (scaffold)
      chronobot.ts   Original Chronobot (scaffold)
    index.ts         Public engine API: newGame / planTurn / endTurn
  useGame.ts         Thin React hook over the engine
  App.tsx            UI shell that renders the guided turn
```

Each opponent is a `BotModule` — a set of pure functions over `GameState` that
emit an ordered list of `Instruction`s for the human to carry out. New
expansions and bots plug in via `registerBot()` without touching the UI.

The bot turn logic in `chronossus.ts` and `chronobot.ts` is currently
scaffolding; the real rules are being filled in incrementally.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build
```

Built with React + Vite + TypeScript.
