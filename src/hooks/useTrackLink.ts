'use client'

import { useEffect, useRef, useState } from 'react'
import { DB_GetTrack } from '@/persistance/TrackService'
import type FileTrack from '@/models/FileTrack'

/**
 * Handle opening of tracks via an external link with `?trackId=` parameter
 * and coordinate between multiple tabs using a BroadcastChannel.
 *
 * @param handlePlay callback that enqueues the given track in the player
 */
export function useTrackLink(handlePlay: (track: FileTrack) => void) {
  // Toast message displayed at the top of the page
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Message displayed when another tab already hosts the application
  const [externalMessage, setExternalMessage] = useState<string | null>(null)

  const handlePlayRef = useRef(handlePlay)
  useEffect(() => {
    handlePlayRef.current = handlePlay
  })

  useEffect(() => {
    // `BroadcastChannel` et `document` ne sont disponibles que dans le navigateur :
    // tout le protocole inter-onglets vit donc dans cet effet.
    const broadcast = new BroadcastChannel('mjscreen')
    const originalTitle = document.title
    let state: 'active' | 'passive' = 'active'
    let ack = false

    const setPassive = (message: string) => {
      state = 'passive'
      document.title = `Inactif - ${originalTitle}`
      setExternalMessage(message)
    }

    /** Display a short lived error message */
    const showToast = (msg: string) => {
      setToastMessage(msg)
      window.setTimeout(() => setToastMessage(null), 3000)
    }

    /**
     * Retrieve the track from IndexedDB and add it to the player.
     * If the track does not exist, show an error.
     */
    const playTrackById = async (id: number) => {
      const track = await DB_GetTrack(id)
      if (track) {
        handlePlayRef.current(track)
      } else {
        showToast('Musique introuvable')
      }
    }

    // When another tab asks to open a track, play it here and acknowledge
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ack') {
        ack = true
        return
      }
      if (state === 'passive') return

      if (e.data?.type === 'open-track') {
        playTrackById(Number(e.data.trackId))
        broadcast.postMessage({ type: 'ack' })
      } else if (e.data?.type === 'ping') {
        broadcast.postMessage({ type: 'ack' })
      }
    }
    broadcast.addEventListener('message', onMessage)

    const url = new URL(window.location.href)
    const param = url.searchParams.get('trackId')

    let timer: number

    if (param) {
      const id = Number(param)
      broadcast.postMessage({ type: 'open-track', trackId: id })
      timer = window.setTimeout(() => {
        if (ack) {
          setPassive(
            'La musique a été lancée sur votre page principale.<br>Vous pouvez fermer celle-ci.',
          )
        } else {
          playTrackById(id)
        }
        url.searchParams.delete('trackId')
        window.history.replaceState({}, '', url.toString())
      }, 200)
    } else {
      broadcast.postMessage({ type: 'ping' })
      timer = window.setTimeout(() => {
        if (ack) {
          setPassive(
            'Vous avez déjà une page ouverte pour cette application.<br>Fermez celles en trop et recharger la page principale.',
          )
        }
      }, 200)
    }

    return () => {
      window.clearTimeout(timer)
      broadcast.removeEventListener('message', onMessage)
      broadcast.close()
      document.title = originalTitle
    }
  }, [])

  return { toastMessage, externalMessage }
}
