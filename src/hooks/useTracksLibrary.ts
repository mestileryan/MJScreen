'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { readAudioDuration } from '@/lib/audioDuration'
import type { IndexedTrack } from '@/models/TracksLibraryIndex'
import {
  deleteTrack,
  initTracksLibrary,
  openTracksLibrary,
  refreshTracksLibrary,
  removeTracksFromIndex,
  resetTracksLibraryFile,
  updateTracks,
  type FileProblem,
  type TracksLibrary,
  type TracksLibraryFile,
} from '@/persistance/TracksLibraryService'
import type { ReconcileReport } from '@/persistance/TracksLibraryIndexer'
import {
  DB_ClearTracksLibraryHandle,
  DB_GetTracksLibraryHandle,
  DB_SetTracksLibraryHandle,
} from '@/persistance/FolderHandleService'
import { LocalFolderProvider } from '@/storage/local/LocalFolderProvider'
import {
  isLocalFolderSupported,
  pickLocalFolder,
  queryFolderPermission,
  requestFolderPermission,
} from '@/storage/local/localFolder'
import { isStorageError } from '@/storage/StorageProvider'

/** Message pour l’utilisateur, avec le détail technique à n’afficher que sur demande. */
export interface UserMessage {
  text: string
  details?: string
}

export interface ReadyState {
  step: 'ready'
  storage: LocalFolderProvider
  library: TracksLibrary
  /** Résultat du dernier parcours du dossier ; `null` tant qu’il est en cours. */
  report: ReconcileReport | null
}

export type TracksLibraryState =
  | { step: 'starting' }
  /** Aucune bibliothèque mémorisée. `localAvailable` est faux sur Firefox et Safari. */
  | { step: 'no-library'; localAvailable: boolean }
  /** Un dossier a été mémorisé, mais l’accès doit être redemandé pour cette session. */
  | { step: 'needs-permission'; handle: FileSystemDirectoryHandle; denied?: boolean }
  | { step: 'opening'; label: string }
  | { step: 'unmanaged'; storage: LocalFolderProvider; audioFileCount: number }
  | { step: 'problem'; storage: LocalFolderProvider; problems: FileProblem[] }
  | ReadyState
  | { step: 'error'; error: UserMessage; handle?: FileSystemDirectoryHandle }

export type TracksLibraryNotice = ({ tone: 'info' | 'error' } & UserMessage) | null

/**
 * Cycle de vie de la bibliothèque de pistes en dossier local : rouvrir le dossier
 * mémorisé, en choisir un autre, l’initialiser ou réparer ses fichiers, puis
 * l’indexer et compléter les durées en arrière-plan.
 */
export function useTracksLibrary() {
  // Toujours `starting` au premier rendu : le HTML pré-rendu ne sait rien du
  // navigateur, la détection se fait après hydratation.
  const [state, setState] = useState<TracksLibraryState>({ step: 'starting' })
  const [notice, setNotice] = useState<TracksLibraryNotice>(null)
  // Chaque ouverture incrémente la génération : les travaux de fond d’une
  // ouverture précédente (durées) s’arrêtent dès qu’ils la voient changer.
  const generation = useRef(0)
  const latest = useRef<ReadyState | null>(null)

  const setReady = useCallback((patch: Partial<ReadyState> & Pick<ReadyState, 'storage' | 'library'>) => {
    const ready: ReadyState = { step: 'ready', report: null, ...patch }
    latest.current = ready
    setState(ready)
  }, [])

  /** Indexe le dossier puis lit les durées manquantes, sans bloquer l’affichage. */
  const settle = useCallback(
    async (storage: LocalFolderProvider, library: TracksLibrary) => {
      const gen = ++generation.current
      setReady({ storage, library })
      const refreshed = await refreshTracksLibrary(library)
      if (gen !== generation.current) return
      setReady({ storage, library: refreshed.library, report: refreshed.report })

      const missing = new Set(refreshed.report.missing.map(track => track.id))
      const pending = refreshed.library.index.tracks.filter(track => track.duration === undefined && !missing.has(track.id))
      const read: IndexedTrack[] = []
      for (const track of pending) {
        const duration = await storage
          .read(track.path)
          .then(readAudioDuration)
          .catch(() => null)
        if (gen !== generation.current) return
        if (duration === null) continue
        const current = latest.current
        if (!current) return
        const withDuration = { ...track, duration }
        read.push(withDuration)
        const tracks = current.library.index.tracks.map(t => (t.id === track.id ? withDuration : t))
        setReady({ ...current, library: { ...current.library, index: { ...current.library.index, tracks } } })
      }
      // Une seule écriture à la fin : les durées ne valent pas une réécriture par piste.
      if (read.length > 0 && latest.current) {
        const saved = await updateTracks(latest.current.library, read)
        if (gen === generation.current && latest.current) setReady({ ...latest.current, library: saved })
      }
    },
    [setReady],
  )

  const open = useCallback(
    async (handle: FileSystemDirectoryHandle) => {
      const storage = new LocalFolderProvider(handle)
      generation.current++
      setState({ step: 'opening', label: storage.label })
      try {
        const outcome = await openTracksLibrary(storage)
        switch (outcome.status) {
          case 'ready':
            await settle(storage, outcome.library)
            break
          case 'unmanaged':
            setState({ step: 'unmanaged', storage, audioFileCount: outcome.audioFileCount })
            break
          case 'problem':
            setState({ step: 'problem', storage, problems: outcome.problems })
            break
        }
      } catch (error) {
        setState({ step: 'error', error: describeError(error), handle })
      }
    },
    [settle],
  )

  // Au démarrage, on rouvre directement le dossier mémorisé si le navigateur a gardé
  // la permission ; sinon il faudra un clic, seul geste qui autorise à la redemander.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const localAvailable = isLocalFolderSupported()
      const handle = localAvailable ? await DB_GetTracksLibraryHandle().catch(() => undefined) : undefined
      if (cancelled) return
      if (!handle) return setState({ step: 'no-library', localAvailable })
      const permission = await queryFolderPermission(handle).catch(() => 'prompt' as const)
      if (cancelled) return
      if (permission === 'granted') await open(handle)
      else setState({ step: 'needs-permission', handle })
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const run = useCallback(async (action: () => Promise<void>) => {
    setNotice(null)
    try {
      await action()
    } catch (error) {
      setNotice({ tone: 'error', ...describeError(error) })
    }
  }, [])

  const pick = useCallback(
    () =>
      run(async () => {
        const handle = await pickLocalFolder()
        if (!handle) return
        await DB_SetTracksLibraryHandle(handle)
        await open(handle)
      }),
    [open, run],
  )

  const reopen = useCallback(
    (handle: FileSystemDirectoryHandle) =>
      run(async () => {
        if ((await requestFolderPermission(handle)) === 'granted') await open(handle)
        else setState({ step: 'needs-permission', handle, denied: true })
      }),
    [open, run],
  )

  const initialize = useCallback(
    (storage: LocalFolderProvider, name: string) =>
      run(async () => {
        await settle(storage, await initTracksLibrary(storage, name))
      }),
    [run, settle],
  )

  const reset = useCallback(
    (storage: LocalFolderProvider, file: TracksLibraryFile) =>
      run(async () => {
        const backup = await resetTracksLibraryFile(storage, file)
        await open(storage.root)
        if (backup) setNotice({ tone: 'info', text: 'Fichier recréé. L’ancien a été conservé.', details: backup })
      }),
    [open, run],
  )

  /** Retire de la liste des pistes dont le fichier a disparu. Les fichiers audio ne sont jamais touchés. */
  const removeMissing = useCallback(
    (ids: string[]) =>
      run(async () => {
        const current = latest.current
        if (!current) return
        const removed = new Set(ids)
        const library = await removeTracksFromIndex(current.library, ids)
        const report = current.report && { ...current.report, missing: current.report.missing.filter(t => !removed.has(t.id)) }
        setReady({ ...current, library, report })
      }),
    [run, setReady],
  )

  const editTrack = useCallback(
    (id: string, patch: Partial<Pick<IndexedTrack, 'name' | 'tags'>>) =>
      run(async () => {
        const current = latest.current
        const track = current?.library.index.tracks.find(t => t.id === id)
        if (!current || !track) return
        setReady({ ...current, library: await updateTracks(current.library, [{ ...track, ...patch }]) })
      }),
    [run, setReady],
  )

  /** Suppression définitive : le fichier audio est effacé, puis la piste quitte la liste. */
  const deleteTrackAction = useCallback(
    (id: string) =>
      run(async () => {
        const current = latest.current
        if (!current) return
        const library = await deleteTrack(current.library, id)
        const report = current.report && { ...current.report, missing: current.report.missing.filter(t => t.id !== id) }
        setReady({ ...current, library, report })
      }),
    [run, setReady],
  )

  const forget = useCallback(
    () =>
      run(async () => {
        generation.current++
        await DB_ClearTracksLibraryHandle()
        setState({ step: 'no-library', localAvailable: isLocalFolderSupported() })
      }),
    [run],
  )

  return {
    state,
    notice,
    pick,
    reopen,
    reload: open,
    initialize,
    reset,
    removeMissing,
    editTrack,
    deleteTrack: deleteTrackAction,
    forget,
  }
}

/** Traduit une erreur en message courant ; le texte brut reste disponible dans `details`. */
function describeError(error: unknown): UserMessage {
  const details = error instanceof Error ? `${error.name} : ${error.message}` : String(error)
  if (isStorageError(error, 'permission-denied')) {
    return { text: 'L’accès au dossier a été refusé. Autorisez-le à nouveau pour continuer.', details }
  }
  if (isStorageError(error, 'not-found')) {
    return { text: 'Le dossier est introuvable. Il a peut-être été déplacé ou supprimé.', details }
  }
  return { text: 'Quelque chose s’est mal passé.', details }
}
