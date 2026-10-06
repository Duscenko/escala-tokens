// ── Edit history (Theme preview undo / redo) ────────────────────────────────
// A step-by-step undo for theme customisation. It replaced a single 9s
// "Undo <last edit>" toast as the way back: that one forgot everything after
// nine seconds, and only ever knew the LAST edit, so a user who tried three
// things in a row had no way back to the first.
//
// What a step is: the WHOLE design snapshot taken just before one edit —
// a quick-rail commit, one slider drag (start to release counts as one), a
// token re-pointed from the inspector, a theme Reset. Undo restores that
// snapshot and keeps the current state on the redo stack.
//
// Deliberately NOT persisted and NOT part of `DesignSnapshot`: it is a way of
// working, like the inspector toggle. And it is scoped to ONE theme — switching
// theme clears it (`resetEditHistory`), because undoing an edit made on a
// different theme while looking at this one would change something off screen.

import { create } from 'zustand'
import { captureSnapshot, useDesignStore, type DesignSnapshot } from '../store/useDesignStore'

/** Steps kept. A snapshot is the whole design state, so this is a memory cap
 *  as much as a UX one; 20 is well past how far back anyone undoes. */
export const EDIT_HISTORY_LIMIT = 20

interface Step { snapshot: DesignSnapshot; label: string }

interface EditHistoryState {
  past: Step[]
  future: Step[]
}

export const useEditHistory = create<EditHistoryState>(() => ({ past: [], future: [] }))

const current = () => captureSnapshot(useDesignStore.getState() as unknown as DesignSnapshot)

/** Record an edit. `before` is the snapshot taken BEFORE the write; a new edit
 *  always clears the redo stack (redo only means "the undo you just did"). */
export function recordEdit(before: DesignSnapshot, label: string): void {
  useEditHistory.setState((s) => ({
    past: [...s.past, { snapshot: before, label }].slice(-EDIT_HISTORY_LIMIT),
    future: [],
  }))
}

/** Step back. Returns the label undone, or null when there is nothing to undo. */
export function undoEdit(): string | null {
  const { past, future } = useEditHistory.getState()
  const step = past[past.length - 1]
  if (!step) return null
  const now = current()
  useDesignStore.setState(step.snapshot)
  useEditHistory.setState({ past: past.slice(0, -1), future: [...future, { snapshot: now, label: step.label }] })
  return step.label
}

/** Step forward again. Returns the label redone, or null. */
export function redoEdit(): string | null {
  const { past, future } = useEditHistory.getState()
  const step = future[future.length - 1]
  if (!step) return null
  const now = current()
  useDesignStore.setState(step.snapshot)
  useEditHistory.setState({ past: [...past, { snapshot: now, label: step.label }], future: future.slice(0, -1) })
  return step.label
}

export function resetEditHistory(): void {
  useEditHistory.setState({ past: [], future: [] })
}
