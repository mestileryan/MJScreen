'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import type { StorageProvider } from '@/storage/StorageProvider'

export interface PreviewState {
  trackId: string
  playing: boolean
  /** Position et durée en secondes ; la durée vaut 0 tant que le fichier n’est pas décodé. */
  time: number
  duration: number
}

/**
 * Pré-écoute d’une piste de la bibliothèque, une seule à la fois. Le fichier est
 * lu via un object URL créé à la demande et révoqué à l’arrêt : rien n’est gardé.
 */
export function useTrackPreview(storage: StorageProvider) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const url = useRef<string | null>(null)
  const [state, setState] = useState<PreviewState | null>(null)
  const [volume, setVolumeState] = useState(0.8)

  const stop = useCallback(() => {
    const current = audio.current
    if (current) {
      current.pause()
      current.removeAttribute('src')
      current.load()
      audio.current = null
    }
    if (url.current) {
      URL.revokeObjectURL(url.current)
      url.current = null
    }
    setState(null)
  }, [])

  const play = useCallback(
    async (track: IndexedTrack) => {
      stop()
      setState({ trackId: track.id, playing: false, time: 0, duration: track.duration ?? 0 })
      const blob = await storage.read(track.path)
      // L’utilisateur a pu lancer une autre piste pendant la lecture du fichier.
      if (audio.current) return
      const objectUrl = URL.createObjectURL(blob)
      const element = new Audio(objectUrl)
      element.volume = volume
      const sync = () =>
        setState(s =>
          s && s.trackId === track.id
            ? { ...s, playing: !element.paused, time: element.currentTime, duration: element.duration || s.duration }
            : s,
        )
      element.ontimeupdate = sync
      element.onplay = sync
      element.onpause = sync
      element.onloadedmetadata = sync
      element.onended = stop
      element.onerror = stop
      url.current = objectUrl
      audio.current = element
      await element.play().catch(stop)
    },
    [storage, stop, volume],
  )

  const toggle = useCallback(
    (track: IndexedTrack) => {
      const current = audio.current
      if (!current || state?.trackId !== track.id) return void play(track)
      if (current.paused) void current.play()
      else current.pause()
    },
    [play, state?.trackId],
  )

  /** Se place à une fraction (0–1) de la durée. */
  const seek = useCallback((fraction: number) => {
    const current = audio.current
    if (current && Number.isFinite(current.duration)) current.currentTime = fraction * current.duration
  }, [])

  const setVolume = useCallback((value: number) => {
    setVolumeState(value)
    if (audio.current) audio.current.volume = value
  }, [])

  // Démontage de la liste (changement de bibliothèque, retour au jukebox) : on libère tout.
  useEffect(() => stop, [stop])

  return { preview: state, volume, toggle, stop, seek, setVolume }
}
