/**
 * Durable save format written to `.escala/system.json` in the connected Git
 * repo. This is the editor snapshot — the thing localStorage also holds — plus
 * the publish claim for `/api/tokens`. `tokens.json` in the same repo is the
 * export contract, not the editor.
 */
import type { DesignSnapshot } from '../store/useDesignStore'
import { captureSnapshot } from '../store/useDesignStore'

export const ESCALA_SYSTEM_PATH = '.escala/system.json'
export const ESCALA_SYSTEM_FORMAT = 'escala-system/v1' as const

export type EscalaSystemFile = {
  format: typeof ESCALA_SYSTEM_FORMAT
  savedAt: string
  publishSlug: string
  /** Write token for `POST /api/tokens?project=<slug>`. Only as secret as the repo. */
  publishClaim?: string
  snapshot: DesignSnapshot
}

export function serializeEscalaSystem(input: {
  snapshot: DesignSnapshot
  publishSlug: string
  publishClaim?: string
  savedAt?: string
}): string {
  const file: EscalaSystemFile = {
    format: ESCALA_SYSTEM_FORMAT,
    savedAt: input.savedAt ?? new Date().toISOString(),
    publishSlug: input.publishSlug,
    snapshot: captureSnapshot(input.snapshot),
  }
  if (input.publishClaim) file.publishClaim = input.publishClaim
  return `${JSON.stringify(file, null, 2)}\n`
}

export function parseEscalaSystem(raw: unknown): EscalaSystemFile | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.format !== ESCALA_SYSTEM_FORMAT) return null
  if (typeof o.savedAt !== 'string' || typeof o.publishSlug !== 'string') return null
  if (!o.snapshot || typeof o.snapshot !== 'object') return null
  if (typeof (o.snapshot as { projectName?: unknown }).projectName !== 'string') return null
  const publishClaim = typeof o.publishClaim === 'string' && o.publishClaim ? o.publishClaim : undefined
  const file: EscalaSystemFile = {
    format: ESCALA_SYSTEM_FORMAT,
    savedAt: o.savedAt,
    publishSlug: o.publishSlug,
    snapshot: o.snapshot as DesignSnapshot,
  }
  if (publishClaim) file.publishClaim = publishClaim
  return file
}
