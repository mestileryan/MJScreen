'use client'

import { FolderPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ActionButton, Panel } from './TracksLibraryUi'

interface TracksLibraryUnmanagedFolderProps {
  folderName: string
  audioFileCount: number
  /** Résolue une fois l’initialisation terminée, réussie ou non (l’erreur est affichée par ailleurs). */
  onInitialize: (name: string) => Promise<void>
  onChange: () => void
}

function found(count: number): string {
  if (count === 0) return 'Il ne contient pas encore de morceau.'
  return count === 1 ? 'Il contient 1 morceau.' : `Il contient ${count} morceaux.`
}

/** Dossier sans `.mjlib/` : on propose d’en faire une bibliothèque, sans toucher à son contenu. */
export default function TracksLibraryUnmanagedFolder({
  folderName,
  audioFileCount,
  onInitialize,
  onChange,
}: TracksLibraryUnmanagedFolderProps) {
  const [name, setName] = useState(folderName)
  const [busy, setBusy] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    void onInitialize(name).finally(() => setBusy(false))
  }

  return (
    <Panel title="Nouvelle bibliothèque" icon={<FolderPlus className="h-5 w-5 text-purple-400" />}>
      <p>
        Le dossier <strong className="text-white">{folderName}</strong> n’est pas encore une bibliothèque.{' '}
        {found(audioFileCount)} Vos fichiers ne seront ni déplacés ni modifiés.
      </p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-gray-400">Nom</span>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            className="w-64 rounded bg-gray-900 px-2 py-1.5 text-white outline-none ring-purple-500 focus:ring-2"
          />
        </label>
        <ActionButton tone="primary" type="submit" disabled={busy || name.trim() === ''}>
          <FolderPlus className="h-4 w-4" />
          Créer la bibliothèque
        </ActionButton>
        <ActionButton onClick={onChange}>Changer d’emplacement</ActionButton>
      </form>
    </Panel>
  )
}
