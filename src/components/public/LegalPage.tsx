// `/legal` (Mentions légales) and `/privacy` (Politique de confidentialité).
//
// Written per locale rather than through `t()` keys: these are legal documents,
// reviewed as whole texts, and a sentence-by-sentence dictionary would let one
// clause drift out of step with the rest. French is the authoritative version
// (the publisher is in France); en/es are translations and say so.
//
// Every factual claim here has to stay true of the code. If you add a third
// party, a cookie, a new stored field or a new analytics property, update the
// privacy text in all three languages and bump `LEGAL.updated`.
//   - analytics: src/lib/analytics.ts (cookieless, enum-only events, URL scrub)
//   - published tokens + claims: api/tokens.ts (public Blob, hashed claim)
//   - MCP usage log: api/mcp.ts (tool name only)
//   - Google Fonts: src/lib/fonts.ts (loaded on demand from Google's CDN)

import { useEffect, type ReactNode } from 'react'
import { BrandMark } from '../configurator/TopNav'
import { applyDocumentHead } from '../../lib/documentHead'
import { useI18n, type Locale } from '../../lib/i18n'
import { LEGAL, LEGAL_PATH, PRIVACY_PATH } from '../../lib/legal'

export type LegalKind = 'legal' | 'privacy'

type Section = { h: string; body: ReactNode }
type Doc = { title: string; description: string; intro?: ReactNode; sections: Section[] }

const mail = <a className="text-fg underline underline-offset-2" href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
const host = <a className="text-fg underline underline-offset-2" href={LEGAL.host.site} target="_blank" rel="noreferrer">{LEGAL.host.site.replace('https://', '')}</a>
const cnil = <a className="text-fg underline underline-offset-2" href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noreferrer">cnil.fr</a>

/** French sets a (thin) space before a colon; English and Spanish don't. */
const colon = (l: Locale) => (l === 'fr' ? '\u00a0:' : ':')

function Ul({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 pl-4 list-disc marker:text-fg-faint">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  )
}

function identity(l: Locale): ReactNode[] {
  const lines: ReactNode[] = []
  const status = { fr: 'personne physique', en: 'private individual', es: 'persona física' }[l]
  lines.push(<><span className="text-fg">{LEGAL.publisher}</span>, {status}</>)
  if (LEGAL.siret) lines.push(<>SIRET{colon(l)} {LEGAL.siret}</>)
  if (LEGAL.address) lines.push(<>{LEGAL.address}</>)
  lines.push(<>{{ fr: 'Contact', en: 'Contact', es: 'Contacto' }[l]}{colon(l)} {mail}</>)
  return lines
}

// ── Mentions légales ────────────────────────────────────────────────────────

function legalDoc(l: Locale): Doc {
  if (l === 'fr') return {
    title: 'Mentions légales',
    description: 'Éditeur, directeur de la publication et hébergeur du site Escala Tokens.',
    sections: [
      { h: 'Éditeur du site', body: <Ul items={identity('fr')} /> },
      { h: 'Directeur de la publication', body: <p>{LEGAL.publisher}</p> },
      { h: 'Hébergeur', body: <Ul items={[<span className="text-fg">{LEGAL.host.name}</span>, LEGAL.host.address, host]} /> },
      { h: 'Propriété intellectuelle', body: <p>Le code source d’Escala Tokens est publié sous licence MIT. Les systèmes de design que vous créez avec l’outil vous appartiennent : les tokens et fichiers exportés ne sont soumis à aucune licence ni obligation d’attribution de notre part. Figma est une marque de Figma, Inc. ; ce projet n’est ni affilié à Figma ni approuvé par elle.</p> },
      { h: 'Données personnelles', body: <p>Le traitement des données est décrit dans la <a className="text-fg underline underline-offset-2" href={PRIVACY_PATH}>politique de confidentialité</a>. Le site ne dépose aucun cookie.</p> },
    ],
  }
  if (l === 'es') return {
    title: 'Aviso legal',
    description: 'Editor, director de la publicación y proveedor de alojamiento de Escala Tokens.',
    intro: <p className="text-fg-faint">Traducción informativa. La versión francesa (Mentions légales) es la que tiene valor legal.</p>,
    sections: [
      { h: 'Editor del sitio', body: <Ul items={identity('es')} /> },
      { h: 'Director de la publicación', body: <p>{LEGAL.publisher}</p> },
      { h: 'Alojamiento', body: <Ul items={[<span className="text-fg">{LEGAL.host.name}</span>, LEGAL.host.address, host]} /> },
      { h: 'Propiedad intelectual', body: <p>El código fuente de Escala Tokens se publica bajo licencia MIT. Los sistemas de diseño que usted crea con la herramienta son suyos: los tokens y archivos exportados no llevan ninguna licencia ni obligación de atribución por nuestra parte. Figma es una marca de Figma, Inc.; este proyecto no está afiliado a Figma ni respaldado por ella.</p> },
      { h: 'Datos personales', body: <p>El tratamiento de datos se describe en la <a className="text-fg underline underline-offset-2" href={PRIVACY_PATH}>política de privacidad</a>. El sitio no usa cookies.</p> },
    ],
  }
  return {
    title: 'Legal notice',
    description: 'Publisher, publication director and host of the Escala Tokens website.',
    intro: <p className="text-fg-faint">Informative translation. The French version (Mentions légales) is the legally binding one.</p>,
    sections: [
      { h: 'Publisher', body: <Ul items={identity('en')} /> },
      { h: 'Publication director', body: <p>{LEGAL.publisher}</p> },
      { h: 'Host', body: <Ul items={[<span className="text-fg">{LEGAL.host.name}</span>, LEGAL.host.address, host]} /> },
      { h: 'Intellectual property', body: <p>The Escala Tokens source code is published under the MIT License. The design systems you build with the tool are yours: exported tokens and files carry no licence or attribution requirement from us. Figma is a trademark of Figma, Inc.; this project is not affiliated with or endorsed by Figma.</p> },
      { h: 'Personal data', body: <p>How data is handled is described in the <a className="text-fg underline underline-offset-2" href={PRIVACY_PATH}>privacy policy</a>. The site sets no cookies.</p> },
    ],
  }
}

// ── Politique de confidentialité ────────────────────────────────────────────

function privacyDoc(l: Locale): Doc {
  if (l === 'fr') return {
    title: 'Politique de confidentialité',
    description: 'Quelles données Escala Tokens traite, pourquoi, combien de temps, et vos droits. Aucun cookie, aucune publicité, aucun profilage.',
    intro: <p><span className="text-fg">En bref :</span> pas de compte, pas de cookie, pas de publicité, pas de revente de données. Votre système de design reste dans votre navigateur. Nous mesurons l’audience de façon anonyme pour savoir ce qui est utile.</p>,
    sections: [
      { h: 'Responsable du traitement', body: <Ul items={identity('fr')} /> },
      { h: '1. Votre système de design', body: <p>Ce que vous configurez (couleurs, typographie, espacements…) est enregistré uniquement dans le stockage local de votre navigateur (localStorage). Nous n’y avons pas accès et il n’existe aucun profil côté serveur. Vous l’effacez en vidant les données du site dans votre navigateur.</p> },
      { h: '2. Tokens publiés (synchronisation Figma et MCP)', body: <>
        <p>Uniquement si vous cliquez sur « Sync now » ou activez la synchronisation automatique, le contenu de vos tokens est envoyé et stocké chez notre hébergeur (Vercel Blob) sous un identifiant de système. Une empreinte chiffrée (SHA-256) d’une clé de publication est stockée pour empêcher qu’un tiers écrase votre système.</p>
        <p><span className="text-fg">Important :</span> les tokens publiés sont lisibles par toute personne qui connaît l’identifiant du système — c’est ce qui permet au plugin Figma et aux agents IA de les lire. Ne publiez pas d’informations confidentielles dans le nom de votre système.</p>
        <Ul items={['Base légale : exécution du service que vous demandez (art. 6.1.b RGPD).', 'Durée : jusqu’à ce que vous demandiez la suppression par e-mail.']} />
      </> },
      { h: '3. GitHub', body: <p>Si vous connectez GitHub, votre jeton d’accès reste dans votre navigateur et n’est envoyé qu’à GitHub. Lors d’une connexion OAuth, notre serveur échange le code contre un jeton et vous le transmet sans le conserver. Les fichiers sont poussés dans le dépôt que vous choisissez ; GitHub est alors responsable de son propre traitement.</p> },
      { h: '4. Mesure d’audience', body: <>
        <p>Nous utilisons Vercel Web Analytics, qui ne dépose aucun cookie et n’utilise aucun identifiant stocké sur votre appareil. Un visiteur est compté via une empreinte anonyme recalculée chaque jour, qui ne permet pas de vous suivre d’un jour à l’autre ni d’un site à l’autre.</p>
        <Ul items={['Données : page consultée (sans identifiant de système), site de provenance, pays, type d’appareil, navigateur et système d’exploitation.', 'Actions comptées : export (format choisi), ouverture du plugin Figma, publication Figma, envoi vers GitHub, style adopté, sauvegarde. Jamais de texte que vous saisissez, de nom de projet ni de couleur.', 'Base légale : intérêt légitime à améliorer l’outil (art. 6.1.f RGPD). Ce dispositif respecte les conditions d’exemption de consentement de la CNIL pour la mesure d’audience.']} />
        <p>Côté serveur, chaque appel à l’outil MCP enregistre uniquement le nom de l’outil utilisé, sans identifiant de projet ni adresse IP.</p>
      </> },
      { h: '5. Journaux techniques et sécurité', body: <p>Comme tout hébergeur, Vercel enregistre les requêtes (adresse IP, navigateur, page demandée, date) pour assurer le fonctionnement du service, la protection contre les attaques et la limitation des abus (pare-feu, limite de requêtes). Base légale : intérêt légitime à sécuriser le service. Ces journaux sont conservés au maximum 30 jours.</p> },
      { h: '6. Polices Google Fonts', body: <p>Lorsque vous choisissez une police ou prévisualisez un style, votre navigateur télécharge la police depuis les serveurs de Google (fonts.googleapis.com), qui reçoivent alors votre adresse IP. Google indique ne pas utiliser ces données pour la publicité.</p> },
      { h: 'Cookies et stockage local', body: <p>Le site ne dépose aucun cookie. Il utilise le stockage local de votre navigateur uniquement pour des fonctions que vous demandez : votre système de design, la langue, le thème clair/sombre, votre clé de publication et, si vous le fournissez, votre jeton GitHub. Ces usages sont strictement nécessaires et ne requièrent pas de consentement.</p> },
      { h: 'Sous-traitants et transferts hors UE', body: <>
        <Ul items={['Vercel Inc. (États-Unis) — hébergement, stockage des tokens publiés, mesure d’audience, journaux.', 'Google LLC (États-Unis) — polices Google Fonts.', 'GitHub, Inc. (États-Unis) — uniquement si vous connectez GitHub.']} />
        <p>Ces transferts reposent sur le cadre de protection des données UE–États-Unis (Data Privacy Framework) et/ou les clauses contractuelles types de la Commission européenne. Nous ne vendons ni ne louons aucune donnée.</p>
      </> },
      { h: 'Vos droits', body: <p>Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité. Pour supprimer un système publié ou exercer vos droits, écrivez à {mail} en indiquant l’identifiant du système concerné. Nous répondons sous un mois. Vous pouvez aussi introduire une réclamation auprès de la CNIL ({cnil}).</p> },
    ],
  }
  if (l === 'es') return {
    title: 'Política de privacidad',
    description: 'Qué datos trata Escala Tokens, por qué, durante cuánto tiempo y sus derechos. Sin cookies, sin publicidad, sin perfiles.',
    intro: <>
      <p className="text-fg-faint">Traducción informativa. La versión francesa es la que tiene valor legal.</p>
      <p><span className="text-fg">En resumen:</span> sin cuentas, sin cookies, sin publicidad y sin venta de datos. Su sistema de diseño se queda en su navegador. Medimos la audiencia de forma anónima para saber qué resulta útil.</p>
    </>,
    sections: [
      { h: 'Responsable del tratamiento', body: <Ul items={identity('es')} /> },
      { h: '1. Su sistema de diseño', body: <p>Lo que usted configura (colores, tipografía, espaciados…) se guarda únicamente en el almacenamiento local de su navegador (localStorage). No tenemos acceso y no existe ningún perfil en el servidor. Lo borra eliminando los datos del sitio en su navegador.</p> },
      { h: '2. Tokens publicados (sincronización con Figma y MCP)', body: <>
        <p>Solo si pulsa «Sync now» o activa la sincronización automática, el contenido de sus tokens se envía y se guarda en nuestro proveedor (Vercel Blob) bajo un identificador de sistema. Se guarda una huella cifrada (SHA-256) de una clave de publicación para impedir que un tercero sobrescriba su sistema.</p>
        <p><span className="text-fg">Importante:</span> los tokens publicados pueden leerlos quienes conozcan el identificador del sistema; así es como el plugin de Figma y los agentes de IA los leen. No incluya información confidencial en el nombre de su sistema.</p>
        <Ul items={['Base legal: ejecución del servicio que usted solicita (art. 6.1.b RGPD).', 'Plazo: hasta que solicite su eliminación por correo.']} />
      </> },
      { h: '3. GitHub', body: <p>Si conecta GitHub, su token de acceso se queda en su navegador y solo se envía a GitHub. En una conexión OAuth, nuestro servidor intercambia el código por un token y se lo entrega sin guardarlo. Los archivos se suben al repositorio que usted elige; a partir de ahí GitHub es responsable de su propio tratamiento.</p> },
      { h: '4. Medición de audiencia', body: <>
        <p>Usamos Vercel Web Analytics, que no instala cookies ni usa identificadores guardados en su dispositivo. Cada visitante se cuenta mediante una huella anónima que se recalcula cada día y no permite seguirle de un día a otro ni entre sitios.</p>
        <Ul items={['Datos: página visitada (sin identificador de sistema), sitio de procedencia, país, tipo de dispositivo, navegador y sistema operativo.', 'Acciones contadas: exportación (formato elegido), apertura del plugin de Figma, publicación en Figma, envío a GitHub, estilo adoptado, guardado. Nunca texto que usted escribe, nombres de proyecto ni colores.', 'Base legal: interés legítimo en mejorar la herramienta (art. 6.1.f RGPD). Cumple las condiciones de la CNIL para medir audiencia sin consentimiento.']} />
        <p>En el servidor, cada llamada a la herramienta MCP registra solo el nombre de la herramienta usada, sin identificador de proyecto ni dirección IP.</p>
      </> },
      { h: '5. Registros técnicos y seguridad', body: <p>Como cualquier proveedor de alojamiento, Vercel registra las solicitudes (dirección IP, navegador, página solicitada, fecha) para el funcionamiento del servicio, la protección frente a ataques y la limitación de abusos (cortafuegos, límite de solicitudes). Base legal: interés legítimo en la seguridad del servicio. Se conservan como máximo 30 días.</p> },
      { h: '6. Fuentes de Google Fonts', body: <p>Cuando elige una fuente o previsualiza un estilo, su navegador descarga la fuente desde los servidores de Google (fonts.googleapis.com), que reciben su dirección IP. Google indica que no usa estos datos para publicidad.</p> },
      { h: 'Cookies y almacenamiento local', body: <p>El sitio no instala cookies. Usa el almacenamiento local de su navegador solo para funciones que usted solicita: su sistema de diseño, el idioma, el tema claro/oscuro, su clave de publicación y, si lo proporciona, su token de GitHub. Son usos estrictamente necesarios que no requieren consentimiento.</p> },
      { h: 'Encargados y transferencias fuera de la UE', body: <>
        <Ul items={['Vercel Inc. (EE. UU.): alojamiento, almacenamiento de tokens publicados, medición de audiencia, registros.', 'Google LLC (EE. UU.): fuentes de Google Fonts.', 'GitHub, Inc. (EE. UU.): solo si conecta GitHub.']} />
        <p>Estas transferencias se basan en el Marco de Privacidad de Datos UE–EE. UU. y/o en las cláusulas contractuales tipo de la Comisión Europea. No vendemos ni alquilamos datos.</p>
      </> },
      { h: 'Sus derechos', body: <p>Tiene derecho de acceso, rectificación, supresión, limitación, oposición y portabilidad. Para eliminar un sistema publicado o ejercer sus derechos, escriba a {mail} indicando el identificador del sistema. Respondemos en un plazo de un mes. También puede presentar una reclamación ante la CNIL ({cnil}) o ante la autoridad de protección de datos de su país.</p> },
    ],
  }
  return {
    title: 'Privacy policy',
    description: 'What data Escala Tokens processes, why, for how long, and your rights. No cookies, no advertising, no profiling.',
    intro: <>
      <p className="text-fg-faint">Informative translation. The French version is the legally binding one.</p>
      <p><span className="text-fg">In short:</span> no accounts, no cookies, no advertising, no selling of data. Your design system stays in your browser. We measure audience anonymously to learn what is useful.</p>
    </>,
    sections: [
      { h: 'Data controller', body: <Ul items={identity('en')} /> },
      { h: '1. Your design system', body: <p>What you configure (colours, type, spacing…) is stored only in your browser’s local storage (localStorage). We have no access to it and there is no server-side profile. You erase it by clearing this site’s data in your browser.</p> },
      { h: '2. Published tokens (Figma sync and MCP)', body: <>
        <p>Only when you click “Sync now” or turn on auto-sync, your token payload is sent to and stored by our host (Vercel Blob) under a system ID. A hashed (SHA-256) publish key is stored so nobody else can overwrite your system.</p>
        <p><span className="text-fg">Important:</span> published tokens can be read by anyone who knows the system ID — that is how the Figma plugin and AI agents read them. Don’t put confidential information in your system’s name.</p>
        <Ul items={['Legal basis: performance of the service you request (GDPR art. 6.1.b).', 'Retention: until you ask for deletion by email.']} />
      </> },
      { h: '3. GitHub', body: <p>If you connect GitHub, your access token stays in your browser and is only ever sent to GitHub. During an OAuth sign-in, our server exchanges the code for a token and hands it to you without keeping it. Files are pushed to the repository you choose; GitHub is then responsible for its own processing.</p> },
      { h: '4. Audience measurement', body: <>
        <p>We use Vercel Web Analytics, which sets no cookies and stores no identifier on your device. A visitor is counted through an anonymous fingerprint recomputed every day, which cannot follow you from one day to the next or across sites.</p>
        <Ul items={['Data: page viewed (without any system ID), referring site, country, device type, browser and operating system.', 'Actions counted: export (format chosen), Figma plugin opened, Figma publish, GitHub push, style adopted, save. Never text you type, project names or colours.', 'Legal basis: legitimate interest in improving the tool (GDPR art. 6.1.f). It meets the CNIL’s conditions for consent-exempt audience measurement.']} />
        <p>On the server, each call to the MCP tool logs only the name of the tool used — no project ID, no IP address.</p>
      </> },
      { h: '5. Technical logs and security', body: <p>Like any host, Vercel logs requests (IP address, browser, requested page, time) to run the service, protect it from attacks and limit abuse (firewall, rate limiting). Legal basis: legitimate interest in securing the service. These logs are kept for at most 30 days.</p> },
      { h: '6. Google Fonts', body: <p>When you choose a font or preview a style, your browser downloads that font from Google’s servers (fonts.googleapis.com), which then receive your IP address. Google states it does not use this data for advertising.</p> },
      { h: 'Cookies and local storage', body: <p>The site sets no cookies. It uses your browser’s local storage only for features you ask for: your design system, language, light/dark theme, your publish key and, if you provide one, your GitHub token. These uses are strictly necessary and need no consent.</p> },
      { h: 'Processors and transfers outside the EU', body: <>
        <Ul items={['Vercel Inc. (United States) — hosting, storage of published tokens, audience measurement, logs.', 'Google LLC (United States) — Google Fonts.', 'GitHub, Inc. (United States) — only if you connect GitHub.']} />
        <p>These transfers rely on the EU–US Data Privacy Framework and/or the European Commission’s standard contractual clauses. We never sell or rent data.</p>
      </> },
      { h: 'Your rights', body: <p>You have the right of access, rectification, erasure, restriction, objection and portability. To delete a published system or exercise your rights, email {mail} with the system ID. We reply within one month. You can also lodge a complaint with the CNIL ({cnil}) or your local data protection authority.</p> },
    ],
  }
}

const UPDATED_LABEL: Record<Locale, string> = { fr: 'Dernière mise à jour', en: 'Last updated', es: 'Última actualización' }

function formatDate(iso: string, l: Locale): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(l, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t, locale } = useI18n()
  const doc = kind === 'legal' ? legalDoc(locale) : privacyDoc(locale)
  const other = kind === 'legal'
    ? { href: PRIVACY_PATH, label: privacyDoc(locale).title }
    : { href: LEGAL_PATH, label: legalDoc(locale).title }

  useEffect(() => {
    applyDocumentHead({
      title: `${doc.title} — Escala Tokens`,
      description: doc.description,
      canonicalPath: kind === 'legal' ? LEGAL_PATH : PRIVACY_PATH,
      robots: 'index, follow',
    })
  }, [doc.title, doc.description, kind])

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col">
      <header className="flex h-[52px] flex-shrink-0 items-center gap-4 border-b border-line px-4">
        <a href="/" className="flex items-center gap-2 text-fg">
          <BrandMark size={28} />
          <span className="text-ui font-medium">Escala Tokens</span>
        </a>
        <a
          href="/"
          className="ml-auto flex-shrink-0 text-body font-medium text-fg border border-line-strong rounded-lg px-3 py-1.5 hover:bg-elevated/60"
        >
          {t('Open the configurator')}
        </a>
      </header>
      <main className="flex-1">
        <article className="max-w-2xl mx-auto px-6 py-12 flex flex-col gap-8 text-body text-fg-muted leading-relaxed">
          <header className="flex flex-col gap-3">
            <h1 className="text-display text-fg">{doc.title}</h1>
            <p className="text-caption text-fg-faint">{UPDATED_LABEL[locale]}{colon(locale)} {formatDate(LEGAL.updated, locale)}</p>
            {doc.intro && <div className="flex flex-col gap-2">{doc.intro}</div>}
          </header>
          {doc.sections.map((s) => (
            <section key={s.h} className="flex flex-col gap-2">
              <h2 className="text-title text-fg">{s.h}</h2>
              <div className="flex flex-col gap-2">{s.body}</div>
            </section>
          ))}
          <footer className="border-t border-line pt-6">
            <a className="text-fg underline underline-offset-2" href={other.href}>{other.label}</a>
          </footer>
        </article>
      </main>
    </div>
  )
}
