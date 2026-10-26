import { describe, expect, it } from 'vitest'
import { createTracksLibraryIndex, type IndexedTrack } from '@/models/TracksLibraryIndex'
import { MemoryStorageProvider } from '@/storage/MemoryStorageProvider'
import type { StorageEntry } from '@/storage/StorageProvider'
import { isEmptyReport, reconcileIndex, scanAudioFiles } from './TracksLibraryIndexer'

const file = (path: string, size = 10, lastModified = 1000): StorageEntry => ({
  path,
  name: path.split('/').pop()!,
  kind: 'file',
  size,
  lastModified,
})

const track = (path: string, extra: Partial<IndexedTrack> = {}): IndexedTrack => ({
  id: `id-${path}`,
  path,
  name: path,
  tags: ['garde'],
  size: 10,
  lastModified: 1000,
  addedAt: '2026-10-20T00:00:00.000Z',
  ...extra,
})

const index = (...tracks: IndexedTrack[]) => ({ ...createTracksLibraryIndex(), tracks })

describe('scanAudioFiles', () => {
  it('ne retient que les fichiers audio, hors .mjlib/', async () => {
    const storage = new MemoryStorageProvider('x', {
      'combat.MP3': 'x',
      'ambiances/pluie.ogg': 'x',
      'ambiances/notes.txt': 'x',
      '.mjlib/index.json': '{}',
      '.mjlib/sauvegardes/vieux.mp3': 'x',
    })
    const paths = (await scanAudioFiles(storage)).map(e => e.path).sort()
    expect(paths).toEqual(['ambiances/pluie.ogg', 'combat.MP3'])
  })
})

describe('reconcileIndex', () => {
  it('ne change rien quand le dossier correspond à l’index', () => {
    const before = index(track('a.mp3'), track('b.mp3'))
    const { index: after, report } = reconcileIndex(before, [file('a.mp3'), file('b.mp3')])
    expect(after).toBe(before)
    expect(isEmptyReport(report)).toBe(true)
  })

  it('ajoute les nouveaux fichiers à la fin, triés, avec un identifiant neuf', () => {
    const before = index(track('z.mp3'))
    const { index: after, report } = reconcileIndex(before, [file('z.mp3'), file('b/n.ogg'), file('a.mp3', 42, 7)])
    expect(after.tracks.map(t => t.path)).toEqual(['z.mp3', 'a.mp3', 'b/n.ogg'])
    expect(report.added.map(t => t.path)).toEqual(['a.mp3', 'b/n.ogg'])
    expect(report.added[0]).toMatchObject({ name: 'a', tags: [], size: 42, lastModified: 7 })
    expect(report.added[0].id).toMatch(/[0-9a-f-]{36}/)
  })

  it('signale les fichiers disparus sans les retirer de l’index', () => {
    const before = index(track('a.mp3'), track('parti.mp3'))
    const { index: after, report } = reconcileIndex(before, [file('a.mp3')])
    expect(after.tracks.map(t => t.path)).toEqual(['a.mp3', 'parti.mp3'])
    expect(report.missing.map(t => t.path)).toEqual(['parti.mp3'])
  })

  it('garde identifiant et tags d’un fichier remplacé, mais oublie sa durée', () => {
    const before = index(track('a.mp3', { duration: 120 }))
    const { index: after, report } = reconcileIndex(before, [file('a.mp3', 999, 2000)])
    expect(after.tracks[0]).toEqual({ ...track('a.mp3'), size: 999, lastModified: 2000 })
    expect(after.tracks[0]).not.toHaveProperty('duration')
    expect(report.changed).toHaveLength(1)
  })

  it('reconnaît un fichier dont seule la date a changé', () => {
    const { report } = reconcileIndex(index(track('a.mp3')), [file('a.mp3', 10, 5000)])
    expect(report.changed).toHaveLength(1)
  })
})
