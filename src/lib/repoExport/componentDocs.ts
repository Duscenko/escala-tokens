// The README's Components section, shared by the web push (githubPushFiles)
// and the plugin's (buildRepoFiles): the WHOLE catalogue, each row linking its
// Figma spec, React guide and contract, with the system's selection marked.
// It replaced a bare list of the selected keys, which read as if the other
// components did not exist.

import { COMPONENTS, selectedComponentKeys } from '../componentCatalogue'
import { componentBuildPath, componentReactPath } from '../agentBundle/productDesignSkills'
import { CONTRACTS_DIR, contractFileName } from './componentContracts'

export function componentDocsSection(skillDir: string, atoms: string[] | undefined): string {
  const selected = new Set(selectedComponentKeys(atoms))
  const md = (path: string) => path.replace(/ /g, '%20')
  const rows = COMPONENTS.map((c) => [
    `| ${c.label.replace(/\|/g, '\\|')}`,
    c.category,
    selected.has(c.key) ? 'Yes' : '—',
    skillDir ? `[Figma](${md(skillDir + componentBuildPath(c.key))})` : '—',
    skillDir ? `[React](${md(skillDir + componentReactPath(c.key))})` : '—',
    `[Contract](${CONTRACTS_DIR}${contractFileName(c.key)}) |`,
  ].join(' | '))
  return [
    '## Components',
    '',
    `The whole catalogue (${COMPONENTS.length} components), each documented for Figma and React with a JSON contract. **In this system** = selected in Escala, so the Figma library builds it; any other one can be added in Escala and is already specified here.`,
    '',
    '| Component | Category | In this system | Figma spec | React | Contract |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
    `Styles for every component: \`${skillDir}skills/component-build/react/recipes.css\` (after \`variables.css\`). Index of contracts: \`contracts/components.json\`.`,
    '',
  ].join('\n')
}

/** Replace a README's `## Components` section (up to the next `---`), or append it. */
export function withComponentDocs(readme: string, skillDir: string, atoms: string[] | undefined): string {
  const section = componentDocsSection(skillDir, atoms)
  const start = readme.indexOf('\n## Components\n')
  if (start < 0) return `${readme.trimEnd()}\n\n${section}`
  const end = readme.indexOf('\n---', start + 1)
  return `${readme.slice(0, start + 1)}${section}${end < 0 ? '' : readme.slice(end)}`
}
