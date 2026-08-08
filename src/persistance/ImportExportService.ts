import JSZip from 'jszip'
import { DB_GetPlaylists, DB_AddPlaylist } from './PlaylistService'
import {
  DB_GetTracks,
  DB_AddTrack,
  DB_GetTrackPeaks,
  DB_SetTrackPeaks,
} from './TrackService'
import { playlistLibraryDB } from './PlaylistPersistance'
import { trackLibraryDB } from './TrackPersistance'
import { imageLibraryDB } from './ImagePersistance'
import { DB_GetImages, DB_AddImage, DB_UpdateImages } from './ImageService'
import { createGalleryImage } from '@/models/GalleryImage'
import type GalleryImage from '@/models/GalleryImage'
import { createPlaylist } from '@/models/Playlist'
import type Playlist from '@/models/Playlist'
import { createFileTrack, DEFAULT_ICON_COLOR } from '@/models/FileTrack'
import type TrackEffects from '@/models/TrackEffects'

// Informations sur un morceau à sauvegarder dans l'archive
interface ExportTrackMeta {
  // Nom du fichier original
  name: string
  // Volume initial défini par l'utilisateur
  initialVolume: number
  // Options d'icône (facultatif)
  iconName?: string
  iconColor?: string
  // Ordre dans la playlist
  order: number
  // Index de la playlist dans le tableau exporté
  playlistIndex: number
  // Indique si la boucle est active
  loop?: boolean
  // Mime type du fichier
  type: string
  // Chemin du fichier dans l'archive
  filePath: string
  // Chemin des crêtes de forme d'onde pré-calculées, si la piste a déjà été décodée.
  // Absent pour les archives antérieures à la version 4 : le décodage se fera alors
  // en arrière-plan après l'import.
  peaksPath?: string
  // Réglages avancés (fondus, latéralisation, hauteur, effets). Absent pour les
  // archives antérieures à la version 5, et pour toute piste restée neutre.
  effects?: TrackEffects
}

// Structure globale du fichier d'export
interface ExportImageMeta {
  name: string
  order: number
  type: string
  filePath: string
  playlistIndex: number
  createdAt?: number
  updatedAt?: number
}

interface ExportData {
  // Numéro de version pour la compatibilité future
  version: number
  // Liste des playlists enregistrées
  playlists: { name: string; width?: number | null; order?: number }[]
  // Liste des métadonnées de morceaux
  tracks: ExportTrackMeta[]
  // Liste des images de la galerie (optionnel pour rétrocompatibilité)
  images?: ExportImageMeta[]
}

// Exporte la base de données complète dans une archive ZIP
export async function exportLibrary(): Promise<Blob> {
  const playlists = await DB_GetPlaylists()
  const tracks = await DB_GetTracks()
  const images = await DB_GetImages()

  const data: ExportData = {
    // incrémenter si le format change à l'avenir
    // v4 : ajout des crêtes de forme d'onde pré-calculées (`peaksPath`)
    // v5 : ajout des réglages avancés par piste (`effects`)
    version: 5,
    playlists: playlists.map(pl => ({
      name: pl.name,
      width: pl.width ?? null,
      order: pl.order,
    })),
    tracks: [],
    images: [],
  }

  const zip = new JSZip()

  // Ajout des fichiers audio dans l'archive
  for (const [idx, track] of tracks.entries()) {
    const playlistIndex = Math.max(
      0,
      playlists.findIndex(p => p.id === track.playlistId),
    )
    const path = `tracks/${idx}`
    // on stocke le fichier brut dans un dossier "tracks"
    zip.file(path, track.file)

    // Crêtes de forme d'onde (~2 Ko) : les embarquer évite de redécoder toute la
    // bibliothèque après un import. Les marqueurs d'échec (tableau vide) ne sont
    // volontairement PAS exportés, pour qu'une piste marquée à tort suite à une
    // erreur passagère retente sa chance sur la machine de destination.
    const peaks = track.id != null ? await DB_GetTrackPeaks(track.id) : undefined
    let peaksPath: string | undefined
    if (peaks?.length) {
      peaksPath = `peaks/${idx}`
      zip.file(peaksPath, peaks)
    }

    // on conserve les métadonnées pour la restauration
    data.tracks.push({
      name: track.name,
      initialVolume: track.initialVolume,
      iconName: track.iconName,
      iconColor: track.iconColor,
      order: track.order,
      playlistIndex,
      loop: track.loop,
      type: track.file.type,
      filePath: path,
      peaksPath,
      effects: track.effects,
    })
  }

  for (const [idx, image] of images.entries()) {
    const playlistIndex = Math.max(
      0,
      playlists.findIndex(p => p.id === image.playlistId),
    )
    const path = `images/${idx}`
    zip.file(path, image.file)
    data.images?.push({
      name: image.name,
      order: image.order,
      type: image.file.type,
      filePath: path,
      playlistIndex,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    })
  }

  // métadonnées globales stockées dans un JSON à la racine
  zip.file('data.json', JSON.stringify(data))
  return zip.generateAsync({ type: 'blob' })
}

// Importe l'archive produite par exportLibrary et remplace la base actuelle
export async function importLibrary(blob: Blob): Promise<void> {
  let zip: JSZip

  // 1. Vérifie que c’est bien une archive ZIP
  try {
    zip = await JSZip.loadAsync(blob)
  } catch {
    throw new Error('Le fichier fourni est invalide.')
  }

  // 2. Vérifie la présence de data.json
  const dataFile = zip.file('data.json')
  if (!dataFile) {
    throw new Error('Le fichier fourni est invalide (aucune piste trouvée)')
  }

  let data: ExportData
  try {
    const json = await dataFile.async('string')
    data = JSON.parse(json)
  } catch {
    throw new Error(
      'Impossible de lire ou parser le fichier. Le fichier est corrompu ou invalide.',
    )
  }

  // 3. Purge les anciennes données
  await playlistLibraryDB().playlists.clear()
  await trackLibraryDB().tracks.clear()
  await imageLibraryDB().images.clear()

  const playlists: Playlist[] = []

  // 4. Restauration des playlists
  for (const [index, plData] of data.playlists.entries()) {
    const pl: Playlist = {
      ...createPlaylist(plData.name, plData.order ?? index),
      width: plData.width ?? undefined,
    }
    pl.id = await DB_AddPlaylist(pl)
    playlists.push(pl)
  }

  // 5. Restauration des morceaux
  for (const trackMeta of data.tracks) {
    const trackFileEntry = zip.file(trackMeta.filePath)
    if (!trackFileEntry) {
      throw new Error(
        `Le fichier audio '${trackMeta.filePath}' est manquant dans l'archive.`,
      )
    }

    const trackBlob = await trackFileEntry.async('blob')
    const file = new File([trackBlob], trackMeta.name, { type: trackMeta.type })
    const playlist = playlists[trackMeta.playlistIndex] ?? playlists[0]

    const trackId = await DB_AddTrack({
      ...createFileTrack(file, trackMeta.name),
      initialVolume: trackMeta.initialVolume ?? 0.8,
      iconName: trackMeta.iconName ?? '',
      iconColor: trackMeta.iconColor ?? DEFAULT_ICON_COLOR,
      order: trackMeta.order ?? 0,
      playlistId: playlist?.id,
      loop: trackMeta.loop ?? false,
      effects: trackMeta.effects,
    })

    // Crêtes pré-calculées (archives v4+) : restaurées telles quelles, la piste
    // s'affiche sans décodage. Une archive plus ancienne n'en a pas, le backfill
    // au prochain chargement s'en chargera.
    const peaksEntry = trackMeta.peaksPath ? zip.file(trackMeta.peaksPath) : null
    if (peaksEntry) {
      await DB_SetTrackPeaks(trackId, await peaksEntry.async('uint8array'))
    }
  }

  const imagesMeta = data.images ?? []
  const galleryImages: GalleryImage[] = []
  for (const [index, imageMeta] of imagesMeta.entries()) {
    const fallbackPath = `images/${index}`
    const imageEntry = zip.file(imageMeta.filePath ?? fallbackPath)
    if (!imageEntry) {
      throw new Error(
        `L'image '${imageMeta.filePath || fallbackPath}' est manquante dans l'archive.`,
      )
    }

    const imageBlob = await imageEntry.async('blob')
    const file = new File([imageBlob], imageMeta.name, { type: imageMeta.type })
    const playlist = playlists[imageMeta.playlistIndex] ?? playlists[0]
    const galleryImage: GalleryImage = {
      ...createGalleryImage(file, imageMeta.name),
      order: imageMeta.order ?? index,
      playlistId: playlist?.id,
      createdAt: imageMeta.createdAt ?? Date.now(),
      updatedAt: imageMeta.updatedAt ?? Date.now(),
    }
    galleryImage.id = await DB_AddImage(galleryImage)
    galleryImages.push(galleryImage)
  }

  // Assure l'ordre dans la base pour éviter les trous éventuels
  const reordered = galleryImages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((image, index) => ({ ...image, order: index }))
  await DB_UpdateImages(reordered)
}
