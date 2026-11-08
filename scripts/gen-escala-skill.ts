/**
 * `npm run gen:escala-skill`
 *
 * Writes `.claude/skills/escala-architecture/` (SKILL.md + references) from the
 * role tables in `src/lib` (colour, dimensions, type). Run it after changing a
 * role or the skill text in `src/lib/escalaArchitectureSkill.ts`.
 * `__tests__/escalaArchitectureSkill.test.ts` fails while the committed files
 * are stale.
 *
 * `npm run gen:escala-skill -- --portable <dir>` writes the installable copy
 * instead (no repo-only section) into `<dir>/escala-architecture/` — the folder
 * to zip for Claude Desktop / claude.ai, or to drop into `~/.claude/skills/`.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildEscalaSkillReferences, buildPortableEscalaSkill } from '../src/lib/escalaArchitectureSkill'

const flag = process.argv.indexOf('--portable')
const portableDir = flag >= 0 ? process.argv[flag + 1] : undefined
if (flag >= 0 && !portableDir) throw new Error('--portable needs a folder')

const root = portableDir
  ? resolve(portableDir, 'escala-architecture')
  : resolve(dirname(fileURLToPath(import.meta.url)), '..', '.claude', 'skills', 'escala-architecture')

for (const [path, body] of Object.entries(portableDir ? buildPortableEscalaSkill() : buildEscalaSkillReferences())) {
  const file = resolve(root, path)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, body)
  console.log(`wrote ${file}`)
}
