/**
 * A token name that never loses its LAST segment: `content.link.defau…` read
 * as a different token, so the ellipsis goes in the middle —
 * `content.li…default`. Pure CSS (the head truncates, the tail never
 * shrinks), so it adapts to whatever width the row has. The full name is
 * always in the tooltip.
 */
export function MiddleTruncate({ text, className = '' }: { text: string; className?: string }) {
  const cut = Math.max(text.lastIndexOf('.'), text.lastIndexOf('-'))
  if (cut <= 0 || cut >= text.length - 1) return <span className={`min-w-0 truncate ${className}`} title={text}>{text}</span>
  return (
    <span className={`flex min-w-0 ${className}`} title={text}>
      <span className="min-w-0 truncate">{text.slice(0, cut + 1)}</span>
      <span className="flex-shrink-0">{text.slice(cut + 1)}</span>
    </span>
  )
}
