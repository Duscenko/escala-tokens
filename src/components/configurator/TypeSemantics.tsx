import { useEffect, useState, type ReactNode } from 'react'
import { usePreviewViewport } from './ViewportRail'
import { useDesignStore } from '../../store/useDesignStore'
import { PLATFORM_LABELS, roleFollowsPlatform, typographyForPlatform } from '../../lib/platformAxis'
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
  aliasesEqual,
  typeRolesInGroup,
  asTypeViewport,
  type TypeAlias,
  type TypeFamilyRole,
  type TypeRoleGroupId,
  type TypeRoleModes,
  type TypeViewport,
  type TypeWeightKey,
} from '../../lib/typeRoles'
import SemanticGroupRail from './SemanticGroupRail'
import type { ThemeAppearance } from '../../lib/themeModes'
import type { GridViewport } from '../../lib/layoutTokens'
import { useI18n } from '../../lib/i18n'

export type TypeFocus = TypeRoleGroupId | 'all'

// The wrapper's `min-w` below is the SUM of these minimums (10 + 22 + 9.5 + 2.5).
// It was 28rem against 38.5rem of columns, so the grid overflowed its own
// wrapper and every row's rules and zebra stopped short of the content: the
// "cut off" table. Keep the two in step. The value column is 22rem so the
// three selects can show `display-2xl` · `Semibold` · `Display` with a
// chevron that isn't sitting on the border.
const GRID = 'grid grid-cols-[minmax(10rem,1.15fr)_minmax(22rem,1.9fr)_minmax(9.5rem,1fr)_2.5rem]'
const GRID_MIN = 'w-fit min-w-[max(100%,44rem)]'

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
  grow = 1,
  minWidth,
  disabled = false,
  title,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  ariaLabel: string
  /** Share of the cell. Size labels (`display-2xl`) are the longest, so they
   *  get the largest share; weight and family are short words. */
  grow?: number
  /** Floor so the closed label (`Display`, `Semibold`) isn't ellipsized once
   *  the chevron has reserved its own inset. */
  minWidth?: string
  disabled?: boolean
  title?: string
}) {
  return (
    <div className="relative min-w-0" style={{ flex: `${grow} 1 0%`, minWidth }} title={title}>
      <select
        aria-label={ariaLabel}
        title={title}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={`w-full min-w-0 h-7 appearance-none rounded-md border border-line bg-app pl-2 pr-6 text-caption font-mono text-fg-muted text-ellipsis focus:outline-none focus-visible:ring-2 focus-visible:ring-fg ${
          disabled
            ? 'cursor-default opacity-55 pointer-events-none'
            : 'cursor-pointer hover:border-line-strong'
        }`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-faint"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}

function ViewportCell({
  roleKey,
  viewport,
  alias,
  onChange,
  disabled = false,
  disabledTitle,
}: {
  roleKey: string
  viewport: string
  alias: TypeAlias
  onChange: (next: TypeAlias) => void
  /** A display/heading row on a native platform: it follows Viewport. */
  disabled?: boolean
  disabledTitle?: string
}) {
  const familyLocked = roleKey !== 'display' || disabled
  return (
    <div className="flex items-center gap-1 px-2.5 py-2 border-r border-line min-w-0">
      <AliasSelect
        grow={1.35}
        minWidth="7.75rem"
        value={alias.size}
        options={SIZE_OPTIONS}
        disabled={disabled}
        title={disabled ? disabledTitle : undefined}
        onChange={(size) => onChange({ ...alias, size })}
        ariaLabel={`${roleKey} ${viewport} size`}
      />
      <AliasSelect
        grow={1.1}
        minWidth="6.5rem"
        value={alias.weight}
        options={WEIGHT_OPTIONS}
        disabled={disabled}
        title={disabled ? disabledTitle : undefined}
        onChange={(weight) => onChange({ ...alias, weight })}
        ariaLabel={`${roleKey} ${viewport} weight`}
      />
      <AliasSelect
        minWidth="6.25rem"
        value={alias.family}
        options={FAMILY_OPTIONS}
        disabled={familyLocked}
        title={disabled ? disabledTitle : familyLocked ? 'Family is set on Display. Headings, body and controls follow the body stack.' : undefined}
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
  previewViewport = 'desktop',
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
  previewViewport?: GridViewport
}) {
  const { foundations, patch } = useThemeFoundations(previewTheme)
  const typography = foundations.typography
  const setTypography = (value: typeof typography) => patch({ typography: value })
  const roles = mergeTypeRoles(typography.roles)
  const [group, setGroup] = useState<TypeFocus>('all')
  const [localQuery, setLocalQuery] = useState('')
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const { t } = useI18n()
  const typeViewport = asTypeViewport(previewViewport)
  // The Platform cut from the rail. On a native platform the body/control
  // rows edit that OS's cut (system-wide, lib/platformAxis) while display and
  // heading rows keep following the viewport — one owner per value.
  const previewPlatform = usePreviewViewport()?.previewPlatform ?? 'web'
  const platformAxis = useDesignStore((st) => st.platformAxis)
  const setPlatformAxis = useDesignStore((st) => st.setPlatformAxis)
  const onNative = previewPlatform !== 'web'
  const viewportLabel =
    previewViewport === 'mobile' ? t('Mobile') : previewViewport === 'tablet' ? t('Tablet') : t('Desktop')
  const platformLabel = onNative ? PLATFORM_LABELS[previewPlatform] : viewportLabel
  const followsViewportTitle = `${t('Follows Viewport')} — ${viewportLabel}`
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

  function patchRole(key: string, viewport: TypeViewport, alias: TypeAlias) {
    if (onNative && roleFollowsPlatform(key)) {
      setPlatformAxis({ typeRoles: { ...platformAxis.typeRoles, [key]: { ...platformAxis.typeRoles[key], [previewPlatform]: alias } } })
      return
    }
    const current = roles[key]
    const next: TypeRoleModes = { ...current, [viewport]: alias }
    setTypography({ ...typography, roles: { ...roles, [key]: next } })
  }

  function resetRole(key: string) {
    if (onNative && roleFollowsPlatform(key)) {
      const { [previewPlatform]: _dropped, ...rest } = platformAxis.typeRoles[key] ?? {}
      const typeRoles = { ...platformAxis.typeRoles }
      if (Object.keys(rest).length) typeRoles[key] = rest
      else delete typeRoles[key]
      setPlatformAxis({ typeRoles })
      return
    }
    const spec = TYPE_ROLES.find((r) => r.key === key)
    if (!spec) return
    const current = roles[key]
    setTypography({
      ...typography,
      roles: { ...roles, [key]: { ...current, [typeViewport]: { ...spec[typeViewport] } } },
    })
  }

  const q = query.trim().toLowerCase()
  const rows = typeRolesInGroup(group).filter((r) =>
    !q || r.key.includes(q) || r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
  )

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
            <div className={GRID_MIN}>
              <div className={tableHeaderClass(GRID)}>
                <span className={`${TABLE_HEAD_CELL} pl-4`}>Role</span>
                <span className={`${TABLE_HEAD_CELL} px-3 text-fg`}>{platformLabel}</span>
                <span className={`${TABLE_HEAD_CELL} px-3`}>Preview</span>
                <span aria-hidden />
              </div>
              {rows.length === 0 ? (
                <div className="px-4 py-12 text-center text-sm text-fg-faint">No roles match “{query}”.</div>
              ) : rows.map((role, i) => {
                const modes = roles[role.key]
                // On a native platform a body/control role shows its OS cut
                // (or the viewport cut it falls back to); display and heading
                // rows show the viewport cut, read-only, with the reason.
                const platformOwned = onNative && roleFollowsPlatform(role.key)
                const native = platformOwned ? platformAxis.typeRoles[role.key]?.[previewPlatform] : undefined
                const alias = native ?? modes[typeViewport]
                const modified = platformOwned ? !!native : !onNative && !aliasesEqual(alias, role[typeViewport])
                const style = resolveTypeStyle(alias, typographyForPlatform(typography, platformAxis, previewPlatform))
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
                      <span className="text-caption text-fg-faint truncate">
                        {onNative ? (platformOwned ? (native ? `${t('Set for')} ${PLATFORM_LABELS[previewPlatform]}` : `${t('Follows')} ${viewportLabel}`) : followsViewportTitle) : role.description}
                      </span>
                    </div>
                    <ViewportCell
                      roleKey={role.key}
                      viewport={onNative ? previewPlatform : typeViewport}
                      alias={alias}
                      disabled={onNative && !platformOwned}
                      disabledTitle={followsViewportTitle}
                      onChange={(next) => patchRole(role.key, typeViewport, next)}
                    />
                    <div className="flex flex-col justify-center gap-1 px-3 py-2 border-r border-line min-w-0 overflow-hidden">
                      <span
                        className="text-fg whitespace-nowrap"
                        title={`${role.label} · ${style.size} / ${style.lineHeight} · ${style.weight} · tracking ${style.letterSpacing}`}
                        style={{
                          fontFamily: fontStack(style.family),
                          fontSize: style.size || '16px',
                          fontWeight: style.weight,
                          lineHeight: style.lineHeight || 'normal',
                          letterSpacing: style.letterSpacing,
                        }}
                      >
                        Ag
                      </span>
                      {/* What the role resolves to on the platform picked in the
                          rail: size / leading / tracking. Tracking follows the
                          size step, so it moves with the size picker. */}
                      <span className="font-mono text-caption tabular-nums text-fg-faint truncate">
                        {style.size} / {style.lineHeight} / {style.letterSpacing}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => resetRole(role.key)}
                      disabled={!modified}
                      title={platformOwned ? `${t('Follow')} ${viewportLabel} ${t('on')} ${PLATFORM_LABELS[previewPlatform]}` : 'Reset to standard'}
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
          </div>
        </div>
      </div>
    </div>
  )
}
