'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { DB_GetPlaylists, DB_AddPlaylist } from '@/persistance/PlaylistService'
import { DB_GetTracks, DB_UpdateTrack } from '@/persistance/TrackService'
import { DB_GetImages, DB_UpdateImage } from '@/persistance/ImageService'
import { createPlaylist } from '@/models/Playlist'
import type Playlist from '@/models/Playlist'
import type LibraryItem from '@/models/LibraryItem'
import type FileTrack from '@/models/FileTrack'

/**
 * Etat partagé de la bibliothèque.
 *
 * En Vue, la bibliothèque et le lecteur manipulaient la *même* instance de
 * `FileTrack` : régler le volume dans le lecteur mettait à jour le curseur de la
 * bibliothèque, et réciproquement. Les modèles étant désormais immuables, ce lien
 * passe par ce contexte : le lecteur retrouve la piste vivante via `findTrack` et
 * publie ses changements via `saveItem`.
 */
interface LibraryContextValue {
  playlists: Playlist[]
  setPlaylists: Dispatch<SetStateAction<Playlist[]>>
  /** Retourne la version courante d'une piste de la bibliothèque. */
  findTrack: (id: number | undefined) => FileTrack | undefined
  /**
   * Remplace un élément dans sa playlist, sans écrire en base.
   * Utilisé pendant un glissement de curseur, pour que la modification se propage
   * immédiatement aux autres vues sans marteler IndexedDB.
   */
  patchItem: (item: LibraryItem) => void
  /** Remplace un élément dans sa playlist et le persiste. */
  saveItem: (item: LibraryItem) => Promise<void>
}

const LibraryContext = createContext<LibraryContextValue | null>(null)

export function useLibrary(): LibraryContextValue {
  const context = useContext(LibraryContext)
  if (!context) {
    throw new Error('useLibrary doit être utilisé dans un <LibraryProvider>')
  }
  return context
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])

  // React monte les composants deux fois en développement (StrictMode) : sans ce
  // garde-fou une playlist « Bibliothèque » serait créée en double au premier lancement.
  const loadedRef = useRef(false)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    void (async () => {
      let loadedPlaylists = await DB_GetPlaylists()

      if (!loadedPlaylists.length) {
        const defaultPlaylist = createPlaylist('Bibliothèque')
        defaultPlaylist.id = await DB_AddPlaylist(defaultPlaylist)
        loadedPlaylists = [defaultPlaylist]
      }

      const [loadedTracks, loadedImages] = await Promise.all([DB_GetTracks(), DB_GetImages()])

      // Les éléments orphelins (playlist supprimée) retombent dans la première playlist.
      const byId = new Map(loadedPlaylists.map(pl => [pl.id, pl]))
      const fallback = loadedPlaylists[0]

      for (const item of [...loadedTracks, ...loadedImages]) {
        const playlist = byId.get(item.playlistId) ?? fallback
        playlist.items.push({ ...item, playlistId: playlist.id })
      }

      for (const playlist of loadedPlaylists) {
        playlist.items.sort((a, b) => a.order - b.order)
      }

      setPlaylists(loadedPlaylists)
    })()
  }, [])

  const findTrack = useCallback(
    (id: number | undefined): FileTrack | undefined => {
      if (id == null) return undefined
      for (const playlist of playlists) {
        for (const item of playlist.items) {
          if (item.kind === 'audio' && item.id === id) return item
        }
      }
      return undefined
    },
    [playlists],
  )

  const patchItem = useCallback((item: LibraryItem) => {
    setPlaylists(current =>
      current.map(playlist => {
        const index = playlist.items.findIndex(
          candidate => candidate.kind === item.kind && candidate.id === item.id,
        )
        if (index === -1) return playlist
        const items = playlist.items.slice()
        items[index] = item
        return { ...playlist, items }
      }),
    )
  }, [])

  const saveItem = useCallback(
    async (item: LibraryItem) => {
      patchItem(item)
      if (item.kind === 'audio') {
        await DB_UpdateTrack(item)
      } else {
        await DB_UpdateImage(item)
      }
    },
    [patchItem],
  )

  return (
    <LibraryContext.Provider
      value={{ playlists, setPlaylists, findTrack, patchItem, saveItem }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
