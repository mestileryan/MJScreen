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

      {/* Overlay semi-transparent (s'affiche uniquement pendant un survol de fichiers) */}
      {isDragOver && (
        <div className="absolute inset-0 flex justify-center transition-all duration-300">
          <div className="border-4 border-dashed bg-black bg-opacity-75 w-[80vw] h-[80vh] border-white rounded-lg p-10 text-white text-xl font-semibold text-center">
            Déposez votre fichier ici
          </div>
        </div>
      )}
    </div>
  )
}
