import type TracksLibraryIndex from '@/models/TracksLibraryIndex'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import { INDEX_SCHEMA_VERSION } from '@/models/TracksLibraryIndex'
import type { DocumentSchema } from './documentSchema'
import {
  expectArray,
  expectObject,
  expectRelativePath,
  expectString,
  expectStringArray,
  optionalNumber,
  SchemaError,
  withoutUndefined,
} from './validation'

function validateTrack(value: unknown, location: string): IndexedTrack {
  const track = expectObject(value, location)
  return withoutUndefined({
    ...track,
    id: expectString(track.id, `${location}.id`),
    path: expectRelativePath(track.path, `${location}.path`),
    name: expectString(track.name, `${location}.name`, { allowEmpty: true }),
    tags: expectStringArray(track.tags, `${location}.tags`),
    size: optionalNumber(track.size, `${location}.size`),
    lastModified: optionalNumber(track.lastModified, `${location}.lastModified`),
    duration: optionalNumber(track.duration, `${location}.duration`),
    addedAt: expectString(track.addedAt, `${location}.addedAt`),
  })
}

/**
 * Un identifiant ou un chemin en double rendrait l'index ambigu : à quelle entrée
 * rattacher les tags ? Plutôt que d'en choisir une au hasard, on refuse le fichier.
 */
function assertUnique(tracks: IndexedTrack[], key: 'id' | 'path') {
  const seen = new Set<string>()
  tracks.forEach((track, i) => {
    if (seen.has(track[key])) {
      throw new SchemaError(`tracks[${i}].${key}`, `« ${track[key]} » apparaît plusieurs fois`)
    }
    seen.add(track[key])
  })
}

export const tracksLibraryIndexSchema: DocumentSchema<TracksLibraryIndex> = {
  fileName: 'index.json',
  version: INDEX_SCHEMA_VERSION,
  // Ajouter ici `n: doc => …` à chaque montée de version, sans jamais en retirer.
  migrations: {},
  validate: document => {
    const tracks = expectArray(document.tracks, 'tracks').map((track, i) => validateTrack(track, `tracks[${i}]`))
    assertUnique(tracks, 'id')
    assertUnique(tracks, 'path')
    return { ...document, schemaVersion: INDEX_SCHEMA_VERSION, tracks }
  },
}
