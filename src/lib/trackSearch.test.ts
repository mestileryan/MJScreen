import { describe, expect, it } from 'vitest'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import { countTags, matchesFilters, NO_FILTERS, selectTracks, TrackSearch, type SearchableTrack } from './trackSearch'

const track = (key: string, name: string, extra: Partial<IndexedTrack> = {}): SearchableTrack => ({
  key,
  track: { id: key, path: `${name}.mp3`, name, tags: [], addedAt: '2026-10-01T00:00:00.000Z', ...extra },
})

const tracks = [
  track('a', 'Tambours de guerre', { tags: ['combat', 'Médiéval fantastique'], type: 'music', addedAt: '2026-10-01T00:00:00.000Z' }),
  track('b', 'Ours en colère', { tags: ['animal', 'combat'], type: 'sfx', addedAt: '2026-10-03T00:00:00.000Z' }),
  track('c', 'Forêt la nuit', { tags: ['Médiéval fantastique', 'Horreur'], type: 'ambience', addedAt: '2026-10-02T00:00:00.000Z' }),
  track('d', 'Néons sous la pluie', { tags: ['Cyberpunk'], addedAt: '2026-10-04T00:00:00.000Z' }),
  track('e', 'Sans rien', { addedAt: '2026-10-05T00:00:00.000Z', meta: { artist: 'Tabletop Audio', album: 'Fantasy Vol. 2' } }),
]

describe('TrackSearch', () => {
  const search = new TrackSearch(tracks)

  it('ne retrouve plus « Tambours » avec « ours »', () => {
    expect(search.search('ours')).toEqual(['b'])
  })

  it('tolère les fautes et les accents', () => {
    expect(search.search('foret')).toEqual(['c'])
    expect(search.search('tambour')).toEqual(['a'])
    expect(search.search('tanbours')).toEqual(['a'])
  })

  it('cherche aussi dans les étiquettes et le type', () => {
    expect(search.search('combat')).toEqual(expect.arrayContaining(['a', 'b']))
    expect(search.search('cyberpunk')).toEqual(['d'])
    expect(search.search('effet')).toEqual(['b'])
  })

  it('cherche dans les métadonnées du fichier', () => {
    expect(search.search('tabletop')).toEqual(['e'])
    expect(search.search('fantasy')).toEqual(['e'])
  })

  it('exige tous les mots', () => {
    expect(search.search('ours combat')).toEqual(['b'])
    expect(search.search('ours cyberpunk')).toEqual([])
  })

  it('ne filtre pas sur une recherche vide', () => {
    expect(search.search('  ')).toBeNull()
  })
})

describe('matchesFilters', () => {
  const t = tracks.map(x => x.track)

  it('cumule les groupes et accepte une étiquette parmi celles choisies', () => {
    expect(t.filter(x => matchesFilters(x, { ...NO_FILTERS, type: 'music' })).map(x => x.id)).toEqual(['a'])
    expect(t.filter(x => matchesFilters(x, { ...NO_FILTERS, tags: ['médiéval fantastique'] })).map(x => x.id)).toEqual(['a', 'c'])
    expect(t.filter(x => matchesFilters(x, { ...NO_FILTERS, tags: ['Horreur', 'Cyberpunk'] })).map(x => x.id)).toEqual(['c', 'd'])
    expect(t.filter(x => matchesFilters(x, { ...NO_FILTERS, tags: ['combat'], type: 'sfx' })).map(x => x.id)).toEqual(['b'])
  })

  it('isole les pistes sans étiquette, et celles sans type', () => {
    expect(t.filter(x => matchesFilters(x, { ...NO_FILTERS, untagged: true })).map(x => x.id)).toEqual(['e'])
    expect(t.filter(x => matchesFilters(x, { ...NO_FILTERS, type: 'none' })).map(x => x.id)).toEqual(['d', 'e'])
  })
})

describe('selectTracks', () => {
  const search = new TrackSearch(tracks)

  it('trie par date d’ajout décroissante sans recherche', () => {
    expect(selectTracks(tracks, search, '', NO_FILTERS).map(x => x.key)).toEqual(['e', 'd', 'b', 'c', 'a'])
  })

  it('trie par pertinence avec une recherche, et applique les filtres', () => {
    expect(selectTracks(tracks, search, 'combat', NO_FILTERS)).toHaveLength(2)
    expect(selectTracks(tracks, search, 'combat', { ...NO_FILTERS, type: 'sfx' }).map(x => x.key)).toEqual(['b'])
  })
})

describe('countTags', () => {
  it('compte sans tenir compte de la casse, les plus fréquentes d’abord', () => {
    const counted = countTags([...tracks, track('f', 'x', { tags: ['Combat'] })])
    expect(counted.slice(0, 2)).toEqual([
      { value: 'combat', count: 3 },
      { value: 'Médiéval fantastique', count: 2 },
    ])
  })
})
