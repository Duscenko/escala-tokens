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

import { useEffect, useRef, type ReactNode } from 'react'
import { DocHeader, DocSection, DocTitle, OnThisPage, type TocEntry } from '../configurator/docs/blocks'
import { PublicHeader } from './PublicReadingPage'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n, type Locale } from '../../lib/i18n'
import { CONTACT_PATH, LEGAL, LEGAL_PATH, PRIVACY_PATH } from '../../lib/legal'

export type LegalKind = 'legal' | 'privacy'

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

/** The contact channel is the form: no inbox is published anywhere. */
const contactLink = (l: Locale) => <A href={CONTACT_PATH}>{{ fr: 'formulaire de contact', en: 'contact form', es: 'formulario de contacto' }[l]}</A>
const hostLink = <A href={LEGAL.host.site} external>{LEGAL.host.site.replace('https://', '')}</A>
const cnil = <A href="https://www.cnil.fr/fr/plaintes" external>cnil.fr</A>

/** French sets a (non-breaking) space before a colon; English and Spanish don't. */
const colon = (l: Locale) => (l === 'fr' ? ' :' : ':')

function identity(l: Locale): ReactNode[] {
  const status = { fr: 'personne physique, France', en: 'private individual, France', es: 'persona física, Francia' }[l]
  const lines: ReactNode[] = [<><span className="text-fg">{LEGAL.publisher}</span>, {status}</>]
  if (LEGAL.siret) lines.push(<>SIRET{colon(l)} {LEGAL.siret}</>)
  if (LEGAL.address) lines.push(<>{LEGAL.address}</>)
  lines.push(<>{{ fr: 'Contact', en: 'Contact', es: 'Contacto' }[l]}{colon(l)} {contactLink(l)}</>)
  return lines
}

const hostItems = [<span className="text-fg">{LEGAL.host.name}</span>, LEGAL.host.address, hostLink]

// ── Mentions légales ────────────────────────────────────────────────────────

function legalDoc(l: Locale): Doc {
  if (l === 'fr') return {
    title: 'Mentions légales',
    description: 'Éditeur, directeur de la publication et hébergeur d’Escala Tokens, service édité en France.',
    lead: 'Escala Tokens est un service en ligne édité en France. Cette page donne les informations exigées par la loi pour la confiance dans l’économie numérique (LCEN, art. 6-III).',
    sections: [
      { id: 'editeur', h: 'Éditeur du site', body: <Ul items={identity('fr')} /> },
      { id: 'directeur', h: 'Directeur de la publication', body: <P>{LEGAL.publisher}</P> },
      { id: 'hebergeur', h: 'Hébergeur', body: <Ul items={hostItems} /> },
      { id: 'propriete', h: 'Propriété intellectuelle', body: <P>Le code source d’Escala Tokens est publié sous licence MIT. Les systèmes de design que vous créez avec l’outil vous appartiennent : les tokens et fichiers exportés ne sont soumis à aucune licence ni obligation d’attribution de notre part. Figma est une marque de Figma, Inc. ; ce projet n’est ni affilié à Figma ni approuvé par elle.</P> },
      { id: 'donnees', h: 'Données personnelles', body: <P>Le traitement des données respecte le Règlement général sur la protection des données (RGPD) et la loi Informatique et Libertés ; il est décrit dans la <A href={PRIVACY_PATH}>politique de confidentialité</A>. Le site ne dépose aucun cookie.</P> },
      { id: 'droit', h: 'Droit applicable', body: <P>Le site et les présentes mentions sont soumis au droit français. Tout litige relève des juridictions françaises compétentes, sous réserve des règles protectrices dont bénéficie le consommateur dans son pays de résidence au sein de l’Union européenne.</P> },
    ],
  }
  if (l === 'es') return {
    title: 'Aviso legal',
    description: 'Editor, director de la publicación y alojamiento de Escala Tokens, servicio editado en Francia.',
    lead: 'Escala Tokens es un servicio en línea editado en Francia. Esta página recoge la información que exige la ley francesa sobre la confianza en la economía digital (LCEN, art. 6-III).',
    note: 'Traducción informativa. La versión francesa (Mentions légales) es la que tiene valor legal.',
    sections: [
      { id: 'editeur', h: 'Editor del sitio', body: <Ul items={identity('es')} /> },
      { id: 'directeur', h: 'Director de la publicación', body: <P>{LEGAL.publisher}</P> },
      { id: 'hebergeur', h: 'Alojamiento', body: <Ul items={hostItems} /> },
      { id: 'propriete', h: 'Propiedad intelectual', body: <P>El código fuente de Escala Tokens se publica bajo licencia MIT. Los sistemas de diseño que usted crea con la herramienta son suyos: los tokens y archivos exportados no llevan ninguna licencia ni obligación de atribución por nuestra parte. Figma es una marca de Figma, Inc.; este proyecto no está afiliado a Figma ni respaldado por ella.</P> },
      { id: 'donnees', h: 'Datos personales', body: <P>El tratamiento de datos cumple el Reglamento General de Protección de Datos (RGPD) y la ley francesa Informatique et Libertés; se describe en la <A href={PRIVACY_PATH}>política de privacidad</A>. El sitio no usa cookies.</P> },
      { id: 'droit', h: 'Ley aplicable', body: <P>El sitio y este aviso se rigen por el derecho francés. Cualquier litigio corresponde a los tribunales franceses competentes, sin perjuicio de las normas de protección de las que goza el consumidor en su país de residencia dentro de la Unión Europea.</P> },
    ],
  }
  return {
    title: 'Legal notice',
    description: 'Publisher, publication director and host of Escala Tokens, a service published from France.',
    lead: 'Escala Tokens is an online service published from France. This page gives the information required by French law on confidence in the digital economy (LCEN, art. 6-III).',
    note: 'Informative translation. The French version (Mentions légales) is the legally binding one.',
    sections: [
      { id: 'editeur', h: 'Publisher', body: <Ul items={identity('en')} /> },
      { id: 'directeur', h: 'Publication director', body: <P>{LEGAL.publisher}</P> },
      { id: 'hebergeur', h: 'Host', body: <Ul items={hostItems} /> },
      { id: 'propriete', h: 'Intellectual property', body: <P>The Escala Tokens source code is published under the MIT License. The design systems you build with the tool are yours: exported tokens and files carry no licence or attribution requirement from us. Figma is a trademark of Figma, Inc.; this project is not affiliated with or endorsed by Figma.</P> },
      { id: 'donnees', h: 'Personal data', body: <P>Data is handled in line with the EU General Data Protection Regulation (GDPR) and the French Data Protection Act (loi Informatique et Libertés), as described in the <A href={PRIVACY_PATH}>privacy policy</A>. The site sets no cookies.</P> },
      { id: 'droit', h: 'Governing law', body: <P>The site and this notice are governed by French law. Any dispute falls under the competent French courts, without prejudice to the protective rules a consumer enjoys in their country of residence within the European Union.</P> },
    ],
  }
}

// ── Politique de confidentialité ────────────────────────────────────────────

function privacyDoc(l: Locale): Doc {
  if (l === 'fr') return {
    title: 'Politique de confidentialité',
    description: 'Données traitées par Escala Tokens, service édité en France, conformément au RGPD : aucun cookie, aucune publicité, aucun profilage.',
    lead: 'En bref : pas de compte, pas de cookie, pas de publicité, pas de profilage, pas de revente de données. Votre système de design reste dans votre navigateur. Escala Tokens est édité en France et applique le RGPD (règlement (UE) 2016/679) et la loi Informatique et Libertés.',
    sections: [
      { id: 'responsable', h: 'Responsable du traitement', body: <>
        <Ul items={identity('fr')} />
        <P>Autorité de contrôle compétente : la Commission nationale de l’informatique et des libertés (CNIL). Compte tenu de la nature du traitement, la désignation d’un délégué à la protection des données n’est pas obligatoire.</P>
      </> },
      { id: 'systeme', h: '1. Votre système de design', body: <P>Ce que vous configurez (couleurs, typographie, espacements…) est enregistré uniquement dans le stockage local de votre navigateur (localStorage). Nous n’y avons pas accès et il n’existe aucun profil côté serveur. Vous l’effacez en vidant les données du site dans votre navigateur.</P> },
      { id: 'tokens', h: '2. Tokens publiés (synchronisation Figma et MCP)', body: <>
        <P>Uniquement si vous cliquez sur « Sync now » ou activez la synchronisation automatique, le contenu de vos tokens est envoyé et stocké chez notre hébergeur (Vercel Blob) sous un identifiant de système. Une empreinte chiffrée (SHA-256) d’une clé de publication est stockée pour empêcher qu’un tiers écrase votre système.</P>
        <P><span className="text-fg">Important :</span> les tokens publiés sont lisibles par toute personne qui connaît l’identifiant du système — c’est ce qui permet au plugin Figma et aux agents IA de les lire. N’indiquez pas d’informations confidentielles dans le nom de votre système.</P>
        <Ul items={['Base légale : exécution du service que vous demandez (art. 6.1.b RGPD).', 'Durée : jusqu’à votre demande de suppression.']} />
      </> },
      { id: 'github', h: '3. GitHub', body: <P>Si vous connectez GitHub, votre jeton d’accès reste dans votre navigateur et n’est envoyé qu’à GitHub. Lors d’une connexion OAuth, notre serveur échange le code contre un jeton et vous le transmet sans le conserver. Les fichiers sont poussés dans le dépôt que vous choisissez ; GitHub est alors responsable de son propre traitement.</P> },
      { id: 'audience', h: '4. Mesure d’audience', body: <>
        <P>Nous utilisons Vercel Web Analytics, qui ne dépose aucun cookie et n’utilise aucun identifiant stocké sur votre appareil. Un visiteur est compté via une empreinte anonyme recalculée chaque jour, qui ne permet pas de vous suivre d’un jour à l’autre ni d’un site à l’autre.</P>
        <Ul items={['Données : page consultée (sans identifiant de système), site de provenance, pays, type d’appareil, navigateur et système d’exploitation.', 'Actions comptées : export (format choisi), ouverture du plugin Figma, publication Figma, envoi vers GitHub, style adopté, sauvegarde. Jamais de texte que vous saisissez, de nom de projet ni de couleur.', 'Base légale : intérêt légitime à améliorer l’outil (art. 6.1.f RGPD). Ce dispositif respecte les conditions d’exemption de consentement de la CNIL pour la mesure d’audience.']} />
        <P>Côté serveur, chaque appel à l’outil MCP enregistre uniquement le nom de l’outil utilisé, sans identifiant de projet ni adresse IP.</P>
      </> },
      { id: 'journaux', h: '5. Journaux techniques et sécurité', body: <P>Comme tout hébergeur, Vercel enregistre les requêtes (adresse IP, navigateur, page demandée, date) pour assurer le fonctionnement du service, la protection contre les attaques et la limitation des abus (pare-feu, limite de requêtes). Base légale : intérêt légitime à sécuriser le service (art. 6.1.f RGPD). Ces journaux sont conservés au maximum 30 jours.</P> },
      { id: 'polices', h: '6. Polices Google Fonts', body: <P>Lorsque vous choisissez une police ou prévisualisez un style, votre navigateur télécharge la police depuis les serveurs de Google (fonts.googleapis.com), qui reçoivent alors votre adresse IP. Google indique ne pas utiliser ces données pour la publicité.</P> },
      { id: 'formulaire', h: '7. Formulaire de contact', body: <>
        <P>Lorsque vous nous écrivez via le {contactLink('fr')}, nous recevons votre adresse e-mail, votre message, le sujet choisi et, si vous les indiquez, votre nom et l’identifiant de votre système. Ces données servent uniquement à vous répondre.</P>
        <Ul items={['Base légale : intérêt légitime à répondre à votre demande (art. 6.1.f RGPD) ; obligation légale pour les demandes d’exercice de droits (art. 6.1.c).', 'Aucun stockage sur nos serveurs : le message est transmis une seule fois par e-mail via Resend, puis conservé dans la messagerie de l’éditeur le temps de traiter la demande, et au maximum 3 ans après le dernier échange.', 'Protection anti-spam sans cookie ni CAPTCHA : champ invisible, délai minimal de saisie et limite de messages par adresse IP.']} />
      </> },
      { id: 'cookies', h: 'Cookies et stockage local', body: <P>Le site ne dépose aucun cookie. Il utilise le stockage local de votre navigateur uniquement pour des fonctions que vous demandez : votre système de design, la langue, le thème clair/sombre, votre clé de publication et, si vous le fournissez, votre jeton GitHub. Ces usages sont strictement nécessaires au service demandé et ne requièrent pas de consentement (art. 82 de la loi Informatique et Libertés, directive ePrivacy).</P> },
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
    description: 'Datos que trata Escala Tokens, servicio editado en Francia, conforme al RGPD: sin cookies, sin publicidad, sin perfiles.',
    lead: 'En resumen: sin cuentas, sin cookies, sin publicidad, sin perfiles y sin venta de datos. Su sistema de diseño se queda en su navegador. Escala Tokens se edita en Francia y aplica el RGPD (Reglamento (UE) 2016/679) y la ley francesa Informatique et Libertés.',
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
        <Ul items={['Base legal: ejecución del servicio que usted solicita (art. 6.1.b RGPD).', 'Plazo: hasta que solicite su eliminación.']} />
      </> },
      { id: 'github', h: '3. GitHub', body: <P>Si conecta GitHub, su token de acceso se queda en su navegador y solo se envía a GitHub. En una conexión OAuth, nuestro servidor intercambia el código por un token y se lo entrega sin guardarlo. Los archivos se suben al repositorio que usted elige; a partir de ahí GitHub es responsable de su propio tratamiento.</P> },
      { id: 'audience', h: '4. Medición de audiencia', body: <>
        <P>Usamos Vercel Web Analytics, que no instala cookies ni usa identificadores guardados en su dispositivo. Cada visitante se cuenta mediante una huella anónima que se recalcula cada día y no permite seguirle de un día a otro ni entre sitios.</P>
        <Ul items={['Datos: página visitada (sin identificador de sistema), sitio de procedencia, país, tipo de dispositivo, navegador y sistema operativo.', 'Acciones contadas: exportación (formato elegido), apertura del plugin de Figma, publicación en Figma, envío a GitHub, estilo adoptado, guardado. Nunca texto que usted escribe, nombres de proyecto ni colores.', 'Base legal: interés legítimo en mejorar la herramienta (art. 6.1.f RGPD). Cumple las condiciones de la CNIL para medir audiencia sin consentimiento.']} />
        <P>En el servidor, cada llamada a la herramienta MCP registra solo el nombre de la herramienta usada, sin identificador de proyecto ni dirección IP.</P>
      </> },
      { id: 'journaux', h: '5. Registros técnicos y seguridad', body: <P>Como cualquier proveedor de alojamiento, Vercel registra las solicitudes (dirección IP, navegador, página solicitada, fecha) para el funcionamiento del servicio, la protección frente a ataques y la limitación de abusos (cortafuegos, límite de solicitudes). Base legal: interés legítimo en la seguridad del servicio (art. 6.1.f RGPD). Se conservan como máximo 30 días.</P> },
      { id: 'polices', h: '6. Fuentes de Google Fonts', body: <P>Cuando elige una fuente o previsualiza un estilo, su navegador descarga la fuente desde los servidores de Google (fonts.googleapis.com), que reciben su dirección IP. Google indica que no usa estos datos para publicidad.</P> },
      { id: 'formulaire', h: '7. Formulario de contacto', body: <>
        <P>Cuando nos escribe mediante el {contactLink('es')}, recibimos su dirección de correo, su mensaje, el tema elegido y, si los indica, su nombre y el identificador de su sistema. Estos datos solo sirven para responderle.</P>
        <Ul items={['Base legal: interés legítimo en responder a su solicitud (art. 6.1.f RGPD); obligación legal para las solicitudes de ejercicio de derechos (art. 6.1.c).', 'Sin almacenamiento en nuestros servidores: el mensaje se transmite una sola vez por correo mediante Resend y se conserva en el buzón del editor mientras se atiende la solicitud, y como máximo 3 años tras el último intercambio.', 'Protección anti-spam sin cookies ni CAPTCHA: campo invisible, tiempo mínimo de escritura y límite de mensajes por dirección IP.']} />
      </> },
      { id: 'cookies', h: 'Cookies y almacenamiento local', body: <P>El sitio no instala cookies. Usa el almacenamiento local de su navegador solo para funciones que usted solicita: su sistema de diseño, el idioma, el tema claro/oscuro, su clave de publicación y, si lo proporciona, su token de GitHub. Son usos estrictamente necesarios para el servicio solicitado y no requieren consentimiento (art. 82 de la ley Informatique et Libertés, directiva ePrivacy).</P> },
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
    description: 'Data processed by Escala Tokens, a service published from France, under the GDPR: no cookies, no advertising, no profiling.',
    lead: 'In short: no accounts, no cookies, no advertising, no profiling, no selling of data. Your design system stays in your browser. Escala Tokens is published from France and applies the GDPR (Regulation (EU) 2016/679) and the French Data Protection Act.',
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
        <Ul items={['Legal basis: performance of the service you request (GDPR art. 6.1.b).', 'Retention: until you ask for deletion.']} />
      </> },
      { id: 'github', h: '3. GitHub', body: <P>If you connect GitHub, your access token stays in your browser and is only ever sent to GitHub. During an OAuth sign-in, our server exchanges the code for a token and hands it to you without keeping it. Files are pushed to the repository you choose; GitHub is then responsible for its own processing.</P> },
      { id: 'audience', h: '4. Audience measurement', body: <>
        <P>We use Vercel Web Analytics, which sets no cookies and stores no identifier on your device. A visitor is counted through an anonymous fingerprint recomputed every day, which cannot follow you from one day to the next or across sites.</P>
        <Ul items={['Data: page viewed (without any system ID), referring site, country, device type, browser and operating system.', 'Actions counted: export (format chosen), Figma plugin opened, Figma publish, GitHub push, style adopted, save. Never text you type, project names or colours.', 'Legal basis: legitimate interest in improving the tool (GDPR art. 6.1.f). It meets the CNIL’s conditions for consent-exempt audience measurement.']} />
        <P>On the server, each call to the MCP tool logs only the name of the tool used — no project ID, no IP address.</P>
      </> },
      { id: 'journaux', h: '5. Technical logs and security', body: <P>Like any host, Vercel logs requests (IP address, browser, requested page, time) to run the service, protect it from attacks and limit abuse (firewall, rate limiting). Legal basis: legitimate interest in securing the service (GDPR art. 6.1.f). These logs are kept for at most 30 days.</P> },
      { id: 'polices', h: '6. Google Fonts', body: <P>When you choose a font or preview a style, your browser downloads that font from Google’s servers (fonts.googleapis.com), which then receive your IP address. Google states it does not use this data for advertising.</P> },
      { id: 'formulaire', h: '7. Contact form', body: <>
        <P>When you write to us through the {contactLink('en')}, we receive your email address, your message, the topic you chose and, if you provide them, your name and your system ID. This data is used only to answer you.</P>
        <Ul items={['Legal basis: legitimate interest in answering your request (GDPR art. 6.1.f); legal obligation for requests to exercise your rights (art. 6.1.c).', 'Nothing is stored on our servers: the message is relayed once by email through Resend, then kept in the publisher’s mailbox while the request is handled, and at most 3 years after the last exchange.', 'Spam protection without cookies or CAPTCHA: a hidden field, a minimum typing time and a per-IP message limit.']} />
      </> },
      { id: 'cookies', h: 'Cookies and local storage', body: <P>The site sets no cookies. It uses your browser’s local storage only for features you ask for: your design system, language, light/dark theme, your publish key and, if you provide one, your GitHub token. These uses are strictly necessary for the service you request and need no consent (art. 82 of the French Data Protection Act, ePrivacy Directive).</P> },
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

const UPDATED_LABEL: Record<Locale, string> = { fr: 'Mis à jour le', en: 'Updated', es: 'Actualizado el' }

function formatDate(iso: string, l: Locale): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(l, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, locale } = useI18n()
  const articleRef = useRef<HTMLDivElement>(null)
  const doc = kind === 'legal' ? legalDoc(locale) : privacyDoc(locale)
  const other = kind === 'legal'
    ? { href: PRIVACY_PATH, label: privacyDoc(locale).title }
    : { href: LEGAL_PATH, label: legalDoc(locale).title }
  const toc: TocEntry[] = doc.sections.map((s) => ({ id: s.id, label: s.h }))

  useEffect(() => {
    applyDocumentHead({
      title: `${doc.title} — Escala Tokens`,
      description: doc.description,
      canonicalPath: kind === 'legal' ? LEGAL_PATH : PRIVACY_PATH,
      robots: 'index, follow',
    })
  }, [doc.title, doc.description, kind])

  return (
    <div className="h-screen bg-app text-fg flex flex-col">
      <PublicHeader current="legal" />
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
