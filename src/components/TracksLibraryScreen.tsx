'use client'

import { Database, LoaderCircle, Music, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDisplayPrefs } from '@/hooks/useDisplayPrefs'
import { useTracksLibrary, type TracksLibraryNotice } from '@/hooks/useTracksLibrary'
import AppHeader from './AppHeader'
import ImportFileDragOverlay from './ImportFileDragOverlay'
import TooltipButton from './TooltipButton'
import TracksLibraryAddButton from './TracksLibraryAddButton'
import TracksLibrarySourceCard from './TracksLibrarySourceCard'
import TracksLibrarySourcesModal from './TracksLibrarySourcesModal'
import TracksLibraryTrackList from './TracksLibraryTrackList'
import { Message } from './TracksLibraryUi'

function NoticeBanner({ notice }: { notice: TracksLibraryNotice }) {
  if (!notice) return null
  return (
    <div className={`rounded-lg p-3 text-sm ${notice.tone === 'error' ? 'bg-red-950' : 'bg-gray-800 text-gray-300'}`}>
      <Message message={notice} tone={notice.tone === 'error' ? 'error' : 'normal'} />
    </div>
  )
}

/**
 * Page autonome de la bibliothèque de pistes : une seule bibliothèque, faite de
 * plusieurs sources (dossiers de l’ordinateur, comptes cloud), chacune décrite
 * par son `.mjlib/`. L’écran de travail ne montre que la liste et la source par
 * défaut ; la gestion des sources vit dans une modale.
 */
export default function TracksLibraryScreen() {
  const {
    state,
    tracks,
    notice,
    adding,
    addFiles,
    addLocalSource,
    addCloudSource,
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
  const [sourcesOpen, setSourcesOpen] = useState(false)

  // Même thème que le jukebox (voir Screen).
  useEffect(() => {
    document.documentElement.classList.toggle('light', lightMode)
  }, [lightMode])

  if (state.step === 'starting') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <AppHeader current="library" />
        <p className="flex items-center gap-2 p-6 text-gray-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Chargement…
        </p>
      </div>
    )
  }

  const { sources, localAvailable } = state
  const openSources = sources.filter(s => s.status.step === 'ready')
  // Les fichiers ajoutés vont à la source par défaut ; sans elle, pas d’ajout possible.
  const target = sources.find(s => s.isDefault) ?? sources[0]
  const canAdd = target?.status.step === 'ready'
  // Une source qui réclame quelque chose (accord, initialisation, réparation) s’affiche
  // sur l’écran de travail, pour ne pas avoir à ouvrir la modale.
  const needingAttention = sources.filter(s => s.status.step !== 'ready' && s.status.step !== 'opening')
  // Sans aucune source, la modale est le seul écran qui ait un sens : elle reste ouverte.
  const modalOpen = sourcesOpen || sources.length === 0

  const sourcesProps = {
    sources,
    localAvailable,
    onAddLocal: addLocalSource,
    onAddCloud: addCloudSource,
    onReopen: reopenSource,
    onRefresh: refreshSource,
    onInitialize: initializeSource,
    onReset: resetSourceFile,
    onSetDefault: setDefaultSource,
    onRemove: removeSource,
    onRemoveMissing: removeMissing,
  }

  return (
    <ImportFileDragOverlay
      disabled={!canAdd}
      message={target ? `Déposez vos fichiers audio pour les ajouter à ${target.label}` : ''}
      onFilesDropped={addFiles}
    >
      <div className="min-h-screen bg-gray-900 text-white">
        <AppHeader current="library" />
        <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
          <header className="flex flex-wrap items-center gap-3">
            <Music className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-semibold">Bibliothèque de pistes</h1>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {sources.length > 0 && (
                <label className="flex items-center gap-1.5 rounded-lg bg-gray-800 px-2 py-1.5 text-sm text-gray-300">
                  <Star className="h-4 w-4 text-yellow-400" fill="currentColor" aria-hidden />
                  <select
                    value={target?.id ?? ''}
                    onChange={event => setDefaultSource(Number(event.target.value))}
                    aria-label="Source par défaut"
                    title="Source par défaut : reçoit les pistes ajoutées"
                    className="max-w-48 bg-transparent text-white outline-none"
                  >
                    {sources.map(source => (
                      <option key={source.id} value={source.id}>
                        {source.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <TooltipButton
                onClick={() => setSourcesOpen(true)}
                tooltip="Gérer les sources"
                aria-label="Sources"
                className="rounded-lg bg-gray-800 p-2 text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
              >
                <Database className="h-4 w-4" />
              </TooltipButton>
              {canAdd && target && <TracksLibraryAddButton targetLabel={target.label} adding={adding} onFiles={addFiles} />}
            </div>
          </header>
          <NoticeBanner notice={notice} />

          {needingAttention.length > 0 && (
            <ul className="space-y-2">
              {needingAttention.map(source => (
                <TracksLibrarySourceCard
                  key={source.id}
                  source={source}
                  showDefault={false}
                  onReopen={() => reopenSource(source.id)}
                  onRefresh={() => refreshSource(source.id)}
                  onInitialize={() => initializeSource(source.id)}
                  onReset={file => resetSourceFile(source.id, file)}
                  onSetDefault={() => setDefaultSource(source.id)}
                  onRemove={() => removeSource(source.id)}
                  onRemoveMissing={ids => removeMissing(source.id, ids)}
                />
              ))}
            </ul>
          )}

          {openSources.length > 0 && (
            <TracksLibraryTrackList
              tracks={tracks}
              sources={openSources}
              onEdit={editTrack}
              onDelete={deleteTrack}
              onRemoveMissing={removeMissing}
            />
          )}
        </main>
      </div>

      {modalOpen && <TracksLibrarySourcesModal {...sourcesProps} onClose={sources.length > 0 ? () => setSourcesOpen(false) : undefined} />}
    </ImportFileDragOverlay>
  )
}
