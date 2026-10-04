import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { themeDisplayName } from '../../lib/themeSources'
import { myThemeKeys } from '../../lib/themeLibrary'
import { useI18n } from '../../lib/i18n'
import { ARTEFACTS } from '../preview/artefacts'
import { ScaledArtefactCard } from '../preview/artefacts/ScaledArtefactCard'
import { AppearanceGlyph } from './colorControls'

// THE THEMES LIBRARY PAGE — what the folder in the workspace tab bar opens.
//
// Two pages used to answer this one door and the "Get code" tab with the SAME
// screen (the library rail beside the code export), so the folder read as a
// second way into Get code. They are different questions:
//   · Library — "which themes do I have, what do they look like, and what have
//     I saved?" A gallery of the system's own themes, each photographed through
//     a real artefact, plus the saved systems (kits) it can load.
//   · Get code — "give me the code of the theme I'm on." Code only.
// So this page shows no code, and Get code shows no library.

// Cards flow in a grid that fills the row and wraps when it can't fit another;
// each one measures its own width so the thumbnail scales with the card.
const CARD_MIN = 248
const CARD_PAD = 24
const SOURCE = ARTEFACTS[0]

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const ACTION =
  'inline-flex h-7 items-center rounded-md px-2.5 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

function ThemeCard({
  themeKey,
  active,
  onSelect,
  onOpenPreview,
  onGetCode,
}: {
  themeKey: string
  active: boolean
  onSelect: () => void
  onOpenPreview: () => void
  onGetCode: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const kind = store.themeKinds[themeKey] ?? 'light'
  const tokens = useMemo(() => resolvePreviewTokens(store, themeKey, kind), [store, themeKey, kind])
  const name = themeDisplayName(themeKey, store.themeLabels)
  const stageRef = useRef<HTMLDivElement>(null)
  const [stageW, setStageW] = useState(0)
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setStageW(Math.round(entries[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-surface transition-colors ${
        active ? 'border-accent-ui/60 ring-1 ring-accent-ui/40' : 'border-line hover:border-line-strong'
      }`}
    >
      <div
        ref={stageRef}
        className="relative flex justify-center p-3"
        style={{ background: tokens.surface }}
      >
        {stageW > CARD_PAD && <ScaledArtefactCard artefact={SOURCE} t={tokens} targetWidth={stageW - CARD_PAD} />}
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={active}
          aria-label={t('Select {name} theme', { name })}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/60"
        />
      </div>
      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
        <span className="text-fg-muted" title={kind === 'dark' ? t('Dark') : t('Light')}>
          <AppearanceGlyph kind={kind} />
        </span>
        <span className={`min-w-0 flex-1 truncate text-body text-fg ${active ? 'font-semibold' : 'font-medium'}`}>
          {name}
        </span>
      </div>
      <div className="flex items-center gap-1 border-t border-line px-1.5 py-1.5">
        <button type="button" onClick={onOpenPreview} className={ACTION}>{t('Open')}</button>
        <button type="button" onClick={onGetCode} className={ACTION}>{t('Get code')}</button>
      </div>
    </article>
  )
}

function SavedSystems({ onManage }: { onManage: () => void }) {
  const { t } = useI18n()
  const { savedSystems, loadSystem } = useDesignStore()
  const [confirm, setConfirm] = useState<string | null>(null)
  return (
    <section aria-labelledby="library-saved" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="library-saved" className="text-ui font-semibold text-fg">
          {t('Saved systems')} <span className="ml-1 text-caption font-normal text-fg-faint tabular-nums">{savedSystems.length}</span>
        </h3>
        <button type="button" onClick={onManage} className="text-caption font-medium text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded">
          {t('Manage in System library')}
        </button>
      </div>
      {savedSystems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-5 text-caption text-fg-faint">
          {t('Nothing saved yet. Save a snapshot from Export or the System library and it appears here.')}
        </p>
      ) : (
        <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
          {savedSystems.map((sys) => (
            <li key={sys.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-3.5 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="min-w-0 flex-1 truncate text-body font-semibold text-fg">{sys.name}</span>
                <span className="flex-shrink-0 text-micro text-fg-faint">{timeAgo(sys.savedAt)}</span>
              </div>
              <span className="truncate text-caption text-fg-faint">{sys.repo ?? t('Saved in this browser')}</span>
              {confirm === sys.id ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-caption text-fg-muted">{t('Replace what is on screen?')}</span>
                  <button type="button" onClick={() => { loadSystem(sys.id); setConfirm(null) }} className="text-caption font-semibold text-accent-ui hover:underline">{t('Load')}</button>
                  <button type="button" onClick={() => setConfirm(null)} className="text-caption text-fg-faint hover:text-fg">{t('Cancel')}</button>
                </div>
              ) : (
                <div>
                  <button type="button" onClick={() => setConfirm(sys.id)} className={`${ACTION} -ml-2.5`}>{t('Load')}</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function ThemeLibraryPage({
  previewTheme,
  onSelectTheme,
  onOpenPreview,
  onGetCode,
  onCreateTheme,
  onManageSaved,
}: {
  previewTheme: string
  /** Make this the theme every other page reads, without leaving the library. */
  onSelectTheme: (key: string) => void
  onOpenPreview: (key: string) => void
  onGetCode: (key: string) => void
  onCreateTheme: () => void
  onManageSaved: () => void
}) {
  const { t } = useI18n()
  const { themeOrder, themes } = useDesignStore()
  const mine = myThemeKeys(themeOrder, themes)
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-7">
        <header className="flex flex-col gap-1">
          <h2 className="text-heading font-semibold text-fg">{t('Themes library')}</h2>
          <p className="text-body text-fg-muted">
            {t('Every theme in this system, painted with its own tokens. Pick one to make it the theme you edit, preview and export.')}
          </p>
        </header>

        <section aria-labelledby="library-mine" className="flex flex-col gap-3">
          <h3 id="library-mine" className="text-ui font-semibold text-fg">
            {t('My themes')} <span className="ml-1 text-caption font-normal text-fg-faint tabular-nums">{mine.length}</span>
          </h3>
          {mine.length === 0 ? (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-line px-4 py-5">
              <span className="text-caption text-fg-faint">{t('No themes yet. Start from a System Style in the library rail, or create your own.')}</span>
              <button type="button" onClick={onCreateTheme} className="inline-flex h-8 flex-shrink-0 items-center rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50">
                {t('Create your theme')}
              </button>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN}px, 1fr))` }}>
              {mine.map((key) => (
                <ThemeCard
                  key={key}
                  themeKey={key}
                  active={key === previewTheme}
                  onSelect={() => onSelectTheme(key)}
                  onOpenPreview={() => onOpenPreview(key)}
                  onGetCode={() => onGetCode(key)}
                />
              ))}
            </div>
          )}
        </section>

        <SavedSystems onManage={onManageSaved} />
      </div>
    </div>
  )
}
