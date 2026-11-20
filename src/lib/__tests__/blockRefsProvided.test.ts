import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { COMPONENT_RECIPES, recipeTokenRefs } from '../componentRecipes'
import { BLOCK_ONLY_REFS } from '../recipeVars'

// A scope supplies only the roles the recipes reference (+ BLOCK_ONLY_REFS). A block that reads another role gets an undefined
// custom property, and the declaration silently drops (ContactSection's section padding was 0 for that reason).
describe('blocks read only roles a scope supplies', () => {
  const have = new Set([...Object.values(COMPONENT_RECIPES).flatMap(recipeTokenRefs), ...BLOCK_ONLY_REFS])
  // Blocks and screens: both render inside a preview scope.
  const files = ['src/components/escala-ui/blocks/', 'src/components/escala-ui/screens/']
    .flatMap((dir) => readdirSync(dir).filter((x) => x.endsWith('.tsx')).map((f) => dir + f))
  it('every v(\'role\') of every block is supplied', () => {
    const missing = new Set<string>()
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\bv\('([a-z]+\.[a-z0-9_.+-]+)'\)/g)) {
        if (!m[1].startsWith('color.') && !have.has(m[1])) missing.add(`${m[1]} (${f})`)
      }
    }
    expect([...missing]).toEqual([])
  })
  it('every type(\'role\') of every block is supplied', () => {
    const missing = new Set<string>()
    for (const f of files) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\b(?:type|blockType)\('([a-z0-9-]+)'\)/g)) {
        if (!have.has(`type.${m[1]}`)) missing.add(`type.${m[1]} (${f})`)
      }
    }
    expect([...missing]).toEqual([])
  })
})
