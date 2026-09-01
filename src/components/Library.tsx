'use client'

import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronRight,
  CirclePlay,
  GripVertical,
  HelpCircle,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react'
import PlaylistItems, { visibleItems } from './PlaylistItems'
import PlaylistSettingsPanel, { isPlaylistTweaked } from './PlaylistSettingsPanel'
import TooltipButton from './TooltipButton'
import Uploader from './Uploader'
import ImportFileDragOverlay from './ImportFileDragOverlay'
import ViewModePlayerToggle from './ViewModePlayerToggle'
import { useLibrary } from '@/context/LibraryContext'
import { useSortable, type SortableMove } from '@/hooks/useSortable'
import { useTooltip } from '@/hooks/useTooltip'
import { useCookieState } from '@/hooks/useCookieState'
import { useIsNarrow } from '@/hooks/useMediaQuery'
import {
  DB_AddPlaylist,
  DB_RemovePlaylist,
  DB_UpdatePlaylist,
} from '@/persistance/PlaylistService'
import { DB_AddTrack, DB_RemoveTrack, DB_UpdateTrack } from '@/persistance/TrackService'
import { DB_AddImage, DB_RemoveImage, DB_UpdateImage } from '@/persistance/ImageService'
import { createPlaylist } from '@/models/Playlist'
import type Playlist from '@/models/Playlist'
import { createFileTrack } from '@/models/FileTrack'
import type FileTrack from '@/models/FileTrack'
import { createGalleryImage } from '@/models/GalleryImage'
import type GalleryImage from '@/models/GalleryImage'
import { isAudio } from '@/models/LibraryItem'
import type LibraryItem from '@/models/LibraryItem'
import { ensureTrackPeaks } from '@/lib/waveformPeaks'

const HELP_TEXT =
  'Pour ranger directement votre fichier dans une playlist en particulier, ' +
  'préfixez son nom par "Nom_Playlist --". Exemple : "MaPlaylist -- MonFichier"'

interface LibraryProps {
  onPlayAudio: (track: FileTrack) => void
  onOpenImage: (image: GalleryImage) => void
}

interface ResizeState {
  playlistId?: number
  startX: number
  startWidth: number
}

/** Extrait la playlist cible d'un nom de fichier de la forme "Playlist -- Titre". */
function parseName(name: string) {
  const parts = name.split('--')
  let playlistName: string | undefined
  let itemName = name
  if (parts.length > 1) {
    playlistName = parts[0].trim()
    itemName = parts.slice(1).join('--').trim()
  }
  itemName = itemName.replace(/\.[^/.]+$/, '')
  return { playlistName, itemName }
}

/** Renumérote les éléments et les rattache à leur playlist. */
function withOrders(items: LibraryItem[], playlistId?: number): LibraryItem[] {
  return items.map((item, index) => ({ ...item, order: index, playlistId }))
}

function replaceItems(list: Playlist[], playlistId: number | undefined, items: LibraryItem[]) {
  return list.map(playlist => (playlist.id === playlistId ? { ...playlist, items } : playlist))
}

async function persistItems(items: LibraryItem[]) {
  for (const item of items) {
    if (item.kind === 'audio') {
      await DB_UpdateTrack(item)
    } else {
      await DB_UpdateImage(item)
    }
  }
}

async function persistPlaylists(list: Playlist[]) {
  await Promise.all(list.map(playlist => DB_UpdatePlaylist(playlist)))
}

export default function Library({ onPlayAudio, onOpenImage }: LibraryProps) {
  const { playlists, setPlaylists } = useLibrary()

  const [isListView, setIsListView] = useCookieState('viewMode', true, {
    trueValue: 'list',
    falseValue: 'soundboard',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPlaylistId, setEditingPlaylistId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [settingsPlaylistId, setSettingsPlaylistId] = useState<number | null>(null)
  // Playlists repliées. Volontairement non persisté : au rechargement tout est
  // déplié, le repli ne sert qu'à dégager la vue pendant la session.
  const [collapsedPlaylistIds, setCollapsedPlaylistIds] = useState<ReadonlySet<number>>(
    new Set(),
  )

  // Les archives ont leur propre repli, fermé par défaut : c'est une remise,
  // pas une playlist de travail.
  const [archiveOpen, setArchiveOpen] = useState(false)

  // La playlist d'archives vit dans le même state que les autres (déplacements
  // et persistance identiques) mais est rendue à part, en bas.
  const archivePlaylist = playlists.find(playlist => playlist.archive)
  const regularPlaylists = playlists.filter(playlist => !playlist.archive)

  function toggleCollapsed(playlist: Playlist) {
    const id = playlist.id
    if (id == null) return
    setCollapsedPlaylistIds(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const helpRef = useTooltip(HELP_TEXT)
  const addPlaylistTooltip = useTooltip('Ajouter une playlist')
  const playlistsContainer = useRef<HTMLDivElement>(null)

  // Le mode soundboard dispose les playlists en colonnes flottantes de largeur fixe,
  // posée en style inline : aucun point de rupture CSS ne peut l'écraser. Sur petit
  // écran on repasse donc en colonne unique, et la poignée de redimensionnement —
  // qui n'est de toute façon pilotable qu'à la souris — disparaît.
  const isNarrow = useIsNarrow()
  const boardLayout = !isListView && !isNarrow

  // Copie synchronisée de l'état, lisible depuis les handlers natifs (resize) et
  // depuis les boucles d'import qui enchaînent plusieurs `await`.
  const playlistsRef = useRef<Playlist[]>(playlists)
  useEffect(() => {
    playlistsRef.current = playlists
  }, [playlists])

  useSortable(playlistsContainer, handlePlaylistsMove, {
    handle: '.playlist-handle',
    animation: 700,
  })

  // ---------------------------------------------------------------- import

  async function addFileTo(
    list: Playlist[],
    file: File,
    targetPlaylistId?: number,
  ): Promise<Playlist[]> {
    const { playlistName, itemName } = parseName(file.name)

    let next = list

    // Filet de sécurité si un fichier est déposé avant la fin du chargement initial.
    if (!next.length) {
      const defaultPlaylist = createPlaylist('Bibliothèque')
      defaultPlaylist.id = await DB_AddPlaylist(defaultPlaylist)
      next = [defaultPlaylist]
    }

    // Jamais les archives par défaut : un import atterrit dans une vraie playlist.
    let target: Playlist | undefined = next.find(playlist => !playlist.archive) ?? next[0]

    if (targetPlaylistId != null) {
      // Déposé sur une playlist précise : ce geste explicite prime sur le
      // routage par préfixe « Playlist -- » du nom de fichier.
      target = next.find(playlist => playlist.id === targetPlaylistId) ?? target
    } else if (playlistName) {
      const existing = next.find(
        playlist => playlist.name.toLowerCase() === playlistName.toLowerCase(),
      )
      if (existing) {
        target = existing
      } else {
        const created = createPlaylist(playlistName, next.length)
        created.id = await DB_AddPlaylist(created)
        next = [...next, created]
        target = created
      }
    }

    if (!target) return next

    if (file.type.startsWith('image/')) {
      const image: GalleryImage = {
        ...createGalleryImage(file, itemName),
        playlistId: target.id,
        order: target.items.length,
      }
      image.id = await DB_AddImage(image)
      return replaceItems(next, target.id, [...target.items, image])
    }

    if (file.type.startsWith('audio/')) {
      const track: FileTrack = {
        ...createFileTrack(file, itemName),
        playlistId: target.id,
        order: target.items.length,
      }
      track.id = await DB_AddTrack(track)
      // Décodage de la forme d'onde dès l'upload, en arrière-plan : elle sera prête
      // (et persistée) avant que la piste soit lancée.
      void ensureTrackPeaks(track.id, file).catch(() => {})
      return replaceItems(next, target.id, [...target.items, track])
    }

    return next
  }

  async function addFiles(files: File[], targetPlaylistId?: number) {
    // Les ajouts sont enchaînés sur une valeur locale : `playlists` ne serait pas
    // encore rafraîchi entre deux fichiers.
    let current = playlistsRef.current
    for (const file of files) {
      current = await addFileTo(current, file, targetPlaylistId)
    }
    playlistsRef.current = current
    setPlaylists(current)
  }

  // ------------------------------------------------- dépôt ciblé de fichiers

  // Playlist survolée pendant un glissement de fichiers : elle recevra le dépôt.
  // Les compteurs suivent le va-et-vient des `dragenter`/`dragleave`, émis pour
  // chaque enfant traversé (même mécanique que l'overlay d'import).
  const [dropPlaylistId, setDropPlaylistId] = useState<number | null>(null)
  const dropCounters = useRef(new Map<number, number>())

  function isFileDrag(event: DragEvent<HTMLDivElement>): boolean {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files')
  }

  function onPlaylistDragEnter(event: DragEvent<HTMLDivElement>, playlist: Playlist) {
    if (playlist.id == null || !isFileDrag(event)) return
    dropCounters.current.set(playlist.id, (dropCounters.current.get(playlist.id) ?? 0) + 1)
    setDropPlaylistId(playlist.id)
  }

  function onPlaylistDragLeave(event: DragEvent<HTMLDivElement>, playlist: Playlist) {
    const id = playlist.id
    if (id == null || !isFileDrag(event)) return
    const count = (dropCounters.current.get(id) ?? 0) - 1
    dropCounters.current.set(id, Math.max(0, count))
    if (count <= 0) setDropPlaylistId(current => (current === id ? null : current))
  }

  /** Le dépôt lui-même remonte à l'overlay global ; la cible est lue ici. */
  function onFilesDropped(files: File[]) {
    const target = dropPlaylistId
    setDropPlaylistId(null)
    dropCounters.current.clear()
    void addFiles(files, target ?? undefined)
  }

  // ------------------------------------------------------------- playlists

  async function addPlaylist() {
    const created = createPlaylist(`Playlist ${playlists.length}`, playlists.length)
    created.id = await DB_AddPlaylist(created)
    const next = [...playlists, created].map((playlist, index) => ({ ...playlist, order: index }))
    setPlaylists(next)
    await persistPlaylists(next)
  }

  async function removePlaylist(playlist: Playlist) {
    await DB_RemovePlaylist(playlist)
    const next = playlists
      .filter(candidate => candidate.id !== playlist.id)
      .map((candidate, index) => ({ ...candidate, order: index }))
    setPlaylists(next)
    await persistPlaylists(next)
  }

  function startEditingName(playlist: Playlist) {
    setEditingPlaylistId(playlist.id ?? null)
    setEditingName(playlist.name)
  }

  async function savePlaylistName(playlist: Playlist) {
    const name = editingName.trim() || 'Nouvelle Playlist'
    setEditingPlaylistId(null)
    const updated = { ...playlist, name }
    setPlaylists(current =>
      current.map(candidate => (candidate.id === playlist.id ? updated : candidate)),
    )
    await DB_UpdatePlaylist(updated)
  }

  /** Réglages de lecture (mode, fondus par défaut) : appliqués et persistés. */
  async function savePlaylistSettings(updated: Playlist) {
    setPlaylists(current =>
      current.map(candidate => (candidate.id === updated.id ? updated : candidate)),
    )
    await DB_UpdatePlaylist(updated)
  }

  function handlePlaylistsMove({ oldIndex, newIndex }: SortableMove) {
    // Les indices de SortableJS portent sur les playlists affichées dans le
    // conteneur triable — donc sans les archives, rendues à part et toujours
    // recollées en fin de liste.
    const regular = playlistsRef.current.filter(playlist => !playlist.archive)
    const archives = playlistsRef.current.filter(playlist => playlist.archive)
    const [moved] = regular.splice(oldIndex, 1)
    if (!moved) return
    regular.splice(newIndex, 0, moved)

    const ordered = [...regular, ...archives].map((playlist, index) => ({
      ...playlist,
      order: index,
    }))
    setPlaylists(ordered)
    void persistPlaylists(ordered)
  }

  // ------------------------------------------------------------- éléments

  function handleItemsMove({ from, to, oldIndex, newIndex }: SortableMove) {
    const fromId = Number(from.dataset.playlistId)
    const toId = Number(to.dataset.playlistId)

    const next = playlistsRef.current.map(playlist => ({
      ...playlist,
      items: playlist.items.slice(),
    }))
    const source = next.find(playlist => playlist.id === fromId)
    const target = next.find(playlist => playlist.id === toId)
    if (!source || !target) return

    const [moved] = source.items.splice(oldIndex, 1)
    if (!moved) return
    target.items.splice(newIndex, 0, moved)

    source.items = withOrders(source.items, source.id)
    target.items = withOrders(target.items, target.id)

    setPlaylists(next)
    void (async () => {
      await persistItems(source.items)
      if (source !== target) await persistItems(target.items)
    })()
  }

  /**
   * Déplacement sans glisser-déposer : l'élément rejoint la fin de la playlist
   * choisie. Même mécanique que `handleItemsMove`, la position en moins.
   */
  async function moveItemToPlaylist(item: LibraryItem, targetPlaylistId: number) {
    if (item.playlistId === targetPlaylistId) return

    const next = playlistsRef.current.map(playlist => ({
      ...playlist,
      items: playlist.items.slice(),
    }))
    const source = next.find(playlist => playlist.id === item.playlistId)
    const target = next.find(playlist => playlist.id === targetPlaylistId)
    if (!source || !target) return

    const index = source.items.findIndex(
      candidate => candidate.kind === item.kind && candidate.id === item.id,
    )
    if (index === -1) return
    const [moved] = source.items.splice(index, 1)
    target.items.push(moved)

    source.items = withOrders(source.items, source.id)
    target.items = withOrders(target.items, target.id)

    setPlaylists(next)
    await persistItems(source.items)
    await persistItems(target.items)
  }

  /**
   * Archive une piste : déplacement vers la playlist d'archives, créée à la
   * première occasion. Elle restera en base même vidée, simplement masquée.
   */
  async function archiveItem(item: LibraryItem) {
    let archive = playlistsRef.current.find(playlist => playlist.archive)
    if (!archive) {
      archive = {
        ...createPlaylist('Archives', playlistsRef.current.length),
        archive: true,
      }
      archive.id = await DB_AddPlaylist(archive)
      const next = [...playlistsRef.current, archive]
      playlistsRef.current = next
      setPlaylists(next)
    }
    if (archive.id != null) await moveItemToPlaylist(item, archive.id)
  }

  async function removeItem(playlist: Playlist, item: LibraryItem) {
    const remaining = playlist.items.filter(candidate => candidate !== item)
    if (remaining.length === playlist.items.length) return

    const items = withOrders(remaining, playlist.id)
    setPlaylists(current => replaceItems(current, playlist.id, items))

    if (item.kind === 'audio') {
      await DB_RemoveTrack(item)
    } else {
      await DB_RemoveImage(item)
    }
    await persistItems(items)
  }

  // -------------------------------------------------- redimensionnement

  const resizeRef = useRef<ResizeState | null>(null)

  useEffect(() => {
    function onMouseMove(event: globalThis.MouseEvent) {
      const resize = resizeRef.current
      if (!resize) return
      const width = Math.max(150, resize.startWidth + event.clientX - resize.startX)
      setPlaylists(current =>
        current.map(playlist =>
          playlist.id === resize.playlistId ? { ...playlist, width } : playlist,
        ),
      )
    }

    function onMouseUp() {
      const resize = resizeRef.current
      if (!resize) return
      resizeRef.current = null
      const playlist = playlistsRef.current.find(
        candidate => candidate.id === resize.playlistId,
      )
      if (playlist) void DB_UpdatePlaylist(playlist)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [setPlaylists])

  function startResize(event: MouseEvent<HTMLDivElement>, playlist: Playlist) {
    resizeRef.current = {
      playlistId: playlist.id,
      startX: event.clientX,
      startWidth: playlist.width ?? (event.currentTarget.parentElement?.clientWidth || 0),
    }
  }

  // ---------------------------------------------------------------- rendu

  return (
    <div className="w-full bg-gray-800 rounded-lg p-4 pt-2">
      <ImportFileDragOverlay onFilesDropped={onFilesDropped}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center">
            <h2 className="mr-2 text-xl font-bold text-purple-300">Bibliothèque</h2>
            <Uploader onFileSelected={file => void addFiles([file])} />
            <HelpCircle ref={helpRef} className="ml-1 w-5 cursor-help text-gray-400" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              type="text"
              placeholder="Rechercher..."
              className="min-w-0 flex-1 rounded bg-gray-700 px-2 py-1 text-white sm:flex-none"
            />
            <ViewModePlayerToggle isListView={isListView} onChange={setIsListView} />
          </div>
        </div>

        <div ref={playlistsContainer}>
          {regularPlaylists.map(playlist => {
            const collapsed = playlist.id != null && collapsedPlaylistIds.has(playlist.id)
            const settingsOpen = settingsPlaylistId === playlist.id
            return (
            <div
              key={playlist.id}
              className={`bg-gray-700/25 p-3 rounded mt-1 mb-1 flex flex-col relative ${
                boardLayout ? 'float-left mr-2 border-r-[3px] border-purple-900' : ''
              } ${dropPlaylistId === playlist.id ? 'ring-2 ring-purple-400 bg-purple-400/10' : ''}`}
              style={
                boardLayout
                  ? { width: playlist.width ? `${playlist.width}px` : '100%' }
                  : undefined
              }
              // Cible de dépôt de fichiers : repliée ou non, toute la zone de la
              // playlist (en-tête compris) désigne où ranger l'import.
              onDragEnter={event => onPlaylistDragEnter(event, playlist)}
              onDragLeave={event => onPlaylistDragLeave(event, playlist)}
            >
              {boardLayout && (
                <div
                  className="absolute top-0 right-0 w-[10px] h-full cursor-col-resize"
                  style={{ right: '-6px' }}
                  onMouseDown={event => startResize(event, playlist)}
                />
              )}
              <div className="flex items-center mb-2">
                <div className="playlist-handle cursor-move p-1 mr-1 rounded hover:bg-gray-800/25">
                  <GripVertical className="w-5 h-5 text-gray-400" />
                </div>

                {/* Repli de la playlist — état de session uniquement, non persisté. */}
                <TooltipButton
                  className="mr-2 rounded-full p-1 transition-colors hover:bg-gray-400/20"
                  onClick={() => toggleCollapsed(playlist)}
                  aria-expanded={!collapsed}
                  tooltip={collapsed ? 'Déplier la playlist' : 'Replier la playlist'}
                  aria-label={collapsed ? 'Déplier la playlist' : 'Replier la playlist'}
                >
                  {collapsed ? (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </TooltipButton>

                <div className="flex-1">
                  {editingPlaylistId === playlist.id ? (
                    <input
                      value={editingName}
                      onChange={event => setEditingName(event.target.value)}
                      className="bg-gray-600 text-white px-2 py-1 rounded w-full focus:outline-none"
                      autoFocus
                      onBlur={() => void savePlaylistName(playlist)}
                      onKeyUp={event => {
                        if (event.key === 'Enter') void savePlaylistName(playlist)
                      }}
                    />
                  ) : (
                    <p
                      className="text-white font-semibold cursor-pointer"
                      onClick={() => startEditingName(playlist)}
                    >
                      {playlist.name}
                      {/* Replié, le contenu est invisible : on rappelle ce qu'il contient. */}
                      {collapsed && (
                        <span className="ml-2 text-sm font-normal text-gray-400">
                          ({playlist.items.length})
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Lecture de toute la playlist. Le bouton porte sur ce qui est
                    affiché : pendant une recherche, il ne lance pas les pistes
                    masquées. En mode libre elles démarrent ensemble, la file du
                    lecteur étant faite pour superposer les sons ; dans les modes
                    exclusifs on ne lance que la première, chaque ajout arrêtant
                    le précédent — les lancer toutes n'aurait aucun sens. */}
                {(() => {
                  const playable = visibleItems(playlist.items, searchTerm).filter(isAudio)
                  if (!playable.length) return null
                  const together = playlist.mode === 'libre'
                  const title = together
                    ? `Lancer les ${playable.length} pistes de la playlist`
                    : 'Lancer la playlist depuis sa première piste'
                  return (
                    <TooltipButton
                      className="ml-3 rounded-full p-2 transition-colors hover:bg-green-400/20"
                      onClick={() =>
                        together
                          ? playable.forEach(track => onPlayAudio(track))
                          : onPlayAudio(playable[0])
                      }
                      tooltip={title}
                      aria-label={title}
                    >
                      <CirclePlay className="w-5 h-5 text-green-400" />
                    </TooltipButton>
                  )
                })()}

                {/* Réglages de lecture de la playlist — l'icône vire au violet
                    dès que la configuration s'écarte du mode libre sans fondu,
                    et le halo reste allumé tant que le panneau est ouvert.
                    Masqué quand la playlist est repliée : le panneau ne
                    s'afficherait pas de toute façon. */}
                {!collapsed && (
                  <TooltipButton
                    className={`rounded-full p-2 transition-colors ${
                      isPlaylistTweaked(playlist)
                        ? `hover:bg-purple-400/20 ${settingsOpen ? 'bg-purple-400/20' : ''}`
                        : `hover:bg-gray-400/20 ${settingsOpen ? 'bg-gray-400/20' : ''}`
                    }`}
                    onClick={() =>
                      setSettingsPlaylistId(current =>
                        current === playlist.id ? null : (playlist.id ?? null),
                      )
                    }
                    aria-expanded={settingsOpen}
                    tooltip="Réglages de la playlist"
                    aria-label="Réglages de la playlist"
                  >
                    <SlidersHorizontal
                      className={`w-5 h-5 ${
                        isPlaylistTweaked(playlist) ? 'text-purple-400' : 'text-gray-400'
                      }`}
                    />
                  </TooltipButton>
                )}

                {playlist.items.length === 0 && (
                  <TooltipButton
                    className="p-2 hover:bg-red-700/20 rounded-full transition-colors ml-3"
                    onClick={() => void removePlaylist(playlist)}
                    tooltip="Supprimer la playlist"
                    aria-label="Supprimer la playlist"
                  >
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </TooltipButton>
                )}
              </div>

              {/* Tiroir animé du repli : une ligne de grille qui passe de 1fr à
                  0fr — la seule façon CSS d'animer vers une hauteur `auto`. Le
                  contenu reste monté, c'est le wrapper qui l'écrase ; `inert`
                  le sort du parcours clavier tant qu'il est replié. */}
              <div
                className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
                inert={collapsed}
              >
                <div className="min-h-0 overflow-hidden">
                  {settingsOpen && (
                    <PlaylistSettingsPanel
                      playlist={playlist}
                      onChange={updated => void savePlaylistSettings(updated)}
                    />
                  )}

                  <PlaylistItems
                    playlist={playlist}
                    isListView={isListView}
                    searchTerm={searchTerm}
                    onMove={handleItemsMove}
                    onMoveToPlaylist={(item, targetId) => void moveItemToPlaylist(item, targetId)}
                    onArchiveItem={item => void archiveItem(item)}
                    onRemoveItem={removeItem}
                    onPlayAudio={onPlayAudio}
                    onOpenImage={onOpenImage}
                  />
                </div>
              </div>
            </div>
            )
          })}
        </div>
        <div className="clear-both" />

        <div
          className="bg-gray-700/25 p-3 rounded mt-1 mb-1
         border-2 border-dashed border-gray-400
         flex items-center justify-center
         cursor-pointer hover:bg-gray-800/25 transition-colors"
          onClick={() => void addPlaylist()}
          ref={addPlaylistTooltip}
        >
          <Plus className="w-6 h-6 text-purple-500" />
        </div>

        {/* Archives : tout en bas, invisibles tant que rien n'y est rangé.
            Volontairement dépouillées — ni lecture globale, ni réglages, ni
            suppression, ni poignée : on y consulte, on en ressort des pistes
            (menu « Déplacer vers… »), c'est tout. */}
        {archivePlaylist && archivePlaylist.items.length > 0 && (
          <div className="mt-1 mb-1 flex flex-col rounded bg-gray-700/25 p-3">
            <div className="flex items-center">
              <TooltipButton
                className="mr-2 rounded-full p-1 transition-colors hover:bg-gray-400/20"
                onClick={() => setArchiveOpen(open => !open)}
                aria-expanded={archiveOpen}
                tooltip={archiveOpen ? 'Replier les archives' : 'Déplier les archives'}
                aria-label={archiveOpen ? 'Replier les archives' : 'Déplier les archives'}
              >
                {archiveOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </TooltipButton>
              <Archive className="mr-2 w-4 h-4 text-gray-400" />
              {/* Tons gris : une remise, pas une playlist comme les autres. */}
              <p className="font-semibold text-gray-400">
                {archivePlaylist.name}{' '}
                <span className="text-sm font-normal">({archivePlaylist.items.length})</span>
              </p>
            </div>

            <div
              className="grid transition-[grid-template-rows] duration-300 ease-in-out"
              style={{ gridTemplateRows: archiveOpen ? '1fr' : '0fr' }}
              inert={!archiveOpen}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pt-2">
                  <PlaylistItems
                    playlist={archivePlaylist}
                    isListView={isListView}
                    searchTerm={searchTerm}
                    onMove={handleItemsMove}
                    onMoveToPlaylist={(item, targetId) => void moveItemToPlaylist(item, targetId)}
                    onArchiveItem={item => void archiveItem(item)}
                    onRemoveItem={removeItem}
                    onPlayAudio={onPlayAudio}
                    onOpenImage={onOpenImage}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </ImportFileDragOverlay>
    </div>
  )
}
