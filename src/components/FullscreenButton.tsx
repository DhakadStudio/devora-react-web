import { useEffect, useState } from 'react'
import { Icon } from './Icon'

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }

/**
 * Full-screen toggle for work surfaces (lesson workspace, playground).
 * Uses the Fullscreen API where available (desktop, Android); on iOS Safari,
 * which blocks fullscreen on iPhone, it falls back to a chrome-hiding
 * "focus mode" class so the button still works on every device type.
 */
export function FullscreenButton() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const doc = document as FsDocument
    const sync = () => setActive(Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement))
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync as EventListener)
    }
  }, [])

  const toggle = async () => {
    const doc = document as FsDocument
    const root = document.documentElement as FsElement
    const inFs = Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement)
    if (inFs) {
      await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()).catch(() => {})
      document.body.classList.remove('focus-mode')
      setActive(false)
      return
    }
    try {
      await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.())
      if (!document.fullscreenElement && !doc.webkitFullscreenElement) throw new Error('unsupported')
      setActive(true)
    } catch {
      // Fullscreen API unavailable (e.g. iPhone Safari) — hide app chrome instead.
      document.body.classList.add('focus-mode')
      setActive(true)
    }
  }

  const exitFocus = () => {
    document.body.classList.remove('focus-mode')
    setActive(false)
  }

  const handleClick = () => {
    if (!active) void toggle()
    else if (document.body.classList.contains('focus-mode')) exitFocus()
    else void toggle()
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={handleClick}
      aria-pressed={active}
      aria-label={active ? 'Exit full screen' : 'Enter full screen'}
      title={active ? 'Exit full screen' : 'Full screen'}
    >
      <Icon name={active ? 'minimize' : 'maximize'} size={15} />
      <span className="fullscreen-btn-label">{active ? 'Exit' : 'Full screen'}</span>
    </button>
  )
}
