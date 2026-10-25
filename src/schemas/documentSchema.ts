import { isJsonObject, SchemaError, type JsonObject } from './validation'

/** Fait passer un document de la version `n` à la version `n + 1`. */
export type Migration = (document: JsonObject) => JsonObject

/**
 * Description d'un fichier JSON versionné de `.mjlib/`.
 * Chaque document porte un champ `schemaVersion` entier. À la lecture, un document
 * plus ancien est migré en mémoire, étape par étape, avant d'être validé.
 */
export interface DocumentSchema<T> {
  /** Nom du fichier, repris dans les messages d'erreur. */
  fileName: string
  /** Version courante, celle qu'écrit cette version de l'application. */
  version: number
  /** `migrations[n]` fait passer un document de la version `n` à `n + 1`. */
  migrations: Readonly<Record<number, Migration>>
  /** Valide un document à la version courante ; lève une `SchemaError` sinon. */
  validate: (document: JsonObject) => T
}

export type ParseResult<T> =
  /** `migratedFrom` vaut la version lue quand le document a dû être migré. */
  | { status: 'ok'; value: T; migratedFrom: number | null }
  /** JSON illisible ou structure non conforme. */
  | { status: 'invalid'; reason: string }
  /** Écrit par une version plus récente de l'application : on ne doit ni le lire ni l'écraser. */
  | { status: 'too-new'; version: number; supported: number }

/** Lit le texte brut d'un fichier versionné. Ne lève jamais : tout échec est décrit. */
export function parseDocument<T>(schema: DocumentSchema<T>, text: string): ParseResult<T> {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (error) {
    return { status: 'invalid', reason: `${schema.fileName} n'est pas un JSON valide (${errorMessage(error)}).` }
  }
  return parseDocumentValue(schema, raw)
}

/** Variante de `parseDocument` pour une valeur déjà désérialisée. */
export function parseDocumentValue<T>(schema: DocumentSchema<T>, raw: unknown): ParseResult<T> {
  if (!isJsonObject(raw)) {
    return { status: 'invalid', reason: `${schema.fileName} doit contenir un objet JSON.` }
  }

  const version = raw.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { status: 'invalid', reason: `${schema.fileName} n'a pas de numéro de version (schemaVersion) valide.` }
  }
  if (version > schema.version) {
    return { status: 'too-new', version, supported: schema.version }
  }

  let document = raw
  for (let from = version; from < schema.version; from++) {
    const migrate = schema.migrations[from]
    if (!migrate) {
      return {
        status: 'invalid',
        reason: `${schema.fileName} : aucune migration connue depuis la version ${from}.`,
      }
    }
    try {
      document = { ...migrate(document), schemaVersion: from + 1 }
    } catch (error) {
      return {
        status: 'invalid',
        reason: `${schema.fileName} : échec de la migration ${from} → ${from + 1} (${errorMessage(error)}).`,
      }
    }
  }

  try {
    return {
      status: 'ok',
      value: schema.validate(document),
      migratedFrom: version === schema.version ? null : version,
    }
  } catch (error) {
    if (error instanceof SchemaError) {
      return { status: 'invalid', reason: `${schema.fileName} est mal formé : ${error.message}.` }
    }
    throw error
  }
}

/** Sérialisation stable et lisible : les fichiers sont faits pour être relus, voire versionnés. */
export function serializeDocument(document: object): string {
  return `${JSON.stringify(document, null, 2)}\n`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
