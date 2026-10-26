'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTrackPreview } from '@/hooks/useTrackPreview'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import type { ReconcileReport } from '@/persistance/TracksLibraryIndexer'
import { isEmptyReport } from '@/persistance/TracksLibraryIndexer'
import type { StorageProvider } from '@/storage/StorageProvider'
import ConfirmationModal from './ConfirmationModal'
import TracksLibraryTrackRow from './TracksLibraryTrackRow'
import { ActionButton } from './TracksLibraryUi'

interface TracksLibraryTrackListProps {
  storage: StorageProvider
  tracks: IndexedTrack[]
  /** `null` tant que le dossier est en cours de parcours. */
  report: ReconcileReport | null
  onEdit: (id: string, patch: Pick<IndexedTrack, 'name' | 'tags'>) => void
  onDelete: (id: string) => void
  onRemoveMissing: (ids: string[]) => void
}

/** Minuscules sans accents, pour une recherche tolérante. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

function reportSummary(report: ReconcileReport): string {
  const parts: string[] = []
  if (report.added.length) parts.push(plural(report.added.length, 'nouvelle piste', 'nouvelles pistes'))
  if (report.changed.length) parts.push(plural(report.changed.length, 'fichier modifié', 'fichiers modifiés'))
  if (report.missing.length) parts.push(plural(report.missing.length, 'fichier introuvable', 'fichiers introuvables'))
  return parts.join(' · ')
}

export default function TracksLibraryTrackList({
  storage,
  tracks,
  report,
  onEdit,
  onDelete,
  onRemoveMissing,
}: TracksLibraryTrackListProps) {
  const [query, setQuery] = useState('')
  const [deleting, setDeleting] = useState<IndexedTrack | null>(null)
  const missing = useMemo(() => new Set(report?.missing.map(t => t.id)), [report])
  const { preview, volume, toggle, stop, seek, setVolume } = useTrackPreview(storage)

  const visible = useMemo(() => {
    const needle = fold(query.trim())
    if (!needle) return tracks
    return tracks.filter(track => fold(`${track.name} ${track.path} ${track.tags.join(' ')}`).includes(needle))
  }, [tracks, query])

  if (tracks.length === 0 && report) {
    return (
      <p className="rounded-lg bg-gray-800 p-5 text-sm text-gray-400">
        Aucune piste pour l’instant. Déposez vos fichiers audio dans le dossier, puis cliquez sur « Actualiser ».
      </p>
    )
  }

  return (
    <section className="space-y-3">
      {report && !isEmptyReport(report) && (
        <div className="flex flex-wrap items-center gap-3 rounded bg-gray-800 px-3 py-2 text-sm text-gray-300">
          <span>{reportSummary(report)}</span>
          {report.missing.length > 1 && (
            <ActionButton className="ml-auto" onClick={() => onRemoveMissing(report.missing.map(t => t.id))}>
              Retirer les {report.missing.length} introuvables
            </ActionButton>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 rounded bg-gray-800 px-3 py-2 text-sm">
        <Search className="h-4 w-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Rechercher une piste…"
          className="w-full bg-transparent text-white outline-none placeholder:text-gray-500"
        />
      </label>

      {visible.length === 0 ? (
        <p className="px-3 text-sm text-gray-400">Aucune piste ne correspond.</p>
      ) : (
        <ul className="divide-y divide-gray-700 rounded-lg bg-gray-800">
          {visible.map(track => (
            <TracksLibraryTrackRow
              key={track.id}
              track={track}
              missing={missing.has(track.id)}
              preview={preview}
              volume={volume}
              onToggle={() => toggle(track)}
              onSeek={seek}
              onVolume={setVolume}
              onEdit={patch => onEdit(track.id, patch)}
              onDelete={() => setDeleting(track)}
              onRemoveMissing={() => onRemoveMissing([track.id])}
            />
          ))}
        </ul>
      )}

      {deleting && (
        <ConfirmationModal
          message={`Supprimer définitivement « ${deleting.name} » ? Le fichier sera effacé du dossier.`}
          confirmLabel="Supprimer"
          confirmTone="danger"
          onConfirm={() => {
            if (preview?.trackId === deleting.id) stop()
            onDelete(deleting.id)
            setDeleting(null)
          }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </section>
  )
}
