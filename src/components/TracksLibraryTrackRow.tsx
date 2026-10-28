'use client'

import { FileQuestion, ListX, Music, Pause, Pencil, Play, Plus, Shapes, Tag, Trash2, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useTooltip } from '@/hooks/useTooltip'
import type { PreviewState } from '@/hooks/useTrackPreview'
import { formatDuration } from '@/lib/audioDuration'
import { describeMeta, hasMeta } from '@/lib/audioMeta'
import { parentPath } from '@/lib/storagePath'
import {
  META_FIELDS,
  parseTags,
  TRACK_TYPES,
  trackTypeLabel,
  type IndexedTrack,
  type TrackMeta,
  type TrackType,
} from '@/models/TracksLibraryIndex'
import TooltipButton from './TooltipButton'
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
  onEdit: (patch: Partial<Pick<IndexedTrack, 'name' | 'tags' | 'type' | 'meta'>>) => void
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
  return (
    <TooltipButton
      onClick={next}
      tooltip="Sélectionner un type"
      aria-label="Sélectionner un type"
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs transition-colors hover:bg-purple-800/60 ${
        type ? 'bg-purple-900/60 text-purple-200' : 'bg-purple-900/30 text-purple-300/70'
      }`}
    >
      <Shapes className="h-3 w-3" aria-hidden />
      <span className="hidden sm:inline">{type ? trackTypeLabel(type) : 'Type'}</span>
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
  const tooltip = useTooltip('Sélectionner des étiquettes')

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
      {/* Sur téléphone, les puces céderaient toute la ligne : seule l’icône d’ajout reste. */}
      {tags.map(tag => (
        <li key={tag} className="hidden items-center gap-0.5 rounded-md bg-gray-700 py-0.5 pl-1.5 pr-0.5 text-xs text-gray-300 sm:flex">
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
        {/* Pas de texte : le + et l’étiquette suffisent ; le champ ne s’ouvre qu’à la saisie. */}
        <label
          ref={tooltip}
          className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-gray-500 transition-colors focus-within:bg-gray-900 focus-within:text-gray-300 focus-within:ring-1 focus-within:ring-purple-500 hover:text-gray-300"
        >
          <Plus className="hidden h-3 w-3 sm:inline" aria-hidden />
          <Tag className="h-3 w-3" aria-hidden />
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={keys}
            onBlur={add}
            aria-label="Sélectionner des étiquettes"
            list={listId}
            size={Math.max(1, draft.length + 1)}
            className="w-4 bg-transparent text-xs text-gray-300 outline-none focus:w-auto"
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

/**
 * Un champ de métadonnée : enregistré à la perte du focus ou sur Entrée, Échap annule.
 * Le commentaire est une zone de texte : Entrée y fait un retour à la ligne.
 */
function MetaField({
  label,
  value,
  multiline = false,
  onChange,
}: {
  label: string
  value: string
  multiline?: boolean
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const commit = () => {
    if (draft.trim() !== value) onChange(draft.trim())
  }
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) commit()
    if (e.key === 'Escape') setDraft(value)
  }
  const field = 'rounded-md bg-gray-900 px-2 py-1 text-sm text-white outline-none ring-purple-500 focus:ring-1'
  return (
    <label className="flex flex-col gap-0.5 text-xs text-gray-400">
      {label}
      {multiline ? (
        <textarea value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={keys} rows={2} className={`${field} resize-y`} />
      ) : (
        <input value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={keys} className={field} />
      )}
    </label>
  )
}

/** Les métadonnées du fichier, à compléter ou corriger ; chaque champ s’enregistre seul. */
function MetaForm({ meta, onChange }: { meta: TrackMeta; onChange: (meta: TrackMeta) => void }) {
  const set = (key: keyof TrackMeta, value: string) => {
    const next = { ...meta, [key]: value || undefined }
    onChange(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as TrackMeta)
  }
  const short = META_FIELDS.filter(({ key }) => key !== 'comment')
  return (
    <div className="mt-2 space-y-2 pl-11">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {short.map(({ key, label }) => (
          <MetaField key={key} label={label} value={meta[key] ?? ''} onChange={value => set(key, value)} />
        ))}
      </div>
      <MetaField label="Commentaire" value={meta.comment ?? ''} multiline onChange={value => set('comment', value)} />
    </div>
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
  const [editing, setEditing] = useState(false)
  const active = preview?.trackId === track.id
  const folder = parentPath(track.path)
  const subtitle = [missing ? 'Fichier introuvable' : folder ? `${folder}/` : '', sourceLabel].filter(Boolean).join(' · ')
  // Les métadonnées du fichier ne s’affichent qu’au survol du nom.
  const metaTooltip = useTooltip(hasMeta(track.meta) ? describeMeta(track.meta) : undefined)

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
          <div ref={metaTooltip} className="flex items-center gap-1">
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
                  <li key={tag} className="rounded-md bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300">
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
            <div className="flex items-center gap-2">
              <TypeChip type={track.type} onChange={type => onEdit({ type })} />
              <InlineTags tags={track.tags} suggestions={suggestions} listId={`tags-${track.id}`} onChange={tags => onEdit({ tags })} />
            </div>
            {/* Sur téléphone, la durée cède sa place au type et aux étiquettes. */}
            <span className="hidden w-12 text-right tabular-nums text-gray-400 sm:inline">
              {track.duration !== undefined ? formatDuration(track.duration) : '–'}
            </span>
            <TooltipButton
              onClick={() => setEditing(e => !e)}
              tooltip="Titre, artiste, album… du fichier"
              aria-label="Métadonnées"
              aria-expanded={editing}
              className={`rounded-md p-1 transition-colors hover:bg-gray-700 hover:text-white ${editing ? 'text-purple-300' : 'text-gray-400'}`}
            >
              <Pencil className="h-4 w-4" />
            </TooltipButton>
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

      {editing && !missing && <MetaForm meta={track.meta ?? {}} onChange={meta => onEdit({ meta })} />}

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
