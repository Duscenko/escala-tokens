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
  siret: '103 797 577 00014' as string | null,
  /** Postal address — null until a professional activity (use a domiciliation). */
  address: 'Traverse de la Gouffonne, 13009 Marseille' as string | null,
  /** Nom commercial registered with the SIRET. */
  tradeName: 'Duscenko Design' as string | null,
  /** How people reach the publisher. Deliberately NOT a personal email: a
   *  public legal page is scraped for addresses. If an email is ever needed
   *  (RGPD requests are easier by mail), use a forwarding alias on the
   *  escalatokens.com domain, never the personal inbox. */
  linkedin: 'https://www.linkedin.com/in/cesar-durango/',
  host: {
    name: 'Vercel Inc.',
    address: '440 N Barranca Ave #4133, Covina, CA 91723, United States',
    site: 'https://vercel.com',
  },
  /** Bump whenever either page's substance changes. */
  updated: '2026-10-07',
}

/** Contact form topics — shared by /contact and api/contact.ts so the form
 *  can't offer a topic the server rejects. */
export const CONTACT_TOPICS = ['general', 'privacy', 'delete', 'bug', 'business'] as const
export type ContactTopic = (typeof CONTACT_TOPICS)[number]

export const CONTACT_PATH = '/contact'
export const LEGAL_PATH = '/legal'
export const PRIVACY_PATH = '/privacy'
export const TERMS_PATH = '/terms'
export const LOGIN_PATH = '/login'

/** Flip to true in the SAME change that ships login (design-plans/accounts-and-login.md).
 *  It switches on the account clauses of /terms and /privacy and swaps the "no
 *  accounts" lead. Those pages must never describe accounts before they exist,
 *  nor deny them once they do — this is the one switch both follow. */
export const ACCOUNTS_LIVE = true
