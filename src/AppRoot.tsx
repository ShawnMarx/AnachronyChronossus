import { useState } from 'react';
import Landing from './Landing';
import BoardExplorer, { peekSavedChronobot } from './BoardExplorer';
import ChronossusGame, { peekSavedChronossus } from './ChronossusGame';

/**
 * Top-level view switch. On load we resume whichever opponent has a saved game
 * (rehydrated by its view on mount); the top-left home button returns here to
 * Landing. At most one opponent is ever cached at a time — starting/continuing
 * one clears the other — so this check is unambiguous and a refresh always
 * returns to the last active game. Both opponents are available to everyone;
 * only Debug mode (and the admin stats view) remain admin-gated.
 */
export default function AppRoot() {
  const [view, setView] = useState<'home' | 'chronobot' | 'chronossus'>(() =>
    peekSavedChronobot() ? 'chronobot' : peekSavedChronossus() ? 'chronossus' : 'home',
  );

  if (view === 'chronobot') {
    return <BoardExplorer onHome={() => setView('home')} />;
  }
  if (view === 'chronossus') {
    return <ChronossusGame onHome={() => setView('home')} />;
  }
  return (
    <Landing
      onStartChronobot={() => setView('chronobot')}
      onStartChronossus={() => setView('chronossus')}
    />
  );
}
