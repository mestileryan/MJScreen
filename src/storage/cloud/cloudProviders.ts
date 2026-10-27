import { publicUrl } from '@/lib/basePath'
import { CLOUD_KINDS, CLOUD_LABELS, type CloudKind, type CloudStorage } from './CloudStorage'
import { DropboxStorage } from './DropboxStorage'
import { GoogleDriveStorage } from './GoogleDriveStorage'
import { mockCloudStorage } from './MockCloudStorage'
import { OAuthClient, type OAuthConfig } from './oauth'
import { OneDriveStorage } from './OneDriveStorage'

/**
 * Les trois clouds, configurés par l’environnement : un identifiant client public
 * par service (`NEXT_PUBLIC_…_CLIENT_ID`, voir le README), jamais de secret.
 * `NEXT_PUBLIC_CLOUD_MOCK=true` remplace les trois par un cloud simulé.
 */

const MOCK = process.env.NEXT_PUBLIC_CLOUD_MOCK === 'true'

const CLIENT_IDS: Record<CloudKind, string | undefined> = {
  dropbox: process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID,
  'google-drive': process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  onedrive: process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID,
}

/** Adresse de retour après connexion : la page de la bibliothèque, à déclarer chez chaque service. */
export function oauthRedirectUri(): string {
  return `${window.location.origin}${publicUrl('/trackslibrary/')}`
}

function oauthConfig(kind: CloudKind): OAuthConfig {
  const clientId = CLIENT_IDS[kind] ?? ''
  switch (kind) {
    case 'dropbox':
      return {
        kind,
        clientId,
        authorizeUrl: 'https://www.dropbox.com/oauth2/authorize',
        tokenUrl: 'https://api.dropboxapi.com/oauth2/token',
        scope: 'account_info.read files.metadata.read files.content.read files.content.write',
        responseType: 'code',
        extraParams: { token_access_type: 'offline' },
      }
    case 'google-drive':
      // Google n’échange pas de code sans secret pour une page web : flux implicite,
      // donc pas de rafraîchissement, et une reconnexion à chaque session.
      return {
        kind,
        clientId,
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        scope: 'https://www.googleapis.com/auth/drive.file',
        responseType: 'token',
        extraParams: { include_granted_scopes: 'true' },
      }
    case 'onedrive':
      return {
        kind,
        clientId,
        authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        scope: 'Files.ReadWrite.AppFolder User.Read offline_access',
        responseType: 'code',
      }
  }
}

export type CloudAvailability = { available: true } | { available: false; reason: string }

export function cloudAvailability(kind: CloudKind): CloudAvailability {
  if (MOCK || CLIENT_IDS[kind]) return { available: true }
  return { available: false, reason: `${CLOUD_LABELS[kind]} n’est pas configuré sur cette installation (identifiant OAuth absent).` }
}

export function isMockCloud(): boolean {
  return MOCK
}

const clients = new Map<CloudKind, OAuthClient>()

/** Client OAuth du service, un par session. */
export function cloudAuthClient(kind: CloudKind): OAuthClient {
  let client = clients.get(kind)
  if (!client) {
    client = new OAuthClient(oauthConfig(kind), { store: window.sessionStorage, redirectUri: oauthRedirectUri() })
    clients.set(kind, client)
  }
  return client
}

/** En mode simulé, la « connexion » est immédiate : un jeton factice suffit. */
export function mockConnect(kind: CloudKind): void {
  window.sessionStorage.setItem(`mjscreen.oauth.${kind}`, JSON.stringify({ accessToken: 'mock' }))
}

export function cloudConnected(kind: CloudKind): boolean {
  return cloudAuthClient(kind).connected()
}

export function cloudSignOut(kind: CloudKind): void {
  cloudAuthClient(kind).signOut()
}

/** Le stockage du service pour le compte connecté. `label` est le nom affiché (adresse du compte). */
export function createCloudStorage(kind: CloudKind, label: string): CloudStorage {
  if (MOCK) return mockCloudStorage(kind)
  const token = () => cloudAuthClient(kind).token()
  switch (kind) {
    case 'dropbox':
      return new DropboxStorage(label, token)
    case 'google-drive':
      return new GoogleDriveStorage(label, token)
    case 'onedrive':
      return new OneDriveStorage(label, token)
  }
}

export { CLOUD_KINDS, CLOUD_LABELS }
