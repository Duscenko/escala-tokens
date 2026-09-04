import { useEffect, useState, type ReactNode } from 'react'
import { TABLE_HEAD_CELL, tableHeaderClass, tableRowClass } from './tableChrome'
import { useThemeFoundations } from '../../lib/useThemeFoundations'
import { fontStack } from '../../lib/fonts'
import {
  FONT_WEIGHT_BASES,
  TYPE_SCALE_KEYS,
} from '../../lib/typographyStandard'
import {
  TYPE_ROLE_BY_KEY,
  TYPE_ROLE_GROUPS,
  TYPE_ROLES,
  mergeTypeRoles,
  resolveTypeStyle,
  roleIsDefault,
  typeRolesInGroup,
  type TypeAlias,
  type TypeFamilyRole,
  type TypeRoleGroupId,
  type TypeRoleModes,
  type TypeWeightKey,
} from '../../lib/typeRoles'
import SemanticGroupRail from './SemanticGroupRail'
import VariablesPreviewPane from './VariablesPreviewPane'
import { usePreviewTokens } from '../../lib/previewTokens'
import type { ThemeAppearance } from '../../lib/themeModes'
import { TypeRolesPreview } from '../preview/atoms/TypeRolesPreview'

export type TypeFocus = TypeRoleGroupId | 'all'

const GRID = 'grid grid-cols-[minmax(8.5rem,1fr)_minmax(13rem,1.35fr)_minmax(13rem,1.35fr)_minmax(10rem,1.15fr)_2.5rem]'

const rowClass = (index: number) => tableRowClass(index, GRID)

const FAMILY_OPTIONS: { value: TypeFamilyRole; label: string }[] = [
  { value: 'display', label: 'Display' },
  { value: 'body', label: 'Body' },
]
const WEIGHT_OPTIONS: { value: TypeWeightKey; label: string }[] = FONT_WEIGHT_BASES.map((b) => ({
  value: b.key as TypeWeightKey,
  label: b.label,
}))
const SIZE_OPTIONS = TYPE_SCALE_KEYS.map((k) => ({ value: k, label: k }))

function AliasSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="min-w-0 h-7 px-1.5 rounded-md border border-line bg-app text-caption font-mono text-fg-muted hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fg"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function ViewportCell({
  roleKey,
  viewport,
  alias,
  onChange,
}: {
  roleKey: string
  viewport: 'desktop' | 'mobile'
  alias: TypeAlias
  onChange: (next: TypeAlias) => void
}) {
  return (
    <div className="flex items-center gap-1 px-2 py-2 border-r border-line min-w-0">
      <AliasSelect
        value={alias.size}
        options={SIZE_OPTIONS}
        onChange={(size) => onChange({ ...alias, size })}
        ariaLabel={`${roleKey} ${viewport} size`}
      />
      <AliasSelect
        value={alias.weight}
        options={WEIGHT_OPTIONS}
        onChange={(weight) => onChange({ ...alias, weight })}
        ariaLabel={`${roleKey} ${viewport} weight`}
      />
      <AliasSelect
        value={alias.family}
        options={FAMILY_OPTIONS}
        onChange={(family) => onChange({ ...alias, family })}
        ariaLabel={`${roleKey} ${viewport} family`}
      />
    </div>
  )
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M3.5 1.5v2.4h2.4" />
    </svg>
  )
}

export default function TypeSemantics({
  tabBar,
  query: externalQuery,
  onFocusChange,
  revealRole,
  railCollapsed = false,
  previewTheme = 'light',
  previewAppearance,
}: {
  tabBar?: ReactNode
  /** Workspace search. When passed, the inner 52px bar (heading + search)
   *  drops so TOKEN NAME lines up with “Text variables”, same as Radius. */
  query?: string
  onFocusChange?: (f: TypeFocus) => void
  /** Preview specimen asked to open this role's row (`key` + `seq` so repeats work). */
  revealRole?: { key: string; seq: number } | null
  railCollapsed?: boolean
  previewTheme?: string
  previewAppearance?: ThemeAppearance
}) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const typography = foundations.typography
  const setTypography = (value: typeof typography) => patch({ typography: value })
  const roles = mergeTypeRoles(typography.roles)
  const [group, setGroup] = useState<TypeFocus>('all')
  const [localQuery, setLocalQuery] = useState('')
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const previewTokens = usePreviewTokens(previewTheme, previewAppearance)
  const controlled = externalQuery !== undefined
  const query = controlled ? externalQuery : localQuery

  useEffect(() => {
    onFocusChange?.(group)
  }, [group, onFocusChange])

  useEffect(() => {
    if (!revealRole?.key) return
    const spec = TYPE_ROLE_BY_KEY[revealRole.key]
    if (!spec) return
    if (!controlled) setLocalQuery('')
    setGroup((g) => (g === 'all' || g === spec.group ? g : spec.group))
    setFlashKey(revealRole.key)
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const id = `type-role-${revealRole.key}`
    const t0 = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
    }, 40)
    const t1 = window.setTimeout(() => setFlashKey(null), 1400)
    return () => {
      window.clearTimeout(t0)
      window.clearTimeout(t1)
    }
  }, [revealRole?.key, revealRole?.seq, controlled])

  function patchRole(key: string, viewport: 'desktop' | 'mobile', alias: TypeAlias) {
    const current = roles[key]
    const next: TypeRoleModes = { ...current, [viewport]: alias }
    setTypography({ ...typography, roles: { ...roles, [key]: next } })
  }

  function resetRole(key: string) {
    const spec = TYPE_ROLES.find((r) => r.key === key)
    if (!spec) return
    setTypography({
      ...typography,
      roles: { ...roles, [key]: { desktop: { ...spec.desktop }, mobile: { ...spec.mobile } } },
    })
  }

  const q = query.trim().toLowerCase()
  const rows = typeRolesInGroup(group).filter((r) =>
    !q || r.key.includes(q) || r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
  )
  const revealFromPreview = (key: string) => {
    const spec = TYPE_ROLE_BY_KEY[key]
    if (!spec) return
    if (!controlled) setLocalQuery('')
    setGroup(spec.group)
    setFlashKey(key)
    window.setTimeout(() => document.getElementById(`type-role-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40)
    window.setTimeout(() => setFlashKey(null), 1400)
  }

  return (
    <div className="flex flex-col bg-app flex-1 min-h-0 h-full">
      <div className="flex items-stretch flex-1 min-h-0">
        <SemanticGroupRail
          ariaLabel="Text role groups"
          active={group}
          collapsed={railCollapsed}
          onChange={setGroup}
          items={[
            { key: 'all', label: 'All', count: TYPE_ROLES.length, shortLabel: 'ALL' },
            ...TYPE_ROLE_GROUPS.map((item) => ({
              key: item.id,
              label: item.label,
              count: typeRolesInGroup(item.id).length,
              hint: item.hint,
            })),
          ]}
        />

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Dropped in the workspace — `ThemeWorkspaceTabs` already carries
              search, and “Text variables” is the rail title. Same rule as
              `VariablesTable` / `Step4`: no inner bar whenever a `query` is
              passed in, so TOKEN NAME lines up with the foundation name. */}
          {!controlled && (
            <div className="foundation-layer-bar flex items-stretch flex-shrink-0 h-[52px] gap-3 pr-3">
              <div className="foundation-layer-title flex flex-1 min-w-0 items-center px-5">{tabBar}</div>
              <div className="self-center flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-app border border-line-strong w-48 max-w-[45%] focus-within:border-fg transition-colors flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-fg-faint flex-shrink-0">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  placeholder="Search…"
                  className="flex-1 min-w-0 bg-transparent text-ui text-fg-muted placeholder:text-fg-faint outline-none"
                  aria-label="Filter text roles"
                />
                {localQuery && (
                  <button onClick={() => setLocalQuery('')} aria-label="Clear filter" className="text-fg-faint hover:text-fg-muted transition-colors w-4 h-4 flex items-center justify-center flex-shrink-0 text-xs">✕</button>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-1 min-w-0 min-h-0">
          <div className="flex-1 min-w-0 overflow-auto">
            <div className="min-w-[42rem]">
              <div className={tableHeaderClass(GRID)}>
                <span className={`${TABLE_HEAD_CELL} pl-4`}>Role</span>
                <span className={`${TABLE_HEAD_CELL} px-3`}>Desktop</span>
                <span className={`${TABLE_HEAD_CELL} px-3`}>Mobile</span>
                <span className={`${TABLE_HEAD_CELL} px-2 gap-1.5 min-w-0`}>
                  <span className="truncate">Preview</span>
                  <span className="ml-auto flex items-center gap-0.5 p-0.5 rounded-md bg-elevated border border-line normal-case tracking-normal font-medium flex-shrink-0">
                    {(['desktop', 'mobile'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setPreviewViewport(v)}
                        aria-pressed={previewViewport === v}
                        title={v === 'desktop' ? 'Preview desktop type' : 'Preview mobile type'}
                        className={`px-1.5 py-0.5 rounded text-mini capitalize transition-colors ${
                          previewViewport === v ? 'bg-app text-fg shadow-sm' : 'text-fg-faint hover:text-fg-muted'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </span>
                </span>
                <span aria-hidden />
              </div>
              {rows.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No roles match “{query}”.</div>
              ) : rows.map((role, i) => {
                const modes = roles[role.key]
                const modified = !roleIsDefault(role.key, modes)
                const style = resolveTypeStyle(modes[previewViewport], typography)
                return (
                  <div
                    key={role.key}
                    id={`type-role-${role.key}`}
                    className={`${rowClass(i)} ${flashKey === role.key ? 'bg-accent-ui/[0.12] ring-1 ring-inset ring-accent-ui/35' : ''}`}
                  >
                    <div className="flex flex-col justify-center py-2.5 pl-4 pr-3 min-w-0 border-r border-line">
                      <span className="flex items-center gap-2 min-w-0">
                        <code className="font-mono text-body text-fg-muted truncate">text-{role.key}</code>
                        {modified && <span className="w-1.5 h-1.5 rounded-full bg-accent-ui flex-shrink-0" title="Modified" />}
                      </span>
                      <span className="text-caption text-fg-faint truncate">{role.description}</span>
                    </div>
                    <ViewportCell
                      roleKey={role.key}
                      viewport="desktop"
                      alias={modes.desktop}
                      onChange={(alias) => patchRole(role.key, 'desktop', alias)}
                    />
                    <ViewportCell
                      roleKey={role.key}
                      viewport="mobile"
                      alias={modes.mobile}
                      onChange={(alias) => patchRole(role.key, 'mobile', alias)}
                    />
                    <div className="flex items-center px-3 py-2 border-r border-line overflow-hidden">
                      <span
                        className="text-fg truncate leading-none"
                        style={{
                          fontFamily: fontStack(style.family),
                          fontSize: Math.min(parseInt(style.size, 10) || 16, 28),
                          fontWeight: style.weight,
                        }}
                      >
                        {role.label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => resetRole(role.key)}
                      disabled={!modified}
                      title="Reset to standard"
                      aria-label={`Reset ${role.label}`}
                      className="flex items-center justify-center w-full h-full py-3 text-fg-faint hover:text-fg disabled:opacity-25 disabled:hover:text-fg-faint transition-colors"
                    >
                      <ResetIcon />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
          <VariablesPreviewPane watch={`${group}/${previewTheme}/${previewAppearance}`} scope={group}>
            <TypeRolesPreview tokens={previewTokens} focus={group} onEditRole={revealFromPreview} />
          </VariablesPreviewPane>
          </div>
        </div>
      </div>
    </div>
  )
}
