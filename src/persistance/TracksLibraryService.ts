import { isAudioPath } from '@/lib/audioFiles'
import type TracksLibraryConfig from '@/models/TracksLibraryConfig'
import { createTracksLibraryConfig } from '@/models/TracksLibraryConfig'
import type TracksLibraryIndex from '@/models/TracksLibraryIndex'
import { createTracksLibraryIndex } from '@/models/TracksLibraryIndex'
import { tracksLibraryConfigSchema } from '@/schemas/tracksLibraryConfigSchema'
import { parseDocument, serializeDocument, type DocumentSchema, type ParseResult } from '@/schemas/documentSchema'
import { tracksLibraryIndexSchema } from '@/schemas/tracksLibraryIndexSchema'
import { readText, type StorageProvider } from '@/storage/StorageProvider'
import { backupFile, LIBRARY_CONFIG_PATH, LIBRARY_INDEX_PATH, MJLIB_DIR } from './TracksLibraryFiles'

/** Bibliothèque ouverte : tout son état vient des fichiers du stockage. */
export interface TracksLibrary {
  storage: StorageProvider
  config: TracksLibraryConfig
  index: TracksLibraryIndex
  /**
   * Version lue sur le disque quand le fichier a été migré en mémoire, `null` sinon.
   * L'ouverture n'écrit rien : la version migrée ne remplacera le fichier qu'à la
   * prochaine sauvegarde, après copie de l'ancien.
   */
  migratedFrom: Record<TracksLibraryFile, number | null>
}

export type TracksLibraryFile = 'config' | 'index'

export type FileProblem =
  | { file: TracksLibraryFile; kind: 'missing' }
  | { file: TracksLibraryFile; kind: 'invalid'; reason: string }
  | { file: TracksLibraryFile; kind: 'too-new'; version: number; supported: number }

export type OpenOutcome =
  | { status: 'ready'; library: TracksLibrary }
  /** Pas de `.mjlib/` : un dossier vide ou un dossier d'audio brut, à initialiser. */
  | { status: 'unmanaged'; audioFileCount: number }
  /** `.mjlib/` est présent mais un fichier manque, est illisible ou trop récent. */
  | { status: 'problem'; problems: FileProblem[] }

const FILES: Record<TracksLibraryFile, { path: string; schema: DocumentSchema<unknown> }> = {
  config: { path: LIBRARY_CONFIG_PATH, schema: tracksLibraryConfigSchema },
  index: { path: LIBRARY_INDEX_PATH, schema: tracksLibraryIndexSchema },
}

/**
 * Ouvre la bibliothèque à la racine du stockage, sans jamais rien y écrire.
 * Les fichiers de `.mjlib/` suffisent à la recharger à l'identique, sur une autre
 * machine ou un autre navigateur : rien n'est attendu du navigateur.
 */
export async function openTracksLibrary(storage: StorageProvider): Promise<OpenOutcome> {
  const mjlib = await storage.stat(MJLIB_DIR)
  if (mjlib?.kind !== 'directory') {
    return { status: 'unmanaged', audioFileCount: await countAudioFiles(storage) }
  }

  const [config, index] = await Promise.all([
    readDocument(storage, LIBRARY_CONFIG_PATH, tracksLibraryConfigSchema),
    readDocument(storage, LIBRARY_INDEX_PATH, tracksLibraryIndexSchema),
  ])

  const problems = [toProblem('config', config), toProblem('index', index)].filter(p => p !== null)
  if (config === null || config.status !== 'ok' || index === null || index.status !== 'ok') {
    return { status: 'problem', problems }
  }

  return {
    status: 'ready',
    library: {
      storage,
      config: config.value,
      index: index.value,
      migratedFrom: { config: config.migratedFrom, index: index.migratedFrom },
    },
  }
}

/**
 * Fait d'un dossier une bibliothèque : crée `.mjlib/config.json` et un `index.json` vide.
 * Les fichiers déjà présents ne sont ni déplacés ni modifiés, et un `.mjlib/` existant
 * n'est jamais écrasé.
 */
export async function initTracksLibrary(storage: StorageProvider, name = storage.label): Promise<TracksLibrary> {
  if (await storage.stat(MJLIB_DIR)) {
    throw new Error(`Ce dossier contient déjà ${MJLIB_DIR}/ : ouvrez-le plutôt que de l'initialiser.`)
  }
  const config = createTracksLibraryConfig(name.trim() || 'Ma bibliothèque')
  const index = createTracksLibraryIndex()
  // L'index d'abord : si l'écriture de la config échoue ensuite, le dossier reste
  // signalé comme « config manquante », réparable, plutôt que dans un état ambigu.
  await storage.write(LIBRARY_INDEX_PATH, serializeDocument(index))
  await storage.write(LIBRARY_CONFIG_PATH, serializeDocument(config))
  return { storage, config, index, migratedFrom: { config: null, index: null } }
}

/**
 * Remplace un fichier manquant ou illisible par un fichier neuf, après en avoir
 * sauvegardé l'ancien contenu. Refuse un fichier écrit par une version plus récente :
 * le réécrire ferait perdre ce que cette version-ci ne sait pas lire.
 * Retourne le chemin de la sauvegarde, `null` si le fichier n'existait pas.
 */
export async function resetTracksLibraryFile(storage: StorageProvider, file: TracksLibraryFile): Promise<string | null> {
  const { path, schema } = FILES[file]
  const current = await readDocument(storage, path, schema)
  if (current?.status === 'too-new') {
    throw new Error(`${schema.fileName} vient d'une version plus récente de MJLibrary : il ne sera pas remplacé.`)
  }
  if (current?.status === 'ok') {
    throw new Error(`${schema.fileName} est lisible : il n'y a rien à réparer.`)
  }

  const backup = current === null ? null : await backupFile(storage, path)
  const fresh = file === 'config' ? createTracksLibraryConfig(storage.label || 'Ma bibliothèque') : createTracksLibraryIndex()
  await storage.write(path, serializeDocument(fresh))
  return backup
}

export async function saveTracksLibraryConfig(library: TracksLibrary, config: TracksLibraryConfig): Promise<TracksLibrary> {
  await writeLibraryFile(library, 'config', config)
  return { ...library, config, migratedFrom: { ...library.migratedFrom, config: null } }
}

export async function saveTracksLibraryIndex(library: TracksLibrary, index: TracksLibraryIndex): Promise<TracksLibrary> {
  await writeLibraryFile(library, 'index', index)
  return { ...library, index, migratedFrom: { ...library.migratedFrom, index: null } }
}

/** Un fichier lu dans une version antérieure est sauvegardé avant d'être réécrit au nouveau format. */
async function writeLibraryFile(library: TracksLibrary, file: TracksLibraryFile, document: object) {
  const { path } = FILES[file]
  if (library.migratedFrom[file] !== null) await backupFile(library.storage, path)
  await library.storage.write(path, serializeDocument(document))
}

/** Lit un fichier versionné ; `null` s'il n'existe pas. */
async function readDocument<T>(storage: StorageProvider, path: string, schema: DocumentSchema<T>): Promise<ParseResult<T> | null> {
  const entry = await storage.stat(path)
  if (entry === null) return null
  if (entry.kind !== 'file') return { status: 'invalid', reason: `${path} est un dossier, pas un fichier.` }
  return parseDocument(schema, await readText(storage, path))
}

function toProblem(file: TracksLibraryFile, result: ParseResult<unknown> | null): FileProblem | null {
  if (result === null) return { file, kind: 'missing' }
  switch (result.status) {
    case 'ok':
      return null
    case 'invalid':
      return { file, kind: 'invalid', reason: result.reason }
    case 'too-new':
      return { file, kind: 'too-new', version: result.version, supported: result.supported }
  }
}

async function countAudioFiles(storage: StorageProvider): Promise<number> {
  const entries = await storage.list('', { recursive: true })
  return entries.filter(entry => entry.kind === 'file' && isAudioPath(entry.path)).length
}
