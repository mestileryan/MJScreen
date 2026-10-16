import { trackLibraryDB } from './TrackPersistance'
import { createFileTrack, DEFAULT_ICON_COLOR } from '@/models/FileTrack'
import type FileTrack from '@/models/FileTrack'
import type { TrackDB } from './TrackDB'

/**
 * Sauvegarde un FileTrack dans Dexie et retourne l'id attribué.
 * Le modèle étant immuable, c'est à l'appelant de reporter l'id sur sa copie.
 * Avec `blobId`, la piste renvoie à un fichier déjà rangé dans `blobs` (voir
 * `DB_AddSharedBlob`) au lieu d'en stocker une copie.
 */
export async function DB_AddTrack(track: FileTrack, blobId?: number): Promise<number> {
  // On construit l'objet qu'on veut stocker
  const stored: TrackDB = {
    name: track.name,
    initialVolume: track.initialVolume,
    ...(blobId != null ? { blobId } : { blob: track.file }),
    iconName: track.iconName,
    iconColor: track.iconColor,
    order: track.order,
    playlistId: track.playlistId,
    loop: track.loop,
    effects: track.effects,
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
    effects: track.effects,
  })
}

/**
 * Crêtes de forme d'onde pré-calculées. Trois états distincts :
 *   - `Uint8Array` : crêtes connues (un tableau vide est le marqueur
 *     « fichier indécodable ») ;
 *   - `null` : la piste existe mais n'a jamais été décodée ;
 *   - `undefined` : la piste n'existe plus.
 * Distinguer les deux derniers évite de décoder une piste supprimée entre-temps.
 */
export async function DB_GetTrackPeaks(id: number): Promise<Uint8Array | null | undefined> {
  const stored = await trackLibraryDB().tracks.get(id)
  if (!stored) return undefined
  return stored.peaks ?? null
}

/** Mémorise les crêtes d'une piste. No-op si la piste n'existe plus. */
export async function DB_SetTrackPeaks(id: number, peaks: Uint8Array): Promise<void> {
  await trackLibraryDB().tracks.update(id, { peaks })
}

/**
 * Ids des pistes dont la forme d'onde n'a jamais été calculée.
 * Permet au backfill de connaître son volume de travail à l'avance (progression
 * affichable) et de n'itérer que sur les pistes concernées.
 */
export async function DB_GetTrackIdsMissingPeaks(): Promise<number[]> {
  const stored = await trackLibraryDB().tracks.toArray()
  return stored.flatMap(row => (row.id != null && row.peaks == null ? [row.id] : []))
}

/** Range un fichier destiné à plusieurs pistes et retourne son id (import). */
export async function DB_AddSharedBlob(blob: Blob): Promise<number> {
  return trackLibraryDB().blobs.add({ blob })
}

/**
 * Duplique une piste dans une playlist : réglages, icône et forme d'onde sont
 * copiés, le fichier audio est partagé. À la première duplication, le fichier
 * que la piste source portait en propre migre vers `blobs` ; il est déplacé,
 * pas copié, et la base ne grossit pas.
 * Retourne l'id du doublon, `undefined` si la source n'existe plus.
 */
export async function DB_DuplicateTrack(
  sourceId: number,
  playlistId: number | undefined,
  order: number,
): Promise<number | undefined> {
  const db = trackLibraryDB()
  return db.transaction('rw', db.tracks, db.blobs, async () => {
    const source = await db.tracks.get(sourceId)
    if (!source) return undefined

    const { id, blob, ...rest } = source
    let blobId = source.blobId
    if (blobId == null) {
      if (!blob) return undefined
      blobId = await db.blobs.add({ blob })
      await db.tracks.put({ ...rest, id, blobId })
    }

    return db.tracks.add({ ...rest, blobId, playlistId, order })
  })
}

/**
 * Supprime une piste. Si elle partageait son fichier, celui-ci n'est supprimé
 * qu'avec la dernière piste qui y renvoie : le décompte se fait dans la même
 * transaction que la suppression, aucun fichier ne peut rester orphelin.
 */
export async function DB_RemoveTrack(track: FileTrack): Promise<void> {
  if (track.id == null) {
    // Pas d'id => rien à supprimer
    return
  }
  const db = trackLibraryDB()
  const id = track.id
  await db.transaction('rw', db.tracks, db.blobs, async () => {
    const stored = await db.tracks.get(id)
    if (!stored) return
    await db.tracks.delete(id)
    if (stored.blobId == null) return
    const remaining = await db.tracks.where('blobId').equals(stored.blobId).count()
    if (remaining === 0) await db.blobs.delete(stored.blobId)
  })
}

/** Reconstruit un FileTrack à partir d'une ligne de la base. */
function fromStored(stored: TrackDB, shared: Map<number, Blob>): FileTrack {
  // On recrée un "File" depuis le Blob stocké en DB, propre ou partagé. Une
  // référence introuvable donne un fichier vide plutôt qu'une piste perdue.
  const blob = stored.blob ?? (stored.blobId != null ? shared.get(stored.blobId) : undefined)
  const file = new File(blob ? [blob] : [], stored.name, { type: blob?.type ?? '' })

  return {
    ...createFileTrack(file, stored.name),
    id: stored.id,
    initialVolume: stored.initialVolume,
    iconName: stored.iconName,
    iconColor: stored.iconColor ?? DEFAULT_ICON_COLOR,
    order: stored.order,
    playlistId: stored.playlistId,
    loop: stored.loop ?? false,
    effects: stored.effects,
  }
}

/** Fichiers partagés référencés par ces pistes, indexés par id. */
async function sharedBlobsFor(stored: TrackDB[]): Promise<Map<number, Blob>> {
  const ids = [...new Set(stored.flatMap(row => (row.blobId != null ? [row.blobId] : [])))]
  if (!ids.length) return new Map()
  const rows = await trackLibraryDB().blobs.bulkGet(ids)
  return new Map(rows.flatMap(row => (row?.id != null ? [[row.id, row.blob] as const] : [])))
}

/**
 * Charge tous les TrackDB depuis Dexie et les convertit en FileTrack
 */
export async function DB_GetTracks(): Promise<FileTrack[]> {
  const storedTracks = await trackLibraryDB().tracks.toArray()
  const shared = await sharedBlobsFor(storedTracks)
  return storedTracks.map(stored => fromStored(stored, shared))
}

/**
 * Clé identifiant le fichier audio de chaque piste : les doublons partagent la
 * même. Sert à l'export pour n'écrire chaque fichier qu'une fois.
 */
export async function DB_GetTrackFileKeys(): Promise<Map<number, string>> {
  const storedTracks = await trackLibraryDB().tracks.toArray()
  return new Map(
    storedTracks.flatMap(row =>
      row.id != null
        ? [[row.id, row.blobId != null ? `blob-${row.blobId}` : `track-${row.id}`] as const]
        : [],
    ),
  )
}

/**
 * Retrieve a single track by its id from Dexie and rebuild the FileTrack
 * instance.
 */
export async function DB_GetTrack(id: number): Promise<FileTrack | undefined> {
  const stored = await trackLibraryDB().tracks.get(id)
  return stored ? fromStored(stored, await sharedBlobsFor([stored])) : undefined
}
