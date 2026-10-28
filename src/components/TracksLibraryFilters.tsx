'use client'

import { Shapes, Tag, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { countTags, hasFilters, NO_FILTERS, sameTag, type SearchableTrack, type TrackFilters } from '@/lib/trackSearch'
import { TRACK_TYPES, type TrackType } from '@/models/TracksLibraryIndex'

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
  /** Étiquettes à proposer, les plus récemment manipulées d’abord ; à défaut, les plus fréquentes. */
  recentTags: string[]
  onChange: (filters: TrackFilters) => void
}

/** Deux lignes de pastilles, cumulables : les types, puis les étiquettes. */
export default function TracksLibraryFilters({ tracks, filters, recentTags, onChange }: TracksLibraryFiltersProps) {
  if (tracks.length === 0) return null

  const counts = countTags(tracks)
  const countOf = (tag: string) => counts.find(c => sameTag(c.value, tag))?.count ?? 0
  const byType = (type: TrackType | 'none') => tracks.filter(t => (type === 'none' ? t.track.type === undefined : t.track.type === type)).length
  const untagged = tracks.filter(t => t.track.tags.length === 0).length

  // Les étiquettes récentes encore en usage, complétées par les plus fréquentes ;
  // celles qui filtrent en ce moment restent visibles quoi qu’il arrive.
  const shown: string[] = []
  for (const tag of [...filters.tags, ...recentTags, ...counts.map(c => c.value)]) {
    if (shown.length >= 5 && !filters.tags.some(t => sameTag(t, tag))) break
    if (countOf(tag) > 0 && !shown.some(t => sameTag(t, tag))) shown.push(tag)
  }

  const toggleTag = (tag: string) =>
    onChange({
      ...filters,
      tags: filters.tags.some(t => sameTag(t, tag)) ? filters.tags.filter(t => !sameTag(t, tag)) : [...filters.tags, tag],
    })

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Shapes className="h-3.5 w-3.5 text-gray-500" aria-label="Type" />
        {TRACK_TYPES.map(({ value, label }) => (
          <Chip key={value} active={filters.type === value} onClick={() => onChange({ ...filters, type: filters.type === value ? null : value })} count={byType(value)}>
            {label}
          </Chip>
        ))}
        <Chip active={filters.type === 'none'} onClick={() => onChange({ ...filters, type: filters.type === 'none' ? null : 'none' })} count={byType('none')}>
          Sans type
        </Chip>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag className="h-3.5 w-3.5 text-gray-500" aria-label="Étiquettes" />
        {shown.map(tag => (
          <Chip key={tag} active={filters.tags.some(t => sameTag(t, tag))} onClick={() => toggleTag(tag)} count={countOf(tag)}>
            {tag}
          </Chip>
        ))}
        <Chip active={filters.untagged} onClick={() => onChange({ ...filters, untagged: !filters.untagged })} count={untagged}>
          Sans étiquette
        </Chip>
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
    </div>
  )
}
