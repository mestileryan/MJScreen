'use client'

import { FolderPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ActionButton, Panel } from './TracksLibraryUi'

interface TracksLibraryUnmanagedFolderProps {
  folderName: string
  audioFileCount: number
  /** Résolue une fois l’initialisation terminée, réussie ou non (l’erreur est affichée par ailleurs). */
  onInitialize: (name: string) => Promise<void>
  onPick: () => void
}

/** Dossier sans `.mjlib/` : on propose d’en faire une bibliothèque, sans toucher à son contenu. */
export default function TracksLibraryUnmanagedFolder({ folderName, audioFileCount, onInitialize, onPick }: TracksLibraryUnmanagedFolderProps) {
  const [name, setName] = useState(folderName)
  const [busy, setBusy] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    void onInitialize(name).finally(() => setBusy(false))
  }

  return (
    <Panel title="Ce dossier n’est pas encore une bibliothèque" icon={<FolderPlus className="h-5 w-5 text-purple-400" />}>
      <p>
        <strong className="text-gray-100">{folderName}</strong> ne contient pas de sous-dossier{' '}
        <code className="text-purple-300">.mjlib/</code>.{' '}
        {audioFileCount === 0
          ? 'Aucun fichier audio n’y a été trouvé.'
          : `${audioFileCount} fichier${audioFileCount > 1 ? 's' : ''} audio y ${audioFileCount > 1 ? 'ont' : 'a'} été trouvé${audioFileCount > 1 ? 's' : ''}.`}
      </p>
      <p>
        Créer la bibliothèque ajoute seulement <code className="text-purple-300">.mjlib/config.json</code> et{' '}
        <code className="text-purple-300">.mjlib/index.json</code>. Les fichiers existants ne sont ni déplacés ni
        modifiés.
        {audioFileCount > 0 && ' Leur indexation arrivera dans une prochaine version.'}
      </p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-gray-400">Nom de la bibliothèque</span>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            className="w-64 rounded bg-gray-900 px-2 py-1.5 text-gray-100 outline-none ring-purple-500 focus:ring-2"
          />
        </label>
        <ActionButton tone="primary" type="submit" disabled={busy || name.trim() === ''}>
          <FolderPlus className="h-4 w-4" />
          Créer la bibliothèque
        </ActionButton>
        <ActionButton onClick={onPick}>Choisir un autre dossier</ActionButton>
      </form>
    </Panel>
  )
}
