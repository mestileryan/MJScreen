import JSZip from 'jszip';
import { DB_GetPlaylists, DB_AddPlaylist } from './PlaylistService';
import { DB_GetTracks, DB_AddTrack } from './TrackService';
import { PlaylistLibraryDB } from './PlaylistPersistance';
import { TrackLibraryDB } from './TrackPersistance';
import { ImageLibraryDB } from './ImagePersistance';
import { DB_GetImages, DB_AddImage, DB_UpdateImages } from './ImageService';
import GalleryImage from '@/models/GalleryImage';
import Playlist from '@/models/Playlist';
import FileTrack from '@/models/FileTrack';

// Informations sur un morceau à sauvegarder dans l'archive
interface ExportTrackMeta {
  // Nom du fichier original
  name: string;
  // Volume initial défini par l'utilisateur
  initialVolume: number;
  // Options d'icône (facultatif)
  iconName?: string;
  iconColor?: string;
  // Ordre dans la playlist
  order: number;
  // Index de la playlist dans le tableau exporté
  playlistIndex: number;
  // Indique si la boucle est active
  loop?: boolean;
  // Mime type du fichier
  type: string;
  // Chemin du fichier dans l'archive
  filePath: string;
}

// Structure globale du fichier d'export
interface ExportImageMeta {
  name: string;
  order: number;
  type: string;
  filePath: string;
  playlistIndex: number;
  createdAt?: number;
  updatedAt?: number;
}

interface ExportData {
  // Numéro de version pour la compatibilité future
  version: number;
  // Liste des playlists enregistrées
  playlists: { name: string; width?: number | null; order?: number }[];
  // Liste des métadonnées de morceaux
  tracks: ExportTrackMeta[];
  // Liste des images de la galerie (optionnel pour rétrocompatibilité)
  images?: ExportImageMeta[];
}

// Exporte la base de données complète dans une archive ZIP
export async function exportLibrary(): Promise<Blob> {
  const playlists = await DB_GetPlaylists();
  const tracks = await DB_GetTracks();
  const images = await DB_GetImages();

  const data: ExportData = {
    // incrémenter si le format change à l'avenir
    version: 3,
    playlists: playlists.map(pl => ({
      name: pl.name,
      width: pl.width ?? null,
      order: pl.order,
    })),
    tracks: [],
    images: [],
  };

  const zip = new JSZip();

  // Ajout des fichiers audio dans l'archive
  for (const [idx, track] of tracks.entries()) {
    const playlistIndex = Math.max(0, playlists.findIndex(p => p.id === track.playlistId));
    const path = `tracks/${idx}`;
    // on stocke le fichier brut dans un dossier "tracks"
    zip.file(path, track.file);
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
    });
  }

  for (const [idx, image] of images.entries()) {
    const playlistIndex = Math.max(0, playlists.findIndex(p => p.id === image.playlistId));
    const path = `images/${idx}`;
    zip.file(path, image.file);
    data.images?.push({
      name: image.name,
      order: image.order,
      type: image.file.type,
      filePath: path,
      playlistIndex,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    });
  }

  // métadonnées globales stockées dans un JSON à la racine
  zip.file('data.json', JSON.stringify(data));
  return zip.generateAsync({ type: 'blob' });
}

// Importe l'archive produite par exportLibrary et remplace la base actuelle
export async function importLibrary(blob: Blob): Promise<void> {
  let zip: JSZip;

  // 1. Vérifie que c’est bien une archive ZIP
  try {
    zip = await JSZip.loadAsync(blob);
  } catch {
    throw new Error("Le fichier fourni est invalide.");
  }

  // 2. Vérifie la présence de data.json
  const dataFile = zip.file('data.json');
  if (!dataFile) {
    throw new Error("Le fichier fourni est invalide (aucune piste trouvée)");
  }

  let data: ExportData;
  try {
    const json = await dataFile.async('string');
    data = JSON.parse(json);
  } catch {
    throw new Error("Impossible de lire ou parser le fichier. Le fichier est corrompu ou invalide.");
  }

  // 3. Purge les anciennes données
  await PlaylistLibraryDB.playlists.clear();
  await TrackLibraryDB.tracks.clear();
  await ImageLibraryDB.images.clear();

  const playlists: Playlist[] = [];

  // 4. Restauration des playlists
  for (const [index, plData] of data.playlists.entries()) {
    const pl = new Playlist(plData.name);
    pl.width = plData.width ?? undefined;
    pl.order = plData.order ?? index;
    pl.id = await DB_AddPlaylist(pl);
    playlists.push(pl);
  }

  // 5. Restauration des morceaux
  for (const trackMeta of data.tracks) {
    const trackFileEntry = zip.file(trackMeta.filePath);
    if (!trackFileEntry) {
      throw new Error(`Le fichier audio '${trackMeta.filePath}' est manquant dans l'archive.`);
    }

    const trackBlob = await trackFileEntry.async('blob');
    const file = new File([trackBlob], trackMeta.name, { type: trackMeta.type });
    const ft = new FileTrack(file, trackMeta.name);

    ft.initialVolume = trackMeta.initialVolume ?? 0.8;
    ft.iconName = trackMeta.iconName ?? '';
    ft.iconColor = trackMeta.iconColor ?? '#c084fc';
    ft.order = trackMeta.order ?? 0;
    const playlist = playlists[trackMeta.playlistIndex] ?? playlists[0];
    ft.playlistId = playlist?.id;
    ft.loop = trackMeta.loop ?? false;

    await DB_AddTrack(ft);
  }

  const imagesMeta = data.images ?? [];
  const galleryImages: GalleryImage[] = [];
  for (const [index, imageMeta] of imagesMeta.entries()) {
    const fallbackPath = `images/${index}`;
    const imageEntry = zip.file(imageMeta.filePath ?? fallbackPath);
    if (!imageEntry) {
      throw new Error(`L'image '${imageMeta.filePath || fallbackPath}' est manquante dans l'archive.`);
    }

    const imageBlob = await imageEntry.async('blob');
    const file = new File([imageBlob], imageMeta.name, { type: imageMeta.type });
    const galleryImage = new GalleryImage(file, imageMeta.name);
    galleryImage.order = imageMeta.order ?? index;
    const playlist = playlists[imageMeta.playlistIndex] ?? playlists[0];
    galleryImage.playlistId = playlist?.id;
    if (imageMeta.createdAt) galleryImage.createdAt = imageMeta.createdAt;
    if (imageMeta.updatedAt) galleryImage.updatedAt = imageMeta.updatedAt;
    await DB_AddImage(galleryImage);
    galleryImages.push(galleryImage);
  }

  // Assure l'ordre dans la base pour éviter les trous éventuels
  galleryImages.sort((a, b) => a.order - b.order).forEach((image, index) => {
    image.order = index;
  });
  await DB_UpdateImages(galleryImages);
}
