// What "Push to GitHub" writes, built from the SAME brand snapshot every other
// way out of Escala uses (`captureCodeSnapshot` — the Code tab, the CSS / Agent
// doors, the export watchdog). The push used to build tokens.json, variables.css,
// README.md and the Design skills from the raw store, whose root fields are the
// SYSTEM defaults (`primaryColor #2970ff`, Inter, the scaffold Light / Dark),
// not the brand the person made — so a repo for a purple, Roboto brand opened
// on a blue, Inter README and `--color-accent-9: #2970ff`.
//
// Layout: the root files are the LEAD brand (the first of My brands, so the
// repo does not churn with whichever brand happens to be on screen) — exactly
// the files its CSS / Agent doors ship. With 2+ brands every brand also gets
// `brands/<slug>/tokens.json` + `variables.css`, and the root README lists them.
// `.escala/system.json` (the editor) is always the WHOLE snapshot.
//
// Pure: no store, no DOM, no network.

import { captureSnapshot, type DesignSnapshot } from '../store/useDesignStore'
import { captureCodeSnapshot } from './codeScope'
import { buildCSS, buildMarkdown } from './exporters'
import { generateTokenJSON } from './tokenGenerator'
import { myThemeKeys } from './themeLibrary'
import { themeDisplayName } from './themeSources'
import { brandSlug } from './cssCut'
import { repoSkillFiles } from './agentBundle/repoSkills'
import { buildRepoFiles, CONTRACTS_DIR, contractFileName } from './repoExport'
import { COMPONENTS, selectedComponentKeys } from './componentCatalogue'
import { componentBuildPath, componentReactPath } from './agentBundle/productDesignSkills'
import type { TokenJSON } from './agentBundle/types'
import { ESCALA_SYSTEM_PATH, serializeEscalaSystem } from './escalaSystem'
import type { RepoFile } from './github'

export const BRANDS_DIR = 'brands/'

export interface GithubPushInput {
  /** The live store (or any full snapshot). */
  store: DesignSnapshot
  publishSlug: string
  publishClaim?: string
  /** A pre-cut bundle (the Free tier's one theme, one appearance). When set it
   *  replaces the brand files below; the editor snapshot still ships whole. */
  shipped?: { tokens: string; css: string; markdown: string }
}

export interface GithubPushFiles {
  /** tokens.json · variables.css · README body · `.escala/system.json` ·
   *  `brands/…` — README.md is NOT here: the caller decides (shouldWriteReadme). */
  files: RepoFile[]
  readme: string
  /** The Design skills, and the folders they mirror (pruned on push). */
  skills: RepoFile[]
  prune: string[]
  /** The brand the root files describe, or null for a system with no brand. */
  lead: { key: string; name: string } | null
  brands: { key: string; name: string; slug: string }[]
}

type Store = Parameters<typeof buildCSS>[0]

function brandFiles(store: DesignSnapshot, key: string) {
  const snap = captureCodeSnapshot(store, key)
  const json = generateTokenJSON(snap as never)
  return {
    snap,
    json,
    tokens: JSON.stringify(json, null, 2),
    css: buildCSS(snap as Store),
    markdown: buildMarkdown(snap as Store),
  }
}

export function buildGithubPushFiles(input: GithubPushInput): GithubPushFiles {
  const { store } = input
  const labels = (store as { themeLabels?: Record<string, string> }).themeLabels ?? {}
  const keys = myThemeKeys(store.themeOrder, store.themes)
  const taken = new Set<string>()
  const brands = keys.map((key) => {
    const name = themeDisplayName(key, labels)
    return { key, name, slug: brandSlug(name, taken) }
  })
  const lead = brands[0] ?? null

  let tokens: string
  let css: string
  let readme: string
  let skillJson: TokenJSON
  const perBrand: RepoFile[] = []

  if (input.shipped) {
    tokens = input.shipped.tokens
    css = input.shipped.css
    readme = input.shipped.markdown
    skillJson = JSON.parse(tokens) as TokenJSON
  } else if (lead) {
    const leadFiles = brandFiles(store, lead.key)
    tokens = leadFiles.tokens
    css = leadFiles.css
    skillJson = leadFiles.json as TokenJSON
    readme = brandReadme(leadFiles.markdown, lead.name, brands)
    if (brands.length > 1) {
      for (const b of brands) {
        const f = b.key === lead.key ? leadFiles : brandFiles(store, b.key)
        perBrand.push(
          { path: `${BRANDS_DIR}${b.slug}/tokens.json`, content: f.tokens },
          { path: `${BRANDS_DIR}${b.slug}/variables.css`, content: f.css },
        )
      }
    }
  } else {
    // No brand yet: the system as it is (what every export ships then).
    const json = generateTokenJSON(store as never)
    tokens = JSON.stringify(json, null, 2)
    css = buildCSS(store as Store)
    readme = buildMarkdown(store as Store)
    skillJson = json as TokenJSON
  }

  const files: RepoFile[] = [
    { path: 'tokens.json', content: tokens },
    { path: 'variables.css', content: css },
    ...perBrand,
    {
      path: ESCALA_SYSTEM_PATH,
      content: serializeEscalaSystem({
        snapshot: captureSnapshot(store),
        publishSlug: input.publishSlug,
        publishClaim: input.publishClaim,
      }),
    },
  ]
  const skills = repoSkillFiles(skillJson, {
    projectFallback: store.projectName,
    iconKey: store.iconAiSource,
  })
  // Component contracts (`contracts/`) — the same files the Figma plugin's
  // push writes (repoExport), one per catalogue component, from the lead brand.
  const repo = buildRepoFiles(skillJson, { readme: false, source: 'web', projectFallback: store.projectName })
  files.push(...repo.files.filter((f) => f.path.startsWith('contracts/')))
  return {
    files,
    readme: withComponentDocs(readme, skills.prefixes[0] ?? '', skillJson.atoms),
    skills: skills.files,
    // `brands/` mirrors My brands: a brand deleted or renamed leaves no folder.
    prune: [...skills.prefixes, BRANDS_DIR, CONTRACTS_DIR],
    lead: lead ? { key: lead.key, name: lead.name } : null,
    brands,
  }
}

/** The lead brand's README, saying which brand it describes — and, with more
 *  than one, where the others are. */
function brandReadme(markdown: string, leadName: string, brands: { name: string; slug: string }[]): string {
  const lines = markdown.split('\n')
  const at = lines.findIndex((l) => l.startsWith('# '))
  const note = brands.length > 1
    ? [
      '',
      `> Root files describe the **${leadName}** brand. Every brand has its own files:`,
      ...brands.map((b) => `> - **${b.name}** — \`${BRANDS_DIR}${b.slug}/tokens.json\` · \`${BRANDS_DIR}${b.slug}/variables.css\``),
    ]
    : ['', `> Brand: **${leadName}**`]
  if (at < 0) return [...note.slice(1), '', markdown].join('\n')
  lines.splice(at + 1, 0, ...note)
  return lines.join('\n')
}

/** The README's Components section: the WHOLE catalogue, each row linking its
 *  Figma spec, React guide and contract, with the system's selection marked.
 *  It replaced a bare list of the selected keys, which read as if the other
 *  components did not exist. */
function withComponentDocs(readme: string, skillDir: string, atoms: string[] | undefined): string {
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
  const section = [
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
  const start = readme.indexOf('\n## Components\n')
  if (start < 0) return `${readme.trimEnd()}\n\n${section}`
  const end = readme.indexOf('\n---', start + 1)
  return `${readme.slice(0, start + 1)}${section}${end < 0 ? '' : readme.slice(end)}`
}
