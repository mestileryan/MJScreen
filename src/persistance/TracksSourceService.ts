import type { CloudAccount, CloudKind } from '@/storage/cloud/CloudStorage'
import { tracksSourceDB, type TracksSourceDB } from './TracksSourcePersistance'

export type StoredTracksSource = TracksSourceDB & { id: number }

/** Sources dans l’ordre où elles ont été branchées. */
export async function DB_GetTracksSources(): Promise<StoredTracksSource[]> {
  const sources = await tracksSourceDB().sources.orderBy('id').toArray()
  return sources as StoredTracksSource[]
}

/** La première source branchée devient la source par défaut. */
type NewSource = { kind: 'local'; handle: FileSystemDirectoryHandle } | { kind: CloudKind; account: CloudAccount }

async function addSource(source: NewSource): Promise<StoredTracksSource> {
  const db = tracksSourceDB()
  return db.transaction('rw', db.sources, async () => {
    const isDefault = (await db.sources.count()) === 0
    const row = { ...source, isDefault, addedAt: Date.now() } as TracksSourceDB
    const id = await db.sources.add(row)
    return { ...row, id }
  })
}

export function DB_AddLocalTracksSource(handle: FileSystemDirectoryHandle): Promise<StoredTracksSource> {
  return addSource({ kind: 'local', handle })
}

export function DB_AddCloudTracksSource(kind: CloudKind, account: CloudAccount): Promise<StoredTracksSource> {
  return addSource({ kind, account })
}

/** Débranche une source. Si c’était la source par défaut, la plus ancienne restante prend le relais. */
export async function DB_RemoveTracksSource(id: number): Promise<void> {
  const db = tracksSourceDB()
  await db.transaction('rw', db.sources, async () => {
    const removed = await db.sources.get(id)
    await db.sources.delete(id)
    if (removed?.isDefault) {
      const next = await db.sources.orderBy('id').first()
      if (next?.id !== undefined) await db.sources.update(next.id, { isDefault: true })
    }
  })
}

export async function DB_SetDefaultTracksSource(id: number): Promise<void> {
  const db = tracksSourceDB()
  await db.transaction('rw', db.sources, async () => {
    await db.sources.toCollection().modify({ isDefault: false })
    await db.sources.update(id, { isDefault: true })
  })
}
