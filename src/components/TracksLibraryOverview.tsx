'use client'

import { Library as LibraryIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { TracksLibrary } from '@/persistance/TracksLibraryService'
import { serializeDocument } from '@/schemas/documentSchema'
import { ActionButton, Panel } from './TracksLibraryUi'

interface TracksLibraryOverviewProps {
  library: TracksLibrary
  onReload: () => void
  onPick: () => void
  onForget: () => void
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-gray-400">{label}</dt>
      <dd className="text-gray-100">{children}</dd>
    </>
  )
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}

/** Bibliothèque ouverte : pour l’instant, la configuration lue telle quelle. */
export default function TracksLibraryOverview({ library, onReload, onPick, onForget }: TracksLibraryOverviewProps) {
  const { config, index, storage, migratedFrom } = library
  const trackCount = index.tracks.length

  return (
    <Panel title={config.name} icon={<LibraryIcon className="h-5 w-5 text-purple-400" />}>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <Row label="Dossier">{storage.label}</Row>
        <Row label="Pistes indexées">{trackCount}</Row>
        <Row label="Dossier des pistes">
          <code className="text-purple-300">{config.tracksDir}/</code>
        </Row>
        <Row label="Sorties">{config.outputs.length === 0 ? 'aucune (fonctionnalité à venir)' : config.outputs.length}</Row>
        <Row label="Créée le">{formatDate(config.createdAt)}</Row>
        <Row label="Identifiant">
          <code className="text-xs text-gray-400">{config.id}</code>
        </Row>
        <Row label="Schémas">
          config v{config.schemaVersion}, index v{index.schemaVersion}
        </Row>
      </dl>

      {(migratedFrom.config !== null || migratedFrom.index !== null) && (
        <p className="rounded bg-gray-900/60 p-3">
          Des fichiers ont été lus dans un ancien format et convertis en mémoire. Ils ne seront réécrits qu’à la prochaine
          modification, après sauvegarde de l’ancienne version dans <code className="text-purple-300">.mjlib/sauvegardes/</code>.
        </p>
      )}

      <details className="rounded bg-gray-900/60 p-3">
        <summary className="cursor-pointer text-gray-400">Contenu de .mjlib/config.json</summary>
        <pre className="mt-2 overflow-x-auto text-xs text-gray-300">{serializeDocument(config)}</pre>
      </details>

      <div className="flex flex-wrap gap-2">
        <ActionButton onClick={onReload}>Recharger</ActionButton>
        <ActionButton onClick={onPick}>Changer de dossier</ActionButton>
        <ActionButton onClick={onForget}>Oublier ce dossier</ActionButton>
      </div>
    </Panel>
  )
}
