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
  /**
   * Démarre dès l'ajout, même si l'autoplay global du lecteur est désactivé.
   * Posé par les enchaînements de playlist : la piste remplace une lecture en
   * cours, la faire attendre n'aurait pas de sens.
   */
  forceAutoPlay: boolean
  fileTrack: FileTrack
}

let nextTrackId = 0

export function createTrack(fileTrack: FileTrack, forceAutoPlay = false): Track {
  return {
    id: ++nextTrackId,
    src: URL.createObjectURL(fileTrack.file),
    volume: fileTrack.initialVolume,
    loop: fileTrack.loop,
    name: fileTrack.name,
    forceAutoPlay,
    fileTrack,
  }
}

/** Révoque l'URL Blob associée à cette piste. */
export function revokeTrackUrl(track: Track): void {
  URL.revokeObjectURL(track.src)
}
