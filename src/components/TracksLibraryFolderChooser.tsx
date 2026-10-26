'use client'

import { Cloud, FolderOpen, HardDrive, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import type { UserMessage } from '@/hooks/useTracksLibrary'
import { ActionButton, Message, Panel } from './TracksLibraryUi'

interface DestinationProps {
  icon: ReactNode
  label: string
  /** Raison pour laquelle la destination est grisée. */
  unavailable?: string
  onClick?: () => void
}

function Destination({ icon, label, unavailable, onClick }: DestinationProps) {
  return (
    <button
      type="button"
      disabled={!!unavailable}
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-lg bg-gray-700 p-4 text-white transition-colors enabled:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      <span className="font-medium">{label}</span>
      {unavailable && <span className="text-xs text-gray-400">{unavailable}</span>}
    </button>
  )
}

interface NoLibraryProps {
  /** Faux sur Firefox et Safari, qui ne savent pas ouvrir un dossier local. */
  localAvailable: boolean
  onPickLocal: () => void
}

/** Premier écran : pas de bibliothèque, on choisit où la ranger. */
export function NoLibrary({ localAvailable, onPickLocal }: NoLibraryProps) {
  return (
    <Panel title="Aucune bibliothèque configurée">
      <p>Choisissez où ranger vos pistes :</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Destination
          icon={<HardDrive className="h-8 w-8 text-purple-400" />}
          label="Cet ordinateur"
          unavailable={localAvailable ? undefined : 'Pas dans ce navigateur'}
          onClick={onPickLocal}
        />
        <Destination icon={<Cloud className="h-8 w-8" />} label="Dropbox" unavailable="Bientôt" />
        <Destination icon={<Cloud className="h-8 w-8" />} label="Google Drive" unavailable="Bientôt" />
        <Destination icon={<Cloud className="h-8 w-8" />} label="OneDrive" unavailable="Bientôt" />
      </div>
      {!localAvailable && (
        <p className="flex items-start gap-2 text-gray-400">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          Pour utiliser un dossier de cet ordinateur, ouvrez MJScreen dans Chrome ou Edge.
        </p>
      )}
    </Panel>
  )
}

interface NeedsPermissionProps {
  folderName: string
  denied?: boolean
  onReopen: () => void
  onChange: () => void
}

/** Le navigateur se souvient du dossier, mais l’accès doit être réautorisé à chaque session. */
export function NeedsPermission({ folderName, denied, onReopen, onChange }: NeedsPermissionProps) {
  return (
    <Panel title={folderName} icon={<FolderOpen className="h-5 w-5 text-purple-400" />}>
      {denied ? (
        <p className="text-red-300">L’accès a été refusé. Réessayez, ou choisissez un autre emplacement.</p>
      ) : (
        <p>Le navigateur demande votre accord pour ouvrir ce dossier.</p>
      )}
      <div className="flex flex-wrap gap-2">
        <ActionButton tone="primary" onClick={onReopen}>
          <FolderOpen className="h-4 w-4" />
          Ouvrir
        </ActionButton>
        <ActionButton onClick={onChange}>Changer d’emplacement</ActionButton>
      </div>
    </Panel>
  )
}

interface OpenErrorProps {
  error: UserMessage
  onRetry?: () => void
  onChange: () => void
}

export function OpenError({ error, onRetry, onChange }: OpenErrorProps) {
  return (
    <Panel title="Impossible d’ouvrir la bibliothèque" icon={<TriangleAlert className="h-5 w-5 text-red-400" />}>
      <Message message={error} tone="error" />
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <ActionButton tone="primary" onClick={onRetry}>
            Réessayer
          </ActionButton>
        )}
        <ActionButton onClick={onChange}>Changer d’emplacement</ActionButton>
      </div>
    </Panel>
  )
}
