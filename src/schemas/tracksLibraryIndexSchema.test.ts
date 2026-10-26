import { describe, expect, it } from 'vitest'
import {
  createIndexedTrack,
  createTracksLibraryIndex,
  INDEX_SCHEMA_VERSION,
  parseTags,
  trackNameFromPath,
} from '@/models/TracksLibraryIndex'
import { parseDocument, parseDocumentValue, serializeDocument } from './documentSchema'
import { tracksLibraryIndexSchema } from './tracksLibraryIndexSchema'

const track = {
  id: 't1',
  path: 'pistes/taverne.mp3',
  name: 'Taverne',
  tags: ['ambiance', 'calme'],
  size: 1024,
  lastModified: 1761386400000,
  addedAt: '2026-10-25T10:00:00.000Z',
}

const index = (...tracks: object[]) => ({ schemaVersion: 1, tracks })

describe('tracksLibraryIndexSchema', () => {
  it('relit à l\'identique un index qu\'il a créé, identifiants compris', () => {
    const created = { ...createTracksLibraryIndex(), tracks: [createIndexedTrack('pistes/a.mp3', { size: 3 })] }
    const result = parseDocument(tracksLibraryIndexSchema, serializeDocument(created))
    expect(result).toEqual({ status: 'ok', value: created, migratedFrom: null })
  })

  it('accepte un index vide', () => {
    expect(parseDocumentValue(tracksLibraryIndexSchema, index()).status).toBe('ok')
  })

  it('accepte une piste sans métadonnées facultatives et garde ses champs inconnus', () => {
    const minimal = { id: 't2', path: 'combat.ogg', name: '', tags: [], addedAt: 'x', bpm: 120 }
    const result = parseDocumentValue(tracksLibraryIndexSchema, index(track, minimal))
    expect(result).toMatchObject({ status: 'ok', value: { tracks: [track, minimal] } })
  })

  it('refuse un index écrit par une version plus récente', () => {
    const result = parseDocumentValue(tracksLibraryIndexSchema, { ...index(), schemaVersion: INDEX_SCHEMA_VERSION + 1 })
    expect(result.status).toBe('too-new')
  })

  it.each([
    ['sans liste de pistes', { schemaVersion: 1 }],
    ['avec une piste sans identifiant', index({ ...track, id: undefined })],
    ['avec un chemin hors de la racine', index({ ...track, path: '../x.mp3' })],
    ['avec des tags qui ne sont pas du texte', index({ ...track, tags: [1] })],
    ['avec une taille nulle', index({ ...track, size: null })],
    ['avec un identifiant en double', index(track, { ...track, path: 'autre.mp3' })],
    ['avec un chemin en double', index(track, { ...track, id: 't2' })],
  ])('refuse un index %s', (_, document) => {
    expect(parseDocumentValue(tracksLibraryIndexSchema, document).status).toBe('invalid')
  })
})

describe('parseTags', () => {
  it('découpe, nettoie et dédoublonne sans tenir compte de la casse', () => {
    expect(parseTags(' combat, Nuit ;forêt,, nuit ,')).toEqual(['combat', 'Nuit', 'forêt'])
    expect(parseTags('')).toEqual([])
  })
})

describe('trackNameFromPath', () => {
  it.each([
    ['pistes/ambiances/Forêt la nuit.mp3', 'Forêt la nuit'],
    ['archive.tar.gz', 'archive.tar'],
    ['.cache', '.cache'],
    ['sans-extension', 'sans-extension'],
  ])('%s → %s', (path, name) => {
    expect(trackNameFromPath(path)).toBe(name)
  })
})
