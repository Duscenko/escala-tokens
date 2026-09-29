/** UI preference — not part of `DesignSnapshot` (same class as `sd-onboarded`). */

const KEY = 'sd-plugin-community-banner-dismissed'

export function isPluginCommunityBannerDismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function dismissPluginCommunityBanner(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}
