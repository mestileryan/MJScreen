'use client'

import { Cloud, FolderOpen, HardDrive, LoaderCircle, LogIn, RefreshCw, Star, Unplug } from 'lucide-react'
import type { TracksSource } from '@/hooks/useTracksLibrary'
import { formatBytes } from '@/lib/formatBytes'
import type { ReconcileReport } from '@/persistance/TracksLibraryIndexer'
import { isEmptyReport } from '@/persistance/TracksLibraryIndexer'
import type { TracksLibraryFile } from '@/persistance/TracksLibraryService'
import { serializeDocument } from '@/schemas/documentSchema'
import { CLOUD_LABELS } from '@/storage/cloud/CloudStorage'
import TooltipButton from './TooltipButton'
import TracksLibraryProblems from './TracksLibraryProblems'
import { ActionButton, Message, TechnicalDetails } from './TracksLibraryUi'

interface TracksLibrarySourceCardProps {
  source: TracksSource
  /** Vrai dès qu’il y a plusieurs sources : l’étoile n’a de sens qu’à ce moment-là. */
  showDefault: boolean
  onReopen: () => void
  onRefresh: () => void
  onInitialize: () => void
  onReset: (file: TracksLibraryFile) => void
  onSetDefault: () => void
  onRemove: () => void
  onRemoveMissing: (ids: string[]) => void
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

function changes(report: ReconcileReport): string {
  const parts: string[] = []
  if (report.added.length) parts.push(plural(report.added.length, 'nouvelle', 'nouvelles'))
  if (report.changed.length) parts.push(plural(report.changed.length, 'modifiée', 'modifiées'))
  if (report.missing.length) parts.push(plural(report.missing.length, 'introuvable', 'introuvables'))
  return parts.join(' · ')
}

const iconButton = 'rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white'

/** Jauge de l’espace du compte cloud, avec la part de la bibliothèque. */
function QuotaGauge({ used, total, library }: { used: number; total?: number; library: number }) {
  if (!total) return <p className="text-xs text-gray-400">{formatBytes(used)} utilisés sur le compte</p>
  const ratio = Math.min(1, used / total)
  const libraryRatio = Math.min(ratio, library / total)
  return (
    <div className="space-y-1 text-xs text-gray-400">
      <div className="relative h-1.5 w-full overflow-hidden rounded bg-gray-700">
        <div className="absolute inset-y-0 left-0 bg-gray-500" style={{ width: `${ratio * 100}%` }} />
        <div className="absolute inset-y-0 left-0 bg-purple-500" style={{ width: `${libraryRatio * 100}%` }} />
      </div>
      <p>
        {formatBytes(used)} utilisés sur {formatBytes(total)}, dont{' '}
        <span className="text-purple-300">{formatBytes(library)} pour la bibliothèque</span>
      </p>
    </div>
  )
}

/** Une source branchée : son état, et ce qu’on peut en faire. */
export default function TracksLibrarySourceCard({
  source,
  showDefault,
  onReopen,
  onRefresh,
  onInitialize,
  onReset,
  onSetDefault,
  onRemove,
  onRemoveMissing,
}: TracksLibrarySourceCardProps) {
  const { status } = source
  const cloud = source.kind !== 'local'

  const summary = () => {
    switch (status.step) {
      case 'needs-permission':
        if (status.denied) return <span className="text-red-300">accès refusé</span>
        return cloud ? 'à connecter' : 'à ouvrir'
      case 'opening':
        return (
          <span className="inline-flex items-center gap-1">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> ouverture…
          </span>
        )
      case 'unmanaged':
        return `pas encore une source · ${plural(status.audioFileCount, 'morceau', 'morceaux')}`
      case 'problem':
        return <span className="text-red-300">illisible</span>
      case 'error':
        return <span className="text-red-300">erreur</span>
      case 'ready': {
        const count = status.library.index.tracks.length
        return `${plural(count, 'piste', 'pistes')} · ${formatBytes(status.usedBytes)}`
      }
    }
  }

  return (
    <li className="space-y-3 rounded-lg bg-gray-800 p-4">
      <div className="flex items-center gap-2">
        {cloud ? <Cloud className="h-5 w-5 shrink-0 text-purple-400" /> : <HardDrive className="h-5 w-5 shrink-0 text-purple-400" />}
        <span className="truncate font-medium text-white">{source.label}</span>
        <span className="truncate text-sm text-gray-400">· {summary()}</span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {showDefault && (
            <TooltipButton
              onClick={onSetDefault}
              tooltip={source.isDefault ? 'Source par défaut : reçoit les pistes ajoutées' : 'En faire la source par défaut'}
              aria-label="Source par défaut"
              className={`${iconButton} ${source.isDefault ? 'text-yellow-400 hover:text-yellow-300' : ''}`}
            >
              <Star className="h-4 w-4" fill={source.isDefault ? 'currentColor' : 'none'} />
            </TooltipButton>
          )}
          {status.step === 'ready' && (
            <TooltipButton onClick={onRefresh} tooltip="Actualiser" aria-label="Actualiser" className={iconButton}>
              <RefreshCw className="h-4 w-4" />
            </TooltipButton>
          )}
          <TooltipButton
            onClick={onRemove}
            tooltip={cloud ? 'Débrancher ce compte (rien n’est supprimé chez le service)' : 'Débrancher cette source (le dossier n’est pas touché)'}
            aria-label="Débrancher"
            className={`${iconButton} hover:text-red-400`}
          >
            <Unplug className="h-4 w-4" />
          </TooltipButton>
        </div>
      </div>

      {status.step === 'needs-permission' && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
          <span>
            {status.denied
              ? 'L’accès a été refusé. Réessayez, ou débranchez la source.'
              : cloud
                ? `Connectez-vous à ${CLOUD_LABELS[source.kind]} pour ouvrir cette source.`
                : 'Le navigateur demande votre accord pour ouvrir ce dossier.'}
          </span>
          <ActionButton tone="primary" onClick={onReopen}>
            {cloud ? <LogIn className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
            {cloud ? 'Se connecter' : 'Ouvrir'}
          </ActionButton>
        </div>
      )}

      {status.step === 'unmanaged' && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
          <span>Vos fichiers ne seront ni déplacés ni modifiés.</span>
          <ActionButton tone="primary" onClick={onInitialize}>
            {cloud ? 'Utiliser ce compte' : 'Utiliser ce dossier'}
          </ActionButton>
        </div>
      )}

      {status.step === 'problem' && <TracksLibraryProblems problems={status.problems} onReset={onReset} onReload={onRefresh} />}

      {status.step === 'error' && (
        <div className="space-y-2 text-sm">
          <Message message={status.error} tone="error" />
          <ActionButton tone="primary" onClick={onReopen}>
            Réessayer
          </ActionButton>
        </div>
      )}

      {status.step === 'ready' && (
        <>
          {source.kind !== 'local' && source.quota && (
            <QuotaGauge used={source.quota.used} total={source.quota.total} library={status.usedBytes} />
          )}
          {status.report && !isEmptyReport(status.report) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
              <span>{changes(status.report)}</span>
              {status.report.missing.length > 1 && (
                <ActionButton onClick={() => onRemoveMissing(status.report!.missing.map(t => t.id))}>
                  Retirer les {status.report.missing.length} introuvables
                </ActionButton>
              )}
            </div>
          )}
          <TechnicalDetails>
            {`Identifiant : ${status.library.config.id}\nFormats : réglages v${status.library.config.schemaVersion}, liste v${status.library.index.schemaVersion}\n\n${serializeDocument(status.library.config)}`}
          </TechnicalDetails>
        </>
      )}
    </li>
  )
}
