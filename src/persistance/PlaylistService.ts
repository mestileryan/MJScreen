
import 'dexie-export-import';
import { PlaylistLibrary, PlaylistLibraryDB } from './PlaylistPersistance';
import Playlist from '../models/Playlist'; // ou le bon chemin
import type { PlaylistDB } from './PlaylistDB';

/**
 * Sauvegarde un FileTrack dans Dexie
 */
export async function DB_AddPlaylist(playlist: Playlist): Promise<number> {
  // On construit l'objet qu'on veut stocker
  const stored: PlaylistDB = {
    name: playlist.name,
  };

  // Dexie renvoie l'ID nouvellement inséré
  const newId = await PlaylistLibraryDB.playlists.add(stored);

  // On l'enregistre dans l'instance de FileTrack
  playlist.id = newId;

  return newId;
}
/**
 * Met à jour le volume dans la DB pour le track donné
 */
export async function DB_UpdatePlaylist(playlist: Playlist): Promise<void> {
  if (playlist.id == null) {
    return;
  }
  await PlaylistLibraryDB.playlists.update(playlist.id, {
    name: playlist.name,
  });
}

/**
 * Supprime un enregistrement de la DB via son id
 */
export async function DB_RemovePlaylist(playlist: Playlist): Promise<void> {
  if (playlist.id == null) {
    // Pas d'id => rien à supprimer
    return;
  }
  await PlaylistLibraryDB.playlists.delete(playlist.id);
}

/**
 * Charge tous les StoredTrack depuis Dexie et les convertit en FileTrack
 */
export async function DB_GetPlaylists(): Promise<Playlist[]> {
  // 1) Récupération de tous les enregistrements (StoredTrack)
  const storedPlaylists: PlaylistDB[] = await PlaylistLibraryDB.playlists.toArray();

  // 2) Conversion en FileTrack
  const playlists: Playlist[] = storedPlaylists.map(st => {

    // b) On instancie un FileTrack avec le volume initial
    const ft = new Playlist(st.name);
    ft.id = st.id;

    return ft;
  });

  // 3) Retourne la liste des FileTrack
  return playlists;
}

export function DB_ExportPlaylists(): Promise<Blob> {
  return PlaylistLibraryDB.export();
}

export function DB_ImportPlaylists(playlists: Blob): Promise<void> {
  return PlaylistLibraryDB.import(playlists);
}

export function DB_ClearPlaylists(): Promise<void> {
  return PlaylistLibraryDB.playlists.clear();
}
