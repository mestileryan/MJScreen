import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import {
  DB_AddCloudTracksSource,
  DB_AddLocalTracksSource,
  DB_GetTracksSources,
  DB_RemoveTracksSource,
  DB_SetDefaultTracksSource,
} from './TracksSourceService'

// Un vrai handle n'existe que dans le navigateur ; un objet clonable suffit
// à vérifier l'aller-retour dans IndexedDB.
const handle = (name: string) => ({ kind: 'directory', name }) as unknown as FileSystemDirectoryHandle

describe('TracksSourceService', () => {
  it('branche des sources, la première étant celle par défaut', async () => {
    expect(await DB_GetTracksSources()).toEqual([])
    const a = await DB_AddLocalTracksSource(handle('A'))
    const b = await DB_AddLocalTracksSource(handle('B'))
    expect(a.isDefault).toBe(true)
    expect(b.isDefault).toBe(false)
    expect((await DB_GetTracksSources()).map(s => [s.kind === 'local' && s.handle.name, s.isDefault])).toEqual([
      ['A', true],
      ['B', false],
    ])
  })

  it('branche un compte cloud comme n’importe quelle source', async () => {
    const c = await DB_AddCloudTracksSource('dropbox', { id: 'dbid:1', label: 'moi@exemple.fr' })
    expect(c).toMatchObject({ kind: 'dropbox', account: { id: 'dbid:1' }, isDefault: false })
    await DB_RemoveTracksSource(c.id)
    expect((await DB_GetTracksSources()).map(s => s.kind)).toEqual(['local', 'local'])
  })

  it('change de source par défaut, une seule à la fois', async () => {
    const [, b] = await DB_GetTracksSources()
    await DB_SetDefaultTracksSource(b.id)
    expect((await DB_GetTracksSources()).map(s => s.isDefault)).toEqual([false, true])
  })

  it('en débranchant la source par défaut, la plus ancienne restante prend le relais', async () => {
    const [a, b] = await DB_GetTracksSources()
    await DB_RemoveTracksSource(b.id)
    const remaining = await DB_GetTracksSources()
    expect(remaining.map(s => [s.id, s.isDefault])).toEqual([[a.id, true]])
  })
})
