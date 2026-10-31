/** The key `MapWires`' `litPairs` names a wire by: source and target
 *  `data-wire` ids. Kept out of the component file so fast refresh holds. */
export const wireKey = (from: string, to: string) => `${from}>${to}`
