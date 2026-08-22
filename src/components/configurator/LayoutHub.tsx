import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import LayoutSemantics from './LayoutSemantics'
import type { LayoutFamily } from '../../lib/layoutTokens'

export type LayoutTab = 'primary' | 'semantics'

const TABS: { key: LayoutTab; label: string }[] = [
  { key: 'primary', label: 'Primitives' },
  { key: 'semantics', label: 'Semantics' },
]

export default function LayoutHub({
  family,
  Primitives,
  Semantics,
  revealRole,
}: {
  family: LayoutFamily
  Primitives: ComponentType<{ tabBar?: ReactNode }>
  Semantics?: ComponentType<{ family?: LayoutFamily; tabBar?: ReactNode; revealRole?: { key: string; seq: number } | null }>
  revealRole?: { key: string; seq: number } | null
}) {
  const [tab, setTab] = useState<LayoutTab>('primary')
  const Sem = Semantics ?? LayoutSemantics

  useEffect(() => {
    if (!revealRole?.key) return
    setTab('semantics')
  }, [revealRole?.key, revealRole?.seq])

  const tabBar = (
    <div className="color-hub-tab-strip flex items-end h-full w-full min-w-0">
      {TABS.map((t) => {
        const active = tab === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={active}
            className={`color-hub-tab ${active ? 'color-hub-tab-active' : ''}`}
          >
            <span className="relative grid place-items-center">
              <span aria-hidden className="invisible font-semibold col-start-1 row-start-1">{t.label}</span>
              <span className="col-start-1 row-start-1">{t.label}</span>
            </span>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="h-full flex flex-col min-h-0">
      {tab === 'primary' ? (
        <div className="flex-1 min-h-0">
          <Primitives tabBar={tabBar} />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <Sem family={family} tabBar={tabBar} revealRole={revealRole} />
        </div>
      )}
    </div>
  )
}
