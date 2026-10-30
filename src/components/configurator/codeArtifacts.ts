import { useMemo } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { captureCodeSnapshot } from '../../lib/codeScope'
import { buildCSS } from '../../lib/exporters'
import { generateTokenJSON } from '../../lib/tokenGenerator'
import { buildAgentSkillFiles } from '../../lib/agentBundle'
import { useFreeTier } from '../../lib/access'
import { shippedBundle } from '../../lib/freeExport'
import type { ThemeAppearance } from '../../lib/themeModes'
import { CONTEXT_FOUNDATIONS, type ContextScope } from '../../lib/contextRequest'

// ─── One brand's code files, built ONCE for every surface that shows them ───
// The Code tab and the inspector's Ship panel both render these. They used to
// be computed inside the Code tab; the Ship panel would otherwise have needed
// a second copy, and two builders are how a preview and a download start to
// disagree (design-plans/entry-flow-set-see-ship.md).

/** What a theme's export carries, counted off the SAME `generateTokenJSON`
 *  call the files are built from, so the numbers can't disagree with them. */
export type ExportFacts = { primitives: number; tokens: number; modes: number; cssBytes: number }

export interface CodeArtifacts {
  css: string
  skillMd: string
  facts: ExportFacts | null
}

const EMPTY: CodeArtifacts = { css: '', skillMd: '', facts: null }

function exportFacts(json: ReturnType<typeof generateTokenJSON>, css: string): ExportFacts {
  const colors = (json as { colors?: Record<string, unknown> }).colors ?? {}
  const count = (value: unknown) => (value && typeof value === 'object' ? Object.keys(value).length : 0)
  const primitives = count(colors.primitive) + count(colors.primitiveAlpha)
  const groups = ((colors.architecture as { tokens?: Record<string, Record<string, Record<string, string>>> } | undefined)?.tokens) ?? {}
  let tokens = 0
  const modeKeys = new Set<string>()
  for (const group of Object.values(groups)) {
    for (const modes of Object.values(group)) {
      tokens += 1
      Object.keys(modes ?? {}).forEach((key) => modeKeys.add(key))
    }
  }
  return { primitives, tokens, modes: modeKeys.size, cssBytes: new Blob([css]).size }
}

type Store = ReturnType<typeof useDesignStore.getState>

/** The free cut of a brand's code snapshot (one appearance, Desktop), or
 *  null when the whole brand ships. */
function freeCut(source: Store, appearance: ThemeAppearance) {
  return shippedBundle(source, {
    themes: [appearance],
    modes: [{ theme: appearance, appearance }],
    viewports: ['desktop'],
    gridStyles: ['xl-desktop'],
  }, true)
}

/** variables.css and SKILL.md for one brand (both of
 *  its appearances). `null` brand → empty files. */
export function useCodeArtifacts(themeKey: string | null, previewAppearance?: ThemeAppearance): CodeArtifacts {
  const store = useDesignStore()
  const free = useFreeTier()
  // One library theme, both appearances. Kits save still uses
  // scopeSnapshotToTheme; this file is what someone pastes.
  const source = useMemo(() => (
    themeKey ? captureCodeSnapshot(store, themeKey) : null
  ), [store, themeKey])
  return useMemo(() => {
    if (!source) return EMPTY
    const asStore = source as Store
    const json = generateTokenJSON(source)
    const { files } = buildAgentSkillFiles(json, {
      projectFallback: source.projectName,
      iconKey: source.iconAiSource,
    })
    const appearance = previewAppearance ?? source.themeKinds[themeKey ?? ''] ?? 'light'
    const cut = free ? freeCut(asStore, appearance) : null
    const css = cut?.css ?? buildCSS(asStore)
    const shipped = cut ? JSON.parse(cut.tokens) as typeof json : json
    return {
      css,
      skillMd: files.find((file) => file.path === 'SKILL.md')?.text ?? '',
      facts: exportFacts(shipped, css),
    }
  }, [source, free, previewAppearance, themeKey])
}

/** variables.css of EVERY listed brand, in order — the input of the
 *  all-brands file. Built only while `enabled`, so a one-brand view never
 *  pays for the others. */
export function useBrandCssList(themeKeys: string[], enabled: boolean, previewAppearance?: ThemeAppearance): { key: string; css: string }[] {
  const store = useDesignStore()
  const free = useFreeTier()
  const keys = themeKeys.join('|')
  return useMemo(() => {
    if (!enabled) return []
    return keys.split('|').filter(Boolean).map((key) => {
      const source = captureCodeSnapshot(store, key) as Store
      const appearance = previewAppearance ?? source.themeKinds[key] ?? 'light'
      return { key, css: (free ? freeCut(source, appearance)?.css : null) ?? buildCSS(source) }
    })
  }, [store, free, keys, enabled, previewAppearance])
}

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Saves `text` as a file named `name`. */
export function downloadText(text: string, name: string, type = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`
}

/** Every scope the Agent context can be cut to: the whole brand, then one
 *  foundation at a time. */
export const CONTEXT_SCOPES: ContextScope[] = ['all', ...CONTEXT_FOUNDATIONS.map((f) => f.key)]
