'use client'

import { LoaderCircle, Plus } from 'lucide-react'
import { useRef } from 'react'
import { AUDIO_EXTENSIONS } from '@/lib/audioFiles'
import { ActionButton } from './TracksLibraryUi'

interface TracksLibraryAddButtonProps {
  /** Nom de la source qui recevra les fichiers. */
  targetLabel: string
  adding: { total: number } | null
  onFiles: (files: File[]) => void
}

const ACCEPT = AUDIO_EXTENSIONS.map(ext => `.${ext}`).join(',')

/** « Ajouter des pistes » : ouvre le sélecteur de fichiers ; le glisser-déposer fait la même chose. */
export default function TracksLibraryAddButton({ targetLabel, adding, onFiles }: TracksLibraryAddButtonProps) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={event => {
          const files = Array.from(event.target.files ?? [])
          // Remis à zéro pour pouvoir re-choisir les mêmes fichiers plus tard.
          event.target.value = ''
          if (files.length) onFiles(files)
        }}
      />
      <ActionButton tone="primary" disabled={adding !== null} onClick={() => input.current?.click()} title={`Vers ${targetLabel}`}>
        {adding ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {adding ? `Ajout de ${adding.total} fichier${adding.total > 1 ? 's' : ''}…` : 'Ajouter des pistes'}
      </ActionButton>
    </>
  )
}
