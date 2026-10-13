// A published system its owner deleted.
//
// The blob used to outlive the system: deleting a design system on the web only
// took its id off the plugin's list, while `/api/tokens?project=<id>` kept
// serving the tokens to every file already syncing it. The blob is overwritten
// with this marker instead, so a read can tell "deleted" (410) from "never
// published" (404) and stop a file from re-applying a system that is gone.
//
// A later publish with the system's claim overwrites the marker with real
// tokens, which is how a deleted system that comes back (Undo) revives itself.
//
// Pure and DOM-free: the endpoints and the tests share it.

export const DELETED_MARK = 'escalaDeleted'

/** The payload that replaces a deleted system's tokens. Carries no tokens. */
export function deletedPayload(now: Date = new Date()): Record<typeof DELETED_MARK, { at: string }> {
  return { [DELETED_MARK]: { at: now.toISOString() } }
}

export function isDeletedSystem(data: unknown): boolean {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const mark = (data as Record<string, unknown>)[DELETED_MARK]
  return !!mark && typeof mark === 'object'
}

/** What a reader answers for a deleted system. Same text in the API and the plugin. */
export const DELETED_SYSTEM_MESSAGE = 'This system was deleted on escalatokens.com.'
