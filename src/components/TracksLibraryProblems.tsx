'use client'

import { FileWarning } from 'lucide-react'
import { useState } from 'react'
import type { FileProblem, TracksLibraryFile } from '@/persistance/TracksLibraryService'
import { ActionButton, Panel, TechnicalDetails } from './TracksLibraryUi'

/** Comment on nomme chaque fichier pour l’utilisateur, et ce qu’on perd en le recréant. */
const FILES: Record<TracksLibraryFile, { label: string; path: string; lossOnReset: string }> = {
  config: {
    label: 'Les réglages de la bibliothèque',
    path: '.mjlib/config.json',
    lossOnReset: 'Les réglages repartiront de zéro.',
  },
  index: {
    label: 'La liste des pistes',
    path: '.mjlib/index.json',
    lossOnReset: 'Les noms et mots-clés donnés aux pistes seront perdus (les fichiers audio, eux, restent).',
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
  folderName: string
  problems: FileProblem[]
  onReset: (file: TracksLibraryFile) => void
  onReload: () => void
  onChange: () => void
}

/** `.mjlib/` est présent mais inutilisable en l’état : on explique, et on ne répare que sur demande. */
export default function TracksLibraryProblems({
  folderName,
  problems,
  onReset,
  onReload,
  onChange,
}: TracksLibraryProblemsProps) {
  const [confirming, setConfirming] = useState<TracksLibraryFile | null>(null)

  return (
    <Panel title={`${folderName} : bibliothèque illisible`} icon={<FileWarning className="h-5 w-5 text-red-400" />}>
      <ul className="space-y-3">
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
      <div className="flex flex-wrap gap-2">
        <ActionButton tone="primary" onClick={onReload}>
          Réessayer
        </ActionButton>
        <ActionButton onClick={onChange}>Changer d’emplacement</ActionButton>
      </div>
    </Panel>
  )
}
