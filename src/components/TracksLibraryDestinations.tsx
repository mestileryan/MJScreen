'use client'

import { Cloud, HardDrive } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTooltip } from '@/hooks/useTooltip'

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

interface TracksLibraryDestinationsProps {
  /** Faux sur Firefox et Safari, qui ne savent pas ouvrir un dossier local. */
  localAvailable: boolean
  onPickLocal: () => void
}

/** Les endroits où une source peut vivre. Seul le dossier local existe pour l’instant. */
export default function TracksLibraryDestinations({ localAvailable, onPickLocal }: TracksLibraryDestinationsProps) {
  return (
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
  )
}
