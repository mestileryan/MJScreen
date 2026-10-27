'use client'

import { Cloud, HardDrive } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTooltip } from '@/hooks/useTooltip'
import { CLOUD_KINDS, CLOUD_LABELS, type CloudKind } from '@/storage/cloud/CloudStorage'
import { cloudAvailability } from '@/storage/cloud/cloudProviders'

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

const INCOMPATIBLE = {
  label: 'Navigateur incompatible',
  tooltip: 'Ouvrir un dossier de cet ordinateur n’est possible que dans Chrome ou Edge. Firefox et Safari ne le permettent pas.',
}

interface TracksLibraryDestinationsProps {
  /** Faux sur Firefox et Safari, qui ne savent pas ouvrir un dossier local. */
  localAvailable: boolean
  onPickLocal: () => void
  onPickCloud: (kind: CloudKind) => void
}

/** Les endroits où une source peut vivre : un dossier de l’ordinateur, ou un compte cloud. */
export default function TracksLibraryDestinations({ localAvailable, onPickLocal, onPickCloud }: TracksLibraryDestinationsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Destination
        icon={<HardDrive className="h-8 w-8 text-purple-400" />}
        label="Cet ordinateur"
        unavailable={localAvailable ? undefined : INCOMPATIBLE}
        onClick={onPickLocal}
      />
      {CLOUD_KINDS.map(kind => {
        const availability = cloudAvailability(kind)
        return (
          <Destination
            key={kind}
            icon={<Cloud className="h-8 w-8 text-purple-400" />}
            label={CLOUD_LABELS[kind]}
            unavailable={availability.available ? undefined : { label: 'Non configuré', tooltip: availability.reason }}
            onClick={() => onPickCloud(kind)}
          />
        )
      })}
    </div>
  )
}
