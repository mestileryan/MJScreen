import type FileTrack from './FileTrack'
import type GalleryImage from './GalleryImage'

export type LibraryItemType = 'audio' | 'image'

/** Champs partagés par tous les éléments de la bibliothèque. */
export interface LibraryItemBase {
  id?: number
  name: string
  file: File
  playlistId?: number
  order: number
  createdAt: number
  updatedAt: number
}

/** Union discriminée sur `kind` : remplace l'ancienne hiérarchie de classes. */
type LibraryItem = FileTrack | GalleryImage

export default LibraryItem

/** Initialise les champs communs à partir du fichier importé. */
export function baseFrom(file: File, name?: string): LibraryItemBase {
  const now = Date.now()
  return {
    name: name ?? file.name.replace(/\.[^/.]+$/, ''),
    file,
    order: 0,
    createdAt: now,
    updatedAt: now,
  }
}

/** Copie l'élément en rafraîchissant `updatedAt` (équivalent de l'ancien `touch()`). */
export function touched<T extends LibraryItem>(item: T): T {
  return { ...item, updatedAt: Date.now() }
}

/** Copie l'élément sous un nouveau nom (équivalent de l'ancien `rename()`). */
export function renamed<T extends LibraryItem>(item: T, name: string): T {
  return { ...item, name, updatedAt: Date.now() }
}

export function isAudio(item: LibraryItem): item is FileTrack {
  return item.kind === 'audio'
}

export function isImage(item: LibraryItem): item is GalleryImage {
  return item.kind === 'image'
}
