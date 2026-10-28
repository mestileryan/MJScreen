'use client'

import type { TracksSource } from '@/hooks/useTracksLibrary'
import type { TracksLibraryFile } from '@/persistance/TracksLibraryService'
import type { CloudKind } from '@/storage/cloud/CloudStorage'
import TracksLibraryDestinations from './TracksLibraryDestinations'
import TracksLibrarySourceCard from './TracksLibrarySourceCard'

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

/** Où brancher une source, puis celles qui le sont déjà. */
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
  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <p className="text-sm text-gray-300">{sources.length === 0 ? 'Aucune source configurée. Choisissez où sont vos pistes :' : 'Ajouter une source :'}</p>
        <TracksLibraryDestinations localAvailable={localAvailable} onPickLocal={onAddLocal} onPickCloud={onAddCloud} />
      </section>

      {sources.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Sources branchées</h3>
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
      )}
    </div>
  )
}
