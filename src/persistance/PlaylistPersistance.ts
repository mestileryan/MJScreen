// db.ts
import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { PlaylistDB } from './PlaylistDB';


export class PlaylistLibrary extends Dexie {
  // Table "playlists", type = PlaylistDB
  playlists!: Table<PlaylistDB>;

  constructor() {
    super('PlaylistLibrary'); // nom de la base
    this.version(1).stores({
      // "++id" = champ auto-incrémenté, vous pouvez aussi utiliser un "uuid"
      playlists: '++id,name'
    });
  }
}

// On exporte une instance unique de la DB
export const PlaylistLibraryDB = new PlaylistLibrary();
