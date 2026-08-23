import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoot from './AppRoot.tsx'
import { AuthProvider } from './auth/useAuth'
import { ensureAnonVisitCookie } from './data/anonVisit'
import { I18nProvider } from './i18n/I18nProvider'

// Home screen (Landing) selects a Solo opponent; the Chronobot opens the
// BoardExplorer. The full guided game runner lives in ./App.tsx for later.
// AuthProvider wraps everything so the optional BGE login is readable anywhere, and
// I18nProvider likewise, so any screen can resolve rulebook text in the chosen language.
// Mint the anonymous-visitor cookie before the first render. Inert today — nothing reads
// it yet (see `data/anonVisit.ts`) — and it can never throw, so it cannot delay or break
// the app it runs ahead of.
ensureAnonVisitCookie()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <I18nProvider>
        <AppRoot />
      </I18nProvider>
    </AuthProvider>
  </StrictMode>,
)
