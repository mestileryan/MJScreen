'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createTrack, revokeTrackUrl } from '@/models/Track'
import type Track from '@/models/Track'
import type FileTrack from '@/models/FileTrack'

/** File de lecture du lecteur : une entrée par ajout, même piste possiblement répétée. */
export function usePlayerQueue() {
  const [tracks, setTracks] = useState<Track[]>([])

  // Miroir de l'état, pour révoquer les object URLs hors des mises à jour de state.
  const tracksRef = useRef<Track[]>(tracks)
  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  const addTrack = useCallback((fileTrack: FileTrack, forceAutoPlay = false) => {
    setTracks(current => [...current, createTrack(fileTrack, forceAutoPlay)])
  }, [])

  const updateTrack = useCallback((track: Track) => {
    setTracks(current =>
      current.map(candidate => (candidate.id === track.id ? track : candidate)),
    )
  }, [])

  const removeTrack = useCallback((track: Track) => {
    revokeTrackUrl(track)
    setTracks(current => current.filter(candidate => candidate.id !== track.id))
  }, [])

  const removeAllTracks = useCallback(() => {
    tracksRef.current.forEach(revokeTrackUrl)
    setTracks([])
  }, [])

  return { tracks, addTrack, updateTrack, removeTrack, removeAllTracks }
}
