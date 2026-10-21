import { useSyncExternalStore } from 'react'

// Below Tailwind's `md` (768px). Read synchronously on the first render
// (`useSyncExternalStore` calls `getSnapshot` before paint), so a phone-only
// surface never flashes on a desktop, nor the reverse.
const PHONE_QUERY = '(max-width: 767.98px)'

function subscribePhone(onChange: () => void) {
  const mq = window.matchMedia(PHONE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function useIsPhone() {
  return useSyncExternalStore(subscribePhone, () => window.matchMedia(PHONE_QUERY).matches, () => false)
}
