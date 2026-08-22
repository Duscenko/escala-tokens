import type { ReactNode } from 'react'
import Step4_Typography from './Step4_Typography'
import TypeSemantics, { type TypeFocus } from './TypeSemantics'

export type TypeTab = 'primary' | 'semantics'

const TABS: { key: TypeTab; label: string }[] = [
  { key: 'primary', label: 'Primitives' },
  { key: 'semantics', label: 'Semantics' },
]

// Typography hub — Color's primitives/semantics split applied to type.
// Primitives are the scale (family, weight, size, line-height). Semantics
// are named text styles (label, placeholder, heading, …) that alias those
// primitives, with Desktop and Mobile mappings.
export default function TypeHub({
  typeTab,
  onTypeTabChange,
  onFocusChange,
  revealRole,
}: {
  typeTab: TypeTab
  onTypeTabChange: (t: TypeTab) => void
  onFocusChange?: (f: TypeFocus) => void
  revealRole?: { key: string; seq: number } | null
}) {
  const tabBar = (
    <div className="color-hub-tab-strip flex items-end h-full w-full min-w-0">
      {TABS.map((t) => {
        const active = typeTab === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onTypeTabChange(t.key)}
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
      {typeTab === 'primary' ? (
        <div className="flex-1 min-h-0">
          <Step4_Typography tabBar={tabBar} />
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <TypeSemantics tabBar={tabBar} onFocusChange={onFocusChange} revealRole={revealRole} />
        </div>
      )}
    </div>
  )
}
