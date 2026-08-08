import { baseFrom, type LibraryItemBase } from './LibraryItem'
import type TrackEffects from './TrackEffects'

export const DEFAULT_ICON_COLOR = '#c084fc'

/** Piste audio telle qu'elle est rangée dans la bibliothèque. */
export default interface FileTrack extends LibraryItemBase {
  kind: 'audio'
  initialVolume: number
  iconName?: string
  /** Couleur personnalisée de l'icône */
  iconColor?: string
  /** Etat boucle par defaut lors de la lecture */
  loop: boolean
  /** Réglages avancés (fondus, effets). Absent = piste neutre. */
  effects?: TrackEffects
}

export function createFileTrack(file: File, name?: string): FileTrack {
  return {
    ...baseFrom(file, name),
    kind: 'audio',
    initialVolume: 0.8,
    iconName: '',
    iconColor: DEFAULT_ICON_COLOR,
    loop: false,
  }
}
