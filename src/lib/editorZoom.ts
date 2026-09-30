/**
 * Pinch-to-zoom + Ctrl+wheel font zoom for code editor hosts.
 *
 * Ported from the original Vue implementation (theme/editor-zoom.js) — the
 * behavior that worked there, kept identical:
 *
 * Why capture-phase: Monaco's own touch handlers run on the editor's internal
 * elements and stop the touchmove stream during a gesture — a bubble-phase
 * listener on the host only ever sees the first event, which is exactly the
 * "zoom changes 1px then stops" defect. Capture listeners run BEFORE Monaco's
 * handlers, so the pinch keeps working for as long as two fingers stay down.
 *
 * The zoom itself is ratio-based (font0 × currentDistance/initialDistance), so
 * it tracks the fingers smoothly and continuously instead of stepping. Clamped
 * to [10, 32]px. Ctrl+wheel on desktop adjusts ±1 per wheel tick.
 */
export const FONT_MIN = 10
export const FONT_MAX = 32

export function clampFont(n: number): number {
  return Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(n)))
}

function touchDist(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.hypot(dx, dy)
}

/**
 * Attach pinch + Ctrl+wheel zoom to a host element.
 * `getFont()`/`setFont(n)` read/write the caller's font-size state.
 * Returns a detach function.
 */
export function attachEditorZoom(
  hostEl: HTMLElement | null | undefined,
  getFont: () => number,
  setFont: (n: number) => void
): () => void {
  if (!hostEl || typeof window === 'undefined') return () => {}

  let initialDist = 0
  let initialFont = 14

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDist = touchDist(e.touches)
      initialFont = getFont()
    }
  }

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialDist > 0) {
      e.preventDefault()
      const ratio = touchDist(e.touches) / initialDist
      setFont(clampFont(initialFont * ratio))
    }
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length < 2) initialDist = 0
  }

  const onWheel = (e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    setFont(clampFont(getFont() + (e.deltaY < 0 ? 1 : -1)))
  }

  hostEl.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
  hostEl.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
  hostEl.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
  hostEl.addEventListener('wheel', onWheel, { passive: false })

  return () => {
    hostEl.removeEventListener('touchstart', onTouchStart, { capture: true })
    hostEl.removeEventListener('touchmove', onTouchMove, { capture: true })
    hostEl.removeEventListener('touchend', onTouchEnd, { capture: true })
    hostEl.removeEventListener('wheel', onWheel)
  }
}
