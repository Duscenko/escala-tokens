import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { activeLibraryId, libraryMatchesSaved, useDesignStore } from '../../store/useDesignStore'
import type { DesignSnapshot } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { themeDisplayName } from '../../lib/themeSources'
import { myThemeKeys } from '../../lib/themeLibrary'
import { useI18n } from '../../lib/i18n'
import { useAuth } from '../../lib/auth'
import { accountsEnabled } from '../../lib/supabase'
import { loginHref, rememberReturn, takeLoginIntent } from '../../lib/loginReturn'
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
//     a real artefact, plus My libraries: the saved copies it can load, with
//     New / Import / Delete and the page's one Save library action.
//   · Get code — "give me the code of the theme I'm on." Code only.
// So this page shows no code, and Get code shows no library.

// Cards flow in a grid that fills the row and wraps when it can't fit another;
// each one measures its own width so the thumbnail scales with the card.
const CARD_MIN = 248
const CARD_PAD = 24
const SOURCE = ARTEFACTS[0]

function useTimeAgo(): (iso: string) => string {
  const { t } = useI18n()
  return (iso) => {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
    if (s < 60) return t('just now')
    if (s < 3600) return t('{n}m ago', { n: Math.floor(s / 60) })
    if (s < 86400) return t('{n}h ago', { n: Math.floor(s / 3600) })
    return t('{n}d ago', { n: Math.floor(s / 86400) })
  }
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

const LINK =
  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** "My libraries" — every saved copy of a system (`savedSystems`), with the
 *  create / import / open / delete actions the System library used to own.
 *  Local only in this phase; see design-plans/themes-library-accounts.md. */
function MyLibraries({ onNewSystem, onImport }: { onNewSystem: () => void; onImport: () => void }) {
  const { t } = useI18n()
  const timeAgo = useTimeAgo()
  const store = useDesignStore()
  const { savedSystems, loadSystem, removeSavedSystem } = store
  const activeId = activeLibraryId(store)
  // One row at a time asks a question: which row, and whether it asks to open or to delete.
  const [confirm, setConfirm] = useState<{ id: string; action: 'load' | 'delete' } | null>(null)
  return (
    <section aria-labelledby="library-saved" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 id="library-saved" className="text-ui font-semibold text-fg">
          {t('My libraries')} <span className="ml-1 text-caption font-normal text-fg-faint tabular-nums">{savedSystems.length}</span>
        </h3>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onNewSystem} className={LINK}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
            {t('New library')}
          </button>
          <button type="button" onClick={onImport} className={LINK}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 15V3m0 0L7 8m5-5 5 5M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" /></svg>
            {t('Import JSON')}
          </button>
        </div>
      </div>
      <GuestAccountCard />
      {savedSystems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-5 text-caption text-fg-faint">
          {t('Nothing saved yet. Use Save library to keep a copy of this system and its themes.')}
        </p>
      ) : (
        <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
          {savedSystems.map((sys) => {
            const asking = confirm?.id === sys.id ? confirm.action : null
            const themeCount = myThemeKeys(sys.snapshot.themeOrder ?? [], sys.snapshot.themes ?? {}).length
            return (
              <li key={sys.id} className={`flex flex-col gap-2 rounded-xl border bg-surface px-3.5 py-3 ${sys.id === activeId ? 'border-line-strong' : 'border-line'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="min-w-0 flex-1 truncate text-body font-semibold text-fg">{sys.name}</span>
                  {sys.id === activeId && (
                    <span className="flex-shrink-0 rounded-full bg-elevated px-1.5 py-0.5 text-micro font-medium text-fg-muted">{t('On screen')}</span>
                  )}
                  <span className="flex-shrink-0 text-micro text-fg-faint">{timeAgo(sys.savedAt)}</span>
                </div>
                <span className="truncate text-caption text-fg-faint">
                  {themeCount === 1 ? t('1 theme') : t('{count} themes', { count: themeCount })}
                  {' · '}
                  {sys.repo || t('Saved in this browser')}
                </span>
                {asking ? (
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-caption text-fg-muted">
                      {asking === 'load' ? t('Replace what is on screen?') : t('Delete this library from this browser?')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (asking === 'load') loadSystem(sys.id)
                        else removeSavedSystem(sys.id)
                        setConfirm(null)
                      }}
                      className={`text-caption font-semibold hover:underline ${asking === 'load' ? 'text-accent-ui' : 'text-status-danger'}`}
                    >
                      {asking === 'load' ? t('Load') : t('Delete')}
                    </button>
                    <button type="button" onClick={() => setConfirm(null)} className="text-caption text-fg-faint hover:text-fg">{t('Cancel')}</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 -ml-2.5">
                    <button type="button" onClick={() => setConfirm({ id: sys.id, action: 'load' })} className={ACTION}>{t('Load')}</button>
                    <button
                      type="button"
                      onClick={() => setConfirm({ id: sys.id, action: 'delete' })}
                      aria-label={t('Delete {name}', { name: sys.name })}
                      className={`${ACTION} hover:text-status-danger`}
                    >
                      {t('Delete')}
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/** Signed out (and accounts on): say what an account adds here, and offer it.
 *  Never a gate — everything above and below keeps working without one. */
function GuestAccountCard() {
  const { t } = useI18n()
  const { user, loading } = useAuth()
  if (!accountsEnabled || loading || user) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3.5">
      <p className="min-w-[14rem] flex-1 text-caption text-fg-muted">
        {t('Create an account to keep your libraries and open them on any device.')}
      </p>
      <div className="flex flex-shrink-0 items-center gap-2">
        <a href={loginHref({ next: 'library' })} className={LINK}>{t('Sign in')}</a>
        <a
          href={loginHref({ next: 'library', mode: 'signup' })}
          className="inline-flex h-8 items-center rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Create account')}
        </a>
      </div>
    </div>
  )
}

/** The page's primary action: save the system on screen (every theme) as a
 *  library, with the state beside it so you can tell whether you need to. */
function SaveLibraryButton() {
  const { t } = useI18n()
  const timeAgo = useTimeAgo()
  const store = useDesignStore()
  const saved = store.savedSystems.find((s) => s.id === activeLibraryId(store))
  const matches = useMemo(
    () => (saved ? libraryMatchesSaved(store as unknown as DesignSnapshot, saved.snapshot) : false),
    [store, saved],
  )
  const [justSaved, setJustSaved] = useState(false)
  const { user, loading } = useAuth()
  const guest = accountsEnabled && !loading && !user
  // Back from /login after "Keep it in your account": finish the save the user
  // asked for. Local for now; phase 3 sends it to the account.
  useEffect(() => {
    if (loading || !user) return
    if (takeLoginIntent('library') === 'save-library') {
      useDesignStore.getState().saveCurrentSystem()
      setJustSaved(true)
    }
  }, [loading, user])
  useEffect(() => {
    if (!justSaved) return
    const id = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(id)
  }, [justSaved])
  const status = !saved
    ? t('Not saved yet')
    : matches
      ? t('Saved {when}', { when: timeAgo(saved.savedAt) })
      : t('Unsaved changes')
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
      <span role="status" className={`text-caption ${saved && !matches ? 'text-fg-muted' : 'text-fg-faint'}`}>
        {saved && !matches && <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-ui align-middle" />}
        {status}
        {guest && saved && (
          <>
            {' · '}
            <a
              href={loginHref({ next: 'library', mode: 'signup' })}
              onClick={() => rememberReturn('library', 'save-library')}
              className="font-medium text-accent-ui underline-offset-2 hover:underline"
            >
              {t('Keep it in your account')}
            </a>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={() => { store.saveCurrentSystem(); setJustSaved(true) }}
        disabled={Boolean(saved && matches && !justSaved)}
        className="inline-flex h-8 items-center rounded-lg bg-accent-solid px-3.5 text-caption font-semibold text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        {justSaved ? t('Saved') : t('Save library')}
      </button>
    </div>
  )
}

export default function ThemeLibraryPage({
  previewTheme,
  onSelectTheme,
  onOpenPreview,
  onGetCode,
  onNewSystem,
  onImport,
}: {
  previewTheme: string
  /** Make this the theme every other page reads, without leaving the library. */
  onSelectTheme: (key: string) => void
  onOpenPreview: (key: string) => void
  onGetCode: (key: string) => void
  /** Opens the guided New-system modal (owned by the shell). */
  onNewSystem: () => void
  /** Opens the Import-JSON modal (owned by the shell). */
  onImport: () => void
}) {
  const { t } = useI18n()
  const { themeOrder, themes } = useDesignStore()
  const mine = myThemeKeys(themeOrder, themes)
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-8 py-7">
        <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div className="flex min-w-[16rem] flex-1 flex-col gap-1">
            <h2 className="text-heading font-semibold text-fg">{t('Themes library')}</h2>
            <p className="text-body text-fg-muted">
              {t('Every theme in this system, painted with its own tokens. Pick one to make it the theme you edit, preview and export.')}
            </p>
          </div>
          <SaveLibraryButton />
        </header>

        <section aria-labelledby="library-mine" className="flex flex-col gap-3">
          <h3 id="library-mine" className="text-ui font-semibold text-fg">
            {t('My themes')} <span className="ml-1 text-caption font-normal text-fg-faint tabular-nums">{mine.length}</span>
          </h3>
          {mine.length === 0 ? (
            // No button: the library rail beside this already carries "Create your
            // theme", so a second one here was the same action twice.
            <div className="rounded-xl border border-dashed border-line px-4 py-5">
              <span className="text-caption text-fg-faint">{t('No themes yet. Start from a System Style in the library rail, or create your own.')}</span>
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

        <MyLibraries onNewSystem={onNewSystem} onImport={onImport} />
      </div>
    </div>
  )
}
