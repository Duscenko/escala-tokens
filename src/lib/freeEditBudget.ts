// Shared upgrade dialog for the Generator shell. Plan limits (extra themes,
// systems, hosted sync) live in `lib/access.ts` and on `/pricing`.

import { create } from 'zustand'

type ProAsk = {
  open: boolean
  detail: string | null
  ask: (detail: string) => void
  close: () => void
}

/** One upgrade dialog in the shell. Callers that already have their own
 *  `upgradeOpen` leave `detail` null and keep the brand sentence. */
export const useProAsk = create<ProAsk>((set) => ({
  open: false,
  detail: null,
  ask: (detail) => set({ open: true, detail }),
  close: () => set({ open: false, detail: null }),
}))
