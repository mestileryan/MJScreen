import { baseName } from '@/lib/storagePath'

/** Version du schéma de `.mjlib/index.json` écrite par cette version de l'application. */
export const INDEX_SCHEMA_VERSION = 1

/** Métadonnées d'une piste. Le fichier audio, lui, reste dans le stockage. */
export interface IndexedTrack {
  /**
   * Identifiant stable, tiré au sort à l'indexation et conservé dans l'index.
   * Il ne dérive pas du chemin : renommer ou déplacer le fichier ne doit pas
   * faire perdre les tags qui y sont attachés.
   */
  id: string
  /** Chemin du fichier, relatif à la racine de la bibliothèque. */
  path: string
  /** Nom affiché, modifiable ; par défaut le nom du fichier sans extension. */
  name: string
  tags: string[]
  /** Taille en octets et date de modification : repèrent un fichier changé hors de l'outil. */
  size?: number
  lastModified?: number
  /** Durée en secondes, connue après lecture des métadonnées audio. */
  duration?: number
  /** Date d'ajout à l'index, ISO 8601. */
  addedAt: string
}

export default interface TracksLibraryIndex {
  schemaVersion: typeof INDEX_SCHEMA_VERSION
  tracks: IndexedTrack[]
}

export function createTracksLibraryIndex(): TracksLibraryIndex {
  return { schemaVersion: INDEX_SCHEMA_VERSION, tracks: [] }
}

/** Nom affiché par défaut : le nom du fichier sans son extension. */
export function trackNameFromPath(path: string): string {
  const name = baseName(path)
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export function createIndexedTrack(
  path: string,
  file: { size?: number; lastModified?: number } = {},
  now = new Date(),
): IndexedTrack {
  return {
    id: crypto.randomUUID(),
    path,
    name: trackNameFromPath(path),
    tags: [],
    ...(file.size !== undefined && { size: file.size }),
    ...(file.lastModified !== undefined && { lastModified: file.lastModified }),
    addedAt: now.toISOString(),
  }
}
