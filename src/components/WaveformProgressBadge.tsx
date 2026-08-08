'use client'

import { useLibrary } from '@/context/LibraryContext'

/**
 * Indicateur discret du calcul des formes d'onde manquantes.
 * Ne s'affiche que pendant le traitement et disparaît de lui-même à la fin.
 */
export default function WaveformProgressBadge() {
  const { waveformProgress } = useLibrary()
  if (!waveformProgress) return null

  const { done, total } = waveformProgress
  const percent = total > 0 ? Math.round((done / total) * 100) : 100

  return (
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-40 w-80
        bg-gray-800/95 border border-gray-700 rounded shadow-lg px-3 py-2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-baseline gap-3">
        <span className="flex-1 text-xs text-gray-300">
          Analyse des pistes en cours pour optimisation de lecture...
        </span>
        <span className="shrink-0 text-xs text-gray-500 tabular-nums">
          {done}/{total}
        </span>
      </div>
      {/* La lecture n'attend pas la fin de l'analyse : une piste lancée par
          l'utilisateur passe même devant la file de pré-calcul. */}
      <p className="mb-1.5 text-xs italic text-gray-500">Vous pouvez déjà lancer la musique</p>
      <div
        className="h-1 bg-gray-700 rounded overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div
          className="h-full bg-purple-500 transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
