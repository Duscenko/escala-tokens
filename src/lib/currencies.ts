// The currencies the currency field's picker lists: ISO 4217 code, name and symbol. A short list on purpose (a field for a price, not a
// ledger); a product passes its own `currencies` to the picker.
export interface Currency { code: string; name: string; symbol: string }

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US dollar', symbol: '$' }, { code: 'EUR', name: 'Euro', symbol: '€' }, { code: 'GBP', name: 'British pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese yen', symbol: '¥' }, { code: 'CNY', name: 'Chinese yuan', symbol: '¥' }, { code: 'CHF', name: 'Swiss franc', symbol: 'CHF' },
  { code: 'CAD', name: 'Canadian dollar', symbol: '$' }, { code: 'AUD', name: 'Australian dollar', symbol: '$' }, { code: 'NZD', name: 'New Zealand dollar', symbol: '$' },
  { code: 'MXN', name: 'Mexican peso', symbol: '$' }, { code: 'BRL', name: 'Brazilian real', symbol: 'R$' }, { code: 'ARS', name: 'Argentine peso', symbol: '$' },
  { code: 'CLP', name: 'Chilean peso', symbol: '$' }, { code: 'COP', name: 'Colombian peso', symbol: '$' }, { code: 'INR', name: 'Indian rupee', symbol: '₹' },
  { code: 'KRW', name: 'South Korean won', symbol: '₩' }, { code: 'SGD', name: 'Singapore dollar', symbol: '$' }, { code: 'HKD', name: 'Hong Kong dollar', symbol: '$' },
  { code: 'SEK', name: 'Swedish krona', symbol: 'kr' }, { code: 'NOK', name: 'Norwegian krone', symbol: 'kr' }, { code: 'DKK', name: 'Danish krone', symbol: 'kr' },
  { code: 'PLN', name: 'Polish złoty', symbol: 'zł' }, { code: 'TRY', name: 'Turkish lira', symbol: '₺' }, { code: 'ZAR', name: 'South African rand', symbol: 'R' },
  { code: 'AED', name: 'UAE dirham', symbol: 'د.إ' },
]

export const currencyOf = (code: string): Currency | undefined => CURRENCIES.find((c) => c.code === code)

/** By code first ("us" → USD), then by name or symbol; empty query = the whole list. */
export function searchCurrencies(query: string, list: Currency[] = CURRENCIES): Currency[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  const score = (c: Currency) => (c.code.toLowerCase().startsWith(q) ? 0 : c.name.toLowerCase().startsWith(q) ? 1 : c.name.toLowerCase().includes(q) || c.symbol.toLowerCase() === q ? 2 : 9)
  return list.filter((c) => score(c) < 9).sort((a, b) => score(a) - score(b))
}
