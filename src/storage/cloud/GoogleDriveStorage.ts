import { baseName, joinPath, normalizePath, parentPath, pathSegments } from '@/lib/storagePath'
import { StorageError, type ListOptions, type StorageEntry } from '../StorageProvider'
import { cloudFetch } from './cloudFetch'
import type { CloudAccount, CloudQuota, CloudStorage, TokenProvider } from './CloudStorage'

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER = 'application/vnd.google-apps.folder'
const FIELDS = 'id,name,mimeType,size,modifiedTime'
/** Dossier à la racine du Drive qui porte la bibliothèque (seuls les fichiers créés par MJScreen sont visibles). */
export const DRIVE_ROOT_FOLDER = 'MJScreen'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
}

/**
 * Google Drive, avec la seule permission `drive.file` : MJScreen ne voit que ce
 * qu’il a créé. Drive raisonne en identifiants, pas en chemins : chaque chemin est
 * résolu segment par segment, et le résultat mis en cache.
 */
export class GoogleDriveStorage implements CloudStorage {
  readonly kind = 'google-drive'
  readonly label: string
  private readonly token: TokenProvider
  private readonly fetchFn: typeof fetch
  /** Chemin normalisé → identifiant Drive. La racine est résolue au premier usage. */
  private readonly ids = new Map<string, string>()

  constructor(label: string, token: TokenProvider, fetchFn: typeof fetch = fetch) {
    this.label = label
    this.token = token
    this.fetchFn = fetchFn
  }

  async list(path: string, { recursive = false }: ListOptions = {}): Promise<StorageEntry[]> {
    const dir = normalizePath(path)
    const id = await this.resolve(dir)
    if (!id) throw new StorageError('not-found', dir, `Dossier introuvable : « ${dir} ».`)
    const entries: StorageEntry[] = []
    const queue = [{ path: dir, id }]
    while (queue.length) {
      const { path: parent, id: parentId } = queue.shift()!
      for (const file of await this.children(parentId)) {
        const childPath = joinPath(parent, file.name)
        const entry = toEntry(childPath, file)
        entries.push(entry)
        this.ids.set(childPath, file.id)
        if (recursive && entry.kind === 'directory') queue.push({ path: childPath, id: file.id })
      }
    }
    return entries
  }

  async stat(path: string): Promise<StorageEntry | null> {
    const normalized = normalizePath(path)
    if (normalized === '') return { path: '', name: this.label, kind: 'directory' }
    const id = await this.resolve(normalized)
    if (!id) return null
    const response = await cloudFetch(this.token, this.fetchFn, `${API}/files/${id}?fields=${FIELDS}`, { path: normalized })
    return toEntry(normalized, (await response.json()) as DriveFile)
  }

  async read(path: string): Promise<Blob> {
    const normalized = normalizePath(path)
    const id = await this.fileId(normalized)
    const response = await cloudFetch(this.token, this.fetchFn, `${API}/files/${id}?alt=media`, { path: normalized })
    return response.blob()
  }

  async readStream(path: string): Promise<ReadableStream<Uint8Array>> {
    return (await this.read(path)).stream()
  }

  /** Envoi « reprenable » : une seule session, un seul PUT, mais sans limite de taille. */
  async write(path: string, data: Blob | string): Promise<void> {
    const normalized = normalizePath(path)
    const blob = typeof data === 'string' ? new Blob([data]) : data
    const existing = await this.resolve(normalized)
    const session = existing
      ? await cloudFetch(this.token, this.fetchFn, `${UPLOAD}/files/${existing}?uploadType=resumable`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          path: normalized,
        })
      : await cloudFetch(this.token, this.fetchFn, `${UPLOAD}/files?uploadType=resumable`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: baseName(normalized), parents: [await this.resolve(parentPath(normalized), true)] }),
          path: normalized,
        })
    const location = session.headers.get('Location')
    if (!location) throw new StorageError('unknown', normalized, 'Google Drive n’a pas ouvert de session d’envoi.')
    const done = await this.fetchFn(location, { method: 'PUT', body: blob })
    if (!done.ok) throw new StorageError('unknown', normalized, `Envoi refusé par Google Drive (${done.status}).`)
    const file = (await done.json()) as DriveFile
    this.ids.set(normalized, file.id)
  }

  async delete(path: string): Promise<void> {
    const normalized = normalizePath(path)
    const id = await this.fileId(normalized)
    await cloudFetch(this.token, this.fetchFn, `${API}/files/${id}`, { method: 'DELETE', path: normalized })
    this.ids.delete(normalized)
  }

  async account(): Promise<CloudAccount> {
    const response = await cloudFetch(this.token, this.fetchFn, `${API}/about?fields=user(permissionId,emailAddress,displayName)`)
    const { user } = (await response.json()) as { user: { permissionId: string; emailAddress?: string; displayName: string } }
    return { id: user.permissionId, label: user.emailAddress || user.displayName }
  }

  async quota(): Promise<CloudQuota> {
    const response = await cloudFetch(this.token, this.fetchFn, `${API}/about?fields=storageQuota(limit,usage)`)
    const { storageQuota } = (await response.json()) as { storageQuota: { limit?: string; usage: string } }
    return { used: Number(storageQuota.usage), total: storageQuota.limit ? Number(storageQuota.limit) : undefined }
  }

  /** Identifiant d’un fichier existant ; lève s’il manque ou si c’est un dossier. */
  private async fileId(path: string): Promise<string> {
    const entry = await this.stat(path)
    if (!entry) throw new StorageError('not-found', path, `Fichier introuvable : « ${path} ».`)
    if (entry.kind !== 'file') throw new StorageError('type-mismatch', path, `« ${path} » est un dossier.`)
    return (await this.resolve(path))!
  }

  /** Identifiant du chemin, en créant les dossiers manquants si `create`. `null` s’il n’existe pas. */
  private async resolve(path: string, create = false): Promise<string | null> {
    const cached = this.ids.get(path)
    if (cached) return cached
    if (path === '') {
      const root = (await this.findChild('root', DRIVE_ROOT_FOLDER, FOLDER)) ?? (create ? await this.createFolder('root', DRIVE_ROOT_FOLDER) : null)
      if (root) this.ids.set('', root.id)
      return root?.id ?? null
    }
    const segments = pathSegments(path)
    const name = segments[segments.length - 1]
    const parentId = await this.resolve(parentPath(path), create)
    if (!parentId) return null
    const found = (await this.findChild(parentId, name)) ?? (create ? await this.createFolder(parentId, name) : null)
    if (found) this.ids.set(path, found.id)
    return found?.id ?? null
  }

  private async findChild(parentId: string, name: string, mimeType?: string): Promise<DriveFile | null> {
    const q = [`'${parentId}' in parents`, `name = '${name.replace(/['\\]/g, '\\$&')}'`, 'trashed = false', mimeType && `mimeType = '${mimeType}'`]
      .filter(Boolean)
      .join(' and ')
    const response = await cloudFetch(this.token, this.fetchFn, `${API}/files?q=${encodeURIComponent(q)}&fields=files(${FIELDS})&pageSize=2`)
    const { files } = (await response.json()) as { files: DriveFile[] }
    return files[0] ?? null
  }

  private async createFolder(parentId: string, name: string): Promise<DriveFile> {
    const response = await cloudFetch(this.token, this.fetchFn, `${API}/files?fields=${FIELDS}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER, parents: [parentId] }),
    })
    return (await response.json()) as DriveFile
  }

  private async children(parentId: string): Promise<DriveFile[]> {
    const files: DriveFile[] = []
    let pageToken: string | undefined
    do {
      const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`)
      const url = `${API}/files?q=${q}&fields=nextPageToken,files(${FIELDS})&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`
      const page = (await (await cloudFetch(this.token, this.fetchFn, url)).json()) as { files: DriveFile[]; nextPageToken?: string }
      files.push(...page.files)
      pageToken = page.nextPageToken
    } while (pageToken)
    return files
  }
}

function toEntry(path: string, file: DriveFile): StorageEntry {
  if (file.mimeType === FOLDER) return { path, name: file.name, kind: 'directory' }
  return {
    path,
    name: file.name,
    kind: 'file',
    size: file.size !== undefined ? Number(file.size) : undefined,
    lastModified: file.modifiedTime ? Date.parse(file.modifiedTime) : undefined,
  }
}
