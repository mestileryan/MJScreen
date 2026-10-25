/**
 * Imitation en mémoire des handles de la File System Access API, pour tester
 * `LocalFolderProvider` sous Node. Elle reproduit les erreurs de Chromium
 * (`NotFoundError`, `TypeMismatchError`, `NotAllowedError`) et l'écriture différée
 * jusqu'à `close()`.
 */

type Entry = FakeFileHandle | FakeDirectoryHandle

const notFound = (name: string) => new DOMException(`« ${name} » introuvable`, 'NotFoundError')
const mismatch = (name: string) => new DOMException(`« ${name} » n'est pas du bon type`, 'TypeMismatchError')

/** État partagé par tous les handles d'une même arborescence. */
class Permission {
  state: PermissionState = 'granted'
  /** Réponse de l'utilisateur à la prochaine demande d'accès. */
  answer: PermissionState = 'granted'
  /** Fait échouer les écritures, comme un disque plein. */
  failWrites = false
}

export class FakeFileHandle {
  readonly kind = 'file'
  readonly name: string
  private content: Blob
  private modified = Date.now()
  private readonly permission: Permission

  constructor(name: string, permission: Permission, content: Blob = new Blob()) {
    this.name = name
    this.permission = permission
    this.content = content
  }

  async getFile(): Promise<File> {
    if (this.permission.state === 'denied') throw new DOMException('refusé', 'NotAllowedError')
    return new File([this.content], this.name, { lastModified: this.modified })
  }

  async createWritable() {
    if (this.permission.state !== 'granted') throw new DOMException('refusé', 'NotAllowedError')
    const chunks: (Blob | string)[] = []
    return {
      write: async (data: Blob | string) => {
        if (this.permission.failWrites) throw new DOMException('disque plein', 'QuotaExceededError')
        chunks.push(data)
      },
      close: async () => {
        this.content = new Blob(chunks)
        this.modified = Date.now()
      },
      abort: async () => {},
    }
  }
}

export class FakeDirectoryHandle {
  readonly kind = 'directory'
  readonly name: string
  readonly permission: Permission
  private readonly children = new Map<string, Entry>()

  constructor(name: string, permission = new Permission()) {
    this.name = name
    this.permission = permission
  }

  async queryPermission(): Promise<PermissionState> {
    return this.permission.state
  }

  async requestPermission(): Promise<PermissionState> {
    this.permission.state = this.permission.answer
    return this.permission.state
  }

  async getDirectoryHandle(name: string, { create = false } = {}): Promise<FakeDirectoryHandle> {
    const child = this.children.get(name)
    if (child instanceof FakeDirectoryHandle) return child
    if (child) throw mismatch(name)
    if (!create) throw notFound(name)
    this.assertWritable()
    const dir = new FakeDirectoryHandle(name, this.permission)
    this.children.set(name, dir)
    return dir
  }

  async getFileHandle(name: string, { create = false } = {}): Promise<FakeFileHandle> {
    const child = this.children.get(name)
    if (child instanceof FakeFileHandle) return child
    if (child) throw mismatch(name)
    if (!create) throw notFound(name)
    this.assertWritable()
    const file = new FakeFileHandle(name, this.permission)
    this.children.set(name, file)
    return file
  }

  async removeEntry(name: string): Promise<void> {
    if (!this.children.has(name)) throw notFound(name)
    this.assertWritable()
    this.children.delete(name)
  }

  async *values(): AsyncGenerator<Entry> {
    if (this.permission.state === 'denied') throw new DOMException('refusé', 'NotAllowedError')
    yield* this.children.values()
  }

  /** Ajoute un fichier à l'arborescence, en créant les dossiers intermédiaires. */
  addFile(path: string, content: string | Blob = ''): this {
    const [head, ...rest] = path.split('/')
    if (rest.length === 0) {
      this.children.set(head, new FakeFileHandle(head, this.permission, new Blob([content])))
      return this
    }
    let child = this.children.get(head)
    if (!child) {
      child = new FakeDirectoryHandle(head, this.permission)
      this.children.set(head, child)
    }
    if (!(child instanceof FakeDirectoryHandle)) throw mismatch(head)
    child.addFile(rest.join('/'), content)
    return this
  }

  /** Vue typée pour le code de production, qui attend un vrai handle. */
  asHandle(): FileSystemDirectoryHandle {
    return this as unknown as FileSystemDirectoryHandle
  }

  private assertWritable() {
    if (this.permission.state !== 'granted') throw new DOMException('refusé', 'NotAllowedError')
  }
}
