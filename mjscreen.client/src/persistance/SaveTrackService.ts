import { TrackLibraryDB } from './TrackPersistance';
import FileTrack from '../models/FileTrack'; // ou le bon chemin
import type { StoredTrack } from './StoredTrack';

/**
 * Sauvegarde un FileTrack dans Dexie
 */
export async function saveTrackToDB(track: FileTrack): Promise<number> {
  // On construit l'objet qu'on veut stocker
  const stored: StoredTrack = {
    name: track.file.name,
    initialVolume: track.initialVolume,
    blob: track.file
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
export async function updateTrackVolumeInDB(track: FileTrack): Promise<void> {
  if (track.id == null) {
    return;
  }
  await TrackLibraryDB.tracks.update(track.id, {
    initialVolume: track.initialVolume
  });
}

/**
 * Supprime un enregistrement de la DB via son id
 */
export async function removeTrackFromDB(track: FileTrack): Promise<void> {
  if (track.id == null) {
    // Pas d'id => rien à supprimer
    return;
  }
  await TrackLibraryDB.tracks.delete(track.id);
}

/**
 * Charge tous les StoredTrack depuis Dexie et les convertit en FileTrack
 */
export async function loadTracksFromDB(): Promise<FileTrack[]> {
  // 1) Récupération de tous les enregistrements (StoredTrack)
  const storedTracks: StoredTrack[] = await TrackLibraryDB.tracks.toArray();

  // 2) Conversion en FileTrack
  const fileTracks: FileTrack[] = storedTracks.map(st => {
    // a) On recrée un "File" depuis le Blob stocké en DB
    const file = new File([st.blob], st.name, { type: st.blob.type });

    // b) On instancie un FileTrack avec le volume initial
    const ft = new FileTrack(file, st.initialVolume);
    ft.id = st.id;
    // (Optionnel) Si vous stockez un id, vous pourriez l’attacher également à FileTrack
    // ft.id = st.id; // par ex., si FileTrack a un champ id

    return ft;
  });

  // 3) Retourne la liste des FileTrack
  return fileTracks;
}
