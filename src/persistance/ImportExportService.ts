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
  const zip = await JSZip.loadAsync(blob);
  const json = await zip.file('data.json')!.async('string');
  const data: ExportData = JSON.parse(json);

  // On vide la base existante avant d'insérer les nouvelles données
  await PlaylistLibraryDB.playlists.clear();
  await TrackLibraryDB.tracks.clear();

  const playlists: Playlist[] = [];
  // Reconstruction des playlists
  for (const plData of data.playlists) {
    const pl = new Playlist(plData.name);
    pl.width = plData.width ?? undefined;
    pl.id = await DB_AddPlaylist(pl);
    playlists.push(pl);
  }

  // Restauration des fichiers audio avec leurs métadonnées
  for (const trackMeta of data.tracks) {
    const trackBlob = await zip.file(trackMeta.filePath)!.async('blob');
    const file = new File([trackBlob], trackMeta.name, { type: trackMeta.type });
    const ft = new FileTrack(file, trackMeta.name);
    // Valeurs par défaut pour assurer la compatibilité avec d'éventuelles nouvelles propriétés
    ft.initialVolume = trackMeta.initialVolume ?? 0.8;
    ft.iconName = trackMeta.iconName ?? '';
    ft.iconColor = trackMeta.iconColor ?? '#c084fc';
    ft.order = trackMeta.order ?? 0;
    ft.playlistId = playlists[trackMeta.playlistIndex]?.id;
    ft.loop = trackMeta.loop ?? false;
    await DB_AddTrack(ft);
  }
}
