import JSZip from 'jszip';
import { DB_GetPlaylists, DB_AddPlaylist } from './PlaylistService';
import { DB_GetTracks, DB_AddTrack } from './TrackService';
import { PlaylistLibraryDB } from './PlaylistPersistance';
import { TrackLibraryDB } from './TrackPersistance';
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
interface ExportData {
  // Numéro de version pour la compatibilité future
  version: number;
  // Liste des playlists enregistrées
  playlists: { name: string; width?: number | null }[];
  // Liste des métadonnées de morceaux
  tracks: ExportTrackMeta[];
}

// Exporte la base de données complète dans une archive ZIP
export async function exportLibrary(): Promise<Blob> {
  const playlists = await DB_GetPlaylists();
  const tracks = await DB_GetTracks();

  const data: ExportData = {
    // incrémenter si le format change à l'avenir
    version: 1,
    playlists: playlists.map(pl => ({ name: pl.name, width: pl.width ?? null })),
    tracks: [],
  };

  const zip = new JSZip();

  // Ajout des fichiers audio dans l'archive
  for (const [idx, track] of tracks.entries()) {
    const playlistIndex = playlists.findIndex(p => p.id === track.playlistId);
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

  const playlists: Playlist[] = [];

  // 4. Restauration des playlists
  for (const plData of data.playlists) {
    const pl = new Playlist(plData.name);
    pl.width = plData.width ?? undefined;
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
    ft.playlistId = playlists[trackMeta.playlistIndex]?.id;
    ft.loop = trackMeta.loop ?? false;

    await DB_AddTrack(ft);
  }
}
