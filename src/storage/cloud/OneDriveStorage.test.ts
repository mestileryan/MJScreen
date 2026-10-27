import { describe, expect, it } from 'vitest'
import { bodyText, fakeFetch, json } from '@/test/fakeFetch'
import { isStorageError } from '../StorageProvider'
import { OneDriveStorage } from './OneDriveStorage'

const token = async () => 'TOKEN'
const ROOT = 'https://graph.microsoft.com/v1.0/me/drive/special/approot'

function oneDrive() {
  return fakeFetch({
    [`GET ${ROOT}/children`]: () => json({ value: [{ name: 'pistes', folder: {} }] }),
    [`GET ${ROOT}:/pistes:/children`]: () =>
      json({ value: [{ name: 'a.mp3', size: 3, lastModifiedDateTime: '2026-10-20T10:00:00Z', file: {} }], '@odata.nextLink': `${ROOT}:/pistes:/children?page=2` }),
    [`GET ${ROOT}:/pistes:/children?page=2`]: () => json({ value: [{ name: 'b.ogg', size: 4, file: {} }] }),
    [`GET ${ROOT}:/pistes:?`]: () => json({ name: 'pistes', folder: {} }),
    [`GET ${ROOT}:/pistes/a.mp3:/content`]: () => new Response('abc'),
    [`GET ${ROOT}:/pistes/a.mp3:?`]: () => json({ name: 'a.mp3', size: 3, file: {} }),
    [`GET ${ROOT}:/pistes/absent.mp3:?`]: () => new Response('', { status: 404 }),
    [`PUT ${ROOT}:/pistes/petit.mp3:/content`]: () => json({}),
    [`POST ${ROOT}:/gros/enorme.mp3:/createUploadSession`]: () => json({ uploadUrl: 'https://upload.example/session' }),
    [`POST ${ROOT}/children`]: () => new Response('', { status: 409 }),
    [`POST ${ROOT}:/gros:/children`]: () => json({}),
    'PUT https://upload.example/session': () => json({}),
    [`DELETE ${ROOT}:/pistes/a.mp3:`]: () => new Response(null, { status: 204 }),
    'GET https://graph.microsoft.com/v1.0/me?': () => json({ id: 'u1', displayName: 'Moi', mail: 'moi@outlook.com' }),
    'GET https://graph.microsoft.com/v1.0/me/drive?': () => json({ quota: { used: 10, total: 100 } }),
  })
}

describe('OneDriveStorage', () => {
  it('liste récursivement en suivant la pagination', async () => {
    const { fetchFn } = oneDrive()
    const storage = new OneDriveStorage('moi@outlook.com', token, fetchFn)
    expect(await storage.list('', { recursive: true })).toEqual([
      { path: 'pistes', name: 'pistes', kind: 'directory' },
      { path: 'pistes/a.mp3', name: 'a.mp3', kind: 'file', size: 3, lastModified: Date.parse('2026-10-20T10:00:00Z') },
      { path: 'pistes/b.ogg', name: 'b.ogg', kind: 'file', size: 4, lastModified: undefined },
    ])
  })

  it('lit, décrit et signale un fichier absent', async () => {
    const { fetchFn } = oneDrive()
    const storage = new OneDriveStorage('x', token, fetchFn)
    expect(await (await storage.read('pistes/a.mp3')).text()).toBe('abc')
    expect(await storage.stat('pistes/a.mp3')).toMatchObject({ kind: 'file', size: 3 })
    expect(await storage.stat('pistes/absent.mp3')).toBeNull()
  })

  it('envoie un petit fichier d’un coup, après s’être assuré du dossier', async () => {
    const { fetchFn, calls } = oneDrive()
    const storage = new OneDriveStorage('x', token, fetchFn)
    await storage.write('pistes/petit.mp3', new Blob(['abc']))
    const mkdir = calls.find(c => c.method === 'POST' && c.url === `${ROOT}/children`)!
    expect(JSON.parse(await bodyText(mkdir.body))).toMatchObject({ name: 'pistes', folder: {} })
    const put = calls.find(c => c.method === 'PUT')!
    expect(put.url).toBe(`${ROOT}:/pistes/petit.mp3:/content`)
    expect(await bodyText(put.body)).toBe('abc')
  })

  it('envoie un gros fichier par morceaux dans une session', async () => {
    const { fetchFn, calls } = oneDrive()
    const storage = new OneDriveStorage('x', token, fetchFn)
    const big = new Blob([new Uint8Array(5 * 1024 * 1024)])
    await storage.write('gros/enorme.mp3', big)
    const chunks = calls.filter(c => c.url === 'https://upload.example/session')
    expect(chunks).toHaveLength(1)
    expect(chunks[0].headers['Content-Range']).toBe(`bytes 0-${big.size - 1}/${big.size}`)
    expect(chunks[0].headers.Authorization).toBeUndefined()
  })

  it('supprime un fichier et refuse un dossier', async () => {
    const { fetchFn, calls } = oneDrive()
    const storage = new OneDriveStorage('x', token, fetchFn)
    await storage.delete('pistes/a.mp3')
    expect(calls.some(c => c.method === 'DELETE')).toBe(true)
    await expect(storage.delete('pistes')).rejects.toSatisfy(e => isStorageError(e, 'type-mismatch'))
  })

  it('lit le compte et l’espace', async () => {
    const { fetchFn } = oneDrive()
    const storage = new OneDriveStorage('x', token, fetchFn)
    expect(await storage.account()).toEqual({ id: 'u1', label: 'moi@outlook.com' })
    expect(await storage.quota()).toEqual({ used: 10, total: 100 })
  })
})
