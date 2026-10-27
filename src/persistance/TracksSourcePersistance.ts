import Dexie from 'dexie'
import type { Table } from 'dexie'
import type { CloudAccount, CloudKind } from '@/storage/cloud/CloudStorage'

/**
 * Source branchée à la bibliothèque de pistes. Seule chose que le navigateur en
 * retient : de quoi la rouvrir (le handle d’un dossier local, le compte d’un
 * cloud). Le contenu, lui, vit dans la source, sous `.mjlib/`.
 */
export type TracksSourceDB =
  | {
      id?: number
      kind: 'local'
      /** Handle du dossier local : non sérialisable en JSON, IndexedDB est le seul endroit où le garder. */
      handle: FileSystemDirectoryHandle
      /** Source où vont les pistes ajoutées depuis la page. Une seule à la fois. */
      isDefault: boolean
      addedAt: number
    }
  | {
      id?: number
      kind: CloudKind
      /** Compte connecté ; les jetons, eux, ne vivent que le temps de la session. */
      account: CloudAccount
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
