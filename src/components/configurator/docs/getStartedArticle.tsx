// Get started articles — destinations, not file formats.
// Create UI's docs shape (what you get → where it lands) without their CLI.
// Install (Cursor / Claude / Make + MCP) is `AgentInstallPanel` — the same
// component the Export wizard shows on step 3, so the two cannot drift.

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
  GET_STARTED_KEY, GUIDE_AI_KEY, GUIDE_CODE_KEY, GUIDE_FIGMA_KEY,
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
      { id: 'w3c', label: 'Other tools' },
      { id: 'github', label: 'A repo' },
    ]
  }
  if (key === GUIDE_AI_KEY) {
    return [
      { id: 'description', label: 'Overview' },
      { id: 'connect', label: 'Connect' },
      { id: 'package', label: 'Offline package' },
      { id: 'paste', label: 'Paste only' },
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
    return [
      '# Use in code',
      '',
      'CSS already lives in Save & Share (`variables.css`). Export W3C JSON only when another tool needs the standard format.',
      '',
      '```css',
      'background: var(--color-action-primary-default);',
      'color: var(--color-content-on-action);',
      '```',
      '',
      'Do not invent hex or px when a token exists. Semantic roles over primitive ramps.',
    ].join('\n')
  }
  if (key === GUIDE_AI_KEY) {
    return [
      '# Use with AI',
      '',
      'Connect first: live tokens resolve against the published system at call time, so the agent never gets a value the solver has since rejected. In Export, pick **AI assistant** for the offline package too — Figma Make is a nested option on that same destination, not a third product.',
      '',
      'Publish (Figma → Sync), then in the **product** repo, connect live tokens. Cursor project file `.cursor/mcp.json`:',
      '',
      '```json',
      mcpCursorConfig(origin),
      '```',
      '',
      `Or: \`${cliMcpInitCommand('cursor', origin)}\``,
      '',
      `Tools that read the published system take an optional \`project\` argument. This system's slug is \`${slug}\` — the same slug Figma Sync uses.`,
      '',
      'Also install the offline package, so the agent knows your token names with no network (and for Figma Make, which can only take a zip):',
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
      '- Figma Make: upload the zip as-is.',
      '',
      'Folder name inside the zip:',
      '',
      `\`${folder}\``,
      '',
      'The live connection looks up values (`resolve_token`, `check_contrast`). The package teaches names. Use both.',
      '',
      'No install: **Copy context to Agents** pastes the system into a chat.',
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
    '- **Code** — `variables.css` from Save, or W3C JSON from Export.',
    '- **AI** — connect live tokens (MCP) so the agent resolves real values; also install the offline package.',
    '',
    'Do not choose between Markdown, Skill, and Agent bundle. Export asks where the system is going: Figma, code, or AI.',
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
        description="Three jobs. Pick the place you work — not a file format."
      >
        <div className="flex flex-col gap-2">
          <DestinationRow
            title="Use in Figma"
            hint="Install the Escala plugin and keep Sync on. Variables land in the file you already design in."
            onClick={() => onOpen(GUIDE_FIGMA_KEY)}
          />
          <DestinationRow
            title="Use in code"
            hint="variables.css from Save & Share, or W3C JSON when another tool needs the standard format."
            onClick={() => onOpen(GUIDE_CODE_KEY)}
          />
          <DestinationRow
            title="Use with AI"
            hint="Connect live tokens so the agent resolves real values, not stale hex. Also install the offline package."
            onClick={() => onOpen(GUIDE_AI_KEY)}
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

function CodeGuide({ exits }: { exits: DocsExits }) {
  return (
    <>
      <DocSection
        id="css"
        title="CSS variables"
        description="Save & Share already has `variables.css`. Put it in the product and reference roles, not hex. GitHub is the same files versioned."
      >
        <CodeBlock
          file="variables.css"
          code={`background: var(--color-action-primary-default);\ncolor:      var(--color-content-on-action);`}
        />
        <ExitButton onClick={exits.onOpenSave}>Open Save & Share</ExitButton>
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

function AiGuide({ exits }: { exits: DocsExits }) {
  return (
    <>
      <DocSection
        id="connect"
        title="Connect"
        description="Publish (Sync), then connect the agent below so it resolves real values at call time — resolve_token, check_contrast — instead of guessing. This is the first thing to do; the panel also covers the offline package for when you need it."
      >
        <AgentInstallPanel variant="docs" />
      </DocSection>

      <DocSection
        id="package"
        title="Offline package"
        description="No network, or Figma Make (which can only take a zip): pick AI assistant in Export for the full context — the guide the agent reads, plus checkers and templates. Markdown is already in Save and in Copy context. Figma Make is a nested checkbox on the same destination, not a third philosophy."
      >
        <ExitButton onClick={exits.onOpenExport}>Open Export</ExitButton>
      </DocSection>

      <DocSection
        id="paste"
        title="Paste only"
        description="No files, no restart. Copy context to Agents (the rainbow control on this page) pastes the system into a chat. Use that for a one-off. Connect or install when every chat in the repo should already know the tokens."
      />
    </>
  )
}

const TITLE: Record<string, { title: string; lead: string }> = {
  [GET_STARTED_KEY]: {
    title: 'Get started',
    lead: 'Foundations are set. This page is where the system goes — Figma, code, or an AI assistant — not a menu of file formats.',
  },
  [GUIDE_FIGMA_KEY]: {
    title: 'Use in Figma',
    lead: 'Install the Escala plugin once. Keep Sync on. The plugin reads the same JSON the configurator publishes — you do not maintain a second set of variables by hand.',
  },
  [GUIDE_CODE_KEY]: {
    title: 'Use in code',
    lead: 'CSS custom properties from Save & Share, or W3C JSON when another tool needs the standard format. Reach for semantic roles (`action.primary.default`), never a leftover hex.',
  },
  [GUIDE_AI_KEY]: {
    title: 'Use with AI',
    lead: 'Connect live tokens so the agent resolves real values instead of guessing — a stale snapshot can hand out a tone the solver has since rejected. Also install the offline package so it knows your token names with no network. Or paste into a chat and skip both.',
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
      ) : pageKey === GUIDE_AI_KEY ? (
        <AiGuide exits={exits} />
      ) : (
        <GetStartedLanding onOpen={onOpen} />
      )}

      <Pager prev={pager.prev} next={pager.next} onOpen={onOpen} />
    </div>
  )
}
