import { baseName, normalizePath } from '@/lib/storagePath'
import { StorageError, type ListOptions, type StorageEntry } from '../StorageProvider'
import type { CloudAccount, CloudQuota, CloudStorage, TokenProvider } from './CloudStorage'

const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'

interface DropboxMetadata {
  '.tag': 'file' | 'folder' | 'deleted'
  name: string
  path_display?: string
  path_lower?: string
  size?: number
  server_modified?: string
}

/**
 * Dropbox, dans le dossier d’application (`Apps/MJScreen/`) : les chemins de la
 * bibliothèque y sont relatifs. Les dossiers parents sont créés par Dropbox à
 * l’envoi d’un fichier.
 */
export class DropboxStorage implements CloudStorage {
  readonly kind = 'dropbox'
  readonly label: string
  private readonly token: TokenProvider
  private readonly fetchFn: typeof fetch

  constructor(label: string, token: TokenProvider, fetchFn: typeof fetch = fetch) {
    this.label = label
    this.token = token
    this.fetchFn = fetchFn
  }

  async list(path: string, { recursive = false }: ListOptions = {}): Promise<StorageEntry[]> {
    const dir = normalizePath(path)
    if (dir !== '') {
      const entry = await this.stat(dir)
      if (!entry) throw new StorageError('not-found', dir, `Dossier introuvable : « ${dir} ».`)
      if (entry.kind !== 'directory') throw new StorageError('type-mismatch', dir, `« ${dir} » est un fichier, pas un dossier.`)
    }
    const entries: StorageEntry[] = []
    let page = await this.rpc<{ entries: DropboxMetadata[]; cursor: string; has_more: boolean }>(
      'files/list_folder',
      { path: dropboxPath(dir), recursive, include_deleted: false },
      dir,
    )
    for (;;) {
      for (const item of page.entries) {
        const entry = toEntry(item)
        if (entry) entries.push(entry)
      }
      if (!page.has_more) return entries
      page = await this.rpc('files/list_folder/continue', { cursor: page.cursor }, dir)
    }
  }

  async stat(path: string): Promise<StorageEntry | null> {
    const normalized = normalizePath(path)
    if (normalized === '') return { path: '', name: this.label, kind: 'directory' }
    try {
      return toEntry(await this.rpc<DropboxMetadata>('files/get_metadata', { path: dropboxPath(normalized) }, normalized))
    } catch (error) {
      if (error instanceof StorageError && error.code === 'not-found') return null
      throw error
    }
  }

  async read(path: string): Promise<Blob> {
    const normalized = normalizePath(path)
    const response = await this.request(
      `${CONTENT}/files/download`,
      { method: 'POST', headers: { 'Dropbox-API-Arg': apiArg({ path: dropboxPath(normalized) }) } },
      normalized,
    )
    return response.blob()
  }

  async readStream(path: string): Promise<ReadableStream<Uint8Array>> {
    return (await this.read(path)).stream()
  }

  async write(path: string, data: Blob | string): Promise<void> {
    const normalized = normalizePath(path)
    await this.request(
      `${CONTENT}/files/upload`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': apiArg({ path: dropboxPath(normalized), mode: 'overwrite', mute: true }),
        },
        body: typeof data === 'string' ? new Blob([data]) : data,
      },
      normalized,
    )
  }

  async delete(path: string): Promise<void> {
    const normalized = normalizePath(path)
    const entry = await this.stat(normalized)
    if (!entry) throw new StorageError('not-found', normalized, `Fichier introuvable : « ${normalized} ».`)
    // Supprimer un dossier emporterait tout son contenu : jamais par ce biais.
    if (entry.kind !== 'file') throw new StorageError('type-mismatch', normalized, `« ${normalized} » est un dossier.`)
    await this.rpc('files/delete_v2', { path: dropboxPath(normalized) }, normalized)
  }

  async account(): Promise<CloudAccount> {
    const me = await this.rpc<{ account_id: string; email: string; name: { display_name: string } }>('users/get_current_account', null)
    return { id: me.account_id, label: me.email || me.name.display_name }
  }

  async quota(): Promise<CloudQuota> {
    const usage = await this.rpc<{ used: number; allocation: { allocated?: number } }>('users/get_space_usage', null)
    return { used: usage.used, total: usage.allocation.allocated }
  }

  /** Appel RPC JSON. */
  private async rpc<T>(endpoint: string, body: unknown, path = ''): Promise<T> {
    const response = await this.request(
      `${API}/${endpoint}`,
      {
        method: 'POST',
        headers: body === null ? {} : { 'Content-Type': 'application/json' },
        body: body === null ? undefined : JSON.stringify(body),
      },
      path,
    )
    return (await response.json()) as T
  }

  /** Appel authentifié. Dropbox répond 409 avec un résumé d’erreur pour un chemin absent, RPC ou contenu. */
  private async request(url: string, init: RequestInit, path: string): Promise<Response> {
    const response = await this.fetchFn(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${await this.token()}` },
    })
    if (response.ok) return response
    const text = await response.text().catch(() => '')
    if (response.status === 409 && /not_found/.test(text)) {
      throw new StorageError('not-found', path, `Introuvable : « ${path} ».`, { cause: text })
    }
    if (response.status === 401 || response.status === 403) {
      throw new StorageError('permission-denied', path, 'Accès refusé par Dropbox : reconnectez le compte.', { cause: text })
    }
    throw new StorageError('unknown', path, `Dropbox a répondu ${response.status}.`, { cause: text })
  }
}

/** Dropbox veut `/chemin`, et une chaîne vide pour la racine. */
function dropboxPath(path: string): string {
  return path === '' ? '' : `/${path}`
}

/** L’en-tête `Dropbox-API-Arg` doit rester en ASCII : les accents passent en `\uXXXX`. */
function apiArg(value: unknown): string {
  return JSON.stringify(value).replace(/[\u007f-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

function toEntry(item: DropboxMetadata): StorageEntry | null {
  if (item['.tag'] === 'deleted') return null
  const path = normalizePath(item.path_display ?? item.path_lower ?? item.name)
  if (item['.tag'] === 'folder') return { path, name: item.name, kind: 'directory' }
  return {
    path,
    name: baseName(path) || item.name,
    kind: 'file',
    size: item.size,
    lastModified: item.server_modified ? Date.parse(item.server_modified) : undefined,
  }
}
