import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { ImageDB } from './ImageDB'

class ImageLibrary extends Dexie {
  images!: Table<ImageDB>

  constructor() {
    super('ImageLibrary')
    this.version(1).stores({
      images: '++id,name,order',
    })
    this.version(2)
      .stores({
        images: '++id,playlistId,order',
      })
      .upgrade(async transaction => {
        const table = transaction.table('images')
        const now = Date.now()
        await table.toCollection().modify(image => {
          if (image.playlistId === undefined) {
            image.playlistId = null
          }
          if (!image.createdAt) {
            image.createdAt = now
          }
          image.updatedAt = now
        })
      })
  }
}

// Voir TrackPersistance : instanciation paresseuse pour rester compatible avec le
// pré-rendu Node de l'export statique.
let instance: ImageLibrary | null = null

export function imageLibraryDB(): ImageLibrary {
  if (!instance) instance = new ImageLibrary()
  return instance
}
