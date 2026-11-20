/** The platform's specimens of the Figma `TabBar` page (2354:124): the bar and one item, with the file's example (Home current ·
 *  Search · Inbox with 3 unread · You). The photo avatar of the Storybook (a stock picture kept in apps/storybook) is drawn here as
 *  initials, the Avatar's other type. */
import type { SpecimenProps } from '../specimens'
import { PreviewIcon } from '../specimens'
import { Avatar as SkAvatar } from '../../../escala-ui/avatar'
import { TabBar as SkTabBar, TabBarItem as SkTabBarItem, type TabBarItemState } from '../../../escala-ui/tab-bar'
import { RecipeScope } from './scope'

const ICON = 24
const stop = (e: { preventDefault: () => void }) => e.preventDefault()

export function SkeletonTabBarSpecimen({ t, w }: SpecimenProps) {
  return (
    <RecipeScope t={t}>
      <div style={{ width: w ?? 390, maxWidth: '100%' }}>
        <SkTabBar aria-label="Main">
          <SkTabBarItem href="#" onClick={stop} current icon={<PreviewIcon concept="home" size={ICON} />}>Home</SkTabBarItem>
          <SkTabBarItem href="#" onClick={stop} icon={<PreviewIcon concept="search" size={ICON} />}>Search</SkTabBarItem>
          <SkTabBarItem href="#" onClick={stop} icon={<PreviewIcon concept="mail" size={ICON} />} badge={3} aria-label="Inbox, 3 unread">Inbox</SkTabBarItem>
          <SkTabBarItem href="#" onClick={stop} media={<SkAvatar type="initials" size="xs" shape="circle">IR</SkAvatar>}>You</SkTabBarItem>
        </SkTabBar>
      </div>
    </RecipeScope>
  )
}

export function SkeletonTabBarItemSpecimen({ t, v }: SpecimenProps) {
  const state = (v.State ?? 'Default') as TabBarItemState
  return (
    <RecipeScope t={t}>
      <SkTabBarItem href="#" onClick={stop} forceState={state} disabled={state === 'Disabled'} icon={<PreviewIcon concept="home" size={ICON} />}>Home</SkTabBarItem>
    </RecipeScope>
  )
}
