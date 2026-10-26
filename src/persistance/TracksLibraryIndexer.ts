import { isAudioPath } from '@/lib/audioFiles'
import type TracksLibraryIndex from '@/models/TracksLibraryIndex'
import { createIndexedTrack, type IndexedTrack } from '@/models/TracksLibraryIndex'
import type { StorageEntry, StorageProvider } from '@/storage/StorageProvider'
import { MJLIB_DIR } from './TracksLibraryFiles'

/** Ce que le parcours du dossier a changé par rapport à l’index. */
export interface ReconcileReport {
  /** Fichiers audio apparus hors de l’outil, désormais indexés. */
  added: IndexedTrack[]
  /** Entrées dont le fichier a disparu. Elles restent dans l’index : rien n’est retiré en silence. */
  missing: IndexedTrack[]
  /** Fichiers dont la taille ou la date a changé : leurs métadonnées sont à relire, les tags sont gardés. */
  changed: IndexedTrack[]
}

export function isEmptyReport(report: ReconcileReport): boolean {
  return report.added.length === 0 && report.missing.length === 0 && report.changed.length === 0
}

/** Tous les fichiers audio de la bibliothèque, `.mjlib/` exclu. */
export async function scanAudioFiles(storage: StorageProvider): Promise<StorageEntry[]> {
  const entries = await storage.list('', { recursive: true })
  return entries.filter(
    entry => entry.kind === 'file' && isAudioPath(entry.path) && !entry.path.startsWith(`${MJLIB_DIR}/`),
  )
}

/**
 * Met l’index en face du contenu réel du dossier. Fonction pure : l’appelant
 * décide d’enregistrer ou non l’index retourné.
 * Les identifiants existants sont conservés, les nouvelles pistes prennent
 * place à la fin, triées par chemin.
 */
export function reconcileIndex(
  index: TracksLibraryIndex,
  files: StorageEntry[],
  now = new Date(),
): { index: TracksLibraryIndex; report: ReconcileReport } {
  const byPath = new Map(files.map(file => [file.path, file]))
  const report: ReconcileReport = { added: [], missing: [], changed: [] }

  const tracks = index.tracks.map(track => {
    const file = byPath.get(track.path)
    if (!file) {
      report.missing.push(track)
      return track
    }
    byPath.delete(track.path)
    if (file.size === track.size && file.lastModified === track.lastModified) return track
    // Le fichier a été remplacé : la durée connue ne vaut plus, les tags restent.
    const changed: IndexedTrack = { ...track, size: file.size, lastModified: file.lastModified }
    delete changed.duration
    report.changed.push(changed)
    return changed
  })

  for (const file of [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path, 'fr'))) {
    const track = createIndexedTrack(file.path, file, now)
    report.added.push(track)
    tracks.push(track)
  }

  return { index: isEmptyReport(report) ? index : { ...index, tracks }, report }
}
