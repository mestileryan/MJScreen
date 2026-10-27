import { describe, expect, it } from 'vitest'
import { sha256Hex } from './fileHash'

describe('sha256Hex', () => {
  it('calcule l’empreinte SHA-256 connue d’un contenu', async () => {
    expect(await sha256Hex(new Blob(['abc']))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  })

  it('ne dépend que du contenu', async () => {
    const a = await sha256Hex(new File(['même contenu'], 'a.mp3'))
    const b = await sha256Hex(new File(['même contenu'], 'b.mp3'))
    const c = await sha256Hex(new File(['autre contenu'], 'a.mp3'))
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
