import type TracksLibraryIndex from '@/models/TracksLibraryIndex'
import type { IndexedTrack, TrackMeta, TrackType } from '@/models/TracksLibraryIndex'
import { INDEX_SCHEMA_VERSION, META_FIELDS, TRACK_TYPES } from '@/models/TracksLibraryIndex'
import type { DocumentSchema } from './documentSchema'
import {
  expectArray,
  expectObject,
  expectRelativePath,
  expectString,
  expectStringArray,
  optionalNumber,
  optionalString,
  SchemaError,
  withoutUndefined,
} from './validation'

function optionalTrackType(value: unknown, location: string): TrackType | undefined {
  if (value === undefined) return undefined
  const type = TRACK_TYPES.find(t => t.value === value)
  if (!type) throw new SchemaError(location, `type inconnu « ${String(value)} »`)
  return type.value
}

function optionalMeta(value: unknown, location: string): TrackMeta | undefined {
  if (value === undefined) return undefined
  const meta = expectObject(value, location)
  return withoutUndefined(Object.fromEntries(META_FIELDS.map(({ key }) => [key, optionalString(meta[key], `${location}.${key}`)]))) as TrackMeta
}

function validateTrack(value: unknown, location: string): IndexedTrack {
  const track = expectObject(value, location)
  return withoutUndefined({
    ...track,
    id: expectString(track.id, `${location}.id`),
    path: expectRelativePath(track.path, `${location}.path`),
    name: expectString(track.name, `${location}.name`, { allowEmpty: true }),
    tags: expectStringArray(track.tags, `${location}.tags`),
    type: optionalTrackType(track.type, `${location}.type`),
    meta: optionalMeta(track.meta, `${location}.meta`),
    size: optionalNumber(track.size, `${location}.size`),
    lastModified: optionalNumber(track.lastModified, `${location}.lastModified`),
    duration: optionalNumber(track.duration, `${location}.duration`),
    hash: optionalString(track.hash, `${location}.hash`),
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
