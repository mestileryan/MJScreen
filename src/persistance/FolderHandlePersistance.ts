import Dexie from 'dexie'
import type { Table } from 'dexie'

/**
 * Handle d'un dossier local, rangé sous une clé fixe. Un handle n'est pas
 * sérialisable en JSON : IndexedDB est le seul endroit où le conserver.
 */
export interface FolderHandleDB {
  key: string
  handle: FileSystemDirectoryHandle
}

class FolderHandles extends Dexie {
  handles!: Table<FolderHandleDB, string>

  constructor() {
    super('FolderHandles')
    this.version(1).stores({
      handles: 'key',
    })
  }
}

// Voir TrackPersistance : instanciation paresseuse pour rester compatible avec le
// pré-rendu Node de l'export statique.
let instance: FolderHandles | null = null

export function folderHandleDB(): FolderHandles {
  if (!instance) instance = new FolderHandles()
  return instance
}
