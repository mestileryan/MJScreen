'use client'

import { FileQuestion, Music, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDuration } from '@/lib/audioDuration'
import { parentPath } from '@/lib/storagePath'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import type { ReconcileReport } from '@/persistance/TracksLibraryIndexer'
import { isEmptyReport } from '@/persistance/TracksLibraryIndexer'
import { ActionButton } from './TracksLibraryUi'

interface TracksLibraryTrackListProps {
  tracks: IndexedTrack[]
  /** `null` tant que le dossier est en cours de parcours. */
  report: ReconcileReport | null
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

export default function TracksLibraryTrackList({ tracks, report, onRemoveMissing }: TracksLibraryTrackListProps) {
  const [query, setQuery] = useState('')
  const missing = useMemo(() => new Set(report?.missing.map(t => t.id)), [report])

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
          {visible.map(track => {
            const lost = missing.has(track.id)
            const folder = parentPath(track.path)
            return (
              <li key={track.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${lost ? 'opacity-70' : ''}`}>
                {lost ? (
                  <FileQuestion className="h-5 w-5 shrink-0 text-red-400" />
                ) : (
                  <Music className="h-5 w-5 shrink-0 text-purple-400" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{track.name}</p>
                  <p className="truncate text-xs text-gray-400">
                    {lost ? 'Fichier introuvable' : folder ? `${folder}/` : ''}
                  </p>
                </div>
                {track.tags.length > 0 && (
                  <ul className="hidden flex-wrap gap-1 sm:flex">
                    {track.tags.map(tag => (
                      <li key={tag} className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
                {lost ? (
                  <ActionButton onClick={() => onRemoveMissing([track.id])}>Retirer</ActionButton>
                ) : (
                  <span className="w-12 text-right tabular-nums text-gray-400">
                    {track.duration !== undefined ? formatDuration(track.duration) : '–'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
