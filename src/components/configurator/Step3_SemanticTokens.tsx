import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDesignStore, GRAY_LIGHT_SCALE } from '../../store/useDesignStore'
import { checkContrast } from '../../lib/colorUtils'

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

// ── Sub-components ─────────────────────────────────────────────────────────

function ScaleBadge({ scale, dot }: { scale: ScaleSource; dot: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[9px] font-mono uppercase tracking-wide text-neutral-400">
      <span className="w-2 h-2 rounded-full ring-1 ring-white/20" style={{ backgroundColor: dot }} />
      {SCALE_META[scale].label}
    </span>
  )
}

function TonePicker({
  scale,
  selected,
  onChange,
  compact = false,
}: {
  scale: Record<number, string>
  selected: string
  onChange: (hex: string) => void
  compact?: boolean
}) {
  const entries = Object.entries(scale).sort(([a], [b]) => Number(a) - Number(b))
  const size = compact ? 'w-5 h-5' : 'w-6 h-6'
  return (
    <div className="flex gap-1 flex-wrap">
      {entries.map(([key, color]) => {
        const isSelected = color === selected
        return (
          <button
            key={key}
            onClick={() => onChange(color)}
            title={`Tone ${key} — ${color}`}
            className={`${size} rounded-md transition-all duration-150 hover:scale-110 ${
              isSelected
                ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-neutral-950 scale-110'
                : 'ring-1 ring-white/10'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Tone ${key}`}
          />
        )
      })}
    </div>
  )
}

function ContrastPair({ fg, bg, fgLabel, bgLabel }: { fg: string; bg: string; fgLabel: string; bgLabel: string }) {
  if (!fg || !bg) return null
  const ratio = checkContrast(fg, bg)
  const aa = ratio >= 4.5
  const aaa = ratio >= 7
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="px-2 py-0.5 rounded text-[11px] font-medium" style={{ backgroundColor: bg, color: fg, border: `1px solid ${fg}22` }}>
        Aa
      </div>
      <span className={`font-mono ${aaa ? 'text-emerald-400' : aa ? 'text-violet-400' : 'text-rose-400'}`}>{ratio.toFixed(2)}:1</span>
      <span className={`${aaa ? 'text-emerald-500' : aa ? 'text-violet-500' : 'text-rose-500'}`}>{aaa ? 'AAA' : aa ? 'AA' : '✗ fail'}</span>
      <span className="text-neutral-600 truncate">{fgLabel} / {bgLabel}</span>
    </div>
  )
}

// ── Group header with collapsed swatch preview ─────────────────────────────

function GroupHeader({
  group,
  tokenColors,
  isExpanded,
  onToggle,
  onReset,
}: {
  group: RoleGroup
  tokenColors: string[]
  isExpanded: boolean
  onToggle: () => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-neutral-900/60">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 flex-1 min-w-0 text-left group"
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`text-neutral-500 transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
        >
          <path d="M4 2.5L8 6L4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="text-xs font-semibold text-neutral-300 uppercase tracking-widest group-hover:text-white transition-colors">
          {group.label}
        </span>
        <span className="text-[10px] text-neutral-600 font-mono">
          {group.roles.length}
        </span>
      </button>

      {/* Collapsed swatch preview */}
      {!isExpanded && tokenColors.length > 0 && (
        <div className="flex gap-0.5 flex-shrink-0">
          {tokenColors.slice(0, 10).map((c, i) => (
            <div
              key={i}
              className="w-3.5 h-3.5 rounded-sm ring-1 ring-white/5"
              style={{ backgroundColor: c || '#1a1a1a' }}
              title={c}
            />
          ))}
        </div>
      )}

      <button
        onClick={(e) => { e.stopPropagation(); onReset() }}
        className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors px-2 py-0.5 rounded hover:bg-neutral-800 flex-shrink-0"
        title="Reset to recommended values"
      >
        Reset
      </button>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Step3_SemanticTokens() {
  const {
    primaryScale, errorScale, warningScale, successScale, infoScale,
    semanticTokens, setSemanticToken,
  } = useDesignStore()

  const scales: Record<ScaleSource, Record<number, string>> = {
    gray:    GRAY_LIGHT_SCALE,
    brand:   primaryScale,
    error:   errorScale,
    warning: warningScale,
    success: successScale,
    info:    infoScale,
  }

  const ready =
    Object.keys(primaryScale).length > 0 &&
    Object.keys(errorScale).length   > 0 &&
    Object.keys(warningScale).length > 0 &&
    Object.keys(successScale).length > 0 &&
    Object.keys(infoScale).length    > 0

  // All groups collapsed by default — auto-filled values are pre-populated
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  function toggleGroup(category: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  function resetGroup(group: RoleGroup) {
    group.roles.forEach((role) => {
      const hex = scales[role.scale][role.tone]
      if (hex) setSemanticToken(role.key, hex)
    })
  }

  function resetAll() {
    ALL_ROLES.forEach((role) => {
      const hex = scales[role.scale][role.tone]
      if (hex) setSemanticToken(role.key, hex)
    })
  }

  // Auto-populate on mount if tokens are empty
  useEffect(() => {
    if (!ready) return
    ALL_ROLES.forEach((role) => {
      if (!semanticTokens[role.key]) {
        const hex = scales[role.scale][role.tone]
        if (hex) setSemanticToken(role.key, hex)
      }
    })
  }, [ready])

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-48 text-neutral-600 text-sm">
        ← Go back to Step 2 to generate the color scales first.
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-2"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-neutral-500">
          All tokens are pre-filled from your color scales. Expand any group to customize individual values.
        </p>
        <button
          onClick={resetAll}
          className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors px-2.5 py-1 rounded border border-neutral-800 hover:border-neutral-700 flex-shrink-0 ml-4"
        >
          Reset all
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {ROLE_GROUPS.map((group, gi) => {
          const isExpanded = expandedGroups.has(group.category)
          const tokenColors = group.roles
            .filter((r) => !r.isVariant)
            .map((r) => semanticTokens[r.key])
            .filter(Boolean) as string[]

          return (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: gi * 0.05 }}
              className="rounded-lg border border-neutral-800/60 overflow-hidden"
            >
              <GroupHeader
                group={group}
                tokenColors={tokenColors}
                isExpanded={isExpanded}
                onToggle={() => toggleGroup(group.category)}
                onReset={() => resetGroup(group)}
              />

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="border-t border-neutral-800/50">
                      {group.roles.map((role, ri) => {
                        const sourceScale   = scales[role.scale]
                        const dot           = sourceScale[7] ?? sourceScale[6] ?? '#888'
                        const selected      = semanticTokens[role.key] ?? ''
                        const contrastBgHex = role.contrastAgainst ? semanticTokens[role.contrastAgainst] ?? '' : ''
                        const contrastLabel = ALL_ROLES.find((r) => r.key === role.contrastAgainst)?.label ?? role.contrastAgainst ?? ''

                        return (
                          <div
                            key={role.key}
                            className={[
                              'flex flex-col gap-2 px-4 py-3 bg-neutral-950/40',
                              ri > 0 ? 'border-t border-neutral-800/40' : '',
                              role.isVariant ? 'pl-8 border-l-2 border-neutral-800/60 ml-4' : '',
                            ].join(' ')}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`rounded-md flex-shrink-0 ring-1 ring-white/10 transition-colors duration-300 ${role.isVariant ? 'w-5 h-5' : 'w-7 h-7'}`}
                                  style={{ backgroundColor: selected || '#1a1a1a' }}
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <code className={`font-mono ${role.isVariant ? 'text-[10px] text-neutral-400' : 'text-[11px] text-neutral-300'}`}>
                                      --color-{role.label}
                                    </code>
                                    <ScaleBadge scale={role.scale} dot={dot} />
                                  </div>
                                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug">{role.description}</p>
                                </div>
                              </div>
                              {selected && (
                                <span className="text-[10px] font-mono text-neutral-600 flex-shrink-0 pt-0.5">{selected}</span>
                              )}
                            </div>

                            <TonePicker
                              scale={sourceScale}
                              selected={selected}
                              onChange={(hex) => setSemanticToken(role.key, hex)}
                              compact={role.isVariant}
                            />

                            {role.contrastAgainst && selected && contrastBgHex && (
                              <ContrastPair fg={selected} bg={contrastBgHex} fgLabel={role.label} bgLabel={contrastLabel} />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {/* CSS Variables preview */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 rounded-lg bg-neutral-900 border border-neutral-800 p-4"
      >
        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">CSS Variables preview</p>
        <pre className="text-xs font-mono leading-relaxed text-neutral-400 overflow-x-auto max-h-64 overflow-y-auto">
          {`:root {\n${ROLE_GROUPS.map((g) =>
            `  /* ${g.label} */\n` +
            g.roles.map((r) => `  --color-${r.label}: ${semanticTokens[r.key] || '/* unset */'};`).join('\n')
          ).join('\n\n')}\n}`}
        </pre>
      </motion.div>
    </motion.div>
  )
}
