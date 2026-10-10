// `/legal` (Mentions légales) and `/privacy` (Politique de confidentialité).
//
// Built from the SAME article blocks as the Docs destination (`DocHeader`,
// `DocTitle`, `DocSection`, `OnThisPage`) under the shared `PublicHeader`, so a
// legal page reads as one more page of this site — not a bolted-on template.
//
// Written per locale rather than through `t()` keys: these are legal documents,
// reviewed as whole texts, and a sentence-by-sentence dictionary would let one
// clause drift out of step with the rest. Escala Tokens is published from
// France, so the French text is authoritative; en/es are translations and say so.
//
// Every factual claim here has to stay true of the code. If you add a third
// party, a cookie, a new stored field or a new analytics property, update the
// privacy text in all three languages and bump `LEGAL.updated`.
//   - analytics: src/lib/analytics.ts (cookieless, enum-only events, URL scrub)
//   - published tokens + claims: api/tokens.ts (public Blob, hashed claim)
//   - MCP usage log: api/mcp.ts (tool name only)
//   - contact form: api/contact.ts (relayed by Resend, nothing stored)
//   - security: vercel.json headers, Vercel Firewall rate limit
//   - Google Fonts: src/lib/fonts.ts (loaded on demand from Google's CDN)
//   - accounts: ACCOUNTS_LIVE in src/lib/legal.ts gates every account clause here
//   - licences: MIT covers the CODE of this repo; the hosted service, the Figma plugin and
//     the Pro licence are covered by /terms. Keep the three statements in step
//     with LICENSE, the plugin's LICENSE, README and PricingPage's FAQ.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DocHeader, DocSection, DocTitle, OnThisPage, type TocEntry } from '../configurator/docs/blocks'
import { PublicHeader } from './PublicReadingPage'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n, type Locale } from '../../lib/i18n'
import { ACCOUNTS_LIVE, CONTACT_PATH, LEGAL, LEGAL_PATH, PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO, PRIVACY_PATH, TERMS_PATH } from '../../lib/legal'

export type LegalKind = 'legal' | 'privacy' | 'terms'

type Section = { id: string; h: string; body: ReactNode }
type Doc = { title: string; description: string; lead: string; note?: string; sections: Section[] }

// ── Shared prose atoms (same type and ink as Docs prose) ───────────────────

/** Inline link on the page: `--accent-ui` is the chrome's page-contrast accent
 *  (≥4.5:1), the token every text link in the app reads. */
function A({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="text-accent-ui underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 rounded-sm"
    >
      {children}
    </a>
  )
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-ui text-fg-muted leading-relaxed max-w-2xl">{children}</p>
}

function Ul({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-4 list-disc marker:text-fg-faint text-ui text-fg-muted leading-relaxed max-w-2xl">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}

const contactEmailLink = <A href={PUBLIC_CONTACT_MAILTO}>{PUBLIC_CONTACT_EMAIL}</A>
const contactLink = (l: Locale) => <A href={CONTACT_PATH}>{{ fr: 'formulaire de contact', en: 'contact form', es: 'formulario de contacto' }[l]}</A>
const contactChannels = (l: Locale) => (
  <>
    {contactEmailLink}
    {' '}
    {{ fr: '(ou le', en: '(or the', es: '(o el' }[l]}
    {' '}
    {contactLink(l)}
    {{ fr: ')', en: ')', es: ')' }[l]}
  </>
)
const hostLink = <A href={LEGAL.host.site} external>{LEGAL.host.site.replace('https://', '')}</A>
const cnil = <A href="https://www.cnil.fr/fr/plaintes" external>cnil.fr</A>

/** French sets a (non-breaking) space before a colon; English and Spanish don't. */
const colon = (l: Locale) => (l === 'fr' ? ' :' : ':')

function identity(l: Locale): ReactNode[] {
  const status = LEGAL.siret
    ? { fr: 'entrepreneur individuel, France', en: 'sole trader, France', es: 'empresario individual, Francia' }[l]
    : { fr: 'personne physique, France', en: 'private individual, France', es: 'persona física, Francia' }[l]
  const lines: ReactNode[] = [<><span className="text-fg">{LEGAL.publisher}</span>, {status}</>]
  if (LEGAL.tradeName) lines.push(<>{{ fr: 'Nom commercial', en: 'Trading name', es: 'Nombre comercial' }[l]}{colon(l)} {LEGAL.tradeName}</>)
  if (LEGAL.siret) lines.push(<>SIRET{colon(l)} {LEGAL.siret}</>)
  if (LEGAL.address) lines.push(<>{LEGAL.address}</>)
  lines.push(<>{{ fr: 'Contact', en: 'Contact', es: 'Contacto' }[l]}{colon(l)} {contactChannels(l)}</>)
  return lines
}

/** The publisher's identity is required by LCEN art. 6-III and stays one click
 *  away, but it is not printed on first sight. It is MOUNTED only after the
 *  click — a closed `<details>` would keep the address and SIRET in the markup. */
function Reveal({ l, children }: { l: Locale; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const label = open
    ? { fr: 'Masquer les informations', en: 'Hide publisher details', es: 'Ocultar los datos' }[l]
    : { fr: 'Afficher les informations de l’éditeur', en: 'Show publisher details', es: 'Mostrar los datos del editor' }[l]
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-ui font-medium text-accent-ui hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden className={`flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}>
          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {label}
      </button>
      {open && children}
    </div>
  )
}

const hostItems = [<span className="text-fg">{LEGAL.host.name}</span>, LEGAL.host.address, hostLink]

// ── Mentions légales ────────────────────────────────────────────────────────

function legalDoc(l: Locale): Doc {
  if (l === 'fr') return {
    title: 'Mentions légales',
    description: 'Éditeur, directeur de la publication et hébergeur d’Escala Tokens, service édité en France.',
    lead: 'Escala Tokens est un service en ligne édité en France. Cette page donne les informations exigées par la loi pour la confiance dans l’économie numérique (LCEN, art. 6-III).',
    sections: [
      { id: 'editeur', h: 'Éditeur du site', body: <Reveal l="fr"><Ul items={identity('fr')} /></Reveal> },
      { id: 'directeur', h: 'Directeur de la publication', body: <P>{LEGAL.publisher}</P> },
      { id: 'hebergeur', h: 'Hébergeur', body: <Ul items={hostItems} /> },
      { id: 'propriete', h: 'Propriété intellectuelle', body: <P>Le code source d’Escala Tokens est publié sous licence MIT. Les systèmes de design que vous créez avec l’outil vous appartiennent : les tokens et fichiers exportés ne sont soumis à aucune licence ni obligation d’attribution de notre part. Le plugin Figma est un produit propriétaire distinct, et le service hébergé est régi par les <A href={TERMS_PATH}>conditions d’utilisation</A>. Figma est une marque de Figma, Inc. ; ce projet n’est ni affilié à Figma ni approuvé par elle.</P> },
      { id: 'donnees', h: 'Données personnelles', body: <P>Le traitement des données respecte le Règlement général sur la protection des données (RGPD) et la loi Informatique et Libertés ; il est décrit dans la <A href={PRIVACY_PATH}>politique de confidentialité</A>. Le site dépose un seul cookie, strictement nécessaire, pour la clé de licence Pro.</P> },
      { id: 'droit', h: 'Droit applicable', body: <P>Le site et les présentes mentions sont soumis au droit français. Tout litige relève des juridictions françaises compétentes, sous réserve des règles protectrices dont bénéficie le consommateur dans son pays de résidence au sein de l’Union européenne.</P> },
    ],
  }
  if (l === 'es') return {
    title: 'Aviso legal',
    description: 'Editor, director de la publicación y alojamiento de Escala Tokens, servicio editado en Francia.',
    lead: 'Escala Tokens es un servicio en línea editado en Francia. Esta página recoge la información que exige la ley francesa sobre la confianza en la economía digital (LCEN, art. 6-III).',
    note: 'Traducción informativa. La versión francesa (Mentions légales) es la que tiene valor legal.',
    sections: [
      { id: 'editeur', h: 'Editor del sitio', body: <Reveal l="es"><Ul items={identity('es')} /></Reveal> },
      { id: 'directeur', h: 'Director de la publicación', body: <P>{LEGAL.publisher}</P> },
      { id: 'hebergeur', h: 'Alojamiento', body: <Ul items={hostItems} /> },
      { id: 'propriete', h: 'Propiedad intelectual', body: <P>El código fuente de Escala Tokens se publica bajo licencia MIT. Los sistemas de diseño que usted crea con la herramienta son suyos: los tokens y archivos exportados no llevan ninguna licencia ni obligación de atribución por nuestra parte. El plugin de Figma es un producto propietario aparte, y el servicio alojado se rige por los <A href={TERMS_PATH}>términos de uso</A>. Figma es una marca de Figma, Inc.; este proyecto no está afiliado a Figma ni respaldado por ella.</P> },
      { id: 'donnees', h: 'Datos personales', body: <P>El tratamiento de datos cumple el Reglamento General de Protección de Datos (RGPD) y la ley francesa Informatique et Libertés; se describe en la <A href={PRIVACY_PATH}>política de privacidad</A>. El sitio instala una sola cookie, estrictamente necesaria, para la clave de la licencia Pro.</P> },
      { id: 'droit', h: 'Ley aplicable', body: <P>El sitio y este aviso se rigen por el derecho francés. Cualquier litigio corresponde a los tribunales franceses competentes, sin perjuicio de las normas de protección de las que goza el consumidor en su país de residencia dentro de la Unión Europea.</P> },
    ],
  }
  return {
    title: 'Legal notice',
    description: 'Publisher, publication director and host of Escala Tokens, a service published from France.',
    lead: 'Escala Tokens is an online service published from France. This page gives the information required by French law on confidence in the digital economy (LCEN, art. 6-III).',
    note: 'Informative translation. The French version (Mentions légales) is the legally binding one.',
    sections: [
      { id: 'editeur', h: 'Publisher', body: <Reveal l="en"><Ul items={identity('en')} /></Reveal> },
      { id: 'directeur', h: 'Publication director', body: <P>{LEGAL.publisher}</P> },
      { id: 'hebergeur', h: 'Host', body: <Ul items={hostItems} /> },
      { id: 'propriete', h: 'Intellectual property', body: <P>The Escala Tokens source code is published under the MIT License. The design systems you build with the tool are yours: exported tokens and files carry no licence or attribution requirement from us. The Figma plugin is a separate proprietary product, and the hosted service is governed by the <A href={TERMS_PATH}>terms of use</A>. Figma is a trademark of Figma, Inc.; this project is not affiliated with or endorsed by Figma.</P> },
      { id: 'donnees', h: 'Personal data', body: <P>Data is handled in line with the EU General Data Protection Regulation (GDPR) and the French Data Protection Act (loi Informatique et Libertés), as described in the <A href={PRIVACY_PATH}>privacy policy</A>. The site sets one cookie, strictly necessary, for the Escala Pro licence key.</P> },
      { id: 'droit', h: 'Governing law', body: <P>The site and this notice are governed by French law. Any dispute falls under the competent French courts, without prejudice to the protective rules a consumer enjoys in their country of residence within the European Union.</P> },
    ],
  }
}

// ── Politique de confidentialité ────────────────────────────────────────────

function privacyBase(l: Locale): Doc {
  if (l === 'fr') return {
    title: 'Politique de confidentialité',
    description: 'Données traitées par Escala Tokens, service édité en France, conformément au RGPD : aucun cookie, aucune publicité, aucun profilage.',
    lead: 'En bref : pas de compte, pas de cookie de suivi, pas de publicité, pas de profilage, pas de revente de données. Votre système de design reste dans votre navigateur. Escala Tokens est édité en France et applique le RGPD (règlement (UE) 2016/679) et la loi Informatique et Libertés.',
    sections: [
      { id: 'responsable', h: 'Responsable du traitement', body: <>
        <Ul items={identity('fr')} />
        <P>Autorité de contrôle compétente : la Commission nationale de l’informatique et des libertés (CNIL). Compte tenu de la nature du traitement, la désignation d’un délégué à la protection des données n’est pas obligatoire.</P>
      </> },
      { id: 'systeme', h: '1. Votre système de design', body: <P>Ce que vous configurez (couleurs, typographie, espacements…) est enregistré uniquement dans le stockage local de votre navigateur (localStorage). Nous n’y avons pas accès et il n’existe aucun profil côté serveur. Vous l’effacez en vidant les données du site dans votre navigateur.</P> },
      { id: 'tokens', h: '2. Tokens publiés (synchronisation Figma et MCP)', body: <>
        <P>Uniquement si vous cliquez sur « Sync now » ou activez la synchronisation automatique, le contenu de vos tokens est envoyé et stocké chez notre hébergeur (Vercel Blob) sous un identifiant de système. Une empreinte chiffrée (SHA-256) d’une clé de publication est stockée pour empêcher qu’un tiers écrase votre système.</P>
        <P><span className="text-fg">Important :</span> les tokens publiés sont lisibles par toute personne qui connaît l’identifiant du système — c’est ce qui permet au plugin Figma et aux agents IA de les lire. N’indiquez pas d’informations confidentielles dans le nom de votre système.</P>
        <P>L’empreinte courte de la clé de licence est conservée avec l’identifiant du système tant que celui-ci est publié, afin qu’un remboursement interrompe la synchronisation. La clé elle-même n’y figure pas.</P>
        <Ul items={['Base légale : exécution du service que vous demandez (art. 6.1.b RGPD).', 'Durée : jusqu’à votre demande de suppression.']} />
      </> },
      { id: 'github', h: '3. GitHub', body: <P>Si vous connectez GitHub, votre jeton d’accès reste dans votre navigateur et n’est envoyé qu’à GitHub. Lors d’une connexion OAuth, notre serveur échange le code contre un jeton et vous le transmet sans le conserver. Les fichiers sont poussés dans le dépôt que vous choisissez ; GitHub est alors responsable de son propre traitement.</P> },
      { id: 'audience', h: '4. Mesure d’audience', body: <>
        <P>Nous utilisons Vercel Web Analytics, qui ne dépose aucun cookie et n’utilise aucun identifiant stocké sur votre appareil. Un visiteur est compté via une empreinte anonyme recalculée chaque jour, qui ne permet pas de vous suivre d’un jour à l’autre ni d’un site à l’autre.</P>
        <Ul items={['Données : page consultée (sans identifiant de système), site de provenance, pays, type d’appareil, navigateur et système d’exploitation.', 'Actions comptées : export (format choisi), ouverture du plugin Figma, publication Figma, envoi vers GitHub, style adopté, sauvegarde. Jamais de texte que vous saisissez, de nom de projet ni de couleur.', 'Base légale : intérêt légitime à améliorer l’outil (art. 6.1.f RGPD). Ce dispositif respecte les conditions d’exemption de consentement de la CNIL pour la mesure d’audience.']} />
        <P>Côté serveur, chaque appel à l’outil MCP enregistre uniquement le nom de l’outil utilisé, sans identifiant de projet ni adresse IP.</P>
      </> },
      { id: 'journaux', h: '5. Journaux techniques et sécurité', body: <P>Comme tout hébergeur, Vercel enregistre les requêtes (adresse IP, navigateur, page demandée, date) pour assurer le fonctionnement du service, la protection contre les attaques et la limitation des abus (pare-feu, limite de requêtes). Lorsqu’une clé de licence est vérifiée, le journal reçoit une empreinte courte de cette clé, jamais la clé elle-même ; lors d’une publication, cette empreinte est associée à l’identifiant du système, afin de constater qu’une même clé sert plusieurs systèmes. Base légale : intérêt légitime à sécuriser le service (art. 6.1.f RGPD). Ces journaux sont conservés au maximum 30 jours.</P> },
      { id: 'polices', h: '6. Polices Google Fonts', body: <P>Lorsque vous choisissez une police ou prévisualisez un style, votre navigateur télécharge la police depuis les serveurs de Google (fonts.googleapis.com), qui reçoivent alors votre adresse IP. Google indique ne pas utiliser ces données pour la publicité.</P> },
      { id: 'formulaire', h: '7. Formulaire de contact', body: <>
        <P>Lorsque vous nous écrivez via le {contactLink('fr')}, nous recevons votre adresse e-mail, votre message, le sujet choisi et, si vous les indiquez, votre nom et l’identifiant de votre système. Ces données servent uniquement à vous répondre.</P>
        <Ul items={['Base légale : intérêt légitime à répondre à votre demande (art. 6.1.f RGPD) ; obligation légale pour les demandes d’exercice de droits (art. 6.1.c).', 'Aucun stockage sur nos serveurs : le message est transmis une seule fois par e-mail via Resend, puis conservé dans la messagerie de l’éditeur le temps de traiter la demande, et au maximum 3 ans après le dernier échange.', 'Protection anti-spam sans cookie ni CAPTCHA : champ invisible, délai minimal de saisie et limite de messages par adresse IP.']} />
      </> },
      { id: 'cookies', h: 'Cookies et stockage local', body: <P>Le site dépose un seul cookie, strictement nécessaire : la clé de licence Pro, marquée HttpOnly, de sorte qu’un script de la page ne peut pas la lire. Il est effacé lorsque vous retirez la licence, ou au bout d’un an. Le reste — système de design, langue, thème clair/sombre, clé de publication et, si vous le fournissez, jeton GitHub — reste dans le stockage local. Un identifiant d’appareil, qui n’est pas la clé, y est aussi gardé et n’est envoyé à Polar que si la limite d’activations de la licence est activée. Ces usages sont strictement nécessaires au service demandé et ne requièrent pas de consentement (art. 82 de la loi Informatique et Libertés, directive ePrivacy).</P> },
      { id: 'profilage', h: 'Absence de profilage', body: <P>Aucune décision automatisée ni aucun profilage au sens de l’article 22 du RGPD. Aucune donnée n’est vendue, louée ni utilisée à des fins publicitaires.</P> },
      { id: 'transferts', h: 'Sous-traitants et transferts hors UE', body: <>
        <Ul items={['Vercel Inc. (États-Unis) — hébergement, stockage des tokens publiés, mesure d’audience, journaux.', 'Google LLC (États-Unis) — polices Google Fonts.', 'GitHub, Inc. (États-Unis) — uniquement si vous connectez GitHub.', 'Resend, Inc. (États-Unis) — acheminement des messages du formulaire de contact.']} />
        <P>Ces transferts hors de l’Union européenne reposent sur le cadre de protection des données UE–États-Unis (Data Privacy Framework, décision d’adéquation de la Commission européenne) et/ou les clauses contractuelles types de la Commission (art. 45 et 46 RGPD).</P>
      </> },
      { id: 'securite', h: 'Sécurité', body: <P>Connexions chiffrées (HTTPS imposé par HSTS), clés de publication stockées uniquement sous forme d’empreinte, limitation du nombre de requêtes et pare-feu applicatif. En cas de violation de données susceptible d’engendrer un risque pour vos droits, nous la notifierons à la CNIL dans les 72 heures et vous en informerons si nécessaire (art. 33 et 34 RGPD).</P> },
      { id: 'droits', h: 'Vos droits', body: <P>Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données, ainsi que du droit de définir des directives relatives à leur sort après votre décès (loi Informatique et Libertés). Pour supprimer un système publié ou exercer vos droits, écrivez-nous via le {contactLink('fr')} en indiquant l’identifiant du système concerné. Nous répondons dans un délai d’un mois. Vous pouvez aussi introduire une réclamation auprès de la CNIL ({cnil}).</P> },
    ],
  }
  if (l === 'es') return {
    title: 'Política de privacidad',
    description: 'Datos que trata Escala Tokens, servicio editado en Francia, conforme al RGPD: sin cookies de seguimiento, sin publicidad, sin perfiles.',
    lead: 'En resumen: sin cuentas, sin cookies de seguimiento, sin publicidad, sin perfiles y sin venta de datos. Su sistema de diseño se queda en su navegador. Escala Tokens se edita en Francia y aplica el RGPD (Reglamento (UE) 2016/679) y la ley francesa Informatique et Libertés.',
    note: 'Traducción informativa. La versión francesa es la que tiene valor legal.',
    sections: [
      { id: 'responsable', h: 'Responsable del tratamiento', body: <>
        <Ul items={identity('es')} />
        <P>Autoridad de control competente: la Commission nationale de l’informatique et des libertés (CNIL), en Francia. Dada la naturaleza del tratamiento, no es obligatorio designar un delegado de protección de datos.</P>
      </> },
      { id: 'systeme', h: '1. Su sistema de diseño', body: <P>Lo que usted configura (colores, tipografía, espaciados…) se guarda únicamente en el almacenamiento local de su navegador (localStorage). No tenemos acceso y no existe ningún perfil en el servidor. Lo borra eliminando los datos del sitio en su navegador.</P> },
      { id: 'tokens', h: '2. Tokens publicados (sincronización con Figma y MCP)', body: <>
        <P>Solo si pulsa «Sync now» o activa la sincronización automática, el contenido de sus tokens se envía y se guarda en nuestro proveedor (Vercel Blob) bajo un identificador de sistema. Se guarda una huella cifrada (SHA-256) de una clave de publicación para impedir que un tercero sobrescriba su sistema.</P>
        <P><span className="text-fg">Importante:</span> los tokens publicados pueden leerlos quienes conozcan el identificador del sistema; así es como el plugin de Figma y los agentes de IA los leen. No incluya información confidencial en el nombre de su sistema.</P>
        <P>La huella corta de la clave de licencia se conserva junto al identificador del sistema mientras este siga publicado, para que un reembolso corte la sincronización. La clave en sí no se guarda.</P>
        <Ul items={['Base legal: ejecución del servicio que usted solicita (art. 6.1.b RGPD).', 'Plazo: hasta que solicite su eliminación.']} />
      </> },
      { id: 'github', h: '3. GitHub', body: <P>Si conecta GitHub, su token de acceso se queda en su navegador y solo se envía a GitHub. En una conexión OAuth, nuestro servidor intercambia el código por un token y se lo entrega sin guardarlo. Los archivos se suben al repositorio que usted elige; a partir de ahí GitHub es responsable de su propio tratamiento.</P> },
      { id: 'audience', h: '4. Medición de audiencia', body: <>
        <P>Usamos Vercel Web Analytics, que no instala cookies ni usa identificadores guardados en su dispositivo. Cada visitante se cuenta mediante una huella anónima que se recalcula cada día y no permite seguirle de un día a otro ni entre sitios.</P>
        <Ul items={['Datos: página visitada (sin identificador de sistema), sitio de procedencia, país, tipo de dispositivo, navegador y sistema operativo.', 'Acciones contadas: exportación (formato elegido), apertura del plugin de Figma, publicación en Figma, envío a GitHub, estilo adoptado, guardado. Nunca texto que usted escribe, nombres de proyecto ni colores.', 'Base legal: interés legítimo en mejorar la herramienta (art. 6.1.f RGPD). Cumple las condiciones de la CNIL para medir audiencia sin consentimiento.']} />
        <P>En el servidor, cada llamada a la herramienta MCP registra solo el nombre de la herramienta usada, sin identificador de proyecto ni dirección IP.</P>
      </> },
      { id: 'journaux', h: '5. Registros técnicos y seguridad', body: <P>Como cualquier proveedor de alojamiento, Vercel registra las solicitudes (dirección IP, navegador, página solicitada, fecha) para el funcionamiento del servicio, la protección frente a ataques y la limitación de abusos (cortafuegos, límite de solicitudes). Cuando se comprueba una clave de licencia, el registro guarda una huella corta de esa clave, nunca la clave misma; al publicar, esa huella se asocia al identificador del sistema, para ver si una misma clave sirve a varios sistemas. Base legal: interés legítimo en la seguridad del servicio (art. 6.1.f RGPD). Se conservan como máximo 30 días.</P> },
      { id: 'polices', h: '6. Fuentes de Google Fonts', body: <P>Cuando elige una fuente o previsualiza un estilo, su navegador descarga la fuente desde los servidores de Google (fonts.googleapis.com), que reciben su dirección IP. Google indica que no usa estos datos para publicidad.</P> },
      { id: 'formulaire', h: '7. Formulario de contacto', body: <>
        <P>Cuando nos escribe mediante el {contactLink('es')}, recibimos su dirección de correo, su mensaje, el tema elegido y, si los indica, su nombre y el identificador de su sistema. Estos datos solo sirven para responderle.</P>
        <Ul items={['Base legal: interés legítimo en responder a su solicitud (art. 6.1.f RGPD); obligación legal para las solicitudes de ejercicio de derechos (art. 6.1.c).', 'Sin almacenamiento en nuestros servidores: el mensaje se transmite una sola vez por correo mediante Resend y se conserva en el buzón del editor mientras se atiende la solicitud, y como máximo 3 años tras el último intercambio.', 'Protección anti-spam sin cookies ni CAPTCHA: campo invisible, tiempo mínimo de escritura y límite de mensajes por dirección IP.']} />
      </> },
      { id: 'cookies', h: 'Cookies y almacenamiento local', body: <P>El sitio instala una sola cookie, estrictamente necesaria: la clave de la licencia Pro, marcada HttpOnly, de modo que un script de la página no puede leerla. Se borra cuando usted retira la licencia, o al cabo de un año. Lo demás — sistema de diseño, idioma, tema claro/oscuro, clave de publicación y, si lo proporciona, token de GitHub — sigue en el almacenamiento local. También se guarda un identificador de dispositivo, que no es la clave, y solo se envía a Polar si el límite de activaciones de la licencia está activado. Son usos estrictamente necesarios para el servicio solicitado y no requieren consentimiento (art. 82 de la ley Informatique et Libertés, directiva ePrivacy).</P> },
      { id: 'profilage', h: 'Sin perfiles', body: <P>No hay decisiones automatizadas ni elaboración de perfiles en el sentido del artículo 22 del RGPD. Ningún dato se vende, se alquila ni se usa con fines publicitarios.</P> },
      { id: 'transferts', h: 'Encargados y transferencias fuera de la UE', body: <>
        <Ul items={['Vercel Inc. (EE. UU.): alojamiento, almacenamiento de tokens publicados, medición de audiencia, registros.', 'Google LLC (EE. UU.): fuentes de Google Fonts.', 'GitHub, Inc. (EE. UU.): solo si conecta GitHub.', 'Resend, Inc. (EE. UU.): envío de los mensajes del formulario de contacto.']} />
        <P>Estas transferencias fuera de la Unión Europea se basan en el Marco de Privacidad de Datos UE–EE. UU. (decisión de adecuación de la Comisión Europea) y/o en las cláusulas contractuales tipo de la Comisión (art. 45 y 46 RGPD).</P>
      </> },
      { id: 'securite', h: 'Seguridad', body: <P>Conexiones cifradas (HTTPS obligatorio mediante HSTS), claves de publicación guardadas solo como huella, límite de solicitudes y cortafuegos de aplicación. Si se produjera una brecha de datos con riesgo para sus derechos, la notificaremos a la CNIL en un plazo de 72 horas y le informaremos cuando corresponda (art. 33 y 34 RGPD).</P> },
      { id: 'droits', h: 'Sus derechos', body: <P>Tiene derecho de acceso, rectificación, supresión, limitación, oposición y portabilidad, así como a dar instrucciones sobre el destino de sus datos tras su fallecimiento (ley Informatique et Libertés). Para eliminar un sistema publicado o ejercer sus derechos, escríbanos mediante el {contactLink('es')} indicando el identificador del sistema. Respondemos en un plazo de un mes. También puede presentar una reclamación ante la CNIL ({cnil}) o ante la autoridad de protección de datos de su país de la UE.</P> },
    ],
  }
  return {
    title: 'Privacy policy',
    description: 'Data processed by Escala Tokens, a service published from France, under the GDPR: no tracking cookies, no advertising, no profiling.',
    lead: 'In short: no accounts, no tracking cookies, no advertising, no profiling, no selling of data. Your design system stays in your browser. Escala Tokens is published from France and applies the GDPR (Regulation (EU) 2016/679) and the French Data Protection Act.',
    note: 'Informative translation. The French version is the legally binding one.',
    sections: [
      { id: 'responsable', h: 'Data controller', body: <>
        <Ul items={identity('en')} />
        <P>Lead supervisory authority: the Commission nationale de l’informatique et des libertés (CNIL), France. Given the nature of the processing, appointing a Data Protection Officer is not required.</P>
      </> },
      { id: 'systeme', h: '1. Your design system', body: <P>What you configure (colours, type, spacing…) is stored only in your browser’s local storage (localStorage). We have no access to it and there is no server-side profile. You erase it by clearing this site’s data in your browser.</P> },
      { id: 'tokens', h: '2. Published tokens (Figma sync and MCP)', body: <>
        <P>Only when you click “Sync now” or turn on auto-sync, your token payload is sent to and stored by our host (Vercel Blob) under a system ID. A hashed (SHA-256) publish key is stored so nobody else can overwrite your system.</P>
        <P><span className="text-fg">Important:</span> published tokens can be read by anyone who knows the system ID — that is how the Figma plugin and AI agents read them. Don’t put confidential information in your system’s name.</P>
        <P>The short hash of the licence key is kept with the system id for as long as that system stays published, so a refund can stop sync. The key itself is not stored.</P>
        <Ul items={['Legal basis: performance of the service you request (GDPR art. 6.1.b).', 'Retention: until you ask for deletion.']} />
      </> },
      { id: 'github', h: '3. GitHub', body: <P>If you connect GitHub, your access token stays in your browser and is only ever sent to GitHub. During an OAuth sign-in, our server exchanges the code for a token and hands it to you without keeping it. Files are pushed to the repository you choose; GitHub is then responsible for its own processing.</P> },
      { id: 'audience', h: '4. Audience measurement', body: <>
        <P>We use Vercel Web Analytics, which sets no cookies and stores no identifier on your device. A visitor is counted through an anonymous fingerprint recomputed every day, which cannot follow you from one day to the next or across sites.</P>
        <Ul items={['Data: page viewed (without any system ID), referring site, country, device type, browser and operating system.', 'Actions counted: export (format chosen), Figma plugin opened, Figma publish, GitHub push, style adopted, save. Never text you type, project names or colours.', 'Legal basis: legitimate interest in improving the tool (GDPR art. 6.1.f). It meets the CNIL’s conditions for consent-exempt audience measurement.']} />
        <P>On the server, each call to the MCP tool logs only the name of the tool used — no project ID, no IP address.</P>
      </> },
      { id: 'journaux', h: '5. Technical logs and security', body: <P>Like any host, Vercel logs requests (IP address, browser, requested page, time) to run the service, protect it from attacks and limit abuse (firewall, rate limiting). When a licence key is checked, the log records a short hash of that key, never the key itself; on publish, that hash is stored next to the system id, so one key used on several systems can be seen. Legal basis: legitimate interest in securing the service (GDPR art. 6.1.f). These logs are kept for at most 30 days.</P> },
      { id: 'polices', h: '6. Google Fonts', body: <P>When you choose a font or preview a style, your browser downloads that font from Google’s servers (fonts.googleapis.com), which then receive your IP address. Google states it does not use this data for advertising.</P> },
      { id: 'formulaire', h: '7. Contact form', body: <>
        <P>When you write to us through the {contactLink('en')}, we receive your email address, your message, the topic you chose and, if you provide them, your name and your system ID. This data is used only to answer you.</P>
        <Ul items={['Legal basis: legitimate interest in answering your request (GDPR art. 6.1.f); legal obligation for requests to exercise your rights (art. 6.1.c).', 'Nothing is stored on our servers: the message is relayed once by email through Resend, then kept in the publisher’s mailbox while the request is handled, and at most 3 years after the last exchange.', 'Spam protection without cookies or CAPTCHA: a hidden field, a minimum typing time and a per-IP message limit.']} />
      </> },
      { id: 'cookies', h: 'Cookies and local storage', body: <P>The site sets one cookie, strictly necessary: the Escala Pro licence key, marked HttpOnly, so a script on the page cannot read it. It is cleared when you remove the licence, or after one year. Everything else — your design system, language, light/dark theme, publish key and, if you provide one, your GitHub token — stays in local storage. A device id, which is not the key, is kept there too and is sent to Polar only if the licence’s activation limit is on. These uses are strictly necessary for the service you request and need no consent (art. 82 of the French Data Protection Act, ePrivacy Directive).</P> },
      { id: 'profilage', h: 'No profiling', body: <P>No automated decision-making or profiling within the meaning of GDPR article 22. No data is sold, rented or used for advertising.</P> },
      { id: 'transferts', h: 'Processors and transfers outside the EU', body: <>
        <Ul items={['Vercel Inc. (United States) — hosting, storage of published tokens, audience measurement, logs.', 'Google LLC (United States) — Google Fonts.', 'GitHub, Inc. (United States) — only if you connect GitHub.', 'Resend, Inc. (United States) — delivery of contact-form messages.']} />
        <P>These transfers outside the European Union rely on the EU–US Data Privacy Framework (a European Commission adequacy decision) and/or the Commission’s standard contractual clauses (GDPR arts. 45 and 46).</P>
      </> },
      { id: 'securite', h: 'Security', body: <P>Encrypted connections (HTTPS enforced through HSTS), publish keys stored only as a hash, rate limiting and an application firewall. Should a personal data breach create a risk to your rights, we will notify the CNIL within 72 hours and inform you where required (GDPR arts. 33 and 34).</P> },
      { id: 'droits', h: 'Your rights', body: <P>You have the right of access, rectification, erasure, restriction, objection and portability, and the right to set instructions for your data after your death (French Data Protection Act). To delete a published system or exercise your rights, write to us through the {contactLink('en')} with the system ID. We reply within one month. You can also lodge a complaint with the CNIL ({cnil}) or your EU country’s data protection authority.</P> },
    ],
  }
}

/** With accounts live, the privacy text stops saying "no accounts" and gains the
 *  account clause. Layered over `privacyBase` so the account wording lives in one
 *  place and is off until `ACCOUNTS_LIVE` flips. */
function privacyDoc(l: Locale): Doc {
  const base = privacyBase(l)
  if (!ACCOUNTS_LIVE) return base
  const lead = {
    fr: 'En bref : un compte est facultatif et ne sert qu’à la sauvegarde en ligne et à la licence Pro ; pas de cookie de suivi, pas de publicité, pas de profilage, pas de revente de données. Sans compte, votre système reste dans votre navigateur. Escala Tokens est édité en France et applique le RGPD (règlement (UE) 2016/679) et la loi Informatique et Libertés.',
    es: 'En resumen: la cuenta es opcional y solo sirve para guardar en línea y para la licencia Pro; sin cookies de seguimiento, sin publicidad, sin perfiles y sin venta de datos. Sin cuenta, su sistema se queda en su navegador. Escala Tokens se edita en Francia y aplica el RGPD (Reglamento (UE) 2016/679) y la ley francesa Informatique et Libertés.',
    en: 'In short: an account is optional and only serves online saving and the Pro licence; no tracking cookies, no advertising, no profiling, no selling of data. Without an account your design system stays in your browser. Escala Tokens is published from France and applies the GDPR (Regulation (EU) 2016/679) and the French Data Protection Act.',
  }[l]
  const account: Section = {
    fr: { id: 'compte', h: 'Compte (facultatif)', body: <>
      <P>Si vous créez un compte, nous traitons votre adresse e-mail, l’empreinte de votre mot de passe, l’empreinte de votre clé de licence et sa date d’expiration, et, avec une licence Pro, les systèmes que vous enregistrez en ligne.</P>
      <Ul items={['Base légale : exécution du contrat (art. 6.1.b RGPD) ; intérêt légitime pour la sécurité du compte (art. 6.1.f).', 'Durée : tant que le compte existe ; suppression immédiate à la fermeture du compte, hors justificatifs de paiement que conserve Polar.', 'Sous-traitants : Supabase (base de données et authentification, hébergée dans l’Union européenne), Resend (e-mails de confirmation et de réinitialisation) et Polar (vente et licences, vendeur officiel).', 'Stockage local : la session de connexion est conservée dans le stockage local de votre navigateur, strictement nécessaire au service ; ce n’est pas un cookie et il ne sert à aucun suivi.']} />
      <P>Depuis votre compte, vous pouvez exporter vos données et supprimer votre compte.</P>
    </> },
    es: { id: 'compte', h: 'Cuenta (opcional)', body: <>
      <P>Si crea una cuenta, tratamos su correo electrónico, la huella de su contraseña, la huella de su clave de licencia y su fecha de caducidad y, con una licencia Pro, los sistemas que guarde en línea.</P>
      <Ul items={['Base legal: ejecución del contrato (art. 6.1.b RGPD); interés legítimo para la seguridad de la cuenta (art. 6.1.f).', 'Plazo: mientras exista la cuenta; supresión inmediata al cerrarla, salvo los justificantes de pago que conserva Polar.', 'Encargados: Supabase (base de datos y autenticación, alojada en la Unión Europea), Resend (correos de confirmación y de restablecimiento) y Polar (venta y licencias, vendedor oficial).', 'Almacenamiento local: la sesión se guarda en el almacenamiento local de su navegador, estrictamente necesario para el servicio; no es una cookie y no sirve para ningún seguimiento.']} />
      <P>Desde su cuenta puede exportar sus datos y eliminarla.</P>
    </> },
    en: { id: 'compte', h: 'Account (optional)', body: <>
      <P>If you create an account we process your email address, a hash of your password, a hash of your licence key and its expiry date and, with a Pro licence, the systems you save online.</P>
      <Ul items={['Legal basis: performance of the contract (GDPR art. 6.1.b); legitimate interest in account security (art. 6.1.f).', 'Retention: while the account exists; deleted immediately when you close it, except payment records that Polar keeps.', 'Processors: Supabase (database and authentication, hosted in the European Union), Resend (confirmation and reset emails) and Polar (sales and licences, merchant of record).', 'Local storage: the sign-in session is kept in your browser’s local storage, strictly necessary for the service; it is not a cookie and is used for no tracking.']} />
      <P>From your account you can export your data and delete your account.</P>
    </> },
  }[l]
  const sections = base.sections.flatMap((s) => (s.id === 'cookies' ? [account, s] : [s]))
  return { ...base, lead, sections }
}

// ── Conditions d’utilisation ────────────────────────────────────────────────

/** What the MIT licence does and does not cover is the point of this page: the
 *  four statements below (code · hosted service · plugin · your content) must
 *  match LICENSE, the plugin's LICENSE, README and the /pricing FAQ. */
function termsDoc(l: Locale): Doc {
  const acc = ACCOUNTS_LIVE
  if (l === 'fr') return {
    title: 'Conditions d’utilisation',
    description: 'Conditions d’utilisation d’Escala Tokens : ce que couvre la licence MIT, le service hébergé, le plugin Figma, la licence Pro et vos contenus.',
    lead: 'Escala Tokens se compose de plusieurs choses qui n’ont pas la même licence. Cette page dit laquelle est régie par quoi, pour qu’il n’y ait pas de doute.',
    sections: [
      { id: 'portee', h: '1. Ce que couvrent ces conditions', body: <P>Elles régissent le service hébergé sur escalatokens.com : le configurateur en ligne, la synchronisation, le serveur MCP en direct{acc ? ', les comptes' : ''} et la licence Pro. Elles ne modifient pas la licence du code source (article 2). En utilisant le service, vous les acceptez.</P> },
      { id: 'mit', h: '2. Le code : licence MIT', body: <P>Le configurateur, la CLI et le serveur MCP publiés sur GitHub sont sous <A href="https://github.com/Duscenko/escala-tokens/blob/main/LICENSE" external>licence MIT</A> : vous pouvez les copier, les modifier, les héberger vous-même et les utiliser commercialement, en conservant la mention de licence. Cette licence couvre le code, pas le service que nous hébergeons : si vous hébergez votre propre instance, vous n’obtenez ni compte, ni sauvegarde en ligne, ni synchronisation, ni licence Pro d’escalatokens.com, et vous fixez vos propres limites.</P> },
      { id: 'plugin', h: '3. Le plugin Figma : licence propriétaire', body: <P>Le plugin Figma est un produit distinct, gratuit à installer, dont le code source n’est pas publié et n’est pas sous licence MIT. Il est fourni sous une licence d’utilisation qui interdit de le copier, de le modifier, de le redistribuer ou d’en faire des œuvres dérivées. Les fonctions qu’il reçoit du service hébergé relèvent de la licence Pro (article 6).</P> },
      { id: 'contenu', h: '4. Vos contenus', body: <P>Les systèmes de design que vous créez, les tokens et fichiers que vous exportez vous appartiennent. Nous ne demandons ni licence ni attribution et nous ne les utilisons pas pour entraîner des modèles. Vous nous accordez seulement le droit technique de les stocker et de les servir pour fournir le service que vous demandez (par exemple la synchronisation). Les tokens publiés sont lisibles par quiconque connaît l’identifiant du système : n’y mettez pas d’information confidentielle.</P> },
      ...(acc ? [{ id: 'compte', h: '5. Compte', body: <P>Le compte est facultatif : le configurateur et l’export fonctionnent sans. Vous êtes responsable de la confidentialité de vos identifiants. Un compte gratuit ne sauvegarde rien en ligne ; la sauvegarde en ligne et la synchronisation exigent une licence Pro. Une clé de licence est liée à un seul compte. Vous pouvez exporter vos données et supprimer votre compte à tout moment depuis la page Compte ; la suppression est définitive.</P> }] : []),
      { id: 'pro', h: `${acc ? '6' : '5'}. Escala Pro`, body: <>
        <P>Escala Pro est vendu en paiement unique via Polar, qui agit comme vendeur officiel (merchant of record) : le paiement, la facturation et la TVA relèvent des conditions de Polar. Il inclut la synchronisation hébergée, le serveur MCP en direct, plusieurs thèmes et les modes de plateforme, ainsi que les mises à jour et le support pendant 12 mois à compter de l’achat. Après ces 12 mois, la clé reste valable pour ce qui ne dépend pas du service hébergé ; la synchronisation hébergée et le MCP en direct nécessitent une licence en cours de validité.</P>
        <Ul items={['Prix et période de lancement : affichés sur la page Tarifs au moment de l’achat. Jusqu’au 15 novembre 2026, Escala Pro est à 45 USD ; ensuite, 69 USD. La synchronisation hébergée exige une licence Pro.', 'Remboursement : 14 jours après l’achat, sur demande via le formulaire de contact.', 'Une clé = un acheteur. La revente ou le partage de clé est interdit et peut entraîner sa révocation.']} />
      </> },
      { id: 'usage', h: `${acc ? '7' : '6'}. Utilisation acceptable`, body: <P>N’utilisez pas le service pour y porter atteinte (surcharge, contournement des limites, accès aux données d’autrui), pour y publier des contenus illicites, ni pour revendre l’accès à l’API. Nous pouvons limiter ou suspendre un usage abusif.</P> },
      { id: 'garantie', h: `${acc ? '8' : '7'}. Disponibilité et responsabilité`, body: <P>Le service est fourni « en l’état », sans garantie de disponibilité continue ; la version gratuite l’est au mieux de nos moyens. Conservez vos systèmes ailleurs aussi (export, GitHub) : une synchronisation publiée n’est pas une sauvegarde. Dans la mesure permise par la loi, notre responsabilité est limitée aux dommages directs et plafonnée au prix payé pour la licence Pro ; cela n’affecte pas les droits que la loi reconnaît impérativement aux consommateurs.</P> },
      { id: 'fin', h: `${acc ? '9' : '8'}. Modification et fin`, body: <P>Nous pouvons faire évoluer le service et ces conditions ; un changement substantiel est signalé sur cette page avec sa date. Vous pouvez cesser d’utiliser le service à tout moment{acc ? ' et supprimer votre compte' : ''}.</P> },
      { id: 'droit', h: `${acc ? '10' : '9'}. Droit applicable`, body: <P>Ces conditions sont soumises au droit français. Tout litige relève des juridictions françaises compétentes, sous réserve des règles protectrices dont bénéficie le consommateur dans son pays de résidence au sein de l’Union européenne. Voir aussi les <A href={LEGAL_PATH}>mentions légales</A> et la <A href={PRIVACY_PATH}>politique de confidentialité</A>.</P> },
    ],
  }
  if (l === 'es') return {
    title: 'Términos de uso',
    description: 'Términos de uso de Escala Tokens: qué cubre la licencia MIT, el servicio alojado, el plugin de Figma, la licencia Pro y sus contenidos.',
    lead: 'Escala Tokens se compone de varias cosas que no tienen la misma licencia. Esta página dice cuál se rige por qué, para que no haya dudas.',
    note: 'Traducción informativa. La versión francesa es la que tiene valor legal.',
    sections: [
      { id: 'portee', h: '1. Qué cubren estos términos', body: <P>Rigen el servicio alojado en escalatokens.com: el configurador en línea, la sincronización, el servidor MCP en vivo{acc ? ', las cuentas' : ''} y la licencia Pro. No modifican la licencia del código fuente (artículo 2). Al usar el servicio, los acepta.</P> },
      { id: 'mit', h: '2. El código: licencia MIT', body: <P>El configurador, la CLI y el servidor MCP publicados en GitHub están bajo <A href="https://github.com/Duscenko/escala-tokens/blob/main/LICENSE" external>licencia MIT</A>: puede copiarlos, modificarlos, alojarlos usted y usarlos comercialmente, conservando el aviso de licencia. Esa licencia cubre el código, no el servicio que alojamos: si aloja su propia instancia no obtiene cuenta, guardado en línea, sincronización ni licencia Pro de escalatokens.com, y fija sus propios límites.</P> },
      { id: 'plugin', h: '3. El plugin de Figma: licencia propietaria', body: <P>El plugin de Figma es un producto aparte, gratuito de instalar, cuyo código fuente no se publica y no está bajo licencia MIT. Se ofrece con una licencia de uso que prohíbe copiarlo, modificarlo, redistribuirlo o crear obras derivadas. Las funciones que recibe del servicio alojado dependen de la licencia Pro (artículo 6).</P> },
      { id: 'contenu', h: '4. Sus contenidos', body: <P>Los sistemas de diseño que usted crea y los tokens y archivos que exporta son suyos. No pedimos licencia ni atribución y no los usamos para entrenar modelos. Solo nos concede el derecho técnico de almacenarlos y servirlos para prestar el servicio que solicita (por ejemplo, la sincronización). Los tokens publicados los puede leer quien conozca el identificador del sistema: no incluya información confidencial.</P> },
      ...(acc ? [{ id: 'compte', h: '5. Cuenta', body: <P>La cuenta es opcional: el configurador y la exportación funcionan sin ella. Usted es responsable de la confidencialidad de sus credenciales. Una cuenta gratuita no guarda nada en línea; el guardado en línea y la sincronización requieren una licencia Pro. Una clave de licencia se vincula a una sola cuenta. Puede exportar sus datos y eliminar su cuenta en cualquier momento desde la página de Cuenta; la eliminación es definitiva.</P> }] : []),
      { id: 'pro', h: `${acc ? '6' : '5'}. Escala Pro`, body: <>
        <P>Escala Pro se vende con pago único a través de Polar, que actúa como vendedor oficial (merchant of record): el pago, la facturación y el IVA se rigen por las condiciones de Polar. Incluye la sincronización alojada, el servidor MCP en vivo, varios temas y los modos de plataforma, además de actualizaciones y soporte durante 12 meses desde la compra. Pasados esos 12 meses, la clave sigue valiendo para lo que no depende del servicio alojado; la sincronización alojada y el MCP en vivo requieren una licencia vigente.</P>
        <Ul items={['Precio y periodo de lanzamiento: se muestran en la página de Precios en el momento de la compra. Hasta el 15 de noviembre de 2026, Escala Pro cuesta 45 USD; después, 69 USD. La sincronización alojada exige una licencia Pro.', 'Reembolso: 14 días desde la compra, a petición mediante el formulario de contacto.', 'Una clave = un comprador. Revender o compartir la clave está prohibido y puede causar su revocación.']} />
      </> },
      { id: 'usage', h: `${acc ? '7' : '6'}. Uso aceptable`, body: <P>No use el servicio para dañarlo (sobrecarga, eludir límites, acceder a datos ajenos), para publicar contenidos ilícitos ni para revender el acceso a la API. Podemos limitar o suspender un uso abusivo.</P> },
      { id: 'garantie', h: `${acc ? '8' : '7'}. Disponibilidad y responsabilidad`, body: <P>El servicio se presta «tal cual», sin garantía de disponibilidad continua; la versión gratuita, lo mejor que podemos. Guarde también sus sistemas en otro lugar (exportación, GitHub): una sincronización publicada no es una copia de seguridad. En la medida que permita la ley, nuestra responsabilidad se limita a los daños directos y al precio pagado por la licencia Pro; esto no afecta a los derechos que la ley reconoce imperativamente a los consumidores.</P> },
      { id: 'fin', h: `${acc ? '9' : '8'}. Cambios y fin`, body: <P>Podemos modificar el servicio y estos términos; un cambio sustancial se indica en esta página con su fecha. Puede dejar de usar el servicio en cualquier momento{acc ? ' y eliminar su cuenta' : ''}.</P> },
      { id: 'droit', h: `${acc ? '10' : '9'}. Ley aplicable`, body: <P>Estos términos se rigen por el derecho francés. Cualquier litigio corresponde a los tribunales franceses competentes, sin perjuicio de las normas de protección de las que goza el consumidor en su país de residencia dentro de la Unión Europea. Vea también el <A href={LEGAL_PATH}>aviso legal</A> y la <A href={PRIVACY_PATH}>política de privacidad</A>.</P> },
    ],
  }
  return {
    title: 'Terms of use',
    description: 'Escala Tokens terms of use: what the MIT licence covers, the hosted service, the Figma plugin, the Pro licence and your content.',
    lead: 'Escala Tokens is several things that do not share one licence. This page says which is governed by what, so there is no doubt.',
    note: 'Informative translation. The French version is the legally binding one.',
    sections: [
      { id: 'portee', h: '1. What these terms cover', body: <P>They govern the service hosted at escalatokens.com: the online configurator, sync, the live MCP server{acc ? ', accounts' : ''} and the Pro licence. They do not change the licence of the source code (section 2). By using the service you accept them.</P> },
      { id: 'mit', h: '2. The code: MIT licence', body: <P>The configurator, the CLI and the MCP server published on GitHub are under the <A href="https://github.com/Duscenko/escala-tokens/blob/main/LICENSE" external>MIT License</A>: you may copy, modify, self-host and use them commercially, keeping the licence notice. That licence covers the code, not the service we host: if you host your own instance you get no account, online saving, sync or Pro licence from escalatokens.com, and you set your own limits.</P> },
      { id: 'plugin', h: '3. The Figma plugin: proprietary licence', body: <P>The Figma plugin is a separate product, free to install, whose source code is not published and is not under the MIT licence. It is provided under a licence of use that forbids copying, modifying, redistributing it or creating derivative works. The features it receives from the hosted service fall under the Pro licence (section 6).</P> },
      { id: 'contenu', h: '4. Your content', body: <P>The design systems you build and the tokens and files you export are yours. We ask for no licence or attribution and do not use them to train models. You only grant us the technical right to store and serve them to provide the service you ask for (for example sync). Published tokens can be read by anyone who knows the system ID: do not put confidential information in them.</P> },
      ...(acc ? [{ id: 'compte', h: '5. Account', body: <P>An account is optional: the configurator and export work without one. You are responsible for keeping your credentials confidential. A free account saves nothing online; online saving and sync require a Pro licence. A licence key is tied to one account. You can export your data and delete your account at any time from the Account page; deletion is permanent.</P> }] : []),
      { id: 'pro', h: `${acc ? '6' : '5'}. Escala Pro`, body: <>
        <P>Escala Pro is sold as a one-time payment through Polar, which acts as merchant of record: payment, invoicing and VAT are governed by Polar’s terms. It includes hosted sync, the live MCP server, multiple themes and platform modes, plus updates and support for 12 months from purchase. After those 12 months the key stays valid for whatever does not depend on the hosted service; hosted sync and the live MCP require a licence in date.</P>
        <Ul items={['Price and launch period: shown on the Pricing page at the time of purchase. Until November 15, 2026, Escala Pro is 45 USD; after that, 69 USD. Hosted sync requires a Pro licence.', 'Refund: 14 days from purchase, on request through the contact form.', 'One key = one buyer. Reselling or sharing a key is forbidden and may lead to its revocation.']} />
      </> },
      { id: 'usage', h: `${acc ? '7' : '6'}. Acceptable use`, body: <P>Do not use the service to harm it (overload, bypassing limits, reaching other people’s data), to publish unlawful content, or to resell API access. We may limit or suspend abusive use.</P> },
      { id: 'garantie', h: `${acc ? '8' : '7'}. Availability and liability`, body: <P>The service is provided “as is”, with no guarantee of continuous availability; the free tier on a best-effort basis. Keep your systems elsewhere too (export, GitHub): a published sync is not a backup. To the extent the law allows, our liability is limited to direct damages and capped at the price paid for the Pro licence; this does not affect rights the law gives consumers that cannot be waived.</P> },
      { id: 'fin', h: `${acc ? '9' : '8'}. Changes and ending`, body: <P>We may change the service and these terms; a substantial change is flagged on this page with its date. You can stop using the service at any time{acc ? ' and delete your account' : ''}.</P> },
      { id: 'droit', h: `${acc ? '10' : '9'}. Governing law`, body: <P>These terms are governed by French law. Any dispute falls under the competent French courts, without prejudice to the protective rules a consumer enjoys in their country of residence within the European Union. See also the <A href={LEGAL_PATH}>legal notice</A> and the <A href={PRIVACY_PATH}>privacy policy</A>.</P> },
    ],
  }
}

const UPDATED_LABEL: Record<Locale, string> = { fr: 'Mis à jour le', en: 'Updated', es: 'Actualizado el' }

function formatDate(iso: string, l: Locale): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(l, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, locale } = useI18n()
  const articleRef = useRef<HTMLDivElement>(null)
  const doc = kind === 'legal' ? legalDoc(locale) : kind === 'terms' ? termsDoc(locale) : privacyDoc(locale)
  const other = kind === 'privacy'
    ? { href: TERMS_PATH, label: termsDoc(locale).title }
    : kind === 'terms'
      ? { href: PRIVACY_PATH, label: privacyDoc(locale).title }
      : { href: PRIVACY_PATH, label: privacyDoc(locale).title }
  const toc: TocEntry[] = doc.sections.map((s) => ({ id: s.id, label: s.h }))

  useEffect(() => {
    applyDocumentHead({
      title: `${doc.title} — Escala Tokens`,
      description: doc.description,
      canonicalPath: kind === 'legal' ? LEGAL_PATH : kind === 'terms' ? TERMS_PATH : PRIVACY_PATH,
      robots: 'index, follow',
    })
  }, [doc.title, doc.description, kind])

  return (
    <div className="h-screen bg-app text-fg flex flex-col">
      <PublicHeader />
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div ref={articleRef} className="@container flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain">
          <article className="w-full min-w-0 max-w-4xl mx-auto px-5 @min-[760px]:px-8 py-7 flex flex-col gap-8">
            <DocHeader
              section={t('About')}
              kind={t('Legal & data')}
              title={doc.title}
              actions={<span className="text-body"><A href={other.href}>{other.label}</A></span>}
            />
            <DocTitle
              title={doc.title}
              eyebrow={`${UPDATED_LABEL[locale]} ${formatDate(LEGAL.updated, locale)}`}
              lead={doc.lead}
            />
            {doc.note && <p className="-mt-5 text-body text-fg-faint max-w-xl">{doc.note}</p>}
            {doc.sections.map((s) => (
              <DocSection key={s.id} id={s.id} title={s.h}>{s.body}</DocSection>
            ))}
          </article>
        </div>
        <div className="hidden xl:block w-48 flex-shrink-0 border-l border-line p-5 overflow-y-auto">
          <OnThisPage entries={toc} scrollRoot={articleRef} />
        </div>
      </div>
    </div>
  )
}
