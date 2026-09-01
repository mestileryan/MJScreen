'use client'

import { useRef, useState, type DragEvent, type ReactNode } from 'react'

interface ImportFileDragOverlayProps {
  onFilesDropped: (files: File[]) => void
  children: ReactNode
}

export default function ImportFileDragOverlay({
  onFilesDropped,
  children,
}: ImportFileDragOverlayProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  // Un `dragenter` est émis pour chaque enfant survolé : on compte les entrées/sorties
  // pour ne masquer l'overlay qu'en quittant réellement la zone.
  const dragCounter = useRef(0)

  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (
      event.dataTransfer?.items &&
      Array.from(event.dataTransfer.items).some(item => item.kind === 'file')
    ) {
      dragCounter.current++
      setIsDragOver(true)
    }
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    if (
      event.dataTransfer?.items &&
      !Array.from(event.dataTransfer.items).some(item => item.kind === 'file')
    ) {
      return
    }
    event.preventDefault() // Permet de conserver le drag actif
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragOver(false)
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragCounter.current = 0
    setIsDragOver(false)

    if (event.dataTransfer?.files?.length) {
      onFilesDropped(Array.from(event.dataTransfer.files))
    }
  }

  return (
    // On place le wrapper en "relative" pour que l'overlay absolu
    // puisse se positionner par-dessus.
    <div
      className="relative"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}

      {/* Indication de survol de fichiers. `pointer-events-none` partout : un
          voile qui capterait les événements empêcherait les playlists de savoir
          laquelle est survolée — le liseré signale la zone, le bandeau (fixe,
          toujours visible même bibliothèque défilée) explique le geste. */}
      {isDragOver && (
        <>
          <div className="pointer-events-none absolute inset-0 z-10 rounded-lg border-2 border-dashed border-purple-400/70" />
          <div
            className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg
              bg-gray-900/95 px-4 py-2 text-sm font-semibold text-white shadow-lg"
          >
            Déposez vos fichiers sur une playlist pour les y ranger
          </div>
        </>
      )}
    </div>
  )
}
