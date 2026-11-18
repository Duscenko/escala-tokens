import { c, NONE, part, type ComponentRecipe, type SlotProps} from './helpers.js'

// ── Card ───────────────────────────────────────────────────────────────────

// shadcn's Card, `size` default | sm: the card's spacing (`--card-spacing`)
// is the `inset-surface` role at default — the dial a designer moves — and
// one step tighter at sm. No CardLink: a footer link is a link Button.
export const CARD: ComponentRecipe = {
  key: 'Card',
  slots: ['root', 'header', 'title', 'description', 'action', 'content', 'footer'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      root: {
        fill: c('surface.layer-1'), stroke: c('border.subtle'), strokeWidth: 'stroke.control', text: c('content.primary'),
        radius: 'radius.container', shadow: 'shadow.xs',
      },
      header: { gap: 'spacing.1' },
      description: { text: c('content.secondary'), font: 'type.body-sm' },
      content: { text: c('content.primary'), font: 'type.body-sm' },
      footer: { gap: 'spacing.gap-control' },
    })),
    part({ Size: ['default', 'sm'] as const }, (size) => ({
      root: size === 'sm'
        ? { paddingX: 'spacing.4', paddingY: 'spacing.4', gap: 'spacing.4' }
        : { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface', gap: 'spacing.inset-surface' },
      title: { text: c('content.primary'), font: size === 'sm' ? 'type.label' : 'type.heading-sm' },
    })),
  ],
}


// ── Modal, ModalHeader, ModalFooter ────────────────────────────────────────
// The Figma sets (design-plans/modal-contract.md; Modal 967:102 · ModalHeader 965:81 · ModalFooter 966:114). The Modal is a
// 480 (default) / 640 (lg) card on Surface/layer-2 with a 1px Border/default edge, Radius/overlay and the Shadow/xl stack
// (the frame clips, so its ring and negative spreads DO paint: `lift: modal`). Its `main` pads 20 with 16 between the
// header and the content; the footer sits under it; the close is a ghost pill CloseButton 20 from the corner.

export const MODAL_SIZES = ['default', 'lg'] as const
export const MODAL_HEADER_ALIGNS = ['horizontal', 'vertical-left', 'vertical-center'] as const
export const MODAL_FOOTER_LAYOUTS = ['inline', 'stacked'] as const

export const MODAL: ComponentRecipe = {
  key: 'Modal',
  slots: ['root', 'overlay', 'main', 'content', 'close'],
  detachedSlots: ['overlay'],
  defaults: { Size: 'default' },
  parts: [
    part({}, () => ({
      overlay: { fill: c('surface.overlay') },
      root: {
        fill: c('surface.layer-2'), stroke: c('border.default'), strokeWidth: 'stroke.divider',
        radius: 'radius.overlay', lift: 'modal',
      },
      main: { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface', gap: 'spacing.gap-group' },
      content: { gap: 'spacing.gap-group', text: c('content.secondary'), font: 'type.body-md' },
    })),
    part({ Size: MODAL_SIZES }, (size) => ({
      // 480 = 3 × 128 + 96; 640 = 5 × 128 (the file's widths have no variable).
      root: { width: size === 'lg' ? 'spacing.32+spacing.32+spacing.32+spacing.32+spacing.32' : 'spacing.32+spacing.32+spacing.32+spacing.24' },
    })),
  ],
}

export const MODAL_HEADER: ComponentRecipe = {
  key: 'ModalHeader',
  slots: ['root', 'content', 'title', 'description', 'trailing', 'clearance'],
  defaults: { Size: 'default', Align: 'horizontal' },
  parts: [
    part({}, () => ({
      root: { gap: 'spacing.gap-group' },
      content: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary') },
      description: { text: c('content.secondary') },
      trailing: { gap: 'spacing.gap-control' },
    })),
    part({ Size: MODAL_SIZES }, (size) => ({
      title: { font: size === 'lg' ? 'type.heading-xs' : 'type.heading-2xs' },
      // The file's ModalHeader set draws the description at Type/body-md in BOTH sizes (header 53 / 58 tall; it was body-sm at
      // default when the Modal was first built, 2026-11-13).
      description: { font: 'type.body-md' },
      clearance: size === 'lg'
        ? { width: 'size.md', height: 'size.md' }
        : { width: 'size.sm', height: 'size.sm' },
    })),
  ],
}

export const MODAL_FOOTER: ComponentRecipe = {
  key: 'ModalFooter',
  slots: ['root', 'leading', 'actions'],
  defaults: { Size: 'default', Layout: 'inline' },
  parts: [
    part({}, () => ({
      // A hairline along the TOP only (Border/subtle, inside); the padding is the surface inset on every side.
      root: {
        paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface', gap: 'spacing.gap-control',
        stroke: c('border.subtle'), strokeTopWidth: 'stroke.divider',
      },
      leading: { gap: 'spacing.gap-tight', text: c('content.secondary'), font: 'type.caption' },
      actions: { gap: 'spacing.gap-control' },
    })),
  ],
}

// ── Separator ──────────────────────────────────────────────────────────────

// The Figma Separator (402:9063; design-plans/separator-contract.md): a 1px line, solid or dashed (4 · 4), horizontal or
// vertical, optionally with a label at its start, centre or end. Tone picks the line colour.
export const SEPARATOR_ALIGNS = ['none', 'start', 'center', 'end'] as const
export const SEPARATOR_ORIENTATIONS = ['horizontal', 'vertical'] as const
export const SEPARATOR_TONES = ['default', 'subtle', 'strong'] as const
export const SEPARATOR_VARIANTS = ['dashed', 'default'] as const

export const SEPARATOR: ComponentRecipe = {
  key: 'Separator',
  slots: ['root', 'line', 'label'],
  defaults: { Align: 'none', Orientation: 'horizontal', Tone: 'default', Variant: 'default' },
  parts: [
    part({}, () => ({ root: { gap: 'spacing.gap-group' }, label: { text: c('content.secondary'), font: 'type.label' } })),
    part({ Orientation: SEPARATOR_ORIENTATIONS }, (o) => ({ line: o === 'horizontal' ? { height: 'stroke.divider' } : { width: 'stroke.divider' } })),
    part({ Tone: SEPARATOR_TONES }, (tone) => ({ line: { paint: c(tone === 'subtle' ? 'border.subtle' : tone === 'strong' ? 'border.strong' : 'border.default') } })),
  ],
}

// ── Accordion + AccordionItem ──────────────────────────────────────────────
// The Figma sets (design-plans/accordion-contract.md; Accordion 451:375, 6 variants; AccordionItem 451:188, 18:
// Variant × State Closed · Open · Disabled). An item is a trigger (20px glyph, the label, a chevron; 20px of
// padding above and below, 16px between them) over a content block (20px below; text on Content/secondary).
// Variant: ghost-default (bare), ghost-underline (a 1px rule below), ghost-rounded (Radius/container, Surface/muted
// only when open), outline-rounded / outline-sharp (Surface/page, 1px edge: Border/default closed, /strong open,
// /subtle disabled; Radius/container or none), filled-rounded (Surface/muted). Rounded and outline variants
// pad the sides 20px. Items sit 0 apart (ghost-default, ghost-underline) or 8 apart (the rest).

export const ACCORDION_VARIANTS = ['ghost-default', 'ghost-underline', 'ghost-rounded', 'outline-rounded', 'outline-sharp', 'filled-rounded'] as const
export const ACCORDION_ITEM_STATES = ['Closed', 'Open', 'Disabled'] as const

export const ACCORDION: ComponentRecipe = {
  key: 'Accordion',
  slots: ['root'],
  defaults: { Variant: 'ghost-default' },
  parts: [
    part({ Variant: ACCORDION_VARIANTS }, (variant) => ({
      root: { gap: variant === 'ghost-default' || variant === 'ghost-underline' ? 'spacing.none' : 'spacing.gap-control' },
    })),
  ],
}

function accordionItemShell(variant: string, state: string): SlotProps {
  const open = state === 'Open'
  switch (variant) {
    case 'ghost-underline':
      return { fill: NONE, stroke: c(state === 'Disabled' ? 'border.subtle' : 'border.default'), strokeBottomWidth: 'stroke.divider' }
    case 'ghost-rounded':
      return { fill: open ? c('surface.muted') : NONE, radius: 'radius.container' }
    case 'outline-rounded':
    case 'outline-sharp':
      return {
        fill: c('surface.page'), strokeWidth: 'stroke.control', radius: variant === 'outline-sharp' ? 'radius.none' : 'radius.container',
        stroke: c(state === 'Disabled' ? 'border.subtle' : open ? 'border.strong' : 'border.default'),
      }
    case 'filled-rounded':
      return { fill: c('surface.muted'), radius: 'radius.container' }
    default:
      return { fill: NONE }
  }
}

export const ACCORDION_ITEM: ComponentRecipe = {
  key: 'AccordionItem',
  slots: ['root', 'trigger', 'icon', 'label', 'chevron', 'content'],
  defaults: { Variant: 'ghost-default', State: 'Closed' },
  parts: [
    part({}, () => ({
      trigger: { paddingY: 'spacing.inset-surface', gap: 'spacing.gap-group' },
      icon: { width: 'icon.medium', height: 'icon.medium', text: c('content.secondary') },
      // Figma binds the trigger label to the `heading-2xs` role (16/25), not `label` (comment 2007003612, 2026-11-16).
      label: { font: 'type.heading-2xs', text: c('content.primary') },
      chevron: { width: 'icon.medium', height: 'icon.medium', text: c('content.secondary') },
      content: { font: 'type.body-md', text: c('content.secondary'), paddingBottom: 'spacing.inset-surface' },
    })),
    part({ Variant: ACCORDION_VARIANTS }, (variant) => {
      const side = variant === 'ghost-default' || variant === 'ghost-underline' ? 'spacing.none' : 'spacing.inset-surface'
      return { trigger: { paddingX: side }, content: { paddingX: side } }
    }),
    part({ Variant: ACCORDION_VARIANTS, State: ACCORDION_ITEM_STATES }, (variant, state) => {
      const disabled = state === 'Disabled'
      return {
        root: accordionItemShell(variant, state),
        ...(disabled ? { icon: { text: c('content.disabled') }, label: { text: c('content.disabled') }, chevron: { text: c('content.disabled') } } : {}),
      }
    }),
  ],
}

// ── Image ──────────────────────────────────────────────────────────────────
// The Figma set (design-plans/image-contract.md, 1126:15, 12 variants: Ratio auto · 16:9 · 4:3 · 3:2 · 1:1 · 3:4
// × Shape square · rounded): a clipped box on Surface/muted (the ratio is the component's aspect-ratio), square =
// Radius/none, rounded = Radius/container.
export const IMAGE_RATIOS = ['auto', '16:9', '4:3', '3:2', '1:1', '3:4'] as const
export const IMAGE_SHAPES = ['square', 'rounded'] as const

export const IMAGE: ComponentRecipe = {
  key: 'Image',
  slots: ['root', 'media'],
  defaults: { Ratio: 'auto', Shape: 'square' },
  parts: [
    part({ Ratio: IMAGE_RATIOS }, () => ({ root: { fill: c('surface.muted') } })),
    part({ Shape: IMAGE_SHAPES }, (shape) => ({ root: { radius: shape === 'square' ? 'radius.none' : 'radius.container' } })),
  ],
}

// ── Popover, PopoverFooter ─────────────────────────────────────────────────
// The Figma sets (design-plans/popover-contract.md; Popover 973:364, PopoverFooter 972:279). `root` is the transparent wrapper
// that holds the 8px arrow frame and the `panel` (320 / 256 / 360 wide, Radius/overlay, Surface/layer-2, a 1px Border/default
// edge, Shadow/md · md · lg: the panel clips, so the ring and spreads paint). The body pads 20 / 12 / 20.

export const POPOVER_SIZES = ['default', 'sm', 'lg'] as const
export const POPOVER_SIDES = ['bottom', 'top', 'left', 'right'] as const
export const POPOVER_FOOTER_LAYOUTS = ['inline', 'stacked'] as const

export const POPOVER: ComponentRecipe = {
  key: 'Popover',
  slots: ['root', 'panel', 'arrow', 'media', 'body', 'header', 'title', 'description', 'content', 'close'],
  defaults: { Size: 'default', Side: 'bottom' },
  parts: [
    part({}, () => ({
      panel: { fill: c('surface.layer-2'), stroke: c('border.default'), strokeWidth: 'stroke.divider', radius: 'radius.overlay' },
      arrow: { paint: c('surface.layer-2'), text: c('border.default') },
      header: { gap: 'spacing.gap-tight' },
      title: { text: c('content.primary') },
      description: { text: c('content.secondary') },
      content: { text: c('content.secondary'), font: 'type.body-sm' },
    })),
    part({ Size: POPOVER_SIZES }, (size) => ({
      // 320 = 128 + 128 + 64; 256 = 128 + 128; 360 = 128 + 128 + 96 + 8 (the file's widths have no variable).
      panel: {
        width: size === 'sm' ? 'spacing.32+spacing.32' : size === 'lg' ? 'spacing.32+spacing.32+spacing.24+spacing.2' : 'spacing.32+spacing.32+spacing.16',
        lift: size === 'lg' ? 'popover-lg' : 'popover-md',
      },
      media: { height: 'spacing.32+spacing.4' },
      body: size === 'sm'
        ? { paddingX: 'spacing.inset-control', paddingY: 'spacing.inset-control', gap: 'spacing.gap-control' }
        : { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface', gap: size === 'lg' ? 'spacing.gap-group' : 'spacing.gap-control' },
      title: { font: size === 'sm' ? 'type.heading-2xs' : size === 'lg' ? 'type.heading-sm' : 'type.heading-xs' },
      description: { font: size === 'lg' ? 'type.body-md' : 'type.body-sm' },
      content: { gap: size === 'lg' ? 'spacing.gap-group' : 'spacing.gap-control', font: size === 'lg' ? 'type.body-md' : 'type.body-sm' },
    })),
  ],
}

export const POPOVER_FOOTER: ComponentRecipe = {
  key: 'PopoverFooter',
  slots: ['root', 'leading', 'actions'],
  defaults: { Size: 'default', Layout: 'inline' },
  parts: [
    part({}, () => ({
      root: {
        paddingX: 'spacing.inset-control', paddingY: 'spacing.inset-control', gap: 'spacing.gap-control',
        stroke: c('border.subtle'), strokeTopWidth: 'stroke.divider',
      },
      leading: { gap: 'spacing.gap-tight', text: c('content.secondary'), font: 'type.caption' },
      actions: { gap: 'spacing.gap-control' },
    })),
  ],
}

// ── TooltipContent, TooltipInfoTrigger ─────────────────────────────────────
// The Figma sets (design-plans/tooltip-contract.md; TooltipContent 415:773, TooltipInfoTrigger 415:556). A bubble (Radius/overlay, Shadow/md with
// ring and spreads, 6/8 · 8/10 · 10/12 padding) and a 5px arrow frame on the opposite edge; Variant is the tone. The info trigger is a 18 / 20 / 24 round
// button holding the info glyph (14 · 16 · 20), inked by Variant × State.

export const TOOLTIP_SIZES = ['default', 'sm', 'lg'] as const
export const TOOLTIP_SIDES = ['top', 'bottom', 'left', 'right'] as const
export const TOOLTIP_ALIGNS = ['start', 'center', 'end'] as const
export const TOOLTIP_VARIANTS = ['default', 'secondary', 'inverse', 'critical', 'info'] as const
export const TOOLTIP_TRIGGER_STATES = ['Default', 'Hover', 'Open', 'Focused'] as const

const TOOLTIP_TONE: Record<string, { fill: string; ink: string }> = {
  default: { fill: 'action.primary.default', ink: 'content.on-action' },
  secondary: { fill: 'surface.muted', ink: 'content.primary' },
  inverse: { fill: 'surface.inverse', ink: 'content.inverse' },
  critical: { fill: 'status.critical.surface-solid', ink: 'status.critical.on-solid' },
  info: { fill: 'status.info.surface-solid', ink: 'status.info.on-solid' },
}

export const TOOLTIP_CONTENT: ComponentRecipe = {
  key: 'TooltipContent',
  slots: ['root', 'bubble', 'title', 'text', 'arrow'],
  defaults: { Size: 'default', Variant: 'default' },
  parts: [
    part({}, () => ({ // A bubble stays a soft square on Radius/action (12): overlay (24) would turn it into a pill (DEC-2026-11-16-002).
    bubble: { radius: 'radius.action', gap: 'spacing.0_5', lift: 'popover-md' }, title: { font: 'type.label' } })),
    part({ Size: TOOLTIP_SIZES }, (size) => ({
      bubble: size === 'sm'
        ? { paddingX: 'spacing.2', paddingY: 'spacing.1_5' }
        : size === 'lg' ? { paddingX: 'spacing.3', paddingY: 'spacing.2_5' } : { paddingX: 'spacing.2_5', paddingY: 'spacing.2' },
      text: { font: size === 'sm' ? 'type.caption' : size === 'lg' ? 'type.body-md' : 'type.body-sm' },
    })),
    part({ Variant: TOOLTIP_VARIANTS }, (variant) => {
      const t = TOOLTIP_TONE[variant]
      return { bubble: { fill: c(t.fill) }, title: { text: c(t.ink) }, text: { text: c(t.ink) }, arrow: { paint: c(t.fill) } }
    }),
  ],
}

function tooltipTriggerInk(variant: string, state: string): string {
  const hot = state === 'Hover' || state === 'Open'
  switch (variant) {
    case 'secondary':
    case 'inverse':
      return hot ? 'content.primary' : 'content.secondary'
    case 'critical':
      return hot ? 'status.critical.surface-solid' : 'status.critical.content'
    case 'info':
      return hot ? 'status.info.surface-solid' : 'status.info.content'
    default:
      return hot ? 'action.primary.hover' : 'action.primary.default'
  }
}

export const TOOLTIP_INFO_TRIGGER: ComponentRecipe = {
  key: 'TooltipInfoTrigger',
  slots: ['root', 'icon'],
  defaults: { Size: 'default', State: 'Default', Variant: 'default' },
  parts: [
    part({ Size: TOOLTIP_SIZES }, (size) => ({
      root: { radius: 'radius.pill', paddingX: 'spacing.0_5', paddingY: 'spacing.0_5' },
      // 14 = 12 + 2 (no token); 16 and 20 are the icon roles.
      icon: size === 'sm' ? { width: 'spacing.3+spacing.0_5', height: 'spacing.3+spacing.0_5' } : size === 'lg' ? { width: 'icon.medium', height: 'icon.medium' } : { width: 'icon.small', height: 'icon.small' },
    })),
    part({ Variant: TOOLTIP_VARIANTS, State: TOOLTIP_TRIGGER_STATES }, (variant, state) => {
      const focused = state === 'Focused'
      const edge = variant === 'critical' ? 'status.critical.border-strong' : variant === 'info' ? 'status.info.border-strong' : variant === 'default' ? 'border.focus' : 'border.strong'
      const ring = variant === 'critical' ? 'status.critical.border' : variant === 'info' ? 'status.info.border' : 'border.ring.default'
      return {
        icon: { text: c(tooltipTriggerInk(variant, state)) },
        root: focused ? { focus: c(edge), ring: c(ring) } : {},
        // Radix marks an open trigger `data-state="open"`: the file's Open look.
        ...(state === 'Default' ? { 'icon[data-open]': { text: c(tooltipTriggerInk(variant, 'Open')) } } : {}),
      }
    }),
  ],
}

// ── ScrollArea ─────────────────────────────────────────────────────────────

// The Figma ScrollArea (977:572) and ScrollBar (976:27; design-plans/scroll-area-contract.md): a clipping box on Surface/layer-1 with a
// 1px Border/default edge (laid out), a Content slot padded 12 with 8 between rows and overlay bars 4 from the edge.
export const SCROLL_AREA_SIZES = ['default', 'sm', 'lg'] as const
export const SCROLL_AREA_ORIENTATIONS = ['vertical', 'horizontal', 'both'] as const
export const SCROLL_BAR_ORIENTATIONS = ['vertical', 'horizontal'] as const
export const SCROLL_APPEARANCES = ['filled', 'ghost'] as const

export const SCROLL_AREA: ComponentRecipe = {
  key: 'ScrollArea',
  slots: ['root', 'content', 'fade'],
  defaults: { Size: 'default', Orientation: 'vertical', Appearance: 'filled' },
  parts: [
    part({}, () => ({
      root: { fill: c('surface.layer-1'), stroke: c('border.default'), strokeWidth: 'stroke.control', radius: 'radius.container' },
      content: { paddingX: 'spacing.inset-control', paddingY: 'spacing.inset-control', gap: 'spacing.gap-control' },
      fade: { paint: c('surface.layer-1') },
    })),
  ],
}

const SCROLL_BAR_THICKNESS: Record<string, string> = { default: 'spacing.2', sm: 'spacing.1_5', lg: 'spacing.3' }

export const SCROLL_BAR: ComponentRecipe = {
  key: 'ScrollBar',
  slots: ['root', 'thumb'],
  defaults: { Size: 'default', Orientation: 'vertical', Appearance: 'filled' },
  parts: [
    part({ Size: SCROLL_AREA_SIZES, Orientation: SCROLL_BAR_ORIENTATIONS }, (size, orientation) => ({
      root: orientation === 'vertical' ? { width: SCROLL_BAR_THICKNESS[size] } : { height: SCROLL_BAR_THICKNESS[size] },
    })),
    part({ Appearance: SCROLL_APPEARANCES }, (appearance) => ({
      root: { radius: 'radius.pill', fill: appearance === 'filled' ? c('surface.muted') : NONE },
      thumb: { fill: c('surface.muted-hover'), radius: 'radius.pill' },
    })),
  ],
}

// ── Collapsible ────────────────────────────────────────────────────────────
// shadcn ships Collapsible unstyled; this paints its demo: a trigger row (label
// and a ghost icon button) over bordered rows. Open is a Figma property.


// ── AlertDialog ────────────────────────────────────────────────────────────
// shadcn's AlertDialog: the Dialog's surface, a muted media tile, and a footer
// of Buttons (they paint themselves). `size` sm tightens the padding.


// ── Sheet ──────────────────────────────────────────────────────────────────
// The Figma set Sheet (1648:1577; design-plans/sheet-contract.md): an edge-anchored panel on the Modal's surface
// (Surface/layer-2, Shadow/xl). Side right | left (desktop drawers, full height) | bottom (the mobile sheet, a grabber on top).
// One stroke weight on the edge that faces the page and the Radius/overlay on the two corners on that edge. The frame
// does not clip, so Figma paints no ring and no spread: `lift: sheet` is the key and the ambient drops alone.
// The root slot is named `content` (the choreography `sheet-enter` plays on it); the Figma Content slot is `body`.

export const SHEET_SIDES = ['right', 'left', 'bottom'] as const

export const SHEET: ComponentRecipe = {
  key: 'Sheet',
  slots: ['content', 'overlay', 'main', 'body', 'grabber', 'handle', 'close'],
  detachedSlots: ['overlay'],
  defaults: { Side: 'right' },
  parts: [
    part({}, () => ({
      overlay: { fill: c('surface.overlay') },
      content: { fill: c('surface.layer-2'), stroke: c('border.default'), lift: 'sheet' },
      main: { paddingX: 'spacing.inset-surface', paddingY: 'spacing.inset-surface', gap: 'spacing.gap-group' },
      body: { gap: 'spacing.gap-group', text: c('content.secondary'), font: 'type.body-md' },
      // The grabber: 8 above a 40 x 4 bar (fixed geometry, no role: the spacing steps 10 and 1).
      grabber: { paddingTop: 'spacing.gap-control' },
      handle: { fill: c('border.strong'), radius: 'radius.pill', width: 'spacing.10', height: 'spacing.1' },
    })),
    part({ Side: SHEET_SIDES }, (side) => {
      // 400 = 3 × 128 + 16; the width clamps between 320 (2 × 128 + 64) and 480 (3 × 128 + 96).
      const edge: SlotProps = { width: 'spacing.32+spacing.32+spacing.32+spacing.4', minWidth: 'spacing.32+spacing.32+spacing.16', maxWidth: 'spacing.32+spacing.32+spacing.32+spacing.24' }
      if (side === 'right') return { content: { ...edge, strokeLeftWidth: 'stroke.divider', radiusLeft: 'radius.overlay' } }
      if (side === 'left') return { content: { ...edge, strokeRightWidth: 'stroke.divider', radiusRight: 'radius.overlay' } }
      return { content: { strokeTopWidth: 'stroke.divider', radiusTop: 'radius.overlay' } }
    }),
  ],
}

// ── Drawer ─────────────────────────────────────────────────────────────────
// shadcn's Drawer (vaul): the Sheet's surface with a grab handle on the bottom one.


// ── HoverCard ──────────────────────────────────────────────────────────────
// shadcn's HoverCard: the Popover's raised surface; its content is free.


// ── Item ───────────────────────────────────────────────────────────────────
// shadcn's Item: a row with media, title, description and actions. `variant`
// default (no edge) | outline | muted × `size` default | sm | xs.

export const ITEM_VARIANTS = ['default', 'outline', 'muted'] as const
export const ITEM_SIZES = ['default', 'sm', 'xs'] as const


// ── Attachment ─────────────────────────────────────────────────────────────
// shadcn's Attachment: a file on the card surface — media tile, title,
// description, actions. `size` default | sm | xs. Error paints the media and
// the description in the critical roles (the state rides on those parts).

export const ATTACHMENT_SIZES = ['default', 'sm', 'xs'] as const


// ── Message ────────────────────────────────────────────────────────────────
// shadcn's Message: avatar, header and footer around a Bubble (its own recipe).


// ── Bubble ─────────────────────────────────────────────────────────────────
// shadcn's Bubble: the message body, seven variants over Escala's roles —
// default the primary action, secondary, muted, tinted (the accent surface),
// outline, ghost (no box) and destructive (the critical tint).

export const BUBBLE_VARIANTS = ['default', 'secondary', 'muted', 'tinted', 'outline', 'ghost', 'destructive'] as const


// ── Resizable ──────────────────────────────────────────────────────────────
// shadcn's Resizable: panels split by a hairline handle (`bg-border`), with an
// optional grip. `orientation` turns the hairline.


// ── Carousel ───────────────────────────────────────────────────────────────
// shadcn's Carousel: the slides are the caller's (a Card); previous / next are
// outline icon Buttons made round, as shadcn's `rounded-full`.


// ── Chart ──────────────────────────────────────────────────────────────────
// shadcn's Chart: the frame inks axis ticks and grid in the secondary ink
// (Recharts reads `currentColor`); the tooltip is a small raised panel. Series
// colours are the caller's config (the brand's chartPalette).

