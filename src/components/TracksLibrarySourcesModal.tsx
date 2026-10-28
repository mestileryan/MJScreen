'use client'

import { CircleX } from 'lucide-react'
import type { ComponentProps } from 'react'
import TooltipButton from './TooltipButton'
import TracksLibrarySources from './TracksLibrarySources'

interface TracksLibrarySourcesModalProps extends ComponentProps<typeof TracksLibrarySources> {
  /** Absent tant qu’aucune source n’est branchée : la modale ne se ferme pas, il n’y aurait rien derrière. */
  onClose?: () => void
}

/** Les sources de la bibliothèque, dans une modale : où en brancher une, et celles qui le sont. */
export default function TracksLibrarySourcesModal({ onClose, ...sources }: TracksLibrarySourcesModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" onClick={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-label="Sources"
        className="w-full max-w-2xl rounded-xl bg-gray-900 p-5 shadow-2xl ring-1 ring-white/10"
        onClick={event => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center">
          <h2 className="text-lg font-semibold text-white">Sources de la bibliothèque</h2>
          {onClose && (
            <TooltipButton
              onClick={onClose}
              className="ml-auto rounded-md p-1 text-gray-400 transition-colors hover:text-red-400"
              tooltip="Fermer"
              aria-label="Fermer"
            >
              <CircleX className="h-5 w-5" />
            </TooltipButton>
          )}
        </div>
        <TracksLibrarySources {...sources} />
      </div>
    </div>
  )
}
