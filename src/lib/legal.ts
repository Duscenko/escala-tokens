// Publisher identity for the Mentions légales / Privacy pages — the ONE place it
// lives, so the two pages (and any footer) can't disagree.
//
// French law (LCEN art. 6-III) requires a site to name its publisher, its
// publication director and its host. A private individual publishing
// non-professionally may give a contact instead of a home address. The moment
// Escala charges money it becomes a professional activity: fill in `siret` and
// `address` (a domiciliation address is fine) and both render automatically.

export const LEGAL = {
  publisher: 'Cesar Durango',
  /** null while the site is a free, non-professional project. */
  siret: null as string | null,
  /** Postal address — null until a professional activity (use a domiciliation). */
  address: null as string | null,
  /** Legal contact. Its own value (not About's CONTACT) so it can move to a
   *  dedicated alias like legal@escalatokens.com without touching About. */
  email: 'duscenko@gmail.com',
  host: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Ave #4133, Covina, CA 91723, United States',
    site: 'https://vercel.com',
  },
  /** Bump whenever either page's substance changes. */
  updated: '2026-10-02',
}

export const LEGAL_PATH = '/legal'
export const PRIVACY_PATH = '/privacy'
