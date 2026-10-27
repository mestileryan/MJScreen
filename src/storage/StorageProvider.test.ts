import { describe, expect, it } from 'vitest'
import { FakeDirectoryHandle } from '@/test/fakeFileSystem'
import { LocalFolderProvider } from './local/LocalFolderProvider'
import { MockCloudStorage } from './cloud/MockCloudStorage'
import { MemoryStorageProvider } from './MemoryStorageProvider'
import { isStorageError, readText, type StorageProvider } from './StorageProvider'

// Contrat commun : chaque fournisseur doit s'y plier, pour que le chargement de la
// bibliothèque se comporte de la même façon quel que soit le stockage.
const providers: [string, () => StorageProvider][] = [
  ['mémoire', () => new MemoryStorageProvider()],
  ['cloud simulé', () => new MockCloudStorage('dropbox')],
  ['dossier local', () => new LocalFolderProvider(new FakeDirectoryHandle('racine').asHandle())],
]

const sortByPath = <T extends { path: string }>(entries: T[]) => [...entries].sort((a, b) => a.path.localeCompare(b.path))

describe.each(providers)('StorageProvider (%s)', (_, create) => {
  it('écrit puis relit un fichier, en créant les dossiers parents', async () => {
    const storage = create()
    await storage.write('.mjlib/config.json', '{"a":1}')
    expect(await readText(storage, '.mjlib/config.json')).toBe('{"a":1}')
    expect(await storage.stat('.mjlib')).toMatchObject({ kind: 'directory', name: '.mjlib' })
  })

  it('remplace le contenu d\'un fichier existant', async () => {
    const storage = create()
    await storage.write('a.txt', 'premier contenu, plus long')
    await storage.write('a.txt', 'second')
    expect(await readText(storage, 'a.txt')).toBe('second')
  })

  it('écrit et relit un blob binaire, aussi en flux', async () => {
    const storage = create()
    const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x04])
    await storage.write('pistes/a.mp3', new Blob([bytes]))
    expect(new Uint8Array(await (await storage.read('pistes/a.mp3')).arrayBuffer())).toEqual(bytes)
    const reader = (await storage.readStream('pistes/a.mp3')).getReader()
    const { value } = await reader.read()
    expect(value?.slice(0, 3)).toEqual(bytes.slice(0, 3))
  })

  it('décrit fichiers et dossiers avec stat', async () => {
    const storage = create()
    await storage.write('pistes/a.mp3', '1234')
    expect(await storage.stat('pistes/a.mp3')).toMatchObject({ kind: 'file', name: 'a.mp3', size: 4 })
    expect(await storage.stat('')).toMatchObject({ kind: 'directory', path: '' })
    expect(await storage.stat('absent.mp3')).toBeNull()
    expect(await storage.stat('pistes/a.mp3/dessous')).toBeNull()
  })

  it('liste un dossier, avec ou sans ses sous-dossiers', async () => {
    const storage = create()
    await storage.write('racine.mp3', 'x')
    await storage.write('pistes/a.mp3', 'x')
    await storage.write('pistes/ambiances/b.ogg', 'x')

    const top = sortByPath(await storage.list(''))
    expect(top.map(e => [e.path, e.kind])).toEqual([
      ['pistes', 'directory'],
      ['racine.mp3', 'file'],
    ])

    const all = sortByPath(await storage.list('', { recursive: true }))
    expect(all.map(e => e.path)).toEqual(['pistes', 'pistes/a.mp3', 'pistes/ambiances', 'pistes/ambiances/b.ogg', 'racine.mp3'])

    const sub = await storage.list('pistes/ambiances')
    expect(sub).toEqual([expect.objectContaining({ path: 'pistes/ambiances/b.ogg', name: 'b.ogg', kind: 'file', size: 1 })])
  })

  it('lève not-found pour un fichier ou un dossier absent', async () => {
    const storage = create()
    await expect(storage.read('absent.json')).rejects.toSatisfy(e => isStorageError(e, 'not-found'))
    await expect(storage.list('absent')).rejects.toSatisfy(e => isStorageError(e, 'not-found'))
    await expect(storage.delete('absent.json')).rejects.toSatisfy(e => isStorageError(e, 'not-found'))
  })

  it('supprime un fichier mais jamais un dossier', async () => {
    const storage = create()
    await storage.write('pistes/a.mp3', 'x')
    await expect(storage.delete('pistes')).rejects.toSatisfy(e => isStorageError(e, 'type-mismatch'))
    await storage.delete('pistes/a.mp3')
    expect(await storage.stat('pistes/a.mp3')).toBeNull()
  })

  it('refuse les chemins qui sortent de la racine', async () => {
    const storage = create()
    await expect(storage.write('../evasion.txt', 'x')).rejects.toThrow()
  })
})

describe('LocalFolderProvider', () => {
  it('porte le nom du dossier choisi', () => {
    expect(new LocalFolderProvider(new FakeDirectoryHandle('Musiques JdR').asHandle()).label).toBe('Musiques JdR')
  })

  it('lit une arborescence existante', async () => {
    const root = new FakeDirectoryHandle('racine').addFile('.mjlib/config.json', '{}').addFile('ambiance.mp3', 'abc')
    const storage = new LocalFolderProvider(root.asHandle())
    expect(await readText(storage, '.mjlib/config.json')).toBe('{}')
    expect((await storage.list('')).map(e => e.name).sort()).toEqual(['.mjlib', 'ambiance.mp3'])
  })

  it('traduit un refus d\'accès en permission-denied', async () => {
    const root = new FakeDirectoryHandle('racine').addFile('a.txt', 'x')
    root.permission.state = 'prompt'
    const storage = new LocalFolderProvider(root.asHandle())
    await expect(storage.write('b.txt', 'x')).rejects.toSatisfy(e => isStorageError(e, 'permission-denied'))
  })

  it('laisse l\'ancien contenu intact si l\'écriture échoue', async () => {
    const root = new FakeDirectoryHandle('racine').addFile('a.txt', 'ancien')
    root.permission.failWrites = true
    const storage = new LocalFolderProvider(root.asHandle())
    await expect(storage.write('a.txt', 'nouveau')).rejects.toSatisfy(e => isStorageError(e, 'unknown'))
    expect(await readText(storage, 'a.txt')).toBe('ancien')
  })
})
