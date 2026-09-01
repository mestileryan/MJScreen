'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Pause,
  Play,
  Repeat1,
  SkipBack,
  Square,
  Volume,
  Volume1,
  Volume2,
  VolumeOff,
  X,
} from 'lucide-react'
import { useLibrary } from '@/context/LibraryContext'
import { useAudioWaveform, DEFAULT_WAVEFORM_OPTIONS } from '@/hooks/useAudioWaveform'
import TrackEffectsPanel from './TrackEffectsPanel'
import {
  createTrackGraph,
  resumePlaybackContext,
  setPlaybackSink,
  type TrackAudioGraph,
} from '@/lib/audioGraph'
import { gainForPosition, positionForGain } from '@/lib/loudness'
import { isNeutral, needsAudioGraph, resolveFades, withDefaults } from '@/models/TrackEffects'
import type TrackEffects from '@/models/TrackEffects'
import type Track from '@/models/Track'

export interface TrackControls {
  play: () => void
  pause: () => void
  /** Fondu de sortie s'il y en a un, puis retrait de la file. */
  stopAndRemove: () => void
}

interface TrackPlayerProps {
  track: Track
  autoPlay: boolean
  sinkId: string
  onChange: (track: Track) => void
  onRemove: () => void
  /** La piste est arrivée au bout sans boucler — avant son retrait de la file. */
  onEnded: () => void
  /** Permet au parent de piloter « tout jouer / tout mettre en pause ». */
  registerControls: (id: number, controls: TrackControls | null) => void
}

/** `setSinkId` n'est pas encore dans les typages DOM standards. */
function setSink(audio: HTMLAudioElement, sinkId: string): Promise<void> {
  const withSink = audio as unknown as { setSinkId?: (id: string) => Promise<void> }
  if (!sinkId || typeof withSink.setSinkId !== 'function') return Promise.resolve()
  return withSink.setSinkId(sinkId)
}

/** `preservesPitch` n'est pas déclaré partout ; le désactiver donne l'effet « bande ». */
function setPlaybackRate(audio: HTMLAudioElement, semitones: number): void {
  const withPitch = audio as HTMLAudioElement & { preservesPitch?: boolean }
  withPitch.preservesPitch = false
  audio.playbackRate = Math.pow(2, semitones / 12)
}

export default function TrackPlayer({
  track,
  autoPlay,
  sinkId,
  onChange,
  onRemove,
  onEnded,
  registerControls,
}: TrackPlayerProps) {
  const { findTrack, saveItem, playlists } = useLibrary()
  const player = useRef<HTMLAudioElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showEffects, setShowEffects] = useState(false)
  /** Fondu en cours, pour afficher une attente sur le bouton de lecture. */
  const [fading, setFading] = useState<'in' | 'out' | null>(null)

  // Version courante de la piste dans la bibliothèque, si elle y est toujours.
  const live = findTrack(track.fileTrack.id)

  // Les réglages suivent la piste de la bibliothèque ; on retombe sur l'instantané
  // de la file si elle en a été retirée.
  const storedEffects = live?.effects ?? track.fileTrack.effects
  const stored = useMemo(() => withDefaults(storedEffects), [storedEffects])

  // Fondus par défaut de la playlist d'origine, appliqués aux pistes qui n'ont
  // pas écrasé le réglage. `stored` reste la vérité de ce que porte la piste,
  // `effects` est la version résolue que joue le lecteur.
  const playlist = playlists.find(
    candidate => candidate.id === (live?.playlistId ?? track.fileTrack.playlistId),
  )
  const playlistFadeIn = playlist?.fadeIn ?? 0
  const playlistFadeOut = playlist?.fadeOut ?? 0
  const effects = useMemo(
    () => resolveFades(stored, { fadeIn: playlistFadeIn, fadeOut: playlistFadeOut }),
    [stored, playlistFadeIn, playlistFadeOut],
  )

  // Les crêtes sont persistées par piste dans Dexie : après le premier décodage
  // (à l'upload ou en backfill), l'affichage de la forme d'onde est immédiat.
  useAudioWaveform(player, canvas, track.fileTrack.file, track.fileTrack.id)

  // ------------------------------------------------------------- graphe audio

  const graph = useRef<TrackAudioGraph | null>(null)

  // Le graphe n'est monté qu'à la première demande, et jamais démonté ensuite :
  // `createMediaElementSource` est irréversible. Une piste restée neutre continue
  // donc de sortir par son élément, en conservant `setSinkId` dessus.
  useEffect(() => {
    if (!player.current) return
    if (!graph.current) {
      // Rien à router tant qu'aucun effet n'est actif.
      if (!needsAudioGraph(effects)) return
      graph.current = createTrackGraph(player.current)
      setPlaybackSink(sinkId)
    }
    // Une fois le graphe en place, il suit les réglages en toutes circonstances —
    // y compris le retour au neutre, sans quoi il resterait figé sur le dernier
    // effet actif.
    graph.current.apply(effects)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effects])

  useEffect(() => {
    const current = graph
    return () => {
      current.current?.dispose()
      current.current = null
    }
  }, [])

  // Hauteur : obtenue par la vitesse de lecture, sans passer par le graphe.
  useEffect(() => {
    if (player.current) setPlaybackRate(player.current, effects.detune)
  }, [effects.detune])

  // ------------------------------------------------------------- lecture

  // Un fondu est asynchrone : ce jeton invalide celui qui serait dépassé par un
  // ordre plus récent (relance pendant un fondu de sortie, par exemple).
  const fadeRun = useRef(0)
  const fadeTimer = useRef<number | null>(null)

  function clearFadeTimer() {
    if (fadeTimer.current !== null) {
      window.clearTimeout(fadeTimer.current)
      fadeTimer.current = null
    }
  }

  useEffect(() => clearFadeTimer, [])

  function startPlayback() {
    const audio = player.current
    if (!audio || isPlaying) return
    resumePlaybackContext()

    const run = ++fadeRun.current
    clearFadeTimer()

    if (graph.current) {
      // Le fondu doit être programmé avant que le son ne sorte.
      graph.current.fadeIn(effects.fadeIn)
      setPlaybackSink(sinkId)
      if (effects.fadeIn > 0) {
        setFading('in')
        fadeTimer.current = window.setTimeout(() => {
          if (fadeRun.current === run) setFading(null)
        }, effects.fadeIn * 1000)
      } else {
        setFading(null)
      }
    } else {
      // setSinkId peut rejeter (périphérique débranché) : on lit alors sur la sortie courante.
      setSink(audio, sinkId).catch(() => {})
      setFading(null)
    }

    audio.play().catch(() => {})
  }

  /** Arrête la piste en respectant le fondu de sortie. */
  async function stopPlayback() {
    const audio = player.current
    if (!audio || audio.paused) return

    const run = ++fadeRun.current
    clearFadeTimer()

    if (graph.current && effects.fadeOut > 0) {
      setFading('out')
      await graph.current.fadeOut(effects.fadeOut)
      // Un ordre plus récent est passé pendant le fondu : il fait autorité.
      if (fadeRun.current !== run) return
      if (!player.current || player.current.paused) {
        setFading(null)
        return
      }
    }

    setFading(null)
    audio.pause()
    graph.current?.cancelFade()
  }

  // Le parent pilote « tout jouer / tout mettre en pause » — et les enchaînements
  // de playlist — à travers ces enveloppes stables, qui relisent les handlers
  // courants à chaque appel : elles passent donc bien par les fondus.
  const playRef = useRef(startPlayback)
  const pauseRef = useRef(stopPlayback)
  const removeRef = useRef(() => Promise.resolve())
  useEffect(() => {
    playRef.current = startPlayback
    pauseRef.current = stopPlayback
    removeRef.current = removeWithFade
  })

  useEffect(() => {
    registerControls(track.id, {
      play: () => playRef.current(),
      pause: () => void pauseRef.current(),
      stopAndRemove: () => void removeRef.current(),
    })
    return () => registerControls(track.id, null)
  }, [track.id, registerControls])

  // Volume initial + autoplay au montage
  useEffect(() => {
    if (player.current) {
      player.current.volume = track.volume
      setPlaybackRate(player.current, effects.detune)
    }
    // Une piste peut arriver sans geste utilisateur (lien ?trackId=, message
    // inter-onglets) : le navigateur refuse alors play(). On avale le rejet — la
    // piste reste en file, en pause, avec le bouton Play affiché.
    // Démarrage différé d'une micro-tâche : `startPlayback` publie l'état du fondu,
    // ce qui n'a pas sa place dans le corps synchrone d'un effet.
    if (autoPlay || track.forceAutoPlay) queueMicrotask(startPlayback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Répercute le canal de sortie choisi
  useEffect(() => {
    if (!sinkId) return
    if (graph.current) {
      setPlaybackSink(sinkId)
      return
    }
    if (!player.current) return
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

  function togglePlay() {
    if (isPlaying) void stopPlayback()
    else startPlayback()
  }

  /** Repart du début sans interrompre la lecture en cours. */
  function rewind() {
    if (player.current) player.current.currentTime = 0
  }

  /**
   * Arrêt : comme la pause, fondu de sortie compris, puis retour au début.
   * On ne rembobine que si la piste s'est réellement arrêtée — un ordre plus
   * récent a pu reprendre la lecture pendant le fondu.
   */
  async function stopAndRewind() {
    await stopPlayback()
    if (player.current?.paused) player.current.currentTime = 0
  }

  // Coupure du son : volontairement éphémère, elle ne touche pas au volume
  // enregistré de la piste. Un ref suffit, l'icône se déduisant de `track.volume`.
  const mutedFrom = useRef<number | null>(null)

  function toggleMute() {
    if (track.volume > 0) {
      mutedFrom.current = track.volume
      applyVolume(0)
      return
    }
    // Curseur déjà à zéro sans coupure préalable : on retrouve le volume de la
    // bibliothèque plutôt que de laisser un bouton sans effet.
    applyVolume(mutedFrom.current ?? live?.initialVolume ?? 1)
    mutedFrom.current = null
  }

  function toggleLoop() {
    const loop = !track.loop
    lastLibraryLoop.current = loop
    onChange({ ...track, loop })
    if (live) void saveItem({ ...live, loop })
  }

  /** Applique un volume à la lecture et à la file, sans rien enregistrer. */
  function applyVolume(volume: number) {
    if (player.current) player.current.volume = volume
    onChange({ ...track, volume })
  }

  // Le curseur agit immédiatement sur la lecture ; l'écriture en base attend le relâchement.
  function updateVolume(volume: number) {
    lastLibraryVolume.current = volume
    // Bouger le curseur lève la coupure.
    mutedFrom.current = null
    applyVolume(volume)
  }

  function commitVolume() {
    if (live) void saveItem({ ...live, initialVolume: track.volume })
  }

  /** Les réglages avancés sont enregistrés sur la piste de la bibliothèque. */
  function updateEffects(next: TrackEffects) {
    if (live) void saveItem({ ...live, effects: next })
  }

  /** Retire la piste de la file, après le fondu de sortie s'il y en a un. */
  async function removeWithFade() {
    if (graph.current && effects.fadeOut > 0 && !player.current?.paused) {
      const run = ++fadeRun.current
      clearFadeTimer()
      setFading('out')
      await graph.current.fadeOut(effects.fadeOut)
      // La piste a pu être relancée ou arrêtée autrement entre-temps.
      if (fadeRun.current !== run) return
    }
    onRemove()
  }

  // Gère la fin de la lecture : la piste quitte la file si elle ne boucle pas.
  // `onEnded` part avant le retrait, pour qu'une playlist en mode classique
  // puisse enchaîner sur la piste suivante.
  function handleTrackEnd() {
    setIsPlaying(false)
    fadeRun.current++
    clearFadeTimer()
    setFading(null)
    if (!track.loop) {
      onEnded()
      onRemove()
    }
  }

  // Le chevron signale les réglages propres à la piste : un fondu simplement
  // hérité de la playlist n'en fait pas partie.
  const tweaked = !isNeutral(stored)

  // Le halo de survol reprend la teinte de l'icône, comme la rangée d'outils du haut.
  // Les classes sont écrites en entier : Tailwind ne peut pas les deviner à l'exécution.
  const playHalo =
    fading === 'in' || (!fading && !isPlaying)
      ? 'hover:bg-green-400/20'
      : 'hover:bg-gray-400/20'
  const loopHalo = track.loop ? 'hover:bg-purple-400/20' : 'hover:bg-gray-400/20'
  const volumeHalo = track.volume === 0 ? 'hover:bg-red-400/20' : 'hover:bg-purple-400/20'
  const effectsHalo = tweaked ? 'hover:bg-purple-400/20' : 'hover:bg-gray-400/20'

  // Position affichée du curseur, dérivée de l'amplitude enregistrée.
  const volumePosition = positionForGain(track.volume)

  const fadeTitle =
    fading === 'in'
      ? 'Fondu d’entrée en cours'
      : fading === 'out'
        ? 'Fondu de sortie en cours'
        : undefined

  return (
    <>
      <p className="mb-1 truncate text-xs text-white">
        {/* La playlist d'origine situe la piste d'un coup d'œil, en retrait
            pour ne pas voler la vedette au titre. */}
        {playlist && <span className="text-gray-400">({playlist.name})</span>} {track.name}
      </p>
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
        /* `max-w-full` et non `w-full` : la forme d'onde garde sa taille native de
           300 px sur grand écran, et ne rétrécit que si le panneau est plus étroit. */
        className="max-w-full rounded bg-gray-600 mb-1"
      />

      {/* Boutons Play/Pause et Boucler */}
      <div className="flex gap-1">
        <button
          className="rounded-full hover:bg-purple-400/20 transition-colors"
          onClick={rewind}
          title="Revenir au début"
          aria-label="Revenir au début"
        >
          <SkipBack className="w-5 h-5 text-purple-400" />
        </button>
        <button
          className={`rounded-full transition-colors ${playHalo}`}
          onClick={togglePlay}
          title={fadeTitle}
        >
          {fading ? (
            // Le son monte ou descend : l'attente reprend la couleur de l'action
            // en cours, vert pour un démarrage, gris pour un arrêt.
            <LoaderCircle
              className={`w-5 h-5 animate-spin ${
                fading === 'in' ? 'text-green-400' : 'text-gray-400'
              }`}
            />
          ) : isPlaying ? (
            <Pause className="w-5 h-5 text-gray-400" />
          ) : (
            <Play className="w-5 h-5 text-green-400" />
          )}
        </button>
        <button
          className="rounded-full hover:bg-red-400/20 transition-colors"
          onClick={() => void stopAndRewind()}
          title={fadeTitle ?? 'Arrêter et revenir au début'}
          aria-label="Arrêter et revenir au début"
        >
          {/* L'attente garde ici la teinte du bouton : l'arrêt reste l'arrêt,
              quel que soit le sens du fondu. */}
          {fading ? (
            <LoaderCircle className="w-5 h-5 animate-spin text-red-400" />
          ) : (
            <Square className="w-5 h-5 text-red-400" />
          )}
        </button>
        {/* Retrait de la file, dans le groupe de transport : au bord droit il
            était trop excentré pour une action courante. À gauche du repeat, il
            prolonge le duo rouge arrêt/retrait plutôt que de fermer la rangée. */}
        <button
          className="rounded-full transition-colors hover:bg-red-400/20"
          onClick={() => void removeWithFade()}
          title="Retirer de la file"
          aria-label="Retirer de la file"
        >
          <X className="w-5 h-5 text-red-400" />
        </button>
        <button
          className={`rounded-full transition-colors ${loopHalo}`}
          onClick={toggleLoop}
        >
          <Repeat1 className={`w-5 h-5 ${track.loop ? 'text-purple-400' : 'text-gray-400'}`} />
        </button>

        {/* L'indicateur de volume coupe et rétablit le son d'un clic. */}
        <button
          className={`ml-1 mr-1 rounded-full transition-colors ${volumeHalo}`}
          onClick={toggleMute}
          title={track.volume === 0 ? 'Rétablir le son' : 'Couper le son'}
          aria-label={track.volume === 0 ? 'Rétablir le son' : 'Couper le son'}
        >
          {/* L'icône suit la position du curseur, pas l'amplitude brute. */}
          {volumePosition === 0 && <VolumeOff className="w-5 h-5 text-red-400" />}
          {volumePosition > 0 && volumePosition <= 0.33 && (
            <Volume className="w-5 h-5 text-purple-400" />
          )}
          {volumePosition > 0.33 && volumePosition <= 0.66 && (
            <Volume1 className="w-5 h-5 text-purple-400" />
          )}
          {volumePosition > 0.66 && <Volume2 className="w-5 h-5 text-purple-400" />}
        </button>

        <input
          className="w-20"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volumePosition}
          onChange={event => updateVolume(gainForPosition(Number(event.target.value)))}
          onPointerUp={commitVolume}
          onKeyUp={commitVolume}
        />

        {/* Réglages avancés — le chevron vire au violet dès qu'un effet est actif */}
        <button
          className={`ml-auto rounded-full transition-colors ${effectsHalo}`}
          onClick={() => setShowEffects(open => !open)}
          aria-expanded={showEffects}
          aria-label="Réglages avancés"
          title="Réglages avancés"
        >
          {showEffects ? (
            <ChevronDown className={`w-5 h-5 ${tweaked ? 'text-purple-400' : 'text-gray-400'}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${tweaked ? 'text-purple-400' : 'text-gray-400'}`} />
          )}
        </button>

      </div>

      {showEffects && (
        <TrackEffectsPanel
          effects={stored}
          inheritedFades={{ fadeIn: playlistFadeIn, fadeOut: playlistFadeOut }}
          onChange={updateEffects}
        />
      )}
    </>
  )
}
