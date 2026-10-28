import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import { baseName } from './storagePath'

const MIME_BY_EXTENSION: Record<string, string> = {
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  webm: 'audio/webm',
  weba: 'audio/webm',
}

/**
 * Le fichier à donner au jukebox pour une piste de la bibliothèque : le contenu
 * lu dans la source, sous le nom affiché (le jukebox en fait le nom de la piste),
 * avec l’extension et le type MIME du fichier d’origine.
 */
export function fileForTrack(track: IndexedTrack, blob: Blob): File {
  const original = baseName(track.path)
  const dot = original.lastIndexOf('.')
  const extension = dot > 0 ? original.slice(dot) : ''
  const type = blob.type || MIME_BY_EXTENSION[extension.slice(1).toLowerCase()] || 'audio/mpeg'
  return new File([blob], `${track.name}${extension}`, { type, lastModified: track.lastModified })
}
