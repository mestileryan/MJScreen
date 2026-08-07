'use client'

import { useRef } from 'react'
import LibraryItemCard from './LibraryItemCard'
import { useSortable, type SortableMove } from '@/hooks/useSortable'
import type Playlist from '@/models/Playlist'
import type LibraryItem from '@/models/LibraryItem'
import type FileTrack from '@/models/FileTrack'
import type GalleryImage from '@/models/GalleryImage'

interface PlaylistItemsProps {
  playlist: Playlist
  isListView: boolean
  searchTerm: string
  onMove: (move: SortableMove) => void
  onRemoveItem: (playlist: Playlist, item: LibraryItem) => void
  onPlayAudio: (track: FileTrack) => void
  onOpenImage: (image: GalleryImage) => void
}

export function itemKey(item: LibraryItem): string {
  // Pistes et images vivent dans deux tables Dexie distinctes : leurs ids peuvent
  // se recouper, on préfixe donc par le type.
  return `${item.kind}-${item.id}`
}

export default function PlaylistItems({
  playlist,
  isListView,
  searchTerm,
  onMove,
  onRemoveItem,
  onPlayAudio,
  onOpenImage,
}: PlaylistItemsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const dragDisabled = searchTerm !== ''

  useSortable(containerRef, onMove, {
    group: 'library-items',
    animation: 700,
    handle: '.track-drag-handle',
    disabled: dragDisabled,
  })

  // Le tri est désactivé pendant une recherche : les indices remontés par SortableJS
  // porteraient sinon sur la liste filtrée et non sur `playlist.items`.
  const visibleItems = searchTerm
    ? playlist.items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : playlist.items

  return (
    <div
      ref={containerRef}
      data-playlist-id={playlist.id}
      className={isListView ? 'flex flex-col space-y-1' : 'flex flex-wrap justify-start'}
    >
      {visibleItems.map(item => (
        <div key={itemKey(item)}>
          <LibraryItemCard
            item={item}
            isListView={isListView}
            dragDisabled={dragDisabled}
            onRemove={() => onRemoveItem(playlist, item)}
            onPlayAudio={onPlayAudio}
            onOpenImage={onOpenImage}
          />
        </div>
      ))}

      {visibleItems.length === 0 && (
        <div>
          <p className="text-gray-400 text-xl">🕸️🕸️🕸</p>
        </div>
      )}
    </div>
  )
}
