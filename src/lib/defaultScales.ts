import { generateDarkColorScale } from './colorUtils'

// The fresh-system dark gray ramp (see the long note in useDesignStore.ts,
// which re-exports this). Lives in lib, not the store, so store-free code —
// semanticRoles → the agent package → the Figma plugin's GitHub save — can
// read it without bundling the whole store (and Supabase with it).
export const DEFAULT_GRAY_DARK_SCALE: { [key: number]: string } = generateDarkColorScale('#6c737f', 'radix', 0, '#0c0e12')
