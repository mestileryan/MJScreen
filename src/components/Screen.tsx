'use client'

import { useState } from 'react'
import Library from './Library'
import TracksPlayer from './TracksPlayer'
// Barre latérale rétractable pour le lecteur
import CollapsibleSidebar from './CollapsibleSidebar'
// Modale d'import/export
import SettingsModal from './SettingsModal'
import { useCookieState } from '@/hooks/useCookieState'
import { usePlayerQueue } from '@/hooks/usePlayerQueue'
import { usePresentationWindow } from '@/hooks/usePresentationWindow'
import { useTrackLink } from '@/hooks/useTrackLink'

export default function Screen() {
  const { tracks, addTrack, updateTrack, removeTrack, removeAllTracks } = usePlayerQueue()
  const { present, openViewer } = usePresentationWindow()

  const [showSettings, setShowSettings] = useState(false)
  const [isPlayerCollapsed, setIsPlayerCollapsed] = useCookieState('playerCollapsed', false, {
    trueValue: 'true',
    falseValue: 'false',
  })

  // Register logic that handles ?trackId= links and inter-tab communication
  const { toastMessage, externalMessage } = useTrackLink(addTrack)

  return (
    <div
      className={`min-h-screen bg-gray-900 grid ${
        isPlayerCollapsed ? 'grid-cols-[1fr_1.5rem]' : 'grid-cols-[1fr_24rem]'
      }`}
    >
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

      <div className="p-8 overflow-auto min-w-[522px]">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-purple-400 mb-8">MJ Screen Jukebox</h1>
        </div>

        <div className="space-y-6">
          <Library onPlayAudio={addTrack} onOpenImage={present} />
        </div>
      </div>

      <CollapsibleSidebar
        collapsed={isPlayerCollapsed}
        onCollapsedChange={setIsPlayerCollapsed}
        onOpenSettings={() => setShowSettings(true)}
      >
        <TracksPlayer
          tracks={tracks}
          onUpdateTrack={updateTrack}
          onRemoveTrack={removeTrack}
          onRemoveAllTracks={removeAllTracks}
          onOpenViewer={openViewer}
        />
      </CollapsibleSidebar>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  )
}
