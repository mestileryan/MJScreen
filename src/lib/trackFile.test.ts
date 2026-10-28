import { describe, expect, it } from 'vitest'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import { fileForTrack } from './trackFile'

const track = (path: string, name: string): IndexedTrack => ({ id: '1', path, name, tags: [], addedAt: '2026-10-01T00:00:00.000Z' })

describe('fileForTrack', () => {
  it('prend le nom affiché, garde l’extension et devine le type', async () => {
    const file = fileForTrack(track('pistes/Short suspense.mp3', 'Suspense court'), new Blob(['abc']))
    expect(file.name).toBe('Suspense court.mp3')
    expect(file.type).toBe('audio/mpeg')
    expect(await file.text()).toBe('abc')
  })

  it('garde le type du blob quand il est connu', () => {
    const file = fileForTrack(track('a.ogg', 'A'), new Blob(['x'], { type: 'audio/ogg; codecs=opus' }))
    expect(file.type).toBe('audio/ogg; codecs=opus')
  })
})
