import type { StorageKind, StorageProvider } from '../StorageProvider'

export type CloudKind = Extract<StorageKind, 'dropbox' | 'google-drive' | 'onedrive'>

export const CLOUD_KINDS: CloudKind[] = ['dropbox', 'google-drive', 'onedrive']

export const CLOUD_LABELS: Record<CloudKind, string> = {
  dropbox: 'Dropbox',
  'google-drive': 'Google Drive',
  onedrive: 'OneDrive',
}

/** Espace du compte, en octets. `total` absent quand le service ne le dit pas. */
export interface CloudQuota {
  used: number
  total?: number
}

export interface CloudAccount {
  /** Identifiant stable du compte chez le service. */
  id: string
  /** Nom ou adresse à afficher. */
  label: string
}

/** Un stockage cloud : un `StorageProvider` qui sait en plus dire qui est connecté et combien de place il reste. */
export interface CloudStorage extends StorageProvider {
  readonly kind: CloudKind
  account(): Promise<CloudAccount>
  quota(): Promise<CloudQuota>
}

/** Fournit un jeton d’accès valide, rafraîchi au besoin. Lève si le compte n’est pas connecté. */
export type TokenProvider = () => Promise<string>
