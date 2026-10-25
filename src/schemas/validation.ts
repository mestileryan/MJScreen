import { isSafeRelativePath } from '@/lib/storagePath'

export type JsonObject = Record<string, unknown>

/**
 * Écart entre un document et son schéma. `location` situe le champ fautif
 * (`tracks[3].path`) pour que le message affiché permette de corriger le fichier à la main.
 */
export class SchemaError extends Error {
  readonly location: string

  constructor(location: string, message: string) {
    super(location ? `${location} : ${message}` : message)
    this.name = 'SchemaError'
    this.location = location
  }
}

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function expectObject(value: unknown, location: string): JsonObject {
  if (!isJsonObject(value)) throw new SchemaError(location, 'objet attendu')
  return value
}

export function expectArray(value: unknown, location: string): unknown[] {
  if (!Array.isArray(value)) throw new SchemaError(location, 'liste attendue')
  return value
}

export function expectString(value: unknown, location: string, { allowEmpty = false } = {}): string {
  if (typeof value !== 'string') throw new SchemaError(location, 'texte attendu')
  if (!allowEmpty && value.trim() === '') throw new SchemaError(location, 'texte vide')
  return value
}

export function expectStringArray(value: unknown, location: string): string[] {
  return expectArray(value, location).map((item, i) => expectString(item, `${location}[${i}]`))
}

/** Chemin relatif normalisé, qui ne sort pas de la racine de la bibliothèque. */
export function expectRelativePath(value: unknown, location: string): string {
  const path = expectString(value, location)
  if (!isSafeRelativePath(path)) {
    throw new SchemaError(location, `chemin relatif normalisé attendu, reçu « ${path} »`)
  }
  return path
}

/** Champ numérique facultatif : absent ou `undefined`, mais jamais `null` ni NaN. */
export function optionalNumber(value: unknown, location: string): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new SchemaError(location, 'nombre attendu')
  }
  return value
}

/** Retire les clés `undefined` : le JSON réécrit reste identique au JSON lu. */
export function withoutUndefined<T extends JsonObject>(object: T): T {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined)) as T
}
