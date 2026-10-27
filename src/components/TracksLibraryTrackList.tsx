'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTrackPreview } from '@/hooks/useTrackPreview'
import type { LibraryTrack, TracksSource } from '@/hooks/useTracksLibrary'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import ConfirmationModal from './ConfirmationModal'
import TracksLibraryTrackRow from './TracksLibraryTrackRow'

interface TracksLibraryTrackListProps {
  tracks: LibraryTrack[]
  /** Sources ouvertes, pour le filtre ; la mention de source sur chaque ligne n’apparaît qu’à partir de deux. */
  sources: TracksSource[]
  onEdit: (sourceId: number, id: string, patch: Partial<Pick<IndexedTrack, 'name' | 'tags'>>) => void
  onDelete: (sourceId: number, id: string) => void
  onRemoveMissing: (sourceId: number, ids: string[]) => void
}

/** Minuscules sans accents, pour une recherche tolérante. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

const key = ({ source, track }: LibraryTrack) => `${source.id}:${track.id}`

export default function TracksLibraryTrackList({ tracks, sources, onEdit, onDelete, onRemoveMissing }: TracksLibraryTrackListProps) {
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<LibraryTrack | null>(null)
  const { preview, volume, toggle, stop, seek, setVolume } = useTrackPreview()
  const multiSource = sources.length > 1

  const visible = useMemo(() => {
    const needle = fold(query.trim())
    return tracks.filter(({ source, track }) => {
      if (sourceFilter !== null && source.id !== sourceFilter) return false
      return !needle || fold(`${track.name} ${track.path} ${track.tags.join(' ')}`).includes(needle)
    })
  }, [tracks, query, sourceFilter])

  if (tracks.length === 0) {
    return (
      <p className="rounded-lg bg-gray-800 p-5 text-sm text-gray-400">
        Aucune piste pour l’instant. Déposez vos fichiers audio dans le dossier d’une source, puis actualisez-la.
      </p>
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded bg-gray-800 px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Rechercher une piste…"
            className="w-full bg-transparent text-white outline-none placeholder:text-gray-500"
          />
        </label>
        {multiSource && (
          <select
            value={sourceFilter ?? ''}
            onChange={event => setSourceFilter(event.target.value === '' ? null : Number(event.target.value))}
            aria-label="Filtrer par source"
            className="rounded bg-gray-800 px-2 py-2 text-sm text-gray-300 outline-none"
          >
            <option value="">Toutes les sources</option>
            {sources.map(source => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="px-3 text-sm text-gray-400">Aucune piste ne correspond.</p>
      ) : (
        <ul className="divide-y divide-gray-700 rounded-lg bg-gray-800">
          {visible.map(item => (
            <TracksLibraryTrackRow
              key={key(item)}
              track={item.track}
              sourceLabel={multiSource ? item.source.label : undefined}
              missing={item.missing}
              preview={preview}
              volume={volume}
              onToggle={() => toggle(item.track, item.source.storage)}
              onSeek={seek}
              onVolume={setVolume}
              onEdit={patch => onEdit(item.source.id, item.track.id, patch)}
              onDelete={() => setDeleting(item)}
              onRemoveMissing={() => onRemoveMissing(item.source.id, [item.track.id])}
            />
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmationModal
          message={`Supprimer définitivement « ${deleting.track.name} » ? Le fichier sera effacé de ${deleting.source.label}.`}
          confirmLabel="Supprimer"
          confirmTone="danger"
          onConfirm={() => {
            if (preview?.trackId === deleting.track.id) stop()
            onDelete(deleting.source.id, deleting.track.id)
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  )
}
