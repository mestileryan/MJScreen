/**
 * Conversion entre la position d'un curseur de volume et l'amplitude à appliquer.
 *
 * `HTMLMediaElement.volume` est une amplitude linéaire, alors que l'oreille suit
 * la loi de Stevens : la sonie perçue varie comme l'amplitude élevée à 0,6. Un
 * curseur branché directement dessus paraît donc déjà presque à fond dès le
 * premier tiers, ce qui tasse tous les réglages en bas de course.
 *
 * L'amplitude reste la valeur enregistrée — c'est ce que réclame l'API audio, et
 * les bibliothèques existantes n'ont donc rien à migrer. Seule la position
 * affichée est convertie, si bien qu'un curseur à mi-course s'entend bien deux
 * fois moins fort qu'à fond.
 */
export const LOUDNESS_EXPONENT = 0.6

/** Position du curseur (0 à 1) vers l'amplitude à appliquer. */
export function gainForPosition(position: number): number {
  const clamped = Math.min(1, Math.max(0, position))
  return Math.pow(clamped, 1 / LOUDNESS_EXPONENT)
}

/** Amplitude enregistrée vers la position du curseur. */
export function positionForGain(gain: number): number {
  const clamped = Math.min(1, Math.max(0, gain))
  return Math.pow(clamped, LOUDNESS_EXPONENT)
}
