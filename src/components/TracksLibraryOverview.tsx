'use client'

import { Library as LibraryIcon, LoaderCircle } from 'lucide-react'
import type { ReadyState } from '@/hooks/useTracksLibrary'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import { serializeDocument } from '@/schemas/documentSchema'
import TracksLibraryTrackList from './TracksLibraryTrackList'
import { ActionButton, TechnicalDetails } from './TracksLibraryUi'

interface TracksLibraryOverviewProps {
  state: ReadyState
  onReload: () => void
  onChange: () => void
  onForget: () => void
  onRemoveMissing: (ids: string[]) => void
  onEdit: (id: string, patch: Pick<IndexedTrack, 'name' | 'tags'>) => void
  onDelete: (id: string) => void
}

function trackCount(count: number): string {
  if (count === 0) return 'aucune piste'
  return count === 1 ? '1 piste' : `${count} pistes`
}

/** Bibliothèque ouverte : un en-tête compact, puis la liste des pistes. */
export default function TracksLibraryOverview({
  state,
  onReload,
  onChange,
  onForget,
  onRemoveMissing,
  onEdit,
  onDelete,
}: TracksLibraryOverviewProps) {
  const { library, report } = state
  const { config, index, storage, migratedFrom } = library
  const migrated = migratedFrom.config !== null || migratedFrom.index !== null

  return (
    <div className="space-y-4">
      <section className="space-y-2 rounded-lg bg-gray-800 p-5 shadow">
        <div className="flex flex-wrap items-center gap-2">
          <LibraryIcon className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">{config.name}</h2>
          <span className="text-sm text-gray-400">
            · {storage.label} · {trackCount(index.tracks.length)}
          </span>
          {report === null && <LoaderCircle className="h-4 w-4 animate-spin text-gray-400" />}
          <div className="ml-auto flex flex-wrap gap-2">
            <ActionButton onClick={onReload}>Actualiser</ActionButton>
            <ActionButton onClick={onChange}>Changer d’emplacement</ActionButton>
            <ActionButton onClick={onForget}>Déconnecter</ActionButton>
          </div>
        </div>

        {migrated && (
          <p className="rounded bg-gray-900/60 p-3 text-sm text-gray-300">
            Cette bibliothèque vient d’une ancienne version de MJScreen. Elle sera mise au nouveau format à la prochaine
            modification, en conservant l’ancienne.
          </p>
        )}

        <TechnicalDetails>
          {`Dossier des pistes : ${config.tracksDir}/\nIdentifiant : ${config.id}\nFormats : réglages v${config.schemaVersion}, liste v${index.schemaVersion}\nSorties : ${config.outputs.length}\n\n${serializeDocument(config)}`}
        </TechnicalDetails>
      </section>

      <TracksLibraryTrackList
        storage={storage}
        tracks={index.tracks}
        report={report}
        onEdit={onEdit}
        onDelete={onDelete}
        onRemoveMissing={onRemoveMissing}
      />
    </div>
  )
}
