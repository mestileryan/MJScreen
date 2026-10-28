import { describe, expect, it } from 'vitest'
import { describeMeta, hasMeta, metaFromCommon } from './audioMeta'

describe('metaFromCommon', () => {
  it('garde les cinq champs utiles, nettoyés', () => {
    expect(
      metaFromCommon({
        title: ' Tavern Brawl ',
        artist: 'Tabletop Audio',
        album: 'Fantasy Vol. 2',
        genre: ['Ambient', 'Soundtrack'],
        comment: [{ text: 'Scène de bagarre' }],
      }),
    ).toEqual({ title: 'Tavern Brawl', artist: 'Tabletop Audio', album: 'Fantasy Vol. 2', genre: 'Ambient, Soundtrack', comment: 'Scène de bagarre' })
  })

  it('ignore les champs vides et accepte les commentaires en texte brut', () => {
    expect(metaFromCommon({ title: '  ', genre: [], comment: ['', 'ok'] })).toEqual({ comment: 'ok' })
    expect(metaFromCommon({})).toEqual({})
  })
})

describe('hasMeta / describeMeta', () => {
  it('distingue « lu, rien trouvé » de « jamais lu »', () => {
    expect(hasMeta(undefined)).toBe(false)
    expect(hasMeta({})).toBe(false)
    expect(hasMeta({ artist: 'X' })).toBe(true)
  })

  it('décrit les champs présents, dans l’ordre', () => {
    expect(describeMeta({ artist: 'Tabletop Audio', title: 'Tavern Brawl' })).toBe('Titre : Tavern Brawl\nArtiste : Tabletop Audio')
  })
})
