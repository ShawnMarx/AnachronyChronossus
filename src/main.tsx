import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import BoardExplorer from './BoardExplorer.tsx'

// Starting simple: a read-only board explorer to align on tile placement and
// rule text. The full guided game runner lives in ./App.tsx for later.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BoardExplorer />
  </StrictMode>,
)
