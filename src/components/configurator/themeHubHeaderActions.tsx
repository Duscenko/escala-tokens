import { createContext, useContext, useEffect, type ReactNode } from 'react'

const ThemeHubHeaderActionsCtx = createContext<((node: ReactNode | null) => void) | null>(null)

/** Registers page actions in the Theme Preview hub's fixed header band (left of the view switcher). */
export function useThemeHubHeaderActions(actions: ReactNode | null) {
  const set = useContext(ThemeHubHeaderActionsCtx)
  useEffect(() => {
    if (!set) return
    set(actions)
    return () => set(null)
  }, [set, actions])
}

export function ThemeHubHeaderActionsProvider({
  children,
  onActions,
}: {
  children: ReactNode
  onActions: (node: ReactNode | null) => void
}) {
  return (
    <ThemeHubHeaderActionsCtx.Provider value={onActions}>
      {children}
    </ThemeHubHeaderActionsCtx.Provider>
  )
}
