'use client'

import { LoaderCircle, Music } from 'lucide-react'
import { useEffect } from 'react'
import { useDisplayPrefs } from '@/hooks/useDisplayPrefs'
import { useTracksLibrary, type TracksLibraryNotice } from '@/hooks/useTracksLibrary'
import { publicUrl } from '@/lib/basePath'
import TracksLibrarySources from './TracksLibrarySources'
import TracksLibraryTrackList from './TracksLibraryTrackList'
import { Message } from './TracksLibraryUi'

function NoticeBanner({ notice }: { notice: TracksLibraryNotice }) {
  if (!notice) return null
  return (
    <div className={`rounded p-3 text-sm ${notice.tone === 'error' ? 'bg-red-950' : 'bg-gray-800 text-gray-300'}`}>
      <Message message={notice} tone={notice.tone === 'error' ? 'error' : 'normal'} />
    </div>
  )
}

/**
 * Page autonome de la bibliothèque de pistes : une seule bibliothèque, faite de
 * plusieurs sources (dossiers de l’ordinateur, bientôt des clouds), chacune décrite
 * par son `.mjlib/`. Le jukebox s’en servira plus tard pour ajouter des pistes.
 */
export default function TracksLibraryScreen() {
  const {
    state,
    tracks,
    notice,
    addLocalSource,
    reopenSource,
    refreshSource,
    initializeSource,
    resetSourceFile,
    removeSource,
    setDefaultSource,
    removeMissing,
    editTrack,
    deleteTrack,
  } = useTracksLibrary()
  const { lightMode } = useDisplayPrefs()

  // Même thème que le jukebox (voir Screen).
  useEffect(() => {
    document.documentElement.classList.toggle('light', lightMode)
  }, [lightMode])

  const openSources = state.step === 'ready' ? state.sources.filter(s => s.status.step === 'ready') : []

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

        {state.step === 'starting' ? (
          <p className="flex items-center gap-2 text-gray-400">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Chargement…
          </p>
        ) : (
          <>
            <TracksLibrarySources
              sources={state.sources}
              localAvailable={state.localAvailable}
              onAddLocal={addLocalSource}
              onReopen={reopenSource}
              onRefresh={refreshSource}
              onInitialize={initializeSource}
              onReset={resetSourceFile}
              onSetDefault={setDefaultSource}
              onRemove={removeSource}
              onRemoveMissing={removeMissing}
            />
            {openSources.length > 0 && (
              <TracksLibraryTrackList
                tracks={tracks}
                sources={openSources}
                onEdit={editTrack}
                onDelete={deleteTrack}
                onRemoveMissing={removeMissing}
              />
            )}
          </>
        )}
      </main>
    </div>
  )
}
