'use client'

import { useState, type RefObject } from 'react'
import {
  CirclePause,
  CirclePlay,
  CircleX,
  MonitorPlay,
  SquareDashedMousePointer,
  SquareMousePointer,
} from 'lucide-react'
import TrackPlayer, { type TrackControls } from './TrackPlayer'
import { useAudioOutputs } from '@/hooks/useAudioOutputs'
import { DEFAULT_WAVEFORM_OPTIONS } from '@/hooks/useAudioWaveform'
import type Track from '@/models/Track'

interface TracksPlayerProps {
  tracks: Track[]
  /**
   * Registre des commandes des pistes, détenu par le parent : les enchaînements
   * de playlist s'en servent pour arrêter une piste avec son fondu. On passe par
   * ces commandes plutôt que par l'élément <audio> pour que « tout jouer » et
   * « tout mettre en pause » respectent aussi les fondus.
   */
  controls: RefObject<Map<number, TrackControls>>
  registerControls: (id: number, controls: TrackControls | null) => void
  onUpdateTrack: (track: Track) => void
  onRemoveTrack: (track: Track) => void
  onRemoveAllTracks: () => void
  /** Une piste est arrivée au bout sans boucler (enchaînement automatique). */
  onTrackEnded: (track: Track) => void
  onOpenViewer: () => void
}

export default function TracksPlayer({
  tracks,
  controls,
  registerControls,
  onUpdateTrack,
  onRemoveTrack,
  onRemoveAllTracks,
  onTrackEnded,
  onOpenViewer,
}: TracksPlayerProps) {
  // Contrôle global de l'autoplay : actif par défaut, une piste ajoutée démarre seule.
  const [autoPlayMode, setAutoPlayMode] = useState(true)
  const { outputChannels, selectedOutputChannel, setSelectedOutputChannel } = useAudioOutputs()

  function playAll() {
    controls.current.forEach(trackControls => trackControls.play())
  }

  function pauseAll() {
    controls.current.forEach(trackControls => trackControls.pause())
  }

  return (
    // Alignement en haut, explicitement. Le panneau s'appuyait auparavant sur le
    // `mt-auto` du sélecteur de sortie pour compenser un `justify-center` : dès que ce
    // sélecteur est masqué faute de périphérique, la marge automatique disparaît avec
    // lui et tout se recentrait. Le `mt-auto` ne sert donc plus qu'à plaquer le
    // sélecteur en bas quand il est là.
    // `min-h-full` plutôt que `h-full` : la file peut dépasser et défiler.
    <div className="flex flex-col items-center gap-6 min-h-full">
      <div className="flex items-center justify-center gap-4 sm:gap-6">
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
          {/* `CircleX` vient de la même famille que CirclePlay et CirclePause :
              cercle rigoureusement identique, sans composition à ajuster. */}
          <CircleX className="w-8 h-8 text-red-400" />
        </button>
      </div>

      {tracks.map(track => (
        // Largeur calée sur la forme d'onde : sans elle le bloc se dimensionne sur son
        // contenu, et un nom à rallonge l'élargit au lieu d'être tronqué.
        <div
          key={track.id}
          className="mt-3 max-w-full"
          style={{ width: DEFAULT_WAVEFORM_OPTIONS.canvWidth }}
        >
          <TrackPlayer
            track={track}
            autoPlay={autoPlayMode}
            sinkId={selectedOutputChannel}
            onChange={onUpdateTrack}
            onRemove={() => onRemoveTrack(track)}
            onEnded={() => onTrackEnded(track)}
            registerControls={registerControls}
          />
        </div>
      ))}

      {/* Le choix du périphérique de sortie n'existe pas sur mobile : sans canal
          énumérable, la liste serait vide et n'aurait rien à offrir. */}
      <div className={`mt-4 mt-auto w-full ${outputChannels.length ? '' : 'hidden'}`}>
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
