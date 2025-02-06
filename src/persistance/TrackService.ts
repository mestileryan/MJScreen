import { TrackLibraryDB } from './TrackPersistance';
import FileTrack from '../models/FileTrack'; // ou le bon chemin
import type { TrackDB } from './TrackDB';

/**
 * Sauvegarde un FileTrack dans Dexie
 */
export async function DB_AddTrack(track: FileTrack): Promise<number> {
  // On construit l'objet qu'on veut stocker
  const stored: TrackDB = {
    name: track.file.name,
    initialVolume: track.initialVolume,
    blob: track.file,
    iconName: track.iconName,
    order: track.order,
    playlistId: track.playlistId,
  };

  // Dexie renvoie l'ID nouvellement inséré
  const newId = await TrackLibraryDB.tracks.add(stored);

  // On l'enregistre dans l'instance de FileTrack
  track.id = newId;

  return newId;
}
/**
 * Met à jour le volume dans la DB pour le track donné
 */
export async function DB_UpdateTrack(track: FileTrack): Promise<void> {
  if (track.id == null) {
    return;
  }
  console.log("Track saved " + track.name + ": " + track.order);

  await TrackLibraryDB.tracks.update(track.id, {
    initialVolume: track.initialVolume,
    name: track.name,
    iconName: track.iconName,
    order: track.order,
    playlistId: track.playlistId,
  });
}

/**
 * Supprime un enregistrement de la DB via son id
 */
export async function DB_RemoveTrack(track: FileTrack): Promise<void> {
  if (track.id == null) {
    // Pas d'id => rien à supprimer
    return;
  }
  await TrackLibraryDB.tracks.delete(track.id);
}

/**
 * Charge tous les StoredTrack depuis Dexie et les convertit en FileTrack
 */
export async function DB_GetTracks(): Promise<FileTrack[]> {
  // 1) Récupération de tous les enregistrements (StoredTrack)
  const storedTracks: TrackDB[] = await TrackLibraryDB.tracks.toArray();

  // 2) Conversion en FileTrack
  const fileTracks: FileTrack[] = storedTracks.map(st => {
    // a) On recrée un "File" depuis le Blob stocké en DB
    const file = new File([st.blob], st.name, { type: st.blob.type });

    // b) On instancie un FileTrack avec le volume initial
    const ft = new FileTrack(file, st.name);
    ft.initialVolume = st.initialVolume;
    ft.id = st.id;
    ft.iconName = st.iconName;
    ft.order = st.order;
    ft.playlistId = st.playlistId;

    return ft;
  });

  // 3) Retourne la liste des FileTrack
  return fileTracks;
}
