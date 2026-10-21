import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { useI18n } from '../../lib/i18n'
import { themeDisplayName } from '../../lib/themeSources'
import { brandContext } from '../../lib/contextSource'
import { buildFigmaContext } from '../../lib/figmaContext'
import { brandThemesFromSyncModes, type FigmaSyncMode, type FigmaViewport } from '../../lib/figmaSyncModes'
import type { ThemeAppearance } from '../../lib/themeModes'
import { FIGMA_PLUGIN_COMMUNITY } from '../../lib/utils'
import { ContextFilters, useContextOptions } from '../ui/ContextControls'
import { FigmaGlyph } from '../ui/icons'
import { showToast } from '../ui/Toast'
import { CONTEXT_SCOPES, downloadText, formatBytes, useCodeArtifacts, writeClipboard } from './codeArtifacts'
import { CodeLine, CopyIcon } from './ThemeCodeFormat'

// ─── Ship, inside the inspector ─────────────────────────────────────────────
// Pressing CSS, Figma or Agent no longer leaves the page: the inspector turns
// into this panel, the board stays on screen, and "Back to editing" (or Esc)
// returns to the accordion. Copying is the job here, not reading, so each
// kind shows a short preview, a Copy button and a Download; "Open full file"
// leads to the Code tab or the Figma page for anyone who wants the long view.
// Every string comes from the builders those pages use (`useCodeArtifacts`,
// `brandContext`, `buildFigmaContext`) — never a second renderer
// (design-plans/entry-flow-set-see-ship.md).

export type ShipKind = 'css' | 'figma' | 'agent'

const KINDS: { key: ShipKind; label: string }[] = [
  { key: 'css', label: 'CSS' },
  { key: 'figma', label: 'Figma' },
  { key: 'agent', label: 'Agent' },
]

const PREVIEW_LINES = 14
const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

export default function ShipPanel({
  themeKey, kind, onKindChange, onClose, onOpenFull, previewAppearance,
  figmaFileName, figmaSyncModes, figmaViewports,
}: {
  themeKey: string
  kind: ShipKind
  onKindChange: (kind: ShipKind) => void
  /** Back to editing: the inspector shows its panel again. */
  onClose: () => void
  /** The long view: the Code tab on that format, or the Figma page. */
  onOpenFull: (kind: ShipKind) => void
  previewAppearance?: ThemeAppearance
  figmaFileName: string
  figmaSyncModes: FigmaSyncMode[]
  figmaViewports: FigmaViewport[]
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const backRef = useRef<HTMLButtonElement>(null)
  const name = themeDisplayName(themeKey, store.themeLabels)

  // Focus lands on the way back, so Esc and Tab both start from here.
  useEffect(() => { backRef.current?.focus() }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    // Our Esc, not the board's: the token inspector also listens for it.
    event.stopPropagation()
    onClose()
  }

  const onTabKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const at = KINDS.findIndex((k) => k.key === kind)
    const next = KINDS[(at + (event.key === 'ArrowRight' ? 1 : KINDS.length - 1)) % KINDS.length]
    onKindChange(next.key)
    const tabs = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    requestAnimationFrame(() => tabs[KINDS.indexOf(next)]?.focus())
  }

  return (
    <div
      role="region"
      aria-label={t('Ship to')}
      onKeyDown={onKeyDown}
      className="absolute inset-0 z-30 flex flex-col overflow-hidden bg-side-panel"
    >
      <div className="flex h-11 flex-shrink-0 items-center gap-2 border-b border-line px-2">
        <button
          ref={backRef}
          type="button"
          onClick={onClose}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg ${FOCUS}`}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10 3.5 5.5 8l4.5 4.5" />
          </svg>
          {t('Back to editing')}
        </button>
        <span className="ml-auto min-w-0 truncate pr-1 text-caption text-fg-faint" title={name}>{name}</span>
      </div>

      <div className="flex-shrink-0 px-3 pt-3">
        <div
          role="tablist"
          aria-label={t('Ship to')}
          onKeyDown={onTabKey}
          className="flex h-9 items-center gap-0.5 rounded-lg border border-line bg-app p-0.5"
        >
          {KINDS.map((k) => {
            const selected = k.key === kind
            return (
              <button
                key={k.key}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => onKindChange(k.key)}
                className={`flex h-full min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md text-caption font-semibold transition-colors ${FOCUS} ${
                  selected ? 'bg-elevated text-fg shadow-sm' : 'text-fg-faint hover:text-fg'
                }`}
              >
                {k.key === 'figma' ? <FigmaGlyph size={12} /> : null}
                {t(k.label)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-3">
        {kind === 'css' && <CssShip themeKey={themeKey} previewAppearance={previewAppearance} onOpenFull={() => onOpenFull('css')} />}
        {kind === 'agent' && <AgentShip themeKey={themeKey} previewAppearance={previewAppearance} onOpenFull={() => onOpenFull('agent')} />}
        {kind === 'figma' && (
          <FigmaShip
            themeKey={themeKey}
            fileName={figmaFileName}
            syncModes={figmaSyncModes}
            viewports={figmaViewports}
            onOpenFull={() => onOpenFull('figma')}
          />
        )}
      </div>
    </div>
  )
}

// ─── Shared parts ───────────────────────────────────────────────────────────

/** Copy (the action) + Download (the file). The copy icon turns into a check
 *  for a moment, so the press reads as done without looking at the toast. */
function ShipActions({ text, fileName, mime, copyLabel, copiedToast, disabled = false }: {
  text: string
  fileName: string
  mime?: string
  copyLabel: string
  copiedToast: string
  disabled?: boolean
}) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(id)
  }, [copied])
  const copy = async () => {
    if (!(await writeClipboard(text))) { showToast(t('Couldn’t copy — try again')); return }
    setCopied(true)
    showToast(copiedToast)
  }
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void copy()}
        disabled={disabled}
        className={`flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-solid px-3 text-caption font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
      >
        <CopyIcon done={copied} />
        <span className="truncate">{copied ? t('Copied') : copyLabel}</span>
      </button>
      <button
        type="button"
        onClick={() => downloadText(text, fileName, mime)}
        disabled={disabled}
        aria-label={`${t('Download')} ${fileName}`}
        title={`${t('Download')} ${fileName}`}
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-colors hover:border-line-strong hover:text-fg disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
        </svg>
      </button>
    </div>
  )
}

/** The first lines of the file, in the Code tab's own line renderer, fading
 *  out. Enough to recognise it; reading the whole thing is the full page. */
function Preview({ text, format, label }: { text: string; format: 'css' | 'agent'; label: string }) {
  const lines = useMemo(() => text.split('\n').slice(0, PREVIEW_LINES), [text])
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-app" role="region" aria-label={label}>
      <div className="max-h-64 overflow-hidden py-2 [&_*]:!text-mini [&_*]:!leading-[18px] [&_.grid]:!grid-cols-[28px_minmax(0,1fr)] [&_code]:!px-2">
        {lines.map((line, i) => <CodeLine key={`${i}-${line}`} value={line} number={i + 1} format={format} />)}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-app to-transparent" />
    </div>
  )
}

function Meta({ children }: { children: ReactNode }) {
  return <p className="m-0 truncate text-caption text-fg-faint">{children}</p>
}

function FullLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`self-start rounded text-caption font-medium text-accent-ui underline-offset-2 hover:underline ${FOCUS}`}
    >
      {children}
    </button>
  )
}

// ─── CSS ────────────────────────────────────────────────────────────────────

function CssShip({ themeKey, previewAppearance, onOpenFull }: {
  themeKey: string
  previewAppearance?: ThemeAppearance
  onOpenFull: () => void
}) {
  const { t } = useI18n()
  const artifacts = useCodeArtifacts(themeKey, previewAppearance)
  const [file, setFile] = useState<'css' | 'shadcn'>('css')
  const text = file === 'css' ? artifacts.css : artifacts.shadcn
  const fileName = file === 'css' ? 'variables.css' : 'globals.css'
  const lines = text ? text.split('\n').length : 0
  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label={t('File')} className="flex items-center gap-1">
        {(['css', 'shadcn'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={file === key}
            onClick={() => setFile(key)}
            className={`h-7 rounded-md px-2.5 font-mono text-mini transition-colors ${FOCUS} ${
              file === key ? 'bg-elevated text-fg' : 'text-fg-faint hover:text-fg'
            }`}
          >
            {key === 'css' ? 'variables.css' : 'shadcn · globals.css'}
          </button>
        ))}
      </div>
      <Meta>
        {t('{n} lines', { n: String(lines) })} · {formatBytes(new Blob([text]).size)}
      </Meta>
      <ShipActions
        text={text}
        fileName={fileName}
        mime="text/css"
        copyLabel={t('Copy CSS')}
        copiedToast={t('Copied {file}. Paste it into your app’s global stylesheet.', { file: fileName })}
        disabled={!text}
      />
      {text ? <Preview text={text} format="css" label={`${fileName} preview`} /> : null}
      <FullLink onClick={onOpenFull}>{t('Open full file')}</FullLink>
    </div>
  )
}

// ─── Agent ──────────────────────────────────────────────────────────────────

function AgentShip({ themeKey, previewAppearance, onOpenFull }: {
  themeKey: string
  previewAppearance?: ThemeAppearance
  onOpenFull: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const defaultAppearance = previewAppearance ?? store.themeKinds[themeKey] ?? 'light'
  // The same remembered Theme + Detail as Code's Agent context and the
  // Variables popover: one request model, wherever it is asked.
  const [ctx, setCtx] = useContextOptions('all', defaultAppearance)
  const text = useMemo(
    () => brandContext(store, themeKey, { scope: ctx.scope, detail: ctx.detail, appearance: ctx.appearance }, store.projectName),
    [store, themeKey, ctx.scope, ctx.detail, ctx.appearance],
  )
  // Same rough measure the Variables popover prints (≈ 4 characters a token).
  const tokens = Math.round(text.length / 4)
  return (
    <div className="flex flex-col gap-3">
      <ContextFilters opts={ctx} onChange={setCtx} scopes={CONTEXT_SCOPES} lockedAppearance={null} />
      <Meta>
        ≈ {tokens >= 1000 ? `${(tokens / 1000).toFixed(1).replace(/\.0$/, '')}k` : tokens} {t('tokens')} · {formatBytes(new Blob([text]).size)}
      </Meta>
      <ShipActions
        text={text}
        fileName={`${store.projectName || 'escala'}-agent-context.md`}
        mime="text/markdown"
        copyLabel={t('Copy context')}
        copiedToast={t('Copied the agent context. Paste it into any agent.')}
        disabled={!text}
      />
      <p className="m-0 text-caption leading-relaxed text-fg-faint">
        {t('Paste it into Cursor, Claude Code or any agent as the first message.')}
      </p>
      {text ? <Preview text={text} format="agent" label={t('Agent context preview')} /> : null}
      <FullLink onClick={onOpenFull}>{t('Open full file')}</FullLink>
    </div>
  )
}

// ─── Figma ──────────────────────────────────────────────────────────────────

function FigmaShip({ themeKey, fileName, syncModes, viewports, onOpenFull }: {
  themeKey: string
  fileName: string
  syncModes: FigmaSyncMode[]
  viewports: FigmaViewport[]
  onOpenFull: () => void
}) {
  const { t } = useI18n()
  const store = useDesignStore()
  const context = useMemo(
    () => (syncModes.length === 0
      ? null
      : buildFigmaContext({
        project: fileName || themeDisplayName(themeKey, store.themeLabels),
        modes: syncModes,
        viewports,
        theme: themeKey,
        brandName: (key) => themeDisplayName(key, store.themeLabels),
      })),
    // `store` changes on every edit, and the context has to follow the tokens.
    [syncModes, viewports, themeKey, fileName, store],
  )
  const brandCount = Object.keys(brandThemesFromSyncModes(syncModes)).length
  const facts = [
    brandCount === 1 ? t('1 brand') : t('{count} brands', { count: String(brandCount) }),
    syncModes.length === 1 ? t('1 theme') : t('{count} themes', { count: String(syncModes.length) }),
    viewports.length === 1 ? t('1 viewport') : t('{count} viewports', { count: String(viewports.length) }),
    ...(context ? [formatBytes(context.bytes)] : []),
  ]
  const steps: { title: string; body?: ReactNode }[] = [
    {
      title: t('Copy the context'),
      body: (
        <ShipActions
          text={context?.text ?? ''}
          fileName={`${fileName || 'escala'}-figma-context.md`}
          mime="text/markdown"
          copyLabel={t('Copy context')}
          copiedToast={t('Copied. In Figma, open the Escala plugin and paste it in the context card.')}
          disabled={!context}
        />
      ),
    },
    {
      title: t('Open the Escala plugin in Figma'),
      body: (
        <a
          href={FIGMA_PLUGIN_COMMUNITY}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex h-8 items-center gap-1.5 self-start rounded-lg border border-line px-2.5 text-caption font-medium text-fg transition-colors hover:border-line-strong hover:bg-elevated ${FOCUS}`}
        >
          <FigmaGlyph size={12} />
          {t('Get the plugin')}
        </a>
      ),
    },
    { title: t('Paste it in the context card'), body: <p className="m-0 text-caption leading-relaxed text-fg-faint">{t('Press ⌘V, then Import into this file.')}</p> },
  ]
  return (
    <div className="flex flex-col gap-3">
      <Meta>{facts.join(' · ')}</Meta>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {steps.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2 rounded-lg border border-line bg-surface/50 p-2.5">
            <p className="m-0 flex items-baseline gap-2 text-caption font-semibold text-fg">
              <span className="font-mono tabular-nums text-fg-faint">{String(i + 1).padStart(2, '0')}</span>
              {step.title}
            </p>
            {step.body}
          </li>
        ))}
      </ol>
      <FullLink onClick={onOpenFull}>{t('Brands, themes and viewports')}</FullLink>
    </div>
  )
}
