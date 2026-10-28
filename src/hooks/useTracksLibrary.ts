'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { readAudioDuration } from '@/lib/audioDuration'
import { readAudioMeta } from '@/lib/audioMeta'
import { sha256Hex } from '@/lib/fileHash'
import { DUPLICATE_TAG, type IndexedTrack } from '@/models/TracksLibraryIndex'
import {
  addTrackFiles,
  deleteTrack,
  initTracksLibrary,
  openTracksLibrary,
  refreshTracksLibrary,
  removeTracksFromIndex,
  resetTracksLibraryFile,
  updateTracks,
  type FileProblem,
  type TracksLibrary,
  type TracksLibraryFile,
} from '@/persistance/TracksLibraryService'
import type { ReconcileReport } from '@/persistance/TracksLibraryIndexer'
import {
  DB_AddCloudTracksSource,
  DB_AddLocalTracksSource,
  DB_GetTracksSources,
  DB_RemoveTracksSource,
  DB_SetDefaultTracksSource,
  type StoredTracksSource,
} from '@/persistance/TracksSourceService'
import { CLOUD_LABELS, type CloudAccount, type CloudKind, type CloudQuota, type CloudStorage } from '@/storage/cloud/CloudStorage'
import {
  cloudAuthClient,
  cloudConnected,
  cloudSignOut,
  createCloudStorage,
  isMockCloud,
  mockConnect,
  oauthRedirectUri,
} from '@/storage/cloud/cloudProviders'
import { NotConnectedError, OAuthClient } from '@/storage/cloud/oauth'
import { LocalFolderProvider } from '@/storage/local/LocalFolderProvider'
import {
  isLocalFolderSupported,
  pickLocalFolder,
  queryFolderPermission,
  requestFolderPermission,
} from '@/storage/local/localFolder'
import { isStorageError, type StorageProvider } from '@/storage/StorageProvider'

/** Message pour l’utilisateur, avec le détail technique à n’afficher que sur demande. */
export interface UserMessage {
  text: string
  details?: string
}

export type SourceStatus =
  /** Dossier mémorisé dont l’accès doit être redemandé, ou compte cloud à reconnecter. */
  | { step: 'needs-permission'; denied?: boolean }
  | { step: 'opening' }
  /** Pas de `.mjlib/` : le dossier n’a jamais servi de source. */
  | { step: 'unmanaged'; audioFileCount: number }
  | { step: 'problem'; problems: FileProblem[] }
  | {
      step: 'ready'
      library: TracksLibrary
      /** Résultat du dernier parcours du dossier ; `null` tant qu’il est en cours. */
      report: ReconcileReport | null
      /** Octets occupés par les fichiers audio de la source. */
      usedBytes: number
    }
  | { step: 'error'; error: UserMessage }

/** Une source branchée : un stockage et, s’il s’ouvre, sa part de la bibliothèque. */
export type TracksSource = {
  id: number
  label: string
  /** Reçoit les pistes ajoutées depuis la page. */
  isDefault: boolean
  status: SourceStatus
} & (
  | { kind: 'local'; storage: LocalFolderProvider; handle: FileSystemDirectoryHandle }
  | { kind: CloudKind; storage: CloudStorage; account: CloudAccount; quota?: CloudQuota }
)

export type TracksLibraryState =
  | { step: 'starting' }
  /** `localAvailable` est faux sur Firefox et Safari, qui ne savent pas ouvrir un dossier local. */
  | { step: 'ready'; sources: TracksSource[]; localAvailable: boolean }

export type TracksLibraryNotice = ({ tone: 'info' | 'error' } & UserMessage) | null

/** Piste vue depuis la bibliothèque entière, avec la source qui la porte. */
export interface LibraryTrack {
  source: TracksSource
  track: IndexedTrack
  /** Le fichier a disparu de la source. */
  missing: boolean
}

/** Ce qu’on faisait avant la redirection OAuth, repris au retour. */
type OAuthContext = { action: 'connect' } | { action: 'open'; sourceId: number }

/** Toutes les pistes des sources ouvertes, dans l’ordre des sources. */
export function libraryTracks(sources: TracksSource[]): LibraryTrack[] {
  const all: LibraryTrack[] = []
  for (const source of sources) {
    if (source.status.step !== 'ready') continue
    const missing = new Set(source.status.report?.missing.map(t => t.id))
    for (const track of source.status.library.index.tracks) {
      all.push({ source, track, missing: missing.has(track.id) })
    }
  }
  return all
}

/**
 * La bibliothèque de pistes : une seule, faite de plusieurs sources (dossiers
 * locaux, comptes cloud). Chaque source est rouverte au démarrage, indexée, puis
 * complétée en arrière-plan (durées, empreintes pour repérer les doublons).
 */
export function useTracksLibrary() {
  // Toujours `starting` au premier rendu : le HTML pré-rendu ne sait rien du
  // navigateur, la détection se fait après hydratation.
  const [state, setState] = useState<TracksLibraryState>({ step: 'starting' })
  const [notice, setNotice] = useState<TracksLibraryNotice>(null)
  /** Ajout de fichiers en cours, pour l’afficher. */
  const [adding, setAdding] = useState<{ done: number; total: number; label: string } | null>(null)
  // Dernière liste de sources connue, pour les travaux de fond qui ne peuvent pas
  // se fier à une valeur capturée.
  const sourcesRef = useRef<TracksSource[]>([])
  // Chaque ouverture d’une source incrémente sa génération : ses travaux de fond
  // précédents s’arrêtent dès qu’ils la voient changer.
  const generations = useRef(new Map<number, number>())

  const setSources = useCallback((update: (sources: TracksSource[]) => TracksSource[]) => {
    sourcesRef.current = update(sourcesRef.current)
    setState(s => (s.step === 'ready' ? { ...s, sources: sourcesRef.current } : s))
  }, [])

  const patchSource = useCallback(
    (id: number, patch: Partial<Pick<TracksSource, 'status' | 'isDefault' | 'label'> & { quota: CloudQuota }>) =>
      setSources(sources => sources.map(s => (s.id === id ? ({ ...s, ...patch } as TracksSource) : s))),
    [setSources],
  )

  const findSource = (id: number) => sourcesRef.current.find(s => s.id === id)

  const bump = (id: number) => {
    const gen = (generations.current.get(id) ?? 0) + 1
    generations.current.set(id, gen)
    return gen
  }
  const stale = (id: number, gen: number) => generations.current.get(id) !== gen

  /**
   * Lit durées et empreintes manquantes d’une source, piste par piste, et
   * enregistre le tout à la fin. S’arrête si la source est rouverte entre-temps.
   */
  const enrichOnce = useCallback(
    async (id: number) => {
      const gen = generations.current.get(id) ?? 0
      const source = findSource(id)
      if (source?.status.step !== 'ready') return
      const missing = new Set(source.status.report?.missing.map(track => track.id))
      const pending = source.status.library.index.tracks.filter(
        track => (track.duration === undefined || track.hash === undefined || track.meta === undefined) && !missing.has(track.id),
      )
      const enriched: IndexedTrack[] = []
      for (const [i, track] of pending.entries()) {
        const source = findSource(id)
        if (!source) return
        let blob: Blob
        try {
          blob = await source.storage.read(track.path)
        } catch {
          continue
        }
        const updated: IndexedTrack = { ...track }
        if (updated.duration === undefined) {
          const duration = await readAudioDuration(blob)
          if (duration !== null) updated.duration = duration
        }
        // Un objet vide vaut « lu, rien trouvé » : le fichier ne sera pas relu à chaque ouverture.
        if (updated.meta === undefined) updated.meta = await readAudioMeta(blob)
        if (updated.hash === undefined) {
          updated.hash = await sha256Hex(blob).catch(() => undefined)
          // Même contenu déjà présent ailleurs (autre source comprise) : on l’étiquette
          // d’office, pour que ça se voie sans rien chercher.
          const elsewhere = libraryTracks(sourcesRef.current).some(
            other => other.track.hash === updated.hash && !(other.source.id === id && other.track.id === track.id),
          )
          if (elsewhere && updated.hash && !updated.tags.includes(DUPLICATE_TAG)) {
            updated.tags = [...updated.tags, DUPLICATE_TAG]
          }
        }
        if (stale(id, gen)) return
        enriched.push(updated)
        const current = findSource(id)
        if (current?.status.step !== 'ready') return
        const tracks = current.status.library.index.tracks.map(t => (t.id === track.id ? updated : t))
        patchSource(id, {
          status: { ...current.status, library: { ...current.status.library, index: { ...current.status.library.index, tracks } } },
        })
        // Une pause entre deux fichiers, pour laisser la main à l’utilisateur.
        if (i < pending.length - 1) await new Promise(resolve => setTimeout(resolve, 100))
      }
      // Une seule écriture à la fin : durées et empreintes ne valent pas une réécriture par piste.
      const current = findSource(id)
      if (enriched.length > 0 && current?.status.step === 'ready') {
        const saved = await updateTracks(current.status.library, enriched)
        const again = findSource(id)
        if (!stale(id, gen) && again?.status.step === 'ready') patchSource(id, { status: { ...again.status, library: saved } })
      }
    },
    [patchSource],
  )

  // Un seul passage d’enrichissement à la fois par source ; une demande reçue
  // pendant un passage (pistes ajoutées) en relance un à la fin.
  const enrichJobs = useRef(new Map<number, { running: boolean; again: boolean }>())
  const enrich = useCallback(
    async (id: number) => {
      const job = enrichJobs.current.get(id) ?? { running: false, again: false }
      enrichJobs.current.set(id, job)
      if (job.running) {
        job.again = true
        return
      }
      job.running = true
      try {
        do {
          job.again = false
          await enrichOnce(id)
        } while (job.again)
      } finally {
        job.running = false
      }
    },
    [enrichOnce],
  )

  /** Indexe la source puis complète durées et empreintes, sans bloquer l’affichage. */
  const settle = useCallback(
    async (id: number, library: TracksLibrary) => {
      const gen = bump(id)
      patchSource(id, { status: { step: 'ready', library, report: null, usedBytes: 0 } })
      const refreshed = await refreshTracksLibrary(library)
      if (stale(id, gen)) return
      patchSource(id, {
        status: { step: 'ready', library: refreshed.library, report: refreshed.report, usedBytes: refreshed.usedBytes },
      })
      const source = findSource(id)
      if (source && source.kind !== 'local') {
        // L’espace du compte, pour la jauge ; sans gravité s’il n’est pas disponible.
        source.storage
          .quota()
          .then(quota => !stale(id, gen) && patchSource(id, { quota }))
          .catch(() => undefined)
      }
      await enrich(id)
    },
    [enrich, patchSource],
  )

  const openSource = useCallback(
    async (id: number) => {
      const source = findSource(id)
      if (!source) return
      bump(id)
      patchSource(id, { status: { step: 'opening' } })
      try {
        const outcome = await openTracksLibrary(source.storage)
        switch (outcome.status) {
          case 'ready':
            await settle(id, outcome.library)
            break
          case 'unmanaged':
            patchSource(id, { status: { step: 'unmanaged', audioFileCount: outcome.audioFileCount } })
            break
          case 'problem':
            patchSource(id, { status: { step: 'problem', problems: outcome.problems } })
            break
        }
      } catch (error) {
        if (error instanceof NotConnectedError || isStorageError(error, 'permission-denied')) {
          patchSource(id, { status: { step: 'needs-permission' } })
        } else {
          patchSource(id, { status: { step: 'error', error: describeError(error) } })
        }
      }
    },
    [patchSource, settle],
  )

  /** Branche le compte cloud connecté (ou rouvre la source qui le porte déjà). */
  const finishCloudConnection = useCallback(
    async (kind: CloudKind) => {
      const probe = createCloudStorage(kind, CLOUD_LABELS[kind])
      const account = await probe.account()
      const existing = sourcesRef.current.find(s => s.kind === kind && s.account.id === account.id)
      if (existing) return openSource(existing.id)
      const row = await DB_AddCloudTracksSource(kind, account)
      setSources(sources => [...sources, toSource(row, { step: 'opening' })])
      await openSource(row.id)
    },
    [openSource, setSources],
  )

  // Au démarrage : d’abord un éventuel retour de connexion cloud, puis chaque source
  // mémorisée est rouverte si on en a encore l’accès ; sinon il faudra un clic.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const localAvailable = isLocalFolderSupported()
      let resume: { kind: CloudKind; context: OAuthContext } | null = null
      let failure: UserMessage | null = null
      const pending = OAuthClient.pending(window.location.href, window.sessionStorage)
      if (pending) {
        try {
          const context = await cloudAuthClient(pending.kind).complete<OAuthContext>(window.location.href)
          resume = { kind: pending.kind, context }
        } catch (error) {
          failure = describeError(error)
        }
        // L’URL ne doit pas garder le code : un rechargement le rejouerait.
        window.history.replaceState(null, '', oauthRedirectUri())
      }

      const stored = await DB_GetTracksSources().catch(() => [])
      if (cancelled) return
      const sources: TracksSource[] = []
      const toOpen: number[] = []
      for (const row of stored) {
        if (row.kind === 'local') {
          if (!localAvailable) continue
          const permission = await queryFolderPermission(row.handle).catch(() => 'prompt' as const)
          if (permission === 'granted') toOpen.push(row.id)
          sources.push(toSource(row, permission === 'granted' ? { step: 'opening' } : { step: 'needs-permission' }))
        } else {
          const connected = cloudConnected(row.kind)
          if (connected) toOpen.push(row.id)
          sources.push(toSource(row, connected ? { step: 'opening' } : { step: 'needs-permission' }))
        }
      }
      if (cancelled) return
      sourcesRef.current = sources
      setState({ step: 'ready', sources, localAvailable })
      if (failure) setNotice({ tone: 'error', ...failure })
      await Promise.all(toOpen.map(openSource))
      if (resume?.context.action === 'connect') {
        await finishCloudConnection(resume.kind).catch(error => setNotice({ tone: 'error', ...describeError(error) }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [finishCloudConnection, openSource])

  const run = useCallback(async (action: () => Promise<void>) => {
    setNotice(null)
    try {
      await action()
    } catch (error) {
      setNotice({ tone: 'error', ...describeError(error) })
    }
  }, [])

  const addLocalSource = useCallback(
    () =>
      run(async () => {
        const handle = await pickLocalFolder()
        if (!handle) return
        // Le même dossier déjà branché : on le rouvre plutôt que de le brancher deux fois.
        for (const source of sourcesRef.current) {
          if (source.kind === 'local' && (await source.handle.isSameEntry(handle).catch(() => false))) return openSource(source.id)
        }
        const row = await DB_AddLocalTracksSource(handle)
        setSources(sources => [...sources, toSource(row, { step: 'opening' })])
        await openSource(row.id)
      }),
    [openSource, run, setSources],
  )

  /** Connexion à un cloud : redirection vers le service, puis retour sur la page. */
  const addCloudSource = useCallback(
    (kind: CloudKind) =>
      run(async () => {
        if (isMockCloud()) {
          mockConnect(kind)
          return finishCloudConnection(kind)
        }
        if (cloudConnected(kind)) return finishCloudConnection(kind)
        window.location.assign(await cloudAuthClient(kind).authorizationUrl<OAuthContext>({ action: 'connect' }))
      }),
    [finishCloudConnection, run],
  )

  const reopenSource = useCallback(
    (id: number) =>
      run(async () => {
        const source = findSource(id)
        if (!source) return
        if (source.kind === 'local') {
          if ((await requestFolderPermission(source.handle)) === 'granted') await openSource(id)
          else patchSource(id, { status: { step: 'needs-permission', denied: true } })
          return
        }
        if (isMockCloud()) {
          mockConnect(source.kind)
          return openSource(id)
        }
        if (cloudConnected(source.kind)) return openSource(id)
        window.location.assign(await cloudAuthClient(source.kind).authorizationUrl<OAuthContext>({ action: 'open', sourceId: id }))
      }),
    [openSource, patchSource, run],
  )

  /** Fait du dossier une source : crée `.mjlib/` sans toucher aux fichiers présents. */
  const initializeSource = useCallback(
    (id: number) =>
      run(async () => {
        const source = findSource(id)
        if (!source) return
        await settle(id, await initTracksLibrary(source.storage, source.label))
      }),
    [run, settle],
  )

  const resetSourceFile = useCallback(
    (id: number, file: TracksLibraryFile) =>
      run(async () => {
        const source = findSource(id)
        if (!source) return
        const backup = await resetTracksLibraryFile(source.storage, file)
        await openSource(id)
        if (backup) setNotice({ tone: 'info', text: 'Fichier recréé. L’ancien a été conservé.', details: backup })
      }),
    [openSource, run],
  )

  /** Débranche la source : la bibliothèque ne la voit plus, son contenu reste intact. */
  const removeSource = useCallback(
    (id: number) =>
      run(async () => {
        const source = findSource(id)
        bump(id)
        await DB_RemoveTracksSource(id)
        const defaults = new Map((await DB_GetTracksSources()).map(row => [row.id, row.isDefault]))
        setSources(sources => sources.filter(s => s.id !== id).map(s => ({ ...s, isDefault: defaults.get(s.id) ?? false }) as TracksSource))
        // Plus aucune source sur ce compte : on oublie aussi la connexion.
        if (source && source.kind !== 'local' && !sourcesRef.current.some(s => s.kind === source.kind)) cloudSignOut(source.kind)
      }),
    [run, setSources],
  )

  const setDefaultSource = useCallback(
    (id: number) =>
      run(async () => {
        await DB_SetDefaultTracksSource(id)
        setSources(sources => sources.map(s => ({ ...s, isDefault: s.id === id }) as TracksSource))
      }),
    [run, setSources],
  )

  /**
   * Ajoute des fichiers à la source par défaut : copiés dans son dossier des pistes,
   * indexés aussitôt, puis durée et empreinte (et étiquette « doublon ») en fond.
   */
  const addFiles = useCallback(
    (files: File[]) =>
      run(async () => {
        const target = sourcesRef.current.find(s => s.isDefault) ?? sourcesRef.current[0]
        if (!target) throw new Error('Aucune source branchée.')
        if (target.status.step !== 'ready') {
          setNotice({ tone: 'error', text: `La source par défaut (${target.label}) n’est pas ouverte.` })
          return
        }
        setAdding({ done: 0, total: files.length, label: target.label })
        try {
          const result = await addTrackFiles(target.status.library, files)
          const again = findSource(target.id)
          if (again?.status.step !== 'ready') return
          patchSource(target.id, {
            status: {
              ...again.status,
              library: result.library,
              usedBytes: again.status.usedBytes + result.added.reduce((sum, t) => sum + (t.size ?? 0), 0),
            },
          })
          const parts: string[] = []
          if (result.added.length) parts.push(`${result.added.length} piste${result.added.length > 1 ? 's' : ''} ajoutée${result.added.length > 1 ? 's' : ''} dans ${target.label}`)
          if (result.skipped.length) parts.push(`${result.skipped.length} fichier${result.skipped.length > 1 ? 's' : ''} ignoré${result.skipped.length > 1 ? 's' : ''} (pas de l’audio)`)
          setNotice({ tone: result.added.length ? 'info' : 'error', text: `${parts.join(' · ')}.` })
        } finally {
          setAdding(null)
        }
        void enrich(target.id)
      }),
    [enrich, patchSource, run],
  )

  /** Applique un changement à la part de bibliothèque d’une source ouverte, et l’enregistre. */
  const withLibrary = useCallback(
    (
      id: number,
      change: (library: TracksLibrary, report: ReconcileReport | null) => Promise<{ library: TracksLibrary; report?: ReconcileReport | null }>,
    ) =>
      run(async () => {
        const source = findSource(id)
        if (source?.status.step !== 'ready') return
        const result = await change(source.status.library, source.status.report)
        const again = findSource(id)
        if (again?.status.step !== 'ready') return
        patchSource(id, {
          status: { ...again.status, library: result.library, report: result.report === undefined ? again.status.report : result.report },
        })
      }),
    [patchSource, run],
  )

  /** Retire de la liste des pistes dont le fichier a disparu. Les fichiers audio ne sont jamais touchés. */
  const removeMissing = useCallback(
    (sourceId: number, ids: string[]) =>
      withLibrary(sourceId, async (library, report) => {
        const removed = new Set(ids)
        return {
          library: await removeTracksFromIndex(library, ids),
          report: report && { ...report, missing: report.missing.filter(t => !removed.has(t.id)) },
        }
      }),
    [withLibrary],
  )

  const editTrack = useCallback(
    (sourceId: number, id: string, patch: Partial<Pick<IndexedTrack, 'name' | 'tags' | 'type' | 'meta'>>) =>
      withLibrary(sourceId, async library => {
        const track = library.index.tracks.find(t => t.id === id)
        return { library: track ? await updateTracks(library, [{ ...track, ...patch }]) : library }
      }),
    [withLibrary],
  )

  /** Suppression définitive : le fichier audio est effacé, puis la piste quitte la liste. */
  const deleteTrackAction = useCallback(
    (sourceId: number, id: string) =>
      withLibrary(sourceId, async (library, report) => ({
        library: await deleteTrack(library, id),
        report: report && { ...report, missing: report.missing.filter(t => t.id !== id) },
      })),
    [withLibrary],
  )

  const tracks = useMemo(() => (state.step === 'ready' ? libraryTracks(state.sources) : []), [state])

  return {
    state,
    tracks,
    notice,
    adding,
    addFiles,
    addLocalSource,
    addCloudSource,
    reopenSource,
    refreshSource: openSource,
    initializeSource,
    resetSourceFile,
    removeSource,
    setDefaultSource,
    removeMissing,
    editTrack,
    deleteTrack: deleteTrackAction,
  }
}

function toSource(row: StoredTracksSource, status: SourceStatus): TracksSource {
  const base = { id: row.id, isDefault: row.isDefault, status }
  if (row.kind === 'local') {
    const storage = new LocalFolderProvider(row.handle)
    return { ...base, kind: 'local', label: storage.label, storage, handle: row.handle }
  }
  const storage = createCloudStorage(row.kind, row.account.label)
  return { ...base, kind: row.kind, label: `${CLOUD_LABELS[row.kind]} · ${row.account.label}`, storage, account: row.account }
}

/** Traduit une erreur en message courant ; le texte brut reste disponible dans `details`. */
function describeError(error: unknown): UserMessage {
  const details = error instanceof Error ? `${error.name} : ${error.message}` : String(error)
  if (error instanceof NotConnectedError) {
    return { text: 'Le compte n’est plus connecté. Reconnectez-le pour continuer.', details }
  }
  if (isStorageError(error, 'permission-denied')) {
    return { text: 'L’accès a été refusé ou retiré. Autorisez-le à nouveau pour continuer.', details }
  }
  if (isStorageError(error, 'not-found')) {
    return { text: 'Le dossier est introuvable. Il a peut-être été déplacé ou supprimé.', details }
  }
  return { text: 'Quelque chose s’est mal passé.', details }
}

export type { StorageProvider }
