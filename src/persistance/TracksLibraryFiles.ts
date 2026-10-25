import { baseName, joinPath } from '@/lib/storagePath'
import type { StorageProvider } from '@/storage/StorageProvider'

/**
 * Emplacement des fichiers de la bibliothèque, relatifs à sa racine :
 *
 *   .mjlib/config.json        configuration
 *   .mjlib/index.json         métadonnées et tags des pistes
 *   .mjlib/sauvegardes/…      copies faites avant toute réécriture risquée
 *   pistes/…                  fichiers audio ajoutés depuis l'outil
 */
export const MJLIB_DIR = '.mjlib'
export const LIBRARY_CONFIG_PATH = joinPath(MJLIB_DIR, 'config.json')
export const LIBRARY_INDEX_PATH = joinPath(MJLIB_DIR, 'index.json')
export const LIBRARY_BACKUP_DIR = joinPath(MJLIB_DIR, 'sauvegardes')

/** Horodatage utilisable dans un nom de fichier sur tous les systèmes (pas de `:`). */
function fileStamp(date: Date): string {
  return date.toISOString().replace(/:/g, '-').replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Copie un fichier dans `.mjlib/sauvegardes/` avant qu'il soit réécrit.
 * `index.json` devient par exemple `index.2026-10-25T14-03-22Z.json`. Une sauvegarde
 * existante n'est jamais écrasée : un suffixe est ajouté si le nom est déjà pris.
 * Retourne le chemin de la copie.
 */
export async function backupFile(storage: StorageProvider, path: string, now = new Date()): Promise<string> {
  const content = await storage.read(path)
  const name = baseName(path)
  const dot = name.lastIndexOf('.')
  const stem = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''

  const base = `${stem}.${fileStamp(now)}`
  let target = joinPath(LIBRARY_BACKUP_DIR, `${base}${extension}`)
  for (let n = 2; await storage.stat(target); n++) target = joinPath(LIBRARY_BACKUP_DIR, `${base}-${n}${extension}`)

  await storage.write(target, content)
  return target
}
