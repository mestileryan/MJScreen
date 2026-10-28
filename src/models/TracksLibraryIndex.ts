import { baseName } from '@/lib/storagePath'

/** Version du schéma de `.mjlib/index.json` écrite par cette version de l'application. */
export const INDEX_SCHEMA_VERSION = 1

/** Nature d'une piste : une musique, une ambiance continue, ou un effet ponctuel. */
export type TrackType = 'music' | 'ambience' | 'sfx'

export const TRACK_TYPES: { value: TrackType; label: string }[] = [
  { value: 'music', label: 'Musique' },
  { value: 'ambience', label: 'Ambiance' },
  { value: 'sfx', label: 'Effet sonore' },
]

export function trackTypeLabel(type: TrackType): string {
  return TRACK_TYPES.find(t => t.value === type)?.label ?? type
}

/** Étiquettes proposées à la saisie (les univers de jeu, surtout) ; la liste reste ouverte. */
export const SUGGESTED_TAGS = ['Médiéval fantastique', 'Cyberpunk', 'Science-fiction', 'Horreur', 'Contemporain', 'Générique']

/**
 * Ce que le fichier dit de lui-même (ID3, commentaires Vorbis, atomes M4A…),
 * complété ou corrigé à la main. Tout est facultatif ; un objet vide signifie
 * « lu, rien trouvé », pour ne pas relire le fichier à chaque ouverture.
 */
export interface TrackMeta {
  title?: string
  artist?: string
  album?: string
  genre?: string
  comment?: string
}

export const META_FIELDS: { key: keyof TrackMeta; label: string }[] = [
  { key: 'title', label: 'Titre' },
  { key: 'artist', label: 'Artiste' },
  { key: 'album', label: 'Album' },
  { key: 'genre', label: 'Genre' },
  { key: 'comment', label: 'Commentaire' },
]

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
  /** Nature de la piste, quand elle a été précisée. */
  type?: TrackType
  /** Métadonnées du fichier, lues en arrière-plan ; absent tant qu'elles ne l'ont pas été. */
  meta?: TrackMeta
  /** Taille en octets et date de modification : repèrent un fichier changé hors de l'outil. */
  size?: number
  lastModified?: number
  /** Durée en secondes, connue après lecture des métadonnées audio. */
  duration?: number
  /** Empreinte SHA-256 du contenu, calculée en arrière-plan ; sert à repérer les doublons. */
  hash?: string
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

/** Étiquettes saisies « combat, nuit , forêt » → `['combat', 'nuit', 'forêt']`, sans doublon ni vide. */
export function parseTags(text: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const raw of text.split(/[,;]/)) {
    const tag = raw.trim()
    if (!tag || seen.has(tag.toLowerCase())) continue
    seen.add(tag.toLowerCase())
    tags.push(tag)
  }
  return tags
}

/** Étiquette posée d’office sur une piste dont le contenu existe déjà ailleurs dans la bibliothèque. */
export const DUPLICATE_TAG = 'doublon'

/** Empreintes portées par plus d’une piste, toutes sources confondues. */
export function duplicateHashes(tracks: Iterable<Pick<IndexedTrack, 'hash'>>): Set<string> {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const { hash } of tracks) {
    if (!hash) continue
    if (seen.has(hash)) duplicates.add(hash)
    seen.add(hash)
  }
  return duplicates
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
