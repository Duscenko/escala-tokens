// Escala components: PasswordStrength · PasswordStrengthMeter · PasswordStrengthRule —
// the Figma `PasswordStrength` page (design-plans/password-strength-contract.md).
// PasswordStrength (417:679): a card with the rules checklist (RulesVisible), the meter
// and the level label; `size` xs · sm · default, `strength` 0–5 — or `value`, scored as
// the number of rules it meets (the file's Strength n = the first n rules met).
// PasswordStrengthMeter (417:131): five segments, the first `strength` filled.
// PasswordStrengthRule (417:156): a check or an empty ring and the label, `met`.
// Paint: the three recipes.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'

export const PASSWORD_STRENGTH_SIZES = ['xs', 'sm', 'default'] as const
export type PasswordStrengthSize = (typeof PASSWORD_STRENGTH_SIZES)[number]
export type Strength = 0 | 1 | 2 | 3 | 4 | 5

export interface PasswordRule { label: string; test: (password: string) => boolean }

/** The file's five rules, in its order. */
export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
  { label: 'One special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

/** The level label per Strength (the file's copy; hidden at 0). */
export const STRENGTH_LABELS = ['Too Weak', 'Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'] as const

/** How many rules a password meets (0–5): the Strength the file draws. */
export function scorePassword(password: string, rules: PasswordRule[] = PASSWORD_RULES): Strength {
  return Math.min(5, rules.filter((r) => r.test(password)).length) as Strength
}

export interface PasswordStrengthRuleProps extends React.ComponentProps<'div'> {
  size?: PasswordStrengthSize
  /** Figma Met. */
  met?: boolean
  /** Figma Label. */
  label?: React.ReactNode
}

function PasswordStrengthRule({ size = 'default', met = true, label = 'At least 8 characters', className, ...props }: PasswordStrengthRuleProps) {
  return (
    <div
      data-slot="password-strength-rule"
      data-escala="PasswordStrengthRule"
      data-size={size}
      data-met={String(met)}
      className={cn('inline-flex items-center', className)}
      {...props}
    >
      {met ? (
        <span data-part="PasswordStrengthRule.icon" className="inline-flex shrink-0 [&>svg]:size-full">{glyph('check')}</span>
      ) : (
        <span data-part="PasswordStrengthRule.marker" aria-hidden className="shrink-0" />
      )}
      <span data-part="PasswordStrengthRule.label">
        {label}
        <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
      </span>
    </div>
  )
}

export interface PasswordStrengthMeterProps extends React.ComponentProps<'div'> {
  size?: PasswordStrengthSize
  strength?: Strength
}

function PasswordStrengthMeter({ size = 'default', strength = 0, className, ...props }: PasswordStrengthMeterProps) {
  return (
    <div
      data-slot="password-strength-meter"
      data-escala="PasswordStrengthMeter"
      data-size={size}
      data-strength={String(strength)}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={strength}
      aria-label={props['aria-label'] ?? 'Password strength'}
      className={cn('flex w-full', className)}
      {...props}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} data-part="PasswordStrengthMeter.segment" data-on={i < strength ? 'true' : undefined} className="min-w-0 flex-1" />
      ))}
    </div>
  )
}

export interface PasswordStrengthProps extends React.ComponentProps<'div'> {
  size?: PasswordStrengthSize
  /** Figma Strength; omit it to score `value`. */
  strength?: Strength
  /** The password to score (the number of rules met). */
  value?: string
  /** Figma RulesVisible. */
  rulesVisible?: boolean
  /** The checklist; defaults to the file's five rules. */
  rules?: PasswordRule[]
  /** The level label per Strength 0–5 (translatable). */
  labels?: readonly string[]
}

function PasswordStrength({
  size = 'default', strength, value = '', rulesVisible = true, rules = PASSWORD_RULES, labels = STRENGTH_LABELS, className, ...props
}: PasswordStrengthProps) {
  const level: Strength = strength ?? scorePassword(value, rules)
  // Pinned: the first `level` rules are met, as the file draws it. Live: each rule tests the value.
  const met = (rule: PasswordRule, i: number) => (strength != null ? i < level : rule.test(value))
  return (
    <div
      data-slot="password-strength"
      data-escala="PasswordStrength"
      data-size={size}
      data-strength={String(level)}
      className={cn('flex flex-col', className)}
      {...props}
    >
      {rulesVisible ? (
        <div data-part="PasswordStrength.rules" className="flex flex-col items-start">
          {rules.map((rule, i) => <PasswordStrengthRule key={rule.label} size={size} met={met(rule, i)} label={rule.label} />)}
        </div>
      ) : null}
      <PasswordStrengthMeter size={size} strength={level} />
      <span data-part="PasswordStrength.level" aria-live="polite" className={level === 0 ? 'sr-only' : undefined}>
        {labels[level]}
      </span>
    </div>
  )
}

export { PasswordStrength, PasswordStrengthMeter, PasswordStrengthRule }
