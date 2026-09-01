import type LibraryItem from './LibraryItem'

/**
 * Mode de lecture des pistes d'une playlist.
 *  - `libre` : chaque piste lancée s'ajoute à la file et peut se superposer aux
 *    autres (comportement historique) ;
 *  - `enchainement` : lancer une piste arrête celle de la playlist déjà en
 *    lecture — fondus compris — et démarre la nouvelle immédiatement ;
 *  - `classique` : comme `enchainement`, et une piste qui arrive au bout sans
 *    boucler enchaîne d'elle-même sur la suivante de la playlist.
 */
export type PlaylistMode = 'libre' | 'enchainement' | 'classique'

export default interface Playlist {
  id?: number
  name: string
  order: number
  /**
   * Custom width in pixels when displayed in board mode.
   * If undefined, playlist takes full available width.
   */
  width?: number
  mode: PlaylistMode
  /**
   * Fondus par défaut, en secondes, appliqués aux pistes de la playlist qui
   * n'ont pas leur propre réglage. 0 = aucun.
   */
  fadeIn: number
  fadeOut: number
  items: LibraryItem[]
}

export function createPlaylist(name: string, order = 0): Playlist {
  return { name, order, mode: 'libre', fadeIn: 0, fadeOut: 0, items: [] }
}
