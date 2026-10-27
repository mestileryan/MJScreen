import { joinPath, normalizePath, parentPath, pathSegments } from '@/lib/storagePath'
import { StorageError, type ListOptions, type StorageEntry } from '../StorageProvider'
import { cloudFetch } from './cloudFetch'
import type { CloudAccount, CloudQuota, CloudStorage, TokenProvider } from './CloudStorage'

const GRAPH = 'https://graph.microsoft.com/v1.0'
/** Dossier d’application (`Apps/MJScreen/`), seul endroit du OneDrive que MJScreen voit. */
const ROOT = `${GRAPH}/me/drive/special/approot`
const SELECT = '$select=name,size,lastModifiedDateTime,folder,file'
/** Au-delà, Graph exige une session d’envoi par morceaux (multiples de 320 Kio). */
const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024
const CHUNK = 320 * 1024 * 30

interface DriveItem {
  name: string
  size?: number
  lastModifiedDateTime?: string
  folder?: object
  file?: object
}

/** OneDrive via Microsoft Graph, dans le dossier d’application. Les chemins y sont relatifs. */
export class OneDriveStorage implements CloudStorage {
  readonly kind = 'onedrive'
  readonly label: string
  private readonly token: TokenProvider
  private readonly fetchFn: typeof fetch
  /** Dossiers dont on sait qu’ils existent, pour ne pas les recréer à chaque envoi. */
  private readonly knownFolders = new Set<string>([''])

  constructor(label: string, token: TokenProvider, fetchFn: typeof fetch = fetch) {
    this.label = label
    this.token = token
    this.fetchFn = fetchFn
  }

  async list(path: string, { recursive = false }: ListOptions = {}): Promise<StorageEntry[]> {
    const dir = normalizePath(path)
    const entries: StorageEntry[] = []
    const queue = [dir]
    while (queue.length) {
      const parent = queue.shift()!
      let url: string | undefined = `${itemUrl(parent)}/children?${SELECT}`
      while (url) {
        const page = (await (await cloudFetch(this.token, this.fetchFn, url, { path: parent })).json()) as {
          value: DriveItem[]
          '@odata.nextLink'?: string
        }
        for (const item of page.value) {
          const entry = toEntry(joinPath(parent, item.name), item)
          entries.push(entry)
          if (entry.kind === 'directory') {
            this.knownFolders.add(entry.path)
            if (recursive) queue.push(entry.path)
          }
        }
        url = page['@odata.nextLink']
      }
    }
    return entries
  }

  async stat(path: string): Promise<StorageEntry | null> {
    const normalized = normalizePath(path)
    if (normalized === '') return { path: '', name: this.label, kind: 'directory' }
    try {
      const response = await cloudFetch(this.token, this.fetchFn, `${itemUrl(normalized)}?${SELECT}`, { path: normalized })
      return toEntry(normalized, (await response.json()) as DriveItem)
    } catch (error) {
      if (error instanceof StorageError && error.code === 'not-found') return null
      throw error
    }
  }

  async read(path: string): Promise<Blob> {
    const normalized = normalizePath(path)
    const response = await cloudFetch(this.token, this.fetchFn, `${itemUrl(normalized)}/content`, { path: normalized })
    return response.blob()
  }

  async readStream(path: string): Promise<ReadableStream<Uint8Array>> {
    return (await this.read(path)).stream()
  }

  async write(path: string, data: Blob | string): Promise<void> {
    const normalized = normalizePath(path)
    const blob = typeof data === 'string' ? new Blob([data]) : data
    await this.ensureFolder(parentPath(normalized))
    if (blob.size <= SIMPLE_UPLOAD_LIMIT) {
      await cloudFetch(this.token, this.fetchFn, `${itemUrl(normalized)}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: blob,
        path: normalized,
      })
      return
    }
    const session = await cloudFetch(this.token, this.fetchFn, `${itemUrl(normalized)}/createUploadSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { '@microsoft.graph.conflictBehavior': 'replace' } }),
      path: normalized,
    })
    const { uploadUrl } = (await session.json()) as { uploadUrl: string }
    for (let start = 0; start < blob.size; start += CHUNK) {
      const end = Math.min(start + CHUNK, blob.size)
      // L’URL de session porte sa propre autorisation : pas de jeton ici.
      const response = await this.fetchFn(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Range': `bytes ${start}-${end - 1}/${blob.size}` },
        body: blob.slice(start, end),
      })
      if (!response.ok) throw new StorageError('unknown', normalized, `Envoi refusé par OneDrive (${response.status}).`)
    }
  }

  async delete(path: string): Promise<void> {
    const normalized = normalizePath(path)
    const entry = await this.stat(normalized)
    if (!entry) throw new StorageError('not-found', normalized, `Fichier introuvable : « ${normalized} ».`)
    if (entry.kind !== 'file') throw new StorageError('type-mismatch', normalized, `« ${normalized} » est un dossier.`)
    await cloudFetch(this.token, this.fetchFn, itemUrl(normalized), { method: 'DELETE', path: normalized })
  }

  async account(): Promise<CloudAccount> {
    const response = await cloudFetch(this.token, this.fetchFn, `${GRAPH}/me?$select=id,displayName,mail,userPrincipalName`)
    const me = (await response.json()) as { id: string; displayName: string; mail?: string; userPrincipalName?: string }
    return { id: me.id, label: me.mail || me.userPrincipalName || me.displayName }
  }

  async quota(): Promise<CloudQuota> {
    const response = await cloudFetch(this.token, this.fetchFn, `${GRAPH}/me/drive?$select=quota`)
    const { quota } = (await response.json()) as { quota: { used: number; total?: number } }
    return { used: quota.used, total: quota.total }
  }

  /** Graph ne crée pas les dossiers intermédiaires à l’envoi : on les crée un à un, en ignorant ceux qui existent. */
  private async ensureFolder(path: string): Promise<void> {
    if (this.knownFolders.has(path)) return
    const parent = parentPath(path)
    await this.ensureFolder(parent)
    const name = pathSegments(path).pop()!
    const response = await this.fetchFn(`${itemUrl(parent)}/children`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await this.token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' }),
    })
    // 409 : le dossier existe déjà, c’est ce qu’on voulait.
    if (!response.ok && response.status !== 409) {
      throw new StorageError('unknown', path, `OneDrive n’a pas pu créer le dossier « ${path} » (${response.status}).`)
    }
    this.knownFolders.add(path)
  }
}

/** Adresse d’un élément par son chemin : `approot` pour la racine, `approot:/a/b:` sinon. */
function itemUrl(path: string): string {
  return path === '' ? ROOT : `${ROOT}:/${path.split('/').map(encodeURIComponent).join('/')}:`
}

function toEntry(path: string, item: DriveItem): StorageEntry {
  if (item.folder) return { path, name: item.name, kind: 'directory' }
  return {
    path,
    name: item.name,
    kind: 'file',
    size: item.size,
    lastModified: item.lastModifiedDateTime ? Date.parse(item.lastModifiedDateTime) : undefined,
  }
}
