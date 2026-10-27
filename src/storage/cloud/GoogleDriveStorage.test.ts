import { describe, expect, it } from 'vitest'
import { bodyText, fakeFetch, json, type RecordedCall } from '@/test/fakeFetch'
import { isStorageError } from '../StorageProvider'
import { GoogleDriveStorage } from './GoogleDriveStorage'

const token = async () => 'TOKEN'
const FOLDER = 'application/vnd.google-apps.folder'
const q = (call: RecordedCall) => decodeURIComponent(new URL(call.url).searchParams.get('q') ?? '')

/** Un petit Drive : le dossier MJScreen à la racine, un sous-dossier pistes, un fichier dedans. */
function drive() {
  return fakeFetch({
    'GET https://www.googleapis.com/drive/v3/files?q=': call => {
      const query = q(call)
      if (query.includes("'root' in parents") && query.includes("name = 'MJScreen'")) return json({ files: [{ id: 'ROOT', name: 'MJScreen', mimeType: FOLDER }] })
      if (query.includes("'ROOT' in parents") && query.includes("name = 'pistes'")) return json({ files: [{ id: 'DIR', name: 'pistes', mimeType: FOLDER }] })
      if (query.includes("'ROOT' in parents")) return json({ files: [{ id: 'DIR', name: 'pistes', mimeType: FOLDER }] })
      if (query.includes("'DIR' in parents") && query.includes("name = 'a.mp3'")) return json({ files: [{ id: 'A', name: 'a.mp3', mimeType: 'audio/mpeg', size: '3', modifiedTime: '2026-10-20T10:00:00Z' }] })
      if (query.includes("'DIR' in parents") && query.includes('name =')) return json({ files: [] })
      if (query.includes("'DIR' in parents")) return json({ files: [{ id: 'A', name: 'a.mp3', mimeType: 'audio/mpeg', size: '3', modifiedTime: '2026-10-20T10:00:00Z' }] })
      return json({ files: [] })
    },
    'GET https://www.googleapis.com/drive/v3/files/A?alt=media': () => new Response('abc'),
    'GET https://www.googleapis.com/drive/v3/files/A': () => json({ id: 'A', name: 'a.mp3', mimeType: 'audio/mpeg', size: '3', modifiedTime: '2026-10-20T10:00:00Z' }),
    'GET https://www.googleapis.com/drive/v3/files/DIR': () => json({ id: 'DIR', name: 'pistes', mimeType: FOLDER }),
    'POST https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable': () => new Response(null, { status: 200, headers: { Location: 'https://upload.example/session' } }),
    'PATCH https://www.googleapis.com/upload/drive/v3/files/A?uploadType=resumable': () => new Response(null, { status: 200, headers: { Location: 'https://upload.example/session' } }),
    'PUT https://upload.example/session': () => json({ id: 'NEW', name: 'b.mp3', mimeType: 'audio/mpeg' }),
    'DELETE https://www.googleapis.com/drive/v3/files/A': () => new Response(null, { status: 204 }),
    'GET https://www.googleapis.com/drive/v3/about?fields=user': () => json({ user: { permissionId: 'p1', emailAddress: 'moi@gmail.com', displayName: 'Moi' } }),
    'GET https://www.googleapis.com/drive/v3/about?fields=storageQuota': () => json({ storageQuota: { limit: '100', usage: '10' } }),
  })
}

describe('GoogleDriveStorage', () => {
  it('résout les chemins en identifiants et liste récursivement', async () => {
    const { fetchFn } = drive()
    const storage = new GoogleDriveStorage('moi@gmail.com', token, fetchFn)
    expect(await storage.list('', { recursive: true })).toEqual([
      { path: 'pistes', name: 'pistes', kind: 'directory' },
      { path: 'pistes/a.mp3', name: 'a.mp3', kind: 'file', size: 3, lastModified: Date.parse('2026-10-20T10:00:00Z') },
    ])
    expect(await storage.stat('pistes/a.mp3')).toMatchObject({ kind: 'file', size: 3 })
    expect(await storage.stat('pistes/absent.mp3')).toBeNull()
    expect(await (await storage.read('pistes/a.mp3')).text()).toBe('abc')
  })

  it('crée un nouveau fichier par une session d’envoi dans le bon dossier', async () => {
    const { fetchFn, calls } = drive()
    const storage = new GoogleDriveStorage('x', token, fetchFn)

    await storage.write('pistes/b.mp3', new Blob(['nouveau']))

    const open = calls.find(c => c.url.includes('uploadType=resumable'))!
    expect(open.method).toBe('POST')
    expect(JSON.parse(await bodyText(open.body))).toEqual({ name: 'b.mp3', parents: ['DIR'] })
    const put = calls.find(c => c.url === 'https://upload.example/session')!
    expect(await bodyText(put.body)).toBe('nouveau')
  })

  it('remplace un fichier existant sans en recréer un', async () => {
    const { fetchFn, calls } = drive()
    const storage = new GoogleDriveStorage('x', token, fetchFn)
    await storage.write('pistes/a.mp3', 'v2')
    expect(calls.find(c => c.url.includes('uploadType=resumable'))?.method).toBe('PATCH')
  })

  it('supprime un fichier et refuse un dossier', async () => {
    const { fetchFn, calls } = drive()
    const storage = new GoogleDriveStorage('x', token, fetchFn)
    await storage.delete('pistes/a.mp3')
    expect(calls.some(c => c.method === 'DELETE' && c.url.endsWith('/files/A'))).toBe(true)
    await expect(storage.delete('pistes')).rejects.toSatisfy(e => isStorageError(e, 'type-mismatch'))
  })

  it('lit le compte et l’espace', async () => {
    const { fetchFn } = drive()
    const storage = new GoogleDriveStorage('x', token, fetchFn)
    expect(await storage.account()).toEqual({ id: 'p1', label: 'moi@gmail.com' })
    expect(await storage.quota()).toEqual({ used: 10, total: 100 })
  })
})
