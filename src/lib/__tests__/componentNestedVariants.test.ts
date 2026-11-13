import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The plugin ships a CUT of each Button set, not the full Variant × Appearance
 * × Size × State matrix (288 cells): the State ladder on default · solid, every
 * pair at rest, every size of default · solid. A composite (Dialog, Sheet,
 * Item…) that nests a combination outside that cut silently gets the set's
 * DEFAULT variant — a filled 40px primary where a Dialog wanted its ghost ×.
 *
 * `BTN_NESTED` in the plugin's code.ts lists what composites nest, and the
 * plugin builds the cut ∪ that list. This test reads every `systemButton(…)` /
 * `systemIconButton(…)` call in code.ts and fails when its combination is not
 * listed. Skipped where the sibling repo is not checked out (Vercel builds this
 * repo alone).
 */
const pluginCode = join(dirname(fileURLToPath(import.meta.url)), '../../../../escala-figma-plugin/src/code.ts')

/** Calls whose variant/size is a variable, checked by hand: the Drawer footer
 *  loops over ['default', 'outline'] at the default size, both listed. */
const RESOLVED_BY_HAND = ['systemButton(l, v)']

function argsOf(code: string, open: number): string[] {
  const args: string[] = []
  let depth = 0
  let cur = ''
  let quote: string | null = null
  for (let i = open; i < code.length; i++) {
    const ch = code[i]
    if (quote) {
      cur += ch
      if (ch === quote && code[i - 1] !== '\\') quote = null
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; cur += ch; continue }
    if (ch === '(') { depth++; if (depth === 1) continue }
    if (ch === ')') { depth--; if (depth === 0) { if (cur.trim()) args.push(cur.trim()); return args } }
    if (ch === ',' && depth === 1) { args.push(cur.trim()); cur = ''; continue }
    cur += ch
  }
  return args
}

const literals = (arg: string | undefined) => [...(arg ?? '').matchAll(/'([^']*)'/g)].map((m) => m[1])

describe.skipIf(!existsSync(pluginCode))('plugin: every nested Button combination is built', () => {
  const code = existsSync(pluginCode) ? readFileSync(pluginCode, 'utf8') : ''

  const table = (() => {
    const block = /const BTN_NESTED[^=]*=\s*\[([\s\S]*?)\n\s*\]/.exec(code)?.[1] ?? ''
    return new Set([...block.matchAll(/\[([^\]]+)\]/g)].map((m) => {
      const [v, s, state] = literals(m[1])
      return `${v}|${s}|${state ?? 'Default'}`
    }))
  })()

  it('finds the BTN_NESTED table', () => {
    expect(table.size).toBeGreaterThan(0)
  })

  it('lists every combination a composite nests', () => {
    const missing: string[] = []
    const unresolved: string[] = []
    for (const m of code.matchAll(/\bsystem(Icon)?Button\(/g)) {
      const before = code.slice(Math.max(0, m.index! - 9), m.index!)
      if (before.endsWith('function ')) continue
      const icon = Boolean(m[1])
      const args = argsOf(code, m.index! + m[0].length - 1)
      // systemButton(label, variant, size, leading) · systemIconButton(glyph, name, variant, size, state)
      const [vArg, sArg, stArg] = icon ? [args[2], args[3], args[4]] : [args[1], args[2], undefined]
      const pick = (arg: string | undefined, fallback: string): string[] | null => {
        if (arg === undefined) return [fallback]
        const found = literals(arg)
        return found.length ? found : null
      }
      const variants = pick(vArg, icon ? 'ghost' : 'default')
      const sizes = pick(sArg, icon ? 'icon-sm' : 'default')
      const states = pick(stArg, 'Default')
      if (!variants || !sizes || !states) {
        unresolved.push(`system${icon ? 'Icon' : ''}Button(${args.join(', ')})`)
        continue
      }
      for (const v of variants) for (const s of sizes) for (const st of states) {
        const key = `${v}|${s}|${st}`
        if (!table.has(key)) missing.push(`system${icon ? 'Icon' : ''}Button → ${key}`)
      }
    }
    expect(missing, 'add these to BTN_NESTED in escala-figma-plugin/src/code.ts').toEqual([])
    expect(unresolved, 'a call with a variable variant/size: make it literal, or check it by hand and list it here').toEqual(RESOLVED_BY_HAND)
  })
})

/**
 * The same rule for every other set: each set ships the BASE CUT (State at
 * rest, Size at default, the other axes crossed up to a cap), plus what a
 * composite nests — `NESTED_DEMANDS` in code.ts. Every literal
 * `instanceOfVariant('Set', { … })` call must be listed there, or the
 * composite nests the set's default variant instead of the one it asked for.
 */
/** Sets nested with props that are not literals, each checked by hand:
 *  Icon is built whole (`CUT_EXEMPT`); Toggle Group nests Toggle at its own
 *  Variant, default size, at rest (listed as { Size, State }); Separator is two
 *  orientations, both built; Bubble (Message) and FAB Button (FAB Group) list
 *  their combinations; Button / IconButton go through systemButton /
 *  systemIconButton (the test above) or a literal call. */
const NESTED_BY_HAND = new Set(['Icon', 'Toggle', 'Separator', 'Bubble', 'FAB Button', 'Button', 'IconButton'])

describe.skipIf(!existsSync(pluginCode))('plugin: every nested variant survives the base cut', () => {
  const code = existsSync(pluginCode) ? readFileSync(pluginCode, 'utf8') : ''

  const demands = (() => {
    const block = /const NESTED_DEMANDS[^=]*=\s*\{([\s\S]*?)\n {2}\}/.exec(code)?.[1] ?? ''
    const out = new Map<string, Record<string, string>[]>()
    for (const m of block.matchAll(/'([^']+)':\s*\[([\s\S]*?)\],?\n/g)) {
      out.set(m[1], [...m[2].matchAll(/\{([^}]*)\}/g)].map((o) => parseProps(o[1]) ?? {}))
    }
    return out
  })()

  it('finds the NESTED_DEMANDS table', () => {
    expect(demands.size).toBeGreaterThan(0)
  })

  it('lists every literal nested variant', () => {
    const missing: string[] = []
    const unresolved = new Set<string>()
    for (const m of code.matchAll(/\binstanceOfVariant\('([^']+)',\s*/g)) {
      const set = m[1]
      const rest = code.slice(m.index! + m[0].length)
      const obj = /^\{([^}]*)\}/.exec(rest)
      const props = obj ? parseProps(obj[1]) : null
      if (!props) { unresolved.add(set); continue }
      if (Object.keys(props).length === 0) continue // a one-variant set
      const listed = (demands.get(set) ?? []).some((d) => Object.entries(d).every(([k, v]) => props[k] === v))
      if (!listed) missing.push(`${set} ${JSON.stringify(props)}`)
    }
    expect(missing, 'add these to NESTED_DEMANDS in escala-figma-plugin/src/code.ts').toEqual([])
    expect([...unresolved].filter((s) => !NESTED_BY_HAND.has(s)), 'a nested call with variable props: check it by hand and list its set in NESTED_BY_HAND').toEqual([])
  })
})

/** `Key: 'value', …` → object; null when any value is not a string literal. */
function parseProps(body: string): Record<string, string> | null {
  const out: Record<string, string> = {}
  for (const part of body.split(',').map((s) => s.trim()).filter(Boolean)) {
    const kv = /^'?([A-Za-z ]+)'?:\s*'([^']*)'$/.exec(part)
    if (!kv) return null
    out[kv[1]] = kv[2]
  }
  return out
}
