import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/tokens.css'
import './styles/base.css'
import './styles/app.css'

declare const __BUILD_ID__: string

// Self-healing stale tabs: if this tab is running a build from BEFORE the
// latest deploy (kept alive by the browser's tab restoration), reload once.
// The sessionStorage guard prevents a reload loop if the check ever misfires.
try {
  const stored = localStorage.getItem('devora-build-id')
  if (stored && stored !== __BUILD_ID__ && !sessionStorage.getItem('devora-build-reloaded')) {
    sessionStorage.setItem('devora-build-reloaded', '1')
    localStorage.setItem('devora-build-id', __BUILD_ID__)
    window.location.reload()
  } else {
    localStorage.setItem('devora-build-id', __BUILD_ID__)
    sessionStorage.removeItem('devora-build-reloaded')
  }
} catch {}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
