import Dexie from 'dexie'
import type { Table } from 'dexie'

/**
 * Source branchée à la bibliothèque de pistes. Seule chose que le navigateur en
 * retient : de quoi la rouvrir (le handle d’un dossier local, plus tard la
 * connexion à un cloud). Le contenu, lui, vit dans la source, sous `.mjlib/`.
 */
export interface TracksSourceDB {
  id?: number
  kind: 'local'
  /** Handle du dossier local : non sérialisable en JSON, IndexedDB est le seul endroit où le garder. */
  handle: FileSystemDirectoryHandle
  /** Source où vont les pistes ajoutées depuis la page. Une seule à la fois. */
  isDefault: boolean
  addedAt: number
}

class TracksSources extends Dexie {
  sources!: Table<TracksSourceDB, number>

  constructor() {
    super('TracksSources')
    this.version(1).stores({
      sources: '++id',
    })
  }
}

// Voir TrackPersistance : instanciation paresseuse pour rester compatible avec le
// pré-rendu Node de l'export statique.
let instance: TracksSources | null = null

export function tracksSourceDB(): TracksSources {
  if (!instance) instance = new TracksSources()
  return instance
}
