'use client'

import { Check, CircleX, FolderOpen, LoaderCircle, Music, Pause, Play, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTrackPreview } from '@/hooks/useTrackPreview'
import { useTracksLibrary, type LibraryTrack } from '@/hooks/useTracksLibrary'
import { formatDuration } from '@/lib/audioDuration'
import { publicUrl } from '@/lib/basePath'
import { parentPath } from '@/lib/storagePath'
import { fileForTrack } from '@/lib/trackFile'
import { NO_FILTERS, selectTracks, TrackSearch } from '@/lib/trackSearch'
import { trackTypeLabel } from '@/models/TracksLibraryIndex'
import TooltipButton from './TooltipButton'
import TracksLibraryPagination, { pageFor } from './TracksLibraryPagination'
import TracksLibrarySourceCard from './TracksLibrarySourceCard'
import { ActionButton } from './TracksLibraryUi'
import Uploader from './Uploader'

const PAGE_SIZE = 10

interface TracksLibraryPickerProps {
  /** Reçoit le fichier de la piste choisie (ou d’un fichier du disque), comme un dépôt. */
  onPick: (file: File) => void | Promise<void>
  onClose: () => void
}

/**
 * Le « + » du jukebox : choisir une piste dans la bibliothèque, recherche en tête,
 * dernières ajoutées d’abord, dix par page. Le fichier est copié dans le jukebox
 * comme s’il avait été déposé. « Choisir un fichier… » reste là pour l’ancien chemin.
 */
export default function TracksLibraryPicker({ onPick, onClose }: TracksLibraryPickerProps) {
  const { state, tracks, reopenSource, refreshSource, initializeSource, resetSourceFile, setDefaultSource, removeSource, removeMissing } =
    useTracksLibrary()
  const [query, setQuery] = useState('')
  const [paging, setPaging] = useState({ signature: '', page: 1 })
  /** Pistes déjà ajoutées pendant cette ouverture, pour le dire sur la ligne. */
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const { preview, toggle } = useTrackPreview()

  const items = useMemo(() => tracks.filter(t => !t.missing).map(t => ({ ...t, key: `${t.source.id}:${t.track.id}` })), [tracks])
  const search = useMemo(() => new TrackSearch(items), [items])
  const matching = useMemo(() => selectTracks(items, search, query, NO_FILTERS), [items, search, query])
  const { page, pageCount, slice } = pageFor(paging, query, matching.length, PAGE_SIZE)
  const visible = slice(matching)

  const sources = state.step === 'ready' ? state.sources : []
  const attention = sources.filter(s => s.status.step !== 'ready' && s.status.step !== 'opening')
  const opening = sources.some(s => s.status.step === 'opening')
  const multiSource = sources.length > 1

  const add = async (item: LibraryTrack & { key: string }) => {
    setBusy(item.key)
    try {
      const blob = await item.source.storage.read(item.track.path)
      await onPick(fileForTrack(item.track, blob))
      setAdded(current => new Set(current).add(item.key))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-label="Ajouter une piste"
        className="w-full max-w-2xl space-y-3 rounded-xl bg-gray-900 p-5 shadow-2xl ring-1 ring-white/10"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-white">Ajouter une piste</h2>
          <TooltipButton onClick={onClose} className="ml-auto rounded-md p-1 text-gray-400 transition-colors hover:text-red-400" tooltip="Fermer" aria-label="Fermer">
            <CircleX className="h-5 w-5" />
          </TooltipButton>
        </div>

        {state.step === 'starting' ? (
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Ouverture de la bibliothèque…
          </p>
        ) : sources.length === 0 ? (
          <p className="rounded-lg bg-gray-800 p-4 text-sm text-gray-300">
            Aucune bibliothèque configurée.{' '}
            <a href={publicUrl('/trackslibrary/')} className="text-purple-300 hover:text-purple-400">
              Brancher une source
            </a>
            , ou choisir un fichier ci-dessous.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Rechercher dans la bibliothèque…"
                className="w-full bg-transparent text-white outline-none placeholder:text-gray-500"
              />
              {opening && <LoaderCircle className="h-4 w-4 animate-spin text-gray-400" />}
            </label>

            {attention.length > 0 && (
              <ul className="space-y-2">
                {attention.map(source => (
                  <TracksLibrarySourceCard
                    key={source.id}
                    source={source}
                    showDefault={false}
                    onReopen={() => reopenSource(source.id)}
                    onRefresh={() => refreshSource(source.id)}
                    onInitialize={() => initializeSource(source.id)}
                    onReset={file => resetSourceFile(source.id, file)}
                    onSetDefault={() => setDefaultSource(source.id)}
                    onRemove={() => removeSource(source.id)}
                    onRemoveMissing={ids => removeMissing(source.id, ids)}
                  />
                ))}
              </ul>
            )}

            {matching.length === 0 ? (
              <p className="px-3 text-sm text-gray-400">{query ? 'Aucune piste ne correspond.' : 'Aucune piste dans la bibliothèque.'}</p>
            ) : (
              <ul className="divide-y divide-gray-700 rounded-lg bg-gray-800">
                {visible.map(item => {
                  const { track, source } = item
                  const playing = preview?.trackId === track.id && preview.playing
                  const done = added.has(item.key)
                  const folder = parentPath(track.path)
                  const subtitle = [folder ? `${folder}/` : '', multiSource ? source.label : ''].filter(Boolean).join(' · ')
                  return (
                    <li key={item.key} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <TooltipButton
                        onClick={() => toggle(track, source.storage)}
                        tooltip={playing ? 'Pause' : 'Écouter'}
                        aria-label={playing ? 'Pause' : 'Écouter'}
                        className="shrink-0 rounded-full bg-purple-600 p-1.5 text-on-accent transition-colors hover:bg-purple-500"
                      >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </TooltipButton>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 truncate font-medium text-white">
                          <Music className="h-4 w-4 shrink-0 text-purple-400" />
                          {track.name}
                        </p>
                        {subtitle && <p className="truncate pl-5 text-xs text-gray-400">{subtitle}</p>}
                      </div>
                      <ul className="hidden gap-1 sm:flex">
                        {track.type && <li className="rounded-md bg-purple-900/60 px-1.5 py-0.5 text-xs text-purple-200">{trackTypeLabel(track.type)}</li>}
                        {track.tags.slice(0, 3).map(tag => (
                          <li key={tag} className="rounded-md bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
                            {tag}
                          </li>
                        ))}
                      </ul>
                      <span className="hidden w-12 text-right tabular-nums text-gray-400 sm:inline">
                        {track.duration !== undefined ? formatDuration(track.duration) : '–'}
                      </span>
                      <ActionButton tone={done ? 'secondary' : 'primary'} disabled={busy === item.key} onClick={() => void add(item)} aria-label={`Ajouter ${track.name}`}>
                        {busy === item.key ? <LoaderCircle className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {done ? 'Ajoutée' : 'Ajouter'}
                      </ActionButton>
                    </li>
                  )
                })}
              </ul>
            )}

            <TracksLibraryPagination page={page} pageCount={pageCount} total={matching.length} onChange={p => setPaging({ signature: query, page: p })} />
          </>
        )}

        <div className="flex items-center gap-2 border-t border-white/10 pt-3 text-sm text-gray-400">
          <FolderOpen className="h-4 w-4" />
          <span>Ou depuis cet ordinateur :</span>
          <Uploader onFileSelected={file => void onPick(file)} />
        </div>
      </div>
    </div>
  )
}
