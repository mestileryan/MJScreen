import { baseName, joinPath, normalizePath, parentPath, pathSegments } from '@/lib/storagePath'
import { StorageError, type ListOptions, type StorageEntry, type StorageProvider } from '../StorageProvider'

/**
 * Dossier du poste de l'utilisateur, via la File System Access API (Chromium seulement).
 * Le handle racine est obtenu par `showDirectoryPicker` ; la permission d'y écrire
 * doit être redemandée à chaque session (voir `localFolder.ts`).
 */
export class LocalFolderProvider implements StorageProvider {
  readonly kind = 'local'
  readonly root: FileSystemDirectoryHandle

  constructor(root: FileSystemDirectoryHandle) {
    this.root = root
  }

  get label(): string {
    return this.root.name
  }

  async list(path: string, { recursive = false }: ListOptions = {}): Promise<StorageEntry[]> {
    const dirPath = normalizePath(path)
    const entries: StorageEntry[] = []
    const visit = async (dir: FileSystemDirectoryHandle, prefix: string) => {
      for await (const handle of dir.values()) {
        const childPath = joinPath(prefix, handle.name)
        // lib.dom de TypeScript 5.6 type les entrées en `FileSystemHandle` : `kind`
        // les discrimine à l'exécution, la conversion ne fait que le refléter.
        if (handle.kind === 'file') {
          entries.push(await fileEntry(childPath, handle as FileSystemFileHandle))
        } else {
          entries.push({ path: childPath, name: handle.name, kind: 'directory' })
          if (recursive) await visit(handle as FileSystemDirectoryHandle, childPath)
        }
      }
    }
    await guard(dirPath, async () => visit(await this.directory(dirPath), dirPath))
    return entries
  }

  async stat(path: string): Promise<StorageEntry | null> {
    const normalized = normalizePath(path)
    if (normalized === '') return { path: '', name: this.root.name, kind: 'directory' }
    try {
      return await guard(normalized, async () => {
        const handle = await this.childHandle(normalized)
        return handle.kind === 'file'
          ? fileEntry(normalized, handle)
          : { path: normalized, name: handle.name, kind: 'directory' }
      })
    } catch (error) {
      if (error instanceof StorageError && (error.code === 'not-found' || error.code === 'type-mismatch')) return null
      throw error
    }
  }

  async read(path: string): Promise<Blob> {
    const normalized = normalizePath(path)
    return guard(normalized, async () => (await this.fileHandle(normalized)).getFile())
  }

  async readStream(path: string): Promise<ReadableStream<Uint8Array>> {
    return (await this.read(path)).stream()
  }

  async write(path: string, data: Blob | string): Promise<void> {
    const normalized = normalizePath(path)
    await guard(normalized, async () => {
      const handle = await this.fileHandle(normalized, true)
      // Chromium écrit dans un fichier temporaire et ne remplace l'original qu'à
      // `close()` : une écriture interrompue laisse l'ancien contenu intact.
      const writable = await handle.createWritable()
      try {
        await writable.write(data)
        await writable.close()
      } catch (error) {
        await writable.abort().catch(() => {})
        throw error
      }
    })
  }

  async delete(path: string): Promise<void> {
    const normalized = normalizePath(path)
    await guard(normalized, async () => {
      // `getFileHandle` lève si l'entrée est un dossier : un dossier n'est jamais supprimé ici.
      await this.fileHandle(normalized)
      const parent = await this.directory(parentPath(normalized))
      await parent.removeEntry(baseName(normalized))
    })
  }

  private async directory(path: string, create = false): Promise<FileSystemDirectoryHandle> {
    let dir = this.root
    for (const segment of pathSegments(path)) dir = await dir.getDirectoryHandle(segment, { create })
    return dir
  }

  private async fileHandle(path: string, create = false): Promise<FileSystemFileHandle> {
    const name = baseName(path)
    if (name === '') throw new DOMException('La racine n\'est pas un fichier.', 'TypeMismatchError')
    const dir = await this.directory(parentPath(path), create)
    return dir.getFileHandle(name, { create })
  }

  /** Handle d'un élément dont on ignore s'il est fichier ou dossier. */
  private async childHandle(path: string): Promise<FileSystemFileHandle | FileSystemDirectoryHandle> {
    const dir = await this.directory(parentPath(path))
    const name = baseName(path)
    try {
      return await dir.getFileHandle(name)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TypeMismatchError') return dir.getDirectoryHandle(name)
      throw error
    }
  }
}

async function fileEntry(path: string, handle: FileSystemFileHandle): Promise<StorageEntry> {
  const file = await handle.getFile()
  return { path, name: handle.name, kind: 'file', size: file.size, lastModified: file.lastModified }
}

/** Traduit les `DOMException` de l'API en `StorageError`, communes à tous les fournisseurs. */
async function guard<T>(path: string, action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof StorageError || !(error instanceof DOMException)) throw error
    switch (error.name) {
      case 'NotFoundError':
        throw new StorageError('not-found', path, `Introuvable : « ${path} ».`, { cause: error })
      case 'TypeMismatchError':
        throw new StorageError('type-mismatch', path, `Type inattendu (fichier ou dossier) : « ${path} ».`, {
          cause: error,
        })
      case 'NotAllowedError':
      case 'SecurityError':
        throw new StorageError('permission-denied', path, `Accès refusé au dossier local (« ${path} »).`, {
          cause: error,
        })
      default:
        throw new StorageError('unknown', path, `${error.name} : ${error.message}`, { cause: error })
    }
  }
}
