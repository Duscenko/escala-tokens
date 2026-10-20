import { COMPONENTS, ESSENTIAL_COMPONENT_KEYS } from '../componentCatalogue'
import { COMPONENT_RECIPES, cssVarOf, refFn, refFnCss, resolveRecipe, type SlotProps } from '../componentRecipes'
import type { AgentBundleFile, TokenJSON } from './types'

function keysToScaffold(json: TokenJSON): string[] {
  const atoms = (json.atoms ?? []).filter(Boolean)
  if (atoms.length) return atoms
  return [...ESSENTIAL_COMPONENT_KEYS]
}

function fileName(key: string): string {
  return `${key.replace(/[^A-Za-z0-9]+/g, '')}.tsx`
}

/** A comment body that cannot close the comment it sits in. */
function commentSafe(text: string): string {
  return text.replace(/\*\//g, '* /').replace(/\s+/g, ' ').trim()
}

// ── Props ──────────────────────────────────────────────────────────────────
// The catalogue's prop table is prose for people (`value / onChange`,
// `InputOTPGroup · InputOTPSlot`, `string / (value) => void`), not TypeScript.
// A scaffold that does not parse is worse than none, so a prop is typed only
// when its name is a property key and its type is built from names TypeScript
// knows; anything else is `unknown` with the catalogue's words in a comment.

const KNOWN_TYPES = new Set(['string', 'number', 'boolean', 'ReactNode', 'void', 'null', 'undefined', 'unknown', 'Date'])

function propKey(name: string): string | null {
  if (/^[A-Za-z_$][\w$]*$/.test(name)) return name
  if (/^[A-Za-z][\w-]*$/.test(name)) return JSON.stringify(name)
  return null
}

function safeType(type: string): string | null {
  const parts = type.split('|').map((p) => p.trim())
  const ok = parts.every((p) =>
    /^"[^"]*"$/.test(p)
    || /^'[^']*'$/.test(p)
    || /^-?\d+(\.\d+)?$/.test(p)
    || (KNOWN_TYPES.has(p.replace(/\[\]$/, '')))
    || /^\(\) => (void|boolean|string|number)$/.test(p))
  return ok ? parts.join(' | ') : null
}

function propLines(key: string): string[] {
  const def = COMPONENTS.find((c) => c.key === key)
  const lines: string[] = []
  for (const p of def?.props ?? []) {
    const k = propKey(p.name)
    if (!k) continue
    const t = safeType(p.type)
    lines.push(t ? `  ${k}?: ${t}` : `  ${k}?: unknown // ${commentSafe(p.type)}`)
  }
  if (!lines.some((l) => /^ {2}children\?/.test(l))) lines.push('  children?: ReactNode')
  return lines
}

// ── Styles ─────────────────────────────────────────────────────────────────
// The default render of the component's recipe, root part — the same table
// the web stylesheet and the Figma component read. A component without a
// recipe gets the neutral page surface and ink, nothing guessed.

function styleOf(props: SlotProps): [string, string][] {
  const v = (ref?: string) => {
    if (!ref || ref === 'none') return null
    const f = refFn(ref)
    if (f) return [refFnCss(f, (r) => `var(${cssVarOf(r)})`)]
    return ref.split('+').map((r) => `var(${cssVarOf(r)})`)
  }
  const one = (ref?: string) => {
    const parts = v(ref)
    if (!parts) return null
    return parts.length > 1 ? `calc(${parts.join(' + ')})` : parts[0]
  }
  const out: [string, string][] = []
  const push = (prop: string, val: string | null) => { if (val) out.push([prop, val]) }
  push('background', one(props.fill))
  push('color', one(props.text))
  if (props.stroke && props.stroke !== 'none') {
    push('borderColor', one(props.stroke))
    push('borderStyle', 'solid')
    push('borderWidth', one(props.strokeWidth) ?? 'var(--stroke-control)')
  }
  push('borderRadius', one(props.radius))
  push('height', one(props.height))
  push('minHeight', one(props.minHeight))
  push('width', one(props.width))
  push('paddingInline', one(props.paddingX))
  push('paddingBlock', one(props.paddingY))
  push('paddingBottom', one(props.paddingBottom))
  push('gap', one(props.gap))
  push('boxShadow', one(props.shadow))
  if (props.font && props.font !== 'none') {
    for (const [prop, facet] of [['fontFamily', 'font-family'], ['fontSize', 'font-size'], ['fontWeight', 'font-weight'], ['lineHeight', 'line-height']] as const) {
      push(prop, `var(${cssVarOf(props.font, facet)})`)
    }
  }
  return out
}

function rootStyle(key: string): [string, string][] {
  const recipe = COMPONENT_RECIPES[key]
  if (!recipe) {
    return [['background', 'var(--color-surface-page)'], ['color', 'var(--color-content-primary)'], ['fontFamily', 'var(--font-family-body)']]
  }
  const style = styleOf(resolveRecipe(recipe)[recipe.slots[0]] ?? {})
  return style.some(([p]) => p === 'fontFamily') ? style : [...style, ['fontFamily', 'var(--font-family-body)']]
}

function templateFor(key: string): string {
  const def = COMPONENTS.find((c) => c.key === key)
  const label = def?.label ?? key
  const a11y = def?.accessibility ?? 'Use a native control and an accessible name.'
  const recipe = COMPONENT_RECIPES[key]
  const name = key.replace(/[^A-Za-z0-9]+/g, '')
  const style = rootStyle(key).map(([p, v]) => `        ${p}: '${v}',`).join('\n')

  return `/* ${commentSafe(label)} — generated from the ${key} catalogue entry. Bindings are semantic. Do not replace with hex/px. */
${def ? `/* ${commentSafe(def.usage)} */\n` : ''}/* a11y: ${commentSafe(a11y)} */
${recipe ? `/* Styles: the default render of the ${key} recipe (root part). Every variant and state, part by part, is in componentRecipes (tokens.json). */\n` : ''}
import type { ReactNode } from 'react'

export type ${name}Props = {
${propLines(key).join('\n')}
}

export function ${name}(props: ${name}Props) {
  return (
    <div
      data-component="${key}"
      style={{
${style}
      }}
    >
      {/* Implement using skills/code/SKILL.md. Keep the var() bindings. */}
      {props.children ?? '${label.replace(/'/g, "\\'")}'}
    </div>
  )
}
`
}

export function buildTemplateFiles(json: TokenJSON): AgentBundleFile[] {
  return keysToScaffold(json).map((key) => ({
    path: `templates/component/${fileName(key)}`,
    text: templateFor(key),
  }))
}
