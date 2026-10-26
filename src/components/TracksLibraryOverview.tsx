'use client'

import { Library as LibraryIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TracksLibrary } from '@/persistance/TracksLibraryService'
import { serializeDocument } from '@/schemas/documentSchema'
import { ActionButton, Panel, TechnicalDetails } from './TracksLibraryUi'

interface TracksLibraryOverviewProps {
  library: TracksLibrary
  onReload: () => void
  onChange: () => void
  onForget: () => void
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-white">{children}</dd>
    </>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('fr-FR', { dateStyle: 'long' })
}

function trackCount(count: number): string {
  if (count === 0) return 'aucune pour l’instant'
  return count === 1 ? '1 piste' : `${count} pistes`
}

/** Bibliothèque ouverte : l’essentiel, et le contenu brut des fichiers sur demande. */
export default function TracksLibraryOverview({ library, onReload, onChange, onForget }: TracksLibraryOverviewProps) {
  const { config, index, storage, migratedFrom } = library
  const migrated = migratedFrom.config !== null || migratedFrom.index !== null

  return (
    <Panel title={config.name} icon={<LibraryIcon className="h-5 w-5 text-purple-400" />}>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <Row label="Emplacement">{storage.label}</Row>
        <Row label="Pistes">{trackCount(index.tracks.length)}</Row>
        <Row label="Créée le">{formatDate(config.createdAt)}</Row>
      </dl>

      {migrated && (
        <p className="rounded bg-gray-900/60 p-3">
          Cette bibliothèque vient d’une ancienne version de MJScreen. Elle sera mise au nouveau format à la prochaine
          modification, en conservant l’ancienne.
        </p>
      )}

      <TechnicalDetails>
        {`Dossier des pistes : ${config.tracksDir}/\nIdentifiant : ${config.id}\nFormats : réglages v${config.schemaVersion}, liste v${index.schemaVersion}\nSorties : ${config.outputs.length}\n\n${serializeDocument(config)}`}
      </TechnicalDetails>

      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={onReload}>Actualiser</ActionButton>
        <ActionButton onClick={onChange}>Changer d’emplacement</ActionButton>
        <ActionButton onClick={onForget}>Déconnecter</ActionButton>
      </div>
    </Panel>
  )
}
