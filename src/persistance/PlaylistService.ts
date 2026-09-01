import { playlistLibraryDB } from './PlaylistPersistance'
import { createPlaylist } from '@/models/Playlist'
import type Playlist from '@/models/Playlist'
import type { PlaylistDB } from './PlaylistDB'

/**
 * Sauvegarde une playlist dans Dexie et retourne l'id attribué.
 */
export async function DB_AddPlaylist(playlist: Playlist): Promise<number> {
  // On construit l'objet qu'on veut stocker
  const stored: PlaylistDB = {
    name: playlist.name,
    width: playlist.width,
    order: playlist.order,
    mode: playlist.mode,
    fadeIn: playlist.fadeIn,
    fadeOut: playlist.fadeOut,
    archive: playlist.archive,
  }

  // Dexie renvoie l'ID nouvellement inséré
  return playlistLibraryDB().playlists.add(stored)
}

/**
 * Met à jour le nom, la largeur et l'ordre de la playlist
 */
export async function DB_UpdatePlaylist(playlist: Playlist): Promise<void> {
  if (playlist.id == null) {
    return
  }
  await playlistLibraryDB().playlists.update(playlist.id, {
    name: playlist.name,
    width: playlist.width,
    order: playlist.order,
    mode: playlist.mode,
    fadeIn: playlist.fadeIn,
    fadeOut: playlist.fadeOut,
    archive: playlist.archive,
  })
}

/**
 * Supprime un enregistrement de la DB via son id
 */
export async function DB_RemovePlaylist(playlist: Playlist): Promise<void> {
  if (playlist.id == null) {
    // Pas d'id => rien à supprimer
    return
  }
  await playlistLibraryDB().playlists.delete(playlist.id)
}

/**
 * Charge toutes les playlists depuis Dexie, triées par ordre d'affichage
 */
export async function DB_GetPlaylists(): Promise<Playlist[]> {
  const storedPlaylists: PlaylistDB[] = await playlistLibraryDB().playlists.toArray()

  storedPlaylists.sort((a, b) => {
    // Les archives ferment toujours la marche, quel que soit leur `order`.
    if (Boolean(a.archive) !== Boolean(b.archive)) return a.archive ? 1 : -1
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return (a.id ?? 0) - (b.id ?? 0)
  })

  return storedPlaylists.map((stored, index) => ({
    ...createPlaylist(stored.name, stored.order ?? index),
    id: stored.id,
    width: stored.width ?? undefined,
    mode: stored.mode ?? 'libre',
    fadeIn: stored.fadeIn ?? 0,
    fadeOut: stored.fadeOut ?? 0,
    archive: stored.archive ?? false,
  }))
}
