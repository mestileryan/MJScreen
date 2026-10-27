'use client'

import { FileQuestion, ListX, Music, Music2, Pause, Play, Plus, Tag, Trash2, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import type { PreviewState } from '@/hooks/useTrackPreview'
import { formatDuration } from '@/lib/audioDuration'
import { parentPath } from '@/lib/storagePath'
import { parseTags, TRACK_TYPES, trackTypeLabel, type IndexedTrack, type TrackType } from '@/models/TracksLibraryIndex'
import TooltipButton from './TooltipButton'
import { TYPE_ICONS } from './TracksLibraryFilters'
import { ActionButton } from './TracksLibraryUi'

interface TracksLibraryTrackRowProps {
  track: IndexedTrack
  /** Nom de la source, affiché seulement quand la bibliothèque en a plusieurs. */
  sourceLabel?: string
  /** Le fichier a disparu du dossier : pas d’écoute, pas d’édition, seulement le retrait. */
  missing: boolean
  /** Étiquettes proposées à la saisie. */
  suggestions: string[]
  preview: PreviewState | null
  volume: number
  onToggle: () => void
  onSeek: (fraction: number) => void
  onVolume: (value: number) => void
  /** Enregistré aussitôt : il n’y a pas de bouton « Enregistrer ». */
  onEdit: (patch: Partial<Pick<IndexedTrack, 'name' | 'tags' | 'type'>>) => void
  onDelete: () => void
  onRemoveMissing: () => void
}

/** Texte qui devient un champ au clic. Entrée ou perte du focus enregistre, Échap annule. */
function InlineName({ value, onChange }: { value: string; onChange: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (draft !== null) input.current?.select()
  }, [draft])

  const commit = () => {
    const name = draft?.trim()
    if (name && name !== value) onChange(name)
    setDraft(null)
  }
  const keys = (event: KeyboardEvent) => {
    if (event.key === 'Enter') commit()
    if (event.key === 'Escape') setDraft(null)
  }

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft(value)}
        aria-label="Renommer"
        className="min-w-0 truncate rounded px-1 text-left font-medium text-white hover:bg-gray-700"
      >
        {value}
      </button>
    )
  }
  return (
    <input
      ref={input}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={keys}
      aria-label="Nom de la piste"
      className="min-w-0 flex-1 rounded bg-gray-900 px-1 font-medium text-white outline-none ring-2 ring-purple-500"
    />
  )
}

/** Nature de la piste : un clic passe à la suivante (musique → ambiance → effet → aucune). */
function TypeChip({ type, onChange }: { type?: TrackType; onChange: (type?: TrackType) => void }) {
  const next = () => {
    const order = TRACK_TYPES.map(t => t.value)
    const i = type ? order.indexOf(type) : -1
    onChange(i + 1 < order.length ? order[i + 1] : undefined)
  }
  const Icon = type ? TYPE_ICONS[type] : Music2
  return (
    <TooltipButton
      onClick={next}
      tooltip={type ? `${trackTypeLabel(type)} · cliquer pour changer` : 'Type non précisé · cliquer pour choisir'}
      aria-label="Type de piste"
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${
        type ? 'bg-purple-900/60 text-purple-200 hover:bg-purple-800/60' : 'text-gray-500 hover:bg-gray-700 hover:text-gray-300'
      }`}
    >
      <Icon className="h-3 w-3" />
      {type ? trackTypeLabel(type) : 'type ?'}
    </TooltipButton>
  )
}

/** Puces d’étiquettes : une croix retire, le champ en ajoute (Entrée, virgule ou perte du focus). */
function InlineTags({
  tags,
  suggestions,
  listId,
  onChange,
}: {
  tags: string[]
  suggestions: string[]
  listId: string
  onChange: (tags: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const added = parseTags(draft).filter(tag => !tags.some(t => t.toLowerCase() === tag.toLowerCase()))
    if (added.length) onChange([...tags, ...added])
    setDraft('')
  }
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add()
    } else if (event.key === 'Escape') {
      setDraft('')
    } else if (event.key === 'Backspace' && draft === '' && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <ul className="flex flex-wrap items-center justify-end gap-1">
      {tags.map(tag => (
        <li key={tag} className="flex items-center gap-0.5 rounded bg-gray-700 py-0.5 pl-1.5 pr-0.5 text-xs text-gray-300">
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter(t => t !== tag))}
            aria-label={`Retirer l’étiquette ${tag}`}
            className="rounded p-0.5 text-gray-400 hover:bg-gray-600 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </li>
      ))}
      <li>
        <label className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-gray-500 transition-colors focus-within:bg-gray-900 focus-within:text-gray-300 focus-within:ring-1 focus-within:ring-purple-500 hover:text-gray-300">
          <Plus className="h-3 w-3" aria-hidden />
          <Tag className="h-3 w-3" aria-hidden />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={keys}
            onBlur={add}
            placeholder="étiquette"
            aria-label="Ajouter une étiquette"
            list={listId}
            size={Math.max(8, draft.length + 2)}
            className="bg-transparent text-xs text-gray-300 outline-none placeholder:text-gray-500"
          />
        </label>
        {/* Les étiquettes en usage et quelques univers classiques, proposés par le navigateur. */}
        <datalist id={listId}>
          {suggestions
            .filter(s => !tags.some(t => t.toLowerCase() === s.toLowerCase()))
            .map(s => (
              <option key={s} value={s} />
            ))}
        </datalist>
      </li>
    </ul>
  )
}

export default function TracksLibraryTrackRow({
  track,
  sourceLabel,
  missing,
  suggestions,
  preview,
  volume,
  onToggle,
  onSeek,
  onVolume,
  onEdit,
  onDelete,
  onRemoveMissing,
}: TracksLibraryTrackRowProps) {
  const active = preview?.trackId === track.id
  const folder = parentPath(track.path)
  const subtitle = [missing ? 'Fichier introuvable' : folder ? `${folder}/` : '', sourceLabel].filter(Boolean).join(' · ')

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

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {!missing && <Music className="h-4 w-4 shrink-0 text-purple-400" />}
            {missing ? (
              <p className="truncate font-medium text-white">{track.name}</p>
            ) : (
              <InlineName value={track.name} onChange={name => onEdit({ name })} />
            )}
          </div>
          <p className={`truncate pl-1 text-xs ${missing ? 'text-red-300' : 'text-gray-400'}`}>{subtitle}</p>
        </div>

        {missing ? (
          <>
            {track.tags.length > 0 && (
              <ul className="hidden gap-1 sm:flex">
                {track.tags.map(tag => (
                  <li key={tag} className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <ActionButton onClick={onRemoveMissing}>
              <ListX className="h-4 w-4" />
              Retirer
            </ActionButton>
          </>
        ) : (
          <>
            <div className="hidden items-center gap-2 sm:flex">
              <TypeChip type={track.type} onChange={type => onEdit({ type })} />
              <InlineTags tags={track.tags} suggestions={suggestions} listId={`tags-${track.id}`} onChange={tags => onEdit({ tags })} />
            </div>
            <span className="w-12 text-right tabular-nums text-gray-400">
              {track.duration !== undefined ? formatDuration(track.duration) : '–'}
            </span>
            <TooltipButton
              onClick={onDelete}
              tooltip="Supprimer définitivement"
              aria-label="Supprimer"
              className="rounded p-1 text-red-400 transition-colors hover:bg-red-900/40 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </TooltipButton>
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
