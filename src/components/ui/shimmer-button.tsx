import React, { forwardRef, type ComponentPropsWithoutRef } from 'react'

import { cn } from '../../lib/utils'

export interface ColorAgentButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Elevated chrome while the Color Agent panel is open. */
  active?: boolean
}

/** Color Agent trigger — quiet accent ring, 36×36 squircle. */
export const ColorAgentButton = forwardRef<HTMLButtonElement, ColorAgentButtonProps>(
  function ColorAgentButton({ active = false, className, children, type = 'button', ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'group relative isolate flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-[13px]',
          'border border-line-strong bg-surface text-fg-muted',
          'transition-[color,background-color,border-color] duration-200',
          'hover:border-fg-faint hover:text-fg',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg',
          'active:translate-y-px',
          active && 'border-fg-faint bg-elevated text-fg',
          className,
        )}
        {...props}
      >
        {/* Soft accent arc on the border — idle only, slow drift */}
        {!active ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 animate-agent-ring-drift rounded-[13px] opacity-[0.18] [padding:1px] [background:conic-gradient(from_0deg,transparent_0deg,color-mix(in_srgb,var(--accent-ui)_50%,transparent)_48deg,transparent_96deg)] [mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] [mask-composite:exclude] [-webkit-mask-composite:xor]"
          />
        ) : null}
        <span className="relative z-10 flex items-center justify-center">{children}</span>
      </button>
    )
  },
)
