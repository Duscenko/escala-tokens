import { mdCell, slugify } from '../utils'

export const GROUP_ORDER = ['content', 'action', 'surface', 'status', 'border'] as const
export type SemanticGroup = (typeof GROUP_ORDER)[number]

export const GROUP_LABEL: Record<SemanticGroup, string> = {
  content: 'Content',
  action: 'Action',
  surface: 'Surface',
  status: 'Status',
  border: 'Border',
}

const PRIMITIVE_GROUPS: Record<string, string> = {
  accent: 'Accent', brand: 'Accent',
  'accent-dark': 'Accent Dark', 'brand-dark': 'Accent Dark',
  neutral: 'Neutral', gray: 'Neutral',
  'neutral-dark': 'Neutral Dark', 'gray-dark': 'Neutral Dark',
  error: 'State/Error', 'error-dark': 'State/Error Dark',
  success: 'State/Success', 'success-dark': 'State/Success Dark',
  warning: 'State/Warning', 'warning-dark': 'State/Warning Dark',
  info: 'State/Info', 'info-dark': 'State/Info Dark',
}

export function skillName(project: string): string {
  const slug = slugify(project) || 'design-system'
  const base = slug.endsWith('-design-system') ? slug : `${slug}-design-system`
  return base.replace(/^-+/, '').slice(0, 64).replace(/-+$/, '') || 'design-system'
}

export function yamlQuote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

export function table(headers: string[], rows: string[][]): string {
  return [
    `| ${headers.map(mdCell).join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${r.map(mdCell).join(' | ')} |`),
  ].join('\n')
}

/** Categorical id → Figma variable (`content.link.default` → `Content/link/default`). */
export function figmaSemanticName(id: string): string {
  const [group, ...rest] = id.split('.')
  const label = GROUP_LABEL[group as SemanticGroup]
    ?? (group ? group.charAt(0).toUpperCase() + group.slice(1) : id)
  return rest.length ? `${label}/${rest.join('/')}` : label
}

export function figmaPrimitiveName(key: string): string {
  const dash = key.lastIndexOf('-')
  if (dash === -1) return key
  const family = key.slice(0, dash)
  const tone = key.slice(dash + 1)
  const group = PRIMITIVE_GROUPS[family]
    ?? family.split('/').map((seg) => PRIMITIVE_GROUPS[seg] ?? (seg.charAt(0).toUpperCase() + seg.slice(1))).join('/')
  const padded = /^\d$/.test(tone) ? `0${tone}` : tone
  return `${group}/${padded}`
}

export function figmaSpacingName(key: string): string {
  return /^\d/.test(key) ? `step/${key}` : key
}

export function webCodeSyntax(id: string): string {
  return `var(--color-${id.replace(/\./g, '-')})`
}

export function scopesFor(id: string): string {
  if (id.startsWith('content.')) return '`TEXT_FILL`'
  if (id.startsWith('action.') || id.startsWith('surface.')) return '`FRAME_FILL`, `SHAPE_FILL`'
  if (id.endsWith('.content') || id.endsWith('.on-solid')) return '`TEXT_FILL`'
  if (id.startsWith('status.')) return '`FRAME_FILL`, `SHAPE_FILL`'
  if (id.startsWith('border.')) return '`STROKE_COLOR`'
  return '`FRAME_FILL`'
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
