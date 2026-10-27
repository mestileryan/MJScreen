'use client'

import { Check, FolderOpen, ListX, LoaderCircle, LogIn, RefreshCw, Star, Unplug } from 'lucide-react'
import type { TracksSource } from '@/hooks/useTracksLibrary'
import { formatBytes } from '@/lib/formatBytes'
import type { ReconcileReport } from '@/persistance/TracksLibraryIndexer'
import { isEmptyReport } from '@/persistance/TracksLibraryIndexer'
import type { TracksLibraryFile } from '@/persistance/TracksLibraryService'
import { CLOUD_LABELS } from '@/storage/cloud/CloudStorage'
import TooltipButton from './TooltipButton'
import TracksLibraryProblems from './TracksLibraryProblems'
import TracksLibraryQuotaRing from './TracksLibraryQuotaRing'
import TracksLibrarySourceIcon from './TracksLibrarySourceIcon'
import { ActionButton, Message } from './TracksLibraryUi'

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

/** Une source branchée, sur une ligne : logo, compte, état, espace, actions. */
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
  const active = status.step === 'ready' || status.step === 'opening' || status.step === 'unmanaged'

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
        return `${plural(status.audioFileCount, 'morceau', 'morceaux')}, pas encore une source`
      case 'problem':
        return <span className="text-red-300">illisible</span>
      case 'error':
        return <span className="text-red-300">erreur</span>
      case 'ready': {
        const count = status.library.index.tracks.length
        const report = status.report && !isEmptyReport(status.report) ? ` · ${changes(status.report)}` : ''
        return `${plural(count, 'piste', 'pistes')} · ${formatBytes(status.usedBytes)}${report}`
      }
    }
  }

  /** L’action principale de l’état, quand il y en a une, reste sur la ligne. */
  const action = () => {
    switch (status.step) {
      case 'needs-permission':
        return (
          <ActionButton tone="primary" onClick={onReopen}>
            {cloud ? <LogIn className="h-4 w-4" /> : <FolderOpen className="h-4 w-4" />}
            {cloud ? 'Se connecter' : 'Ouvrir'}
          </ActionButton>
        )
      case 'unmanaged':
        return (
          <TooltipButton
            onClick={onInitialize}
            tooltip="Vos fichiers ne seront ni déplacés ni modifiés"
            className="inline-flex items-center gap-2 rounded bg-purple-600 px-3 py-1.5 text-sm text-on-accent transition-colors hover:bg-purple-500"
          >
            <Check className="h-4 w-4" />
            {cloud ? 'Utiliser ce compte' : 'Utiliser ce dossier'}
          </TooltipButton>
        )
      case 'error':
        return (
          <ActionButton tone="primary" onClick={onReopen}>
            Réessayer
          </ActionButton>
        )
      case 'ready':
        return status.report && status.report.missing.length > 1 ? (
          <ActionButton onClick={() => onRemoveMissing(status.report!.missing.map(t => t.id))}>
            <ListX className="h-4 w-4" />
            Retirer les {status.report.missing.length} introuvables
          </ActionButton>
        ) : null
      default:
        return null
    }
  }

  return (
    <li className="space-y-2 rounded-lg bg-gray-800 px-4 py-2">
      <div className="flex items-center gap-2">
        <TracksLibrarySourceIcon kind={source.kind} active={active} />
        <span className="truncate font-medium text-white">{source.label}</span>
        <span className="truncate text-sm text-gray-400">· {summary()}</span>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {action()}
          {source.kind !== 'local' && status.step === 'ready' && source.quota && (
            <TracksLibraryQuotaRing used={source.quota.used} total={source.quota.total} library={status.usedBytes} />
          )}
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

      {status.step === 'needs-permission' && status.denied && (
        <p className="text-sm text-red-300">L’accès a été refusé. Réessayez, ou débranchez la source.</p>
      )}
      {status.step === 'needs-permission' && !status.denied && cloud && (
        <p className="text-sm text-gray-400">Connectez-vous à {CLOUD_LABELS[source.kind]} pour ouvrir cette source.</p>
      )}
      {status.step === 'problem' && <TracksLibraryProblems problems={status.problems} onReset={onReset} onReload={onRefresh} />}
      {status.step === 'error' && <Message message={status.error} tone="error" />}
    </li>
  )
}
