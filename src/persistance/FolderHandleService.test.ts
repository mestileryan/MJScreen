import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  DB_ClearTracksLibraryHandle,
  DB_GetTracksLibraryHandle,
  DB_SetTracksLibraryHandle,
} from './FolderHandleService'

describe('FolderHandleService', () => {
  it('conserve puis oublie le handle du dossier', async () => {
    // Un vrai handle n'existe que dans le navigateur ; un objet clonable suffit
    // à vérifier l'aller-retour dans IndexedDB.
    const handle = { kind: 'directory', name: 'Musiques JdR' } as unknown as FileSystemDirectoryHandle

    expect(await DB_GetTracksLibraryHandle()).toBeUndefined()
    await DB_SetTracksLibraryHandle(handle)
    expect(await DB_GetTracksLibraryHandle()).toEqual(handle)
    await DB_ClearTracksLibraryHandle()
    expect(await DB_GetTracksLibraryHandle()).toBeUndefined()
  })
})
