import MiniSearch from 'minisearch'
import type { IndexedTrack, TrackType } from '@/models/TracksLibraryIndex'
import { trackTypeLabel } from '@/models/TracksLibraryIndex'
import { parentPath } from './storagePath'

/**
 * Recherche et filtres sur la liste fusionnée des pistes. L’index de recherche
 * est reconstruit en mémoire à chaque changement de liste : rien n’est stocké.
 */

/** Une piste identifiée dans l’ensemble de la bibliothèque. */
export interface SearchableTrack {
  /** Unique toutes sources confondues (`source:piste`). */
  key: string
  track: IndexedTrack
}

/** Minuscules sans accents : « forêt » et « foret » sont la même chose. */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export class TrackSearch {
  private readonly index: MiniSearch

  constructor(tracks: SearchableTrack[]) {
    this.index = new MiniSearch({
      fields: ['name', 'tags', 'type', 'folder'],
      storeFields: [],
      processTerm: term => fold(term),
      searchOptions: {
        // Le nom pèse le plus ; les étiquettes sont ce qu’on cherche ensuite.
        boost: { name: 3, tags: 2 },
        prefix: true,
        // Une faute tolérée dès quatre lettres, deux au-delà de huit.
        fuzzy: term => (term.length >= 8 ? 0.25 : term.length >= 4 ? 0.2 : false),
        combineWith: 'AND',
      },
    })
    this.index.addAll(
      tracks.map(({ key, track }) => ({
        id: key,
        name: track.name,
        tags: track.tags.join(' '),
        type: track.type ? trackTypeLabel(track.type) : '',
        folder: parentPath(track.path).replace(/\//g, ' '),
      })),
    )
  }

  /** Clés des pistes qui correspondent, les plus pertinentes d’abord. Vide → `null` (pas de filtre). */
  search(query: string): string[] | null {
    const text = query.trim()
    if (!text) return null
    return this.index.search(text).map(result => String(result.id))
  }
}

export interface TrackFilters {
  /** Un type précis, `'none'` pour les pistes sans type, `null` pour ne pas filtrer. */
  type: TrackType | 'none' | null
  /** Une piste passe si elle porte l’une de ces étiquettes. */
  tags: string[]
  /** Pistes sans aucune étiquette. */
  untagged: boolean
}

export const NO_FILTERS: TrackFilters = { type: null, tags: [], untagged: false }

export function hasFilters(filters: TrackFilters): boolean {
  return filters.type !== null || filters.tags.length > 0 || filters.untagged
}

export const sameTag = (a: string, b: string) => fold(a) === fold(b)

/** Les groupes se cumulent (ET) ; à l’intérieur du groupe des étiquettes, une valeur suffit (OU). */
export function matchesFilters(track: IndexedTrack, filters: TrackFilters): boolean {
  if (filters.untagged && track.tags.length > 0) return false
  if (filters.type === 'none' ? track.type !== undefined : filters.type !== null && track.type !== filters.type) return false
  if (filters.tags.length && !filters.tags.some(tag => track.tags.some(t => sameTag(t, tag)))) return false
  return true
}

/**
 * Applique recherche et filtres, puis trie : par pertinence quand on cherche,
 * sinon les dernières ajoutées en premier.
 */
export function selectTracks<T extends SearchableTrack>(
  tracks: T[],
  search: TrackSearch,
  query: string,
  filters: TrackFilters,
): T[] {
  const hits = search.search(query)
  const rank = hits ? new Map(hits.map((key, i) => [key, i])) : null
  return tracks
    .filter(item => (rank ? rank.has(item.key) : true) && matchesFilters(item.track, filters))
    .sort((a, b) => (rank ? rank.get(a.key)! - rank.get(b.key)! : b.track.addedAt.localeCompare(a.track.addedAt)))
}

/** Étiquettes en usage, avec leur nombre de pistes, les plus fréquentes d’abord. */
export function countTags(tracks: SearchableTrack[]): { value: string; count: number }[] {
  const counts = new Map<string, { value: string; count: number }>()
  for (const { track } of tracks) {
    for (const value of track.tags) {
      const entry = counts.get(fold(value)) ?? { value, count: 0 }
      entry.count++
      counts.set(fold(value), entry)
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'fr'))
}
