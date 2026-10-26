import { describe, expect, it } from 'vitest'
import { MemoryStorageProvider } from '@/storage/MemoryStorageProvider'
import { readText } from '@/storage/StorageProvider'
import { LIBRARY_INDEX_PATH } from './TracksLibraryFiles'
import {
  deleteTrack,
  initTracksLibrary,
  openTracksLibrary,
  refreshTracksLibrary,
  removeTracksFromIndex,
  updateTracks,
  type TracksLibrary,
} from './TracksLibraryService'

async function reopen(storage: MemoryStorageProvider): Promise<TracksLibrary> {
  const outcome = await openTracksLibrary(storage)
  if (outcome.status !== 'ready') throw new Error(outcome.status)
  return outcome.library
}

describe('refreshTracksLibrary', () => {
  it('indexe les fichiers d’un dossier adopté et enregistre l’index', async () => {
    const storage = new MemoryStorageProvider('Brut', { 'combat.mp3': 'abc', 'ambiances/pluie.ogg': 'de', 'notes.txt': '' })
    const library = await initTracksLibrary(storage)

    const { library: refreshed, report } = await refreshTracksLibrary(library)

    expect(report.added.map(t => t.path)).toEqual(['ambiances/pluie.ogg', 'combat.mp3'])
    expect(refreshed.index.tracks).toHaveLength(2)
    expect((await reopen(storage)).index.tracks).toEqual(refreshed.index.tracks)
  })

  it('ne réécrit pas l’index quand rien n’a changé', async () => {
    const storage = new MemoryStorageProvider('Brut', { 'combat.mp3': 'abc' })
    const { library } = await refreshTracksLibrary(await initTracksLibrary(storage))
    const written = await readText(storage, LIBRARY_INDEX_PATH)
    await storage.write('autre.txt', 'x')

    const { library: again, report } = await refreshTracksLibrary(library)

    expect(again).toBe(library)
    expect(report).toEqual({ added: [], missing: [], changed: [] })
    expect(await readText(storage, LIBRARY_INDEX_PATH)).toBe(written)
  })

  it('garde les tags d’une piste dont le fichier a disparu puis la retire sur demande', async () => {
    const storage = new MemoryStorageProvider('Brut', { 'combat.mp3': 'abc' })
    const { library } = await refreshTracksLibrary(await initTracksLibrary(storage))
    const tagged = await updateTracks(library, [{ ...library.index.tracks[0], tags: ['combat'] }])
    await storage.delete('combat.mp3')

    const { library: after, report } = await refreshTracksLibrary(tagged)
    expect(report.missing.map(t => t.tags)).toEqual([['combat']])
    expect(after.index.tracks).toHaveLength(1)

    const cleaned = await removeTracksFromIndex(after, report.missing.map(t => t.id))
    expect(cleaned.index.tracks).toEqual([])
    expect((await reopen(storage)).index.tracks).toEqual([])
  })

  it('supprime définitivement une piste : le fichier et son entrée', async () => {
    const storage = new MemoryStorageProvider('Brut', { 'combat.mp3': 'abc', 'calme.mp3': 'def' })
    const { library } = await refreshTracksLibrary(await initTracksLibrary(storage))
    const combat = library.index.tracks.find(t => t.path === 'combat.mp3')!

    const after = await deleteTrack(library, combat.id)

    expect(after.index.tracks.map(t => t.path)).toEqual(['calme.mp3'])
    expect(await storage.stat('combat.mp3')).toBeNull()
    expect(await readText(storage, 'calme.mp3')).toBe('def')
    expect((await reopen(storage)).index.tracks.map(t => t.path)).toEqual(['calme.mp3'])
  })

  it('retire une piste dont le fichier avait déjà disparu', async () => {
    const storage = new MemoryStorageProvider('Brut', { 'combat.mp3': 'abc' })
    const { library } = await refreshTracksLibrary(await initTracksLibrary(storage))
    await storage.delete('combat.mp3')
    const after = await deleteTrack(library, library.index.tracks[0].id)
    expect(after.index.tracks).toEqual([])
  })

  it('ne touche jamais aux fichiers audio', async () => {
    const storage = new MemoryStorageProvider('Brut', { 'combat.mp3': 'abc' })
    const { library } = await refreshTracksLibrary(await initTracksLibrary(storage))
    await removeTracksFromIndex(library, library.index.tracks.map(t => t.id))
    expect(await readText(storage, 'combat.mp3')).toBe('abc')
  })
})
