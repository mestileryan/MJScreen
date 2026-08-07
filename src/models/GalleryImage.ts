import { baseFrom, type LibraryItemBase } from './LibraryItem'

/** Image de la galerie, affichée dans la fenêtre de présentation. */
export default interface GalleryImage extends LibraryItemBase {
  kind: 'image'
}

export function createGalleryImage(file: File, name?: string): GalleryImage {
  return {
    ...baseFrom(file, name),
    kind: 'image',
  }
}
