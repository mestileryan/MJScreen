import { describe, expect, it } from 'vitest'
import { formatDuration } from './audioDuration'

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [7.4, '0:07'],
    [187, '3:07'],
    [3599.6, '1:00:00'],
    [3750, '1:02:30'],
  ])('%s s → %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })
})
