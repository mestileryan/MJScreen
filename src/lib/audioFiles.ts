/** Extensions reconnues comme audio : celles que les navigateurs savent lire. */
export const AUDIO_EXTENSIONS = ['mp3', 'ogg', 'oga', 'opus', 'wav', 'flac', 'm4a', 'aac', 'webm', 'weba'] as const

const extensions = new Set<string>(AUDIO_EXTENSIONS)

export function isAudioPath(path: string): boolean {
  const dot = path.lastIndexOf('.')
  return dot >= 0 && extensions.has(path.slice(dot + 1).toLowerCase())
}
