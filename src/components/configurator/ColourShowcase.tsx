import type { ReactNode } from 'react'
import { SPECIMENS, type AxisValues } from './docs/specimens'
import { useI18n } from '../../lib/i18n'
import { COLOR_ROLE_LABEL, type ColorRoleId } from '../../lib/colorRoles'
import type { PreviewTokens } from '../preview/ButtonPreview'

/**
 * The colour map on the board, for a colour the bento barely uses. The board
 * is a fixed composition: it shows a success dot, one toast, a Delete — so a
 * status colour lit two parts, and Warning lit none ("Nothing on this board
 * paints with these roles"). This tile tops the board with catalogue
 * components in the variant that READS that colour, so the spotlight has
 * something to light. Every part is a `SPECIMENS` renderer (the recipe, the
 * same file the plugin ships) — never a hand-drawn stand-in.
 *
 * Accent and Neutral get none: the bento is made of them.
 */
type Entry = { key: string; v: AxisValues; w?: number }

export const COLOUR_SHOWCASE: Partial<Record<ColorRoleId, Entry[]>> = {
  success: [
    { key: 'Sonner', v: { Type: 'success' }, w: 300 },
    { key: 'StatusBadge', v: { Status: 'online' } },
    { key: 'PasswordStrength', v: { Strength: '4' } },
  ],
  warning: [
    { key: 'Sonner', v: { Type: 'warning' }, w: 300 },
    { key: 'StatusBadge', v: { Status: 'away' } },
    { key: 'RatingGroup', v: {} },
    { key: 'FileFormat', v: { Format: 'zip' } },
    { key: 'PasswordStrength', v: { Strength: '3' } },
  ],
  info: [
    { key: 'Sonner', v: { Type: 'info' }, w: 300 },
    { key: 'FileFormat', v: { Format: 'png' } },
  ],
  error: [
    { key: 'Alert', v: { Variant: 'destructive' }, w: 300 },
    { key: 'Sonner', v: { Type: 'error' }, w: 300 },
    { key: 'Button', v: { Variant: 'destructive', Size: 'default', State: 'Default' } },
    { key: 'Badge', v: { Variant: 'destructive' } },
    { key: 'StatusBadge', v: { Status: 'busy' } },
    { key: 'FileFormat', v: { Format: 'pdf' } },
    { key: 'PasswordStrength', v: { Strength: '1' } },
  ],
}

export function ColourShowcase({ colour, tokens, appearance }: {
  colour: ColorRoleId
  /** The board's tokens in the appearance on screen. */
  tokens: PreviewTokens
  appearance: 'light' | 'dark'
}) {
  const { t } = useI18n()
  const entries = COLOUR_SHOWCASE[colour]
  if (!entries?.length) return null
  const surface = tokens.archTokens?.['surface.layer-1'] ?? tokens.surface
  const edge = tokens.archTokens?.['border.subtle'] ?? tokens.borderDefault ?? tokens.neutralText
  const ink = tokens.archTokens?.['content.secondary'] ?? tokens.neutralText
  return (
    <section
      aria-label={t('More with {name}', { name: t(COLOR_ROLE_LABEL[colour]) })}
      className={`${appearance} mb-3 rounded-2xl border p-5`}
      style={{ background: surface, borderColor: edge, color: ink }}
    >
      <p className="mb-4 text-caption font-medium" style={{ color: ink }}>
        {t('More with {name}', { name: t(COLOR_ROLE_LABEL[colour]) })}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-5">
        {entries.map((entry, i) => {
          // An element, never a call: a specimen has hooks of its own
          // (Sonner's toaster), and calling it would make them this
          // component's, changing count with the colour.
          const Specimen = SPECIMENS[entry.key]
          if (!Specimen) return null
          return <Cell key={`${colour}-${entry.key}-${i}`}><Specimen t={tokens} v={entry.v} w={entry.w} /></Cell>
        })}
      </div>
    </section>
  )
}

function Cell({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 max-w-full items-center">{children}</div>
}
