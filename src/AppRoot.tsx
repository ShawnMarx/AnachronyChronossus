import { useState } from 'react';
import Landing from './Landing';
import BoardExplorer from './BoardExplorer';

/**
 * Top-level view switch: the Landing (home) screen picks a Solo opponent; the
 * Chronobot opens the BoardExplorer. BoardExplorer rehydrates any saved game on
 * mount, so Landing clears the save first when the player chose "New game".
 */
export default function AppRoot() {
  const [view, setView] = useState<'home' | 'chronobot'>('home');

  if (view === 'chronobot') {
    return <BoardExplorer onHome={() => setView('home')} />;
  }
  return <Landing onStartChronobot={() => setView('chronobot')} />;
}
