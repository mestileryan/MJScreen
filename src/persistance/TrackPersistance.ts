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

    // v3 : les fondus absents signifient désormais « hérite du fondu de la
    // playlist ». Les anciens enregistrements portaient un 0 explicite dès qu'un
    // autre effet était réglé ; comme aucune playlist n'a encore de fondu par
    // défaut au moment de cette migration, effacer ces 0 ne change rien à la
    // lecture mais rend ces pistes sensibles aux futurs réglages de playlist.
    this.version(3)
      .stores({
        tracks: '++id,name,loop',
      })
      .upgrade(tx => {
        return tx
          .table('tracks')
          .toCollection()
          .modify(tr => {
            if (!tr.effects) return
            if (tr.effects.fadeIn === 0) delete tr.effects.fadeIn
            if (tr.effects.fadeOut === 0) delete tr.effects.fadeOut
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
