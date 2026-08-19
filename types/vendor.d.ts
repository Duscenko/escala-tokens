/**
 * Ambient declarations for the two untyped devDependencies the conformance
 * tests use. Neither ships types and neither has a `@types/` package.
 *
 * These are DELIBERATELY narrow — only the functions `apca.test.ts` actually
 * calls, typed as they actually behave. A blanket `declare module 'apca-w3'`
 * would silence the compiler and also silence a genuine signature change on the
 * next upgrade, which is the one thing a conformance test exists to notice.
 *
 * Nothing in `src/` imports either package: `color/apca.ts` ships with zero
 * runtime dependencies, and these are how the test proves that port is correct.
 */

declare module 'apca-w3' {
  /**
   * Parsed sRGB → screen luminance Ys. Reads indices 0–2, so it accepts the
   * six-element tuple `colorParsley` returns as well as a bare triple — typed
   * as the former because that is how the conformance test calls it.
   */
  export function sRGBtoY(rgb: readonly [number, number, number, ...unknown[]]): number
  /**
   * Signed lightness contrast Lc. Returns a string when `places >= 0`, which is
   * why the test asks for the number form and asserts on it.
   */
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number | string
}

declare module 'colorparsley' {
  /** Any CSS colour string → `[r, g, b, a, isValid, format]`. */
  export function colorParsley(color: string): [number, number, number, number, boolean, string]
}
