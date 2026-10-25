'use client'

import { FileWarning } from 'lucide-react'
import { useState } from 'react'
import type { FileProblem, TracksLibraryFile } from '@/persistance/TracksLibraryService'
import { ActionButton, Panel } from './TracksLibraryUi'

const FILE_NAMES: Record<TracksLibraryFile, string> = {
  config: '.mjlib/config.json',
  index: '.mjlib/index.json',
}

/** Ce que l’on perd en recréant le fichier : à dire avant que l’utilisateur confirme. */
const RESET_CONSEQUENCES: Record<TracksLibraryFile, string> = {
  config: 'La configuration repartira des valeurs par défaut.',
  index: 'Le nouvel index sera vide : les noms et tags des pistes ne seront plus associés.',
}

function describe(problem: FileProblem): string {
  switch (problem.kind) {
    case 'missing':
      return 'Le fichier est absent.'
    case 'invalid':
      return problem.reason
    case 'too-new':
      return `Ce fichier a été écrit par une version plus récente de MJScreen (schéma v${problem.version}, cette version lit jusqu’à la v${problem.supported}). Mettez l’application à jour : le fichier ne sera pas modifié.`
  }
}

interface TracksLibraryProblemsProps {
  folderName: string
  problems: FileProblem[]
  onReset: (file: TracksLibraryFile) => void
  onReload: () => void
  onPick: () => void
}

/** `.mjlib/` est présent mais inutilisable en l’état : on explique, et on ne répare que sur demande. */
export default function TracksLibraryProblems({ folderName, problems, onReset, onReload, onPick }: TracksLibraryProblemsProps) {
  const [confirming, setConfirming] = useState<TracksLibraryFile | null>(null)

  return (
    <Panel title={`La bibliothèque « ${folderName} » ne peut pas être ouverte`} icon={<FileWarning className="h-5 w-5 text-red-400" />}>
      <ul className="space-y-3">
        {problems.map(problem => (
          <li key={problem.file} className="rounded bg-gray-900/60 p-3">
            <p className="font-mono text-purple-300">{FILE_NAMES[problem.file]}</p>
            <p className="mt-1">{describe(problem)}</p>
            {problem.kind !== 'too-new' &&
              (confirming === problem.file ? (
                <div className="mt-2 space-y-2">
                  <p className="text-red-300">
                    {RESET_CONSEQUENCES[problem.file]}
                    {problem.kind === 'invalid' && ' L’ancien fichier sera d’abord copié dans .mjlib/sauvegardes/.'}
                  </p>
                  <div className="flex gap-2">
                    <ActionButton tone="danger" onClick={() => onReset(problem.file)}>
                      Confirmer
                    </ActionButton>
                    <ActionButton onClick={() => setConfirming(null)}>Annuler</ActionButton>
                  </div>
                </div>
              ) : (
                <ActionButton className="mt-2" onClick={() => setConfirming(problem.file)}>
                  {problem.kind === 'missing' ? 'Recréer le fichier' : 'Sauvegarder puis recréer le fichier'}
                </ActionButton>
              ))}
          </li>
        ))}
      </ul>
      <p className="text-gray-400">
        Vous pouvez aussi corriger le fichier à la main, puis relancer l’ouverture.
      </p>
      <div className="flex flex-wrap gap-2">
        <ActionButton tone="primary" onClick={onReload}>
          Relancer l’ouverture
        </ActionButton>
        <ActionButton onClick={onPick}>Choisir un autre dossier</ActionButton>
      </div>
    </Panel>
  )
}
