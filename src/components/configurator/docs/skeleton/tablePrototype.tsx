// The Figma «Table Prototype» (section 1025:2250), composed from the parts: a people table with select-all,
// row selection, sortable Name / Join date, a pinned Name column and a resizable Role column.
// Contract: design-plans/table-prototype-contract.md. Owner's call (2026-11-13): the people avatars are sm (32), not the
// file's default (40) — the gradient stand-in reads heavier than the file's photos. A composition for docs and stories — not a part.
import * as React from 'react'
import { Avatar } from '../../../escala-ui/avatar'
import { Badge } from '../../../escala-ui/badge'
import { Checkbox as EscalaCheckbox } from '../../../escala-ui/checkbox'
import { ProgressLine } from '../../../escala-ui/progress-line'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, type TableDividers, type TableSize, type TableSort } from '../../../escala-ui/table'
import { avatarGradientSrc, AVATAR_GRADIENT_HUES } from '../../../../lib/avatarGradient'

export interface Person {
  id: string; name: string; email: string; department: string; role: string
  status: 'Active' | 'On leave' | 'Inactive'; joined: string; joinedAt: number; progress: number; disabled?: boolean
}

/** The file's five people, verbatim. */
export const PEOPLE: Person[] = [
  { id: 'olivia', name: 'Olivia Martin', email: 'olivia@escala.design', department: 'Design', role: 'Lead Designer', status: 'Active', joined: 'Jan 12, 2025', joinedAt: 20250112, progress: 75 },
  { id: 'karim', name: 'Karim Haddad', email: 'karim@escala.design', department: 'Engineering', role: 'Senior Engineer', status: 'Active', joined: 'Mar 3, 2025', joinedAt: 20250303, progress: 50 },
  { id: 'sofia', name: 'Sofia Rossi', email: 'sofia@escala.design', department: 'Product', role: 'Product Manager', status: 'On leave', joined: 'Aug 21, 2025', joinedAt: 20250821, progress: 25 },
  { id: 'ethan', name: 'Ethan Walsh', email: 'ethan@escala.design', department: 'Marketing', role: 'Growth Lead', status: 'Active', joined: 'Nov 5, 2024', joinedAt: 20241105, progress: 100 },
  { id: 'noah', name: 'Noah Dubois', email: 'noah@escala.design', department: 'Design', role: 'Product Designer', status: 'Inactive', joined: 'Jun 18, 2024', joinedAt: 20240618, progress: 0, disabled: true },
]
const STATUS_VARIANT = { Active: 'success', 'On leave': 'warning', Inactive: 'secondary' } as const
/** The file's column widths at 1440. The last one (264) runs 2px past the 1438 the table's edge leaves; the file clips
 *  it. Here it takes what is left (262), or a 1440 table would scroll by 2px. */
const WIDTHS = [56, 320, 200, 240, 160, 200, 262]

type SortKey = 'name' | 'joined'
export interface TablePrototypeProps {
  size?: TableSize
  dividers?: TableDividers
  appearance?: 'filled' | 'ghost'
  /** Pins the Name column (and draws its edge). Dark example: true. */
  pinned?: boolean
  /** Pins the Role handle in its Resizing state (Border/accent). Off by default: the file's accent line between Role and
   *  Status read as a stray divider (owner's call, 2026-11-13); the handle is still there, and hover / drag light it. */
  resizing?: boolean
  /** Header over scrolled content (a stronger bottom hairline). */
  scrolled?: boolean
  /** Initial sort. Light: name ascending; Dark: joined descending. */
  defaultSort?: { key: SortKey; dir: 'ascending' | 'descending' }
  /** Initially selected ids (the file selects Sofia). */
  defaultSelected?: string[]
  /** Pins a row state for docs (the file shows Hover on Ethan). */
  forceHover?: string
  width?: number
}

export function TablePrototype({
  size = 'default', dividers = 'rows', appearance = 'filled', pinned = false, resizing = false, scrolled = false,
  defaultSort = { key: 'name', dir: 'ascending' }, defaultSelected = ['sofia'], forceHover = 'ethan', width = 1440,
}: TablePrototypeProps) {
  const [sort, setSort] = React.useState(defaultSort)
  // The file lists the people in its own order and only marks the sorted column; rows reorder once someone sorts.
  const [sorted, setSorted] = React.useState(false)
  const [selected, setSelected] = React.useState<string[]>(defaultSelected)
  const people = React.useMemo(() => {
    if (!sorted) return PEOPLE
    const dir = sort.dir === 'ascending' ? 1 : -1
    return [...PEOPLE].sort((a, b) => dir * (sort.key === 'name' ? a.name.localeCompare(b.name) : a.joinedAt - b.joinedAt))
  }, [sort, sorted])
  const enabled = PEOPLE.filter((p) => !p.disabled).map((p) => p.id)
  const all = enabled.every((id) => selected.includes(id))
  const none = !enabled.some((id) => selected.includes(id))
  const toggleSort = (key: SortKey) => { setSorted(true); setSort((s) => ({ key, dir: s.key === key && s.dir === 'ascending' ? 'descending' : 'ascending' })) }
  const sortOf = (key: SortKey): TableSort => (sort.key === key ? sort.dir : 'none')
  const pin = pinned ? 'start' : 'none'
  const cw = (i: number) => ({ flex: `${i === WIDTHS.length - 1 ? 1 : 0} 0 ${(WIDTHS[i] * width) / 1440}px`, minWidth: 0 })
  return (
    <div style={{ width, maxWidth: '100%', overflowX: 'auto' }}>
      <Table size={size} dividers={dividers} appearance={appearance} aria-label="Team members">
        <TableHeader scrolled={scrolled}>
          <TableHead style={cw(0)} labelVisible={false} leadingVisible aria-label="Select all"
            leading={<Checkbox all={all} none={none} onChange={(on) => setSelected(on ? enabled : [])} size={size} label="Select all rows" />} />
          <TableHead style={cw(1)} label="Name" sort={sortOf('name')} pinned={pin} onSort={() => toggleSort('name')} />
          <TableHead style={cw(2)} label="Department" />
          <TableHead style={cw(3)} label="Role" resizerVisible={dividers === 'grid' || resizing} resizing={resizing} />
          <TableHead style={cw(4)} label="Status" />
          <TableHead style={cw(5)} label="Join date" sort={sortOf('joined')} onSort={() => toggleSort('joined')} />
          <TableHead style={cw(6)} label="Progress" />
        </TableHeader>
        <TableBody>
          {people.map((p) => {
            const on = selected.includes(p.id)
            const st = p.disabled ? 'Disabled' : 'Default'
            const hue = AVATAR_GRADIENT_HUES[PEOPLE.indexOf(p) % AVATAR_GRADIENT_HUES.length]
            return (
              <TableRow key={p.id} interactive selected={on} disabled={p.disabled} forceState={!on && !p.disabled && p.id === forceHover ? 'Hover' : undefined}>
                <TableCell style={cw(0)} state={st} labelVisible={false} leadingVisible
                  leading={<Checkbox all={on} none={!on} disabled={p.disabled} size={size} label={`Select ${p.name}`} onChange={(v) => setSelected((s) => (v ? [...s, p.id] : s.filter((x) => x !== p.id)))} />} />
                <TableCell style={cw(1)} state={st} pinned={pin} label={p.name} description={p.email} descriptionVisible leadingVisible
                  leading={<Avatar size="sm" src={avatarGradientSrc(hue)} alt="" />} />
                <TableCell style={cw(2)} state={st} labelVisible={false} leadingVisible leading={<Badge size="sm" shape="pill" variant="secondary" appearance="soft">{p.department}</Badge>} />
                <TableCell style={cw(3)} state={st} label={p.role} />
                <TableCell style={cw(4)} state={st} labelVisible={false} leadingVisible leading={<Badge size="sm" shape="pill" variant={STATUS_VARIANT[p.status]} appearance="soft">{p.status}</Badge>} />
                <TableCell style={cw(5)} state={st} label={p.joined} />
                <TableCell style={cw(6)} state={st} labelVisible={false} leadingVisible leading={<ProgressLine size="xs" appearance="solid" value={p.progress} aria-label={`${p.name} progress`} style={{ width: 160 }} />} />
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function Checkbox({ all, none, onChange, size, label, disabled }: { all: boolean; none: boolean; onChange: (on: boolean) => void; size: TableSize; label: string; disabled?: boolean }) {
  return (
    <EscalaCheckbox
      size={size === 'xs' || size === 'sm' ? 'sm' : 'default'}
      aria-label={label}
      disabled={disabled}
      checked={all ? true : none ? false : 'indeterminate'}
      onCheckedChange={(v) => onChange(v === true)}
    />
  )
}
