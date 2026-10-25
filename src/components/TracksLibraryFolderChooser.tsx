'use client'

import { Cloud, FolderOpen, FolderSearch, TriangleAlert } from 'lucide-react'
import { ActionButton, Panel } from './TracksLibraryUi'

/** Fournisseurs cloud prévus : affichés pour que l’utilisateur sache qu’ils arrivent. */
const CLOUD_PROVIDERS = ['Dropbox', 'Google Drive', 'OneDrive']

function CloudProviders() {
  return (
    <ul className="flex flex-wrap gap-2">
      {CLOUD_PROVIDERS.map(name => (
        <li key={name} className="flex items-center gap-1.5 rounded bg-gray-700/60 px-2.5 py-1 text-gray-400">
          <Cloud className="h-4 w-4" />
          {name} <span className="text-xs">(bientôt)</span>
        </li>
      ))}
    </ul>
  )
}

/** Firefox et Safari : le dossier local est impossible, il faudra passer par un cloud. */
export function UnsupportedBrowser() {
  return (
    <Panel title="Dossier local indisponible dans ce navigateur" icon={<TriangleAlert className="h-5 w-5 text-red-400" />}>
      <p>
        L’accès à un dossier de votre ordinateur repose sur la File System Access API, que seuls les navigateurs basés
        sur Chromium proposent (Chrome, Edge, Brave, Opera). Firefox et Safari ne la prennent pas en charge.
      </p>
      <p>Ouvrez MJScreen dans l’un de ces navigateurs, ou utilisez un stockage en ligne :</p>
      <CloudProviders />
    </Panel>
  )
}

interface NoFolderProps {
  onPick: () => void
}

export function NoFolder({ onPick }: NoFolderProps) {
  return (
    <Panel title="Choisir la bibliothèque" icon={<FolderOpen className="h-5 w-5 text-purple-400" />}>
      <p>
        Choisissez le dossier qui contient (ou contiendra) vos pistes. MJScreen y range sa configuration et son index dans
        un sous-dossier <code className="text-purple-300">.mjlib/</code> : rien de la bibliothèque n’est gardé dans le
        navigateur, et vous pouvez la rouvrir depuis une autre machine.
      </p>
      <ActionButton tone="primary" onClick={onPick}>
        <FolderSearch className="h-4 w-4" />
        Choisir un dossier
      </ActionButton>
      <p className="pt-2 text-gray-400">Autres stockages :</p>
      <CloudProviders />
    </Panel>
  )
}

interface NeedsPermissionProps {
  folderName: string
  denied?: boolean
  onReopen: () => void
  onPick: () => void
}

/** Le navigateur se souvient du dossier, mais l’accès doit être réautorisé à chaque session. */
export function NeedsPermission({ folderName, denied, onReopen, onPick }: NeedsPermissionProps) {
  return (
    <Panel title="Rouvrir la bibliothèque" icon={<FolderOpen className="h-5 w-5 text-purple-400" />}>
      <p>
        Le navigateur demande de confirmer l’accès au dossier <strong className="text-gray-100">{folderName}</strong> à
        chaque nouvelle session.
      </p>
      {denied && <p className="text-red-300">L’accès a été refusé. Réessayez, ou choisissez un autre dossier.</p>}
      <div className="flex flex-wrap gap-2">
        <ActionButton tone="primary" onClick={onReopen}>
          <FolderOpen className="h-4 w-4" />
          Rouvrir « {folderName} »
        </ActionButton>
        <ActionButton onClick={onPick}>
          <FolderSearch className="h-4 w-4" />
          Choisir un autre dossier
        </ActionButton>
      </div>
    </Panel>
  )
}

interface OpenErrorProps {
  message: string
  onRetry?: () => void
  onPick: () => void
}

export function OpenError({ message, onRetry, onPick }: OpenErrorProps) {
  return (
    <Panel title="Impossible d’ouvrir le dossier" icon={<TriangleAlert className="h-5 w-5 text-red-400" />}>
      <p className="text-red-300">{message}</p>
      <div className="flex flex-wrap gap-2">
        {onRetry && (
          <ActionButton tone="primary" onClick={onRetry}>
            Réessayer
          </ActionButton>
        )}
        <ActionButton onClick={onPick}>
          <FolderSearch className="h-4 w-4" />
          Choisir un autre dossier
        </ActionButton>
      </div>
    </Panel>
  )
}
