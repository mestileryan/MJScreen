'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Library from './Library'
import TracksPlayer from './TracksPlayer'
import type { TrackControls } from './TrackPlayer'
// Barre latérale rétractable pour le lecteur
import CollapsibleSidebar from './CollapsibleSidebar'
// Modale d'import/export
import SettingsModal from './SettingsModal'
import WaveformProgressBadge from './WaveformProgressBadge'
import { useCookieState, useCookieText } from '@/hooks/useCookieState'
import { usePlayerQueue } from '@/hooks/usePlayerQueue'
import { usePresentationWindow } from '@/hooks/usePresentationWindow'
import { useTrackLink } from '@/hooks/useTrackLink'
import { useTooltip } from '@/hooks/useTooltip'
import { useLibrary } from '@/context/LibraryContext'
import {
  DEFAULT_PROJECT_TITLE,
  FORBIDDEN_TITLE_CHARS_LABEL,
  PROJECT_TITLE_COOKIE,
  stripForbiddenTitleChars,
} from '@/lib/projectTitle'
import { isAudio } from '@/models/LibraryItem'
import type FileTrack from '@/models/FileTrack'
import type Track from '@/models/Track'

export default function Screen() {
  const { tracks, addTrack, updateTrack, removeTrack, removeAllTracks } = usePlayerQueue()
  const { playlists, findTrack } = useLibrary()
  const { present, openViewer } = usePresentationWindow()

  const [showSettings, setShowSettings] = useState(false)
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useCookieState('playerCollapsed', false, {
    trueValue: 'true',
    falseValue: 'false',
  })

  // Titre du projet : cosmétique, il donne son nom au fichier d'export et se
  // retrouve depuis le nom du fichier à l'import.
  const [projectTitle, setProjectTitle] = useCookieText(
    PROJECT_TITLE_COOKIE,
    DEFAULT_PROJECT_TITLE,
  )
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleTooltip = useTooltip('Renommer le projet')

  // Le titre nomme le fichier d'export : les caractères impossibles dans un nom
  // de fichier sont refusés dès la saisie, avec une bulle qui les liste —
  // plutôt qu'un remplacement silencieux à l'export qui semble bogué.
  const [showForbiddenHint, setShowForbiddenHint] = useState(false)
  const forbiddenHintTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (forbiddenHintTimer.current !== null) {
        window.clearTimeout(forbiddenHintTimer.current)
      }
    }
  }, [])

  function startEditingTitle() {
    setTitleDraft(projectTitle)
    setIsEditingTitle(true)
  }

  function updateTitleDraft(raw: string) {
    const cleaned = stripForbiddenTitleChars(raw)
    if (cleaned !== raw) {
      setShowForbiddenHint(true)
      if (forbiddenHintTimer.current !== null) {
        window.clearTimeout(forbiddenHintTimer.current)
      }
      forbiddenHintTimer.current = window.setTimeout(() => setShowForbiddenHint(false), 2500)
    }
    setTitleDraft(cleaned)
  }

  function saveProjectTitle() {
    setIsEditingTitle(false)
    setShowForbiddenHint(false)
    // Vider le champ revient au titre par défaut.
    setProjectTitle(titleDraft.trim())
  }

  // Registre des commandes des pistes en file. Il vit ici et non dans le lecteur :
  // les modes de playlist (enchaînement, classique) doivent pouvoir arrêter une
  // piste en respectant son fondu de sortie, ce que seul TrackPlayer sait faire.
  const controls = useRef(new Map<number, TrackControls>())

  const registerControls = useCallback((id: number, trackControls: TrackControls | null) => {
    if (trackControls) controls.current.set(id, trackControls)
    else controls.current.delete(id)
  }, [])

  /**
   * Playlist d'origine d'une entrée de la file — la version vivante de la piste
   * fait foi, l'instantané embarqué peut dater d'avant un déplacement.
   */
  function playlistOf(queued: Track) {
    const playlistId = findTrack(queued.fileTrack.id)?.playlistId ?? queued.fileTrack.playlistId
    return playlists.find(candidate => candidate.id === playlistId)
  }

  /** Retire de la file, fondus compris, les pistes de la playlist donnée. */
  function stopPlaylistTracks(playlistId: number, exceptQueueId?: number) {
    for (const queued of tracks) {
      if (queued.id === exceptQueueId) continue
      if (playlistOf(queued)?.id === playlistId) {
        controls.current.get(queued.id)?.stopAndRemove()
      }
    }
  }

  /** Lecture depuis la bibliothèque, en respectant le mode de la playlist. */
  function playAudio(fileTrack: FileTrack) {
    const playlist = playlists.find(candidate => candidate.id === fileTrack.playlistId)
    // Enchaînement et classique sont exclusifs : la nouvelle piste remplace celle
    // de la playlist en cours de lecture — l'une sort en fondu pendant que
    // l'autre entre, et elle démarre même si l'autoplay global est coupé.
    const exclusive = playlist !== undefined && playlist.mode !== 'libre'
    if (exclusive && playlist.id !== undefined) stopPlaylistTracks(playlist.id)
    addTrack(fileTrack, exclusive)
  }

  /** Mode classique : une piste finie enchaîne sur la suivante de sa playlist. */
  function handleTrackEnded(queued: Track) {
    const playlist = playlistOf(queued)
    if (playlist?.mode !== 'classique' || playlist.id === undefined) return

    const audios = playlist.items.filter(isAudio)
    const index = audios.findIndex(candidate => candidate.id === queued.fileTrack.id)
    // Piste retirée de la playlist entre-temps : on ne sait plus où enchaîner.
    if (index === -1) return
    // La playlist boucle sur elle-même : après la dernière piste, la première.
    const next = audios[(index + 1) % audios.length]

    addTrack(next, true)
  }

  // Register logic that handles ?trackId= links and inter-tab communication
  const { toastMessage, externalMessage } = useTrackLink(addTrack)

  return (
    <div
      /* Sur téléphone la grille à deux colonnes est impossible : le lecteur devient
         un panneau fixé en bas de l'écran, la bibliothèque prend toute la largeur. */
      className={`min-h-screen bg-gray-900 md:grid ${
        isPlayerCollapsed ? 'md:grid-cols-[1fr_1.5rem]' : 'md:grid-cols-[1fr_24rem]'
      }`}
    >
      {/* Avancement du calcul des formes d'onde (z-40 : un toast d'erreur passe devant) */}
      <WaveformProgressBadge />

      {/* Error notification for invalid track links */}
      {toastMessage && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-3 py-2 rounded z-50">
          {toastMessage}
        </div>
      )}

      {/* Inform the user that another tab already runs the application */}
      {externalMessage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          tabIndex={0}
        >
          <div className="bg-gray-800 p-6 rounded flex flex-col items-center gap-4">
            {/* Message interne à l'application, il contient une balise <br>. */}
            <p
              className="text-white text-center"
              dangerouslySetInnerHTML={{ __html: externalMessage }}
            />
          </div>
        </div>
      )}

      {/* `pb-20` dégage la barre du lecteur, fixée en bas sur petit écran. */}
      <div className="overflow-auto p-4 pb-20 sm:p-6 sm:pb-20 md:min-w-[522px] md:p-8">
        <div className="mb-4 flex items-center justify-between sm:mb-8">
          {isEditingTitle ? (
            <div className="relative w-full max-w-xl">
              <input
                value={titleDraft}
                onChange={event => updateTitleDraft(event.target.value)}
                className="w-full rounded bg-gray-800 px-2 text-2xl font-bold
                  text-purple-400 focus:outline-none sm:text-3xl"
                autoFocus
                onBlur={saveProjectTitle}
                onKeyUp={event => {
                  if (event.key === 'Enter') saveProjectTitle()
                }}
              />
              {showForbiddenHint && (
                <p
                  className="absolute left-0 top-full z-10 mt-1 rounded border border-red-400/50
                    bg-gray-900 px-2 py-1 text-xs text-red-300 shadow-lg"
                >
                  Caractères interdits : {FORBIDDEN_TITLE_CHARS_LABEL}
                </p>
              )}
            </div>
          ) : (
            <h1
              ref={titleTooltip}
              className="cursor-pointer truncate text-2xl font-bold text-purple-400 sm:text-3xl"
              onClick={startEditingTitle}
            >
              {projectTitle}
            </h1>
          )}
        </div>

        <div className="space-y-6">
          <Library onPlayAudio={playAudio} onOpenImage={present} />
        </div>
      </div>

      <CollapsibleSidebar
        collapsed={isPlayerCollapsed}
        onCollapsedChange={setIsPlayerCollapsed}
        onOpenSettings={() => setShowSettings(true)}
      >
        <TracksPlayer
          tracks={tracks}
          controls={controls}
          registerControls={registerControls}
          onUpdateTrack={updateTrack}
          onRemoveTrack={removeTrack}
          onRemoveAllTracks={removeAllTracks}
          onTrackEnded={handleTrackEnded}
          onOpenViewer={openViewer}
        />
      </CollapsibleSidebar>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
