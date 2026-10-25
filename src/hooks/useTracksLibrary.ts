'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  initTracksLibrary,
  openTracksLibrary,
  resetTracksLibraryFile,
  type FileProblem,
  type TracksLibrary,
  type TracksLibraryFile,
} from '@/persistance/TracksLibraryService'
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

export type TracksLibraryState =
  | { step: 'starting' }
  /** Navigateur sans File System Access API (Firefox, Safari). */
  | { step: 'unsupported' }
  | { step: 'no-folder' }
  /** Un dossier a été mémorisé, mais l’accès doit être redemandé pour cette session. */
  | { step: 'needs-permission'; handle: FileSystemDirectoryHandle; denied?: boolean }
  | { step: 'opening'; label: string }
  | { step: 'unmanaged'; storage: LocalFolderProvider; audioFileCount: number }
  | { step: 'problem'; storage: LocalFolderProvider; problems: FileProblem[] }
  | { step: 'ready'; storage: LocalFolderProvider; library: TracksLibrary }
  | { step: 'error'; message: string; handle?: FileSystemDirectoryHandle }

/** Message affiché après une action, par exemple l’emplacement d’une sauvegarde. */
export type TracksLibraryNotice = { tone: 'info' | 'error'; text: string } | null

/**
 * Cycle de vie de la bibliothèque de pistes en dossier local : rouvrir le dossier
 * mémorisé, en choisir un autre, l’initialiser ou réparer ses fichiers.
 */
export function useTracksLibrary() {
  // Toujours `starting` au premier rendu : le HTML pré-rendu ne sait rien du
  // navigateur, la détection se fait après hydratation.
  const [state, setState] = useState<TracksLibraryState>({ step: 'starting' })
  const [notice, setNotice] = useState<TracksLibraryNotice>(null)

  const open = useCallback(async (handle: FileSystemDirectoryHandle) => {
    const storage = new LocalFolderProvider(handle)
    setState({ step: 'opening', label: storage.label })
    try {
      const outcome = await openTracksLibrary(storage)
      switch (outcome.status) {
        case 'ready':
          setState({ step: 'ready', storage, library: outcome.library })
          break
        case 'unmanaged':
          setState({ step: 'unmanaged', storage, audioFileCount: outcome.audioFileCount })
          break
        case 'problem':
          setState({ step: 'problem', storage, problems: outcome.problems })
          break
      }
    } catch (error) {
      setState({ step: 'error', message: describeError(error), handle })
    }
  }, [])

  // Au démarrage, on rouvre directement le dossier mémorisé si le navigateur a gardé
  // la permission ; sinon il faudra un clic, seul geste qui autorise à la redemander.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!isLocalFolderSupported()) return setState({ step: 'unsupported' })
      const handle = await DB_GetTracksLibraryHandle().catch(() => undefined)
      if (cancelled) return
      if (!handle) return setState({ step: 'no-folder' })
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
      setNotice({ tone: 'error', text: describeError(error) })
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
        setState({ step: 'ready', storage, library: await initTracksLibrary(storage, name) })
      }),
    [run],
  )

  const reset = useCallback(
    (storage: LocalFolderProvider, file: TracksLibraryFile) =>
      run(async () => {
        const backup = await resetTracksLibraryFile(storage, file)
        await open(storage.root)
        if (backup) setNotice({ tone: 'info', text: `L’ancien fichier a été sauvegardé sous ${backup}.` })
      }),
    [open, run],
  )

  const forget = useCallback(
    () =>
      run(async () => {
        await DB_ClearTracksLibraryHandle()
        setState({ step: 'no-folder' })
      }),
    [run],
  )

  return { state, notice, pick, reopen, reload: open, initialize, reset, forget }
}

function describeError(error: unknown): string {
  if (isStorageError(error, 'permission-denied')) {
    return 'L’accès au dossier a été refusé ou retiré. Rouvrez-le pour l’autoriser à nouveau.'
  }
  if (isStorageError(error, 'not-found')) {
    return 'Le dossier est introuvable : il a peut-être été déplacé, renommé ou supprimé.'
  }
  return error instanceof Error ? error.message : String(error)
}
