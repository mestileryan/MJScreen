'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Bomb,
  CirclePause,
  CirclePlay,
  MonitorPlay,
  SquareDashedMousePointer,
  SquareMousePointer,
} from 'lucide-react'
import TrackPlayer from './TrackPlayer'
import { useAudioOutputs } from '@/hooks/useAudioOutputs'
import type Track from '@/models/Track'

interface TracksPlayerProps {
  tracks: Track[]
  onUpdateTrack: (track: Track) => void
  onRemoveTrack: (track: Track) => void
  onRemoveAllTracks: () => void
  onOpenViewer: () => void
}

export default function TracksPlayer({
  tracks,
  onUpdateTrack,
  onRemoveTrack,
  onRemoveAllTracks,
  onOpenViewer,
}: TracksPlayerProps) {
  // Contrôle global de l'autoplay : actif par défaut, une piste ajoutée démarre seule.
  const [autoPlayMode, setAutoPlayMode] = useState(true)
  const { outputChannels, selectedOutputChannel, setSelectedOutputChannel } = useAudioOutputs()

  // Chaque TrackPlayer enregistre son élément <audio> pour permettre le pilotage global.
  const audios = useRef(new Map<number, HTMLAudioElement>())

  const registerAudio = useCallback((id: number, audio: HTMLAudioElement | null) => {
    if (audio) audios.current.set(id, audio)
    else audios.current.delete(id)
  }, [])

  function playAll() {
    audios.current.forEach(audio => audio.play().catch(() => {}))
  }

  function pauseAll() {
    audios.current.forEach(audio => audio.pause())
  }

  return (
    // `min-h-full` plutôt que `h-full` : le contenu reste centré tant qu'il y a de la
    // place, mais peut dépasser et défiler quand la file s'allonge, sans que le haut
    // devienne inatteignable comme avec un simple `justify-center`.
    <div className="flex flex-col items-center justify-center gap-6 min-h-full">
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onOpenViewer}
          className="rounded-full hover:bg-blue-400/20 transition-colors"
        >
          <MonitorPlay className="w-8 h-8 text-blue-400" />
        </button>
        <button
          onClick={() => setAutoPlayMode(mode => !mode)}
          className="rounded-full hover:bg-gray-600/20 transition-colors"
        >
          {autoPlayMode ? (
            <SquareMousePointer className="w-8 h-8 text-purple-400" />
          ) : (
            <SquareDashedMousePointer className="w-8 h-8 text-gray-600" />
          )}
        </button>
        <button onClick={playAll} className="rounded-full hover:bg-gray-400/20 transition-colors">
          <CirclePlay className="w-8 h-8 text-green-400" />
        </button>
        <button onClick={pauseAll} className="rounded-full hover:bg-white/20 transition-colors">
          <CirclePause className="w-8 h-8 text-white" />
        </button>
        <button
          onClick={onRemoveAllTracks}
          className="rounded-full hover:bg-red-400/20 transition-colors"
        >
          <Bomb className="w-8 h-8 text-red-400" />
        </button>
      </div>

      {tracks.map(track => (
        <div key={track.id} className="mt-3">
          <TrackPlayer
            track={track}
            autoPlay={autoPlayMode}
            sinkId={selectedOutputChannel}
            onChange={onUpdateTrack}
            onRemove={() => onRemoveTrack(track)}
            registerAudio={registerAudio}
          />
        </div>
      ))}

      <div className="mt-4 mt-auto w-full">
        <label htmlFor="outputChannel" className="block mb-2 text-sm font-medium text-purple-300">
          Canal audio de diffusion
        </label>
        <select
          id="outputChannel"
          value={selectedOutputChannel}
          onChange={event => setSelectedOutputChannel(event.target.value)}
          className="bg-gray-900 border border-purple-600 text-purple-300 text-sm rounded-lg block w-full p-2.5"
        >
          {outputChannels.map(channel => (
            <option key={channel.deviceId} value={channel.deviceId}>
              {channel.label || `Canal ${channel.deviceId}`}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
