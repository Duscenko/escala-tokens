import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export type ToastAction = { label: string; onClick: () => void }

type Toast = { id: number; message: string; action?: ToastAction }

let push: ((message: string, action?: ToastAction) => void) | null = null
let seq = 0

/** Fire a quiet confirmation. Safe to call from click handlers. */
export function showToast(message: string, action?: ToastAction) {
  push?.(message, action)
}

/** Mount once at the app root. Renders the live toast above the workspace. */
export function ToastHost() {
  const reduce = useReducedMotion()
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    push = (message, action) => setToast({ id: ++seq, message, action })
    return () => { push = null }
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), toast.action ? 5600 : 2400)
    return () => window.clearTimeout(t)
  }, [toast])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-10 z-[80] flex justify-center px-4" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`flex items-center gap-2 rounded-xl bg-fg text-app px-3.5 py-2 text-body font-medium shadow-lg ${
              toast.action ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          >
            <span className="text-status-success" aria-hidden>✓</span>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="ml-1 text-app underline underline-offset-2 decoration-app/50 hover:decoration-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app/60 rounded-sm"
                onClick={() => {
                  toast.action?.onClick()
                  setToast(null)
                }}
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
