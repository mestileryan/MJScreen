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
import {
  DB_GetTracks,
  DB_UpdateTrack,
  DB_GetTrackIdsMissingPeaks,
} from '@/persistance/TrackService'
import { DB_GetImages, DB_UpdateImage } from '@/persistance/ImageService'
import { ensureTrackPeaks } from '@/lib/waveformPeaks'
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
  /**
   * Avancement du calcul des formes d'onde manquantes, `null` quand il n'y a
   * rien à faire ou que c'est terminé.
   */
  waveformProgress: WaveformProgress | null
}

export interface WaveformProgress {
  done: number
  total: number
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
  const [waveformProgress, setWaveformProgress] = useState<WaveformProgress | null>(null)

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

      // Backfill des formes d'onde : les pistes jamais décodées (bibliothèque
      // antérieure à la persistance des crêtes, ou fraîchement importée) le sont
      // une par une en arrière-plan, avec une pause après chaque décodage pour
      // laisser le CPU à l'utilisateur.
      const backfillPeaks = async () => {
        // La liste est établie ici, à l'intérieur du verrou : un onglet qui a
        // attendu son tour ne recompte pas le travail déjà fait par un autre.
        const byId = new Map(loadedTracks.map(track => [track.id, track]))
        const pending = (await DB_GetTrackIdsMissingPeaks()).filter(id => byId.has(id))
        if (!pending.length) return

        setWaveformProgress({ done: 0, total: pending.length })
        try {
          for (const [index, id] of pending.entries()) {
            const track = byId.get(id)
            try {
              if (track) await ensureTrackPeaks(id, track.file)
            } catch {
              // Piste illisible : la forme d'onde restera vide, la lecture reste possible.
            }
            setWaveformProgress({ done: index + 1, total: pending.length })
            // Pause entre deux décodages pour laisser le CPU à l'utilisateur ;
            // inutile après le dernier.
            if (index < pending.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
        } finally {
          setWaveformProgress(null)
        }
      }

      // L'application gère plusieurs onglets (BroadcastChannel) : le verrou garantit
      // qu'un seul onglet décode à la fois. Les suivants prennent le verrou après
      // coup et ne font plus que des lectures Dexie bon marché.
      if (typeof navigator !== 'undefined' && 'locks' in navigator) {
        void navigator.locks.request('mjscreen-waveform-backfill', backfillPeaks)
      } else {
        void backfillPeaks()
      }
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
      value={{ playlists, setPlaylists, findTrack, patchItem, saveItem, waveformProgress }}
    >
      {children}
    </LibraryContext.Provider>
  )
}
