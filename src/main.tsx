import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoot from './AppRoot.tsx'

// Home screen (Landing) selects a Solo opponent; the Chronobot opens the
// BoardExplorer. The full guided game runner lives in ./App.tsx for later.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>,
)
