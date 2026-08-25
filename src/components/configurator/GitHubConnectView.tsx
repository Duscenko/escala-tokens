import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useDesignStore, captureSnapshot } from '../../store/useDesignStore'
import { generateTokenJSON } from '../../lib/tokenGenerator'
import { buildCSS, buildMarkdown } from '../../lib/exporters'
import { slugify } from '../../lib/utils'
import { ESCALA_SYSTEM_PATH, parseEscalaSystem, serializeEscalaSystem } from '../../lib/escalaSystem'
import { getStoredClaim, setStoredClaim, syncProjectId } from '../../lib/figmaSync'
import {
  getStoredToken, setStoredToken, clearStoredToken,
  validateToken, listRepos, createRepo, pushFiles, getFile,
  type GitHubUser, type GitHubRepo,
} from '../../lib/github'
import { startGithubOAuth, isGithubOAuthConfigured } from '../../lib/githubOAuth'
import { GitHubGlyph } from '../ui/icons'

interface GitHubConnectViewProps {
  onClose?: () => void
}

// Every failure `githubOAuth.ts`/`api/github-oauth.ts` can hand back, worded
// for the person looking at this screen rather than for a log line. Missing
// a key here isn't silent — the fallback string still shows an error, it's
// just less specific than these.
const OAUTH_ERROR_COPY: Record<string, string> = {
  popup_blocked: 'Your browser blocked the popup. Allow popups for this site, or paste a token below instead.',
  closed: 'Connection window closed before finishing.',
  timeout: 'Took too long — try again.',
  state_mismatch: 'Something about that connection looked wrong, so it was rejected. Try again.',
  not_configured: 'GitHub sign-in isn’t set up on this deployment yet — paste a token below instead.',
  access_denied: 'Access was declined on GitHub.',
  network_error: 'Could not reach GitHub. Check your connection and try again.',
  exchange_failed: 'GitHub did not return a usable token. Try again.',
  no_token: 'GitHub did not return a usable token. Try again.',
}
function oauthErrorMessage(code: string): string {
  return OAUTH_ERROR_COPY[code] ?? 'Could not connect to GitHub. Paste a token below instead.'
}

type PushState = 'idle' | 'pushing' | 'done' | 'error'

const TOKEN_URL =
  'https://github.com/settings/tokens/new?scopes=repo&description=Escala%20token%20sync'

export default function GitHubConnectView({ onClose }: GitHubConnectViewProps) {
  const { projectName, githubRepo, setGithubRepo, githubLastPushAt, setGithubLastPushAt } =
    useDesignStore()

  // ── Auth ──
  const [tokenInput, setTokenInput] = useState('')
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  // Whether to offer OAuth at all — `null` while unknown, so the button never
  // flashes in then out. Defaults to hidden (not `true`) precisely because
  // this deployment may not have `GITHUB_OAUTH_CLIENT_ID`/`_SECRET` set yet —
  // see `isGithubOAuthConfigured`.
  const [oauthAvailable, setOauthAvailable] = useState<boolean | null>(null)
  const [oauthBusy, setOauthBusy] = useState(false)

  // ── Repo selection ──
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [newRepoName, setNewRepoName] = useState('')
  const [repoBusy, setRepoBusy] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)

  // ── Push ──
  const [pushState, setPushState] = useState<PushState>('idle')
  const [pushLog, setPushLog] = useState<string[]>([])
  const [pushError, setPushError] = useState<string | null>(null)

  const [restoreState, setRestoreState] = useState<'idle' | 'loading' | 'restored' | 'empty' | 'error'>('idle')

  const slug = slugify(projectName) || 'design-system'

  useEffect(() => {
    let cancelled = false
    isGithubOAuthConfigured().then((v) => { if (!cancelled) setOauthAvailable(v) })
    return () => { cancelled = true }
  }, [])

  async function connectWithOAuth() {
    setOauthBusy(true)
    setAuthError(null)
    const result = await startGithubOAuth()
    setOauthBusy(false)
    if (!result.ok) {
      // A closed/timed-out popup is the user's own choice, not a failure
      // worth a red error line — everything else is.
      if (result.error !== 'closed') setAuthError(oauthErrorMessage(result.error))
      return
    }
    // `startGithubOAuth` already called `setStoredToken` — same path `connect()`
    // takes from here, so both doors end up in identical state.
    setAuthBusy(true)
    try {
      const token = getStoredToken()!
      const u = await validateToken(token)
      setUser(u)
      setRepos(await listRepos(token))
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Connected, but could not load your GitHub account.')
    } finally {
      setAuthBusy(false)
    }
  }

  // Reconnect silently with the stored token on mount.
  useEffect(() => {
    const stored = getStoredToken()
    if (!stored) return
    setAuthBusy(true)
    validateToken(stored)
      .then((u) => {
        setUser(u)
        return listRepos(stored).then(setRepos)
      })
      .catch(() => clearStoredToken())
      .finally(() => setAuthBusy(false))
  }, [])

  async function connect() {
    const token = tokenInput.trim()
    if (!token) return
    setAuthBusy(true)
    setAuthError(null)
    try {
      const u = await validateToken(token)
      setStoredToken(token)
      setUser(u)
      setTokenInput('')
      setRepos(await listRepos(token))
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Could not validate the token.')
    } finally {
      setAuthBusy(false)
    }
  }

  function disconnect() {
    clearStoredToken()
    setUser(null)
    setRepos([])
    setGithubRepo(null)
  }

  async function restoreFromRepo(fullName: string) {
    const ghToken = getStoredToken()
    if (!ghToken) return
    setRestoreState('loading')
    try {
      const raw = await getFile(ghToken, fullName, ESCALA_SYSTEM_PATH)
      if (!raw) {
        setRestoreState('empty')
        return
      }
      const parsed = parseEscalaSystem(JSON.parse(raw))
      if (!parsed) {
        setRestoreState('error')
        return
      }
      const live = captureSnapshot(parsed.snapshot)
      useDesignStore.setState({
        ...live,
        projectCreated: true,
        githubRepo: fullName,
      })
      useDesignStore.getState().upsertSavedSystem({
        id: fullName,
        name: live.projectName,
        description: live.projectDescription,
        repo: fullName,
        savedAt: parsed.savedAt,
        snapshot: live,
        source: 'github',
      })
      if (parsed.publishClaim) {
        setStoredClaim(parsed.publishSlug, parsed.publishClaim)
      }
      setRestoreState('restored')
    } catch {
      setRestoreState('error')
    }
  }

  async function handlePickRepo(fullName: string) {
    setGithubRepo(fullName || null)
    setRestoreState('idle')
    if (fullName) await restoreFromRepo(fullName)
  }

  async function handleCreateRepo() {
    const token = getStoredToken()
    const name = slugify(newRepoName.trim() || `${slug}-design-system`)
    if (!token || !name) return
    setRepoBusy(true)
    setRepoError(null)
    try {
      const repo = await createRepo(token, name, `${projectName} design tokens — generated by Escala`)
      setRepos((prev) => [repo, ...prev])
      setGithubRepo(repo.full_name)
      setNewRepoName('')
    } catch (e) {
      setRepoError(e instanceof Error ? e.message : 'Could not create the repository.')
    } finally {
      setRepoBusy(false)
    }
  }

  async function push() {
    const token = getStoredToken()
    if (!token || !githubRepo) return
    setPushState('pushing')
    setPushError(null)
    setPushLog([])
    const files = [
      { path: 'tokens.json', content: JSON.stringify(generateTokenJSON(), null, 2) },
      { path: 'variables.css', content: buildCSS(useDesignStore.getState()) },
      { path: 'README.md', content: buildMarkdown(useDesignStore.getState()) },
      {
        path: ESCALA_SYSTEM_PATH,
        content: serializeEscalaSystem({
          snapshot: captureSnapshot(useDesignStore.getState()),
          publishSlug: syncProjectId(),
          publishClaim: getStoredClaim(syncProjectId()) ?? undefined,
        }),
      },
    ]
    try {
      await pushFiles(token, githubRepo, files, `chore(tokens): update ${projectName} design tokens`, (path) =>
        setPushLog((prev) => [...prev, path]),
      )
      setGithubLastPushAt(new Date().toISOString())
      // A successful push is what "saves" a design system — upsert it into the
      // local registry (id = repo full_name, so re-pushes update the entry).
      const s = useDesignStore.getState()
      s.upsertSavedSystem({
        id: githubRepo,
        name: s.projectName,
        description: s.projectDescription,
        repo: githubRepo,
        savedAt: new Date().toISOString(),
        snapshot: captureSnapshot(s),
        source: 'github',
      })
      setPushState('done')
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Push failed.')
      setPushState('error')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col gap-8 max-w-2xl p-8"
    >
      {onClose && (
        <button
          onClick={onClose}
          className="self-start flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7.5 2.5 4 6l3.5 3.5" />
          </svg>
          Back to editor
        </button>
      )}

      {/* ── Step 1: Connect ── */}
      <section className="rounded-xl border border-line bg-surface/50 p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-500' : 'bg-line-strong'}`} />
          <h3 className="text-sm font-semibold text-fg">1 · Connect your account</h3>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full ring-1 ring-line" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-fg font-medium truncate">{user.name ?? user.login}</p>
              <p className="text-xs text-fg-faint">@{user.login}</p>
            </div>
            <button
              onClick={disconnect}
              className="text-xs text-fg-faint hover:text-red-500 transition-colors px-2 py-1 rounded border border-line hover:border-red-300"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <>
            {/* OAuth is the PRIMARY path — one click, no token to generate or
                paste. Rendered only once `oauthAvailable` resolves `true`;
                staying `null`/`false` leaves this whole block out rather than
                showing a button that would fail on click, which is exactly
                what a deployment with no `GITHUB_OAUTH_CLIENT_ID`/`_SECRET`
                set would otherwise do. The PAT flow below is UNCHANGED and
                un-demoted in its own copy — it's the fallback for a blocked
                popup or a deployment without OAuth configured, not a legacy
                path being phased out. */}
            {oauthAvailable && (
              <>
                <button
                  onClick={connectWithOAuth}
                  disabled={oauthBusy || authBusy}
                  className="flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-medium bg-fg text-app hover:opacity-90 disabled:opacity-40 transition-colors"
                >
                  <GitHubGlyph size={14} />
                  {oauthBusy ? 'Waiting for GitHub…' : 'Continue with GitHub'}
                </button>
                <div className="flex items-center gap-2 text-[11px] text-fg-faint">
                  <span className="flex-1 h-px bg-line" />
                  or paste a token
                  <span className="flex-1 h-px bg-line" />
                </div>
              </>
            )}
            <p className="text-xs text-fg-faint leading-relaxed">
              Create a{' '}
              <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="text-[#5AADFF] hover:underline">
                Personal Access Token
              </a>{' '}
              with the <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">repo</code> scope
              and paste it here. It's stored only in this browser.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => { setTokenInput(e.target.value); setAuthError(null) }}
                onKeyDown={(e) => { if (e.key === 'Enter') connect() }}
                placeholder="ghp_…"
                aria-label="GitHub personal access token"
                className="flex-1 bg-app border border-line focus:border-fg rounded-lg px-3 py-2 text-sm font-mono text-fg outline-none transition-colors"
              />
              <button
                onClick={connect}
                disabled={authBusy || !tokenInput.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-fg text-app hover:opacity-90 disabled:opacity-40 transition-colors"
              >
                {authBusy ? 'Connecting…' : 'Connect'}
              </button>
            </div>
            {authError && <p className="text-xs text-red-500">{authError}</p>}
          </>
        )}
      </section>

      {/* ── Step 2: Pick a repository ── */}
      <section className={`rounded-xl border border-line bg-surface/50 p-5 flex flex-col gap-3 ${!user ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${githubRepo ? 'bg-emerald-500' : 'bg-line-strong'}`} />
          <h3 className="text-sm font-semibold text-fg">2 · Pick a repository</h3>
        </div>

        <select
          value={githubRepo ?? ''}
          onChange={(e) => { void handlePickRepo(e.target.value) }}
          aria-label="Target repository"
          className="bg-app border border-line rounded-lg px-3 py-2 text-sm text-fg outline-none focus:border-fg transition-colors"
        >
          <option value="">Choose a repository…</option>
          {repos.map((r) => (
            <option key={r.full_name} value={r.full_name}>
              {r.full_name}{r.private ? ' (private)' : ''}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newRepoName}
            onChange={(e) => { setNewRepoName(e.target.value); setRepoError(null) }}
            placeholder={`${slug}-design-system`}
            aria-label="New repository name"
            className="flex-1 bg-app border border-line focus:border-fg rounded-lg px-3 py-2 text-sm font-mono text-fg outline-none transition-colors"
          />
          <button
            onClick={handleCreateRepo}
            disabled={repoBusy}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-elevated text-fg-muted hover:text-fg border border-line-strong disabled:opacity-40 transition-colors"
          >
            {repoBusy ? 'Creating…' : 'Create private repo'}
          </button>
        </div>
        {repoError && <p className="text-xs text-red-500">{repoError}</p>}
        {restoreState === 'loading' && (
          <p className="text-xs text-fg-faint">Looking for {ESCALA_SYSTEM_PATH}…</p>
        )}
        {restoreState === 'restored' && (
          <p className="text-xs text-emerald-600">Restored the editor from this repo.</p>
        )}
        {restoreState === 'empty' && (
          <p className="text-xs text-fg-faint">
            No editor snapshot in this repo yet. First push will write {ESCALA_SYSTEM_PATH}.
          </p>
        )}
        {restoreState === 'error' && (
          <p className="text-xs text-red-500">Could not read {ESCALA_SYSTEM_PATH} from this repo.</p>
        )}
        {githubRepo && repos.find((r) => r.full_name === githubRepo)?.private === false && (
          <p className="text-xs text-amber-600">
            This repository is public. The publish claim in {ESCALA_SYSTEM_PATH} would be visible to anyone — use a private repo to save a system you care about.
          </p>
        )}
      </section>

      {/* ── Step 3: Push ── */}
      <section className={`rounded-xl border border-line bg-surface/50 p-5 flex flex-col gap-3 ${!githubRepo || !user ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${pushState === 'done' ? 'bg-emerald-500' : 'bg-line-strong'}`} />
          <h3 className="text-sm font-semibold text-fg">3 · Push your design system</h3>
        </div>
        <p className="text-xs text-fg-faint leading-relaxed">
          Commits <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">tokens.json</code>,{' '}
          <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">variables.css</code>,{' '}
          <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">README.md</code> and{' '}
          <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">{ESCALA_SYSTEM_PATH}</code> to{' '}
          <span className="text-fg-muted font-mono text-[11px]">{githubRepo ?? '—'}</span>.
          The <code className="text-[11px] px-1 py-0.5 rounded bg-elevated text-fg-muted">.escala</code> file is the
          editor — without it, this repo is an export, not a save. Keep the repo private: it can hold the publish claim.
          {githubLastPushAt && (
            <span> Last push: {new Date(githubLastPushAt).toLocaleString()}.</span>
          )}
        </p>
        <button
          onClick={push}
          disabled={pushState === 'pushing'}
          className="self-start px-4 py-2 rounded-lg text-sm font-medium bg-fg text-app hover:opacity-90 disabled:opacity-40 transition-colors"
        >
          {pushState === 'pushing' ? 'Pushing…' : pushState === 'done' ? '✓ Pushed — push again' : 'Push to GitHub'}
        </button>

        {pushLog.length > 0 && (
          <ul className="flex flex-col gap-1">
            {pushLog.map((p, i) => (
              <li key={p} className="text-[11px] font-mono text-fg-faint flex items-center gap-1.5">
                {pushState === 'pushing' && i === pushLog.length - 1 ? (
                  <span className="w-2.5 h-2.5 rounded-full border border-fg-faint border-t-transparent animate-spin" />
                ) : (
                  <span className="text-emerald-500">✓</span>
                )}
                {p}
              </li>
            ))}
          </ul>
        )}
        {pushError && <p className="text-xs text-red-500">{pushError}</p>}
        {pushState === 'done' && githubRepo && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-emerald-600">✓ Saved to My design systems</p>
            <a
              href={`https://github.com/${githubRepo}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#5AADFF] hover:underline self-start"
            >
              Open {githubRepo} →
            </a>
          </div>
        )}
      </section>
    </motion.div>
  )
}
