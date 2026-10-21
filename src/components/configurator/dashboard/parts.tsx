// The primitives the design system dashboard is drawn with. The data they show
// comes from `dashboardData.ts`.

import type { ReactNode } from 'react'
import { useI18n } from '../../../lib/i18n'
import type { SourceState } from '../../../lib/systemDashboard'
import type { ElementStatus } from '../../../lib/systemDashboardTypes'
import { CHECKER } from '../checker'
import { STATUS_LABEL, STATUS_TONE, type MarkState, type Tone } from './dashboardData'

// ── Buttons ──────────────────────────────────────────────────────────────────

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

export const BTN =
  `inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-caption font-medium text-fg transition-colors hover:border-line-strong disabled:opacity-50 ${FOCUS}`

export const BTN_PRIMARY =
  `inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg bg-cta px-3.5 text-caption font-semibold text-cta-ink transition-opacity hover:opacity-90 disabled:opacity-50 ${FOCUS}`

export const TEXT_LINK =
  `rounded-sm text-caption font-medium text-accent-ui hover:underline ${FOCUS}`

// ── Layout ───────────────────────────────────────────────────────────────────

export function PageHeader({ title, detail, right }: { title: ReactNode; detail?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="flex min-w-[16rem] flex-1 flex-col gap-1">
        <h2 className="text-heading font-semibold text-fg">{title}</h2>
        {detail && <p className="text-body text-fg-muted">{detail}</p>}
      </div>
      {right && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{right}</div>}
    </header>
  )
}

export function Card({ title, right, children, className = '' }: {
  title?: ReactNode
  right?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4 ${className}`}>
      {(title || right) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {title && <h3 className="text-ui font-semibold text-fg">{title}</h3>}
          {right && <div className="flex items-center gap-2">{right}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

/** A filled bar for a share of a whole. `value` is 0…1. */
export function Meter({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div role="img" aria-label={label} className="h-1.5 w-full overflow-hidden rounded-full bg-fg/[0.08]">
      <div className="h-full rounded-full bg-fg/70" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Kpi({ label, value, meter, meterLabel, detail, action }: {
  label: string
  value: ReactNode
  meter?: number
  meterLabel?: string
  detail: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-line bg-surface p-4">
      <span className="text-caption font-medium text-fg-muted">{label}</span>
      <span className="text-display font-semibold tabular-nums leading-none text-fg">{value}</span>
      {meter !== undefined && <Meter value={meter} label={meterLabel ?? label} />}
      <p className="text-caption text-fg-muted">{detail}</p>
      {action}
    </div>
  )
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">{children}</div>
}

// ── Tags ─────────────────────────────────────────────────────────────────────

const TONE: Record<Tone, string> = {
  neutral: 'bg-fg/[0.07] text-fg-muted',
  accent: 'bg-accent-ui/[0.14] text-accent-ui',
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  danger: 'bg-status-danger/10 text-status-danger',
  info: 'bg-status-info/10 text-status-info',
}

export function Tag({ tone = 'neutral', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex h-5 flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 text-micro font-medium ${TONE[tone]}`}>
      {children}
    </span>
  )
}

export function StatusPill({ status }: { status: ElementStatus }) {
  const { t } = useI18n()
  return <Tag tone={STATUS_TONE[status]}>{t(STATUS_LABEL[status])}</Tag>
}

export const SOURCE_LABEL: Record<SourceState, string> = {
  never: 'Not connected',
  stale: 'Changes not sent',
  synced: 'Up to date',
}

const SOURCE_TONE: Record<SourceState, Tone> = { never: 'neutral', stale: 'warning', synced: 'success' }

export function SourcePill({ state }: { state: SourceState }) {
  const { t } = useI18n()
  return <Tag tone={SOURCE_TONE[state]}>{t(SOURCE_LABEL[state])}</Tag>
}

// ── Marks ────────────────────────────────────────────────────────────────────

/** Check, cross or dash. The word beside it carries the meaning; this only speeds the scan. */
export function Mark({ state }: { state: MarkState }) {
  const color = state === 'pass' ? 'text-status-success' : state === 'fail' ? 'text-status-danger' : 'text-fg-faint'
  const path = state === 'pass' ? 'M5 12.5l4.5 4.5L19 7.5' : state === 'fail' ? 'M6 6l12 12M18 6 6 18' : 'M6 12h12'
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`flex-shrink-0 ${color}`}>
      <path d={path} />
    </svg>
  )
}

/** A table cell that answers yes or no, readable without the colour. */
export function YesNo({ yes, yesLabel, noLabel }: { yes: boolean; yesLabel: string; noLabel: string }) {
  return (
    <span className="inline-flex items-center" title={yes ? yesLabel : noLabel}>
      <Mark state={yes ? 'pass' : 'none'} />
      <span className="sr-only">{yes ? yesLabel : noLabel}</span>
    </span>
  )
}

/** A colour chip. A translucent value sits over the checker, like every alpha swatch in the app. */
export function Swatch({ css, size = 16 }: { css: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-shrink-0 overflow-hidden rounded-[5px] border border-fg/15"
      style={{ width: size, height: size, ...CHECKER, backgroundSize: '8px 8px' }}
    >
      <span className="block h-full w-full" style={{ background: css }} />
    </span>
  )
}

// ── Tables ───────────────────────────────────────────────────────────────────

export const TH = 'whitespace-nowrap px-3 py-2 text-left text-micro font-medium text-fg-faint'
export const TD = 'px-3 py-2.5 align-middle text-caption text-fg'
export const ROW = 'border-t border-line'

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-line px-4 py-5 text-caption text-fg-faint">{children}</p>
}

// ── Left menu rows (shared with Home's own menu) ─────────────────────────────

export function NavRow({ on, icon, label, trailing, onClick, title }: {
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
        on ? 'bg-[#7468EF1A] font-semibold text-fg' : 'font-medium text-fg-muted hover:bg-fg/[0.05] hover:text-fg'
      }`}
    >
      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing}
    </button>
  )
}

export function NavGroup({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
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
