import { useEffect, useState, type RefObject } from 'react'
import { Icon } from './Icon'

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }

/**
 * Full-screen toggle for work surfaces (lesson workspace, playground).
 * With a targetRef, fullscreens THE WORKSPACE ITSELF — an immersive coding
 * mode where the editor + output fill the viewport (the thrill), not just the
 * browser chrome. Without one it falls back to the document element. On iOS
 * Safari, which blocks fullscreen on iPhone, it falls back to a chrome-hiding
 * "focus mode" class so the button still works on every device type.
 */
export function FullscreenButton({ targetRef }: { targetRef?: RefObject<HTMLElement | null> } = {}) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    const doc = document as FsDocument
    const sync = () => {
      const current = document.fullscreenElement ?? doc.webkitFullscreenElement
      setActive(Boolean(current))
      if (!current) document.body.classList.remove('focus-mode')
    }
    document.addEventListener('fullscreenchange', sync)
    document.addEventListener('webkitfullscreenchange', sync as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      document.removeEventListener('webkitfullscreenchange', sync as EventListener)
    }
  }, [])

  const toggle = async () => {
    const doc = document as FsDocument
    const inFs = Boolean(document.fullscreenElement ?? doc.webkitFullscreenElement)
    if (inFs) {
      await (document.exitFullscreen?.() ?? doc.webkitExitFullscreen?.()).catch(() => {})
      document.body.classList.remove('focus-mode')
      setActive(false)
      return
    }
    const target = targetRef?.current ?? (document.documentElement as FsElement)
    try {
      await (target.requestFullscreen?.() ?? (target as FsElement).webkitRequestFullscreen?.())
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
      title={active ? 'Exit full screen (Esc)' : 'Full screen'}
    >
      <Icon name={active ? 'minimize' : 'maximize'} size={15} />
      <span className="fullscreen-btn-label">{active ? 'Exit' : 'Full screen'}</span>
    </button>
  )
}
