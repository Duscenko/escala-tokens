// File names for catalogue components (escala-ui / shadcn layout). Pure and
// store-free: the agent package imports it, and that package is bundled into
// the Figma plugin. `agentContext.ts` re-exports both helpers.

/** Keys that live in a sibling's file (shadcn groups them that way). */
const FILE_OF: Record<string, string> = { AccordionItem: 'accordion', AvatarStatus: 'avatar', AvatarGroup: 'avatar', RatingGroupItem: 'rating-group', SliderThumb: 'slider', SegmentedControlItem: 'segmented-control', SwitchGroup: 'switch', CheckboxItem: 'checkbox', CheckboxGroup: 'checkbox', FileUploadDropzone: 'file-upload', FileUploadItem: 'file-upload', StatusBadge: 'badge', ButtonGroupItem: 'button-group', ButtonGroupDivider: 'button-group', InputOTPSlot: 'input-otp', PasswordStrengthMeter: 'password-strength', PasswordStrengthRule: 'password-strength', InputTagChip: 'input-tag', InputTagOption: 'input-tag', DatePickerTrigger: 'date-picker', DatePickerPopover: 'date-picker', CalendarDay: 'calendar', CalendarHeader: 'calendar', CalendarMonth: 'calendar', CalendarPresets: 'calendar', CalendarFooter: 'calendar', TableCell: 'table', TableHead: 'table', TableMediaCell: 'table', TableTrendCell: 'table', TableResizer: 'table', TableRow: 'table', TableHeader: 'table', TableFooter: 'table', TableCaption: 'table', TableDropIndicator: 'table', TableEmpty: 'table', TableLoading: 'table', TableLoadMore: 'table', ProgressCircle: 'progress-line', ModalHeader: 'modal', ModalFooter: 'modal', PopoverFooter: 'popover', DropdownMenuLabel: 'dropdown-menu', DropdownMenuItem: 'dropdown-menu', DropdownMenuFooter: 'dropdown-menu', TooltipContent: 'tooltip', TooltipInfoTrigger: 'tooltip', BreadcrumbItem: 'breadcrumb', BreadcrumbEllipsis: 'breadcrumb', BreadcrumbSeparator: 'breadcrumb', TabMenuItem: 'tab-menu', TabMenuLineItem: 'tab-menu' }

/** The escala-ui / shadcn file a catalogue key lives in: kebab case
 *  (`InputOTP` → `input-otp`, `ButtonGroup` → `button-group`) — the same name
 *  the registry serves (`registryItemFor`, asserted in agentContextAudit.test;
 *  the generated sources are too large to import into the app for this). */
export function componentFileName(key: string): string {
  if (FILE_OF[key]) return FILE_OF[key]
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .toLowerCase()
}

/** `import { X } from "@/components/ui/<file>"` for a catalogue key. */
export function componentImportLine(key: string): string {
  return `import { ${key.replace(/\s+/g, '')} } from "@/components/ui/${componentFileName(key)}"`
}
