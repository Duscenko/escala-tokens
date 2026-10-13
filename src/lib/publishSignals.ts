// Two small signals between the store and the publish plumbing, kept apart from
// both so neither imports the other (the store loads before figmaSync, and
// figmaSync reads the store).
//
// 1. WHICH ids this session took down. `forgetPluginLibraries` erases what a
//    system published when it is replaced or loses its last brand; if that
//    same id is live again (Undo, a brand added back) its tokens have to be
//    put back, or a Figma file reads "deleted" for a system that is on screen.
//    Undo can even land on the exact payload last published, which auto-sync
//    skips as "nothing changed" — so this is not something it can infer.
//
// 2. A request to republish now. Removing a brand while auto-sync is off used
//    to leave the removed brand in the published blob until someone pressed
//    Sync now. Deleting it is a deliberate act; the platform follows it.

const erased = new Set<string>()
const listeners = new Set<() => void>()

export function markPublishErased(id: string): void {
  if (id) erased.add(id)
}

export function wasPublishErased(id: string | undefined | null): boolean {
  return !!id && erased.has(id)
}

export function clearPublishErased(id: string): void {
  erased.delete(id)
}

export function requestRepublish(): void {
  for (const listener of [...listeners]) listener()
}

export function onRepublishRequested(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
