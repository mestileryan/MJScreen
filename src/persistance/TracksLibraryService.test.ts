import { describe, expect, it } from 'vitest'
import { serializeDocument } from '@/schemas/documentSchema'
import { MemoryStorageProvider } from '@/storage/MemoryStorageProvider'
import { readText, type StorageProvider } from '@/storage/StorageProvider'
import { backupFile, LIBRARY_CONFIG_PATH, LIBRARY_INDEX_PATH } from './TracksLibraryFiles'
import { initTracksLibrary, openTracksLibrary, resetTracksLibraryFile, saveTracksLibraryConfig, saveTracksLibraryIndex, type TracksLibrary } from './TracksLibraryService'

const config = {
  schemaVersion: 1,
  id: 'lib-1',
  name: 'Campagne Ravenloft',
  tracksDir: 'pistes',
  outputs: [{ id: 'o1', target: 'export' }],
  createdAt: '2026-10-25T10:00:00.000Z',
}

const index = {
  schemaVersion: 1,
  tracks: [
    {
      id: 'a1b2',
      path: 'pistes/taverne.mp3',
      name: 'Taverne animée',
      tags: ['ambiance', 'ville'],
      size: 3,
      addedAt: '2026-10-25T10:00:00.000Z',
    },
  ],
}

/** Bibliothèque déjà gérée, telle qu'on la trouverait en ouvrant le dossier sur une autre machine. */
function managedFolder(files: Record<string, string> = {}) {
  return new MemoryStorageProvider('Ravenloft', {
    [LIBRARY_CONFIG_PATH]: serializeDocument(config),
    [LIBRARY_INDEX_PATH]: serializeDocument(index),
    'pistes/taverne.mp3': 'mp3',
    ...files,
  })
}

/** Instantané du contenu de tous les fichiers, pour vérifier que rien n'a bougé. */
async function snapshot(storage: MemoryStorageProvider) {
  return Object.fromEntries(await Promise.all(storage.paths().map(async p => [p, await readText(storage, p)])))
}

async function openReady(storage: StorageProvider): Promise<TracksLibrary> {
  const outcome = await openTracksLibrary(storage)
  if (outcome.status !== 'ready') throw new Error(`bibliothèque attendue, obtenu ${outcome.status}`)
  return outcome.library
}

describe('openTracksLibrary — dossier déjà géré', () => {
  it('recharge configuration, noms et tags à l\'identique', async () => {
    const library = await openReady(managedFolder())
    expect(library.config).toEqual(config)
    expect(library.index).toEqual(index)
    expect(library.migratedFrom).toEqual({ config: null, index: null })
  })

  it('n\'écrit rien à l\'ouverture', async () => {
    const storage = managedFolder()
    const before = await snapshot(storage)
    await openTracksLibrary(storage)
    expect(await snapshot(storage)).toEqual(before)
  })

  it('retrouve la même bibliothèque depuis une copie des fichiers, sans état dans le navigateur', async () => {
    const original = new MemoryStorageProvider('Machine A')
    const created = await initTracksLibrary(original, 'Ravenloft')
    const copy = new MemoryStorageProvider('Machine B', await snapshot(original))
    const reopened = await openReady(copy)
    expect(reopened.config).toEqual(created.config)
    expect(reopened.index).toEqual(created.index)
  })
})

describe('openTracksLibrary — dossier non géré', () => {
  it('signale un dossier vide', async () => {
    expect(await openTracksLibrary(new MemoryStorageProvider())).toEqual({ status: 'unmanaged', audioFileCount: 0 })
  })

  it('compte les fichiers audio d\'un dossier brut sans rien y écrire', async () => {
    const storage = new MemoryStorageProvider('Brut', {
      'combat.MP3': 'x',
      'ambiances/forêt.ogg': 'x',
      'ambiances/notes.txt': 'x',
    })
    const before = await snapshot(storage)
    expect(await openTracksLibrary(storage)).toEqual({ status: 'unmanaged', audioFileCount: 2 })
    expect(await snapshot(storage)).toEqual(before)
  })
})

describe('initTracksLibrary', () => {
  it('crée .mjlib/ sans toucher aux fichiers existants', async () => {
    const storage = new MemoryStorageProvider('Brut', { 'combat.mp3': 'audio', 'notes.txt': 'texte' })
    const library = await initTracksLibrary(storage)

    expect(storage.paths()).toEqual([LIBRARY_CONFIG_PATH, LIBRARY_INDEX_PATH, 'combat.mp3', 'notes.txt'])
    expect(await readText(storage, 'combat.mp3')).toBe('audio')
    expect(library.config).toMatchObject({ name: 'Brut', tracksDir: 'pistes', outputs: [] })
    expect(library.index.tracks).toEqual([])
    expect(await openReady(storage)).toMatchObject({ config: library.config, index: library.index })
  })

  it('refuse d\'écraser un .mjlib/ existant', async () => {
    const storage = managedFolder()
    const before = await snapshot(storage)
    await expect(initTracksLibrary(storage)).rejects.toThrow()
    expect(await snapshot(storage)).toEqual(before)
  })
})

describe('openTracksLibrary — fichiers abîmés', () => {
  it('signale un config.json illisible sans le modifier', async () => {
    const storage = managedFolder({ [LIBRARY_CONFIG_PATH]: '{ "schemaVersion": 1, "name": ' })
    const before = await snapshot(storage)
    const outcome = await openTracksLibrary(storage)
    expect(outcome).toMatchObject({ status: 'problem', problems: [{ file: 'config', kind: 'invalid' }] })
    expect(await snapshot(storage)).toEqual(before)
  })

  it('signale un index mal formé en situant l\'erreur', async () => {
    const storage = managedFolder({ [LIBRARY_INDEX_PATH]: serializeDocument({ schemaVersion: 1, tracks: [{ id: 'x' }] }) })
    const outcome = await openTracksLibrary(storage)
    expect(outcome.status).toBe('problem')
    if (outcome.status === 'problem') {
      expect(outcome.problems).toHaveLength(1)
      expect(outcome.problems[0]).toMatchObject({ file: 'index', kind: 'invalid' })
      expect(outcome.problems[0].kind === 'invalid' && outcome.problems[0].reason).toContain('tracks[0].path')
    }
  })

  it('signale un fichier écrit par une version plus récente', async () => {
    const storage = managedFolder({ [LIBRARY_INDEX_PATH]: serializeDocument({ ...index, schemaVersion: 99 }) })
    expect(await openTracksLibrary(storage)).toEqual({
      status: 'problem',
      problems: [{ file: 'index', kind: 'too-new', version: 99, supported: 1 }],
    })
  })

  it('signale les fichiers manquants dans un .mjlib/ existant', async () => {
    const storage = new MemoryStorageProvider('Vide', { '.mjlib/autre.txt': '' })
    expect(await openTracksLibrary(storage)).toEqual({
      status: 'problem',
      problems: [
        { file: 'config', kind: 'missing' },
        { file: 'index', kind: 'missing' },
      ],
    })
  })
})

describe('resetTracksLibraryFile', () => {
  it('sauvegarde un fichier illisible avant de le remplacer', async () => {
    const corrupt = '{ "schemaVersion": 1, "tracks": [ '
    const storage = managedFolder({ [LIBRARY_INDEX_PATH]: corrupt })

    const backup = await resetTracksLibraryFile(storage, 'index')

    expect(backup).toMatch(/^\.mjlib\/sauvegardes\/index\..+\.json$/)
    expect(await readText(storage, backup!)).toBe(corrupt)
    expect((await openReady(storage)).index.tracks).toEqual([])
  })

  it('recrée un fichier manquant sans sauvegarde', async () => {
    const storage = managedFolder()
    await storage.delete(LIBRARY_CONFIG_PATH)
    expect(await resetTracksLibraryFile(storage, 'config')).toBeNull()
    expect((await openReady(storage)).config.name).toBe('Ravenloft')
  })

  it('refuse de remplacer un fichier plus récent', async () => {
    const storage = managedFolder({ [LIBRARY_CONFIG_PATH]: serializeDocument({ ...config, schemaVersion: 99 }) })
    const before = await snapshot(storage)
    await expect(resetTracksLibraryFile(storage, 'config')).rejects.toThrow(/plus récente/)
    expect(await snapshot(storage)).toEqual(before)
  })

  it('refuse de remplacer un fichier lisible', async () => {
    await expect(resetTracksLibraryFile(managedFolder(), 'index')).rejects.toThrow()
  })
})

describe('saveTracksLibraryConfig / saveTracksLibraryIndex', () => {
  it('réécrit le fichier sans sauvegarde quand il était déjà au format courant', async () => {
    const storage = managedFolder()
    const library = await openReady(storage)
    await saveTracksLibraryConfig(library, { ...library.config, name: 'Nouveau nom' })
    expect((await openReady(storage)).config.name).toBe('Nouveau nom')
    expect(storage.paths().some(p => p.includes('sauvegardes'))).toBe(false)
  })

  it('sauvegarde l\'ancien fichier avant de réécrire un document migré', async () => {
    const storage = managedFolder()
    const original = await readText(storage, LIBRARY_INDEX_PATH)
    // Un index lu dans une version antérieure, puis migré en mémoire à l'ouverture.
    const library: TracksLibrary = { ...(await openReady(storage)), migratedFrom: { config: null, index: 0 } }

    const saved = await saveTracksLibraryIndex(library, { ...library.index, tracks: [] })

    const backups = storage.paths().filter(p => p.startsWith('.mjlib/sauvegardes/'))
    expect(backups).toHaveLength(1)
    expect(await readText(storage, backups[0])).toBe(original)
    expect(saved.migratedFrom.index).toBeNull()
    expect((await openReady(storage)).index.tracks).toEqual([])
  })
})

describe('backupFile', () => {
  it('n\'écrase jamais une sauvegarde existante', async () => {
    const storage = managedFolder()
    const now = new Date('2026-10-25T14:03:22.123Z')
    const first = await backupFile(storage, LIBRARY_CONFIG_PATH, now)
    const second = await backupFile(storage, LIBRARY_CONFIG_PATH, now)
    expect(first).toBe('.mjlib/sauvegardes/config.2026-10-25T14-03-22Z.json')
    expect(second).toBe('.mjlib/sauvegardes/config.2026-10-25T14-03-22Z-2.json')
  })
})
