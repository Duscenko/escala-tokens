import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore, GRAY_DARK_SCALE } from '../../store/useDesignStore'
import { accessibleSolidTone } from '../../lib/colorUtils'

// ── Source palettes a token can draw from ──────────────────────────────────
type ScaleSource = 'gray' | 'brand' | 'error' | 'warning' | 'success' | 'info'

const SCALE_META: Record<ScaleSource, { label: string }> = {
  gray:    { label: 'gray' },
  brand:   { label: 'brand' },
  error:   { label: 'error' },
  warning: { label: 'warning' },
  success: { label: 'success' },
  info:    { label: 'info' },
}

type Role = {
  key: string
  label: string
  description: string
  scale: ScaleSource
  tone: number
  contrastAgainst: string | null
  isVariant: boolean
}

type RoleGroup = {
  category: string
  label: string
  description: string
  roles: Role[]
}

const ROLE_GROUPS: RoleGroup[] = [
  {
    category: 'text',
    label: 'Text',
    description: 'Text fill colors across light and dark modes',
    roles: [
      { key: 'text-primary',               label: 'text-primary',               description: 'Primary text — page headings. (gray-900)',                    scale: 'gray',    tone: 11, contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-primary_on-brand',      label: 'text-primary_on-brand',      description: 'Primary text on solid brand backgrounds. (white)',            scale: 'gray',    tone: 1,  contrastAgainst: 'bg-brand-solid', isVariant: true  },
      { key: 'text-secondary',             label: 'text-secondary',             description: 'Secondary text — labels, section headings. (gray-700)',       scale: 'gray',    tone: 9,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-secondary_hover',       label: 'text-secondary_hover',       description: 'Secondary text in hover state. (gray-800)',                   scale: 'gray',    tone: 10, contrastAgainst: 'bg-primary',    isVariant: true  },
      { key: 'text-secondary_on-brand',    label: 'text-secondary_on-brand',    description: 'Secondary text on solid brand backgrounds. (brand-200)',      scale: 'brand',   tone: 4,  contrastAgainst: 'bg-brand-solid', isVariant: true  },
      { key: 'text-tertiary',              label: 'text-tertiary',              description: 'Tertiary text — supporting/paragraph text. (gray-600)',       scale: 'gray',    tone: 8,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-tertiary_hover',        label: 'text-tertiary_hover',        description: 'Tertiary text in hover state. (gray-700)',                    scale: 'gray',    tone: 9,  contrastAgainst: 'bg-primary',    isVariant: true  },
      { key: 'text-tertiary_on-brand',     label: 'text-tertiary_on-brand',     description: 'Tertiary text on solid brand backgrounds. (brand-200)',       scale: 'brand',   tone: 4,  contrastAgainst: 'bg-brand-solid', isVariant: true  },
      { key: 'text-quaternary',            label: 'text-quaternary',            description: 'Quaternary text — footer headings. (gray-500)',               scale: 'gray',    tone: 7,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-quaternary_on-brand',   label: 'text-quaternary_on-brand',   description: 'Quaternary text on solid brand backgrounds. (brand-300)',     scale: 'brand',   tone: 5,  contrastAgainst: 'bg-brand-solid', isVariant: true  },
      { key: 'text-white',                 label: 'text-white',                 description: 'Text always white, regardless of mode. (white)',              scale: 'gray',    tone: 1,  contrastAgainst: null,            isVariant: false },
      { key: 'text-disabled',              label: 'text-disabled',              description: 'Disabled text — inputs, buttons. (gray-500)',                 scale: 'gray',    tone: 7,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-placeholder',           label: 'text-placeholder',           description: 'Input placeholder text. (gray-500)',                          scale: 'gray',    tone: 7,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-placeholder_subtle',    label: 'text-placeholder_subtle',    description: 'Subtle placeholder — verification code inputs. (gray-300)',   scale: 'gray',    tone: 5,  contrastAgainst: 'bg-primary',    isVariant: true  },
      { key: 'text-brand-primary',         label: 'text-brand-primary',         description: 'Primary brand text — pricing headers. (brand-900)',           scale: 'brand',   tone: 11, contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-brand-secondary',       label: 'text-brand-secondary',       description: 'Secondary brand text — buttons, highlights. (brand-700)',     scale: 'brand',   tone: 9,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-brand-secondary_hover', label: 'text-brand-secondary_hover', description: 'Secondary brand text in hover state. (brand-800)',            scale: 'brand',   tone: 10, contrastAgainst: 'bg-primary',    isVariant: true  },
      { key: 'text-brand-tertiary',        label: 'text-brand-tertiary',        description: 'Tertiary brand text — metric card numbers. (brand-600)',      scale: 'brand',   tone: 8,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-brand-tertiary_alt',    label: 'text-brand-tertiary_alt',    description: 'Tertiary brand text, lighter in dark mode. (brand-600)',      scale: 'brand',   tone: 8,  contrastAgainst: 'bg-primary',    isVariant: true  },
      { key: 'text-error-primary',         label: 'text-error-primary',         description: 'Error state text — input error states. (error-600)',          scale: 'error',   tone: 8,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-warning-primary',       label: 'text-warning-primary',       description: 'Warning state semantic text. (warning-600)',                  scale: 'warning', tone: 8,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-success-primary',       label: 'text-success-primary',       description: 'Success state semantic text. (success-600)',                  scale: 'success', tone: 8,  contrastAgainst: 'bg-primary',    isVariant: false },
      { key: 'text-info-primary',          label: 'text-info-primary',          description: 'Info state semantic text. (info-600)',                        scale: 'info',    tone: 8,  contrastAgainst: 'bg-primary',    isVariant: false },
    ],
  },
  {
    category: 'border',
    label: 'Border',
    description: 'Stroke colors for borders, dividers and separators',
    roles: [
      { key: 'border-primary',          label: 'border-primary',          description: 'High contrast — inputs, button groups, checkboxes. (gray-300)', scale: 'gray',  tone: 5, contrastAgainst: null, isVariant: false },
      { key: 'border-secondary',        label: 'border-secondary',        description: 'Medium contrast — cards, tables, dividers. (gray-200)',         scale: 'gray',  tone: 4, contrastAgainst: null, isVariant: false },
      { key: 'border-secondary_alt',    label: 'border-secondary_alt',    description: 'Alpha alternative for floating menus. (gray-200)',              scale: 'gray',  tone: 4, contrastAgainst: null, isVariant: true  },
      { key: 'border-tertiary',         label: 'border-tertiary',         description: 'Low contrast — subtle dividers, chart axes. (gray-100)',        scale: 'gray',  tone: 3, contrastAgainst: null, isVariant: false },
      { key: 'border-disabled',         label: 'border-disabled',         description: 'Disabled border — inputs, checkboxes. (gray-300)',              scale: 'gray',  tone: 5, contrastAgainst: null, isVariant: false },
      { key: 'border-disabled_subtle',  label: 'border-disabled_subtle',  description: 'Subtle disabled border — disabled buttons. (gray-200)',         scale: 'gray',  tone: 4, contrastAgainst: null, isVariant: true  },
      { key: 'border-brand',            label: 'border-brand',            description: 'Brand border — active/focus input states. (brand-500)',         scale: 'brand', tone: 7, contrastAgainst: null, isVariant: false },
      { key: 'border-brand_alt',        label: 'border-brand_alt',        description: 'Brand border, switches to gray in dark mode. (brand-600)',      scale: 'brand', tone: 8, contrastAgainst: null, isVariant: true  },
      { key: 'border-error',            label: 'border-error',            description: 'Error state border — inputs, file uploaders. (error-500)',      scale: 'error', tone: 7, contrastAgainst: null, isVariant: false },
      { key: 'border-error_subtle',     label: 'border-error_subtle',     description: 'Subtle error border — error state inputs. (error-300)',         scale: 'error', tone: 5, contrastAgainst: null, isVariant: true  },
    ],
  },
  {
    category: 'fg',
    label: 'Foreground',
    description: 'Icon and non-text foreground element colors',
    roles: [
      { key: 'fg-primary',             label: 'fg-primary',             description: 'Highest contrast icons. (gray-900)',                       scale: 'gray',    tone: 11, contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-secondary',           label: 'fg-secondary',           description: 'High contrast icons. (gray-700)',                          scale: 'gray',    tone: 9,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-secondary_hover',     label: 'fg-secondary_hover',     description: 'Secondary foreground in hover state. (gray-800)',          scale: 'gray',    tone: 10, contrastAgainst: 'bg-primary', isVariant: true  },
      { key: 'fg-tertiary',            label: 'fg-tertiary',            description: 'Medium contrast icons. (gray-600)',                        scale: 'gray',    tone: 8,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-tertiary_hover',      label: 'fg-tertiary_hover',      description: 'Tertiary foreground in hover state. (gray-700)',           scale: 'gray',    tone: 9,  contrastAgainst: 'bg-primary', isVariant: true  },
      { key: 'fg-quaternary',          label: 'fg-quaternary',          description: 'Low contrast icons — buttons, help, inputs. (gray-400)',   scale: 'gray',    tone: 6,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-quaternary_hover',    label: 'fg-quaternary_hover',    description: 'Quaternary foreground in hover state. (gray-500)',         scale: 'gray',    tone: 7,  contrastAgainst: 'bg-primary', isVariant: true  },
      { key: 'fg-white',               label: 'fg-white',               description: 'Foreground always white, regardless of mode. (white)',     scale: 'gray',    tone: 1,  contrastAgainst: null,         isVariant: false },
      { key: 'fg-disabled',            label: 'fg-disabled',            description: 'Disabled icons — button groups, dropdowns. (gray-400)',    scale: 'gray',    tone: 6,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-disabled_subtle',     label: 'fg-disabled_subtle',     description: 'Subtle disabled icons — active checkboxes. (gray-300)',    scale: 'gray',    tone: 5,  contrastAgainst: 'bg-primary', isVariant: true  },
      { key: 'fg-brand-primary',       label: 'fg-brand-primary',       description: 'Primary brand icons — featured icons, bars. (brand-600)',  scale: 'brand',   tone: 8,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-brand-primary_alt',   label: 'fg-brand-primary_alt',   description: 'Brand icon, switches to gray in dark mode. (brand-600)',   scale: 'brand',   tone: 8,  contrastAgainst: 'bg-primary', isVariant: true  },
      { key: 'fg-brand-secondary',     label: 'fg-brand-secondary',     description: 'Secondary brand icons — section accents. (brand-500)',     scale: 'brand',   tone: 7,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-brand-secondary_alt', label: 'fg-brand-secondary_alt', description: 'Secondary brand icon, gray in dark mode. (brand-500)',     scale: 'brand',   tone: 7,  contrastAgainst: 'bg-primary', isVariant: true  },
      { key: 'fg-error-primary',       label: 'fg-error-primary',       description: 'Primary error icons — featured icons. (error-600)',        scale: 'error',   tone: 8,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-error-secondary',     label: 'fg-error-secondary',     description: 'Secondary error icons — error input icons. (error-500)',   scale: 'error',   tone: 7,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-warning-primary',     label: 'fg-warning-primary',     description: 'Primary warning icons — featured icons. (warning-600)',    scale: 'warning', tone: 8,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-warning-secondary',   label: 'fg-warning-secondary',   description: 'Secondary warning icons. (warning-500)',                   scale: 'warning', tone: 7,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-success-primary',     label: 'fg-success-primary',     description: 'Primary success icons — featured icons. (success-600)',    scale: 'success', tone: 8,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-success-secondary',   label: 'fg-success-secondary',   description: 'Secondary success icons — dots, indicators. (success-500)', scale: 'success', tone: 7, contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-info-primary',        label: 'fg-info-primary',        description: 'Primary info icons — featured icons. (info-600)',          scale: 'info',    tone: 8,  contrastAgainst: 'bg-primary', isVariant: false },
      { key: 'fg-info-secondary',      label: 'fg-info-secondary',      description: 'Secondary info icons. (info-500)',                         scale: 'info',    tone: 7,  contrastAgainst: 'bg-primary', isVariant: false },
    ],
  },
  {
    category: 'bg',
    label: 'Background',
    description: 'Fill colors for layout and component backgrounds',
    roles: [
      { key: 'bg-primary',              label: 'bg-primary',              description: 'Primary background — layouts, components. (white)',          scale: 'gray',    tone: 1,  contrastAgainst: null, isVariant: false },
      { key: 'bg-primary_alt',          label: 'bg-primary_alt',          description: 'Alt primary, switches to bg-secondary in dark. (white)',     scale: 'gray',    tone: 1,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-primary_hover',        label: 'bg-primary_hover',        description: 'Primary hover — dropdown menu items. (gray-50)',             scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-primary-solid',        label: 'bg-primary-solid',        description: 'Primary dark background — tooltips. (gray-950)',             scale: 'gray',    tone: 12, contrastAgainst: null, isVariant: false },
      { key: 'bg-secondary',            label: 'bg-secondary',            description: 'Secondary background — section contrast. (gray-50)',         scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'bg-secondary_alt',        label: 'bg-secondary_alt',        description: 'Alt secondary, switches to bg-primary in dark. (gray-50)',   scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-secondary_hover',      label: 'bg-secondary_hover',      description: 'Secondary hover — nav items, date pickers. (gray-100)',      scale: 'gray',    tone: 3,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-secondary_subtle',     label: 'bg-secondary_subtle',     description: 'Subtle secondary — banners. (gray-25)',                      scale: 'gray',    tone: 1,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-secondary-solid',      label: 'bg-secondary-solid',      description: 'Secondary dark background — featured icons. (gray-600)',     scale: 'gray',    tone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'bg-tertiary',             label: 'bg-tertiary',             description: 'Tertiary background — toggles. (gray-100)',                  scale: 'gray',    tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'bg-quaternary',           label: 'bg-quaternary',           description: 'Quaternary background — sliders, progress. (gray-200)',      scale: 'gray',    tone: 4,  contrastAgainst: null, isVariant: false },
      { key: 'bg-active',               label: 'bg-active',               description: 'Active background — selected dropdown items. (gray-50)',     scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'bg-disabled',             label: 'bg-disabled',             description: 'Disabled background — buttons, toggles. (gray-100)',         scale: 'gray',    tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'bg-disabled_subtle',      label: 'bg-disabled_subtle',      description: 'Subtle disabled — inputs, checkboxes. (gray-50)',            scale: 'gray',    tone: 2,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-overlay',              label: 'bg-overlay',              description: 'Modal overlay background. (gray-950)',                       scale: 'gray',    tone: 12, contrastAgainst: null, isVariant: false },
      { key: 'bg-brand-primary',        label: 'bg-brand-primary',        description: 'Primary brand background — check icons. (brand-50)',         scale: 'brand',   tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'bg-brand-primary_alt',    label: 'bg-brand-primary_alt',    description: 'Alt brand bg, gray in dark mode. (brand-50)',                scale: 'brand',   tone: 2,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-brand-secondary',      label: 'bg-brand-secondary',      description: 'Secondary brand background — featured icons. (brand-100)',   scale: 'brand',   tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'bg-brand-solid',          label: 'bg-brand-solid',          description: 'Solid brand background — toggles, messages. (brand-600)',    scale: 'brand',   tone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'bg-brand-solid_hover',    label: 'bg-brand-solid_hover',    description: 'Solid brand hover — toggles, brand buttons. (brand-700)',    scale: 'brand',   tone: 9,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-brand-section',        label: 'bg-brand-section',        description: 'Brand section — CTA, testimonials. (brand-800)',             scale: 'brand',   tone: 10, contrastAgainst: null, isVariant: false },
      { key: 'bg-brand-section_subtle', label: 'bg-brand-section_subtle', description: 'Subtle brand section — FAQ sections. (brand-700)',           scale: 'brand',   tone: 9,  contrastAgainst: null, isVariant: true  },
      { key: 'bg-error-primary',        label: 'bg-error-primary',        description: 'Primary error background. (error-50)',                       scale: 'error',   tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'bg-error-secondary',      label: 'bg-error-secondary',      description: 'Secondary error background — featured icons. (error-100)',   scale: 'error',   tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'bg-error-solid',          label: 'bg-error-solid',          description: 'Solid error background — buttons, icons. (error-600)',       scale: 'error',   tone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'bg-warning-primary',      label: 'bg-warning-primary',      description: 'Primary warning background. (warning-50)',                   scale: 'warning', tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'bg-warning-secondary',    label: 'bg-warning-secondary',    description: 'Secondary warning background — featured icons. (warning-100)', scale: 'warning', tone: 3, contrastAgainst: null, isVariant: false },
      { key: 'bg-warning-solid',        label: 'bg-warning-solid',        description: 'Solid warning background — featured icons. (warning-600)',   scale: 'warning', tone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'bg-success-primary',      label: 'bg-success-primary',      description: 'Primary success background. (success-50)',                   scale: 'success', tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'bg-success-secondary',    label: 'bg-success-secondary',    description: 'Secondary success background — featured icons. (success-100)', scale: 'success', tone: 3, contrastAgainst: null, isVariant: false },
      { key: 'bg-success-solid',        label: 'bg-success-solid',        description: 'Solid success background — icons, metrics. (success-600)',   scale: 'success', tone: 8,  contrastAgainst: null, isVariant: false },
      { key: 'bg-info-primary',         label: 'bg-info-primary',         description: 'Primary info background. (info-50)',                         scale: 'info',    tone: 2,  contrastAgainst: null, isVariant: false },
      { key: 'bg-info-secondary',       label: 'bg-info-secondary',       description: 'Secondary info background — featured icons. (info-100)',     scale: 'info',    tone: 3,  contrastAgainst: null, isVariant: false },
      { key: 'bg-info-solid',           label: 'bg-info-solid',           description: 'Solid info background — icons, badges. (info-600)',          scale: 'info',    tone: 8,  contrastAgainst: null, isVariant: false },
    ],
  },
]

const ALL_ROLES = ROLE_GROUPS.flatMap((g) => g.roles)

// Brand-scale tokens (key → recommended tone). Reused by the quick brand-color
// edit in the Components catalogue to re-derive brand tokens from a new scale.
export const BRAND_TOKEN_TONES: Record<string, number> = Object.fromEntries(
  ALL_ROLES.filter((r) => r.scale === 'brand').map((r) => [r.key, r.tone]),
)

// ── Helpers ────────────────────────────────────────────────────────────────

/** Index (1–12) of the tone in `scale` whose hex matches `hex`, else null. */
function toneIndexOf(scale: Record<number, string>, hex: string): number | null {
  if (!hex) return null
  const target = hex.toLowerCase()
  for (const [k, v] of Object.entries(scale)) {
    if (v.toLowerCase() === target) return Number(k)
  }
  return null
}

/** Strip the trailing "(gray-900)"-style tone hint — shown via the alias badge now. */
function cleanDescription(description: string): string {
  return description.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/**
 * Recommended dark-mode tone for a role. Gray hierarchy inverts (dark text in
 * light mode → light text in dark mode); colored scales keep their hue but
 * shift to read well on dark surfaces. These are editable seeds, not fixed.
 */
function recDarkTone(role: Role): number {
  const t = role.tone
  if (role.key === 'text-white' || role.key === 'fg-white') return 1
  if (role.scale === 'gray') {
    // Solid / overlay surfaces stay dark in dark mode — don't invert them.
    if (role.key === 'bg-overlay' || role.key === 'bg-primary-solid' || role.key === 'bg-secondary-solid') return t
    return Math.min(12, Math.max(1, 13 - t))
  }
  // Colored (brand / error / warning / success / info) — keep the hue.
  if (role.key.includes('-solid') || role.key.includes('-section')) return t   // brand fills hold
  if (role.key.endsWith('_on-brand')) return t                                 // sit on a constant brand fill
  if (t <= 3) return Math.min(12, t + 9)                                       // subtle tints deepen
  return Math.max(6, t - 1)                                                    // text / fg / border lift one step
}

// ── Sub-components ─────────────────────────────────────────────────────────

/** Aliased reference badge — mirrors how Figma shows a variable bound to a primitive. */
function AliasBadge({ scale, tone, color }: { scale: ScaleSource; tone: number | null; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-md bg-surface border border-line text-[11px] font-mono text-fg-muted max-w-full">
      <span
        className="w-3.5 h-3.5 rounded-[3px] flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10"
        style={{ backgroundColor: color || 'var(--elevated)' }}
      />
      <span className="truncate tabular-nums">
        {SCALE_META[scale].label}<span className="text-fg-faint">-</span>{tone ?? '—'}
      </span>
    </span>
  )
}

/** Sliders / "tune" icon — opens the per-mode scale editor. */
function SlidersIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
      className={`transition-colors ${active ? 'text-[#5AADFF]' : 'text-fg-faint group-hover:text-fg-muted'}`}
    >
      <line x1="3" y1="2" x2="3" y2="12" />
      <line x1="7" y1="2" x2="7" y2="12" />
      <line x1="11" y1="2" x2="11" y2="12" />
      <circle cx="3" cy="5" r="1.7" fill="var(--app)" />
      <circle cx="7" cy="9" r="1.7" fill="var(--app)" />
      <circle cx="11" cy="4" r="1.7" fill="var(--app)" />
    </svg>
  )
}

function TonePicker({
  scale,
  selectedTone,
  recommendedTone,
  onChange,
  compact = false,
}: {
  scale: Record<number, string>
  selectedTone: number | null
  recommendedTone: number
  onChange: (hex: string) => void
  compact?: boolean
}) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  const size = compact ? 'w-6 h-6' : 'w-7 h-7'
  return (
    <div className="flex gap-2 flex-wrap">
      {entries.map(([key, color]) => {
        const k = Number(key)
        const isSelected = k === selectedTone
        const isRecommended = k === recommendedTone
        return (
          <div key={key} className="flex flex-col items-center gap-0.5">
            <div className="h-2 flex items-end justify-center">
              {isSelected && (
                <svg width="6" height="4" viewBox="0 0 6 4" className="text-[#5AADFF] flex-shrink-0">
                  <path d="M3 4L0 0h6L3 4z" fill="currentColor" />
                </svg>
              )}
            </div>
            <button
              onClick={() => onChange(color)}
              title={`Tone ${key} — ${color}${isRecommended ? ' · recommended' : ''}`}
              className={`${size} rounded-md transition-all duration-150 ${
                isSelected
                  ? 'ring-2 ring-[#5AADFF] ring-offset-[3px] ring-offset-app scale-125 shadow-[0_0_8px_rgba(0,136,255,0.35)]'
                  : 'ring-1 ring-black/10 dark:ring-white/10 hover:scale-110 hover:ring-black/20 dark:hover:ring-white/20'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Tone ${key}${isRecommended ? ' (recommended)' : ''}${isSelected ? ' (selected)' : ''}`}
            />
            <span className={`text-[9px] font-mono leading-none tabular-nums mt-0.5 ${
              isSelected
                ? 'text-[#5AADFF] font-semibold'
                : isRecommended
                ? 'text-[#5AADFF]/70'
                : 'text-fg-faint'
            }`}>
              {key}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Matrix row — Name · Light · Dark + filter-icon editor ───────────────────

const GRID = 'grid grid-cols-[minmax(6rem,1fr)_6.25rem_6.25rem_2.25rem]'

function MatrixRow({
  role,
  lightScale,
  darkScale,
  lightValue,
  darkValue,
  lightRecTone,
  darkRecTone,
  modified,
  expanded,
  reduce,
  onToggle,
  onPickLight,
  onPickDark,
  onReset,
}: {
  role: Role
  lightScale: Record<number, string>
  darkScale: Record<number, string>
  lightValue: string
  darkValue: string
  lightRecTone: number
  darkRecTone: number
  modified: boolean
  expanded: boolean
  reduce: boolean
  onToggle: () => void
  onPickLight: (hex: string) => void
  onPickDark: (hex: string) => void
  onReset: () => void
}) {
  const lightTone = toneIndexOf(lightScale, lightValue)
  const darkTone = toneIndexOf(darkScale, darkValue)
  const desc = cleanDescription(role.description)

  return (
    <div className={expanded ? 'bg-surface/50' : ''}>
      <div className={`${GRID} items-center border-t border-line/40 group transition-colors hover:bg-surface/40`}>
        {/* Name */}
        <button onClick={onToggle} className={`flex items-center gap-2.5 py-2.5 pr-2 min-w-0 text-left ${role.isVariant ? 'pl-7' : 'pl-4'}`}>
          <span
            className="w-5 h-5 rounded-md flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10 transition-colors duration-300"
            style={{ backgroundColor: lightValue || 'var(--elevated)' }}
          />
          <code className="font-mono text-[12px] text-fg-muted truncate" title={desc}>{role.label}</code>
          {modified && <span className="w-1.5 h-1.5 rounded-full bg-[#5AADFF] flex-shrink-0" title="Modified from recommended" />}
        </button>

        {/* Light value */}
        <button onClick={onToggle} className="flex items-center min-w-0 px-2 py-2.5 text-left" aria-label={`Light value ${SCALE_META[role.scale].label}-${lightTone ?? '?'}`}>
          <AliasBadge scale={role.scale} tone={lightTone} color={lightValue} />
        </button>

        {/* Dark value */}
        <button onClick={onToggle} className="flex items-center min-w-0 px-2 py-2.5 text-left" aria-label={`Dark value ${SCALE_META[role.scale].label}-${darkTone ?? '?'}`}>
          <AliasBadge scale={role.scale} tone={darkTone} color={darkValue} />
        </button>

        {/* Filter / edit toggle */}
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? 'Close scale editor' : 'Edit scale'}
          className="group flex items-center justify-center h-full py-2.5 text-fg-faint hover:text-fg-muted transition-colors"
        >
          <SlidersIcon active={expanded} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="flex flex-col gap-4 px-4 pt-2 pb-5">
              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-amber-500"><circle cx="6" cy="6" r="2.4" fill="currentColor"/><path d="M6 1v1.4M6 9.6V11M1 6h1.4M9.6 6H11M2.5 2.5l1 1M8.5 8.5l1 1M9.5 2.5l-1 1M3.5 8.5l-1 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
                  Light mode
                </span>
                <TonePicker scale={lightScale} selectedTone={lightTone} recommendedTone={lightRecTone} onChange={onPickLight} compact={role.isVariant} />
              </div>

              <div className="flex flex-col gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-indigo-400"><path d="M10 7.2A4.2 4.2 0 1 1 4.8 2a3.3 3.3 0 0 0 5.2 5.2z" fill="currentColor"/></svg>
                  Dark mode
                </span>
                <TonePicker scale={darkScale} selectedTone={darkTone} recommendedTone={darkRecTone} onChange={onPickDark} compact={role.isVariant} />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onReset}
                  disabled={!modified}
                  className="text-[10px] text-fg-faint hover:text-[#5AADFF] disabled:opacity-30 disabled:hover:text-fg-faint px-2 py-1 rounded border border-line hover:border-line-strong disabled:hover:border-line transition-colors"
                  title="Reset both modes to recommended"
                >
                  Reset to recommended
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Step3_SemanticTokens() {
  const {
    primaryScale, errorScale, warningScale, successScale, infoScale,
    grayLightScale,
    semanticTokens, setSemanticToken,
    darkSemanticTokens, setDarkSemanticToken,
  } = useDesignStore()

  const reduce = useReducedMotion() ?? false

  const scales: Record<ScaleSource, Record<number, string>> = {
    gray:    grayLightScale,
    brand:   primaryScale,
    error:   errorScale,
    warning: warningScale,
    success: successScale,
    info:    infoScale,
  }

  // Colored scales are shared across modes; only gray has a distinct dark ramp.
  const darkScaleOf = (role: Role) => (role.scale === 'gray' ? GRAY_DARK_SCALE : scales[role.scale])

  const ready =
    Object.keys(primaryScale).length > 0 &&
    Object.keys(errorScale).length   > 0 &&
    Object.keys(warningScale).length > 0 &&
    Object.keys(successScale).length > 0 &&
    Object.keys(infoScale).length    > 0

  const recHexOf = (role: Role) => {
    // The solid brand button uses white text — pick a dark-enough brand tone so
    // it always passes WCAG AA, even for bright hues (overrides the fixed tone).
    if (role.key === 'bg-brand-solid' || role.key === 'bg-brand-solid_hover') {
      const solid = accessibleSolidTone(primaryScale)
      const tone = role.key === 'bg-brand-solid' ? solid : Math.min(solid + 1, 12)
      return primaryScale[tone] ?? ''
    }
    return scales[role.scale][role.tone] ?? ''
  }
  const recDarkHexOf = (role: Role) => darkScaleOf(role)[recDarkTone(role)] ?? ''

  const isLightModified = (role: Role) => {
    const cur = semanticTokens[role.key]
    const rec = recHexOf(role)
    return !!cur && !!rec && cur.toLowerCase() !== rec.toLowerCase()
  }
  const isDarkModified = (role: Role) => {
    const cur = darkSemanticTokens[role.key]
    const rec = recDarkHexOf(role)
    return !!cur && !!rec && cur.toLowerCase() !== rec.toLowerCase()
  }
  const isModified = (role: Role) => isLightModified(role) || isDarkModified(role)

  // UI state
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  function resetRole(role: Role) {
    const l = recHexOf(role); if (l) setSemanticToken(role.key, l)
    const d = recDarkHexOf(role); if (d) setDarkSemanticToken(role.key, d)
  }

  // Auto-populate on mount + resync whenever any scale changes. Overwrites only
  // empty OR stale values (a stored hex that no longer maps to any tone in the
  // token's current source scale — e.g. after a gray-flavor change regenerates
  // the gray ramp). Intentional customisations are preserved.
  useEffect(() => {
    if (!ready) return
    ALL_ROLES.forEach((role) => {
      const lightSrc = scales[role.scale]
      if (!semanticTokens[role.key] || toneIndexOf(lightSrc, semanticTokens[role.key]) === null) {
        const hex = recHexOf(role)
        if (hex) setSemanticToken(role.key, hex)
      }
      const darkSrc = darkScaleOf(role)
      if (!darkSemanticTokens[role.key] || toneIndexOf(darkSrc, darkSemanticTokens[role.key]) === null) {
        const hex = recDarkHexOf(role)
        if (hex) setDarkSemanticToken(role.key, hex)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, grayLightScale, primaryScale, errorScale, warningScale, successScale, infoScale])

  const q = query.trim().toLowerCase()

  // Internal category nav (master) → table (detail). "All" shows every role flat.
  const NAV = [
    { key: 'all', label: 'All tokens', roles: ALL_ROLES },
    ...ROLE_GROUPS.map((g) => ({ key: g.category, label: g.label, roles: g.roles })),
  ]
  const baseRoles = activeCategory === 'all'
    ? ALL_ROLES
    : ROLE_GROUPS.find((g) => g.category === activeCategory)?.roles ?? []
  const visibleRoles = q
    ? baseRoles.filter((r) => r.label.toLowerCase().includes(q) || cleanDescription(r.description).toLowerCase().includes(q))
    : baseRoles
  const activeLabel = NAV.find((n) => n.key === activeCategory)?.label ?? 'All tokens'

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-48 text-fg-faint text-sm">
        Pick a brand color in the Color section first to generate the scales.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-4"
    >
      {/* Master-detail: category side-nav + matrix table */}
      <div className="flex gap-4 items-start">
        {/* Internal category nav */}
        <nav aria-label="Token categories" className="w-40 flex-shrink-0 self-start rounded-xl border border-line/70 bg-surface/40 p-1.5 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const isActive = activeCategory === item.key
            const mod = item.roles.filter(isModified).length
            return (
              <button
                key={item.key}
                onClick={() => { setActiveCategory(item.key); setExpandedRole(null) }}
                aria-current={isActive}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                  isActive ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:bg-elevated/50 hover:text-fg'
                }`}
              >
                <span className="text-[13px] flex-1 min-w-0 truncate">{item.label}</span>
                {mod > 0 && <span className="w-1.5 h-1.5 rounded-full bg-[#5AADFF] flex-shrink-0" title={`${mod} modified`} />}
                <span className={`text-[11px] font-mono tabular-nums ${isActive ? 'text-fg-muted' : 'text-fg-faint'}`}>{item.roles.length}</span>
              </button>
            )
          })}
        </nav>

        {/* Matrix table */}
        <div className="flex-1 min-w-0 rounded-xl border border-line/70 overflow-hidden">
          {/* Search — integrated top row */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-line bg-surface/50">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter tokens by name or description…"
              className="flex-1 min-w-0 bg-transparent text-sm text-fg-muted placeholder:text-fg-faint outline-none font-mono"
              aria-label="Filter tokens"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Clear filter"
                className="text-fg-faint hover:text-fg-muted transition-colors w-5 h-5 flex items-center justify-center flex-shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          {/* Scrollable matrix body */}
          <div className="overflow-x-auto">
            <div className="min-w-[24rem]">
              {/* Column header */}
              <div className={`${GRID} items-center bg-surface/70 border-b border-line text-[10px] font-semibold uppercase tracking-widest text-fg-faint`}>
                <span className="pl-4 py-2.5 normal-case tracking-normal text-[11px] font-mono text-fg-muted">{activeLabel}</span>
                <span className="px-2 py-2.5">Light</span>
                <span className="px-2 py-2.5">Dark</span>
                <span aria-hidden />
              </div>

              {visibleRoles.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">
                  No tokens match “{query}”.
                </div>
              ) : (
                visibleRoles.map((role) => (
                  <MatrixRow
                    key={role.key}
                    role={role}
                    lightScale={scales[role.scale]}
                    darkScale={darkScaleOf(role)}
                    lightValue={semanticTokens[role.key] ?? ''}
                    darkValue={darkSemanticTokens[role.key] ?? ''}
                    lightRecTone={role.tone}
                    darkRecTone={recDarkTone(role)}
                    modified={isModified(role)}
                    expanded={expandedRole === role.key}
                    reduce={reduce}
                    onToggle={() => setExpandedRole((cur) => (cur === role.key ? null : role.key))}
                    onPickLight={(hex) => setSemanticToken(role.key, hex)}
                    onPickDark={(hex) => setDarkSemanticToken(role.key, hex)}
                    onReset={() => resetRole(role)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
