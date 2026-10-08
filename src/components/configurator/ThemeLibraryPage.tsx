import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { activeLibraryId, libraryMatchesSaved, useDesignStore } from '../../store/useDesignStore'
import type { DesignSnapshot, SavedSystem } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { themeDisplayName } from '../../lib/themeSources'
import { MY_THEME_FULL_ERROR, MY_THEME_HARD_CAP, canAddMyTheme, myThemeKeys } from '../../lib/themeLibrary'
import { byRecent } from '../../lib/themeActivity'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from '../../lib/themePresets'
import { openStyleForEditing } from '../../lib/adoptPreset'
import { goToLogin, useAccess } from '../../lib/access'
import { useI18n } from '../../lib/i18n'
import { useAuth } from '../../lib/auth'
import { accountsEnabled } from '../../lib/supabase'
import { loginHref, rememberReturn, takeLoginIntent } from '../../lib/loginReturn'
import { ThemeCover } from './ThemeCover'
import { resolveStylePreviewTokens } from '../../lib/stylePreviewOverlay'
import { SETUP_STEPS, finishThemeSetup, useSetupStep } from '../../lib/themeSetup'
import { FigmaGlyph, GitHubGlyph } from '../ui/icons'
import { AppearanceGlyph } from './colorControls'
import { FolderIcon } from './VariableCollectionRail'
import { InspectorPortal, useInInspector } from './WorkspaceInspector'
import { ThemeForm } from './ThemePanel'
import { useTheme } from '../../lib/theme'
import { AnimatePresence, motion } from 'framer-motion'
import {
  DeleteMyThemesConfirmation, DeleteThemeConfirmation, LibraryOptionsIcon, ThemeOptionsMenu,
} from './ThemeLibraryRail'

// HOME — what the rail's Home tile opens, and where a signed-in session lands.
// (Its section id stays `library`, so every old `?section=library` link and the
// login return keep working; only the name on screen changed.)
//
// Organised the way a design tool's file browser is: the MENU lives in the
// right-hand panel (portaled into the inspector, like every other view's side
// panel), the content in the card.
//   · Recents       — My themes, last edited first, plus recently saved libraries.
//   · System styles — the curated styles a theme can start from.
//   · Folders       — the system on screen is the DEFAULT folder: files
//                     (themes) live inside it. + creates another folder.
//                     A file is created only inside a folder.
//   · Pinned        — shortcuts to the themes and libraries pinned from a ⋯.
//
// Each theme card says when it last changed (`themeUpdatedAt`, stamped by
// useThemeActivity) and whether Figma and GitHub have that change yet. A card
// selects on click and OPENS on double-click — the Open button does the same.

const CARD_MIN = 248

type HomeSection =
  | { kind: 'recents' }
  | { kind: 'styles' }
  | { kind: 'libraries' }
  | { kind: 'library'; id: string }

type SyncState = 'synced' | 'behind' | 'off'

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

function syncStateOf(connectedAt: string | null, included: boolean, updatedAt: string | undefined): SyncState {
  if (!connectedAt || !included) return 'off'
  return updatedAt && Date.parse(updatedAt) > Date.parse(connectedAt) ? 'behind' : 'synced'
}

const matches = (query: string, ...values: string[]) => {
  const q = query.trim().toLowerCase()
  return !q || values.some((v) => v.toLowerCase().includes(q))
}

const ACTION =
  'inline-flex h-7 items-center rounded-md px-2.5 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

const MENU_BTN =
  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

const LINK =
  'inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

const PRIMARY =
  'inline-flex h-8 items-center rounded-lg bg-accent-solid px-3.5 text-caption font-semibold text-accent-ink transition-opacity disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

// ── Glyphs (nav) ─────────────────────────────────────────────────────────────
const svg = (d: string) => () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={d} />
  </svg>
)
const ClockGlyph = svg('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2')
const SparkGlyph = svg('M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.5 2.5M15.2 15.2l2.5 2.5M6.3 17.7l2.5-2.5M15.2 8.8l2.5-2.5')
const StackGlyph = svg('M12 3 3 8l9 5 9-5-9-5ZM3 13l9 5 9-5')
const PinGlyph = svg('M9 4h6l-1 6 3 3v2H7v-2l3-3-1-6ZM12 15v5')
const PlusGlyph = svg('M12 5v14M5 12h14')
const ImportGlyph = svg('M12 15V3m0 0L7 8m5-5 5 5M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4')
const SearchGlyph = svg('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-3.5-3.5')
const PencilGlyph = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
  </svg>
)

// ── Theme card ───────────────────────────────────────────────────────────────

function SyncBadge({ state, service, icon }: { state: SyncState; service: string; icon: ReactNode }) {
  const { t } = useI18n()
  const words = state === 'synced' ? t('up to date') : state === 'behind' ? t('changes not synced') : t('not connected')
  const dot = state === 'synced' ? 'bg-status-success-solid' : state === 'behind' ? 'bg-status-warning-solid' : 'bg-fg/25'
  return (
    <span
      role="img"
      aria-label={`${service} — ${words}`}
      title={`${service} — ${words}`}
      className={`relative inline-flex h-5 w-5 items-center justify-center rounded-md ${state === 'off' ? 'text-fg-faint' : 'text-fg-muted'}`}
    >
      {icon}
      <span aria-hidden className={`absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-2 ring-surface ${dot}`} />
    </span>
  )
}

function ThemeCard({
  themeKey,
  active,
  isLast,
  pinned,
  figma,
  github,
  onSelect,
  onOpenPreview,
  onGetCode,
  onSyncFigma,
  onShareGithub,
  onTogglePin,
  onDelete,
}: {
  themeKey: string
  active: boolean
  /** The only theme left — the confirmation says what deleting it leaves. */
  isLast: boolean
  pinned: boolean
  figma: SyncState
  github: SyncState
  onSelect: () => void
  onOpenPreview: () => void
  onGetCode: () => void
  onSyncFigma: () => void
  onShareGithub: () => void
  onTogglePin: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const timeAgo = useTimeAgo()
  const store = useDesignStore()
  const kind = store.themeKinds[themeKey] ?? 'light'
  const tokens = useMemo(() => resolvePreviewTokens(store, themeKey, kind), [store, themeKey, kind])
  const name = themeDisplayName(themeKey, store.themeLabels)
  const updatedAt = store.themeUpdatedAt?.[themeKey]
  // A theme still in guided setup is a DRAFT: say how far it got and resume it.
  const setupStep = useSetupStep(themeKey)
  const menuBtnRef = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const commitRename = () => {
    const next = draft.trim()
    if (next && next !== name) store.setThemeLabel(themeKey, next)
    setRenaming(false)
  }
  return (
    <article
      className={`flex min-w-0 flex-col overflow-hidden rounded-xl border bg-surface transition-colors ${
        // No accent ring for the selected card: the cover is the identity,
        // and the name's weight + the inspector already say which one is open.
        'border-line hover:border-line-strong'
      }`}
    >
      <div className="relative">
        <ThemeCover t={tokens} />
        <button
          type="button"
          onClick={onSelect}
          // The file-browser gesture: one click picks, two open.
          onDoubleClick={onOpenPreview}
          aria-pressed={active}
          aria-label={t('Select {name} theme', { name })}
          title={t('Double-click to open')}
          className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/60"
        />
        {pinned && (
          <span
            aria-label={t('Pinned')}
            title={t('Pinned')}
            className="pointer-events-none absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md bg-app/90 text-fg-muted shadow-sm"
          >
            <PinGlyph />
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 border-t border-line py-1.5 pl-3 pr-1.5">
        <span className="text-fg-muted" title={kind === 'dark' ? t('Dark') : t('Light')}>
          <AppearanceGlyph kind={kind} />
        </span>
        {renaming ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') { setDraft(name); setRenaming(false) }
            }}
            aria-label={t('Rename')}
            className="h-7 min-w-0 flex-1 rounded-md border border-line-strong bg-app px-2 text-body font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          />
        ) : (
          <span className={`min-w-0 flex-1 truncate text-body text-fg ${active ? 'font-semibold' : 'font-medium'}`}>
            {name}
          </span>
        )}
        <button
          ref={menuBtnRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={t('Theme options')}
          title={t('Theme options')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className={`${MENU_BTN} ${menuOpen ? 'bg-elevated text-fg' : ''}`}
        >
          <LibraryOptionsIcon />
        </button>
        <ThemeOptionsMenu
          open={menuOpen}
          anchorRef={menuBtnRef}
          onClose={() => setMenuOpen(false)}
          pinned={pinned}
          onTogglePin={() => { setMenuOpen(false); onTogglePin() }}
          onSyncFigma={() => { setMenuOpen(false); onSyncFigma() }}
          onShareGithub={() => { setMenuOpen(false); onShareGithub() }}
          onRename={() => { setMenuOpen(false); setDraft(name); setRenaming(true) }}
          onAskDelete={() => { setMenuOpen(false); setConfirmDelete(true) }}
        />
      </div>
      {/* When it last changed, and whether the two places it ships to have
          that change yet. Words live in each badge's label; the dot is only
          the at-a-glance cue. */}
      <div className="flex items-center gap-2 px-3 pb-2 text-micro text-fg-faint">
        {setupStep != null ? (
          <span className="min-w-0 flex-1 truncate">
            <span className="mr-1.5 rounded bg-accent-ui/[0.14] px-1.5 py-0.5 font-semibold text-accent-ui">{t('Draft')}</span>
            {t('Step {n} of {total}', { n: setupStep + 1, total: SETUP_STEPS.length })}
          </span>
        ) : (
        <span className="min-w-0 flex-1 truncate">
          {updatedAt ? t('Edited {when}', { when: timeAgo(updatedAt) }) : t('Not edited yet')}
        </span>
        )}
        <SyncBadge state={figma} service="Figma" icon={<FigmaGlyph size={11} />} />
        <SyncBadge state={github} service="GitHub" icon={<GitHubGlyph size={11} />} />
      </div>
      {confirmDelete ? (
        <div className="border-t border-line p-2">
          <DeleteThemeConfirmation
            name={name}
            isPreviewed={active}
            isLast={isLast}
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => { setConfirmDelete(false); onDelete() }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-1 border-t border-line px-1.5 py-1.5">
          <button type="button" onClick={onOpenPreview} className={ACTION}>{setupStep != null ? t('Resume setup') : t('Open')}</button>
          <button type="button" onClick={onGetCode} className={ACTION}>{t('Get code')}</button>
        </div>
      )}
    </article>
  )
}

/** The last card of a theme grid: a cover-shaped door to create a theme. */
function CreateThemeCard({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  const { t } = useI18n()
  const count = myThemeKeys(useDesignStore.getState().themeOrder, useDesignStore.getState().themes).length
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? t(MY_THEME_FULL_ERROR, { count }) : undefined}
      className="group flex min-h-[15rem] min-w-0 flex-col items-center justify-center gap-3 rounded-xl border-[1.5px] border-dashed border-fg/20 p-6 text-center transition-colors hover:border-fg/40 hover:bg-elevated/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line-strong text-fg-muted transition-colors group-hover:border-fg/40 group-hover:text-fg">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
      </span>
      <span className="flex flex-col gap-1">
        <span className="text-body font-semibold text-fg">{t('Create theme')}</span>
        <span className="text-caption text-fg-faint">{t('A new theme in this folder.')}</span>
      </span>
    </button>
  )
}

/** A theme inside a SAVED library — photographed from that library's own
 *  snapshot. Read-only: it becomes editable once the library is loaded. */
function SavedThemeCard({ snapshot, themeKey }: { snapshot: DesignSnapshot; themeKey: string }) {
  const { t } = useI18n()
  const kind = snapshot.themeKinds?.[themeKey] ?? 'light'
  const tokens = useMemo(
    () => resolvePreviewTokens(snapshot as unknown as Parameters<typeof resolvePreviewTokens>[0], themeKey, kind),
    [snapshot, themeKey, kind],
  )
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <ThemeCover t={tokens} />
      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
        <span className="text-fg-muted" title={kind === 'dark' ? t('Dark') : t('Light')}>
          <AppearanceGlyph kind={kind} />
        </span>
        <span className="min-w-0 flex-1 truncate text-body font-medium text-fg">
          {themeDisplayName(themeKey, snapshot.themeLabels ?? {})}
        </span>
      </div>
    </article>
  )
}

// ── Header pieces ────────────────────────────────────────────────────────────

/** Library ⋯ — Reset and Delete my themes. */
function LibraryOptions({ hasOwnThemes, onReset, onDeleteMyThemes }: {
  hasOwnThemes: boolean
  onReset?: () => void
  onDeleteMyThemes: () => void
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])
  const item = 'flex h-8 w-full items-center rounded-md px-2.5 text-left text-caption font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset'
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('Folder options')}
        title={t('Folder options')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${open ? 'bg-elevated text-fg' : ''}`}
      >
        <LibraryOptionsIcon />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -4 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            aria-label={t('Folder options')}
            className="absolute right-0 top-full z-[60] mt-1.5 w-48 origin-top-right overflow-hidden rounded-lg border border-line-strong bg-app p-1.5 shadow-xl"
          >
            {onReset && (
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onReset() }} className={`${item} text-fg-muted hover:bg-elevated hover:text-fg focus-visible:ring-accent-ui/50`}>
                {t('Reset')}
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              disabled={!hasOwnThemes}
              onClick={() => { setOpen(false); onDeleteMyThemes() }}
              className={`${item} text-status-danger hover:bg-status-danger/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:ring-status-danger/50`}
            >
              {t('Delete my themes')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Signed out (and accounts on): say what an account adds here, and offer it. */
function GuestAccountCard() {
  const { t } = useI18n()
  const { user, loading } = useAuth()
  if (!accountsEnabled || loading || user) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3.5">
      <p className="min-w-[14rem] flex-1 text-caption text-fg-muted">
        {t('Create an account to keep your folders and open them on any device.')}
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

/** Whether the library on screen matches its saved copy. Shared by the Save
 *  button and the nav's on-screen dot, so the two can't disagree. */
function useOnScreenSaved(): { saved: SavedSystem | undefined; matches: boolean } {
  const store = useDesignStore()
  const saved = store.savedSystems.find((s) => s.id === activeLibraryId(store))
  const same = useMemo(
    () => (saved ? libraryMatchesSaved(store as unknown as DesignSnapshot, saved.snapshot) : false),
    [store, saved],
  )
  return { saved, matches: same }
}

/** Save the system on screen (every theme) as a library, with its state beside it. */
function SaveLibraryButton() {
  const { t } = useI18n()
  const timeAgo = useTimeAgo()
  const store = useDesignStore()
  const { saved, matches: same } = useOnScreenSaved()
  const [justSaved, setJustSaved] = useState(false)
  const { user, loading } = useAuth()
  const guest = accountsEnabled && !loading && !user
  // Back from /login after "Keep it in your account": finish the save.
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
    : same
      ? t('Saved {when}', { when: timeAgo(saved.savedAt) })
      : t('Unsaved changes')
  return (
    <div className="flex flex-shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
      <span role="status" className={`text-caption ${saved && !same ? 'text-fg-muted' : 'text-fg-faint'}`}>
        {saved && !same && <span aria-hidden className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-ui align-middle" />}
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
        onClick={() => {
          // Saving needs a free account (design-plans/login-funnel.md).
          if (guest) {
            rememberReturn('library', 'save-library')
            window.location.assign(loginHref({ next: 'library', mode: 'signup' }))
            return
          }
          store.saveCurrentSystem()
          setJustSaved(true)
        }}
        disabled={Boolean(saved && same && !justSaved)}
        className={PRIMARY}
      >
        {justSaved ? t('Saved') : t('Save folder')}
      </button>
    </div>
  )
}

/** Stays visible while the Home canvas scrolls — where you are on Home. */
function HomeStickyBar({ trail, onGoHome }: { trail: string | null; onGoHome: () => void }) {
  const { t } = useI18n()
  return (
    <div
      className="sticky top-0 z-20 -mx-8 flex min-h-[52px] w-full flex-shrink-0 items-center justify-start gap-2 border-b border-line bg-app/95 px-8 py-3 backdrop-blur-sm supports-[backdrop-filter]:bg-app/85"
      aria-label={trail ? t('Home — {page}', { page: trail }) : t('Home')}
    >
      {trail ? (
        <>
          <button
            type="button"
            onClick={onGoHome}
            className="flex-shrink-0 rounded-sm text-body font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Home')}
          </button>
          <span className="flex-shrink-0 text-body text-fg-faint" aria-hidden>/</span>
          <h1 className="min-w-0 truncate text-left text-heading font-semibold text-fg">{trail}</h1>
        </>
      ) : (
        <h1 className="w-full text-left text-heading font-semibold text-fg">{t('Home')}</h1>
      )}
    </div>
  )
}

/** Title row shared by every Home view. */
function ViewHeader({ crumb, title, detail, right }: { crumb?: ReactNode; title: ReactNode; detail?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      {crumb}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-[16rem] flex-1 flex-col gap-1">
          <h2 className="flex items-center gap-2 text-heading font-semibold text-fg">{title}</h2>
          {detail && <p className="text-body text-fg-muted">{detail}</p>}
        </div>
        {right && <div className="flex flex-shrink-0 items-center gap-2">{right}</div>}
      </div>
    </header>
  )
}

function SectionTitle({ id, children, count, right }: { id: string; children: ReactNode; count?: number; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h3 id={id} className="text-ui font-semibold text-fg">
        {children}
        {count != null && <span className="ml-1.5 text-caption font-normal text-fg-faint tabular-nums">{count}</span>}
      </h3>
      {right}
    </div>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-5 text-caption text-fg-faint">{children}</p>
}

// ── Library rows (saved copies) ──────────────────────────────────────────────

function LibraryRow({ sys, onOpen, pinned, onTogglePin }: {
  sys: SavedSystem
  onOpen: () => void
  pinned: boolean
  onTogglePin: () => void
}) {
  const { t } = useI18n()
  const timeAgo = useTimeAgo()
  const themeCount = myThemeKeys(sys.snapshot.themeOrder ?? [], sys.snapshot.themes ?? {}).length
  return (
    <li className="group relative flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 transition-colors hover:border-line-strong">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-elevated text-fg-muted">
        <FolderIcon size={14} />
      </span>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-col items-start text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-ui/50"
      >
        <span className="w-full truncate text-body font-semibold text-fg">{sys.name}</span>
        <span className="w-full truncate text-caption text-fg-faint">
          {themeCount === 1 ? t('1 theme') : t('{count} themes', { count: themeCount })}
          {' · '}
          {sys.repo || t('Saved in this browser')}
          {' · '}
          {timeAgo(sys.savedAt)}
        </span>
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        aria-pressed={pinned}
        aria-label={pinned ? t('Unpin {name}', { name: sys.name }) : t('Pin {name} to Home', { name: sys.name })}
        title={pinned ? t('Unpin') : t('Pin to Home')}
        className={`relative z-[1] ${MENU_BTN} ${pinned ? 'text-fg' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
      >
        <PinGlyph />
      </button>
    </li>
  )
}

// ── Right-panel menu ─────────────────────────────────────────────────────────

function NavRow({ on, icon, label, trailing, onClick, title }: {
  on: boolean
  icon: ReactNode
  label: string
  trailing?: ReactNode
  onClick: () => void
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={on ? 'page' : undefined}
      title={title ?? label}
      className={`flex h-8 w-full min-w-0 items-center gap-2.5 rounded-lg px-2.5 text-left text-caption transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50 ${
        on ? 'bg-fg/[0.08] font-semibold text-fg' : 'font-medium text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
      }`}
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  )
}

function NavGroup({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line pt-3">
      <div className="flex h-6 items-center justify-between pl-2.5 pr-1">
        <span className="text-micro font-semibold text-fg-faint">{label}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function HomeNav({
  section, onSection, query, onQuery, onOpenTheme, onNewSystem, onImport,
}: {
  section: HomeSection
  onSection: (next: HomeSection) => void
  query: string
  onQuery: (q: string) => void
  onOpenTheme: (key: string) => void
  onNewSystem: () => void
  onImport: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const currentId = activeLibraryId(store)
  const { saved, matches: same } = useOnScreenSaved()
  const others = store.savedSystems.filter((s) => s.id !== currentId)
  const mine = myThemeKeys(store.themeOrder, store.themes)
  const pinnedThemes = store.pinned.filter((p) => p.startsWith('theme:')).map((p) => p.slice(6)).filter((k) => mine.includes(k))
  const pinnedLibraries = store.pinned
    .filter((p) => p.startsWith('library:'))
    .map((p) => p.slice(8))
    .filter((id) => id === currentId || others.some((s) => s.id === id))
  const nameOf = (id: string) => (id === currentId ? store.projectName : others.find((s) => s.id === id)?.name ?? id)
  const isOn = (kind: HomeSection['kind'], id?: string) => section.kind === kind && (id == null || (section.kind === 'library' && section.id === id))
  const iconBtn = 'flex h-6 w-6 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-fg/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  return (
    <InspectorPortal>
      <nav aria-label={t('Home')} className="flex min-h-0 flex-col gap-3 overflow-y-auto px-3 pb-4 pt-3">
        <label className="relative flex items-center">
          <span className="pointer-events-none absolute left-2.5 text-fg-faint"><SearchGlyph /></span>
          <span className="sr-only">{t('Search files and folders')}</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('Search')}
            className="h-8 w-full rounded-lg border border-line bg-app pl-8 pr-2.5 text-caption text-fg placeholder:text-fg-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          />
        </label>
        <div className="flex flex-col gap-0.5">
          <NavRow on={isOn('recents')} icon={<ClockGlyph />} label={t('Recents')} onClick={() => onSection({ kind: 'recents' })} />
          <NavRow on={isOn('styles')} icon={<SparkGlyph />} label={t('System styles')} onClick={() => onSection({ kind: 'styles' })} />
        </div>
        <NavGroup
          label={t('Folders')}
          action={(
            <span className="flex items-center">
              <button type="button" onClick={onImport} aria-label={t('Import JSON')} title={t('Import JSON')} className={iconBtn}><ImportGlyph /></button>
              <button type="button" onClick={onNewSystem} aria-label={t('New folder')} title={t('New folder')} className={iconBtn}><PlusGlyph /></button>
            </span>
          )}
        >
          <NavRow
            on={isOn('library', currentId)}
            icon={<FolderIcon size={13} />}
            label={store.projectName}
            title={t('{name} — the folder on screen', { name: store.projectName })}
            onClick={() => onSection({ kind: 'library', id: currentId })}
            trailing={(
              <span className="flex flex-shrink-0 items-center gap-1.5">
                {(!saved || !same) && <span aria-label={t('Unsaved changes')} title={t('Unsaved changes')} className="h-1.5 w-1.5 rounded-full bg-accent-ui" />}
                <span className="text-micro font-normal tabular-nums text-fg-faint">{mine.length}</span>
              </span>
            )}
          />
          {others.map((sys) => (
            <NavRow
              key={sys.id}
              on={isOn('library', sys.id)}
              icon={<FolderIcon size={13} />}
              label={sys.name}
              onClick={() => onSection({ kind: 'library', id: sys.id })}
            />
          ))}
          <NavRow on={isOn('libraries')} icon={<StackGlyph />} label={t('All folders')} onClick={() => onSection({ kind: 'libraries' })} />
        </NavGroup>
        <NavGroup label={t('Pinned')}>
          {pinnedThemes.length + pinnedLibraries.length === 0 ? (
            <p className="px-2.5 py-1 text-micro leading-relaxed text-fg-faint">{t('Pin a file or a folder from its menu to keep it here.')}</p>
          ) : (
            <>
              {pinnedThemes.map((key) => (
                <NavRow
                  key={`t-${key}`}
                  on={false}
                  icon={<PinGlyph />}
                  label={themeDisplayName(key, store.themeLabels)}
                  title={t('Open {name}', { name: themeDisplayName(key, store.themeLabels) })}
                  onClick={() => onOpenTheme(key)}
                />
              ))}
              {pinnedLibraries.map((id) => (
                <NavRow
                  key={`l-${id}`}
                  on={isOn('library', id)}
                  icon={<FolderIcon size={13} />}
                  label={nameOf(id)}
                  onClick={() => onSection({ kind: 'library', id })}
                />
              ))}
            </>
          )}
        </NavGroup>
      </nav>
    </InspectorPortal>
  )
}

// ── System styles ────────────────────────────────────────────────────────────

/**
 * A System Style as a picture: its cover (the same `ThemeCover` My themes use,
 * painted from the preset itself) and its name. Hover or focus reveals one
 * action — Preview, which tries the style on the Theme board without adding
 * it; the board's own panel then offers Add theme. A style already in My
 * themes opens that theme instead.
 */
function styleCoverTokens(preset: ThemeStylePreset, appearance: 'light' | 'dark') {
  return resolveStylePreviewTokens(useDesignStore.getState(), { preset, appearance }, '__style-cover')
}

const FOLDER_CARD_BTN =
  'group flex w-full max-w-[28rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

/** Footer row shared by folder cards + style cards (Figma-style folder card). */
function FolderCardFooter({ title, detail, kind }: { title: string; detail: string; kind: 'library' | 'styles' }) {
  const accent = kind === 'styles'
    ? <SparkGlyph />
    : <FolderIcon size={14} />
  return (
    <div className="flex items-start gap-2.5 border-t border-line px-3 py-2.5">
      <span className="mt-0.5 flex-shrink-0 text-fg-muted" aria-hidden>
        <FolderIcon size={14} />
      </span>
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-accent-ui/[0.14] text-accent-ui" aria-hidden>
        {accent}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-fg">{title}</p>
        <p className="truncate text-caption text-fg-faint">{detail}</p>
      </div>
    </div>
  )
}

function ThemeCoverThumbPlaceholder() {
  return <div className="aspect-[16/10] min-w-0 rounded-lg border border-dashed border-line/70 bg-elevated/40" aria-hidden />
}

function ThemeKeyCoverThumb({ themeKey }: { themeKey: string }) {
  const store = useDesignStore()
  const kind = store.themeKinds[themeKey] ?? 'light'
  const tokens = useMemo(() => resolvePreviewTokens(store, themeKey, kind), [store, themeKey, kind])
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line/70">
      <ThemeCover t={tokens} />
    </div>
  )
}

function StyleCoverThumb({ preset, appearance }: { preset: ThemeStylePreset; appearance: 'light' | 'dark' }) {
  const tokens = useMemo(() => styleCoverTokens(preset, appearance), [preset, appearance])
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-line/70">
      <ThemeCover t={tokens} />
    </div>
  )
}

/** Default library on screen — My themes live here (e.g. Escala). */
function DefaultLibraryFolderCard({
  name,
  themeKeys,
  onOpen,
}: {
  name: string
  themeKeys: string[]
  onOpen: () => void
}) {
  const { t } = useI18n()
  const thumbs = themeKeys.slice(0, 3)
  const pads = Math.max(0, 3 - thumbs.length)
  const count = themeKeys.length
  const themesLine = count === 1 ? t('1 theme') : t('{count} themes', { count })
  const detail = `${themesLine} · ${t('On screen')}`
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t('Open {name}', { name })}
      className={FOLDER_CARD_BTN}
    >
      <div className="grid grid-cols-3 gap-2 p-3">
        {thumbs.map((key) => <ThemeKeyCoverThumb key={key} themeKey={key} />)}
        {Array.from({ length: pads }, (_, i) => <ThemeCoverThumbPlaceholder key={`pad-${i}`} />)}
      </div>
      <FolderCardFooter title={name} detail={detail} kind="library" />
    </button>
  )
}

/** Curated styles as one folder: three covers on top, name on the bottom row. */
function SystemStylesFolderCard({
  presets,
  appearance,
  onOpen,
}: {
  presets: ThemeStylePreset[]
  appearance: 'light' | 'dark'
  onOpen: () => void
}) {
  const { t } = useI18n()
  const thumbs = presets.slice(0, 3)
  const detail = t('{count} system styles', { count: presets.length })
  return (
    <button type="button" onClick={onOpen} className={FOLDER_CARD_BTN}>
      <div className="grid grid-cols-3 gap-2 p-3">
        {thumbs.map((preset) => (
          <StyleCoverThumb key={preset.id} preset={preset} appearance={appearance} />
        ))}
      </div>
      <FolderCardFooter title={t('System styles')} detail={detail} kind="styles" />
    </button>
  )
}

function StyleCard({ preset, owned, appearance, onPreview, onOpen }: {
  preset: ThemeStylePreset
  owned: boolean
  appearance: 'light' | 'dark'
  onPreview: () => void
  onOpen: () => void
}) {
  const { t } = useI18n()
  // Painted once per style and appearance: a cover is a thumbnail, it doesn't
  // need to follow every edit to the open system.
  const tokens = useMemo(() => styleCoverTokens(preset, appearance), [preset, appearance])
  const action = owned ? onOpen : onPreview
  const detail = owned ? t('In My themes') : preset.description
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="relative overflow-hidden">
        <ThemeCover t={tokens} />
        {/* Pinterest-style: the cover dims and the one action appears. The whole
            cover is the target; the pill only names it. */}
        <button
          type="button"
          onClick={action}
          aria-label={owned ? t('Open {name}', { name: preset.label }) : t('Preview {name}', { name: preset.label })}
          className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 ease-[var(--ease-out-quint)] group-hover:bg-black/35 focus-visible:bg-black/35 focus-visible:outline-none"
        >
          <span className="flex h-9 translate-y-1 items-center gap-1.5 rounded-full bg-white px-4 text-ui font-semibold text-neutral-900 opacity-0 shadow-lg transition-[opacity,transform] duration-200 ease-[var(--ease-out-quint)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none">
            {owned ? t('Open') : t('Preview')}
          </span>
        </button>
      </div>
      <FolderCardFooter title={preset.label} detail={detail} kind="styles" />
    </article>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ThemeLibraryPage({
  previewTheme,
  figmaThemes,
  onSelectTheme,
  onOpenPreview,
  onGetCode,
  onSyncFigma,
  onShareGithub,
  onCreateTheme,
  onStartTheme,
  createPending = false,
  onCreateHandled,
  onPreviewStyle,
  onOpenReset,
  onNewSystem,
  onImport,
  enterFolderTick = 0,
}: {
  previewTheme: string
  /** Themes the live Figma sync publishes (File & modes). */
  figmaThemes: string[]
  /** Make this the theme every other page reads, without leaving Home. */
  onSelectTheme: (key: string) => void
  onOpenPreview: (key: string) => void
  onGetCode: (key: string) => void
  /** Preview the theme and open its Figma sync page. */
  onSyncFigma: (key: string) => void
  /** Preview the theme and open the GitHub page. */
  onShareGithub: (key: string) => void
  /** Opens the theme sheet on its create view (owned by the shell). */
  onCreateTheme: () => void
  /** Continue on the first step: open the new theme on the Theme board to set
   *  the rest. Without it, creating only selects the theme. */
  onStartTheme?: (key: string) => void
  /** Another door asked to create a theme: open the form, then report back. */
  createPending?: boolean
  onCreateHandled?: () => void
  /** Try a System Style on the Theme board without adding it. */
  onPreviewStyle?: (preset: ThemeStylePreset) => void
  /** The Reset modal (this theme / whole system), owned by the shell. */
  onOpenReset?: () => void
  /** Opens the guided New-system modal (owned by the shell). */
  onNewSystem: () => void
  /** Opens the Import-JSON modal (owned by the shell). */
  onImport: () => void
  /** After a new folder is created, open that folder so a file can be added inside it. */
  enterFolderTick?: number
}) {
  const { t } = useI18n()
  const timeAgo = useTimeAgo()
  const { gated } = useAccess()
  const store = useDesignStore()
  const chromeAppearance = useTheme() === 'dark' ? 'dark' : 'light'
  const inInspector = useInInspector()
  const [creating, setCreating] = useState(false)
  // In the Generator the form opens in the inspector; anywhere without one
  // it falls back to the shell's Create (the Customize sheet).
  // Creating a theme is a focused task: the rest of the shell (banner, top
  // bar, Home rail) steps back too, tagged `data-shell-chrome` where it is built.
  useEffect(() => {
    if (!creating) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-shell-chrome]'))
    els.forEach((el) => {
      el.inert = true
      el.style.opacity = '0.3'
      el.style.pointerEvents = 'none'
      el.style.transition = 'opacity 200ms cubic-bezier(0.22, 1, 0.36, 1)'
    })
    return () => els.forEach((el) => {
      el.inert = false
      el.style.opacity = ''
      el.style.pointerEvents = ''
      el.style.transition = ''
    })
  }, [creating])
  useEffect(() => {
    if (!createPending || !inInspector) return
    setCreating(true)
    onCreateHandled?.()
  }, [createPending, inInspector, onCreateHandled])
  const openCreate = () => (inInspector ? setCreating(true) : onCreateTheme())
  const { themeOrder, themes, removeTheme, themeUpdatedAt, pinned, togglePinned } = store
  const currentId = activeLibraryId(store)
  const mine = myThemeKeys(themeOrder, themes)
  const recent = byRecent(mine, themeUpdatedAt ?? {})
  const others = store.savedSystems.filter((s) => s.id !== currentId)
  const [section, setSection] = useState<HomeSection>({ kind: 'recents' })
  useEffect(() => {
    if (!enterFolderTick) return
    setSection({ kind: 'library', id: currentId })
  }, [enterFolderTick, currentId])
  const [query, setQuery] = useState('')
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmSaved, setConfirmSaved] = useState<'load' | 'delete' | null>(null)
  const [renamingLibrary, setRenamingLibrary] = useState(false)
  const [libraryDraft, setLibraryDraft] = useState(store.projectName)
  const [styleError, setStyleError] = useState<string | null>(null)
  // A saved library that was loaded (or deleted) under an open view: the id
  // either became the one on screen or no longer exists — fall back sanely.
  const viewing: HomeSection = section.kind === 'library' && section.id !== currentId && !others.some((s) => s.id === section.id)
    ? { kind: 'recents' }
    : section
  useEffect(() => { setConfirmSaved(null) }, [section])

  const deleteTheme = (key: string) => {
    if (key === previewTheme) {
      const next = mine.find((k) => k !== key) ?? themeOrder.find((k) => k !== key && themes[k])
      if (next) onSelectTheme(next)
    }
    removeTheme(key)
  }
  const deleteMyThemes = () => {
    const fallback = themeOrder.find((k) => !mine.includes(k) && themes[k])
    if (mine.includes(previewTheme) && fallback) onSelectTheme(fallback)
    mine.forEach((key) => removeTheme(key))
    setConfirmDeleteAll(false)
  }
  const useStyle = (preset: ThemeStylePreset) => {
    if (gated) { goToLogin(); return }
    const result = openStyleForEditing(preset, 'light')
    if ('error' in result) { setStyleError(t(result.error, { count: MY_THEME_HARD_CAP })); return }
    setStyleError(null)
    onOpenPreview(result.key)
  }

  const themeGrid = (keys: string[], withCreate: boolean) => (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN}px, 1fr))` }}>
      {keys.map((key) => (
        <ThemeCard
          key={key}
          themeKey={key}
          active={key === previewTheme}
          isLast={mine.length <= 1}
          pinned={pinned.includes(`theme:${key}`)}
          figma={syncStateOf(store.figmaLastPublishAt, figmaThemes.includes(key), themeUpdatedAt?.[key])}
          github={syncStateOf(store.githubRepo ? store.githubLastPushAt : null, true, themeUpdatedAt?.[key])}
          onSelect={() => onSelectTheme(key)}
          onOpenPreview={() => onOpenPreview(key)}
          onGetCode={() => onGetCode(key)}
          onSyncFigma={() => onSyncFigma(key)}
          onShareGithub={() => onShareGithub(key)}
          onTogglePin={() => togglePinned(`theme:${key}`)}
          onDelete={() => { finishThemeSetup(key); deleteTheme(key) }}
        />
      ))}
      {withCreate && <CreateThemeCard disabled={!canAddMyTheme(mine.length)} onClick={openCreate} />}
    </div>
  )
  const themeMatches = (key: string) => matches(query, themeDisplayName(key, store.themeLabels))
  const libraryList = (list: SavedSystem[]) => (
    <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
      {list.map((sys) => (
        <LibraryRow
          key={sys.id}
          sys={sys}
          onOpen={() => setSection({ kind: 'library', id: sys.id })}
          pinned={pinned.includes(`library:${sys.id}`)}
          onTogglePin={() => togglePinned(`library:${sys.id}`)}
        />
      ))}
    </ul>
  )
  const sectionBackCrumb = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="-ml-2 inline-flex h-7 items-center gap-1.5 self-start rounded-md px-2 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 18l-6-6 6-6" /></svg>
      {label}
    </button>
  )
  const homeRecentsCrumb = sectionBackCrumb(t('Home'), () => setSection({ kind: 'recents' }))
  const libraryCrumb = sectionBackCrumb(t('All folders'), () => setSection({ kind: 'libraries' }))
  const commitLibraryName = () => {
    const next = libraryDraft.trim()
    if (next && next !== store.projectName) store.setProjectName(next)
    setRenamingLibrary(false)
  }

  const homeTrail = (() => {
    if (viewing.kind === 'recents') return null
    if (viewing.kind === 'styles') return t('System styles')
    if (viewing.kind === 'libraries') return t('All folders')
    if (viewing.kind === 'library') {
      if (viewing.id === currentId) return store.projectName
      return others.find((s) => s.id === viewing.id)?.name ?? viewing.id
    }
    return null
  })()

  let body: ReactNode
  if (viewing.kind === 'recents') {
    const themesShown = recent.filter(themeMatches)
    const libs = [...others].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)).filter((s) => matches(query, s.name))
    body = (
      <>
        <section aria-labelledby="home-recently" className="flex flex-col gap-3">
          <SectionTitle id="home-recently" count={themesShown.length}>
            {t('Recently')}
          </SectionTitle>
          {themesShown.length === 0 && query ? <EmptyNote>{t('No theme matches “{q}”.', { q: query })}</EmptyNote> : themeGrid(themesShown, true)}
        </section>
        {!query && (
          <>
            <div className="border-t border-line" role="separator" />
            <section aria-labelledby="home-files" className="flex flex-col gap-3">
              <SectionTitle
                id="home-files"
                right={(
                  <button
                    type="button"
                    onClick={onNewSystem}
                    className={LINK}
                  >
                    <PlusGlyph />
                    {t('Create folder')}
                  </button>
                )}
              >
                {t('Files')}
              </SectionTitle>
              <div className="flex flex-wrap gap-4">
                <DefaultLibraryFolderCard
                  name={store.projectName}
                  themeKeys={recent}
                  onOpen={() => setSection({ kind: 'library', id: currentId })}
                />
                <SystemStylesFolderCard
                  presets={THEME_STYLE_PRESETS}
                  appearance={chromeAppearance}
                  onOpen={() => setSection({ kind: 'styles' })}
                />
              </div>
            </section>
          </>
        )}
        {libs.length > 0 && (
          <section aria-labelledby="home-recent-libraries" className="flex flex-col gap-3">
            <SectionTitle id="home-recent-libraries" count={libs.length}>{t('Other folders')}</SectionTitle>
            {libraryList(libs)}
          </section>
        )}
      </>
    )
  } else if (viewing.kind === 'styles') {
    const presets = THEME_STYLE_PRESETS.filter((p) => matches(query, p.label, p.description))
    body = (
      <>
        <ViewHeader
          crumb={homeRecentsCrumb}
          title={t('System styles')}
          detail={t('Curated starting points. Preview one on the board, then add it to My themes.')}
        />
        {styleError && <p role="alert" className="text-caption text-status-danger">{styleError}</p>}
        {presets.length === 0 ? <EmptyNote>{t('No style matches “{q}”.', { q: query })}</EmptyNote> : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(16rem,1fr))]">
            {presets.map((preset) => (
              <StyleCard
                key={preset.id}
                preset={preset}
                owned={mine.some((key) => store.themeOrigin?.[key] === preset.id)}
                appearance={chromeAppearance}
                onPreview={() => onPreviewStyle?.(preset)}
                onOpen={() => useStyle(preset)}
              />
            ))}
          </div>
        )}
      </>
    )
  } else if (viewing.kind === 'libraries') {
    const list = others.filter((s) => matches(query, s.name))
    body = (
      <>
        <ViewHeader
          title={t('All folders')}
          detail={t('A folder holds files — each file is a theme. One folder is on screen at a time.')}
          right={(
            <>
              <button type="button" onClick={onImport} className={LINK}><ImportGlyph />{t('Import JSON')}</button>
              <button type="button" onClick={onNewSystem} className={LINK}><PlusGlyph />{t('New folder')}</button>
            </>
          )}
        />
        <GuestAccountCard />
        <section aria-labelledby="home-on-screen" className="flex flex-col gap-3">
          <SectionTitle id="home-on-screen">{t('On screen')}</SectionTitle>
          <ul className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(18rem,1fr))]">
            <li className="group relative flex items-center gap-3 rounded-xl border border-line-strong bg-surface px-3.5 py-3">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent-ui/[0.14] text-accent-ui">
                <FolderIcon size={14} />
              </span>
              <button
                type="button"
                onClick={() => setSection({ kind: 'library', id: currentId })}
                className="flex min-w-0 flex-1 flex-col items-start text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent-ui/50"
              >
                <span className="w-full truncate text-body font-semibold text-fg">{store.projectName}</span>
                <span className="w-full truncate text-caption text-fg-faint">
                  {mine.length === 1 ? t('1 theme') : t('{count} themes', { count: mine.length })}
                </span>
              </button>
            </li>
          </ul>
        </section>
        <section aria-labelledby="home-saved" className="flex flex-col gap-3">
          <SectionTitle id="home-saved" count={list.length}>{t('Saved')}</SectionTitle>
          {list.length === 0
            ? <EmptyNote>{query ? t('No folder matches “{q}”.', { q: query }) : t('Nothing else saved yet. New folder starts another system; Save folder keeps a copy of this one.')}</EmptyNote>
            : libraryList(list)}
        </section>
      </>
    )
  } else if (viewing.id === currentId) {
    // The DEFAULT library: the system on screen, with My themes inside it.
    const themesShown = recent.filter(themeMatches)
    const libPinned = pinned.includes(`library:${currentId}`)
    body = (
      <>
        <ViewHeader
          crumb={libraryCrumb}
          title={(
            <>
              <span className="text-fg-muted"><FolderIcon size={18} /></span>
              {renamingLibrary ? (
                <input
                  autoFocus
                  value={libraryDraft}
                  onChange={(e) => setLibraryDraft(e.target.value)}
                  onBlur={commitLibraryName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitLibraryName()
                    if (e.key === 'Escape') { setLibraryDraft(store.projectName); setRenamingLibrary(false) }
                  }}
                  aria-label={t('Folder name')}
                  className="h-9 min-w-0 rounded-lg border border-line-strong bg-app px-2 text-heading font-semibold text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
                />
              ) : (
                <>
                  <span className="min-w-0 truncate">{store.projectName}</span>
                  <button
                    type="button"
                    onClick={() => { setLibraryDraft(store.projectName); setRenamingLibrary(true) }}
                    aria-label={t('Rename folder')}
                    title={t('Rename folder')}
                    className={MENU_BTN}
                  >
                    <PencilGlyph />
                  </button>
                </>
              )}
              <span className="flex-shrink-0 rounded-full bg-elevated px-2 py-0.5 text-micro font-medium text-fg-muted">{t('On screen')}</span>
            </>
          )}
          detail={t('The folder you are working in. Every file here is a theme that shares its foundations and ships together.')}
          right={(
            <>
              <button
                type="button"
                onClick={openCreate}
                disabled={!canAddMyTheme(mine.length)}
                title={!canAddMyTheme(mine.length) ? t(MY_THEME_FULL_ERROR, { count: MY_THEME_HARD_CAP }) : undefined}
                className={LINK}
              >
                <PlusGlyph />
                {t('Create theme')}
              </button>
              <button
                type="button"
                onClick={() => togglePinned(`library:${currentId}`)}
                aria-pressed={libPinned}
                aria-label={libPinned ? t('Unpin') : t('Pin to Home')}
                title={libPinned ? t('Unpin') : t('Pin to Home')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${libPinned ? 'bg-elevated text-fg' : 'text-fg-muted'}`}
              >
                <PinGlyph />
              </button>
              <SaveLibraryButton />
              <LibraryOptions
                hasOwnThemes={mine.length > 0}
                onReset={onOpenReset}
                onDeleteMyThemes={() => setConfirmDeleteAll(true)}
              />
            </>
          )}
        />
        <AnimatePresence initial={false}>
          {confirmDeleteAll && (
            <div className="max-w-sm self-end">
              <DeleteMyThemesConfirmation
                count={mine.length}
                onCancel={() => setConfirmDeleteAll(false)}
                onConfirm={deleteMyThemes}
              />
            </div>
          )}
        </AnimatePresence>
        <GuestAccountCard />
        <section aria-labelledby="home-library-themes" className="flex flex-col gap-3">
          <SectionTitle id="home-library-themes" count={themesShown.length}>{t('Files')}</SectionTitle>
          {themesShown.length === 0 && query ? <EmptyNote>{t('No theme matches “{q}”.', { q: query })}</EmptyNote> : themeGrid(themesShown, !query)}
        </section>
      </>
    )
  } else {
    // A saved library: look inside, then load it to edit.
    const sys = others.find((s) => s.id === viewing.id)!
    const keys = myThemeKeys(sys.snapshot.themeOrder ?? [], sys.snapshot.themes ?? {})
    const shown = byRecent(keys, sys.snapshot.themeUpdatedAt ?? {}).filter((k) => matches(query, themeDisplayName(k, sys.snapshot.themeLabels ?? {})))
    const libPinned = pinned.includes(`library:${sys.id}`)
    body = (
      <>
        <ViewHeader
          crumb={libraryCrumb}
          title={(<><span className="text-fg-muted"><FolderIcon size={18} /></span><span className="min-w-0 truncate">{sys.name}</span></>)}
          detail={`${sys.repo || t('Saved in this browser')} · ${t('Saved {when}', { when: timeAgo(sys.savedAt) })}`}
          right={confirmSaved ? (
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5">
              <span className="text-caption text-fg-muted">
                {confirmSaved === 'load' ? t('Replace what is on screen?') : t('Delete this folder from this browser?')}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirmSaved === 'load') store.loadSystem(sys.id)
                  else store.removeSavedSystem(sys.id)
                  setConfirmSaved(null)
                  setSection(confirmSaved === 'load' ? { kind: 'library', id: sys.id } : { kind: 'libraries' })
                }}
                className={`text-caption font-semibold hover:underline ${confirmSaved === 'load' ? 'text-accent-ui' : 'text-status-danger'}`}
              >
                {confirmSaved === 'load' ? t('Load') : t('Delete')}
              </button>
              <button type="button" onClick={() => setConfirmSaved(null)} className="text-caption text-fg-faint hover:text-fg">{t('Cancel')}</button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => togglePinned(`library:${sys.id}`)}
                aria-pressed={libPinned}
                aria-label={libPinned ? t('Unpin') : t('Pin to Home')}
                title={libPinned ? t('Unpin') : t('Pin to Home')}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line transition-colors hover:border-line-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${libPinned ? 'bg-elevated text-fg' : 'text-fg-muted'}`}
              >
                <PinGlyph />
              </button>
              <button type="button" onClick={() => setConfirmSaved('delete')} className={`${ACTION} hover:text-status-danger`}>{t('Delete')}</button>
              <button type="button" onClick={() => setConfirmSaved('load')} className={PRIMARY}>{t('Load folder')}</button>
            </>
          )}
        />
        <section aria-labelledby="home-saved-themes" className="flex flex-col gap-3">
          <SectionTitle id="home-saved-themes" count={shown.length}>{t('Files')}</SectionTitle>
          {shown.length === 0
            ? <EmptyNote>{query ? t('No theme matches “{q}”.', { q: query }) : t('This folder has no files of its own yet.')}</EmptyNote>
            : (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${CARD_MIN}px, 1fr))` }}>
                {shown.map((key) => <SavedThemeCard key={key} snapshot={sys.snapshot} themeKey={key} />)}
              </div>
            )}
        </section>
      </>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {creating ? (
        // Create opens IN the inspector, beside the grid it adds to — the same
        // form the Customize sheet and the theme editor use. ✕ / Cancel step
        // back to the Home menu; creating selects the new theme.
        <InspectorPortal>
          <div className="flex min-h-0 flex-1 flex-col">
            <ThemeForm
              key="home-create"
              firstStep
              appearance={chromeAppearance}
              onClose={() => setCreating(false)}
              onCreated={(key) => { setCreating(false); (onStartTheme ?? onSelectTheme)(key) }}
            />
          </div>
        </InspectorPortal>
      ) : (
      <HomeNav
        section={viewing}
        onSection={setSection}
        query={query}
        onQuery={setQuery}
        onOpenTheme={onOpenPreview}
        onNewSystem={onNewSystem}
        onImport={onImport}
      />
      )}
      {/* While a theme is being created the page steps back: dimmed and
          inert, so the form in the inspector is the only thing to act on. */}
      <div
        inert={creating}
        aria-hidden={creating || undefined}
        className={`mx-auto flex max-w-6xl flex-col gap-8 px-8 pb-7 pt-0 transition-opacity duration-200 ease-[var(--ease-out-quint)] ${creating ? 'pointer-events-none select-none opacity-30' : ''}`}
      >
        <HomeStickyBar trail={homeTrail} onGoHome={() => setSection({ kind: 'recents' })} />
        {body}
      </div>
    </div>
  )
}
