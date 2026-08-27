// Get started articles — destinations, not file formats.
// Create UI's docs shape (what you get → where it lands) without their CLI.
// Install (Cursor / Claude Code / VS Code / Figma Make, MCP steps or one pasted prompt)
// is `AgentInstallPanel` — the same component the Export wizard shows on step 3, so the
// two cannot drift.

import { type ReactNode } from 'react'
import { useDesignStore } from '../../../store/useDesignStore'
import { withAgentEnvelope } from '../../../lib/aiContext'
import {
  cliMcpInitCommand,
  cliSkillCommand,
  mcpCursorConfig,
  skillFolderName,
  skillInstallPath,
} from '../../../lib/agentInstall'
import { publishOrigin, syncProjectId, syncUrl } from '../../../lib/figmaSync'
import { AIContextButton } from '../../ui/AIContextButton'
import AgentInstallPanel from '../AgentInstallPanel'
import {
  CodeBlock, DocHeader, DocSection, DocTitle, Pager, type TocEntry,
} from './blocks'
import {
  GET_STARTED_KEY, GUIDE_CODE_KEY, GUIDE_FIGMA_KEY,
  introPager, type DocsExits,
} from './getStarted'

export function getStartedToc(key: string): TocEntry[] {
  if (key === GUIDE_FIGMA_KEY) {
    return [
      { id: 'description', label: 'Overview' },
      { id: 'plugin', label: 'Install the plugin' },
      { id: 'sync', label: 'Keep Sync on' },
      { id: 'file', label: 'Optional file' },
    ]
  }
  if (key === GUIDE_CODE_KEY) {
    return [
      { id: 'description', label: 'Overview' },
      { id: 'css', label: 'CSS variables' },
      { id: 'connect', label: 'Connect your agent' },
      { id: 'w3c', label: 'Other tools' },
      { id: 'github', label: 'A repo' },
    ]
  }
  return [
    { id: 'description', label: 'Overview' },
    { id: 'configured', label: 'What you configured' },
    { id: 'start', label: 'Take it somewhere' },
  ]
}

function guideMarkdown(key: string, project: string, origin: string, slug: string): string {
  const folder = skillFolderName(project)
  const cursorPath = skillInstallPath('cursor', project)
  const claudePath = skillInstallPath('claude', project)
  if (key === GUIDE_FIGMA_KEY) {
    return [
      '# Use in Figma',
      '',
      'Install the Escala plugin once. Keep Sync on so Figma reads the same JSON the configurator publishes.',
      '',
      '1. Top bar → Figma mark → Download plugin. Unzip. Figma desktop → Plugins → Development → Import plugin from manifest…',
      '2. Same menu → Sync. Paste the live endpoint. Auto-sync on.',
      '3. Optional file: Export → Escala JSON (the exact payload the plugin imports).',
      '',
      `Sync URL: \`${syncUrl()}\``,
    ].join('\n')
  }
  if (key === GUIDE_CODE_KEY) {
    // ONE page, so ONE markdown: the CSS half and the agent half both answer
    // "how does this reach my repo", and they share the rule. Stating it once
    // at the top is what the merge bought — the two pages used to say it twice
    // in different words.
    return [
      '# Use in code',
      '',
      'Everything here lands in the **product** repo — the app you are building, not Escala. One rule underneath all of it: reference a semantic role, never invent a hex or a px. That is what `variables.css` gives a human and what the MCP server enforces for an agent.',
      '',
      '## CSS variables',
      '',
      'Already in Save & Share (`variables.css`). Put it in the product and reference roles, not ramps.',
      '',
      '```css',
      'background: var(--color-action-primary-default);',
      'color: var(--color-content-on-action);',
      '```',
      '',
      '## Connect your agent',
      '',
      'Live tokens resolve against the published system at call time, so an agent never gets a value the solver has since rejected — the way a stale snapshot can. Publish (Figma → Sync) first, then in the product repo:',
      '',
      '```json',
      mcpCursorConfig(origin),
      '```',
      '',
      `Or: \`${cliMcpInitCommand('cursor', origin)}\``,
      '',
      `Tools that read the published system take an optional \`project\` argument. This system's slug is \`${slug}\` — the same slug Figma Sync uses.`,
      '',
      'Also install the offline package, so the agent knows your token NAMES with no network — which the connection alone cannot answer, since an agent with only a connection does not know what to ask for:',
      '',
      '```',
      cliSkillCommand(slug, 'cursor', origin),
      '```',
      '',
      `Claude Code: \`${cliSkillCommand(slug, 'claude', origin)}\``,
      '',
      'Or unzip by hand:',
      '',
      `- Cursor: \`${cursorPath}\``,
      `- Claude Code: \`${claudePath}\``,
      '- Figma Make: upload the zip as-is (it cannot hold a live connection).',
      '',
      'Folder name inside the zip:',
      '',
      `\`${folder}\``,
      '',
      'No install at all: **Copy context to Agents** pastes the system into a chat.',
      '',
      '## Other tools',
      '',
      'Style Dictionary, Tokens Studio or Figma\'s own variable import want W3C JSON. In Export pick **W3C Design Tokens**.',
    ].join('\n')
  }
  return [
    '# Get started',
    '',
    'You configured a token system. Primitives stay hidden; semantics are what designs and code reference. Light and dark are modes of the same roles.',
    '',
    'Take it somewhere:',
    '',
    '- **Figma** — plugin + Sync.',
    '- **Code** — `variables.css` from Save, W3C JSON from Export, a GitHub remote, and the MCP connection an AI agent resolves real values through. All of it lands in the product repo.',
    '',
    'Do not choose between Markdown, Skill, and Agent bundle. Export asks where the system is going.',
  ].join('\n')
}

function ExitButton({
  children, onClick,
}: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="self-start text-[12px] font-medium text-fg border border-line-strong rounded-lg px-3 py-1.5 hover:bg-elevated/60 transition-colors"
    >
      {children}
    </button>
  )
}

function DestinationRow({
  title, hint, onClick,
}: { title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-baseline justify-between gap-4 w-full text-left px-4 py-3.5 rounded-xl border border-line hover:border-line-strong transition-colors"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-fg">{title}</span>
        <span className="block text-[12px] text-fg-muted mt-0.5 leading-relaxed">{hint}</span>
      </span>
      <span className="flex-shrink-0 text-[12px] text-fg-faint">Read →</span>
    </button>
  )
}

function GetStartedLanding({ onOpen }: { onOpen: (key: string) => void }) {
  return (
    <>
      <DocSection
        id="configured"
        title="What you configured"
        description="A token system, not a component library. Primitive ramps hold the raw values; semantic roles are what a screen is allowed to name. Light and dark (and any extra theme) are modes of those roles — not a second palette."
      >
        <ul className="flex flex-col gap-1.5 text-[13px] text-fg-muted leading-relaxed pl-4 list-disc">
          <li>Foundations you set in the Variables Generator — color, type, space, radius, size, stroke, grid, icons.</li>
          <li>Optional component specs (<code className="font-mono text-[0.92em] px-1 py-0.5 rounded bg-elevated/70 border border-line text-fg">atoms</code>) for the Figma plugin. Code still binds to roles, not to a hex on a button.</li>
          <li>One payload underneath: the same JSON Figma, CSS, and an agent all read.</li>
        </ul>
      </DocSection>

      <DocSection
        id="start"
        title="Take it somewhere"
        description="Two places, not three file formats. Figma is a design tool; everything else lands in the product repo."
      >
        <div className="flex flex-col gap-2">
          <DestinationRow
            title="Use in Figma"
            hint="Install the Escala plugin and keep Sync on. Variables land in the file you already design in."
            onClick={() => onOpen(GUIDE_FIGMA_KEY)}
          />
          <DestinationRow
            title="Use in code"
            hint="variables.css, W3C JSON for another tool, a GitHub remote — and the live connection an AI agent resolves real values through."
            onClick={() => onOpen(GUIDE_CODE_KEY)}
          />
        </div>
      </DocSection>
    </>
  )
}

function FigmaGuide({ exits }: { exits: DocsExits }) {
  const url = syncUrl()
  return (
    <>
      <DocSection
        id="plugin"
        title="Install the plugin"
        description="One-time. Figma desktop, not the browser. After that you never import a JSON by hand unless you want a snapshot."
      >
        <ol className="list-decimal pl-4 text-[13px] text-fg-muted leading-relaxed flex flex-col gap-1 mb-3">
          <li>Download the plugin zip from the Figma menu in the top bar.</li>
          <li>Unzip. In Figma: <span className="text-fg">Plugins → Development → Import plugin from manifest…</span></li>
          <li>Run <span className="text-fg">Plugins → Development → Escala DS</span>.</li>
        </ol>
        <ExitButton onClick={exits.onOpenFigmaDownload}>Open plugin install</ExitButton>
      </DocSection>

      <DocSection
        id="sync"
        title="Keep Sync on"
        description="The plugin polls this system's published JSON — the same file Export can download. Rename the project and the URL changes; that is expected."
      >
        <CodeBlock file="Live sync URL" code={url} />
        <ExitButton onClick={exits.onOpenFigmaSync}>Open Sync</ExitButton>
      </DocSection>

      <DocSection
        id="file"
        title="Optional file"
        description="If you need a snapshot on disk: Export and pick Escala JSON. That is the exact payload the plugin imports. W3C JSON is for other tools, not this plugin."
      >
        <ExitButton onClick={exits.onOpenExport}>Open Export</ExitButton>
      </DocSection>
    </>
  )
}

/**
 * Code AND agents — one page, because they are one destination.
 *
 * This used to be two rail rows, "Use in code" and "Use with AI", and they
 * answered the same question (how do my tokens reach my repo) with the same
 * rule stated twice in different words — the CSS section said "reference
 * roles, not hex" in prose, the AI page enforced the identical thing through
 * `resolve_token`. Everything on this page lands in the product repo;
 * `variables.css` is how a human obeys the rule and the MCP server is how an
 * agent does. Figma is the destination that is genuinely different, and it
 * kept its own page.
 *
 * Section order is what a reader actually asks in sequence: the file first
 * (the universal answer), then the agent (the same rule, enforced), then the
 * two exits — another tool's format, and a repo to commit into.
 */
function CodeGuide({ exits }: { exits: DocsExits }) {
  return (
    <>
      <DocSection
        id="css"
        title="CSS variables"
        description="Save & Share already has `variables.css`. Put it in the product and reference semantic roles, never a primitive ramp and never a leftover hex."
      >
        <CodeBlock
          file="variables.css"
          code={`background: var(--color-action-primary-default);\ncolor:      var(--color-content-on-action);`}
        />
        <ExitButton onClick={exits.onOpenSave}>Open Save & Share</ExitButton>
      </DocSection>

      {/* The same rule as the section above, enforced at call time instead of
          by discipline. The panel carries the offline package as its own step
          03, so there is no separate "Offline package" section any more — one
          explanation, in the place you act on it. */}
      <DocSection
        id="connect"
        title="Connect your agent"
        description="An agent writing this code needs the same rule. Publish (Sync), then connect it so it resolves real values at call time — resolve_token, check_contrast — instead of guessing: a stale snapshot can hand out a tone the solver has since rejected. Step 3 installs the offline package, which teaches it your token names with no network."
      >
        <AgentInstallPanel variant="docs" />
        <p className="text-[12.5px] text-fg-faint leading-relaxed">
          Neither, for a one-off? <span className="text-fg-muted">Copy context to Agents</span> (the
          control at the top of this page) pastes the system straight into a chat — no files, no
          restart. Connect when every chat in the repo should already know the tokens.
        </p>
      </DocSection>

      <DocSection
        id="w3c"
        title="Other tools"
        description="Style Dictionary, Tokens Studio, or Figma's own variable import want W3C JSON. In Export pick W3C Design Tokens. That is code and other tools — not the Escala plugin."
      >
        <ExitButton onClick={exits.onOpenExport}>Open Export</ExitButton>
      </DocSection>

      <DocSection
        id="github"
        title="A repo"
        description="Connect GitHub when you want the CSS and tokens committed, not emailed. Same files as Save — a remote instead of a download."
      >
        <ExitButton onClick={exits.onOpenGithub}>Open GitHub</ExitButton>
      </DocSection>
    </>
  )
}

const TITLE: Record<string, { title: string; lead: string }> = {
  [GET_STARTED_KEY]: {
    title: 'Get started',
    lead: 'Foundations are set. This page is where the system goes — into Figma, or into your product repo — not a menu of file formats.',
  },
  [GUIDE_FIGMA_KEY]: {
    title: 'Use in Figma',
    lead: 'Install the Escala plugin once. Keep Sync on. The plugin reads the same JSON the configurator publishes — you do not maintain a second set of variables by hand.',
  },
  [GUIDE_CODE_KEY]: {
    title: 'Use in code',
    lead: 'Everything that lands in the product repo — `variables.css`, W3C JSON for another tool, a GitHub remote, and the live connection an AI agent reads. One rule under all of it: reach for a semantic role (`action.primary.default`), never a leftover hex.',
  },
}

export function GetStartedArticle({
  pageKey, onOpen, exits,
}: {
  pageKey: string
  onOpen: (key: string) => void
  exits: DocsExits
}) {
  const projectName = useDesignStore((s) => s.projectName) || 'Escala'
  const meta = TITLE[pageKey] ?? TITLE[GET_STARTED_KEY]
  const pager = introPager(pageKey)
  const origin = publishOrigin()
  const slug = syncProjectId()

  return (
    <div className="flex flex-col gap-8">
      <DocHeader
        section="Docs"
        kind="Get started"
        title={meta.title}
        actions={
          <AIContextButton
            scope="global"
            markdown={() => withAgentEnvelope('global', meta.title, guideMarkdown(pageKey, projectName, origin, slug))}
          />
        }
      />

      <DocTitle title={meta.title} eyebrow="Guide" lead={meta.lead} />

      {pageKey === GUIDE_FIGMA_KEY ? (
        <FigmaGuide exits={exits} />
      ) : pageKey === GUIDE_CODE_KEY ? (
        <CodeGuide exits={exits} />
      ) : (
        <GetStartedLanding onOpen={onOpen} />
      )}

      <Pager prev={pager.prev} next={pager.next} onOpen={onOpen} />
    </div>
  )
}
