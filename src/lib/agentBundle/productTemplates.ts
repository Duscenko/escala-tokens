import { COMPONENTS, ESSENTIAL_COMPONENT_KEYS } from '../componentCatalogue'
import type { AgentBundleFile, TokenJSON } from './types'

function keysToScaffold(json: TokenJSON): string[] {
  const atoms = (json.atoms ?? []).filter(Boolean)
  if (atoms.length) return atoms
  return [...ESSENTIAL_COMPONENT_KEYS]
}

function fileName(key: string): string {
  return `${key.replace(/[^A-Za-z0-9]+/g, '')}.tsx`
}

function templateFor(key: string): string {
  const def = COMPONENTS.find((c) => c.key === key)
  const label = def?.label ?? key
  const props = (def?.props ?? []).slice(0, 6)
    .map((p) => `  ${p.name}: ${p.type}`)
    .join('\n')
  const a11y = def?.accessibility ?? 'Use a native control and an accessible name.'
  const isAction = (def?.category ?? '').startsWith('Button') || key === 'Button'
  const fill = isAction ? 'var(--color-action-primary-default)' : 'var(--color-surface-input, var(--color-surface-0, var(--color-surface-page)))'
  const ink = isAction ? 'var(--color-content-on-action)' : 'var(--color-content-primary)'
  const radius = isAction ? 'var(--radius-action, var(--radius-md))' : 'var(--radius-container, var(--radius-lg))'

  return `/* ${label} — generated from the ${key} catalogue entry. Bindings are semantic. Do not replace with hex/px. */
${def ? `/* ${def.usage} */\n` : ''}/* a11y: ${a11y} */

export type ${key}Props = {
${props || '  children?: React.ReactNode'}
}

export function ${key}(props: ${key}Props) {
  return (
    <div
      data-component="${key}"
      style={{
        background: '${fill}',
        color: '${ink}',
        borderRadius: '${radius}',
        fontFamily: 'var(--font-family, inherit)',
      }}
    >
      {/* Implement using skills/code/SKILL.md. Keep the var() bindings. */}
      {'children' in props ? props.children : '${label}'}
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
