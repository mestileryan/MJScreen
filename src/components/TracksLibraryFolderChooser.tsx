'use client'

import { Cloud, FolderOpen, HardDrive, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTooltip } from '@/hooks/useTooltip'
import type { UserMessage } from '@/hooks/useTracksLibrary'
import { ActionButton, Message, Panel } from './TracksLibraryUi'

interface DestinationProps {
  icon: ReactNode
  label: string
  /** Raison courte pour laquelle la destination est grisée, l’explication allant en infobulle. */
  unavailable?: { label: string; tooltip: string }
  onClick?: () => void
}

function Destination({ icon, label, unavailable, onClick }: DestinationProps) {
  // Un bouton désactivé n’émet pas d’événements souris : l’infobulle se pose sur son conteneur.
  const ref = useTooltip(unavailable?.tooltip)
  return (
    <div ref={ref}>
      <button
        type="button"
        disabled={!!unavailable}
        onClick={onClick}
        className="flex h-full w-full flex-col items-center gap-2 rounded-lg bg-gray-700 p-4 text-white transition-colors enabled:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {icon}
        <span className="font-medium">{label}</span>
        {unavailable && <span className="text-xs text-gray-400">{unavailable.label}</span>}
      </button>
    </div>
  )
}

const SOON = { label: 'Bientôt', tooltip: 'Disponible dans une prochaine version.' }
const INCOMPATIBLE = {
  label: 'Navigateur incompatible',
  tooltip: 'Ouvrir un dossier de cet ordinateur n’est possible que dans Chrome ou Edge. Firefox et Safari ne le permettent pas.',
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
          unavailable={localAvailable ? undefined : INCOMPATIBLE}
          onClick={onPickLocal}
        />
        <Destination icon={<Cloud className="h-8 w-8" />} label="Dropbox" unavailable={SOON} />
        <Destination icon={<Cloud className="h-8 w-8" />} label="Google Drive" unavailable={SOON} />
        <Destination icon={<Cloud className="h-8 w-8" />} label="OneDrive" unavailable={SOON} />
      </div>
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
