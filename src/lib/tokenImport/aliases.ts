// ─── Import pipeline: semantic key matching ──────────────────────────────────
// Maps token names found in arbitrary files onto our role taxonomy, in
// strength order: exact role key → legacy v23 key (SEMANTIC_KEY_RENAME) →
// community alias table → prefix-synonym pattern rewrite.

import { ALL_ROLES } from '../semanticRoles'
import { SEMANTIC_KEY_RENAME } from '../../store/useDesignStore'

const ROLE_KEYS = new Set(ALL_ROLES.map((r) => r.key))

// Common community conventions (shadcn, Tailwind semantic sets, Material-ish,
// ad-hoc systems) → our role keys. Keys are normalized (lowercase, kebab).
export const SEMANTIC_ALIASES: Record<string, string> = {
  // ── Surfaces ──
  background: 'surface-0', bg: 'surface-0', canvas: 'surface-0', page: 'surface-0',
  app: 'surface-0', 'bg-default': 'surface-0', 'background-default': 'surface-0',
  'background-primary': 'surface-0', 'bg-base': 'surface-0', 'surface-primary': 'surface-0',
  surface: 'surface-1', card: 'surface-1', 'bg-card': 'surface-1', panel: 'surface-1',
  elevated: 'surface-1', raised: 'surface-1', 'surface-raised': 'surface-1',
  'surface-secondary': 'surface-1', 'background-secondary': 'surface-1', 'bg-subtle': 'surface-1',
  popover: 'surface-1', muted: 'surface-2', 'bg-muted': 'surface-2', well: 'surface-2',
  sunken: 'surface-2', 'surface-tertiary': 'surface-2', 'background-tertiary': 'surface-2',
  overlay: 'surface-overlay', scrim: 'surface-overlay', backdrop: 'surface-overlay',
  selected: 'surface-selected', 'bg-selected': 'surface-selected', active: 'surface-selected',
  inverse: 'surface-inverse', 'bg-inverse': 'surface-inverse', 'surface-inverse': 'surface-inverse',
  // ── Text ──
  foreground: 'text-primary', fg: 'text-primary', text: 'text-primary', content: 'text-primary',
  body: 'text-primary', ink: 'text-primary', heading: 'text-primary',
  'on-background': 'text-primary', 'on-surface': 'text-primary',
  'text-default': 'text-primary', 'text-base': 'text-primary', 'text-body': 'text-secondary',
  'text-muted': 'text-secondary', 'muted-foreground': 'text-secondary', 'text-subtle': 'text-secondary',
  'fg-muted': 'text-secondary', 'foreground-secondary': 'text-secondary',
  caption: 'text-tertiary', 'text-faint': 'text-tertiary', 'fg-subtle': 'text-tertiary',
  placeholder: 'text-placeholder', 'input-placeholder': 'text-placeholder',
  link: 'text-brand', 'text-link': 'text-brand', 'text-accent': 'text-brand',
  'on-primary': 'text-on-brand', 'primary-foreground': 'text-on-brand',
  'accent-foreground': 'text-on-brand', 'on-brand': 'text-on-brand',
  'text-inverse': 'text-on-inverse',
  // ── Borders ──
  border: 'border-default', divider: 'border-default', separator: 'border-default',
  stroke: 'border-default', outline: 'border-default', line: 'border-default',
  'border-color': 'border-default', 'border-base': 'border-default',
  'border-muted': 'border-subtle', 'border-light': 'border-subtle',
  input: 'border-strong', 'input-border': 'border-strong',
  ring: 'border-brand', 'focus-ring': 'border-brand', focus: 'border-brand',
  'border-focus': 'border-brand', 'border-active': 'border-brand',
  // ── Actions ──
  primary: 'action-primary', brand: 'action-primary', accent: 'action-primary',
  cta: 'action-primary', interactive: 'action-primary', action: 'action-primary',
  button: 'action-primary', 'button-primary': 'action-primary', 'btn-primary': 'action-primary',
  'primary-hover': 'action-primary-hover', 'brand-hover': 'action-primary-hover',
  'accent-hover': 'action-primary-hover', 'button-primary-hover': 'action-primary-hover',
  disabled: 'action-disabled',
  // ── Status ──
  danger: 'status-error', destructive: 'status-error', error: 'status-error',
  negative: 'status-error', critical: 'status-error',
  warning: 'status-warning', caution: 'status-warning', attention: 'status-warning',
  success: 'status-success', positive: 'status-success', confirm: 'status-success',
  info: 'status-info', informative: 'status-info', notice: 'status-info',
  'danger-subtle': 'status-error-subtle', 'error-subtle': 'status-error-subtle',
  'error-bg': 'status-error-subtle', 'danger-bg': 'status-error-subtle',
  'warning-subtle': 'status-warning-subtle', 'warning-bg': 'status-warning-subtle',
  'success-subtle': 'status-success-subtle', 'success-bg': 'status-success-subtle',
  'info-subtle': 'status-info-subtle', 'info-bg': 'status-info-subtle',
  // ── Icons ──
  icon: 'icon-primary', 'icon-default': 'icon-primary',
  'icon-muted': 'icon-tertiary', 'icon-subtle': 'icon-tertiary',
}

// Ordered prefix/word synonyms applied before a retry — each rewrite feeds the
// exact/legacy/alias lookups again ("bg-danger-solid" → "bg-error-solid" →
// legacy → "status-error").
const SYNONYMS: [RegExp, string][] = [
  [/^background-/, 'bg-'],
  [/^foreground-/, 'text-'],
  [/danger/g, 'error'],
  [/destructive/g, 'error'],
  [/positive/g, 'success'],
  [/notice/g, 'info'],
  [/^fg-/, 'icon-'],
]

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s._]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export type RoleMatchVia = 'exact' | 'legacy' | 'alias' | 'pattern'
export interface RoleMatch {
  roleKey: string
  via: RoleMatchVia
}

function lookup(key: string): RoleMatch | null {
  if (ROLE_KEYS.has(key)) return { roleKey: key, via: 'exact' }
  if (SEMANTIC_KEY_RENAME[key]) return { roleKey: SEMANTIC_KEY_RENAME[key], via: 'legacy' }
  if (SEMANTIC_ALIASES[key]) return { roleKey: SEMANTIC_ALIASES[key], via: 'alias' }
  return null
}

/**
 * Match one token name against the role taxonomy. `rawKey` may be a leaf key
 * ("primary") or a joined trailing path ("text-primary"). Legacy keys keep
 * their underscores ("bg-primary_alt"), so the raw lowercased form is tried
 * against the legacy table before kebab normalization.
 */
export function matchRole(rawKey: string): RoleMatch | null {
  const rawLower = rawKey.trim().toLowerCase()
  if (SEMANTIC_KEY_RENAME[rawLower]) return { roleKey: SEMANTIC_KEY_RENAME[rawLower], via: 'legacy' }
  const k = normalizeKey(rawKey)
  if (!k) return null
  const direct = lookup(k)
  if (direct) return direct
  let rewritten = k
  for (const [re, to] of SYNONYMS) rewritten = rewritten.replace(re, to)
  if (rewritten !== k) {
    const m = lookup(rewritten) ?? (SEMANTIC_KEY_RENAME[rewritten] ? { roleKey: SEMANTIC_KEY_RENAME[rewritten], via: 'legacy' as const } : null)
    if (m) return { roleKey: m.roleKey, via: 'pattern' }
  }
  return null
}

// Container words that carry no semantic intent — excluded when joining a
// candidate's trailing path segments into a match key.
const CONTAINER_WORDS = new Set([
  'color', 'colors', 'colour', 'colours', 'token', 'tokens', 'semantic', 'semantics',
  'alias', 'aliases', 'theme', 'themes', 'mode', 'modes', 'light', 'dark', 'global',
  'core', 'sys', 'ref', 'palette', 'primitives', 'primitive', 'foundation', 'foundations',
])

/**
 * Match a candidate using its leaf key plus meaningful trailing path segments,
 * longest join first — `semantic.text.primary` tries "text-primary" before
 * "primary".
 */
export function matchCandidateRole(path: string[], key: string): RoleMatch | null {
  const meaningful = path
    .map((p) => p.toLowerCase())
    .filter((p) => !CONTAINER_WORDS.has(p))
  const tails: string[] = []
  if (meaningful.length >= 2) tails.push(`${meaningful.slice(-2).join('-')}-${key}`)
  if (meaningful.length >= 1) tails.push(`${meaningful[meaningful.length - 1]}-${key}`)
  tails.push(key)
  for (const t of tails) {
    const m = matchRole(t)
    if (m) return m
  }
  return null
}
