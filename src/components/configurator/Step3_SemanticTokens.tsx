import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore, GRAY_DARK_SCALE } from '../../store/useDesignStore'
import { accessibleSolidTone } from '../../lib/colorUtils'
import AddThemeModal from './AddThemeModal'

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
]

const ALL_ROLES = ROLE_GROUPS.flatMap((g) => g.roles)

// Brand-scale tokens (key → recommended tone). Reused by the quick brand-color
// edit in the Components catalogue to re-derive brand tokens from a new scale.
export const BRAND_TOKEN_TONES: Record<string, number> = Object.fromEntries(
  ALL_ROLES.filter((r) => r.scale === 'brand').map((r) => [r.key, r.tone]),
)

// Shared category id — the table's side-nav and the right-hand preview both key
// off this, so editing a category's tokens shows a matching live specimen.
export type SemanticCategory = 'all' | 'text' | 'border' | 'fg' | 'bg'

// ── Category nav metadata: icon + one-line description (tooltip) ─────────────
const catIc = (d: string, filled = false): ReactNode => (
  <svg
    width="15" height="15" viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
)

const CATEGORY_ICON: Record<SemanticCategory, ReactNode> = {
  all:    catIc('M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z'),
  text:   catIc('M4 7V4h16v3M9 20h6M12 4v16'),
  border: catIc('M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'),
  fg:     catIc('M12 3l2.5 6 6 2.5-6 2.5L12 20l-2.5-6-6-2.5 6-2.5z'),
  bg:     catIc('M3 3h18v18H3z', true),
}

const CATEGORY_DESC: Record<SemanticCategory, string> = {
  all: 'Every semantic role across all categories',
  ...(Object.fromEntries(ROLE_GROUPS.map((g) => [g.category, g.description])) as Record<
    Exclude<SemanticCategory, 'all'>,
    string
  >),
}

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

// ── Matrix row — Name · one value column per theme + filter-icon editor ──────

/** A theme column resolved for one role: the scale it draws from + current value. */
type ThemeCol = {
  key: string
  kind: 'light' | 'dark'
  scale: Record<number, string>
  value: string
  recTone: number
}

/** Eye glyph — open (active = previewed theme) vs. struck-through (inactive). */
function EyeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-3 3.9M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4-.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}

/** Sun (light) / moon (dark) glyph used by the per-theme editor labels. */
function KindIcon({ kind }: { kind: 'light' | 'dark' }) {
  return kind === 'light' ? (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-amber-500"><circle cx="6" cy="6" r="2.4" fill="currentColor"/><path d="M6 1v1.4M6 9.6V11M1 6h1.4M9.6 6H11M2.5 2.5l1 1M8.5 8.5l1 1M9.5 2.5l-1 1M3.5 8.5l-1 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
  ) : (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" className="text-indigo-400"><path d="M10 7.2A4.2 4.2 0 1 1 4.8 2a3.3 3.3 0 0 0 5.2 5.2z" fill="currentColor"/></svg>
  )
}

function MatrixRow({
  role,
  index,
  cols,
  modified,
  expanded,
  reduce,
  gridStyle,
  onToggle,
  onPick,
  onReset,
}: {
  role: Role
  index: number
  cols: ThemeCol[]
  modified: boolean
  expanded: boolean
  reduce: boolean
  gridStyle: React.CSSProperties
  onToggle: () => void
  onPick: (theme: string, hex: string) => void
  onReset: () => void
}) {
  const desc = cleanDescription(role.description)
  const isEven = index % 2 === 1

  return (
    <div className={expanded ? 'bg-blue-50/40 dark:bg-blue-950/10' : isEven ? 'bg-black/[0.018] dark:bg-white/[0.02]' : ''}>
      <div className="grid items-center border-t border-line/40 group transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]" style={gridStyle}>
        {/* Name */}
        <button onClick={onToggle} className="flex items-center gap-3 py-3 pl-4 pr-4 min-w-0 text-left border-r border-line">
          <span
            className="w-6 h-6 rounded-md flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10 transition-colors duration-300"
            style={{ backgroundColor: cols[0]?.value || 'var(--elevated)' }}
          />
          <code className="font-mono text-[12px] text-fg-muted truncate" title={desc}>{role.label}</code>
          {modified && <span className="w-1.5 h-1.5 rounded-full bg-[#5AADFF] flex-shrink-0" title="Modified from recommended" />}
        </button>

        {/* One value cell per theme */}
        {cols.map((col) => {
          const tone = toneIndexOf(col.scale, col.value)
          return (
            <button
              key={col.key}
              onClick={onToggle}
              className="flex items-center min-w-0 px-3 py-3 text-left border-r border-line"
              aria-label={`${col.key} value ${SCALE_META[role.scale].label}-${tone ?? '?'}`}
            >
              <AliasBadge scale={role.scale} tone={tone} color={col.value} />
            </button>
          )
        })}

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
              {cols.map((col) => (
                <div key={col.key} className="flex flex-col gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg-faint">
                    <KindIcon kind={col.kind} />
                    {col.key}
                  </span>
                  <TonePicker
                    scale={col.scale}
                    selectedTone={toneIndexOf(col.scale, col.value)}
                    recommendedTone={col.recTone}
                    onChange={(hex) => onPick(col.key, hex)}
                    compact={role.isVariant}
                  />
                </div>
              ))}

              <div className="flex items-center gap-2">
                <button
                  onClick={onReset}
                  disabled={!modified}
                  className="text-[10px] text-fg-faint hover:text-[#5AADFF] disabled:opacity-30 disabled:hover:text-fg-faint px-2 py-1 rounded border border-line hover:border-line-strong disabled:hover:border-line transition-colors"
                  title="Reset every theme to recommended"
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

export default function Step3_SemanticTokens({
  activeCategory: controlledCategory,
  onCategoryChange,
  previewTheme,
  onPreviewThemeChange,
}: {
  /** Controlled category (driven by the shell so the preview can mirror it). */
  activeCategory?: SemanticCategory
  onCategoryChange?: (c: SemanticCategory) => void
  /** Theme currently rendered in the right-hand preview (eye toggle). */
  previewTheme?: string
  onPreviewThemeChange?: (theme: string) => void
} = {}) {
  const {
    primaryScale, errorScale, warningScale, successScale, infoScale,
    grayLightScale,
    themes, themeOrder, themeKinds, themePalettes,
    setThemeToken, removeTheme,
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

  // Resolve the source ramp for a role in a given theme. Custom "style themes"
  // carry their own palette (themePalettes); built-in light/dark fall back to
  // the global scales — only gray has a distinct dark ramp.
  const scaleFor = (theme: string, role: Role, kind: 'light' | 'dark') => {
    const pal = themePalettes[theme]
    if (pal) return pal[role.scale]
    return role.scale === 'gray' && kind === 'dark' ? GRAY_DARK_SCALE : scales[role.scale]
  }

  const themeCols = themeOrder.filter((t) => themes[t])
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `minmax(0,1fr) repeat(${themeCols.length}, 7rem) 2.75rem`,
  }

  const ready =
    Object.keys(primaryScale).length > 0 &&
    Object.keys(errorScale).length   > 0 &&
    Object.keys(warningScale).length > 0 &&
    Object.keys(successScale).length > 0 &&
    Object.keys(infoScale).length    > 0

  // Recommended tone/hex per theme kind. Light kinds use the role's documented
  // tone; dark kinds invert via recDarkTone. The solid brand button overrides
  // its tone so white text always passes WCAG AA, even for bright hues.
  const recToneFor = (theme: string, role: Role, kind: 'light' | 'dark') => {
    if (kind === 'light' && (role.key === 'bg-brand-solid' || role.key === 'bg-brand-solid_hover')) {
      const solid = accessibleSolidTone(scaleFor(theme, role, kind))
      return role.key === 'bg-brand-solid' ? solid : Math.min(solid + 1, 12)
    }
    return kind === 'light' ? role.tone : recDarkTone(role)
  }
  const recHexFor = (theme: string, role: Role, kind: 'light' | 'dark') =>
    scaleFor(theme, role, kind)[recToneFor(theme, role, kind)] ?? ''

  const kindOf = (theme: string): 'light' | 'dark' => themeKinds[theme] ?? 'light'

  const isModified = (role: Role) =>
    themeCols.some((t) => {
      const cur = themes[t]?.[role.key]
      const rec = recHexFor(t, role, kindOf(t))
      return !!cur && !!rec && cur.toLowerCase() !== rec.toLowerCase()
    })

  // UI state — category is controllable; falls back to internal state standalone.
  const [internalCategory, setInternalCategory] = useState<SemanticCategory>('all')
  const activeCategory = controlledCategory ?? internalCategory
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  // "+ Theme" modal state
  const [addThemeOpen, setAddThemeOpen] = useState(false)

  function selectCategory(c: SemanticCategory) {
    onCategoryChange?.(c)
    if (controlledCategory === undefined) setInternalCategory(c)
    setExpandedRole(null)
  }

  function resetRole(role: Role) {
    themeCols.forEach((t) => {
      const hex = recHexFor(t, role, kindOf(t))
      if (hex) setThemeToken(t, role.key, hex)
    })
  }

  // Auto-populate on mount + resync whenever any scale changes. Overwrites only
  // empty OR stale values (a stored hex that no longer maps to any tone in the
  // token's current source scale — e.g. after a gray-flavor change regenerates
  // the gray ramp). Intentional customisations are preserved.
  useEffect(() => {
    if (!ready) return
    ALL_ROLES.forEach((role) => {
      themeCols.forEach((t) => {
        const kind = kindOf(t)
        const src = scaleFor(t, role, kind)
        const cur = themes[t]?.[role.key]
        if (!cur || toneIndexOf(src, cur) === null) {
          const hex = recHexFor(t, role, kind)
          if (hex) setThemeToken(t, role.key, hex)
        }
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, grayLightScale, primaryScale, errorScale, warningScale, successScale, infoScale, themeOrder, themePalettes])

  const q = query.trim().toLowerCase()

  // Internal category nav (master) → table (detail). "All" shows every role flat.
  const NAV: { key: SemanticCategory; label: string; roles: Role[] }[] = [
    { key: 'all', label: 'All tokens', roles: ALL_ROLES },
    ...ROLE_GROUPS.map((g) => ({ key: g.category as SemanticCategory, label: g.label, roles: g.roles })),
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
      className="flex flex-col bg-app border border-line rounded-xl overflow-hidden flex-1 min-h-0"
    >
      {/* Top bar: active category title + count + search — pinned */}
      <div className="flex items-center justify-between gap-3 h-12 px-4 border-b border-line bg-app flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-sm text-fg truncate">{activeLabel}</span>
          <span className="text-[11px] font-mono tabular-nums text-fg-faint">{baseRoles.length}</span>
          {/* + Theme — opens a modal to pick the new theme's brand/neutral/semantic palette */}
          <button
            onClick={() => setAddThemeOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-fg-faint hover:text-fg border border-line hover:border-line-strong transition-colors"
            title="Add a theme with its own color palette"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8"/></svg>
            Theme
          </button>
        </div>
        <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line w-48 max-w-[45%] focus-within:border-line-strong transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="flex-1 min-w-0 bg-transparent text-[13px] text-fg-muted placeholder:text-fg-faint outline-none"
            aria-label="Filter tokens"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Body: category side-nav + token table */}
      <div className="flex items-stretch flex-1 min-h-0">
        {/* Internal category nav — icon-only, tooltip on hover */}
        <nav aria-label="Token categories" className="w-12 flex-shrink-0 border-r border-line py-2 px-1.5 flex flex-col gap-0.5 bg-app overflow-y-auto">
          {NAV.map((item) => {
            const isActive = activeCategory === item.key
            const mod = item.roles.filter(isModified).length
            return (
              <div key={item.key} className="relative group">
                <button
                  onClick={() => selectCategory(item.key)}
                  aria-label={item.label}
                  aria-current={isActive}
                  className={`relative w-full flex items-center justify-center p-2 rounded-lg transition-colors ${
                    isActive ? 'bg-elevated text-[#5AADFF] shadow-sm' : 'text-fg-faint hover:bg-elevated/50 hover:text-fg-muted'
                  }`}
                >
                  {CATEGORY_ICON[item.key]}
                  {mod > 0 && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#5AADFF]" aria-hidden />
                  )}
                </button>
                {/* Hover tooltip — label + description, points right into the table */}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 w-44 rounded-lg bg-fg text-app text-[11px] leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-40 shadow-lg"
                >
                  <span className="font-semibold block mb-0.5">{item.label}</span>
                  {CATEGORY_DESC[item.key]}
                </span>
              </div>
            )
          })}
        </nav>

        {/* Token table — scrolls internally; column header stays pinned */}
        <div className="flex-1 min-w-0 overflow-auto">
          <div className="min-w-[26rem]">
            {/* Column header — one column per theme; custom themes are removable */}
            <div className="grid items-center border-b border-line bg-app text-[10px] font-semibold uppercase tracking-widest text-fg-faint sticky top-0 z-10" style={gridStyle}>
              <span className="pl-4 py-3 border-r border-line">Token name</span>
              {themeCols.map((t) => {
                const isPreviewed = previewTheme === t
                return (
                  <span key={t} className="flex items-center gap-1 px-2 py-3 border-r border-line min-w-0">
                    <button
                      onClick={() => onPreviewThemeChange?.(t)}
                      aria-label={isPreviewed ? `${t} is shown in preview` : `Preview theme ${t}`}
                      aria-pressed={isPreviewed}
                      title={isPreviewed ? `${t} — shown in preview` : `Show ${t} in the preview`}
                      className={`flex-shrink-0 transition-colors ${
                        isPreviewed ? 'text-[#5AADFF]' : 'text-fg-faint hover:text-fg-muted'
                      }`}
                    >
                      <EyeIcon active={isPreviewed} />
                    </button>
                    <span className="truncate">{t}</span>
                    {t !== 'light' && t !== 'dark' && (
                      <button
                        onClick={() => removeTheme(t)}
                        aria-label={`Remove theme ${t}`}
                        title={`Remove theme ${t}`}
                        className="text-fg-faint hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 2 2 10M2 2l8 8"/></svg>
                      </button>
                    )}
                  </span>
                )
              })}
              <span className="flex items-center justify-center py-3" aria-hidden>
                <SlidersIcon active={false} />
              </span>
            </div>

            {visibleRoles.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-fg-faint">
                No tokens match “{query}”.
              </div>
            ) : (
              visibleRoles.map((role, idx) => (
                <MatrixRow
                  key={role.key}
                  role={role}
                  index={idx}
                  cols={themeCols.map((t) => {
                    const kind = kindOf(t)
                    return {
                      key: t,
                      kind,
                      scale: scaleFor(t, role, kind),
                      value: themes[t]?.[role.key] ?? '',
                      recTone: recToneFor(t, role, kind),
                    }
                  })}
                  modified={isModified(role)}
                  expanded={expandedRole === role.key}
                  reduce={reduce}
                  gridStyle={gridStyle}
                  onToggle={() => setExpandedRole((cur) => (cur === role.key ? null : role.key))}
                  onPick={(theme, hex) => setThemeToken(theme, role.key, hex)}
                  onReset={() => resetRole(role)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <AddThemeModal open={addThemeOpen} onClose={() => setAddThemeOpen(false)} />
    </motion.div>
  )
}
