import { useEffect, useRef, useState, type ReactNode, createContext, useCallback, useContext } from 'react'
import { Icon } from './Icon'

export type ToastKind = 'info' | 'success' | 'error'

interface Toast {
  id: number
  kind: ToastKind
  title: string
  body?: string
}

interface ToastApi {
  push: (kind: ToastKind, title: string, body?: string) => void
}

const ToastContext = createContext<ToastApi>({ push: () => {} })

let nextId = 1

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    (kind: ToastKind, title: string, body?: string) => {
      const id = nextId++
      setToasts((ts) => [...ts.slice(-2), { id, kind, title, body }]) // max 3 at once
      const t = setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4500)
      timers.current.set(id, t)
    },
    [dismiss]
  )

  useEffect(() => {
    const timersMap = timers.current
    return () => {
      for (const t of timersMap.values()) clearTimeout(t)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-kind={t.kind} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon">
              <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'alert' : 'spark'} size={16} />
            </span>
            <div>
              <p className="toast-title">{t.title}</p>
              {t.body && <p className="toast-body">{t.body}</p>}
            </div>
            <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
