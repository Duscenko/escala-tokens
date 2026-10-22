// OVERVIEW — the system matrix. Each saved brand is a card: its name, where
// it came from, the themes it ships and the five Figma collections it fills,
// each with the number of variables it puts there. The open space beside the
// cards is the slot that adds a brand (the same gesture as a Figma mode). The
// brand on screen carries a 2px rule in its own colour. A visitor with no
// account is told there that signing in is what keeps these brands.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../../lib/i18n'
import { goToLogin, useAccess } from '../../../lib/access'
import { generateTokenJSON } from '../../../lib/tokenGenerator'
import { THEME_STYLE_PRESETS } from '../../../lib/themePresets'
import { readBrandPayload, type BrandSource } from '../../../lib/importBrand'
import { useSavedBrandKeys } from '../../../lib/libraryStatus'
import { wcagRatio } from '../../../lib/color/apca'
import { BRAND_THEME_DEFS, brandThemesSummary, shippedThemes } from '../../../lib/brandThemes'
import { fontStack } from '../../../lib/fonts'
import { foundationFacts } from '../../../lib/systemDashboard'
import { useTheme } from '../../../lib/theme'
import { themeBrandRamp, themeDisplayName } from '../../../lib/themeSources'
import { AppearanceGlyph } from '../colorControls'
import { ThemeAvatar } from '../ThemeLibraryRail'
import { ChromeAnchoredDropdown } from '../TopNav'
import { GitHubGlyph } from '../../ui/icons'
import { Tag, TEXT_LINK } from './parts'
import { DASH_DOCS, DEFAULT_DOC_KEY, type Dashboard } from './dashboardData'
import type { ColorScale } from '../../../types/tokens'

/** Chrome page the rule and Edit sit on. Same hexes as `--app`. */
const CHROME_PAGE = { dark: '#0e0f13', light: '#fdfdff' } as const
const MARK_TONES = [9, 10, 8, 11, 7, 12, 6, 5, 4, 3, 2, 1] as const

/** The brand's own colour, walked only when the anchor cannot be read on the chrome. */
function brandMark(ramp: ColorScale | undefined, fallback: string, page: string): string {
  const seen = new Set<string>()
  const candidates: string[] = []
  for (const tone of MARK_TONES) {
    const hex = ramp?.[tone]
    if (hex && !seen.has(hex)) {
      seen.add(hex)
      candidates.push(hex)
    }
  }
  if (!seen.has(fallback)) candidates.push(fallback)
  for (const hex of candidates) {
    try {
      if (wcagRatio(hex, page) >= 4.5) return hex
    } catch {
      /* a value the contrast parser rejects is not a mark */
    }
  }
  return candidates[0] ?? fallback
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'

type CollectionKey = 'colorPrimitives' | 'colorSemantics' | 'dimensionPrimitives' | 'dimensionSemantics' | 'typography'
const COLLECTIONS: { key: CollectionKey; label: string; foundation: string }[] = [
  { key: 'colorPrimitives', label: 'Color Primitives', foundation: 'color' },
  { key: 'colorSemantics', label: 'Color Semantics', foundation: 'color' },
  { key: 'dimensionPrimitives', label: 'Dimension Primitives', foundation: 'spacing' },
  { key: 'dimensionSemantics', label: 'Dimension Semantics', foundation: 'spacing' },
  { key: 'typography', label: 'Typography', foundation: 'typography' },
]

const size = (value: unknown) => (value && typeof value === 'object' ? Object.keys(value).length : 0)

/** What one brand puts in each Figma collection, counted off the SAME
 *  `generateTokenJSON` call its export is built from — so the numbers cannot
 *  disagree with the file. They count values in tokens.json, grouped the way
 *  the plugin groups its collections. */
function brandCounts(store: Parameters<typeof generateTokenJSON>[0], key: string) {
  type Bag = Record<string, unknown>
  const json = generateTokenJSON(store, { theme: key }) as unknown as Bag & {
    colors?: Bag & { architecture?: { tokens?: Record<string, Bag> } }
    dimensionRefs?: Record<string, Bag>
    typography?: Bag
    viewports?: unknown[]
  }
  const colors = json.colors ?? {}
  const archGroups: Record<string, Bag> = colors.architecture?.tokens ?? {}
  const colorSemantics = Object.values(archGroups).reduce((n, group) => n + size(group), 0)
  const refs: Record<string, Bag> = json.dimensionRefs ?? {}
  const dimensionSemantics = Object.values(refs).reduce((n, group) => n + size(group), 0)
    + size(json.spacingRoles) + size(json.radiusRoles) + size(json.strokeRoles) + size(json.sizeRoles)
    + size(json.selectorRoles) + size(json.spacingResponsive) + size(json.radiusResponsive) + size(json.breakpointRoles)
  const type: Bag = json.typography ?? {}
  // Families (body + display), the four scales, and each role's size · weight · family.
  const typography = 2 + size(type.sizes) + size(type.lineHeights) + size(type.letterSpacings) + size(type.weights) + size(type.roles) * 3
  const counts: Record<CollectionKey, number> = {
    colorPrimitives: size(colors.primitive) + size(colors.primitiveAlpha),
    colorSemantics,
    dimensionPrimitives: size(json.dimensions),
    dimensionSemantics,
    typography,
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const platforms = Array.isArray(json.viewports) && json.viewports.length ? json.viewports.length : 1
  return { counts, total, platforms }
}

function PlusGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** The same page glyph as Docs in the System menu, at the collection rows' 16px. */
function DocsGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h9l4 4v14H6V3ZM14 3v5h5M9 13h7M9 17h7" />
    </svg>
  )
}

function ChevronGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

/** One glyph per collection, drawn from the brand itself where it can be. */
function CollectionGlyph({ which, ramp, heading }: { which: CollectionKey; ramp: ColorScale | undefined; heading: string }) {
  if (which === 'colorPrimitives') {
    return <span aria-hidden className="block h-4 w-4 flex-shrink-0 rounded-[4px]" style={{ background: ramp?.[9] }} />
  }
  if (which === 'colorSemantics') {
    return (
      <span aria-hidden className="flex flex-shrink-0 gap-1">
        {[1, 4, 9, 11].map((tone) => <span key={tone} className="block h-4 w-4 rounded-[4px] border border-fg/10" style={{ background: ramp?.[tone] }} />)}
      </span>
    )
  }
  if (which === 'dimensionPrimitives') {
    return <span aria-hidden className="block h-4 w-4 flex-shrink-0 rounded-tl-[10px] border-l-[1.5px] border-t-[1.5px] border-fg-muted" />
  }
  if (which === 'dimensionSemantics') {
    return (
      <svg aria-hidden width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="flex-shrink-0 text-fg-muted">
        <path d="M2 3v10M14 3v10M5 8h6M6.5 6.5 5 8l1.5 1.5M9.5 6.5 11 8 9.5 9.5" />
      </svg>
    )
  }
  return <span aria-hidden className="w-4 flex-shrink-0 text-ui font-semibold leading-none text-fg" style={{ fontFamily: fontStack(heading) }}>Aa</span>
}

export type ImportBrand = (json: Record<string, unknown>, name: string) => { key: string } | { error: string }

const MENU_ITEM = 'flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-left text-ui text-fg transition-colors hover:bg-fg/[0.06] focus-visible:bg-fg/[0.06] focus-visible:outline-none'

/** The paste box behind "Import agent context" / "Import JSON": paste or pick
 *  a file, see what was read, add it as a NEW BRAND of the system on screen.
 *  Shared by Home's Add brand menu and the top bar's Add new brand dialog, so
 *  both doors import the same way (a brand, never a whole system). */
export function BrandImportForm({ mode, onImport, onBack, onDone }: {
  mode: BrandSource
  onImport: ImportBrand
  onBack: () => void
  onDone: () => void
}) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | undefined>()
  const [error, setError] = useState<string | null>(null)
  const read = readBrandPayload(text, mode, fileName)
  const pickFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = mode === 'context' ? '.md,.txt,text/markdown,text/plain' : '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      file.text().then((value) => { setText(value); setFileName(file.name); setError(null) })
    }
    input.click()
  }
  const add = () => {
    if (!read?.ok) return
    const res = onImport(read.json, read.name)
    if ('error' in res) setError(res.error)
    else onDone()
  }
  return (
    <>
      <p className="text-ui font-semibold text-fg">{mode === 'context' ? t('Import agent context') : t('Import JSON')}</p>
      <p className="text-caption text-fg-muted">
        {mode === 'context'
          ? t('In Figma sync, press Copy context and paste it here. Its colours and foundations become a new brand of this system.')
          : t('Paste an Escala tokens.json, or choose the file. Its colours and foundations become a new brand of this system.')}
      </p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => { setText(e.target.value); setFileName(undefined); setError(null) }}
        rows={7}
        spellCheck={false}
        placeholder={mode === 'context' ? t('Paste the context here') : t('Paste the JSON here')}
        className="w-full resize-none rounded-lg border border-line bg-app px-2.5 py-2 font-mono text-caption text-fg outline-none focus:border-line-strong"
      />
      <button type="button" onClick={pickFile} className={`${TEXT_LINK} self-start text-caption`}>
        {mode === 'context' ? t('Choose a .md file') : t('Choose a .json file')}
      </button>
      <p role="status" aria-live="polite" className={`min-h-[1rem] text-caption ${error || (read && !read.ok && read.error) ? 'text-status-danger' : 'text-fg-muted'}`}>
        {error ?? (read && !read.ok ? t(read.error) : read?.ok ? t('Ready: “{name}”. It is added as a new brand.', { name: read.name }) : '')}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={add} disabled={!read?.ok} className="h-8 rounded-lg bg-cta px-3 text-caption font-semibold text-cta-ink disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">
          {t('Add as brand')}
        </button>
        <button type="button" onClick={onBack} className="h-8 rounded-lg border border-line px-3 text-caption font-medium text-fg hover:bg-fg/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">
          {t('Back')}
        </button>
      </div>
    </>
  )
}

/** The slot's +: the same three doors as the plugin's Add Brand Variant —
 *  start from blank, or bring a brand in from another Escala system's agent
 *  context (the Figma Copy context) or its tokens.json. A dropdown, not a
 *  modal: choosing an import turns it into a paste box in place. */
export function AddBrandMenu({ onBlank, onImport, blocked, variant = 'circle' }: {
  onBlank: () => void
  onImport?: ImportBrand
  blocked?: string
  /** `circle`: the empty slot's +. `button`: the page header's Add brand,
   *  whose menu opens under it, aligned to its right edge. */
  variant?: 'circle' | 'button'
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<BrandSource | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLButtonElement>(null)

  const close = () => { setOpen(false); setMode(null) }
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) close() }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  useEffect(() => { if (open && !mode) firstRef.current?.focus() }, [open, mode])

  const onMenuKey = (e: React.KeyboardEvent) => {
    if (mode || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    const items = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
    e.preventDefault()
    items[next]?.focus()
  }

  return (
    <div ref={rootRef} className={`relative flex flex-col ${variant === 'button' ? 'items-end' : 'items-center'}`}>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        disabled={Boolean(blocked)}
        title={blocked ?? t('Add brand')}
        aria-label={t('Add brand')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={variant === 'button'
          ? 'inline-flex h-8 items-center gap-2 rounded-lg bg-cta px-3 text-caption font-semibold text-cta-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
          : 'grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-app text-fg transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'}
      >
        <PlusGlyph size={variant === 'button' ? 14 : 18} />
        {variant === 'button' && t('Add brand')}
      </button>
      {open && (
        <div
          role={mode ? 'dialog' : 'menu'}
          aria-label={mode === 'context' ? t('Import agent context') : mode === 'json' ? t('Import JSON') : t('Add brand')}
          onKeyDown={onMenuKey}
          className={`absolute top-full z-30 mt-2 flex flex-col ${variant === 'button' ? 'right-0' : ''} rounded-2xl border border-line-strong bg-elevated p-1.5 text-left shadow-xl ${mode ? 'w-[22rem] gap-2.5 p-3' : 'w-60'}`}
        >
          {!mode ? (
            <AddBrandChoices
              firstRef={firstRef}
              onBlank={() => { close(); onBlank() }}
              onImportMode={onImport ? setMode : undefined}
            />
          ) : onImport && (
            <BrandImportForm mode={mode} onImport={onImport} onBack={() => setMode(null)} onDone={close} />
          )}
        </div>
      )}
    </div>
  )
}

/** The three ways a brand starts, in one list both Add brand doors render. */
export function AddBrandChoices({ onBlank, onImportMode, firstRef, itemClassName = MENU_ITEM }: {
  onBlank: () => void
  /** Omitted where importing is not available. */
  onImportMode?: (mode: BrandSource) => void
  firstRef?: React.RefObject<HTMLButtonElement | null>
  itemClassName?: string
}) {
  const { t } = useI18n()
  return (
    <>
      <button ref={firstRef} type="button" role="menuitem" className={itemClassName} onClick={onBlank} title={t('Pick a colour; font, radius and spacing come from this system.')}>
        <PlusGlyph />{t('Start from blank')}
      </button>
      {onImportMode && (
        <>
          <button type="button" role="menuitem" className={itemClassName} onClick={() => onImportMode('context')} title={t('Paste what Copy context gave you in Figma sync.')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M9 15l11-11M14 4h6v6" /></svg>
            {t('Import agent context')}
          </button>
          <button type="button" role="menuitem" className={itemClassName} onClick={() => onImportMode('json')} title={t('An Escala tokens.json file.')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M8 4c-2 0-2 2-2 4s-2 4-2 4 2 0 2 4 0 4 2 4M16 4c2 0 2 2 2 4s2 4 2 4-2 0-2 4 0 4-2 4" /></svg>
            {t('Import JSON')}
          </button>
        </>
      )}
    </>
  )
}

export default function OverviewPage({
  dash, header, footer, onOpenFoundation, onOpenBrand, onOpenStatus, onSelectBrand, onEditBrand, onExportBrand, brandExport, onOpenColorTheme,
  onAddBrand, onImportBrand, addBrandBlocked, maxBrands,
}: {
  dash: Dashboard
  /** Under the table. */
  footer?: ReactNode
  header: ReactNode
  /** Opens that foundation's page in Docs. */
  onOpenFoundation: (key: string) => void
  /** Color opens the brand preview, on the Color edition. */
  onOpenBrand?: () => void
  /** Absent while the Status board is on hold. */
  onOpenStatus?: () => void
  /** Makes that brand the one on screen. */
  onSelectBrand: (key: string) => void
  /** Opens that brand in the editor. */
  onEditBrand: (key: string) => void
  /** Opens that brand's code (Code tab). */
  onExportBrand?: (key: string) => void
  /** The rest of a brand column's Export menu (Home). */
  brandExport?: BrandExportActions
  /** A theme chip opens Variables · Color for that brand in that appearance. */
  onOpenColorTheme?: (brand: string, appearance: 'light' | 'dark') => void
  /** The empty slot's + → Start from blank. */
  onAddBrand?: () => void
  /** The + → Import agent context / Import JSON: mint the payload as a brand. */
  onImportBrand?: ImportBrand
  /** Why a brand cannot be added right now (the plan's cap). */
  addBrandBlocked?: string
  /** How many brands this plan holds. */
  maxBrands?: number
}) {
  const { t } = useI18n()
  const { guest } = useAccess()
  const chrome = useTheme()
  const { store, roles, contrast } = dash
  const brand = roles.brand
  // A guest's table is empty: the brand on their Board lives in this browser
  // and is not saved anywhere yet. The + below asks them to sign in to save it.
  const keptBrands = useSavedBrandKeys()
  const savedBrands = useMemo(() => (guest ? [] : keptBrands), [guest, keptBrands])
  const failing = savedBrands.length === 0 ? 0 : contrast.failing.length

  const cards = useMemo(() => savedBrands.map((key) => {
    const facts = foundationFacts(store, key)
    const ramp = themeBrandRamp(key, store.themeSources, store.themeKinds, store)
    const themeIds = shippedThemes(store.brandThemes, key, store.themeKinds[key] === 'dark' ? 'dark' : 'light')
    const origin = store.themeOrigin?.[key]
    return {
      key,
      facts,
      ramp,
      themeIds,
      origin: THEME_STYLE_PRESETS.find((preset) => preset.id === origin)?.shortLabel ?? null,
      appearance: store.themeKinds[key] === 'dark' ? 'dark' as const : 'light' as const,
      name: themeDisplayName(key, store.themeLabels),
      mark: brandMark(ramp, store.primaryColor, CHROME_PAGE[chrome]),
      ...brandCounts(store, key),
    }
  }), [savedBrands, store, chrome])

  const openRow = (key: string, foundation: string) => {
    onSelectBrand(key)
    if (foundation === 'color' && onOpenBrand) onOpenBrand()
    else onOpenFoundation(foundation)
  }

  return (
    <>
      {header}

      <section aria-label={t('Brands')} className="flex w-full min-w-0 flex-col gap-3">
        <div className="flex min-h-[26rem] w-full min-w-0 overflow-x-auto rounded-2xl border border-line">
          {cards.map((card) => {
            const selected = card.key === brand
            return (
              <article
                key={card.key}
                aria-label={card.name}
                className={`flex w-[18rem] flex-shrink-0 flex-col border-r border-line ${selected ? 'bg-surface' : 'bg-app'}`}
                style={{ boxShadow: selected ? `inset 0 2px 0 0 ${card.mark}` : undefined }}
              >
                <header className="flex items-center gap-3 border-b border-line px-4 py-4">
                  <button
                    type="button"
                    onClick={() => onSelectBrand(card.key)}
                    aria-pressed={selected}
                    title={card.name}
                    className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left ${FOCUS}`}
                  >
                    <ThemeAvatar size={34} ramp={card.ramp} appearance={card.appearance} fallback={store.primaryColor} />
                    <span className="min-w-0 flex-1 truncate text-title font-semibold text-fg">{card.name}</span>
                  </button>
                  {onExportBrand && (
                    <BrandExportMenu
                      brandKey={card.key}
                      brandName={card.name}
                      brandCount={cards.length}
                      onExportBrand={onExportBrand}
                      actions={brandExport}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => onEditBrand(card.key)}
                    title={t('Edit brand')}
                    className={`flex-shrink-0 rounded-lg border border-line px-2.5 py-1 text-caption font-medium text-fg transition-colors hover:bg-fg/[0.05] ${FOCUS}`}
                  >
                    {t('Edit')}
                  </button>
                </header>

                <div className="border-b border-line px-4 py-3">
                  <p className="text-caption font-semibold text-fg">{card.origin ?? t('Custom')}</p>
                  <p className="truncate text-mini text-fg-faint" title={t('{n} variables · {m} theme modes · {p} platforms', { n: card.total, m: card.themeIds.length, p: card.platforms })}>
                    {t('{n} variables · {m} theme modes · {p} platforms', { n: card.total, m: card.themeIds.length, p: card.platforms })}
                  </p>
                </div>

                {/* The brand's reference, right under what it is: the rows
                    below open one foundation each, this opens the whole Docs. */}
                <button
                  type="button"
                  onClick={() => { onSelectBrand(card.key); onOpenFoundation(DEFAULT_DOC_KEY) }}
                  title={t('Open {name} docs', { name: card.name })}
                  className={`group flex h-12 w-full items-center gap-3 border-b border-line px-4 text-left transition-colors hover:bg-fg/[0.04] ${FOCUS}`}
                >
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-fg"><DocsGlyph /></span>
                  <span className="min-w-0 flex-1 truncate text-ui text-fg">{t('Docs')}</span>
                  <span className="flex-shrink-0 text-caption tabular-nums text-fg-faint">{t('{n} pages', { n: DASH_DOCS.length })}</span>
                  <span aria-hidden className="flex-shrink-0 text-fg-faint transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0">
                    <ChevronGlyph />
                  </span>
                </button>

                <div role="group" aria-label={t(brandThemesSummary(card.themeIds))} className="border-b border-line px-3 py-2.5">
                  <div className="flex gap-1 rounded-xl border border-line bg-app p-1">
                    {BRAND_THEME_DEFS.map((def) => {
                      const on = card.themeIds.includes(def.id)
                      const lead = on && def.base === card.appearance
                      const label = t(def.label)
                      return (
                        <button
                          key={def.id}
                          type="button"
                          disabled={!on || !onOpenColorTheme}
                          onClick={() => onOpenColorTheme?.(card.key, def.base)}
                          title={on ? t('Open {theme} colors', { theme: label }) : t('{theme} is not shipped', { theme: label })}
                          className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg text-caption transition-colors disabled:cursor-default ${FOCUS} ${
                            lead ? 'bg-elevated font-semibold text-fg' : on ? 'text-fg-muted hover:text-fg' : 'text-fg-faint opacity-50'
                          }`}
                        >
                          <AppearanceGlyph kind={def.base} size={13} />
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <ul className="flex flex-col">
                  {COLLECTIONS.map((collection) => (
                    <li key={collection.key} className="border-b border-line last:border-b-0">
                      <button
                        type="button"
                        onClick={() => openRow(card.key, collection.foundation)}
                        title={t('Open in Docs')}
                        className={`flex h-12 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-fg/[0.04] ${FOCUS}`}
                      >
                        <CollectionGlyph which={collection.key} ramp={card.ramp} heading={card.facts.fonts.heading} />
                        <span className="min-w-0 flex-1 truncate text-ui text-fg">{collection.label}</span>
                        <span className="flex-shrink-0 text-caption tabular-nums text-fg-faint">{card.counts[collection.key]}</span>
                      </button>
                    </li>
                  ))}
                  {/* The integration row: where this design system's code
                      lives. One repository per system, so every column reads
                      the same; it opens the same GitHub screen as Export. */}
                  {brandExport?.github && (
                    <li className="border-t border-line">
                      <button
                        type="button"
                        onClick={() => brandExport.github?.(card.key)}
                        title={store.githubRepo ? t('Push to {repo}', { repo: store.githubRepo }) : t('Connect a GitHub repository')}
                        className={`flex h-12 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-fg/[0.04] ${FOCUS}`}
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-fg"><GitHubGlyph size={16} /></span>
                        <span className="min-w-0 flex-1 truncate text-ui text-fg">GitHub</span>
                        {store.githubRepo ? (
                          <span className="flex min-w-0 items-center gap-1.5 text-caption text-fg-faint">
                            <span aria-hidden className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${store.githubLastPushAt ? 'bg-status-success-solid' : 'bg-fg-faint'}`} />
                            <span className="truncate">{store.githubRepo.split('/').pop()}</span>
                          </span>
                        ) : (
                          <span className="flex-shrink-0 text-caption font-medium text-accent-ui">{t('Connect')}</span>
                        )}
                      </button>
                    </li>
                  )}
                </ul>
                {selected && failing > 0 && (
                  <div className="mt-auto flex items-center gap-2 border-t border-line px-4 py-2.5">
                    <Tag tone="warning">{t('{n} pairs under AA', { n: failing })}</Tag>
                    {onOpenStatus && <button type="button" onClick={onOpenStatus} className={TEXT_LINK}>{t('See what fails')}</button>}
                  </div>
                )}
              </article>
            )
          })}

          {/* The slot a new brand fills, like an empty Figma mode column. */}
          <div
            className="flex min-w-[16rem] flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
            style={{ backgroundImage: 'radial-gradient(circle, color-mix(in srgb, var(--fg) 14%, transparent) 1px, transparent 1.4px)', backgroundSize: '18px 18px' }}
          >
            {guest ? (
              // A guest's one action here: sign in, and the brand on their
              // Board is saved into this table.
              <>
                <button
                  type="button"
                  onClick={() => goToLogin('save-library')}
                  aria-label={t('Sign in to save your brand')}
                  className="grid h-12 w-12 place-items-center rounded-full border border-line-strong bg-app text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                >
                  <PlusGlyph />
                </button>
                <p className="text-ui font-semibold text-fg">{t('Sign in to save your brand')}</p>
                <p className="max-w-[16rem] text-caption text-fg-faint">{t('Your design system lives in this browser until you sign in.')}</p>
              </>
            ) : (
              <>
                {onAddBrand && <AddBrandMenu onBlank={onAddBrand} onImport={onImportBrand} blocked={addBrandBlocked} />}
                <p className="text-ui font-semibold text-fg">{t('Add brand')}</p>
                {maxBrands ? (
                  <p className="text-caption tabular-nums text-fg-faint">{t('{n} of {max} brands used', { n: cards.length, max: maxBrands })}</p>
                ) : null}
              </>
            )}
          </div>
        </div>
        {footer}
      </section>
    </>
  )
}

/** Home's export actions beyond "this brand": the bundle and the other ways out. */
export interface BrandExportActions {
  /** Every brand of the design system in one bundle. */
  all?: () => void
  figma?: (key: string) => void
  /** The Code tab on CSS. */
  code?: (key: string) => void
  /** The Code tab on Agent context. */
  agent?: (key: string) => void
  github?: (key: string) => void
}

/**
 * The ONE export on Home (design-plans/home-into-system.md): each brand column
 * carries it, and the menu says how — this brand, all brands, Figma, code,
 * GitHub. Home has no header Export and the top bar's Export pill is hidden
 * there, so three doors to the same wizard became one.
 */
function BrandExportMenu({ brandKey, brandName, brandCount, onExportBrand, actions }: {
  brandKey: string
  brandName: string
  brandCount: number
  onExportBrand: (key: string) => void
  actions?: BrandExportActions
}) {
  const { t } = useI18n()
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  // The same three doors as the inspector footer and the top bar's Export
  // pill — CSS · Figma · Agent — then "More formats…" (the wizard: W3C, Escala
  // JSON, per-collection files, GitHub) and, with 2+ brands, the bundle.
  // One vocabulary for every way out (design-plans/entry-flow-set-see-ship.md).
  const items: { key: string; label: string; hint: string; go: () => void }[] = [
    ...(actions?.code ? [{ key: 'css', label: t('CSS'), hint: t('Copy or download variables.css'), go: () => actions.code?.(brandKey) }] : []),
    ...(actions?.figma ? [{ key: 'figma', label: t('Figma'), hint: t('Copy the context and paste it in the plugin.'), go: () => actions.figma?.(brandKey) }] : []),
    ...(actions?.agent ? [{ key: 'agent', label: t('Agent'), hint: t('One message your AI agent reads as the source of truth.'), go: () => actions.agent?.(brandKey) }] : []),
    { key: 'brand', label: t('More formats…'), hint: t('W3C, Escala JSON, per-collection files, GitHub.'), go: () => onExportBrand(brandKey) },
    ...(actions?.all && brandCount > 1
      ? [{ key: 'all', label: t('Export all {n} brands', { n: brandCount }), hint: t('Every brand in one bundle, one theme column each.'), go: actions.all }]
      : []),
  ]
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex flex-shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-caption font-medium transition-colors hover:text-fg ${open ? 'text-fg' : 'text-fg-muted'} ${FOCUS}`}
      >
        {t('Export')}
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
          <path d="M2.5 4.25 6 7.75l3.5-3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <ChromeAnchoredDropdown
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align="left"
        gap={6}
        menuAriaLabel={t('Export {name}', { name: brandName })}
        className="w-72 rounded-lg border border-line-strong bg-app p-1 shadow-lg"
      >
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); item.go() }}
            className={`flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left transition-colors hover:bg-fg/[0.06] ${FOCUS}`}
          >
            <span className="text-caption font-medium text-fg">{item.label}</span>
            <span className="text-mini leading-snug text-fg-muted">{item.hint}</span>
          </button>
        ))}
      </ChromeAnchoredDropdown>
    </>
  )
}
