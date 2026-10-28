'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRecentTags } from '@/hooks/useRecentTags'
import { useTrackPreview } from '@/hooks/useTrackPreview'
import type { LibraryTrack, TracksSource } from '@/hooks/useTracksLibrary'
import { countTags, NO_FILTERS, sameTag, selectTracks, TrackSearch, type TrackFilters } from '@/lib/trackSearch'
import { SUGGESTED_TAGS, type IndexedTrack } from '@/models/TracksLibraryIndex'
import ConfirmationModal from './ConfirmationModal'
import TracksLibraryFilters from './TracksLibraryFilters'
import TracksLibraryTrackRow from './TracksLibraryTrackRow'

export type TrackPatch = Partial<Pick<IndexedTrack, 'name' | 'tags' | 'type'>>

interface TracksLibraryTrackListProps {
  tracks: LibraryTrack[]
  /** Sources ouvertes, pour le filtre ; la mention de source sur chaque ligne n’apparaît qu’à partir de deux. */
  sources: TracksSource[]
  onEdit: (sourceId: number, id: string, patch: TrackPatch) => void
  onDelete: (sourceId: number, id: string) => void
  onRemoveMissing: (sourceId: number, ids: string[]) => void
}

type Item = LibraryTrack & { key: string }

export default function TracksLibraryTrackList({ tracks, sources, onEdit, onDelete, onRemoveMissing }: TracksLibraryTrackListProps) {
  const [query, setQuery] = useState('')
  const [filters, setFiltersState] = useState<TrackFilters>(NO_FILTERS)
  const { recent: recentTags, touch } = useRecentTags()
  const [sourceFilter, setSourceFilter] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<LibraryTrack | null>(null)
  const { preview, volume, toggle, stop, seek, setVolume } = useTrackPreview()
  const multiSource = sources.length > 1

  const items = useMemo<Item[]>(() => tracks.map(t => ({ ...t, key: `${t.source.id}:${t.track.id}` })), [tracks])
  // L’index de recherche est refait à chaque changement de liste : pour quelques
  // centaines de pistes, c’est instantané, et rien n’est à garder.
  const search = useMemo(() => new TrackSearch(items), [items])
  const visible = useMemo(
    () => selectTracks(items, search, query, filters).filter(item => sourceFilter === null || item.source.id === sourceFilter),
    [items, search, query, filters, sourceFilter],
  )
  /** Étiquettes proposées à la saisie : celles en usage, plus quelques univers classiques. */
  const suggestions = useMemo(() => {
    const used = countTags(items).map(t => t.value)
    return [...used, ...SUGGESTED_TAGS.filter(s => !used.some(u => u.toLowerCase() === s.toLowerCase()))]
  }, [items])

  /** Une étiquette qu’on vient de choisir, de poser ou de chercher passe en tête des récentes. */
  const setFilters = (next: TrackFilters) => {
    const added = next.tags.filter(tag => !filters.tags.some(t => sameTag(t, tag)))
    if (added.length) touch(...added)
    setFiltersState(next)
  }
  const edit = (sourceId: number, id: string, patch: TrackPatch) => {
    const before = tracks.find(t => t.source.id === sourceId && t.track.id === id)?.track.tags ?? []
    const added = (patch.tags ?? []).filter(tag => !before.some(t => sameTag(t, tag)))
    if (added.length) touch(...added)
    onEdit(sourceId, id, patch)
  }
  const searchFor = (text: string) => {
    setQuery(text)
    const exact = suggestions.find(tag => sameTag(tag, text.trim()))
    if (exact && countTags(items).some(c => sameTag(c.value, exact))) touch(exact)
  }

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
            onChange={event => searchFor(event.target.value)}
            placeholder="Rechercher une piste, une étiquette…"
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

      <TracksLibraryFilters tracks={items} filters={filters} recentTags={recentTags} onChange={setFilters} />

      {visible.length === 0 ? (
        <p className="px-3 text-sm text-gray-400">Aucune piste ne correspond.</p>
      ) : (
        <ul className="divide-y divide-gray-700 rounded-lg bg-gray-800">
          {visible.map(item => (
            <TracksLibraryTrackRow
              key={item.key}
              track={item.track}
              sourceLabel={multiSource ? item.source.label : undefined}
              missing={item.missing}
              suggestions={suggestions}
              preview={preview}
              volume={volume}
              onToggle={() => toggle(item.track, item.source.storage)}
              onSeek={seek}
              onVolume={setVolume}
              onEdit={patch => edit(item.source.id, item.track.id, patch)}
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
