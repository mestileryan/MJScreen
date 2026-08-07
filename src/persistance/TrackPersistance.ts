// db.ts
import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { TrackDB } from './TrackDB'

export class TrackLibrary extends Dexie {
  // Table "tracks", type = TrackDB
  tracks!: Table<TrackDB>

  constructor() {
    super('TrackLibrary') // nom de la base
    this.version(1).stores({
      // "++id" = champ auto-incrémenté, vous pouvez aussi utiliser un "uuid"
      tracks: '++id,name',
    })

    this.version(2)
      .stores({
        tracks: '++id,name,loop',
      })
      .upgrade(tx => {
        return tx
          .table('tracks')
          .toCollection()
          .modify(tr => {
            if (tr.loop === undefined) tr.loop = false
          })
      })
  }
}

// Instanciation paresseuse : les composants clients sont pré-rendus côté Node lors de
// l'export statique, où IndexedDB n'existe pas. La base n'est ouverte qu'au premier accès,
// donc dans le navigateur.
let instance: TrackLibrary | null = null

export function trackLibraryDB(): TrackLibrary {
  if (!instance) instance = new TrackLibrary()
  return instance
}
