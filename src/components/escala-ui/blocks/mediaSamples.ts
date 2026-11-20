// The pictures the media blocks draw: the Figma file's `media/*` photos (page ⛰ Media → Media Components), exported
// once at 800 px into `src/assets/media`. They are stock content, not tokens: every block still takes its own picture
// through its `cover` / `artwork` / `photo` / `media` prop. Vite hashes and bundles them for the web and Storybook alike.
import coverAlpine from '../../../assets/media/cover-alpine.jpg'
import coverForest from '../../../assets/media/cover-forest.jpg'
import coverDesert from '../../../assets/media/cover-desert.jpg'
import coverCoast from '../../../assets/media/cover-coast.jpg'
import albumWaves from '../../../assets/media/album-waves.jpg'
import albumCityNight from '../../../assets/media/album-city-night.jpg'
import albumSilk from '../../../assets/media/album-silk.jpg'
import travelLisbon from '../../../assets/media/travel-lisbon.jpg'
import travelCopenhagen from '../../../assets/media/travel-copenhagen.jpg'
import travelPorto from '../../../assets/media/travel-porto.jpg'
import travelKyoto from '../../../assets/media/travel-kyoto.jpg'

/** `media/cover-*` (16:9 crops of a square photo). */
export const COVERS = { alpine: coverAlpine, forest: coverForest, desert: coverDesert, coast: coverCoast } as const
/** `media/album-*` (1:1). */
export const ALBUMS = { waves: albumWaves, cityNight: albumCityNight, silk: albumSilk } as const
/** `media/travel-*` (4:3), the CardStack deck's cities. */
export const TRAVEL = { lisbon: travelLisbon, copenhagen: travelCopenhagen, porto: travelPorto, kyoto: travelKyoto } as const

export const COVER_ALPINE = COVERS.alpine
export const ALBUM_WAVES = ALBUMS.waves
