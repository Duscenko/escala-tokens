// Skeleton: shadcn/ui `bases/radix/ui/radio-group.tsx` (MIT, see LICENSE-shadcn.md).
// `Radio` (Escala's single-radio set) is a RadioGroupItem inside a one-item group.
import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

const GroupValue = React.createContext<{ value: string | undefined }>({ value: undefined })

export interface RadioGroupProps extends Omit<React.ComponentProps<typeof RadioGroupPrimitive.Root>, 'dir'> {
  legend?: React.ReactNode
}

function RadioGroup({ legend, className, value, defaultValue, onValueChange, children, ...props }: RadioGroupProps) {
  const [inner, setInner] = React.useState<string | undefined>(defaultValue)
  const current = value ?? inner
  return (
    <GroupValue.Provider value={{ value: current }}>
      <RadioGroupPrimitive.Root
        data-slot="radio-group"
        data-escala="RadioGroup"
        value={current}
        onValueChange={(v) => { setInner(v); onValueChange?.(v) }}
        className={cn('flex flex-col', className)}
        {...props}
      >
        {legend != null && <span data-part="RadioGroup.legend">{legend}</span>}
        {children}
      </RadioGroupPrimitive.Root>
    </GroupValue.Provider>
  )
}

export interface RadioGroupItemProps extends Omit<React.ComponentProps<typeof RadioGroupPrimitive.Item>, 'children'> {
  label?: React.ReactNode
  size?: 'md' | 'sm'
  forceState?: 'Default' | 'Hover' | 'Focused' | 'Disabled'
}

function RadioGroupItem({ label, size = 'md', forceState, className, value, disabled, ...props }: RadioGroupItemProps) {
  const group = React.useContext(GroupValue)
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <label
      data-slot="radio-group-item"
      data-escala="Radio"
      data-checked={group.value === value ? 'True' : 'False'}
      data-size={size === 'sm' ? 'SM' : 'MD'}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      className={cn('inline-flex cursor-pointer items-center aria-disabled:cursor-not-allowed', className)}
    >
      <RadioGroupPrimitive.Item
        data-part="Radio.box"
        value={value}
        disabled={isDisabled}
        className="inline-flex shrink-0 items-center justify-center p-0 outline-none transition-[background-color,border-color,box-shadow] duration-150"
        {...props}
      >
        <RadioGroupPrimitive.Indicator forceMount data-part="Radio.indicator" />
      </RadioGroupPrimitive.Item>
      {label != null && <span data-part="Radio.label">{label}</span>}
    </label>
  )
}

export { RadioGroup, RadioGroupItem }
