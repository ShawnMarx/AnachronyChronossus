import { useState } from 'react';
import Landing from './Landing';
import BoardExplorer, { peekSavedChronobot } from './BoardExplorer';
import ChronossusExplorer from './ChronossusExplorer';

/**
 * Top-level view switch. If a saved Chronobot game exists we open straight into
 * it (rehydrated by BoardExplorer on mount); the top-left home button returns
 * here to Landing. At most one opponent is ever cached at a time — starting a
 * new game clears the other — so this check is unambiguous. Chronossus is
 * admin-gated on the Landing (see there); its view is the Phase-5 debug harness.
 */
export default function AppRoot() {
  const [view, setView] = useState<'home' | 'chronobot' | 'chronossus'>(() =>
    peekSavedChronobot() ? 'chronobot' : 'home',
  );

  if (view === 'chronobot') {
    return <BoardExplorer onHome={() => setView('home')} />;
  }
  if (view === 'chronossus') {
    return <ChronossusExplorer onHome={() => setView('home')} />;
  }
  return (
    <Landing
      onStartChronobot={() => setView('chronobot')}
      onStartChronossus={() => setView('chronossus')}
    />
  );
}
