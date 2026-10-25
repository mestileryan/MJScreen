/** Version du schéma de `.mjlib/config.json` écrite par cette version de l'application. */
export const CONFIG_SCHEMA_VERSION = 1

/**
 * Sortie : copie de tout ou partie des pistes vers un dossier cible, selon des
 * règles de répartition. Le format sera défini quand la fonctionnalité arrivera ;
 * d'ici là le champ est réservé et son contenu conservé tel quel.
 */
export type TracksLibraryOutput = Record<string, unknown>

/**
 * Configuration de la bibliothèque. Elle vit avec les pistes, dans le stockage
 * choisi par l'utilisateur : rien n'en est gardé dans le navigateur.
 */
export default interface TracksLibraryConfig {
  schemaVersion: typeof CONFIG_SCHEMA_VERSION
  /** Identifiant stable, pour reconnaître la bibliothèque d'une machine à l'autre. */
  id: string
  /** Nom affiché. */
  name: string
  /** Dossier où ranger les pistes ajoutées depuis l'outil, relatif à la racine. */
  tracksDir: string
  /** Réservé aux sorties (voir `TracksLibraryOutput`), vide pour l'instant. */
  outputs: TracksLibraryOutput[]
  /** Date de création, ISO 8601. */
  createdAt: string
}

export const DEFAULT_TRACKS_DIR = 'pistes'

export function createTracksLibraryConfig(name: string, now = new Date()): TracksLibraryConfig {
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name,
    tracksDir: DEFAULT_TRACKS_DIR,
    outputs: [],
    createdAt: now.toISOString(),
  }
}
