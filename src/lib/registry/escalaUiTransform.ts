/**
 * `components/escala-ui/*.tsx` → the source a shadcn registry item ships.
 *
 * Pure (strings in, strings out) so the generator script and the sync test run
 * the exact same transform. The output is what `npx shadcn add` writes into the
 * user's `components/ui/`, so every import must resolve in THEIR project:
 *  - `../../lib/utils`            → `@/lib/utils` (shadcn's own `cn`)
 *  - `./<file>`                   → `@/components/ui/<file>` + a registry dependency
 *  - `../ui/icons` `{ A, B }`     → the named functions inlined (brand glyphs only)
 *  - `../../lib/previewTokens` `iconOf(N)` → the snapped px, a literal
 *  - bare packages                → npm `dependencies` (React excluded)
 * Any other relative import THROWS: a new one is a decision, not a silent leak
 * of app internals into somebody's repo.
 */

export interface RegistrySource {
  /** File basename without `.tsx` / `.ts` — also the registry item name. */
  name: string
  /** `tsx` or `ts`. */
  ext: 'tsx' | 'ts'
  source: string
  /** npm packages the file imports. */
  dependencies: string[]
  /** Other escala-ui files it imports (registry dependencies). */
  internal: string[]
  /** Recipe keys the file paints with (`data-escala="…"`, `recipe = '…'`). */
  recipes: string[]
  /** Custom properties the file reads itself (`var(--spacing-2)` in a className). */
  vars: string[]
}

export interface TransformHelpers {
  /** Source of `components/ui/icons.tsx`, to inline named glyphs from. */
  iconsSource: string
  /** The app's `iconOf` (anatomy snap), evaluated at generation time. */
  iconOf: (px: number) => number
}

const IMPORT_RE = /^import\s+([\s\S]*?)\s+from\s+'([^']+)'\s*;?\s*$/gm

/** `export function Name(...) { ... }` up to the closing brace at column 0. */
function extractFunction(source: string, name: string): string {
  const start = source.indexOf(`export function ${name}(`)
  if (start < 0) throw new Error(`escala-ui transform: ${name} not found in ui/icons.tsx`)
  const end = source.indexOf('\n}\n', start)
  if (end < 0) throw new Error(`escala-ui transform: ${name} has no closing brace`)
  return source.slice(start, end + 2)
}

function namedImports(clause: string): string[] {
  const m = /\{([^}]*)\}/.exec(clause)
  if (!m) return []
  return m[1].split(',').map((s) => s.trim().replace(/^type\s+/, '')).filter(Boolean)
}

export function transformEscalaUi(file: string, input: string, helpers: TransformHelpers): RegistrySource {
  const dot = file.lastIndexOf('.')
  const name = file.slice(0, dot)
  const ext = file.slice(dot + 1) as 'tsx' | 'ts'
  const dependencies = new Set<string>()
  const internal = new Set<string>()
  const inlined: string[] = []

  let source = input.replace(IMPORT_RE, (line, clause: string, spec: string) => {
    if (spec === '../../lib/utils') return line.replace(spec, '@/lib/utils')
    if (spec.startsWith('./')) {
      const dep = spec.slice(2)
      internal.add(dep)
      return line.replace(spec, `@/components/ui/${dep}`)
    }
    if (spec === '../ui/icons') {
      for (const fn of namedImports(clause)) inlined.push(extractFunction(helpers.iconsSource, fn))
      return ''
    }
    if (spec === '../../lib/previewTokens') {
      const names = namedImports(clause)
      if (names.some((n) => n !== 'iconOf')) throw new Error(`escala-ui transform: ${file} imports ${names.join(', ')} from previewTokens`)
      return ''
    }
    if (spec.startsWith('.')) throw new Error(`escala-ui transform: ${file} imports app internals (${spec})`)
    const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]
    if (pkg !== 'react' && pkg !== 'react-dom') dependencies.add(pkg)
    return line
  })

  source = source.replace(/\biconOf\((\d+(?:\.\d+)?)\)/g, (_m, n: string) => String(helpers.iconOf(Number(n))))
  if (inlined.length) {
    // After the last import, so the glyphs sit with the file's own code.
    const lines = source.split('\n')
    let last = -1
    lines.forEach((l, i) => { if (/^import\s/.test(l)) last = i })
    lines.splice(last + 1, 0, '', ...inlined.map((f) => f.replace(/^export function/, 'function')))
    source = lines.join('\n')
  }
  source = source.replace(/\n{3,}/g, '\n\n')

  const recipes = new Set<string>()
  for (const m of input.matchAll(/data-escala="([A-Za-z]+)"/g)) recipes.add(m[1])
  for (const m of input.matchAll(/recipe\s*=\s*'([A-Za-z]+)'/g)) recipes.add(m[1])
  for (const m of input.matchAll(/recipe="([A-Za-z]+)"/g)) recipes.add(m[1])
  const vars = new Set<string>()
  for (const m of input.matchAll(/var\((--[a-z0-9_-]+)/g)) vars.add(m[1])

  return {
    name,
    ext,
    source,
    dependencies: [...dependencies].sort(),
    internal: [...internal].sort(),
    recipes: [...recipes].sort(),
    vars: [...vars].sort(),
  }
}
