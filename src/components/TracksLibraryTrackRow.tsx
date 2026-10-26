'use client'

import { FileQuestion, Music, Pause, Pencil, Play, Trash2, Volume2 } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import type { PreviewState } from '@/hooks/useTrackPreview'
import { formatDuration } from '@/lib/audioDuration'
import { parentPath } from '@/lib/storagePath'
import { parseTags, type IndexedTrack } from '@/models/TracksLibraryIndex'
import TooltipButton from './TooltipButton'
import { ActionButton } from './TracksLibraryUi'

interface TracksLibraryTrackRowProps {
  track: IndexedTrack
  /** Le fichier a disparu du dossier : pas d’écoute, pas d’édition, seulement le retrait. */
  missing: boolean
  preview: PreviewState | null
  volume: number
  onToggle: () => void
  onSeek: (fraction: number) => void
  onVolume: (value: number) => void
  onEdit: (patch: Pick<IndexedTrack, 'name' | 'tags'>) => void
  onDelete: () => void
  onRemoveMissing: () => void
}

function Editor({ track, onEdit, onCancel }: { track: IndexedTrack; onEdit: TracksLibraryTrackRowProps['onEdit']; onCancel: () => void }) {
  const [name, setName] = useState(track.name)
  const [tags, setTags] = useState(track.tags.join(', '))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onEdit({ name: name.trim() || track.name, tags: parseTags(tags) })
  }
  const escape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onCancel()
  }

  return (
    <form onSubmit={submit} onKeyDown={escape} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-gray-400">Nom</span>
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          className="rounded bg-gray-900 px-2 py-1 text-white outline-none ring-purple-500 focus:ring-2"
        />
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs text-gray-400">Étiquettes, séparées par des virgules</span>
        <input
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="combat, nuit, forêt"
          className="rounded bg-gray-900 px-2 py-1 text-white outline-none ring-purple-500 focus:ring-2 placeholder:text-gray-600"
        />
      </label>
      <ActionButton tone="primary" type="submit">
        Enregistrer
      </ActionButton>
      <ActionButton onClick={onCancel}>Annuler</ActionButton>
    </form>
  )
}

export default function TracksLibraryTrackRow({
  track,
  missing,
  preview,
  volume,
  onToggle,
  onSeek,
  onVolume,
  onEdit,
  onDelete,
  onRemoveMissing,
}: TracksLibraryTrackRowProps) {
  const [editing, setEditing] = useState(false)
  const active = preview?.trackId === track.id
  const folder = parentPath(track.path)

  const iconButton = 'rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white'

  return (
    <li className={`px-3 py-2 text-sm ${missing ? 'opacity-70' : ''} ${active ? 'bg-gray-700/40' : ''}`}>
      <div className="flex items-center gap-3">
        {missing ? (
          <FileQuestion className="h-5 w-5 shrink-0 text-red-400" />
        ) : (
          <TooltipButton
            onClick={onToggle}
            tooltip={active && preview?.playing ? 'Pause' : 'Écouter'}
            aria-label={active && preview?.playing ? 'Pause' : 'Écouter'}
            className="shrink-0 rounded-full bg-purple-600 p-1.5 text-on-accent transition-colors hover:bg-purple-500"
          >
            {active && preview?.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </TooltipButton>
        )}

        {editing ? (
          <Editor
            track={track}
            onEdit={patch => {
              onEdit(patch)
              setEditing(false)
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate font-medium text-white">
                {!missing && <Music className="h-4 w-4 shrink-0 text-purple-400" />}
                {track.name}
              </p>
              <p className="truncate text-xs text-gray-400">{missing ? 'Fichier introuvable' : folder ? `${folder}/` : ''}</p>
            </div>
            {track.tags.length > 0 && (
              <ul className="hidden flex-wrap justify-end gap-1 sm:flex">
                {track.tags.map(tag => (
                  <li key={tag} className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            {missing ? (
              <ActionButton onClick={onRemoveMissing}>Retirer</ActionButton>
            ) : (
              <>
                <span className="w-12 text-right tabular-nums text-gray-400">
                  {track.duration !== undefined ? formatDuration(track.duration) : '–'}
                </span>
                <TooltipButton onClick={() => setEditing(true)} tooltip="Renommer, étiqueter" aria-label="Modifier" className={iconButton}>
                  <Pencil className="h-4 w-4" />
                </TooltipButton>
                <TooltipButton onClick={onDelete} tooltip="Supprimer définitivement" aria-label="Supprimer" className={`${iconButton} hover:text-red-400`}>
                  <Trash2 className="h-4 w-4" />
                </TooltipButton>
              </>
            )}
          </>
        )}
      </div>

      {active && preview && (
        <div className="mt-2 flex items-center gap-3 pl-11 text-xs text-gray-400">
          <span className="tabular-nums">{formatDuration(preview.time)}</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={preview.duration ? Math.round((preview.time / preview.duration) * 1000) : 0}
            onChange={e => onSeek(Number(e.target.value) / 1000)}
            aria-label="Position"
            className="h-1 flex-1 accent-purple-500"
          />
          <span className="tabular-nums">{preview.duration ? formatDuration(preview.duration) : '–'}</span>
          <Volume2 className="h-4 w-4" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => onVolume(Number(e.target.value))}
            aria-label="Volume"
            className="h-1 w-24 accent-purple-500"
          />
        </div>
      )}
    </li>
  )
}
