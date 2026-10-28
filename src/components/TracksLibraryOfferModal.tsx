'use client'

import { CircleX, Library as LibraryIcon, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { AddedTrackDetails, TracksSource } from '@/hooks/useTracksLibrary'
import { META_FIELDS, parseTags, TRACK_TYPES, trackNameFromPath, type TrackMeta, type TrackType } from '@/models/TracksLibraryIndex'
import type { TracksLibraryFile } from '@/persistance/TracksLibraryService'
import TooltipButton from './TooltipButton'
import TracksLibrarySourceCard from './TracksLibrarySourceCard'
import { ActionButton } from './TracksLibraryUi'

/** Une piste importée dans le jukebox que la bibliothèque ne connaît pas encore. */
export interface OfferCandidate {
  file: File
  hash: string
  /** Ce que le fichier dit de lui-même, pour pré-remplir. */
  meta: TrackMeta
}

interface TracksLibraryOfferModalProps {
  candidate: OfferCandidate
  /** Source qui recevrait la piste ; sa carte s’affiche si elle n’est pas prête. */
  target: TracksSource | undefined
  /** Combien de pistes attendent encore derrière celle-ci. */
  remaining: number
  suggestions: string[]
  onConfirm: (details: AddedTrackDetails) => Promise<void>
  onSkip: () => void
  sourceActions: {
    onReopen: (id: number) => void
    onRefresh: (id: number) => void
    onInitialize: (id: number) => void
    onReset: (id: number, file: TracksLibraryFile) => void
    onRemove: (id: number) => void
    onRemoveMissing: (id: number, ids: string[]) => void
  }
}

const field = 'rounded-md bg-gray-900 px-2 py-1 text-sm text-white outline-none ring-purple-500 focus:ring-1'

/**
 * « Cette piste n’est pas dans la bibliothèque, on l’y range ? » : nom, type,
 * étiquettes et métadonnées pré-remplies depuis le fichier, puis un seul bouton.
 */
export default function TracksLibraryOfferModal({ candidate, target, remaining, suggestions, onConfirm, onSkip, sourceActions }: TracksLibraryOfferModalProps) {
  const [name, setName] = useState(candidate.meta.title || trackNameFromPath(candidate.file.name))
  const [type, setType] = useState<TrackType | ''>('')
  const [tags, setTags] = useState('')
  const [meta, setMeta] = useState<TrackMeta>(candidate.meta)
  const [busy, setBusy] = useState(false)
  const ready = target?.status.step === 'ready'

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready) return
    setBusy(true)
    try {
      await onConfirm({
        name: name.trim() || trackNameFromPath(candidate.file.name),
        type: type || undefined,
        tags: parseTags(tags),
        meta,
        hash: candidate.hash,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8">
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal
        aria-label="Ajouter à la bibliothèque"
        className="w-full max-w-xl space-y-3 rounded-xl bg-gray-900 p-5 shadow-2xl ring-1 ring-white/10"
      >
        <div className="flex items-center gap-3">
          <LibraryIcon className="h-5 w-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Ranger aussi dans la bibliothèque ?</h2>
          <TooltipButton onClick={onSkip} className="ml-auto rounded-md p-1 text-gray-400 transition-colors hover:text-red-400" tooltip="Pas cette fois" aria-label="Pas cette fois">
            <CircleX className="h-5 w-5" />
          </TooltipButton>
        </div>
        <p className="text-sm text-gray-300">
          <span className="font-medium text-white">{candidate.file.name}</span> vient d’être ajoutée au jukebox, mais la bibliothèque ne la
          connaît pas{target ? ` ; elle irait dans ${target.label}` : ''}.
          {remaining > 0 && <span className="text-gray-500"> · {remaining} autre{remaining > 1 ? 's' : ''} ensuite</span>}
        </p>

        {target && !ready && (
          <ul>
            <TracksLibrarySourceCard
              source={target}
              showDefault={false}
              onReopen={() => sourceActions.onReopen(target.id)}
              onRefresh={() => sourceActions.onRefresh(target.id)}
              onInitialize={() => sourceActions.onInitialize(target.id)}
              onReset={file => sourceActions.onReset(target.id, file)}
              onSetDefault={() => undefined}
              onRemove={() => sourceActions.onRemove(target.id)}
              onRemoveMissing={ids => sourceActions.onRemoveMissing(target.id, ids)}
            />
          </ul>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <label className="flex flex-col gap-0.5 text-xs text-gray-400">
            Nom
            <input value={name} onChange={e => setName(e.target.value)} className={field} autoFocus />
          </label>
          <label className="flex flex-col gap-0.5 text-xs text-gray-400">
            Type
            <select value={type} onChange={e => setType(e.target.value as TrackType | '')} className={field}>
              <option value="">—</option>
              {TRACK_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-0.5 text-xs text-gray-400">
          Étiquettes, séparées par des virgules
          <input value={tags} onChange={e => setTags(e.target.value)} list="offer-tags" placeholder="combat, Médiéval fantastique" className={`${field} placeholder:text-gray-600`} />
          <datalist id="offer-tags">
            {suggestions.map(s => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {META_FIELDS.filter(({ key }) => key !== 'comment').map(({ key, label }) => (
            <label key={key} className="flex flex-col gap-0.5 text-xs text-gray-400">
              {label}
              <input value={meta[key] ?? ''} onChange={e => setMeta({ ...meta, [key]: e.target.value || undefined })} className={field} />
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-0.5 text-xs text-gray-400">
          Commentaire
          <textarea value={meta.comment ?? ''} onChange={e => setMeta({ ...meta, comment: e.target.value || undefined })} rows={2} className={`${field} resize-y`} />
        </label>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <ActionButton onClick={onSkip}>Pas cette fois</ActionButton>
          <ActionButton tone="primary" type="submit" disabled={!ready || busy}>
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LibraryIcon className="h-4 w-4" />}
            Ajouter à la bibliothèque
          </ActionButton>
        </div>
      </form>
    </div>
  )
}
