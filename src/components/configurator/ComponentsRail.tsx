import { useMemo, type ComponentType } from 'react'
import { useDesignStore } from '../../store/useDesignStore'
import { COMPONENTS, CATEGORIES, type ComponentDef } from '../../lib/componentCatalogue'
import { RAIL_COLLAPSED_WIDTH, RAIL_WIDTH } from './SectionRail'

function CatalogueCheck() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M2 5.2 4 7.2 8 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SidebarToggleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <line x1="9.5" y1="4" x2="9.5" y2="20" />
    </svg>
  )
}

/** Components' left rail — categories with their catalogue rows nested underneath,
 *  replacing the old split of SectionRail (categories only) + ComponentsView
 *  master list (duplicate headers). */
export default function ComponentsRail({
  icons,
  active,
  onSelect,
  search = '',
  collapsed,
  onToggleCollapse,
}: {
  icons: Record<string, ComponentType>
  active: ComponentDef | null
  onSelect: (c: ComponentDef) => void
  search?: string
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const selectedComponents = useDesignStore((s) => s.selectedComponents)
  const toggleComponent = useDesignStore((s) => s.toggleComponent)
  const activeKey = active?.key ?? null
  const activeCategory = active?.category ?? CATEGORIES[0]

  const q = search.trim().toLowerCase()
  const groups = useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        cat,
        items: COMPONENTS.filter(
          (c) =>
            c.category === cat &&
            (!q || c.label.toLowerCase().includes(q) || c.key.toLowerCase().includes(q)),
        ),
      })).filter((g) => g.items.length > 0),
    [q],
  )

  return (
    <div
      style={{ width: collapsed ? RAIL_COLLAPSED_WIDTH : RAIL_WIDTH }}
      className="flex-shrink-0 flex flex-col min-h-0 transition-[width] duration-200"
    >
      <div
        className={`flex items-center h-[52px] flex-shrink-0 border-b border-line/60 ${
          collapsed ? 'justify-center px-0' : 'justify-between pl-3 pr-2'
        }`}
      >
        {!collapsed && <span className="text-[13px] font-semibold text-fg truncate">Components</span>}
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-fg-faint hover:text-fg hover:bg-white/60 dark:hover:bg-white/10 transition-colors"
        >
          <SidebarToggleIcon />
        </button>
      </div>

      <nav aria-label="Components" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pt-2 pb-3 flex flex-col gap-1">
        {groups.length === 0 && !collapsed && (
          <p className="text-[11px] text-fg-faint px-2 pt-1 leading-relaxed">No components match “{search.trim()}”.</p>
        )}

        {collapsed
          ? groups.map(({ cat, items }) => {
              const Icon = icons[cat]
              const on = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => onSelect(items[0])}
                  aria-current={on ? 'page' : undefined}
                  title={cat}
                  className={`flex items-center h-9 w-9 mx-auto justify-center rounded-xl transition-all ${
                    on
                      ? 'bg-white text-accent-ui shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)] dark:bg-white/12 dark:shadow-none'
                      : 'text-fg-muted hover:text-fg hover:bg-white/60 dark:hover:bg-white/10'
                  }`}
                >
                  {Icon ? (
                    <span className={on ? '' : 'text-fg-faint'}>
                      <Icon />
                    </span>
                  ) : null}
                </button>
              )
            })
          : groups.map(({ cat, items }) => {
              const Icon = icons[cat]
              const categoryActive = activeCategory === cat
              const first = items[0]
              return (
                <div key={cat} className="flex flex-col gap-0.5">
                  <button
                    onClick={() => first && onSelect(first)}
                    aria-current={categoryActive && activeKey === first?.key ? 'page' : undefined}
                    title={cat}
                    className={`flex items-center h-9 w-full gap-2 px-2.5 rounded-xl text-[13px] text-left transition-all ${
                      categoryActive
                        ? 'bg-white text-accent-ui font-medium shadow-[0_2px_10px_-2px_rgba(0,0,0,0.15)] dark:bg-white/12 dark:shadow-none'
                        : 'text-fg-muted hover:text-fg hover:bg-white/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {Icon ? (
                      <span className={`flex-shrink-0 ${categoryActive ? '' : 'text-fg-faint'}`}>
                        <Icon />
                      </span>
                    ) : null}
                    <span className="truncate">{cat}</span>
                  </button>

                  <div className="flex flex-col gap-0.5 pl-2 ml-2 border-l border-line/60">
                    {items.map((comp) => {
                      const isSelected = selectedComponents.includes(comp.key)
                      const isActive = comp.key === activeKey
                      return (
                        <div
                          key={comp.key}
                          role="button"
                          tabIndex={0}
                          aria-current={isActive ? 'page' : undefined}
                          onClick={() => onSelect(comp)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              onSelect(comp)
                            }
                          }}
                          className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-[12px] cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-surface text-fg border border-line shadow-sm'
                              : 'text-fg-muted hover:bg-elevated/40 hover:text-fg border border-transparent'
                          }`}
                        >
                          <span className="truncate min-w-0">{comp.label}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleComponent(comp.key)
                            }}
                            className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected ? 'bg-fg text-app' : 'bg-elevated border border-line-strong'
                            }`}
                            aria-label={
                              isSelected ? `Remove ${comp.label} from the system` : `Add ${comp.label} to the system`
                            }
                          >
                            {isSelected && <CatalogueCheck />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
      </nav>
    </div>
  )
}
