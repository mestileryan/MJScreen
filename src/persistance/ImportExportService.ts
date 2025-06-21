import JSZip from 'jszip';
import { DB_GetPlaylists, DB_AddPlaylist } from './PlaylistService';
import { DB_GetTracks, DB_AddTrack } from './TrackService';
import { PlaylistLibraryDB } from './PlaylistPersistance';
import { TrackLibraryDB } from './TrackPersistance';
import Playlist from '@/models/Playlist';
import FileTrack from '@/models/FileTrack';

interface ExportTrackMeta {
  name: string;
  initialVolume: number;
  iconName?: string;
  iconColor?: string;
  order: number;
  playlistIndex: number;
  loop?: boolean;
  type: string;
  filePath: string;
}

interface ExportData {
  version: number;
  playlists: { name: string; width?: number | null }[];
  tracks: ExportTrackMeta[];
}

export async function exportLibrary(): Promise<Blob> {
  const playlists = await DB_GetPlaylists();
  const tracks = await DB_GetTracks();

  const data: ExportData = {
    version: 1,
    playlists: playlists.map(pl => ({ name: pl.name, width: pl.width ?? null })),
    tracks: [],
  };

  const zip = new JSZip();

  for (const [idx, track] of tracks.entries()) {
    const playlistIndex = playlists.findIndex(p => p.id === track.playlistId);
    const path = `tracks/${idx}`;
    zip.file(path, track.file);
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

  zip.file('data.json', JSON.stringify(data));
  return zip.generateAsync({ type: 'blob' });
}

export async function importLibrary(blob: Blob): Promise<void> {
  const zip = await JSZip.loadAsync(blob);
  const json = await zip.file('data.json')!.async('string');
  const data: ExportData = JSON.parse(json);

  await PlaylistLibraryDB.playlists.clear();
  await TrackLibraryDB.tracks.clear();

  const playlists: Playlist[] = [];
  for (const plData of data.playlists) {
    const pl = new Playlist(plData.name);
    pl.width = plData.width ?? undefined;
    pl.id = await DB_AddPlaylist(pl);
    playlists.push(pl);
  }

  for (const trackMeta of data.tracks) {
    const trackBlob = await zip.file(trackMeta.filePath)!.async('blob');
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
