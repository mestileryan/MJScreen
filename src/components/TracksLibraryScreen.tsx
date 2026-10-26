'use client'

import { LoaderCircle, Music } from 'lucide-react'
import { useEffect } from 'react'
import { useDisplayPrefs } from '@/hooks/useDisplayPrefs'
import { useTracksLibrary, type TracksLibraryNotice, type TracksLibraryState } from '@/hooks/useTracksLibrary'
import { publicUrl } from '@/lib/basePath'
import { NeedsPermission, NoLibrary, OpenError } from './TracksLibraryFolderChooser'
import TracksLibraryOverview from './TracksLibraryOverview'
import TracksLibraryProblems from './TracksLibraryProblems'
import { Message } from './TracksLibraryUi'
import TracksLibraryUnmanagedFolder from './TracksLibraryUnmanagedFolder'

function Loading({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-gray-400">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {text}
    </p>
  )
}

function NoticeBanner({ notice }: { notice: TracksLibraryNotice }) {
  if (!notice) return null
  return (
    <div className={`rounded p-3 text-sm ${notice.tone === 'error' ? 'bg-red-950' : 'bg-gray-800 text-gray-300'}`}>
      <Message message={notice} tone={notice.tone === 'error' ? 'error' : 'normal'} />
    </div>
  )
}

/**
 * Page autonome de la bibliothèque de pistes : des fichiers audio rangés dans un
 * dossier choisi par l’utilisateur, décrits par `.mjlib/`. Le jukebox s’en servira
 * plus tard comme source pour ajouter des pistes.
 */
export default function TracksLibraryScreen() {
  const { state, notice, pick, reopen, reload, initialize, reset, removeMissing, forget } = useTracksLibrary()
  const { lightMode } = useDisplayPrefs()

  // Même thème que le jukebox (voir Screen).
  useEffect(() => {
    document.documentElement.classList.toggle('light', lightMode)
  }, [lightMode])

  const content = (current: TracksLibraryState) => {
    switch (current.step) {
      case 'starting':
        return <Loading text="Chargement…" />
      case 'no-library':
        return <NoLibrary localAvailable={current.localAvailable} onPickLocal={pick} />
      case 'needs-permission':
        return (
          <NeedsPermission
            folderName={current.handle.name}
            denied={current.denied}
            onReopen={() => reopen(current.handle)}
            onChange={pick}
          />
        )
      case 'opening':
        return <Loading text={`Ouverture de ${current.label}…`} />
      case 'unmanaged':
        return (
          <TracksLibraryUnmanagedFolder
            folderName={current.storage.label}
            audioFileCount={current.audioFileCount}
            onInitialize={name => initialize(current.storage, name)}
            onChange={pick}
          />
        )
      case 'problem':
        return (
          <TracksLibraryProblems
            folderName={current.storage.label}
            problems={current.problems}
            onReset={file => reset(current.storage, file)}
            onReload={() => reload(current.storage.root)}
            onChange={pick}
          />
        )
      case 'ready':
        return (
          <TracksLibraryOverview
            state={current}
            onReload={() => reload(current.storage.root)}
            onChange={pick}
            onForget={forget}
            onRemoveMissing={removeMissing}
          />
        )
      case 'error': {
        const { handle } = current
        return <OpenError error={current.error} onRetry={handle && (() => reopen(handle))} onChange={pick} />
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <header className="flex flex-wrap items-center gap-2">
          <Music className="h-6 w-6 text-purple-400" />
          <h1 className="text-2xl font-semibold">Bibliothèque de pistes</h1>
          {/* Lien en dur plutôt que `next/link` : le jukebox est une autre page de l’export statique. */}
          <a href={publicUrl('/')} className="ml-auto text-sm text-purple-300 hover:text-purple-400">
            Retour au jukebox
          </a>
        </header>
        <NoticeBanner notice={notice} />
        {content(state)}
      </main>
    </div>
  )
}
