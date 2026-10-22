// ONE confirmation for "a brand joined the design system", whichever door
// kept it: Save brand on the Board, the create studio's Save, a Ship door
// (CSS · Figma · Agent) that keeps a draft on the way out, or an import.
//
// It names the brand AND where it went ("“Acme” saved to Escala"), because a
// bare "Brand saved" left people asking where the brand was. The toast's action
// opens Home, where every brand is a column — the place to check it landed.

import { useDesignStore } from '../store/useDesignStore'
import { themeDisplayName } from './themeSources'
import { showToast } from '../components/ui/Toast'

export const OPEN_HOME_EVENT = 'escala:open-home'

/** Open Home (the brands table). Handled by `Configurator`. */
export function requestOpenHome(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(OPEN_HOME_EVENT))
}

type Translate = (key: string, vars?: Record<string, string | number>) => string

/** The toast copy, pure so it can be tested without a DOM. */
export function brandSavedMessage(t: Translate, brand: string, system: string): string {
  const name = brand.trim()
  const where = system.trim()
  if (name && where) return t('“{brand}” saved to {system}', { brand: name, system: where })
  if (name) return t('“{brand}” saved', { brand: name })
  return t('Brand saved')
}

/** Say that `key` is now part of the design system on screen. */
export function announceBrandSaved(t: Translate, key: string | null | undefined, opts: { withAction?: boolean } = {}): void {
  const s = useDesignStore.getState()
  const brand = key ? themeDisplayName(key, s.themeLabels) : ''
  const message = brandSavedMessage(t, brand, s.projectName)
  showToast(message, opts.withAction === false ? undefined : { label: t('See all brands'), onClick: requestOpenHome })
}
