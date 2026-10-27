'use client'

import { Music2, Tag, Wind, X, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { countTags, hasFilters, isUnqualified, NO_FILTERS, type SearchableTrack, type TrackFilters } from '@/lib/trackSearch'
import { TRACK_TYPES, type TrackType } from '@/models/TracksLibraryIndex'

/** Icône de chaque type, réutilisée sur les lignes. */
export const TYPE_ICONS: Record<TrackType, typeof Music2> = { music: Music2, ambience: Wind, sfx: Zap }

/** Au-delà, les étiquettes passent par la recherche plutôt que par les pastilles. */
const MAX_TAG_CHIPS = 12

interface ChipProps {
  active: boolean
  onClick: () => void
  children: ReactNode
  count?: number
}

function Chip({ active, onClick, children, count }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-purple-600 text-on-accent' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
      }`}
    >
      {children}
      {count !== undefined && <span className={active ? 'text-purple-200' : 'text-gray-500'}>{count}</span>}
    </button>
  )
}

interface TracksLibraryFiltersProps {
  tracks: SearchableTrack[]
  filters: TrackFilters
  onChange: (filters: TrackFilters) => void
}

/** Pastilles de filtre : à qualifier, type, étiquettes les plus utilisées. Elles se cumulent. */
export default function TracksLibraryFilters({ tracks, filters, onChange }: TracksLibraryFiltersProps) {
  const unqualified = tracks.filter(t => isUnqualified(t.track)).length
  const byType = (type: TrackType) => tracks.filter(t => t.track.type === type).length
  const tags = countTags(tracks)
  // Les étiquettes choisies restent visibles même si elles ne sont pas parmi les plus fréquentes.
  const shown = tags.filter((tag, i) => i < MAX_TAG_CHIPS || filters.tags.some(t => t.toLowerCase() === tag.value.toLowerCase()))
  const toggleTag = (tag: string) =>
    onChange({
      ...filters,
      tags: filters.tags.some(t => t.toLowerCase() === tag.toLowerCase())
        ? filters.tags.filter(t => t.toLowerCase() !== tag.toLowerCase())
        : [...filters.tags, tag],
    })

  if (tracks.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {unqualified > 0 && (
        <Chip active={filters.untagged} onClick={() => onChange({ ...filters, untagged: !filters.untagged })} count={unqualified}>
          <Tag className="h-3 w-3" />À qualifier
        </Chip>
      )}
      {TRACK_TYPES.map(({ value, label }) => {
        const Icon = TYPE_ICONS[value]
        const count = byType(value)
        if (count === 0 && filters.type !== value) return null
        return (
          <Chip key={value} active={filters.type === value} onClick={() => onChange({ ...filters, type: filters.type === value ? null : value })} count={count}>
            <Icon className="h-3 w-3" />
            {label}
          </Chip>
        )
      })}
      {shown.length > 0 && <span className="mx-1 h-4 w-px bg-gray-700" aria-hidden />}
      {shown.map(({ value, count }) => (
        <Chip key={value} active={filters.tags.some(t => t.toLowerCase() === value.toLowerCase())} onClick={() => toggleTag(value)} count={count}>
          {value}
        </Chip>
      ))}
      {hasFilters(filters) && (
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white"
        >
          <X className="h-3 w-3" />
          Tout afficher
        </button>
      )}
    </div>
  )
}
