/** Hosted live sync (republish after every edit, the plugin polling the Blob)
 *  is OFF. Hobby limits (1M function invocations/month) made it unaffordable.
 *  The bridge now: copy the agent context / tokens.json and paste it into the
 *  Escala plugin. Saving the design system and syncing is the person's call;
 *  the explicit "Sync now" publish still works. Flip to true to bring it back.
 *  Its own module so the store can read it without importing figmaSync (cycle). */
export const HOSTED_LIVE_SYNC = false
