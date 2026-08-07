import type LibraryItem from './LibraryItem'

export default interface Playlist {
  id?: number
  name: string
  order: number
  /**
   * Custom width in pixels when displayed in board mode.
   * If undefined, playlist takes full available width.
   */
  width?: number
  items: LibraryItem[]
}

export function createPlaylist(name: string, order = 0): Playlist {
  return { name, order, items: [] }
}
