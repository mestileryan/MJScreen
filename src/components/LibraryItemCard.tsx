'use client'

import { useState, type ChangeEvent, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import {
  GripVertical,
  Link,
  Music,
  Play,
  Repeat1,
  Trash2,
  Volume,
  Volume1,
  Volume2,
  VolumeOff,
} from 'lucide-react'
import IconSelector from './IconSelector'
import { useLibrary } from '@/context/LibraryContext'
import { useTooltip } from '@/hooks/useTooltip'
import { objectUrlFor } from '@/lib/objectUrl'
import { gainForPosition, positionForGain } from '@/lib/loudness'
import type LibraryItem from '@/models/LibraryItem'
import type FileTrack from '@/models/FileTrack'
import type GalleryImage from '@/models/GalleryImage'

interface HoverPreview {
  url: string
  name: string
  x: number
  y: number
}

interface LibraryItemCardProps {
  item: LibraryItem
  isListView: boolean
  dragDisabled?: boolean
  onRemove: () => void
  onPlayAudio: (track: FileTrack) => void
  onOpenImage: (image: GalleryImage) => void
}

/** `position` et non l'amplitude : l'icône doit suivre ce que montre le curseur. */
function VolumeIcon({ position, className }: { position: number; className: string }) {
  if (position === 0) return <VolumeOff className={`${className} text-red-400`} />
  if (position <= 0.33) return <Volume className={`${className} text-purple-400`} />
  if (position <= 0.66) return <Volume1 className={`${className} text-purple-400`} />
  return <Volume2 className={`${className} text-purple-400`} />
}

export default function LibraryItemCard({
  item,
  isListView,
  dragDisabled = false,
  onRemove,
  onPlayAudio,
  onOpenImage,
}: LibraryItemCardProps) {
  const { patchItem, saveItem } = useLibrary()

  const [isEditing, setIsEditing] = useState(false)
  const [isSelectingIcon, setIsSelectingIcon] = useState(false)
  const [hoverPreview, setHoverPreview] = useState<HoverPreview | null>(null)
  const [editableName, setEditableName] = useState(item.name)

  const tooltipRef = useTooltip(item.name)

  const isAudio = item.kind === 'audio'
  const fileTrack = item as FileTrack
  const galleryImage = item as GalleryImage
  const fileSizeInMB = (item.file.size / 1024 / 1024).toFixed(2)
  const imageUrl = isAudio ? undefined : objectUrlFor(galleryImage.file)

  function startEditing() {
    setIsEditing(true)
    setEditableName(item.name)
  }

  async function saveName() {
    const trimmed = editableName.trim()
    if (!trimmed) {
      setEditableName(item.name)
      setIsEditing(false)
      return
    }
    setIsEditing(false)
    setEditableName(trimmed)
    await saveItem({ ...item, name: trimmed, updatedAt: Date.now() })
  }

  // Le curseur met à jour l'état partagé en continu (le lecteur suit en direct)
  // mais n'écrit en base qu'au relâchement.
  function onVolumeInput(event: ChangeEvent<HTMLInputElement>) {
    // Le curseur porte une position perçue ; c'est l'amplitude qui est enregistrée.
    patchItem({ ...fileTrack, initialVolume: gainForPosition(Number(event.target.value)) })
  }

  async function commitVolume() {
    if (isAudio) await saveItem(fileTrack)
  }

  function onPlay() {
    if (isAudio) onPlayAudio(fileTrack)
  }

  function onOpenImageClick() {
    if (!isAudio) {
      hidePreview()
      onOpenImage(galleryImage)
    }
  }

  function copyLink() {
    if (!isAudio || !fileTrack.id) return
    const url = new URL(window.location.href)
    url.searchParams.set('trackId', String(fileTrack.id))
    navigator.clipboard.writeText(url.toString())
  }

  async function onIconChosen(payload: { iconName: string; color: string }) {
    if (!isAudio) return
    setIsSelectingIcon(false)
    await saveItem({ ...fileTrack, iconName: payload.iconName, iconColor: payload.color })
  }

  async function toggleLoop() {
    if (!isAudio) return
    await saveItem({ ...fileTrack, loop: !fileTrack.loop })
  }

  function showPreview(event: MouseEvent) {
    if (isAudio) return
    setHoverPreview({
      url: imageUrl ?? '',
      name: galleryImage.name,
      x: event.clientX + 16,
      y: event.clientY + 16,
    })
  }

  function updatePreview(event: MouseEvent) {
    const { clientX, clientY } = event
    setHoverPreview(current =>
      current ? { ...current, x: clientX + 16, y: clientY + 16 } : current,
    )
  }

  function hidePreview() {
    setHoverPreview(null)
  }

  const trackIcon = (className: string) =>
    fileTrack.iconName ? (
      <svg className={className} style={{ color: fileTrack.iconColor }}>
        <use href={`#${fileTrack.iconName}`} />
      </svg>
    ) : (
      <Music className={className} style={{ color: fileTrack.iconColor }} />
    )

  return (
    <>
      {isListView ? (
        <div className="flex items-center ml-2 sm:ml-5 rounded-lg bg-gray-700 hover:bg-gray-600 mb-1 shrink-0">
          <div
            className={`track-drag-handle p-1 mr-2 rounded hover:bg-gray-600/25 ${
              dragDisabled ? 'cursor-default' : 'cursor-move'
            }`}
          >
            <GripVertical
              className={`w-4 h-4 ${dragDisabled ? 'text-gray-600' : 'text-gray-400'}`}
            />
          </div>

          {isAudio ? (
            <>
              <button
                className="p-1 rounded-full hover:bg-purple-400/20 transition-colors"
                onClick={copyLink}
                disabled={!fileTrack.id}
              >
                <Link className="w-3 h-3 text-purple-300" />
              </button>
              <div
                className="mr-3 cursor-pointer hover:bg-purple-400/20 rounded-full ml-2"
                onClick={() => setIsSelectingIcon(true)}
              >
                {trackIcon(fileTrack.iconName ? 'w-6 h-6' : 'w-5 h-5')}
              </div>
            </>
          ) : (
            <div className="mr-3 ml-2">
              <img
                src={imageUrl}
                alt={galleryImage.name}
                className="w-10 h-10 object-cover rounded"
                onMouseEnter={showPreview}
                onMouseMove={updatePreview}
                onMouseLeave={hidePreview}
              />
            </div>
          )}

          <div className="min-w-0 flex-1 mr-2 sm:mr-5" onClick={startEditing}>
            {isEditing ? (
              <input
                value={editableName}
                onChange={event => setEditableName(event.target.value)}
                className="bg-gray-500 text-white px-2 py-1 rounded w-full focus:outline-none"
                onBlur={saveName}
                onKeyUp={event => {
                  if (event.key === 'Enter') void saveName()
                }}
                autoFocus
              />
            ) : (
              <p className="flex min-w-0 cursor-pointer items-center gap-2 font-medium text-white">
                <span className="truncate">{item.name}</span>
                {/* La taille est le premier détail sacrifié quand la place manque. */}
                <span className="hidden shrink-0 text-sm text-gray-400 sm:inline">
                  ({fileSizeInMB} Mo)
                </span>
              </p>
            )}
          </div>

          {isAudio ? (
            <>
              <div className="flex shrink-0 items-center">
                <VolumeIcon
                  position={positionForGain(fileTrack.initialVolume)}
                  className="w-5 h-5 mr-1 sm:mr-3"
                />
                <input
                  className="volume-slider w-14 sm:w-auto"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={positionForGain(fileTrack.initialVolume)}
                  onChange={onVolumeInput}
                  onPointerUp={commitVolume}
                  onKeyUp={commitVolume}
                />
              </div>
              <div className="flex items-center gap-1 ml-2">
                <button
                  className="p-1 rounded-full hover:bg-green-400/20 transition-colors"
                  onClick={onPlay}
                >
                  <Play className="w-5 h-5 text-green-400" />
                </button>
                <button
                  className="p-1 rounded-full hover:bg-blue-400/20 transition-colors"
                  onClick={toggleLoop}
                >
                  <Repeat1
                    className={`w-5 h-5 ${fileTrack.loop ? 'text-purple-400' : 'text-gray-400'}`}
                  />
                </button>
                <button
                  onClick={onRemove}
                  className="p-1 hover:bg-red-700/20 rounded-full transition-colors"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1 ml-auto">
              <button
                className="p-1 rounded-full hover:bg-green-400/20 transition-colors"
                onClick={onOpenImageClick}
              >
                <Play className="w-5 h-5 text-green-400" />
              </button>
              <button
                onClick={onRemove}
                className="p-1 hover:bg-red-700/20 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          ref={tooltipRef}
          className={`track-drag-handle text-white rounded float-left w-12 ml-[2px] mb-[1px] h-12
       flex flex-col items-center justify-center cursor-pointer hover:bg-gray-600
       transition-colors relative ${dragDisabled ? 'bg-gray-700' : 'bg-gray-600'}`}
          onClick={() => (isAudio ? onPlay() : onOpenImageClick())}
        >
          {isAudio ? (
            trackIcon(fileTrack.iconName ? 'w-10 h-10 mb-1' : 'w-10 h-10')
          ) : (
            <img
              src={imageUrl}
              alt={galleryImage.name}
              className="w-11 h-11 object-cover rounded"
              onMouseEnter={event => {
                event.stopPropagation()
                showPreview(event)
              }}
              onMouseMove={event => {
                event.stopPropagation()
                updatePreview(event)
              }}
              onMouseLeave={event => {
                event.stopPropagation()
                hidePreview()
              }}
            />
          )}
        </div>
      )}

      {hoverPreview &&
        createPortal(
          <div
            className="pointer-events-none fixed z-50"
            style={{ top: `${hoverPreview.y}px`, left: `${hoverPreview.x}px` }}
          >
            <div className="bg-black/80 p-2 rounded border border-purple-500 shadow-lg">
              <img
                src={hoverPreview.url}
                alt={hoverPreview.name}
                className="max-w-[320px] max-h-[320px] object-contain"
              />
              <p className="mt-2 text-xs text-gray-200 text-center max-w-[200px] break-words">
                {hoverPreview.name}
              </p>
            </div>
          </div>,
          document.body,
        )}

      {isAudio && isSelectingIcon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded shadow-lg w-[95%] sm:w-3/4 max-w-2xl">
            <IconSelector
              onIconChosen={onIconChosen}
              onClose={() => setIsSelectingIcon(false)}
              initialSearch={fileTrack.iconName}
              initialColor={fileTrack.iconColor}
            />
          </div>
        </div>
      )}
    </>
  )
}
