'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import type { TracksSource } from '@/hooks/useTracksLibrary'
import type { TracksLibraryFile } from '@/persistance/TracksLibraryService'
import type { CloudKind } from '@/storage/cloud/CloudStorage'
import TracksLibraryDestinations from './TracksLibraryDestinations'
import TracksLibrarySourceCard from './TracksLibrarySourceCard'
import { ActionButton, Panel } from './TracksLibraryUi'

interface TracksLibrarySourcesProps {
  sources: TracksSource[]
  localAvailable: boolean
  onAddLocal: () => void
  onAddCloud: (kind: CloudKind) => void
  onReopen: (id: number) => void
  onRefresh: (id: number) => void
  onInitialize: (id: number) => void
  onReset: (id: number, file: TracksLibraryFile) => void
  onSetDefault: (id: number) => void
  onRemove: (id: number) => void
  onRemoveMissing: (id: number, ids: string[]) => void
}

/** Les sources de la bibliothèque, et de quoi en brancher une nouvelle. */
export default function TracksLibrarySources({
  sources,
  localAvailable,
  onAddLocal,
  onAddCloud,
  onReopen,
  onRefresh,
  onInitialize,
  onReset,
  onSetDefault,
  onRemove,
  onRemoveMissing,
}: TracksLibrarySourcesProps) {
  const [adding, setAdding] = useState(false)

  if (sources.length === 0) {
    return (
      <Panel title="Aucune source configurée">
        <p>Choisissez où sont vos pistes :</p>
        <TracksLibraryDestinations localAvailable={localAvailable} onPickLocal={onAddLocal} onPickCloud={onAddCloud} />
      </Panel>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Sources</h2>
        <ActionButton className="ml-auto" onClick={() => setAdding(a => !a)}>
          <Plus className="h-4 w-4" />
          Ajouter une source
        </ActionButton>
      </div>
      {adding && (
        <div className="rounded-lg bg-gray-800 p-4">
          <TracksLibraryDestinations
            localAvailable={localAvailable}
            onPickLocal={() => {
              setAdding(false)
              onAddLocal()
            }}
            onPickCloud={kind => {
              setAdding(false)
              onAddCloud(kind)
            }}
          />
        </div>
      )}
      <ul className="space-y-2">
        {sources.map(source => (
          <TracksLibrarySourceCard
            key={source.id}
            source={source}
            showDefault={sources.length > 1}
            onReopen={() => onReopen(source.id)}
            onRefresh={() => onRefresh(source.id)}
            onInitialize={() => onInitialize(source.id)}
            onReset={file => onReset(source.id, file)}
            onSetDefault={() => onSetDefault(source.id)}
            onRemove={() => onRemove(source.id)}
            onRemoveMissing={ids => onRemoveMissing(source.id, ids)}
          />
        ))}
      </ul>
    </section>
  )
}
