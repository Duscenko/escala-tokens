// OPEN BETA (decided 2026-10-20): every visitor and every account gets the
// whole product — web and Figma plugin — at no cost while Escala finds its
// users. Flip `OPEN_BETA` to `false` to bring the plans back: the licence, the
// account record and Polar are all still wired, only this switch decides.
//
// It rides on the `promo` path (`entitlementAt().promo`), which already lifts
// the Pro gates on the client, the publish endpoint, the account cloud and
// the plugin session — with ONE limit that is about cost, not value: a design
// system holds at most `BETA_MAX_BRANDS` brands, for everyone, account or not.
// Hobby meters Blob writes and function runs, so an unbounded system is an
// abuse surface.
//
// Its own module, with no imports, so a test of the paid rules can replace it:
//   vi.mock('../openBeta', () => ({ OPEN_BETA: false, BETA_MAX_BRANDS: 5 }))

export const OPEN_BETA = true
export const BETA_MAX_BRANDS = 5
