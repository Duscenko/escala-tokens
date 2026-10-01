/** Checkerboard for translucent swatches — tiny module so HarmonyFollows can import
 *  without re-entering `colorControls` while it is still initializing. */
export const CHECKER = {
  backgroundImage: 'repeating-conic-gradient(var(--elevated) 0% 25%, var(--surface) 0% 50%)',
} as const
