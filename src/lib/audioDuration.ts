/**
 * Durée d’un fichier audio, en secondes, lue par le décodeur du navigateur.
 * Seules les métadonnées sont chargées, et l’object URL est révoqué aussitôt :
 * rien du fichier ne reste en mémoire. `null` si le navigateur ne sait pas le lire.
 */
export function readAudioDuration(blob: Blob): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'metadata'
    const done = (duration: number | null) => {
      audio.onloadedmetadata = null
      audio.onerror = null
      audio.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(duration)
    }
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? audio.duration : null)
    audio.onerror = () => done(null)
    audio.src = url
  })
}

/** `3:07`, ou `1:02:30` au-delà d’une heure. */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}
