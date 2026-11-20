/**
 * Writes spec/contracts/<Key>.json (one per catalogue component) and
 * spec/contracts/index.json — the machine-readable component contracts built by
 * src/lib/componentContracts.ts. Never edit the output by hand.
 *
 *   npm run gen:contracts
 *
 * componentContracts.test.ts fails when the committed files drift from what this
 * builds, so run it after changing the catalogue, a recipe, a story, a component
 * file or spec/figma-components.json.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildContracts, contractReadme, contractSchema, serializeContract, type ContractSources } from '../src/lib/componentContracts'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CONTRACTS_DIR = join(ROOT, 'spec/contracts')

function readDir(dir: string, test: (f: string) => boolean): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of readdirSync(dir).filter(test).sort()) out[f] = readFileSync(join(dir, f), 'utf8')
  return out
}

export function readContractSources(root = ROOT): ContractSources {
  const spec = JSON.parse(readFileSync(join(root, 'spec/figma-components.json'), 'utf8'))
  return {
    figmaPages: spec.pages,
    uiFiles: readDir(join(root, 'src/components/escala-ui'), (f) => /\.tsx?$/.test(f)),
    storyFiles: readDir(join(root, 'apps/storybook/stories'), (f) => f.endsWith('.stories.tsx')),
    designPlans: readdirSync(join(root, 'design-plans')).sort(),
    blockContracts: Object.fromEntries(
      Object.entries(readDir(join(root, 'src/components/escala-ui/blocks'), (f) => f.endsWith('.contract.json')))
        .map(([f, body]) => [f, JSON.parse(body)]),
    ),
    registry: JSON.parse(readFileSync(join(root, 'governance/registry.json'), 'utf8')),
  }
}

/** File name → content, exactly as written to spec/contracts/. */
export function contractFiles(root = ROOT): Record<string, string> {
  const { contracts, index } = buildContracts(readContractSources(root))
  const files: Record<string, string> = {
    'index.json': serializeContract(index),
    'schema.json': serializeContract(contractSchema()),
    'README.md': contractReadme(index),
  }
  for (const c of contracts) files[`${c.key}.json`] = serializeContract(c)
  return files
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const files = contractFiles()
  rmSync(CONTRACTS_DIR, { recursive: true, force: true })
  mkdirSync(CONTRACTS_DIR, { recursive: true })
  for (const [name, body] of Object.entries(files)) writeFileSync(join(CONTRACTS_DIR, name), body)
  console.log(`wrote ${Object.keys(files).length - 3} contracts + index.json, schema.json, README.md to spec/contracts/`)
}
