import { TrackLibraryDB } from './TrackPersistance';
import FileTrack from '../models/FileTrack'; // ou le bon chemin
import type { StoredTrack } from './StoredTrack';

/**
 * Sauvegarde un FileTrack dans Dexie
 */
export async function saveTrackToDB(track: FileTrack): Promise<number> {
  // Prépare l'objet qui sera stocké
  const stored: StoredTrack = {
    name: track.file.name,
    initialVolume: track.initialVolume,
    blob: track.file // un File est un Blob
  };

  // Return the id
  return await TrackLibraryDB.tracks.add(stored);
}
