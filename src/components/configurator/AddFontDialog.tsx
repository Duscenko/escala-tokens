/**
 * AddFontDialog — add a font family the built-in list does not carry.
 *
 * Phase 1 of design-plans/custom-fonts.md: a Google Fonts family by name, or a
 * stylesheet from an allowed provider (Adobe Fonts, Fontshare, Bunny Fonts).
 * Nothing is uploaded to Escala. The family lands in `fontSources` and, when
 * opened from a field, is applied to that field.
 *
 * Gated by `useFontAccess` at the door (`AddFontButton`): adding is for a
 * signed-in account whose design system has a saved copy.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDesignStore } from '../../store/useDesignStore'
import { useI18n } from '../../lib/i18n'
import { fontStack, reloadFont } from '../../lib/fonts'
import { goToLogin, useFontAccess } from '../../lib/access'
import {
  ALLOWED_FONT_HOSTS, FONT_CATEGORIES, MAX_FONT_SOURCES, checkFontStylesheetUrl, familiesInGoogleUrl,
  familiesInStylesheet, GOOGLE_STANDARD_SPEC, googleFontUrl, normalizeFamilyName, type FontCategory, type FontSource,
} from '../../lib/customFonts'
import { SEGMENT_ACTIVE_INK, SEGMENT_INACTIVE } from './themeWorkspaceLayout'
import { SegmentHighlight } from '../ui/SegmentHighlight'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
const FIELD = `h-8 w-full rounded-lg border border-line-strong bg-app px-2.5 text-ui text-fg placeholder:text-fg-faint ${FOCUS}`

type Kind = FontSource['kind']
type Check = { state: 'idle' } | { state: 'checking' } | { state: 'ok'; note?: string } | { state: 'error'; message: string }

/** The generic a family most likely falls back to — same hints as fontStack. */
function guessCategory(family: string): FontCategory {
  const generic = fontStack(family).split(', ').pop()
  return generic === 'serif' ? 'Serif' : generic === 'monospace' ? 'Mono' : 'Sans-serif'
}

const URL_ERRORS: Record<string, string> = {
  invalid: 'That is not a URL.',
  https: 'The stylesheet must load over https.',
  credentials: 'Remove the user name or password from the URL.',
  host: 'Only stylesheets from Google Fonts, Adobe Fonts, Fontshare and Bunny Fonts can be added.',
}

export function AddFontDialog({ open, onClose, onAdded }: {
  open: boolean
  onClose: () => void
  /** The family just added — the caller applies it to its field. */
  onAdded?: (family: string) => void
}) {
  const { t } = useI18n()
  const fontSources = useDesignStore((s) => s.fontSources ?? [])
  const addFontSource = useDesignStore((s) => s.addFontSource)
  const removeFontSource = useDesignStore((s) => s.removeFontSource)
  const [kind, setKind] = useState<Kind>('google')
  const [family, setFamily] = useState('')
  const [url, setUrl] = useState('')
  const [detected, setDetected] = useState<string[]>([])
  const [category, setCategory] = useState<FontCategory>('Sans-serif')
  const [categoryTouched, setCategoryTouched] = useState(false)
  const [check, setCheck] = useState<Check>({ state: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)

  // Callers pass an inline `onClose`; keep the latest without re-running the
  // reset below on every parent render (that wiped what was typed).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  useEffect(() => {
    if (!open) return
    setKind('google'); setFamily(''); setUrl(''); setDetected([]); setCategory('Sans-serif')
    setCategoryTouched(false); setCheck({ state: 'idle' })
    const id = window.setTimeout(() => inputRef.current?.focus(), 0)
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onCloseRef.current() } }
    document.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(id); document.removeEventListener('keydown', onKey) }
  }, [open])

  const name = normalizeFamilyName(family)
  useEffect(() => { if (name && !categoryTouched) setCategory(guessCategory(name)) }, [name, categoryTouched])
  // Any edit invalidates the last check.
  useEffect(() => { setCheck({ state: 'idle' }) }, [kind, family, url])

  const urlCheck = useMemo(() => (url.trim() ? checkFontStylesheetUrl(url) : null), [url])
  const full = fontSources.length >= MAX_FONT_SOURCES && !fontSources.some((s) => s.family.toLowerCase() === name?.toLowerCase())

  // Read the families a pasted stylesheet declares, when the provider lets the
  // browser read it (Google and Bunny do; a refusal just means: type the name).
  useEffect(() => {
    setDetected([])
    if (kind !== 'css' || !urlCheck?.ok) return
    const fromUrl = familiesInGoogleUrl(urlCheck.url)
    if (fromUrl.length) { setDetected(fromUrl); if (!family) setFamily(fromUrl[0]); return }
    let alive = true
    fetch(urlCheck.url)
      .then((r) => (r.ok ? r.text() : ''))
      .then((css) => {
        if (!alive) return
        const found = familiesInStylesheet(css)
        setDetected(found)
        if (found.length && !family) setFamily(found[0])
      })
      .catch(() => {})
    return () => { alive = false }
    // `family` is read, not watched: detection must not refire on typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, urlCheck])

  const canSubmit = Boolean(name) && !full && check.state !== 'checking' && (kind === 'google' || urlCheck?.ok === true)

  async function submit() {
    if (!name || !canSubmit) return
    let source: FontSource
    if (kind === 'google') {
      setCheck({ state: 'checking' })
      // Ask for the four standard weights first; a family that lacks one may
      // refuse it, so then ask for the family alone (its default weight).
      // Only a refusal of THAT means the name does not exist.
      let spec: string | undefined
      const full = await probeStylesheet(googleFontUrl(name, GOOGLE_STANDARD_SPEC))
      if (full === 'ok') spec = GOOGLE_STANDARD_SPEC
      else if (full === 'missing' && (await probeStylesheet(googleFontUrl(name))) === 'missing') {
        setCheck({ state: 'error', message: t('Google Fonts has no family with that name. Check the spelling, e.g. "Space Grotesk".') })
        return
      }
      source = { family: name, kind: 'google', category, ...(spec ? { spec } : {}) }
    } else {
      if (!urlCheck?.ok) return
      setCheck({ state: 'checking' })
      if ((await probeStylesheet(urlCheck.url)) === 'missing') {
        setCheck({ state: 'error', message: t('That stylesheet did not load. Check the URL, and that the kit allows this site.') })
        return
      }
      source = { family: name, kind: 'css', url: urlCheck.url, category }
    }
    addFontSource(source)
    reloadFont(name)
    onAdded?.(name)
    onClose()
  }

  if (!open) return null
  const previewFamily = name && check.state !== 'error' ? name : null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-6" onMouseDown={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-font-title"
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-line bg-app p-5 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => { event.preventDefault(); void submit() }}
      >
        <div>
          <h2 id="add-font-title" className="text-strong font-semibold text-fg">{t('Add a font')}</h2>
          <p className="mt-1 text-caption text-fg-muted">{t('The font joins this design system and ships with its code export. In Figma, install the same font to render it.')}</p>
        </div>

        <div role="radiogroup" aria-label={t('Source')} className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-0.5">
          {([['google', 'Google Fonts'], ['css', 'Stylesheet URL']] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={kind === value}
              onClick={() => { if (value !== kind) { setKind(value); setFamily('') } }}
              className={`relative h-7 rounded-md text-caption transition-colors ${FOCUS} ${kind === value ? SEGMENT_ACTIVE_INK : SEGMENT_INACTIVE}`}
            >
              {kind === value && <SegmentHighlight group="add-font-source" />}
              <span className="relative">{t(label)}</span>
            </button>
          ))}
        </div>

        {kind === 'css' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium text-fg">{t('Stylesheet URL')}</span>
            <input
              ref={inputRef}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://use.typekit.net/abc1234.css"
              spellCheck={false}
              autoComplete="off"
              inputMode="url"
              className={FIELD}
            />
            {urlCheck && !urlCheck.ok ? (
              <span className="text-mini text-status-danger">{t(URL_ERRORS[urlCheck.reason])}</span>
            ) : (
              <span className="text-mini text-fg-faint">
                {urlCheck?.ok ? `${urlCheck.provider} · ` : ''}{t('Allowed')}: {Object.values(ALLOWED_FONT_HOSTS).join(' · ')}
              </span>
            )}
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-fg">{t('Family name')}</span>
          <input
            ref={kind === 'google' ? inputRef : undefined}
            value={family}
            onChange={(event) => setFamily(event.target.value)}
            placeholder={kind === 'google' ? 'Space Grotesk' : t('As the stylesheet names it')}
            spellCheck={false}
            autoComplete="off"
            maxLength={60}
            className={FIELD}
          />
          {family.trim() && !name && <span className="text-mini text-status-danger">{t('Use letters, numbers, spaces, dots or dashes.')}</span>}
          {detected.length > 0 && !(detected.length === 1 && detected[0] === name) && (
            <span className="flex flex-wrap gap-1">
              {detected.map((f) => (
                <button key={f} type="button" onClick={() => setFamily(f)} className={`rounded-md border border-line px-1.5 py-0.5 text-mini ${f === name ? 'bg-surface text-fg' : 'text-fg-muted hover:text-fg'} ${FOCUS}`}>{f}</button>
              ))}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-caption font-medium text-fg">{t('Fallback')}</span>
          <select
            value={category}
            onChange={(event) => { setCategory(event.target.value as FontCategory); setCategoryTouched(true) }}
            className={FIELD}
          >
            {FONT_CATEGORIES.map((c) => <option key={c} value={c}>{t(c)}</option>)}
          </select>
        </label>

        {previewFamily && <FontPreview family={previewFamily} kind={kind} url={urlCheck?.ok ? urlCheck.url : undefined} category={category} />}

        {check.state === 'error' && <p role="alert" className="text-caption text-status-danger">{check.message}</p>}
        {full && <p className="text-caption text-status-warning">{t('This design system already has the most fonts it can add. Remove one first.')}</p>}

        {fontSources.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-micro font-semibold uppercase tracking-[0.14em] text-fg-faint">{t('Added to this system')}</span>
            <ul className="flex flex-col">
              {fontSources.map((s) => (
                <li key={s.family} className="flex items-center gap-2 rounded-md px-1 py-1">
                  <span className="min-w-0 flex-1 truncate text-ui text-fg" style={{ fontFamily: fontStack(s.family, s.category) }}>{s.family}</span>
                  <span className="text-mini text-fg-faint">{s.kind === 'google' ? 'Google Fonts' : ALLOWED_FONT_HOSTS[new URL(s.url ?? 'https://x').hostname] ?? 'URL'}</span>
                  <button
                    type="button"
                    onClick={() => removeFontSource(s.family)}
                    aria-label={`${t('Remove')} ${s.family}`}
                    className={`rounded px-1 text-mini text-fg-faint hover:text-status-danger ${FOCUS}`}
                  >✕</button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={`h-8 rounded-lg px-3 text-caption font-medium text-fg-muted hover:text-fg ${FOCUS}`}>{t('Cancel')}</button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`h-8 rounded-lg bg-cta px-3 text-caption font-semibold text-cta-ink disabled:opacity-40 ${FOCUS}`}
          >
            {check.state === 'checking' ? t('Checking…') : t('Add font')}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}

/** Does a stylesheet load? A <link> reports a refusal (`error`) where
 *  `fetch` cannot: Google's 400 carries no CORS header, so fetch only throws.
 *  `unknown` = no answer in time (offline, slow) — the caller adds anyway. */
function probeStylesheet(href: string): Promise<'ok' | 'missing' | 'unknown'> {
  return new Promise((resolve) => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.media = 'print' // applies nothing to this page while probing
    const done = (result: 'ok' | 'missing' | 'unknown') => { window.clearTimeout(timer); link.remove(); resolve(result) }
    const timer = window.setTimeout(() => done('unknown'), 6000)
    link.onload = () => done('ok')
    link.onerror = () => done('missing')
    link.href = href
    document.head.appendChild(link)
  })
}

/** A sample in the font, loaded straight from the source being added. */
function FontPreview({ family, kind, url, category }: { family: string; kind: Kind; url?: string; category: FontCategory }) {
  const href = kind === 'css' ? url : googleFontUrl(family)
  useEffect(() => {
    if (!href) return
    const id = `gfont-preview-${href}`
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }, [href])
  return (
    <div className="rounded-lg bg-surface px-3 py-2.5 text-fg" style={{ fontFamily: fontStack(family, category) }}>
      <p className="truncate text-heading">Aa Bb Cc 0123</p>
      <p className="truncate text-ui text-fg-muted">The quick brown fox jumps over the lazy dog</p>
    </div>
  )
}

/** The "Add font" row under a font list. Explains the gate instead of hiding. */
export function AddFontButton({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n()
  const access = useFontAccess()
  const hint = access === 'guest'
    ? t('Sign in and save your design system to add fonts.')
    : access === 'unsaved'
      ? t('Save your design system to add fonts.')
      : null
  return (
    <div className="flex flex-col">
      <button
        type="button"
        data-font-access={access}
        disabled={access === 'loading' || access === 'unsaved'}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => (access === 'guest' ? goToLogin('save-library', 'signin') : onOpen())}
        className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-ui text-fg-muted hover:bg-surface hover:text-fg disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-fg-muted ${FOCUS}`}
      >
        <span aria-hidden className="flex h-4 w-4 items-center justify-center text-strong leading-none">+</span>
        <span className="min-w-0 flex-1 truncate">{access === 'guest' ? t('Sign in to add a font') : t('Add font')}</span>
      </button>
      {hint && <p className="px-2.5 pb-1.5 text-mini leading-snug text-fg-faint">{hint}</p>}
    </div>
  )
}
