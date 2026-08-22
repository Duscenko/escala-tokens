// One install recipe for a generated system — wizard payoff and Docs → Use with AI.
// Tabs (Cursor / Claude / Figma Make) plus MCP. Origin and project slug
// come from `figmaSync` so this cannot drift from the Figma Live Sync URL.
// Primary action is `npx @escala/cli` (same helpers the binary parses). Unzip
// stays as the fallback when the system is not published yet.

import { useState, type ReactNode } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import {
  cliMcpInitCommand,
  cliSkillCommand,
  mcpClaudeAddCommand,
  mcpCursorConfig,
  mcpVscodeConfig,
  skillFolderName,
  skillInstallPath,
} from '../../lib/agentInstall'
import { publishOrigin, syncProjectId } from '../../lib/figmaSync'
import { CodeBlock } from './docs/blocks'

export type InstallClient = 'cursor' | 'claude' | 'make'

const TABS: { id: InstallClient; label: string }[] = [
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude', label: 'Claude Code' },
  { id: 'make', label: 'Figma Make' },
]

export default function AgentInstallPanel({
  initialClient = 'cursor',
  variant = 'docs',
}: {
  initialClient?: InstallClient
  /** `export` is the wizard payoff (you already have the zip). `docs` includes the Export step. */
  variant?: 'export' | 'docs'
}) {
  const [tab, setTab] = useState<InstallClient>(initialClient)
  const projectName = useDesignStore((s) => s.projectName) || 'Escala'
  const origin = publishOrigin()
  const slug = syncProjectId()
  const folder = skillFolderName(projectName)
  const cursorPath = skillInstallPath('cursor', projectName)
  const claudePath = skillInstallPath('claude', projectName)
  const mcp = mcpCursorConfig(origin)
  const inWizard = variant === 'export'

  return (
    <div className="rounded-xl border border-line bg-surface/50 overflow-hidden">
      {inWizard && (
        <div className="px-4 pt-3.5 pb-3 flex flex-col gap-1">
          <span className="text-[13px] font-medium text-fg">Install</span>
          <p className="text-[12px] text-fg-muted leading-relaxed">
            This teaches the agent your token names. It does not replace Figma. Run the command in the{' '}
            <strong className="font-medium text-fg">product</strong> repo — the app you are building, not Escala.
            The system must be published (Sync). Or unzip the file you just downloaded.
          </p>
        </div>
      )}

      <div className={`flex items-center gap-1 px-3 pb-2 ${inWizard ? '' : 'pt-3'}`}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              tab === id ? 'bg-elevated text-fg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pb-4 flex flex-col gap-3">
        {tab === 'cursor' && (
          <ClientInstall
            command={cliSkillCommand(slug, 'cursor', origin)}
            path={cursorPath}
            inWizard={inWizard}
            unzip={<>Unzip so <Mono>{`${folder}/`}</Mono> sits at <Mono>{cursorPath}</Mono>.</>}
            after="Open a new Cursor chat in that repo and ask it to use your tokens."
          />
        )}
        {tab === 'claude' && (
          <ClientInstall
            command={cliSkillCommand(slug, 'claude', origin)}
            path={claudePath}
            inWizard={inWizard}
            unzip={<>Unzip to <Mono>{claudePath}</Mono>. Commit it if the team should share the guide.</>}
            after="Restart Claude Code or start a new session in that repo."
          />
        )}
        {tab === 'make' && (
          <p className="text-[13px] text-fg-muted leading-relaxed">
            Upload the zip as-is in Figma Make. If you downloaded the full package, go back and check{' '}
            <span className="text-fg">Figma Make only (smaller zip)</span>. This does not replace Figma variables — Sync still does that.
          </p>
        )}

        {tab !== 'make' && (
          <McpBlock
            origin={origin}
            slug={slug}
            mcp={mcp}
            client={tab}
          />
        )}
      </div>
    </div>
  )
}

function Mono({ children }: { children: string }) {
  return (
    <code className="font-mono text-[0.92em] px-1 py-0.5 rounded bg-elevated/70 border border-line text-fg">
      {children}
    </code>
  )
}

function ClientInstall({
  command, path, inWizard, unzip, after,
}: {
  command: string
  path: string
  inWizard: boolean
  unzip: ReactNode
  after: string
}) {
  return (
    <>
      <CodeBlock file="terminal" code={command} />
      <ol className={`list-decimal pl-4 text-fg-muted leading-relaxed flex flex-col gap-1 ${inWizard ? 'text-[12px]' : 'text-[13px]'}`}>
        {!inWizard && (
          <li>Publish this system (Figma → Sync) so the CLI can fetch it.</li>
        )}
        <li>In the product repo: paste the command. Restart the agent.</li>
        <li>{after}</li>
      </ol>
      <details className="rounded-lg border border-line px-3 py-2">
        <summary className="text-[12px] font-medium text-fg cursor-pointer">Unzip instead</summary>
        <div className="mt-2.5 flex flex-col gap-2">
          <p className={`text-fg-muted leading-relaxed ${inWizard ? 'text-[12px]' : 'text-[13px]'}`}>
            {inWizard ? unzip : <>Export → <span className="text-fg">AI assistant</span>. {unzip}</>}
          </p>
          <CodeBlock file={path} code={path} />
        </div>
      </details>
    </>
  )
}

function McpBlock({
  origin, slug, mcp, client,
}: {
  origin: string
  slug: string
  mcp: string
  client: 'cursor' | 'claude'
}) {
  return (
    <div className="flex flex-col gap-2.5 pt-3 border-t border-line/60">
      <div>
        <span className="text-[12.5px] font-medium text-fg">Live tokens (optional, recommended)</span>
        <p className="text-[12px] text-fg-muted leading-relaxed mt-0.5">
          The guide is static names. This connection lets the agent ask the published system{' '}
          <Mono>resolve_token</Mono> and <Mono>check_contrast</Mono>. Restart the agent after.
        </p>
      </div>
      <CodeBlock file="terminal" code={cliMcpInitCommand(client, origin)} />
      <p className="text-[12px] text-fg-muted leading-relaxed">
        Tools that read tokens take an optional <Mono>project</Mono> argument — this system&apos;s slug is{' '}
        <Mono>{slug}</Mono>, the same one Figma Sync uses.
      </p>
      <details className="rounded-lg border border-line px-3 py-2">
        <summary className="text-[12px] font-medium text-fg cursor-pointer">Paste JSON instead · VS Code</summary>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Cursor: project <Mono>.cursor/mcp.json</Mono>:
          </p>
          <CodeBlock file=".cursor/mcp.json" code={mcp} />
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Claude Code (HTTP transport). This is Anthropic&apos;s CLI, not Escala&apos;s:
          </p>
          <CodeBlock file="terminal" code={mcpClaudeAddCommand(origin)} />
          <p className="text-[12px] text-fg-muted leading-relaxed">
            Or <code className="font-mono text-[0.92em]">{cliMcpInitCommand('vscode', origin)}</code>
          </p>
          <CodeBlock file=".vscode/mcp.json" code={mcpVscodeConfig(origin)} />
        </div>
      </details>
    </div>
  )
}
