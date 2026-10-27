import { describe, expect, it } from 'vitest'
import { bodyText, fakeFetch, json } from '@/test/fakeFetch'
import { isStorageError } from '../StorageProvider'
import { DropboxStorage } from './DropboxStorage'

const token = async () => 'TOKEN'

const file = (path: string, size: number) => ({ '.tag': 'file', name: path.split('/').pop(), path_display: path, size, server_modified: '2026-10-20T10:00:00Z' })
const folder = (path: string) => ({ '.tag': 'folder', name: path.split('/').pop(), path_display: path })

describe('DropboxStorage', () => {
  it('liste un dossier, en suivant la pagination, avec le jeton', async () => {
    const { fetchFn, calls } = fakeFetch({
      'POST https://api.dropboxapi.com/2/files/list_folder/continue': () => json({ entries: [file('/pistes/b.ogg', 2)], has_more: false }),
      'POST https://api.dropboxapi.com/2/files/list_folder': () =>
        json({ entries: [folder('/pistes'), file('/pistes/a.mp3', 1), { '.tag': 'deleted', name: 'x', path_display: '/x' }], cursor: 'c1', has_more: true }),
    })
    const storage = new DropboxStorage('moi@exemple.fr', token, fetchFn)

    const entries = await storage.list('', { recursive: true })

    expect(entries).toEqual([
      { path: 'pistes', name: 'pistes', kind: 'directory' },
      { path: 'pistes/a.mp3', name: 'a.mp3', kind: 'file', size: 1, lastModified: Date.parse('2026-10-20T10:00:00Z') },
      { path: 'pistes/b.ogg', name: 'b.ogg', kind: 'file', size: 2, lastModified: Date.parse('2026-10-20T10:00:00Z') },
    ])
    expect(calls[0].headers.Authorization).toBe('Bearer TOKEN')
    expect(JSON.parse(await bodyText(calls[0].body))).toEqual({ path: '', recursive: true, include_deleted: false })
  })

  it('traduit un chemin absent en null pour stat et en not-found pour read', async () => {
    const { fetchFn } = fakeFetch({
      'POST https://api.dropboxapi.com/2/files/get_metadata': () => json({ error_summary: 'path/not_found/..' }, { status: 409 }),
      'POST https://content.dropboxapi.com/2/files/download': () => new Response('{"error_summary":"path/not_found/"}', { status: 409 }),
    })
    const storage = new DropboxStorage('x', token, fetchFn)
    expect(await storage.stat('absent.mp3')).toBeNull()
    await expect(storage.read('absent.mp3')).rejects.toSatisfy(e => isStorageError(e, 'not-found'))
  })

  it('envoie un fichier en écrasant, avec un en-tête d’arguments ASCII', async () => {
    const { fetchFn, calls } = fakeFetch({ 'POST https://content.dropboxapi.com/2/files/upload': () => json({}) })
    const storage = new DropboxStorage('x', token, fetchFn)

    await storage.write('pistes/forêt.mp3', new Blob(['abc']))

    expect(calls[0].headers['Dropbox-API-Arg']).toBe('{"path":"/pistes/for\\u00eat.mp3","mode":"overwrite","mute":true}')
    expect(await bodyText(calls[0].body)).toBe('abc')
  })

  it('refuse de supprimer un dossier', async () => {
    const { fetchFn, calls } = fakeFetch({
      'POST https://api.dropboxapi.com/2/files/get_metadata': () => json(folder('/pistes')),
      'POST https://api.dropboxapi.com/2/files/delete_v2': () => json({}),
    })
    const storage = new DropboxStorage('x', token, fetchFn)
    await expect(storage.delete('pistes')).rejects.toSatisfy(e => isStorageError(e, 'type-mismatch'))
    expect(calls.some(c => c.url.endsWith('delete_v2'))).toBe(false)
  })

  it('lit le compte et l’espace', async () => {
    const { fetchFn } = fakeFetch({
      'POST https://api.dropboxapi.com/2/users/get_current_account': () => json({ account_id: 'dbid:1', email: 'moi@exemple.fr', name: { display_name: 'Moi' } }),
      'POST https://api.dropboxapi.com/2/users/get_space_usage': () => json({ used: 10, allocation: { '.tag': 'individual', allocated: 100 } }),
    })
    const storage = new DropboxStorage('x', token, fetchFn)
    expect(await storage.account()).toEqual({ id: 'dbid:1', label: 'moi@exemple.fr' })
    expect(await storage.quota()).toEqual({ used: 10, total: 100 })
  })
})
