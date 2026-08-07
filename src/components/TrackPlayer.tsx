'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Repeat1, Trash2, Volume, Volume1, Volume2, VolumeOff } from 'lucide-react'
import { useLibrary } from '@/context/LibraryContext'
import { useAudioWaveform, DEFAULT_WAVEFORM_OPTIONS } from '@/hooks/useAudioWaveform'
import type Track from '@/models/Track'

interface TrackPlayerProps {
  track: Track
  autoPlay: boolean
  sinkId: string
  onChange: (track: Track) => void
  onRemove: () => void
  /** Permet au parent de piloter « tout jouer / tout mettre en pause ». */
  registerAudio: (id: number, audio: HTMLAudioElement | null) => void
}

/** `setSinkId` n'est pas encore dans les typages DOM standards. */
function setSink(audio: HTMLAudioElement, sinkId: string): Promise<void> {
  const withSink = audio as unknown as { setSinkId?: (id: string) => Promise<void> }
  if (!sinkId || typeof withSink.setSinkId !== 'function') return Promise.resolve()
  return withSink.setSinkId(sinkId)
}

export default function TrackPlayer({
  track,
  autoPlay,
  sinkId,
  onChange,
  onRemove,
  registerAudio,
}: TrackPlayerProps) {
  const { findTrack, saveItem } = useLibrary()
  const player = useRef<HTMLAudioElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Version courante de la piste dans la bibliothèque, si elle y est toujours.
  const live = findTrack(track.fileTrack.id)

  useAudioWaveform(player, canvas, track.src)

  useEffect(() => {
    registerAudio(track.id, player.current)
    return () => registerAudio(track.id, null)
  }, [track.id, registerAudio])

  // Volume initial + autoplay au montage
  useEffect(() => {
    if (player.current) player.current.volume = track.volume
    if (autoPlay) void player.current?.play()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Répercute le canal de sortie choisi
  useEffect(() => {
    if (!player.current || !sinkId) return
    setSink(player.current, sinkId).catch((err: Error) => {
      console.error('Erreur lors de la mise à jour du sinkId :', err)
    })
  }, [sinkId])

  // Reflect volume changes made on the FileTrack (e.g. in the Library)
  const lastLibraryVolume = useRef(live?.initialVolume ?? track.volume)
  useEffect(() => {
    if (!live || live.initialVolume === lastLibraryVolume.current) return
    lastLibraryVolume.current = live.initialVolume
    if (player.current) player.current.volume = live.initialVolume
    onChange({ ...track, volume: live.initialVolume })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.initialVolume])

  // Keep loop state in sync with the FileTrack
  const lastLibraryLoop = useRef(live?.loop ?? track.loop)
  useEffect(() => {
    if (!live || live.loop === lastLibraryLoop.current) return
    lastLibraryLoop.current = live.loop
    onChange({ ...track, loop: live.loop })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.loop])

  function play() {
    if (!player.current || isPlaying) return
    void setSink(player.current, sinkId)
    void player.current.play()
  }

  function togglePlay() {
    if (!player.current) return
    if (isPlaying) player.current.pause()
    else play()
  }

  function toggleLoop() {
    const loop = !track.loop
    lastLibraryLoop.current = loop
    onChange({ ...track, loop })
    if (live) void saveItem({ ...live, loop })
  }

  // Le curseur agit immédiatement sur la lecture ; l'écriture en base attend le relâchement.
  function updateVolume(volume: number) {
    if (player.current) player.current.volume = volume
    lastLibraryVolume.current = volume
    onChange({ ...track, volume })
  }

  function commitVolume() {
    if (live) void saveItem({ ...live, initialVolume: track.volume })
  }

  // Gère la fin de la lecture : la piste quitte la file si elle ne boucle pas
  function handleTrackEnd() {
    setIsPlaying(false)
    if (!track.loop) onRemove()
  }

  return (
    <>
      <p className="text-white text-xs mb-1">{track.name}</p>
      {/* Player audio */}
      <audio
        ref={player}
        src={track.src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={handleTrackEnd}
        loop={track.loop}
      />

      {/* Canvas pour la waveform */}
      <canvas
        ref={canvas}
        width={DEFAULT_WAVEFORM_OPTIONS.canvWidth}
        height={DEFAULT_WAVEFORM_OPTIONS.canvHeight}
        className="rounded bg-gray-600 mb-1"
      />

      {/* Boutons Play/Pause et Boucler */}
      <div className="flex gap-1">
        <button
          className="rounded-full hover:bg-red-400/20 transition-colors"
          onClick={onRemove}
        >
          <Trash2 className="w-5 h-5 text-red-400" />
        </button>
        <button
          className="rounded-full hover:bg-gray-400/20 transition-colors"
          onClick={togglePlay}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-gray-400" />
          ) : (
            <Play className="w-5 h-5 text-green-400" />
          )}
        </button>
        <button
          className="rounded-full hover:bg-gray-400/20 transition-colors"
          onClick={toggleLoop}
        >
          <Repeat1 className={`w-5 h-5 ${track.loop ? 'text-purple-400' : 'text-gray-400'}`} />
        </button>

        <div className="ml-1 mr-1">
          {track.volume === 0 && <VolumeOff className="w-5 h-5 text-red-400" />}
          {track.volume > 0 && track.volume <= 0.33 && (
            <Volume className="w-5 h-5 text-purple-400" />
          )}
          {track.volume > 0.33 && track.volume <= 0.66 && (
            <Volume1 className="w-5 h-5 text-purple-400" />
          )}
          {track.volume > 0.66 && <Volume2 className="w-5 h-5 text-purple-400" />}
        </div>

        <input
          className="w-20"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={event => updateVolume(Number(event.target.value))}
          onPointerUp={commitVolume}
          onKeyUp={commitVolume}
        />
      </div>
    </>
  )
}
