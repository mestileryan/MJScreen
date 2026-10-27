'use client'

import { useState } from 'react'
import type { FileProblem, TracksLibraryFile } from '@/persistance/TracksLibraryService'
import { ActionButton, TechnicalDetails } from './TracksLibraryUi'

/** Comment on nomme chaque fichier pour l’utilisateur, et ce qu’on perd en le recréant. */
const FILES: Record<TracksLibraryFile, { label: string; path: string; lossOnReset: string }> = {
  config: {
    label: 'Les réglages de la source',
    path: '.mjlib/config.json',
    lossOnReset: 'Les réglages repartiront de zéro.',
  },
  index: {
    label: 'La liste des pistes',
    path: '.mjlib/index.json',
    lossOnReset: 'Les noms et étiquettes donnés aux pistes seront perdus (les fichiers audio, eux, restent).',
  },
}

function describe(problem: FileProblem): { text: string; details?: string } {
  const { label, path } = FILES[problem.file]
  switch (problem.kind) {
    case 'missing':
      return { text: `${label} : fichier absent.`, details: `${path} est introuvable.` }
    case 'invalid':
      return { text: `${label} : fichier abîmé, impossible de le lire.`, details: problem.reason }
    case 'too-new':
      return {
        text: `${label} : enregistré par une version plus récente de MJScreen. Mettez MJScreen à jour.`,
        details: `${path} est au format v${problem.version} ; cette version lit jusqu’au format v${problem.supported}.`,
      }
  }
}

interface TracksLibraryProblemsProps {
  problems: FileProblem[]
  onReset: (file: TracksLibraryFile) => void
  onReload: () => void
}

/** `.mjlib/` est présent mais inutilisable en l’état : on explique, et on ne répare que sur demande. */
export default function TracksLibraryProblems({ problems, onReset, onReload }: TracksLibraryProblemsProps) {
  const [confirming, setConfirming] = useState<TracksLibraryFile | null>(null)

  return (
    <div className="space-y-3 text-sm text-gray-300">
      <ul className="space-y-2">
        {problems.map(problem => {
          const { text, details } = describe(problem)
          const repairable = problem.kind !== 'too-new'
          return (
            <li key={problem.file} className="space-y-2 rounded bg-gray-900/60 p-3">
              <p>{text}</p>
              <TechnicalDetails>{details}</TechnicalDetails>
              {repairable &&
                (confirming === problem.file ? (
                  <div className="space-y-2">
                    <p className="text-red-300">
                      {FILES[problem.file].lossOnReset}
                      {problem.kind === 'invalid' && ' L’ancien fichier est conservé.'}
                    </p>
                    <div className="flex gap-2">
                      <ActionButton tone="danger" onClick={() => onReset(problem.file)}>
                        Réparer
                      </ActionButton>
                      <ActionButton onClick={() => setConfirming(null)}>Annuler</ActionButton>
                    </div>
                  </div>
                ) : (
                  <ActionButton onClick={() => setConfirming(problem.file)}>Réparer</ActionButton>
                ))}
            </li>
          )
        })}
      </ul>
      <ActionButton tone="primary" onClick={onReload}>
        Réessayer
      </ActionButton>
    </div>
  )
}
