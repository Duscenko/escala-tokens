/**
 * `npx tsx scripts/gen-component-color-fields.ts`
 *
 * Regenerates `src/lib/componentColorFields.generated.ts` — for every key in
 * `docs/specimens.tsx`'s `SPECIMENS` registry, which `PreviewTokens` COLOR
 * fields (`lib/previewColorFields.ts`) that component's specimen renderer
 * actually reads. This is what lets a component's copied "Agent context"
 * scope its Color section down to the roles that component uses, instead of
 * dumping the whole ~90-role palette at every page (see CLAUDE.md's "Use it"
 * / agent-context notes — this was the flagged, deliberately-deferred gap).
 *
 * DERIVED, never hand-listed: 59 components would mean 59 hand-maintained
 * lists that silently drift the first time a specimen changes what it reads.
 * Instead this statically walks `specimens.tsx`'s own AST (TypeScript
 * compiler API — no runtime execution, no React, no store):
 *
 *   1. Find every top-level `function Name(...) { ... }` in the file.
 *   2. For each, collect the PreviewTokens fields it reads directly
 *      (`t.someField`, where `t` is the file's one consistent parameter
 *      name for the PreviewTokens argument — verified by hand once; the
 *      script fails loudly if it can no longer find that param anywhere,
 *      instead of silently under-counting).
 *   3. Collect which OTHER local functions it calls (plain calls and JSX
 *      tags alike — `<StatusIcon .../>` is a call as far as this cares).
 *   4. Resolve each `SPECIMENS` entry's field set as the transitive closure
 *      over that call graph — a specimen that delegates its icon row to a
 *      shared `PreviewIcon` picks up whatever `PreviewIcon` itself reads.
 *
 * Regenerate whenever `specimens.tsx` changes which tokens a specimen reads.
 * `__tests__/componentColorFields.test.ts` asserts the committed file is
 * current — never hand-edit it.
 */

import { writeFileSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as ts from 'typescript'
import { PREVIEW_COLOR_FIELDS, type PreviewColorField } from '../src/lib/previewColorFields'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SPECIMENS_PATH = resolve(__dirname, '../src/components/configurator/docs/specimens.tsx')
const OUT_PATH = resolve(__dirname, '../src/lib/componentColorFields.generated.ts')

const COLOR_FIELD_SET = new Set<string>(PREVIEW_COLOR_FIELDS)

// Every specimen and shared helper in the file destructures its PreviewTokens
// argument as `t` — `{ t, v, icons }: SpecimenProps`, `{ t }: { t: PreviewTokens }`,
// `RadioDot({ t, checked, … })` — hand-verified against every top-level
// function in the file at authoring time. Checked below, not just assumed:
// if a function ever binds PreviewTokens under a different name, its color
// reads would silently go uncounted, so the presence check below fails loudly
// instead of shipping an incomplete map.
const TOKEN_PARAM = 't'

function main() {
  const text = readFileSync(SPECIMENS_PATH, 'utf8')
  const source = ts.createSourceFile(SPECIMENS_PATH, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  // ── 1. Every top-level function. ───────────────────────────────────────────
  const functions = new Map<string, ts.FunctionDeclaration>()
  let sawTokenParam = false
  for (const stmt of source.statements) {
    if (!ts.isFunctionDeclaration(stmt) || !stmt.name || !stmt.body) continue
    functions.set(stmt.name.text, stmt)
    for (const param of stmt.parameters) {
      if (ts.isObjectBindingPattern(param.name)) {
        for (const el of param.name.elements) {
          if (ts.isIdentifier(el.name) && el.name.text === TOKEN_PARAM) sawTokenParam = true
        }
      }
    }
  }
  if (!sawTokenParam) {
    throw new Error(`No function in specimens.tsx binds a "${TOKEN_PARAM}" param — the convention this script relies on is gone. Update TOKEN_PARAM.`)
  }

  // ── 2 & 3. Direct field reads + call-graph edges, per function. ───────────
  interface Info { fields: Set<string>; calls: Set<string> }
  const info = new Map<string, Info>()

  function analyze(fn: ts.FunctionDeclaration): Info {
    const fields = new Set<string>()
    const calls = new Set<string>()
    const visit = (node: ts.Node) => {
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === TOKEN_PARAM &&
        COLOR_FIELD_SET.has(node.name.text)
      ) {
        fields.add(node.name.text)
      }
      if (
        ts.isElementAccessExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === TOKEN_PARAM &&
        ts.isStringLiteralLike(node.argumentExpression) &&
        COLOR_FIELD_SET.has(node.argumentExpression.text)
      ) {
        fields.add(node.argumentExpression.text)
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        calls.add(node.expression.text)
      }
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && ts.isIdentifier(node.tagName)) {
        calls.add(node.tagName.text)
      }
      ts.forEachChild(node, visit)
    }
    visit(fn.body!)
    return { fields, calls }
  }

  for (const [name, fn] of functions) info.set(name, analyze(fn))

  // ── 4. Transitive closure over the call graph, per function. ──────────────
  const closureCache = new Map<string, Set<string>>()
  function closureOf(name: string, seen = new Set<string>()): Set<string> {
    if (closureCache.has(name)) return closureCache.get(name)!
    if (seen.has(name)) return new Set() // cycle guard — none expected, cheap to allow
    seen.add(name)
    const self = info.get(name)
    if (!self) return new Set()
    const out = new Set(self.fields)
    for (const callee of self.calls) {
      if (!functions.has(callee) || callee === name) continue
      for (const f of closureOf(callee, seen)) out.add(f)
    }
    closureCache.set(name, out)
    return out
  }

  // ── SPECIMENS registry: componentKey → specimen function name. ────────────
  const registryEntries: [string, string][] = []
  for (const stmt of source.statements) {
    if (!ts.isVariableStatement(stmt)) continue
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== 'SPECIMENS') continue
      if (!decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue
      for (const prop of decl.initializer.properties) {
        if (!ts.isPropertyAssignment(prop)) continue
        const key = ts.isIdentifier(prop.name) ? prop.name.text : null
        const value = ts.isIdentifier(prop.initializer) ? prop.initializer.text : null
        if (key && value) registryEntries.push([key, value])
      }
    }
  }
  if (!registryEntries.length) throw new Error('Could not find the SPECIMENS registry in specimens.tsx.')

  // ── Assemble the output map, sorted, allow-listed fields only. ────────────
  const order = new Map(PREVIEW_COLOR_FIELDS.map((f, i) => [f, i]))
  const result: Record<string, PreviewColorField[]> = {}
  for (const [key, fnName] of registryEntries.sort(([a], [b]) => a.localeCompare(b))) {
    const fields = [...closureOf(fnName)] as PreviewColorField[]
    if (!fields.length) continue
    fields.sort((a, b) => order.get(a)! - order.get(b)!)
    result[key] = fields
  }

  writeFileSync(OUT_PATH, render(result), 'utf8')
  console.log(`Wrote ${Object.keys(result).length} component(s) to ${OUT_PATH}`)
}

function render(map: Record<string, PreviewColorField[]>): string {
  const lines = Object.entries(map).map(
    ([key, fields]) => `  ${JSON.stringify(key)}: [${fields.map((f) => `'${f}'`).join(', ')}],`,
  )
  return [
    '// GENERATED — `npm run gen:component-color-fields`. Do not hand-edit.',
    '// See scripts/gen-component-color-fields.ts for what this is and why.',
    '',
    "import type { PreviewColorField } from './previewColorFields'",
    '',
    '/** Component catalogue key → the PreviewTokens color fields its own',
    ' *  specimen (docs/specimens.tsx) actually reads, transitively through',
    ' *  any shared helper it calls. A key absent from this map has no scoped',
    ' *  color data yet — its agent context falls back to the full palette. */',
    'export const COMPONENT_COLOR_FIELDS: Record<string, PreviewColorField[]> = {',
    ...lines,
    '}',
    '',
  ].join('\n')
}

main()
