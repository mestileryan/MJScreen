/** Fournisseurs de stockage prévus. Seul `local` existe à ce stade. */
export type StorageKind = 'local' | 'dropbox' | 'google-drive' | 'onedrive' | 'memory'

/** Fichier ou dossier du stockage. Le chemin suit le format de `@/lib/paths`. */
export interface StorageEntry {
  path: string
  name: string
  kind: 'file' | 'directory'
  /** Taille en octets, pour les fichiers. */
  size?: number
  /** Date de modification en millisecondes, pour les fichiers. */
  lastModified?: number
}

export interface ListOptions {
  /** Descend dans les sous-dossiers ; les dossiers figurent aussi dans le résultat. */
  recursive?: boolean
}

/**
 * Accès à la racine d'une bibliothèque, quel que soit l'endroit où elle vit.
 * Tous les chemins sont relatifs à cette racine ; la racine est la chaîne vide.
 * Le reste de l'application ne connaît que cette interface : ajouter un fournisseur
 * cloud ne doit rien changer au chargement de la bibliothèque.
 */
export interface StorageProvider {
  readonly kind: StorageKind
  /** Nom à afficher : nom du dossier, du compte… */
  readonly label: string
  /** Contenu d'un dossier ; lève `not-found` s'il n'existe pas. */
  list(path: string, options?: ListOptions): Promise<StorageEntry[]>
  /** Description d'un fichier ou d'un dossier, `null` s'il n'existe pas. */
  stat(path: string): Promise<StorageEntry | null>
  /** Contenu complet d'un fichier. */
  read(path: string): Promise<Blob>
  /** Contenu d'un fichier en flux, pour ne lire que l'en-tête d'un gros fichier audio. */
  readStream(path: string): Promise<ReadableStream<Uint8Array>>
  /** Crée ou remplace un fichier, en créant les dossiers parents au besoin. */
  write(path: string, data: Blob | string): Promise<void>
  /** Supprime un fichier. Les dossiers ne sont jamais supprimés par ce biais. */
  delete(path: string): Promise<void>
}

export type StorageErrorCode =
  /** Le fichier ou le dossier n'existe pas. */
  | 'not-found'
  /** Un dossier a été trouvé là où l'on attendait un fichier, ou l'inverse. */
  | 'type-mismatch'
  /** L'utilisateur n'a pas (ou plus) accordé l'accès. */
  | 'permission-denied'
  | 'unknown'

/** Erreur commune à tous les fournisseurs, pour que l'interface réagisse sans les connaître. */
export class StorageError extends Error {
  readonly code: StorageErrorCode
  readonly path: string

  constructor(code: StorageErrorCode, path: string, message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
    this.code = code
    this.path = path
  }
}

export function isStorageError(error: unknown, code?: StorageErrorCode): error is StorageError {
  return error instanceof StorageError && (code === undefined || error.code === code)
}

/** Lit un fichier texte (UTF-8). */
export async function readText(storage: StorageProvider, path: string): Promise<string> {
  return (await storage.read(path)).text()
}
