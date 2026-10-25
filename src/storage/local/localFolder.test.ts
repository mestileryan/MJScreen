import { describe, expect, it } from 'vitest'
import { FakeDirectoryHandle } from '@/test/fakeFileSystem'
import { isLocalFolderSupported, queryFolderPermission, requestFolderPermission } from './localFolder'

describe('localFolder', () => {
  it('n\'est pas pris en charge hors d\'un navigateur Chromium', () => {
    expect(isLocalFolderSupported()).toBe(false)
  })

  it('consulte la permission sans la demander', async () => {
    const root = new FakeDirectoryHandle('racine')
    root.permission.state = 'prompt'
    expect(await queryFolderPermission(root.asHandle())).toBe('prompt')
    expect(root.permission.state).toBe('prompt')
  })

  it('demande la permission quand elle n\'est plus accordée', async () => {
    const root = new FakeDirectoryHandle('racine')
    root.permission.state = 'prompt'
    expect(await requestFolderPermission(root.asHandle())).toBe('granted')
  })

  it('rapporte le refus de l\'utilisateur', async () => {
    const root = new FakeDirectoryHandle('racine')
    root.permission.state = 'prompt'
    root.permission.answer = 'denied'
    expect(await requestFolderPermission(root.asHandle())).toBe('denied')
  })

  it('considère comme accordé un handle sans gestion de permission', async () => {
    const handle = { kind: 'directory', name: 'racine' } as FileSystemHandle
    expect(await queryFolderPermission(handle)).toBe('granted')
    expect(await requestFolderPermission(handle)).toBe('granted')
  })
})
