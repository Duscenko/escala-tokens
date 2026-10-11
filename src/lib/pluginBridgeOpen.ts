/**
 * Open a system the plugin just published. The blob carries `studio` — the
 * choices the plugin built with — until this browser publishes the editor's
 * own payload over the same id. A blob with no choices is a system that
 * already lives in a browser; this does not replace the one on screen.
 */

import { publishTokens } from './figmaSync'
import { canonicalizePublishId } from './publishId'
import { buildStudioTokens } from './pluginStudio'
import { studioChoicesOf } from './pluginBridge'
import { useDesignStore } from '../store/useDesignStore'

export async function adoptBridgedProject(project: string): Promise<boolean> {
  const id = canonicalizePublishId(project)
  if (!id) return false
  if (useDesignStore.getState().publishId === id) return false
  let res: Response
  try {
    res = await fetch(`/api/tokens?project=${encodeURIComponent(id)}`, { cache: 'no-store' })
  } catch {
    return false
  }
  if (!res.ok) return false
  const data = await res.json().catch(() => null)
  const choices = studioChoicesOf(data)
  if (!choices) return false
  const built = buildStudioTokens(choices, 'pro')
  if ('error' in built) return false
  const extra = data && typeof data === 'object' && data.studioThemes && typeof data.studioThemes === 'object'
    ? Object.keys(data.studioThemes as object).length > 1
    : false
  useDesignStore.setState({
    publishId: id,
    ...(typeof choices.name === 'string' && choices.name.trim() ? { projectName: choices.name.trim().slice(0, 80) } : {}),
  })
  // A second brand's choices are not replayed here. Publishing the rebuilt
  // editor would replace that brand in the file on the next sync.
  if (!extra) await publishTokens({ project: choices.name })
  return true
}
