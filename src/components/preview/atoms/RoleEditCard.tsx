import type { ReactNode } from 'react'
import type { PreviewTokens } from '../ButtonPreview'

export function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.2 2.6 11.4 5.8" />
      <path d="M5.1 11.4 2.6 11.4 2.6 8.9 9.3 2.2c.4-.4 1-.4 1.4 0l1.1 1.1c.4.4.4 1 0 1.4z" />
    </svg>
  )
}

export function RoleEditCard({
  tokens: t,
  token,
  label,
  swatch,
  onEdit,
  children,
}: {
  tokens: PreviewTokens
  token: string
  label: string
  swatch?: ReactNode
  onEdit?: () => void
  children: ReactNode
}) {
  const editable = Boolean(onEdit)
  return (
    <div className={`relative rounded-xl border border-line bg-app px-3 py-2.5 min-w-0 ${editable ? 'group' : ''}`}>
      <div className="flex items-start gap-2 min-w-0 pr-7">
        {swatch}
        <div className="min-w-0 flex-1">
          <span className="block text-[10px] font-mono text-fg-faint truncate">{token}</span>
          <span className="block text-[12px] text-fg truncate">{label}</span>
        </div>
      </div>
      {editable && (
        <button
          type="button"
          onClick={onEdit}
          title={`Edit ${token} in the table`}
          aria-label={`Edit ${token} in the table`}
          className="absolute top-2 right-2 p-1 rounded-md text-fg-faint hover:text-fg hover:bg-elevated group-hover:text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
        >
          <EditIcon />
        </button>
      )}
      <div
        className="mt-2.5 flex flex-wrap items-center gap-2.5 min-w-0"
        style={{
          background: t.surface,
          borderRadius: 12,
          padding: 12,
          border: `1px solid ${t.borderDefault || t.border || '#eaecf0'}`,
        }}
      >
        {children}
      </div>
    </div>
  )
}
