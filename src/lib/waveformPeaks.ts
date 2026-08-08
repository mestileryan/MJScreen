/**
 * Fourniture des crêtes servant à dessiner la forme d'onde.
 *
 * Le coût dominant est le décodage du fichier compressé, proportionnel à la durée de
 * la piste et incompressible côté navigateur. La stratégie est donc de ne le payer
 * qu'une seule fois dans la vie d'une piste :
 *   - les crêtes calculées sont persistées dans la ligne Dexie de la piste
 *     (2 Ko, quantifiées sur 8 bits) et rechargées instantanément ensuite ;
 *   - un échec de décodage est lui aussi persisté (marqueur vide) pour ne pas
 *     retenter un fichier illisible à chaque session ;
 *   - un cache mémoire par id (la forme quantifiée, 2 Ko) évite même la lecture
 *     Dexie dans la session courante ;
 *   - tous les décodages passent par une file séquentielle : un import en masse ne
 *     lance qu'un décodage à la fois, et les demandes d'affichage (piste lancée par
 *     l'utilisateur) passent devant les pré-calculs ;
 *   - le décodage se fait à 8 kHz (`decodeAudioData` rééchantillonne vers la
 *     fréquence du contexte), ce qui allège l'extraction sans perte visible.
 */
import { DB_GetTrackPeaks, DB_SetTrackPeaks } from '@/persistance/TrackService'
import { extractPeaks, resample, quantizePeaks, dequantizePeaks } from './waveformMath'

/** Résolution du cache, volontairement plus fine que le canvas pour rester réutilisable. */
const PEAK_RESOLUTION = 2048

/** Le minimum autorisé par la spec ; largement suffisant pour une enveloppe. */
const DECODE_SAMPLE_RATE = 8000

// Caches mémoire : par id de piste (chemin normal) et par File (pistes sans id).
// On garde la forme quantifiée (2 Ko) : la dé-quantification à l'affichage est
// négligeable, et une grande bibliothèque ne pinne pas des Mo de doubles.
const byTrackId = new Map<number, Uint8Array>()
const byFile = new WeakMap<File, Uint8Array>()
const pendingByTrackId = new Map<number, Promise<Uint8Array>>()
const pendingByFile = new WeakMap<File, Promise<Uint8Array>>()

let decoder: BaseAudioContext | null = null

function decodeContext(): BaseAudioContext {
  if (!decoder) {
    try {
      decoder = new OfflineAudioContext(1, 1, DECODE_SAMPLE_RATE)
    } catch {
      // Repli si le navigateur refuse cette fréquence : on décode à la fréquence native.
      decoder = new AudioContext()
    }
  }
  return decoder
}

// ------------------------------------------------------------------ file d'attente

/**
 * Décodages sérialisés : un seul à la fois, pour qu'un dépôt de 100 fichiers ne
 * sature ni le CPU ni la mémoire (chaque décodage retient le fichier compressé
 * entier). Les demandes d'affichage sont prioritaires sur les pré-calculs — y
 * compris quand le job visé est déjà en file : il est alors promu en tête
 * (`promoteDecode`), sans quoi lancer une piste pendant un gros import
 * attendrait tous les pré-calculs déjà planifiés.
 */
interface DecodeJob {
  file: File
  /** Posé quand le décodage concerne une piste de la bibliothèque. */
  trackId?: number
  run: () => Promise<void>
}

const decodeQueue: DecodeJob[] = []
let decodeRunning = false

function scheduleDecode(job: DecodeJob, priority: boolean) {
  if (priority) decodeQueue.unshift(job)
  else decodeQueue.push(job)
  void pumpDecodeQueue()
}

/** Fait passer en tête de file le job correspondant, s'il attend encore. */
function promoteDecode(match: (job: DecodeJob) => boolean) {
  const index = decodeQueue.findIndex(match)
  if (index > 0) {
    const [job] = decodeQueue.splice(index, 1)
    decodeQueue.unshift(job)
  }
}

async function pumpDecodeQueue() {
  if (decodeRunning) return
  decodeRunning = true
  while (decodeQueue.length) {
    const job = decodeQueue.shift()!
    // Les jobs capturent leurs erreurs via resolve/reject ; ceinture et bretelles.
    await job.run().catch(() => {})
  }
  decodeRunning = false
}

async function decodePeaks(file: File): Promise<Uint8Array> {
  // Lecture directe du File : évite la copie supplémentaire d'un fetch sur l'object URL.
  const arrayBuffer = await file.arrayBuffer()
  const buffer = await decodeContext().decodeAudioData(arrayBuffer)
  return quantizePeaks(extractPeaks(buffer, PEAK_RESOLUTION))
}

/** Décodage sérialisé, mutualisé et mémorisé par File. */
function computeForFile(file: File, priority: boolean, trackId?: number): Promise<Uint8Array> {
  const cached = byFile.get(file)
  if (cached) return Promise.resolve(cached)

  let pending = pendingByFile.get(file)
  if (!pending) {
    pending = new Promise<Uint8Array>((resolve, reject) => {
      scheduleDecode(
        {
          file,
          trackId,
          run: () =>
            decodePeaks(file).then(peaks => {
              byFile.set(file, peaks)
              resolve(peaks)
            }, reject),
        },
        priority,
      )
    })
    pendingByFile.set(file, pending)
    pending.catch(() => {}).then(() => pendingByFile.delete(file))
  } else if (priority) {
    // Le décodage a déjà été planifié (pré-calcul d'import ou de backfill) : la
    // demande d'affichage le fait passer devant les autres pré-calculs.
    promoteDecode(job => job.file === file)
  }
  return pending
}

// ------------------------------------------------------------------ par piste

/**
 * Crêtes quantifiées d'une piste : cache mémoire, puis colonne `peaks` de la ligne
 * Dexie, et en dernier recours décodage — dont le résultat (succès comme échec)
 * est persisté pour les sessions suivantes. Un marqueur vide signifie « fichier
 * indécodable » et se dessine comme une ligne plate.
 */
/**
 * Demandes d'affichage arrivées pendant qu'une recherche non prioritaire était en
 * cours mais pas encore planifiée en file (lecture Dexie en vol) : la recherche
 * consulte ce set au moment de planifier son décodage.
 */
const promotedTrackIds = new Set<number>()

function trackPeaks(trackId: number, file: File, priority: boolean): Promise<Uint8Array> {
  const cached = byTrackId.get(trackId)
  if (cached) return Promise.resolve(cached)

  let lookup = pendingByTrackId.get(trackId)
  if (lookup) {
    if (priority) {
      // Recherche déjà en cours pour cette piste : on promeut son décodage s'il
      // attend en file — par id, car l'objet File d'une piste rechargée via un
      // lien ?trackId= n'est pas celui de la bibliothèque — et on mémorise
      // l'intention pour le cas où il n'est pas encore planifié.
      promotedTrackIds.add(trackId)
      promoteDecode(job => job.trackId === trackId)
    }
    return lookup
  }

  lookup = (async () => {
    try {
      const stored = await DB_GetTrackPeaks(trackId)
      if (stored != null) {
        byTrackId.set(trackId, stored)
        return stored
      }

      let peaks: Uint8Array
      try {
        peaks = await computeForFile(file, priority || promotedTrackIds.has(trackId), trackId)
      } catch (error) {
        console.error("Impossible de décoder la piste pour la forme d'onde :", error)
        peaks = new Uint8Array(0)
      }

      byTrackId.set(trackId, peaks)
      // Persistance en arrière-plan ; si la piste a été supprimée entre-temps,
      // l'update Dexie est un no-op.
      void DB_SetTrackPeaks(trackId, peaks).catch(() => {})
      return peaks
    } finally {
      promotedTrackIds.delete(trackId)
    }
  })()
  pendingByTrackId.set(trackId, lookup)
  lookup.catch(() => {}).then(() => pendingByTrackId.delete(trackId))
  return lookup
}

/** Crêtes prêtes à dessiner, ramenées au nombre de colonnes du canvas. */
export async function peaksFor(file: File, columns: number, trackId?: number): Promise<number[]> {
  // priority=true : c'est une demande d'affichage, elle passe devant les pré-calculs.
  const quantized =
    trackId != null ? await trackPeaks(trackId, file, true) : await computeForFile(file, true)
  return resample(dequantizePeaks(quantized), columns)
}

/**
 * Pré-calcule et persiste les crêtes d'une piste si elles manquent (upload, backfill).
 * Ne peuple pas le cache mémoire pour les pistes déjà persistées : le backfill d'une
 * grande bibliothèque ne doit rien retenir en mémoire.
 * Retourne true si un décodage a réellement été tenté — permet à l'appelant d'espacer
 * les pistes pour ne pas monopoliser le CPU.
 */
export async function ensureTrackPeaks(trackId: number | undefined, file: File): Promise<boolean> {
  if (trackId == null || byTrackId.has(trackId)) return false

  const stored = await DB_GetTrackPeaks(trackId)
  // Piste supprimée pendant le backfill : inutile de décoder pour une ligne morte.
  if (stored === undefined) return false
  // Crêtes déjà connues (y compris un marqueur d'échec).
  if (stored !== null) return false

  await trackPeaks(trackId, file, false)
  return true
}
