import { baseName, normalizePath, parentPath } from '@/lib/storagePath'
import { StorageError, type ListOptions, type StorageEntry, type StorageProvider } from './StorageProvider'

interface MemoryFile {
  blob: Blob
  lastModified: number
}

/**
 * Stockage en mémoire, sans persistance. Sert de référence de comportement et de
 * doublure dans les tests : le chargement de la bibliothèque s'éprouve dessus
 * sans navigateur. Les dossiers n'existent qu'à travers les fichiers qu'ils contiennent.
 */
export class MemoryStorageProvider implements StorageProvider {
  readonly kind = 'memory'
  readonly label: string
  private readonly files = new Map<string, MemoryFile>()

  constructor(label = 'Mémoire', initial: Record<string, string | Blob> = {}) {
    this.label = label
    for (const [path, data] of Object.entries(initial)) this.put(path, data)
  }

  /** Chemins de tous les fichiers, triés : pratique pour vérifier un état dans un test. */
  paths(): string[] {
    return [...this.files.keys()].sort()
  }

  async list(path: string, { recursive = false }: ListOptions = {}): Promise<StorageEntry[]> {
    const dir = normalizePath(path)
    if (!this.isDirectory(dir)) throw this.missingDirectory(dir)

    const prefix = dir === '' ? '' : `${dir}/`
    const entries = new Map<string, StorageEntry>()
    for (const [filePath, file] of this.files) {
      if (!filePath.startsWith(prefix)) continue
      const segments = filePath.slice(prefix.length).split('/')
      // Chaque dossier intermédiaire apparaît une fois, avant ou après ses fichiers.
      const depth = recursive ? segments.length - 1 : Math.min(segments.length - 1, 1)
      for (let i = 1; i <= depth; i++) {
        const dirPath = prefix + segments.slice(0, i).join('/')
        entries.set(dirPath, { path: dirPath, name: segments[i - 1], kind: 'directory' })
      }
      if (recursive || segments.length === 1) entries.set(filePath, this.fileEntry(filePath, file))
    }
    return [...entries.values()]
  }

  async stat(path: string): Promise<StorageEntry | null> {
    const normalized = normalizePath(path)
    const file = this.files.get(normalized)
    if (file) return this.fileEntry(normalized, file)
    if (this.isDirectory(normalized)) return { path: normalized, name: baseName(normalized), kind: 'directory' }
    return null
  }

  async read(path: string): Promise<Blob> {
    return this.getFile(path).blob
  }

  async readStream(path: string): Promise<ReadableStream<Uint8Array>> {
    return this.getFile(path).blob.stream()
  }

  async write(path: string, data: Blob | string): Promise<void> {
    const normalized = normalizePath(path)
    if (this.isDirectory(normalized)) {
      throw new StorageError('type-mismatch', normalized, `« ${normalized} » est un dossier.`)
    }
    for (let parent = parentPath(normalized); parent !== ''; parent = parentPath(parent)) {
      if (this.files.has(parent)) {
        throw new StorageError('type-mismatch', parent, `« ${parent} » est un fichier, pas un dossier.`)
      }
    }
    this.put(normalized, data)
  }

  async delete(path: string): Promise<void> {
    const normalized = normalizePath(path)
    this.getFile(normalized)
    this.files.delete(normalized)
  }

  private put(path: string, data: Blob | string) {
    const blob = typeof data === 'string' ? new Blob([data], { type: 'text/plain' }) : data
    this.files.set(normalizePath(path), { blob, lastModified: Date.now() })
  }

  private getFile(path: string): MemoryFile {
    const normalized = normalizePath(path)
    const file = this.files.get(normalized)
    if (file) return file
    if (this.isDirectory(normalized)) {
      throw new StorageError('type-mismatch', normalized, `« ${normalized} » est un dossier.`)
    }
    throw new StorageError('not-found', normalized, `Fichier introuvable : « ${normalized} ».`)
  }

  private isDirectory(path: string): boolean {
    if (path === '') return true
    const prefix = `${path}/`
    for (const filePath of this.files.keys()) if (filePath.startsWith(prefix)) return true
    return false
  }

  private missingDirectory(path: string): StorageError {
    return this.files.has(path)
      ? new StorageError('type-mismatch', path, `« ${path} » est un fichier, pas un dossier.`)
      : new StorageError('not-found', path, `Dossier introuvable : « ${path} ».`)
  }

  private fileEntry(path: string, file: MemoryFile): StorageEntry {
    return { path, name: baseName(path), kind: 'file', size: file.blob.size, lastModified: file.lastModified }
  }
}
