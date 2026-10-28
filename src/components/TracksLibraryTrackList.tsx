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
import TracksLibraryPagination, { pageFor } from './TracksLibraryPagination'
import TracksLibraryTrackRow from './TracksLibraryTrackRow'

export type TrackPatch = Partial<Pick<IndexedTrack, 'name' | 'tags' | 'type' | 'meta'>>

/** Pistes par page. */
const PAGE_SIZE = 50

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
  const [deleting, setDeleting] = useState<LibraryTrack | null>(null)
  const { preview, volume, toggle, stop, seek, setVolume } = useTrackPreview()
  const multiSource = sources.length > 1
  // Pagination : la page est liée à la recherche et aux filtres en cours, pour
  // revenir à la première dès qu’ils changent, sans effet ni état superflu.
  const signature = `${query}\u0000${JSON.stringify(filters)}`
  const [paging, setPaging] = useState({ signature, page: 1 })
  const setPage = (page: number) => setPaging({ signature, page })

  const items = useMemo<Item[]>(() => tracks.map(t => ({ ...t, key: `${t.source.id}:${t.track.id}` })), [tracks])
  // L’index de recherche est refait à chaque changement de liste : pour quelques
  // centaines de pistes, c’est instantané, et rien n’est à garder.
  const search = useMemo(() => new TrackSearch(items), [items])
  const matching = useMemo(() => selectTracks(items, search, query, filters), [items, search, query, filters])
  const { page, pageCount, slice } = pageFor(paging, signature, matching.length, PAGE_SIZE)
  const visible = slice(matching)
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
        <label className="flex min-w-60 flex-1 items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={event => searchFor(event.target.value)}
            placeholder="Rechercher une piste, une étiquette…"
            className="w-full bg-transparent text-white outline-none placeholder:text-gray-500"
          />
        </label>
      </div>

      <TracksLibraryFilters tracks={items} filters={filters} recentTags={recentTags} onChange={setFilters} />

      {matching.length === 0 ? (
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

      <TracksLibraryPagination page={page} pageCount={pageCount} total={matching.length} onChange={setPage} />

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
