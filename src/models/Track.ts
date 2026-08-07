import type FileTrack from './FileTrack'

/**
 * Entrée de la file de lecture. Chaque entrée possède son propre object URL :
 * une même piste peut être ajoutée plusieurs fois et retirée indépendamment.
 */
export default interface Track {
  id: number
  src: string
  volume: number
  loop: boolean
  name: string
  fileTrack: FileTrack
}

let nextTrackId = 0

export function createTrack(fileTrack: FileTrack): Track {
  return {
    id: ++nextTrackId,
    src: URL.createObjectURL(fileTrack.file),
    volume: fileTrack.initialVolume,
    loop: fileTrack.loop,
    name: fileTrack.name,
    fileTrack,
  }
}

/** Révoque l'URL Blob associée à cette piste. */
export function revokeTrackUrl(track: Track): void {
  URL.revokeObjectURL(track.src)
}
