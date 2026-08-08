/**
 * Fonctions pures de la forme d'onde : extraction de crêtes, ré-échantillonnage et
 * quantification. Aucune dépendance navigateur ni persistance — testables telles quelles.
 */

/**
 * Réduit le buffer décodé à au plus `columns` crêtes normalisées.
 *
 * Les bornes de blocs sont fractionnaires (i * length / columns) : chaque échantillon
 * est couvert, y compris la fin de piste — un blockSize entier tronquerait jusqu'à
 * `columns - 1` échantillons en queue, très visible sur les clips courts décodés à
 * 8 kHz. Si la piste compte moins d'échantillons que `columns`, on produit moins de
 * colonnes plutôt que des colonnes vides ; `resample` ré-étire à l'affichage.
 */
export function extractPeaks(
  buffer: Pick<AudioBuffer, 'getChannelData'>,
  columns: number,
): number[] {
  const channel = buffer.getChannelData(0)
  const length = channel.length
  const effectiveColumns = Math.max(1, Math.min(columns, length))
  const peaks: number[] = []
  let max = 0

  for (let i = 0; i < effectiveColumns; i++) {
    const start = Math.floor((i * length) / effectiveColumns)
    const end = Math.max(start + 1, Math.floor(((i + 1) * length) / effectiveColumns))
    let peak = 0
    for (let j = start; j < end; j++) {
      const value = Math.abs(channel[j])
      if (value > peak) peak = value
    }
    peaks.push(peak)
    if (peak > max) max = peak
  }

  // Normalisation pour occuper toute la hauteur disponible
  return max > 0 ? peaks.map(peak => peak / max) : peaks
}

/** Ramène les crêtes mémorisées au nombre de colonnes du canvas. */
export function resample(peaks: number[], columns: number): number[] {
  if (peaks.length === columns) return peaks

  // Arithmétique entière exacte (comme extractPeaks) : un ratio flottant précalculé
  // peut arrondir la borne finale juste sous peaks.length et perdre la dernière crête.
  const result: number[] = []
  for (let i = 0; i < columns; i++) {
    const start = Math.floor((i * peaks.length) / columns)
    const end = Math.max(start + 1, Math.floor(((i + 1) * peaks.length) / columns))
    let peak = 0
    for (let j = start; j < end && j < peaks.length; j++) {
      if (peaks[j] > peak) peak = peaks[j]
    }
    result.push(peak)
  }
  return result
}

/**
 * Quantifie les crêtes normalisées sur 8 bits pour la persistance : 2048 crêtes
 * tiennent en 2 Ko, et 1/255 de résolution est invisible sur un canvas de 25 px.
 */
export function quantizePeaks(peaks: number[]): Uint8Array {
  const bytes = new Uint8Array(peaks.length)
  for (let i = 0; i < peaks.length; i++) {
    bytes[i] = Math.round(Math.min(1, Math.max(0, peaks[i])) * 255)
  }
  return bytes
}

export function dequantizePeaks(bytes: Uint8Array): number[] {
  return Array.from(bytes, byte => byte / 255)
}
