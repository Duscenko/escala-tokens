import { create } from 'zustand'
import { useEditHistory } from './editHistory'

// GUIDED THEME SETUP — the onboarding a theme gets when it is created from
// Home's first step (name + accent). One edition at a time, in rail order:
// Color → Font → Radius → Spacing → Shadow → Icons. The rail shows the ones
// done (✓), the current one, and locks the rest; the inspector footer carries
// the step's action ("Use Inter" / "Save font") and "Skip setup".
//
// This is a MODE of a freshly created theme, not how editing works: once the
// last step is done (or skipped) the theme is an ordinary one and every
// edition is open in any order again — the workspace stays "not a wizard".
//
// A theme in setup is a DRAFT. It is real (the board needs it to paint) and
// listed in My themes with its progress, so leaving half way can be resumed.
// Kept in localStorage, not the design store: it describes the onboarding,
// not the system, so it must not reach a saved snapshot or the export.

export const SETUP_STEPS = ['color', 'typography', 'radius', 'sizes', 'shadow', 'icons'] as const
export type SetupStep = (typeof SETUP_STEPS)[number]

/** The step's button once it changed something. Whole labels, not "Save
 *  {noun}", so each language can phrase it (Enregistrer la police). */
export const SETUP_SAVE_LABEL: Record<SetupStep, string> = {
  color: 'Save colour',
  typography: 'Save font',
  radius: 'Save radius',
  sizes: 'Save spacing',
  shadow: 'Save shadow',
  icons: 'Save icons',
}

const STORAGE_KEY = 'sd-theme-setup'

function read(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function write(drafts: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)) } catch { /* private mode */ }
}

type SetupState = {
  /** Theme key → index of its CURRENT step in `SETUP_STEPS`. */
  drafts: Record<string, number>
  /** Edit-history length when the current step began, per theme: an edit since
   *  then means the step changed something ("Save font" vs "Use Inter"). Not
   *  persisted — after a reload the step reads as untouched, which is honest. */
  stepStart: Record<string, number>
}

export const useThemeSetup = create<SetupState>(() => ({ drafts: read(), stepStart: {} }))

function historyLength() {
  return useEditHistory.getState().past.length
}

function commit(drafts: Record<string, number>, key: string) {
  write(drafts)
  useThemeSetup.setState((s) => ({ drafts, stepStart: { ...s.stepStart, [key]: historyLength() } }))
}

/** Begin setup for a theme just created with its colour: Color is done. */
export function startThemeSetup(key: string) {
  commit({ ...useThemeSetup.getState().drafts, [key]: 1 }, key)
}

/** Current step done — move to the next, or finish after the last. Returns
 *  true when the setup is complete. */
export function advanceThemeSetup(key: string): boolean {
  const { drafts } = useThemeSetup.getState()
  const at = drafts[key]
  if (at == null) return true
  if (at + 1 >= SETUP_STEPS.length) { finishThemeSetup(key); return true }
  commit({ ...drafts, [key]: at + 1 }, key)
  return false
}

/** One step back. Everything set so far stays set (edits live in the store,
 *  and Undo still walks them); only the guide moves. Stops at the first step. */
export function retreatThemeSetup(key: string) {
  const { drafts } = useThemeSetup.getState()
  const at = drafts[key]
  if (at == null || at <= 0) return
  commit({ ...drafts, [key]: at - 1 }, key)
}

/** Leave setup: the theme keeps whatever is set, the rest stays at default. */
export function finishThemeSetup(key: string) {
  const drafts = { ...useThemeSetup.getState().drafts }
  if (!(key in drafts)) return
  delete drafts[key]
  write(drafts)
  useThemeSetup.setState({ drafts })
}

/** The step a theme is on, or null when it is not in setup. */
export function useSetupStep(key: string | null | undefined): number | null {
  return useThemeSetup((s) => (key && s.drafts[key] != null ? s.drafts[key] : null))
}

/** Whether the current step has changed anything yet. */
export function useStepChanged(key: string): boolean {
  const start = useThemeSetup((s) => s.stepStart[key])
  const len = useEditHistory((h) => h.past.length)
  return start != null && len > start
}
