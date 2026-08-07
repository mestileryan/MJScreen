'use client'

import { useCallback, useEffect, useRef } from 'react'
import { publicUrl } from '@/lib/basePath'
import { objectUrlFor } from '@/lib/objectUrl'
import type GalleryImage from '@/models/GalleryImage'

/**
 * Pilote la fenêtre de présentation (`public/gallery-viewer.html`) dans laquelle les
 * images de la galerie sont diffusées. La fenêtre est réouverte à la demande si
 * l'utilisateur l'a fermée.
 */
export function usePresentationWindow() {
  const windowRef = useRef<Window | null>(null)
  const monitorRef = useRef<number | null>(null)
  const lastImageRef = useRef<GalleryImage | null>(null)

  const stopMonitor = useCallback(() => {
    if (monitorRef.current !== null) {
      window.clearInterval(monitorRef.current)
      monitorRef.current = null
    }
  }, [])

  const handleClosed = useCallback(() => {
    stopMonitor()
    windowRef.current = null
  }, [stopMonitor])

  const ensureWindow = useCallback((): Window | null => {
    if (windowRef.current && !windowRef.current.closed) {
      return windowRef.current
    }

    const opened = window.open(
      publicUrl('gallery-viewer.html'),
      'gallery-viewer',
      'width=800,height=600',
    )

    if (!opened) {
      handleClosed()
      return null
    }

    windowRef.current = opened
    // `beforeunload` n'est pas toujours délivré (fermeture d'onglet, crash) :
    // le sondage périodique garantit qu'on rouvrira bien une fenêtre au besoin.
    monitorRef.current = window.setInterval(() => {
      if (windowRef.current?.closed) handleClosed()
    }, 500)

    return opened
  }, [handleClosed])

  const present = useCallback(
    (image: GalleryImage) => {
      lastImageRef.current = image
      const target = ensureWindow()
      if (!target) return
      target.postMessage(
        {
          type: 'display-image',
          url: objectUrlFor(image.file),
          name: image.name,
        },
        window.location.origin,
      )
    },
    [ensureWindow],
  )

  /** Ramène la fenêtre au premier plan et y réaffiche la dernière image diffusée. */
  const openViewer = useCallback(() => {
    const target = ensureWindow()
    if (!target) return
    target.focus()
    if (lastImageRef.current) present(lastImageRef.current)
  }, [ensureWindow, present])

  useEffect(() => stopMonitor, [stopMonitor])

  return { present, openViewer }
}
