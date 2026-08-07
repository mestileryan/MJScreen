import { trackLibraryDB } from './TrackPersistance'
import { createFileTrack, DEFAULT_ICON_COLOR } from '@/models/FileTrack'
import type FileTrack from '@/models/FileTrack'
import type { TrackDB } from './TrackDB'

/**
 * Sauvegarde un FileTrack dans Dexie et retourne l'id attribué.
 * Le modèle étant immuable, c'est à l'appelant de reporter l'id sur sa copie.
 */
export async function DB_AddTrack(track: FileTrack): Promise<number> {
  // On construit l'objet qu'on veut stocker
  const stored: TrackDB = {
    name: track.name,
    initialVolume: track.initialVolume,
    blob: track.file,
    iconName: track.iconName,
    iconColor: track.iconColor,
    order: track.order,
    playlistId: track.playlistId,
    loop: track.loop,
  }

  // Dexie renvoie l'ID nouvellement inséré
  return trackLibraryDB().tracks.add(stored)
}

/**
 * Met à jour les métadonnées de la piste dans la DB
 */
export async function DB_UpdateTrack(track: FileTrack): Promise<void> {
  if (track.id == null) {
    return
  }

  await trackLibraryDB().tracks.update(track.id, {
    initialVolume: track.initialVolume,
    name: track.name,
    iconName: track.iconName,
    iconColor: track.iconColor,
    order: track.order,
    playlistId: track.playlistId,
    loop: track.loop,
  })
}

/**
 * Supprime un enregistrement de la DB via son id
 */
export async function DB_RemoveTrack(track: FileTrack): Promise<void> {
  if (track.id == null) {
    // Pas d'id => rien à supprimer
    return
  }
  await trackLibraryDB().tracks.delete(track.id)
}

/** Reconstruit un FileTrack à partir d'une ligne de la base. */
function fromStored(stored: TrackDB): FileTrack {
  // On recrée un "File" depuis le Blob stocké en DB
  const file = new File([stored.blob], stored.name, { type: stored.blob.type })

  return {
    ...createFileTrack(file, stored.name),
    id: stored.id,
    initialVolume: stored.initialVolume,
    iconName: stored.iconName,
    iconColor: stored.iconColor ?? DEFAULT_ICON_COLOR,
    order: stored.order,
    playlistId: stored.playlistId,
    loop: stored.loop ?? false,
  }
}

/**
 * Charge tous les TrackDB depuis Dexie et les convertit en FileTrack
 */
export async function DB_GetTracks(): Promise<FileTrack[]> {
  const storedTracks = await trackLibraryDB().tracks.toArray()
  return storedTracks.map(fromStored)
}

/**
 * Retrieve a single track by its id from Dexie and rebuild the FileTrack
 * instance.
 */
export async function DB_GetTrack(id: number): Promise<FileTrack | undefined> {
  const stored = await trackLibraryDB().tracks.get(id)
  return stored ? fromStored(stored) : undefined
}
