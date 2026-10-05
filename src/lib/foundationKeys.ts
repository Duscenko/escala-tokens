// The foundations the Generator edits, by key — the one count the About page
// states ("Foundations you configure"). Lives here, not in `Configurator.tsx`,
// because the public About (phone screen, `/about`) renders the same page
// without the shell and must print the same number. A test keeps this list in
// step with `Configurator`'s `FOUNDATIONS` array.
export const FOUNDATION_KEYS = [
  'color', 'typography', 'dimensions', 'radius', 'spacing',
  'shadow', 'grid', 'sizes', 'stroke', 'icons',
] as const
