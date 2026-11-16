/**
 * Countries and their calling codes, for the phone field's country picker
 * (`blocks/phoneNumber.tsx`). Pure data: the ISO 3166-1 alpha-2 code, the
 * calling code, the English name (from `Intl.DisplayNames`, so it is the
 * platform's own spelling) and the flag (the two regional-indicator letters of
 * the ISO code — an emoji, rendered by the operating system's font).
 */

/** ISO → calling code (ITU-T E.164 country codes, without the "+"). */
const DIAL: Record<string, string> = {
  AF: '93', AL: '355', DZ: '213', AD: '376', AO: '244', AG: '1', AR: '54', AM: '374', AU: '61', AT: '43', AZ: '994',
  BS: '1', BH: '973', BD: '880', BB: '1', BY: '375', BE: '32', BZ: '501', BJ: '229', BT: '975', BO: '591', BA: '387',
  BW: '267', BR: '55', BN: '673', BG: '359', BF: '226', BI: '257', KH: '855', CM: '237', CA: '1', CV: '238', CF: '236',
  TD: '235', CL: '56', CN: '86', CO: '57', KM: '269', CG: '242', CD: '243', CR: '506', CI: '225', HR: '385', CU: '53',
  CY: '357', CZ: '420', DK: '45', DJ: '253', DM: '1', DO: '1', EC: '593', EG: '20', SV: '503', GQ: '240', ER: '291',
  EE: '372', SZ: '268', ET: '251', FJ: '679', FI: '358', FR: '33', GA: '241', GM: '220', GE: '995', DE: '49', GH: '233',
  GR: '30', GD: '1', GT: '502', GN: '224', GW: '245', GY: '592', HT: '509', HN: '504', HK: '852', HU: '36', IS: '354',
  IN: '91', ID: '62', IR: '98', IQ: '964', IE: '353', IL: '972', IT: '39', JM: '1', JP: '81', JO: '962', KZ: '7',
  KE: '254', KI: '686', KW: '965', KG: '996', LA: '856', LV: '371', LB: '961', LS: '266', LR: '231', LY: '218',
  LI: '423', LT: '370', LU: '352', MO: '853', MG: '261', MW: '265', MY: '60', MV: '960', ML: '223', MT: '356', MH: '692',
  MR: '222', MU: '230', MX: '52', FM: '691', MD: '373', MC: '377', MN: '976', ME: '382', MA: '212', MZ: '258', MM: '95',
  NA: '264', NR: '674', NP: '977', NL: '31', NZ: '64', NI: '505', NE: '227', NG: '234', KP: '850', MK: '389', NO: '47',
  OM: '968', PK: '92', PW: '680', PS: '970', PA: '507', PG: '675', PY: '595', PE: '51', PH: '63', PL: '48', PT: '351',
  PR: '1', QA: '974', RO: '40', RU: '7', RW: '250', KN: '1', LC: '1', VC: '1', WS: '685', SM: '378', ST: '239',
  SA: '966', SN: '221', RS: '381', SC: '248', SL: '232', SG: '65', SK: '421', SI: '386', SB: '677', SO: '252', ZA: '27',
  KR: '82', SS: '211', ES: '34', LK: '94', SD: '249', SR: '597', SE: '46', CH: '41', SY: '963', TW: '886', TJ: '992',
  TZ: '255', TH: '66', TL: '670', TG: '228', TO: '676', TT: '1', TN: '216', TR: '90', TM: '993', TV: '688', UG: '256',
  UA: '380', AE: '971', GB: '44', US: '1', UY: '598', UZ: '998', VU: '678', VA: '39', VE: '58', VN: '84', YE: '967',
  ZM: '260', ZW: '263',
}

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2. */
  iso: string
  /** The calling code with its "+". */
  dial: string
  name: string
  flag: string
}

/** The flag emoji of an ISO code: its two letters as regional indicators. */
export function flagOf(iso: string): string {
  return String.fromCodePoint(...iso.toUpperCase().split('').map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

const names = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null

/** Every country, by English name. */
export const PHONE_COUNTRIES: PhoneCountry[] = Object.entries(DIAL)
  .map(([iso, dial]) => ({ iso, dial: `+${dial}`, name: names?.of(iso) ?? iso, flag: flagOf(iso) }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'))

export const phoneCountry = (iso: string): PhoneCountry | undefined => PHONE_COUNTRIES.find((c) => c.iso === iso)

/** Countries matching a search: by name, ISO code or calling code ("+44", "44"). */
export function searchPhoneCountries(query: string, list: PhoneCountry[] = PHONE_COUNTRIES): PhoneCountry[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const digits = q.replace(/^\+/, '')
  // "+…" searches the calling code only (the field's hint: "Type + to search by calling code").
  if (q.startsWith('+')) return list.filter((c) => c.dial.slice(1).startsWith(digits))
  return list.filter((c) => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || (/^\d+$/.test(q) && c.dial.slice(1).startsWith(q)))
}
