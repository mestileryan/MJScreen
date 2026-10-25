import { describe, expect, it } from 'vitest'
import { baseName, isSafeRelativePath, joinPath, normalizePath, parentPath, pathSegments } from './storagePath'

describe('paths', () => {
  it('normalise les séparateurs et les segments vides', () => {
    expect(normalizePath('/pistes\\ambiances//forêt.mp3')).toBe('pistes/ambiances/forêt.mp3')
    expect(normalizePath('./a/./b/')).toBe('a/b')
    expect(normalizePath('')).toBe('')
  })

  it('refuse de sortir de la racine', () => {
    expect(() => normalizePath('pistes/../../secret')).toThrow()
    expect(isSafeRelativePath('../a')).toBe(false)
    expect(isSafeRelativePath('/a')).toBe(false)
    expect(isSafeRelativePath('a/b.mp3')).toBe(true)
  })

  it('découpe et recompose les chemins', () => {
    expect(joinPath('.mjlib', 'config.json')).toBe('.mjlib/config.json')
    expect(joinPath('', 'a')).toBe('a')
    expect(pathSegments('')).toEqual([])
    expect(baseName('pistes/combat.ogg')).toBe('combat.ogg')
    expect(parentPath('pistes/combat.ogg')).toBe('pistes')
    expect(parentPath('combat.ogg')).toBe('')
  })
})
