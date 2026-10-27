import { describe, expect, it } from 'vitest'
import { formatBytes } from './formatBytes'

describe('formatBytes', () => {
  it.each([
    [0, '0 o'],
    [999, '999 o'],
    [1000, '1 Ko'],
    [12_345_678, '12,3 Mo'],
    [2_500_000_000, '2,5 Go'],
  ])('%s → %s', (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text)
  })
})
